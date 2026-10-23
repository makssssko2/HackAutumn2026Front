<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSession } from '@/entities/session'
import { api } from '@/shared/api'
import { dateLabel, money, useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState } from '@/shared/ui'
interface Delivery {
  id: string
  occurrence_id: string
  title: string
  amount: string
  currency: string
  channel_name: string
  channel_kind: string
  status: string
  event: string
  attempts: number
  error: string | null
  created_at: string
}
const session = useSession()
const { data, loading, error, reload } = useAsyncData(() => api<Delivery[]>('/notifications'), [])
const filter = ref(''),
  operationError = ref(''),
  busy = ref('')
const visible = computed(() => data.value.filter((d) => !filter.value || d.status === filter.value))
const labels: Record<string, string> = {
  pending: 'В очереди',
  sending: 'Отправляется',
  sent: 'Доставлено',
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
  busy.value = id
  operationError.value = ''
  try {
    await api(`/notifications/${id}/retry`, { method: 'POST' })
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = ''
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Уведомления</h1>
      <p>
        {{
          session.isAdmin
            ? 'История отправок по всем каналам и повторные попытки.'
            : 'События и напоминания о платежах команды.'
        }}
      </p>
    </div>
    <button class="button secondary" @click="reload">
      <AppIcon name="recurring" :size="17" />Обновить
    </button>
  </div>
  <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
  <section class="panel">
    <div class="filters">
      <select v-model="filter" aria-label="Статус доставки">
        <option value="">Все статусы</option>
        <option v-for="(label, value) in labels" :key="value" :value="value">
          {{ label }}
        </option></select
      ><span class="muted">Задания обрабатывает фоновый worker.</span>
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><div v-if="visible.length" class="notification-list">
        <article v-for="delivery in visible" :key="delivery.id" class="notification-item">
          <span class="notification-symbol"
            ><AppIcon :name="delivery.channel_kind" :size="22"
          /></span>
          <div class="notification-body">
            <RouterLink :to="`/payments/${delivery.occurrence_id}`"
              ><strong>{{ delivery.title }}</strong></RouterLink
            >
            <p>
              {{ eventLabel(delivery.event) }} · {{ money(delivery.amount, delivery.currency) }}
            </p>
            <small
              >{{ delivery.channel_name }} ·
              {{
                dateLabel(delivery.created_at, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
              · попыток {{ delivery.attempts }}</small
            >
            <p v-if="delivery.error" class="error-text">{{ delivery.error }}</p>
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
              v-if="session.isAdmin && ['failed', 'retry', 'uncertain'].includes(delivery.status)"
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
        title="Подходящих уведомлений пока нет"
        description="Они появятся после создания счетов или наступления срока напоминания."
        icon="notifications"
    /></AsyncState>
  </section>
</template>
