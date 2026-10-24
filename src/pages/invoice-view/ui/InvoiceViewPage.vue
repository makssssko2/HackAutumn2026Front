<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PaymentStatus,
  paymentTypeLabel,
  publicInvoiceApi,
  type PublicInvoiceView,
} from '@/entities/payment'
import { ApiError } from '@/shared/api'
import { dateLabel, money, plural } from '@/shared/lib'
import { AppIcon } from '@/shared/ui'

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const invoice = ref<PublicInvoiceView | null>(null)
const loading = ref(true)
const invalidLink = ref(false)
const error = ref('')
const announcement = ref('')
const statusAnnouncement: Record<PublicInvoiceView['status'], string> = {
  unpaid: 'Счёт ожидает оплаты.',
  overdue: 'Счёт просрочен.',
  paid: 'Счёт оплачен.',
  cancelled: 'Счёт отменён.',
}
let generation = 0
let request: AbortController | undefined

async function load(reset = false, manual = true) {
  const current = ++generation
  const previousStatus = invoice.value?.status
  request?.abort()
  request = new AbortController()
  if (reset) invoice.value = null
  loading.value = true
  invalidLink.value = false
  error.value = ''
  if (reset || manual) announcement.value = ''
  try {
    const result = await publicInvoiceApi.get(token.value, request.signal)
    if (current === generation) {
      invoice.value = result
      if (!reset && (manual || previousStatus !== result.status))
        announcement.value = `Данные счёта обновлены. ${statusAnnouncement[result.status]}`
    }
  } catch (failure) {
    if (current !== generation || request.signal.aborted) return
    invalidLink.value = failure instanceof ApiError && failure.status === 404
    if (invalidLink.value) {
      invoice.value = null
      announcement.value = 'Ссылка на счёт больше недоступна.'
    } else
      error.value = invoice.value
        ? 'Не удалось обновить счёт. Показаны последние загруженные данные. Проверьте соединение и попробуйте снова.'
        : 'Не удалось загрузить счёт. Проверьте соединение и попробуйте снова.'
  } finally {
    if (current === generation) loading.value = false
  }
}

function refreshVisible() {
  if (document.visibilityState === 'visible') void load(false, false)
}

watch(token, () => void load(true, false), { immediate: true, flush: 'sync' })
onMounted(() => {
  window.addEventListener('focus', refreshVisible)
  document.addEventListener('visibilitychange', refreshVisible)
})
onUnmounted(() => {
  generation++
  request?.abort()
  window.removeEventListener('focus', refreshVisible)
  document.removeEventListener('visibilitychange', refreshVisible)
})
</script>

<template>
  <main class="invoice-view-page">
    <div class="invoice-view-brand">
      <AppIcon name="checks" :size="25" /><span>invoice<strong>keeper</strong></span>
    </div>
    <article class="invoice-view-sheet" :aria-busy="loading">
      <template v-if="invoice">
        <div class="invoice-view-heading">
          <span class="invoice-view-type">{{ paymentTypeLabel[invoice.payment_type] }}</span>
          <PaymentStatus :payment="invoice" />
        </div>
        <h1>{{ invoice.title }}</h1>
        <p v-if="invoice.description" class="invoice-view-description">{{ invoice.description }}</p>
        <div class="invoice-view-total">
          <span>Сумма счёта</span>
          <p>{{ money(invoice.amount, invoice.currency) }}</p>
        </div>
        <dl class="invoice-view-details">
          <div>
            <dt>Срок оплаты</dt>
            <dd>{{ dateLabel(invoice.due_date) }}</dd>
          </div>
          <div v-if="invoice.paid && invoice.paid_at">
            <dt>Фактическая дата оплаты</dt>
            <dd>{{ dateLabel(invoice.paid_at) }}</dd>
          </div>
          <div v-if="!invoice.cancelled && invoice.overdue_days">
            <dt>Просрочка</dt>
            <dd>
              {{ invoice.overdue_days }} {{ plural(invoice.overdue_days, ['день', 'дня', 'дней']) }}
            </dd>
          </div>
          <div v-else-if="invoice.paid && !invoice.cancelled">
            <dt>Соблюдение срока</dt>
            <dd>Оплачено вовремя</dd>
          </div>
        </dl>
        <p class="invoice-view-state" :class="invoice.status">
          {{
            invoice.cancelled
              ? 'Счёт отменён. Оплата не требуется.'
              : invoice.paid
                ? 'Оплата этого счёта уже отмечена.'
                : invoice.status === 'overdue'
                  ? 'Срок оплаты прошёл. Статус обновится, когда оплата будет отмечена.'
                  : 'Счёт ожидает оплаты. Здесь можно проверить его актуальный статус.'
          }}
        </p>
        <p class="invoice-view-demo">Демонстрационный режим. Деньги не списываются.</p>
      </template>
      <template v-else-if="loading">
        <h1>Просмотр счёта</h1>
        <p class="invoice-view-placeholder" role="status">Загружаем информацию…</p>
      </template>
      <template v-else-if="invalidLink">
        <AppIcon name="link" :size="28" />
        <h1>Ссылка на счёт недействительна</h1>
        <p class="invoice-view-placeholder">
          Проверьте ссылку из сообщения или обратитесь к отправителю. Счёт больше недоступен по
          этому адресу.
        </p>
      </template>
      <h1 v-else>Не удалось открыть счёт</h1>
      <p v-if="error" class="error-box" role="alert">{{ error }}</p>
      <div v-if="!invalidLink" class="invoice-view-actions">
        <span class="invoice-view-readonly"
          ><AppIcon name="shield" :size="17" />Только просмотр</span
        >
        <button class="button secondary" :aria-disabled="loading" @click="!loading && load()">
          <AppIcon
            :name="loading ? 'loading' : 'recurring'"
            :size="18"
            :class="{ spin: loading }"
          />
          {{ loading ? 'Обновляем…' : invoice ? 'Обновить' : 'Попробовать снова' }}
        </button>
      </div>
    </article>
    <p
      class="sr-only invoice-view-announcement"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ announcement }}
    </p>
    <p class="invoice-view-footer">
      Ссылка открывает только этот счёт.<br />Изменить данные на этой странице нельзя.
    </p>
  </main>
