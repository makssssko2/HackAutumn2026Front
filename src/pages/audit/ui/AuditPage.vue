<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HistoryItem } from '@/entities/payment'
import { api } from '@/shared/api'
import { actionLabel, dateLabel, useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState } from '@/shared/ui'
const { data, loading, error, reload } = useAsyncData(() => api<HistoryItem[]>('/audit'), [])
const search = ref('')
const visible = computed(() =>
  data.value.filter((item) =>
    `${item.actor} ${actionLabel[item.action] || item.action} ${JSON.stringify(item.details)}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
)
function details(item: HistoryItem) {
  return Object.entries(item.details)
    .map(
      ([key, value]) =>
        `${({ title: 'Платеж', login: 'Логин', name: 'Название', paid_at: 'Дата оплаты', revision: 'Версия', demo: 'Демо', kind: 'Канал', details_login: 'Логин' } as Record<string, string>)[key] || key}: ${value ?? '—'}`,
    )
    .join(' · ')
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Журнал действий</h1>
      <p>Кто и когда менял платежи, доступ и подключения.</p>
    </div>
    <button class="button secondary" @click="reload">
      <AppIcon name="recurring" :size="17" />Обновить
    </button>
  </div>
  <section class="panel">
    <div class="filters">
      <label class="search-field"
        ><AppIcon name="search" :size="18" /><input
          v-model="search"
          aria-label="Поиск в журнале"
          placeholder="Действие, пользователь или платеж" /></label
      ><span class="muted">Последние 500 событий</span>
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><div v-if="visible.length" class="table-scroll">
        <table class="ledger audit-ledger">
          <thead>
            <tr>
              <th>Время</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Подробности</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in visible" :key="item.id">
              <td>
                {{
                  dateLabel(item.created_at, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </td>
              <td>{{ item.actor }}</td>
              <td>
                <strong>{{ actionLabel[item.action] || item.action }}</strong>
              </td>
              <td>{{ details(item) || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState
        v-else
        title="События не найдены"
        description="Измените запрос. Новые действия появятся здесь автоматически."
        icon="audit"
    /></AsyncState>
  </section>
</template>
