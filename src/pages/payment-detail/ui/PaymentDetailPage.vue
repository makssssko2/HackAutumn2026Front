<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  paymentApi,
  PaymentStatus,
  PaymentTable,
  type Occurrence,
  type OccurrenceDetail,
} from '@/entities/payment'
import { useSession } from '@/entities/session'
import { ConfirmPayment } from '@/features/confirm-payment'
import { api, jsonBody } from '@/shared/api'
import { dateISO, dateLabel, money, frequencyLabel, actionLabel, useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
const route = useRoute()
const session = useSession()
const selected = ref<Occurrence | null>(null)
const actualDate = ref('')
const busy = ref(false),
  operationError = ref(''),
  message = ref('')
const linkName = ref(''),
  linkURL = ref('')
const { data, loading, error, reload } = useAsyncData(
  async () => {
    const detail = await paymentApi.detail(String(route.params.id))
    const periods = await paymentApi.list({ recurring_id: detail.recurring_id })
    actualDate.value = detail.paid_at || ''
    return { detail, periods }
  },
  { detail: null as OccurrenceDetail | null, periods: [] as Occurrence[] },
)
watch(() => route.params.id, reload)
async function operate(action: () => Promise<unknown>, success: string) {
  busy.value = true
  operationError.value = ''
  message.value = ''
  try {
    await action()
    await reload()
    message.value = success
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
function cancelPayment() {
  if (
    !data.value.detail ||
    !window.confirm(
      'Отменить отметку оплаты? Счет снова станет неоплаченным, демонстрационный чек будет аннулирован.',
    )
  )
    return
  operate(
    () =>
      paymentApi.update(data.value.detail!.id, {
        paid: false,
        expected_revision: data.value.detail!.revision,
      }),
    'Отметка оплаты отменена',
  )
}
function saveDate() {
  const detail = data.value.detail
  if (detail)
    operate(
      () =>
        paymentApi.update(detail.id, {
          paid_at: actualDate.value,
          expected_revision: detail.revision,
        }),
      'Дата оплаты изменена',
    )
}
function markExternal() {
  const detail = data.value.detail
  if (detail)
    operate(
      () => paymentApi.update(detail.id, { paid: true, expected_revision: detail.revision }),
      'Внешняя оплата подтверждена',
    )
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  await operate(
    () => api(`/payment-occurrences/${route.params.id}/attachments`, { method: 'POST', body }),
    'Файл прикреплен',
  )
  input.value = ''
}
async function addLink() {
  await operate(
    () =>
      api(`/payment-occurrences/${route.params.id}/links`, {
        method: 'POST',
        body: jsonBody({ name: linkName.value, url: linkURL.value }),
      }),
    'Ссылка прикреплена',
  )
  if (!operationError.value) {
    linkName.value = ''
    linkURL.value = ''
  }
}
</script>
<template>
  <RouterLink to="/payments" class="back-link"
    ><AppIcon name="back" :size="17" />Все счета</RouterLink
  ><AsyncState :loading="loading" :error="error" @retry="reload"
    ><template v-if="data.detail"
      ><div class="page-heading">
        <div>
          <h1>{{ data.detail.title }}</h1>
          <p>
            {{ frequencyLabel[data.detail.frequency] }} · срок {{ dateLabel(data.detail.due_date) }}
          </p>
        </div>
        <PaymentStatus :payment="data.detail" />
      </div>
      <div v-if="message" class="success-box" role="status">{{ message }}</div>
      <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
      <div class="detail-layout">
        <section class="panel detail-main">
          <div class="detail-amount-row">
            <div>
              <span class="muted">Сумма счета</span>
              <h2 class="detail-amount">{{ money(data.detail.amount, data.detail.currency) }}</h2>
            </div>
            <button
              v-if="!data.detail.paid && !data.detail.cancelled"
              class="button"
              @click="selected = data.detail"
            >
              <AppIcon name="payments" :size="18" />Оплатить
            </button>
          </div>
          <p v-if="data.detail.description" class="detail-description">
            {{ data.detail.description }}
          </p>
          <dl class="details-grid">
            <div>
              <dt>Срок оплаты</dt>
              <dd>{{ dateLabel(data.detail.due_date) }}</dd>
            </div>
            <div>
              <dt>Фактическая оплата</dt>
              <dd>{{ dateLabel(data.detail.paid_at) }}</dd>
            </div>
            <div>
              <dt>Подтвердил</dt>
              <dd>{{ data.detail.paid_by || 'Еще не подтверждено' }}</dd>
            </div>
            <div>
              <dt>Просрочка</dt>
              <dd :class="{ 'danger-text': data.detail.overdue_days }">
                {{ data.detail.overdue_days ? `${data.detail.overdue_days} дн.` : 'Нет' }}
              </dd>
            </div>
          </dl>
          <div v-if="!data.detail.cancelled" class="payment-corrections">
            <template v-if="data.detail.paid"
              ><form class="inline-form" @submit.prevent="saveDate">
                <label
                  >Исправить дату оплаты<input
                    v-model="actualDate"
                    type="date"
                    required
                    :max="session.settings?.today || dateISO()" /></label
                ><button class="button secondary" :disabled="busy">Сохранить дату</button>
              </form>
              <button class="text-button danger-text" :disabled="busy" @click="cancelPayment">
                Отменить отметку оплаты
              </button></template
            ><button v-else class="button secondary" :disabled="busy" @click="markExternal">
              <AppIcon name="check" :size="18" />Уже оплачено вне системы
            </button>
          </div>
          <div v-if="data.detail.receipts.length" class="receipts-section">
            <h3>Демонстрационные чеки</h3>
            <a
              v-for="receipt in data.detail.receipts"
              :key="receipt.id"
              :href="`/api/v1/receipts/${receipt.id}`"
              class="attachment-row"
              ><AppIcon name="receipt" :size="22" />
              <div>
                <strong>{{ receipt.number }}</strong
                ><small
                  >{{ dateLabel(receipt.paid_at) }} ·
                  {{ receipt.voided ? 'Аннулирован' : 'Действующий' }}</small
                >
              </div>
              <AppIcon name="download" :size="18"
            /></a>
          </div>
        </section>
        <aside class="panel detail-history">
          <h2>История счета</h2>
          <div v-if="!data.detail.history.length" class="muted">
            Изменений пока нет. Здесь появятся подтверждения и исправления.
          </div>
          <div v-for="item in data.detail.history" :key="item.id" class="history-item">
            <span class="history-point" />
            <div>
              <strong>{{ actionLabel[item.action] || item.action }}</strong>
              <p>{{ item.actor }}</p>
              <small>{{
                dateLabel(item.created_at, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}</small>
            </div>
          </div>
        </aside>
      </div>
      <section class="panel attachment-panel">
        <div class="section-heading">
          <div>
            <h2>Чеки и документы</h2>
            <p>Прикрепляются только к этому счету периода.</p>
          </div>
          <label class="button secondary upload-button"
            ><AppIcon name="plus" :size="17" />Прикрепить файл<input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              :disabled="busy"
              @change="upload"
          /></label>
        </div>
        <p class="field-help">PDF, PNG, JPG или TXT, до 10 МБ.</p>
        <a
          v-for="attachment in data.detail.attachments"
          :key="attachment.id"
          :href="attachment.url || `/api/v1/attachments/${attachment.id}/download`"
          :target="attachment.url ? '_blank' : undefined"
          rel="noopener noreferrer"
          class="attachment-row"
          ><AppIcon :name="attachment.url ? 'link' : 'audit'" :size="22" />
          <div>
            <strong>{{ attachment.name }}</strong
            ><small>{{ dateLabel(attachment.created_at) }}</small>
          </div>
          <AppIcon :name="attachment.url ? 'external' : 'download'" :size="18"
        /></a>
        <form class="link-form" @submit.prevent="addLink">
          <label
            >Название ссылки<input
              v-model="linkName"
              required
              placeholder="Например, чек поставщика" /></label
          ><label
            >Адрес<input v-model="linkURL" type="url" required placeholder="https://…" /></label
          ><button class="button secondary" :disabled="busy">Добавить ссылку</button>
        </form>
      </section>
      <section class="panel payment-panel">
        <div class="section-heading">
          <div>
            <h2>Другие периоды</h2>
            <p>Отдельный статус и история для каждого счета.</p>
          </div>
        </div>
        <PaymentTable
          :payments="data.periods.filter((p) => p.id !== data.detail!.id).slice(0, 12)"
          compact
          @pay="selected = $event"
        /></section></template></AsyncState
  ><ConfirmPayment :payment="selected" @close="selected = null" @confirmed="reload" />
</template>
