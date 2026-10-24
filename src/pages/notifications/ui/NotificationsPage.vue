<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { channelLabels, type Channel } from '@/entities/channel'
import { paymentTypeLabel, type Occurrence, type PaymentType } from '@/entities/payment'
import { api, ApiError, allPages } from '@/shared/api'
import { dateLabel, money, useAsyncData, usePagedList } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState, Pagination } from '@/shared/ui'
interface Delivery {
  id: string
  occurrence_id: string
  title: string
  payment_type: PaymentType
  amount: string
  currency: string
  channel_name: string
  channel_id: string
  channel_kind: string
  status: string
  event: string
  attempts: number
  error: string | null
  created_at: string
  due_date: string
  payment: Occurrence
  receipt_id: string | null
}
const filter = ref(''),
  search = ref(''),
  channelFilter = ref(''),
  operationError = ref(''),
  busy = ref('')
const {
  rows: data,
  data: pageData,
  total,
  page,
  pageSize,
  loading,
  error,
  reload,
} = usePagedList<Delivery>(
  '/notifications',
  () => ({ status: filter.value, channel_id: channelFilter.value, q: search.value }),
  { debounce: 250 },
)
const visible = data,
  pageRows = data
const { data: channelOptions } = useAsyncData(
  () =>
    allPages<Channel>('/channels').then((rows) =>
      rows.map<[string, string]>((c) => [c.id, c.name]),
    ),
  [] as [string, string][],
)
const failures = computed(() => pageData.value.stats?.failed || 0)
const pending = computed(() => pageData.value.stats?.pending || 0)
function reset() {
  filter.value = ''
  search.value = ''
  channelFilter.value = ''
}
const labels: Record<string, string> = {
  pending: 'В очереди',
  sending: 'Отправляется',
  sent: 'Отправлено',
  retry: 'Ожидает повтора',
  failed: 'Ошибка',
  uncertain: 'Проверьте доставку',
  skipped: 'Пропущено',
}
function eventLabel(event: string) {
  return event === 'reminder'
    ? 'Напоминание'
    : event === 'created'
      ? 'Новый счет'
      : event.startsWith('state:')
        ? 'Изменение статуса'
        : 'Тест канала'
}
async function retry(id: string) {
  if (
    data.value.find((d) => d.id === id)?.status === 'uncertain' &&
    !window.confirm(
      'Результат предыдущей доставки неизвестен. Проверьте сообщение в канале: повторная отправка может создать дубликат. Повторить после проверки?',
    )
  )
    return
  busy.value = id
  operationError.value = ''
  try {
    await api(`/notifications/${id}/retry`, { method: 'POST' })
    await reload()
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) await reload()
    operationError.value = (e as Error).message
  } finally {
    busy.value = ''
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Журнал рассылок</h1>
      <p>
        Результаты отправки в Telegram, email и другие каналы. Каждая запись — отдельное событие
        доставки.
      </p>
    </div>
    <button class="button secondary" @click="reload">
      <AppIcon name="recurring" :size="17" />Обновить
    </button>
  </div>
  <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
  <section class="panel">
    <div class="delivery-summary">
      <span
        >Найдено: <strong>{{ total }}</strong></span
      ><span
        >Требуют проверки: <strong>{{ failures }}</strong></span
      ><span
        >В работе: <strong>{{ pending }}</strong></span
      >
    </div>
    <div class="filters">
      <label class="search-field"
        ><AppIcon name="search" :size="18" /><input
          v-model="search"
          aria-label="Поиск в рассылках"
          placeholder="Название, описание или канал"
      /></label>
      <select v-model="filter" aria-label="Статус доставки">
        <option value="">Все статусы</option>
        <option v-for="(label, value) in labels" :key="value" :value="value">
          {{ label }}
        </option></select
      ><select v-model="channelFilter" aria-label="Канал доставки">
        <option value="">Все каналы</option>
        <option v-for="[id, name] in channelOptions" :key="id" :value="id">{{ name }}</option>
      </select>
      <button v-if="filter || search || channelFilter" class="text-button" @click="reset">
        Сбросить фильтры
      </button>
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><div v-if="visible.length" class="notification-list">
        <article v-for="delivery in pageRows" :key="delivery.id" class="notification-item">
          <span class="notification-symbol"
            ><AppIcon :name="delivery.channel_kind" :size="22"
          /></span>
          <div class="notification-body">
            <RouterLink :to="`/payments/${delivery.occurrence_id}`"
              ><strong>{{ delivery.title }}</strong></RouterLink
            >
            <p v-if="delivery.payment.description" class="payment-description">
              {{ delivery.payment.description }}
            </p>
            <p>
              {{ paymentTypeLabel[delivery.payment_type || 'recurring'] }} ·
              {{ eventLabel(delivery.event) }} · {{ money(delivery.amount, delivery.currency) }}
            </p>
            <p>Срок оплаты: {{ dateLabel(delivery.due_date) }}</p>
            <small
              >{{ delivery.channel_name }} ·
              {{ channelLabels[delivery.channel_kind] || delivery.channel_kind }} ·
              {{
                dateLabel(delivery.created_at, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
              <template> · попыток {{ delivery.attempts }}</template></small
            >
            <p v-if="delivery.error" class="error-text">{{ delivery.error }}</p>
            <p v-if="delivery.status === 'uncertain'" class="error-text">
              Сначала проверьте сообщение в канале, затем решите, нужен ли повтор.
            </p>
          </div>
          <div class="notification-result">
            <span
              class="status"
              :class="
                delivery.status === 'sent'
                  ? 'paid'
                  : ['failed', 'uncertain'].includes(delivery.status)
                    ? 'overdue'
                    : 'unpaid'
              "
              >{{ labels[delivery.status] || delivery.status }}</span
            ><button
              v-if="['failed', 'retry', 'uncertain'].includes(delivery.status)"
              class="text-button"
              :disabled="busy === delivery.id"
              @click="retry(delivery.id)"
            >
              {{ busy === delivery.id ? 'Сохраняем…' : 'Повторить' }}
            </button>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="filter || search || channelFilter ? 'Отправки не найдены' : 'Отправок пока нет'"
        :description="
          filter || search || channelFilter
            ? 'Измените условия поиска или сбросьте фильтры.'
            : 'Здесь появятся результаты отправки счетов и напоминаний.'
        "
        icon="notifications"
        ><button v-if="filter || search || channelFilter" class="button secondary" @click="reset">
          Сбросить фильтры
        </button></EmptyState
      >
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :loading="loading"
        label="Страницы журнала рассылок"
      />
    </AsyncState>
  </section>
</template>