</template>

<style scoped>
.invoice-view-page {
  min-height: 100dvh;
  padding: 44px 20px;
  background: var(--ground);
  color: var(--ink);
}
.invoice-view-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 28px;
  font-size: 23px;
  letter-spacing: -0.025em;
}
.invoice-view-brand svg {
  color: var(--accent-ink);
}
.invoice-view-brand strong {
  font-weight: 400;
  color: var(--muted);
}
.invoice-view-sheet {
  max-width: 680px;
  margin: auto;
  padding: 36px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
}
.invoice-view-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.invoice-view-type {
  font-size: var(--text-secondary);
  color: var(--muted);
}
h1 {
  margin: 24px 0 16px;
  font-size: 28px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.invoice-view-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.65;
  color: var(--muted);
  margin: 0 0 28px;
}
.invoice-view-total {
  padding: 24px;
  background: var(--accent-pale);
  color: var(--accent-ink);
  border-radius: 12px;
  margin: 28px 0;
}
.invoice-view-total > span {
  font-size: var(--text-secondary);
}
.invoice-view-total > p {
  margin: 8px 0 0;
  font-size: 36px;
  font-weight: 650;
  line-height: 1.2;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.invoice-view-details {
  margin: 0 0 24px;
}
.invoice-view-details > div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  line-height: 1.5;
}
.invoice-view-details dt {
  color: var(--muted);
}
.invoice-view-details dd {
  margin: 0;
  font-weight: 550;
  text-align: right;
}
.invoice-view-state {
  margin: 24px 0 12px;
  line-height: 1.6;
}
.invoice-view-state.paid {
  color: var(--success);
}
.invoice-view-state.overdue {
  color: var(--danger);
}
.invoice-view-demo {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-secondary);
  line-height: 1.6;
}
.invoice-view-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid var(--line);
}
.invoice-view-readonly {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--muted);
  font-size: var(--text-secondary);
}
.invoice-view-actions .button[aria-disabled='true'] {
  cursor: wait;
  opacity: 0.65;
}
.invoice-view-placeholder {
  color: var(--muted);
  line-height: 1.7;
}
.invoice-view-footer {
  max-width: 540px;
  margin: 22px auto 0;
  text-align: center;
  color: var(--muted);
  font-size: var(--text-caption);
  line-height: 1.7;
}
@media (max-width: 500px) {
  .invoice-view-page {
    padding: 28px 16px;
  }
  .invoice-view-sheet {
    padding: 24px 20px;
  }
  h1 {
    font-size: 24px;
  }
  .invoice-view-total {
    padding: 20px;
  }
  .invoice-view-total > p {
    font-size: 30px;
  }
  .invoice-view-details > div {
    flex-direction: column;
    gap: 4px;
  }
  .invoice-view-details dd {
    text-align: left;
  }
}
</style>
