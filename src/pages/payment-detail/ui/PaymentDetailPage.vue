<script setup lang="ts">
import { actionLabel } from '@/entities/audit'
import { computed, nextTick, onScopeDispose, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  paymentApi,
  PaymentStatus,
  PaymentTable,
  paymentTypeLabel,
  reminderWindow,
  frequencyLabel,
  type Occurrence,
  type OccurrenceDetail,
  type Receipt,
  type Attachment,
  type HistoryItem,
} from '@/entities/payment'
import { useSession } from '@/entities/session'
import { api, ApiError, jsonBody } from '@/shared/api'
import { dateISO, dateLabel, money, useAsyncData, usePagedList } from '@/shared/lib'
import { AppIcon, AsyncState, Pagination } from '@/shared/ui'
const route = useRoute()
const session = useSession()
const busy = ref(false),
  operationError = ref(''),
  message = ref('')
const linkName = ref(''),
  linkURL = ref('')
const action = ref<'pay' | 'date' | 'undo' | null>(null)
const actualDate = ref('')
const dateInput = ref<HTMLInputElement | null>(null)
const actionHeading = ref<HTMLElement | null>(null)
const feedback = ref<HTMLElement | null>(null)
const showIssued = ref(!!route.query.issued)
const today = computed(() => session.settings?.today || dateISO())
let operationVersion = 0
onScopeDispose(() => {
  ++operationVersion
})
const {
  data,
  loading,
  error,
  reload: reloadDetail,
} = useAsyncData(
  async (signal) => {
    const id = route.params.id
    // The route can lose its id before this page's scope is disposed.
    if (typeof id !== 'string' || !id) return { detail: null, active: false }
    const detail = await paymentApi.detail(id, signal)
    return { detail, active: detail.payment_active }
  },
  { detail: null as OccurrenceDetail | null, active: false },
)
const relatedEnabled = () => !!data.value.detail && data.value.detail.id === route.params.id
const history = usePagedList<HistoryItem>(
  () => `/payment-occurrences/${route.params.id}/history`,
  () => ({}),
  { enabled: relatedEnabled, pageSize: 6 },
)
const documents = usePagedList<Attachment>(
  () => `/payment-occurrences/${route.params.id}/attachments`,
  () => ({}),
  { enabled: relatedEnabled },
)
const receipts = usePagedList<Receipt>(
  () => `/payment-occurrences/${route.params.id}/receipts`,
  () => ({}),
  { enabled: relatedEnabled, pageSize: 6 },
)
const periods = usePagedList<Occurrence>(
  '/payment-occurrences',
  () => ({ recurring_id: data.value.detail?.recurring_id, exclude_id: String(route.params.id) }),
  { enabled: () => relatedEnabled() && data.value.detail?.payment_type !== 'one_time' },
)
async function reload() {
  const id = String(route.params.id)
  await reloadDetail()
  if (id !== String(route.params.id)) return
  await Promise.all([history.reload(), documents.reload(), receipts.reload(), periods.reload()])
}
const canRemind = computed(
  () => data.value.detail && data.value.active && reminderWindow(data.value.detail, today.value),
)
watch(
  () => route.params.id,
  () => {
    ++operationVersion
    busy.value = false
    action.value = null
    showIssued.value = !!route.query.issued
    message.value = ''
    operationError.value = ''
    reload()
  },
  { flush: 'sync' },
)
async function operate(request: () => Promise<unknown>, success: string) {
  if (busy.value) return false
  const operation = ++operationVersion
  const id = String(route.params.id)
  const current = () => operation === operationVersion && id === String(route.params.id)
  busy.value = true
  operationError.value = ''
  message.value = ''
  showIssued.value = false
  try {
    await request()
    if (!current()) return false
    await reload()
    if (!current()) return false
    message.value = success
    return true
  } catch (e) {
    if (!current()) return false
    if (e instanceof ApiError && e.status === 409) {
      action.value = null
      await reload()
      if (!current()) return false
      operationError.value = e.message.startsWith('Счет уже изменен')
        ? 'Счет изменен другим участником. Загружены актуальные данные; проверьте их перед новым действием.'
        : `${e.message.replace(/[.!?]+$/, '')}. Данные счета обновлены; проверьте их перед новым действием.`
    } else {
      if (e instanceof ApiError && e.status === 403) await session.refreshIdentity()
      if (!current()) return false
      operationError.value = (e as Error).message
    }
    return false
  } finally {
    if (current()) {
      busy.value = false
      await nextTick()
      if (current()) feedback.value?.focus()
    }
  }
}
async function openAction(value: 'pay' | 'date' | 'undo') {
  action.value = value
  actualDate.value = data.value.detail?.paid_at || today.value
  operationError.value = ''
  message.value = ''
  await nextTick()
  if (dateInput.value) dateInput.value.focus()
  else actionHeading.value?.focus()
}
async function savePayment() {
  const detail = data.value.detail
  if (!detail || !action.value || busy.value) return
  const payload =
    action.value === 'undo'
      ? { paid: false }
      : action.value === 'pay'
        ? { paid: true, paid_at: actualDate.value, demo: true }
        : { paid_at: actualDate.value }
  const success = await operate(
    () => paymentApi.update(detail.id, { ...payload, expected_revision: detail.revision }),
    action.value === 'undo'
      ? 'Отметка оплаты отменена. Предыдущий чек аннулирован.'
      : action.value === 'date'
        ? 'Дата оплаты исправлена. Действующий чек обновлен.'
        : 'Оплата подтверждена. Демонстрационный чек готов.',
  )
  if (success) action.value = null
}
async function cancelOneTime() {
  const detail = data.value.detail
  if (
    !detail ||
    !window.confirm(
      `Отменить разовый счет «${detail.title}» на ${money(detail.amount, detail.currency)}? Счет и его история сохранятся.`,
    )
  )
    return
  await operate(
    () => paymentApi.cancelOneTime(detail.recurring_id),
    'Разовый счет отменен. История сохранена.',
  )
}
async function remind() {
  const detail = data.value.detail
  if (
    !detail ||
    !canRemind.value ||
    !window.confirm(
      `Отправить напоминание по счету «${detail.title}» на ${money(detail.amount, detail.currency)}? Система создаст отсутствующие доставки; существующие не дублируются.`,
    )
  )
    return
  await operate(
    () => paymentApi.remind(detail.id),
    'Запрос напоминания обработан. Проверьте результат в журнале рассылок; существующее напоминание не дублируется.',
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
  const saved = await operate(
    () =>
      api(`/payment-occurrences/${route.params.id}/links`, {
        method: 'POST',
        body: jsonBody({ name: linkName.value, url: linkURL.value }),
      }),
    'Ссылка прикреплена',
  )
  if (saved) {
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
            {{ paymentTypeLabel[data.detail.payment_type || 'recurring']
            }}<template v-if="data.detail.payment_type !== 'one_time'">
              · {{ frequencyLabel[data.detail.frequency] }}</template
            >
            · срок {{ dateLabel(data.detail.due_date) }}
          </p>
        </div>
        <PaymentStatus :payment="data.detail" />
      </div>
      <div v-if="message" ref="feedback" tabindex="-1" class="success-box" role="status">
        {{ message }}
      </div>
      <div v-if="session.isAdmin && showIssued" class="issued-confirmation" role="status">
        <AppIcon name="checks" :size="25" />
        <div>
          <h2>
            {{ route.query.delivery === 'scheduled' ? 'Разовый счет сохранен' : 'Счет выставлен' }}
          </h2>
          <p>
            {{
              route.query.delivery === 'scheduled'
                ? 'Немедленной рассылки нет. Напоминание выйдет, когда до срока останется три дня. Счет уже учитывается в бюджете.'
                : 'Событие для выбранных получателей создано. Проверьте результат доставки в журнале рассылок.'
            }}
          </p>
          <RouterLink to="/notifications" class="text-link"
            >Проверить рассылку<AppIcon name="arrow" :size="16"
          /></RouterLink>
        </div>
      </div>
      <p v-if="operationError" ref="feedback" tabindex="-1" class="error-box" role="alert">
        {{ operationError }}
      </p>
      <div class="detail-layout">
        <section class="panel detail-main">
          <div class="detail-amount-row">
            <div>
              <span class="muted">Сумма счета</span>
              <h2 class="detail-amount">{{ money(data.detail.amount, data.detail.currency) }}</h2>
            </div>
          </div>
          <p v-if="data.detail.description" class="detail-description invoice-description">
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
          <section
            v-if="!data.detail.cancelled"
            class="payment-action-area"
            aria-label="Управление оплатой"
          >
            <template v-if="!action">
              <h3>Отметка оплаты</h3>
              <p class="field-help">
                Демонстрационный учет: деньги не списываются. Изменяется только этот счет.
              </p>
              <div class="payment-action-buttons">
                <button
                  v-if="!data.detail.paid"
                  class="button"
                  :disabled="busy"
                  @click="openAction('pay')"
                >
                  <AppIcon name="check" :size="18" />Отметить оплаченным
                </button>
                <template v-else>
                  <button class="button secondary" :disabled="busy" @click="openAction('date')">
                    Исправить дату оплаты
                  </button>
                  <button
                    class="text-button danger-text"
                    :disabled="busy"
                    @click="openAction('undo')"
                  >
                    Отменить отметку оплаты
                  </button>
                </template>
              </div>
            </template>
            <form v-else class="payment-state-form" @submit.prevent="savePayment">
              <h3 ref="actionHeading" tabindex="-1">
                {{
                  action === 'pay'
                    ? 'Подтверждение оплаты'
                    : action === 'date'
                      ? 'Фактическая дата оплаты'
                      : 'Отмена отметки оплаты'
                }}
              </h3>
              <p class="field-help">
                «{{ data.detail.title }}» · {{ money(data.detail.amount, data.detail.currency) }}.
              </p>
              <label v-if="action !== 'undo'"
                >Дата оплаты<input
                  ref="dateInput"
                  v-model="actualDate"
                  type="date"
                  required
                  min="2000-01-01"
                  :max="today"
                  :disabled="busy"
              /></label>
              <p class="field-help">
                {{
                  action === 'undo'
                    ? 'Счет снова станет неоплаченным, а действующий чек будет аннулирован.'
                    : action === 'date'
                      ? 'Срок счета останется прежним. Старый чек аннулируется, новый получит исправленную дату.'
                      : 'Можно указать прошлую дату. Будет сформирован демонстрационный чек без списания денег.'
                }}
              </p>
              <div class="payment-action-buttons">
                <button class="button" :disabled="busy">
                  {{
                    busy
                      ? 'Сохраняем…'
                      : action === 'undo'
                        ? 'Подтвердить отмену отметки'
                        : action === 'date'
                          ? 'Сохранить дату'
                          : 'Подтвердить оплату'
                  }}
                </button>
                <button
                  type="button"
                  class="button secondary"
                  :disabled="busy"
                  @click="action = null"
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
          <section
            v-if="session.isAdmin && !data.detail.paid && !data.detail.cancelled && data.active"
            class="payment-action-area"
            aria-label="Доставка и отмена счета"
          >
            <h3>Напоминание получателям</h3>
            <p class="field-help">
              {{
                canRemind
                  ? 'Выпустите пропущенное напоминание вручную. Уже созданные доставки не дублируются. Для повтора ошибки используйте журнал рассылок.'
                  : 'Ручное напоминание доступно за три дня до срока, в день оплаты и после него.'
              }}
            </p>
            <div class="payment-action-buttons">
              <button class="button secondary" :disabled="busy || !canRemind" @click="remind">
                <AppIcon name="notifications" :size="17" />Отправить напоминание
              </button>
              <button
                v-if="data.detail.payment_type === 'one_time'"
                class="text-button danger-text"
                :disabled="busy"
                @click="cancelOneTime"
              >
                Отменить разовый счет
              </button>
            </div>
          </section>
          <div
            v-if="receipts.total.value || receipts.loading.value || receipts.error.value"
            class="receipts-section"
          >
            <h3>Демонстрационные чеки</h3>
            <AsyncState
              :loading="receipts.loading.value"
              :error="receipts.error.value"
              @retry="receipts.reload"
            >
              <a
                v-for="receipt in receipts.rows.value"
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
              <Pagination
                v-model:page="receipts.page.value"
                v-model:page-size="receipts.pageSize.value"
                :total="receipts.total.value"
                :loading="receipts.loading.value"
                label="Страницы чеков счета"
            /></AsyncState>
          </div>
        </section>
        <aside class="panel detail-history">
          <h2>История счета</h2>
          <AsyncState
            :loading="history.loading.value"
            :error="history.error.value"
            @retry="history.reload"
          >
            <div v-if="!history.total.value" class="muted">
              Изменений пока нет. Здесь появятся подтверждения и исправления.
            </div>
            <div v-for="item in history.rows.value" :key="item.id" class="history-item">
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
            <Pagination
              v-model:page="history.page.value"
              v-model:page-size="history.pageSize.value"
              :total="history.total.value"
              :loading="history.loading.value"
              label="Страницы истории счета"
          /></AsyncState>
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
        <AsyncState
          :loading="documents.loading.value"
          :error="documents.error.value"
          @retry="documents.reload"
        >
          <a
            v-for="attachment in documents.rows.value"
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
          <Pagination
            v-model:page="documents.page.value"
            v-model:page-size="documents.pageSize.value"
            :total="documents.total.value"
            :loading="documents.loading.value"
            label="Страницы документов счета"
        /></AsyncState>
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
      <section v-if="data.detail.payment_type !== 'one_time'" class="panel payment-panel">
        <div class="section-heading">
          <div>
            <h2>Другие периоды</h2>
            <p>Отдельный статус и история для каждого счета.</p>
          </div>
        </div>
        <AsyncState
          :loading="periods.loading.value"
          :error="periods.error.value"
          @retry="periods.reload"
          ><PaymentTable :payments="periods.rows.value" compact /><Pagination
            v-model:page="periods.page.value"
            v-model:page-size="periods.pageSize.value"
            :total="periods.total.value"
            :loading="periods.loading.value"
            label="Страницы других периодов"
        /></AsyncState></section></template
  ></AsyncState>
</template>
