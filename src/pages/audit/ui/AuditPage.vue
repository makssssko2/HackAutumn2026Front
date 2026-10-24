<script setup lang="ts">
import { ref } from 'vue'
import type { HistoryItem } from '@/entities/payment'
import { actionLabel, dateLabel, usePagedList } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState, Pagination } from '@/shared/ui'
const search = ref('')
const {
  rows: pageRows,
  total,
  page,
  pageSize,
  loading,
  error,
  reload,
} = usePagedList<HistoryItem>(
  '/audit',
  () => ({
    q: search.value,
    actions: search.value
      ? Object.entries(actionLabel)
          .filter(([, label]) =>
            label.toLocaleLowerCase('ru').includes(search.value.toLocaleLowerCase('ru')),
          )
          .map(([action]) => action)
          .join(',')
      : '',
  }),
  { debounce: 250 },
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
      ><span class="muted">Поиск по всей истории</span>
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><template v-if="pageRows.length">
        <ul class="mobile-record-list">
          <li v-for="item in pageRows" :key="item.id">
            <strong>{{ actionLabel[item.action] || item.action }}</strong>
            <p>{{ item.actor }}</p>
            <p class="muted">
              {{
                dateLabel(item.created_at, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
            </p>
            <p class="record-details">{{ details(item) || 'Без дополнительных сведений' }}</p>
          </li>
        </ul>
        <div class="table-scroll desktop-record-table">
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
              <tr v-for="item in pageRows" :key="item.id">
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
      </template>
      <EmptyState
        v-else
        title="События не найдены"
        description="Измените запрос или обновите журнал, чтобы получить новые события."
        icon="audit"
        ><button v-if="search" class="button secondary" @click="search = ''">
          Сбросить поиск
        </button></EmptyState
      >
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :loading="loading"
        label="Страницы журнала действий"
      />
    </AsyncState>
  </section>
</template>
