<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PaymentTable, type Occurrence } from '@/entities/payment'
import { api, queryString } from '@/shared/api'
import { useSession } from '@/entities/session'
import {
  dateISO,
  dateLabel,
  money,
  currencies,
  useAsyncData,
  usePagedList,
  plural,
} from '@/shared/lib'
import { AppIcon, AsyncState, Pagination } from '@/shared/ui'
const session = useSession()
const current = session.settings?.today || dateISO()
const month = ref(current.slice(0, 7)),
  selectedDay = ref(current)

interface CalendarDay {
  date: string
  count: number
  currencies: Record<string, string>
}
const calendarRange = computed(() => {
  const [year, m] = month.value.split('-').map(Number)
  const first = new Date(year!, m! - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const cells = Math.ceil((offset + new Date(year!, m!, 0).getDate()) / 7) * 7
  return {
    date_from: dateISO(new Date(year!, m! - 1, 1 - offset)),
    date_to: dateISO(new Date(year!, m! - 1, cells - offset)),
  }
})
const {
  data: calendar,
  loading,
  error,
  reload,
} = useAsyncData(
  (signal) =>
    api<{ days: CalendarDay[] }>(`/payments/calendar${queryString(calendarRange.value)}`, {
      signal,
    }),
  { days: [] },
)
const dayLedger = usePagedList<Occurrence>('/payment-occurrences', () => ({
  date_from: selectedDay.value,
  date_to: selectedDay.value,
  status: 'active',
}))
const selectedTotals = computed(
  () => calendar.value.days.find((day) => day.date === selectedDay.value)?.currencies || {},
)
watch(
  month,
  () => {
    selectedDay.value = month.value === current.slice(0, 7) ? current : `${month.value}-01`
    reload()
  },
  { flush: 'sync' },
)
const days = computed(() => {
  const [year, m] = month.value.split('-').map(Number)
  const start = new Date(year!, m! - 1, 1)
  const offset = (start.getDay() + 6) % 7
  return Array.from(
    { length: Math.ceil((offset + new Date(year!, m!, 0).getDate()) / 7) * 7 },
    (_, index) => {
      const value = new Date(year!, m! - 1, 1 - offset + index)
      const key = dateISO(value)
      const totals = calendar.value.days.find((day) => day.date === key)
      return {
        key,
        day: value.getDate(),
        currentMonth: key.startsWith(month.value),
        count: totals?.count || 0,
        currencies: totals?.currencies || {},
      }
    },
  )
})
function goToday() {
  month.value = current.slice(0, 7)
  selectedDay.value = current
}
function move(delta: number) {
  const [year, m] = month.value.split('-').map(Number)
  month.value = dateISO(new Date(year!, m! - 1 + delta, 1)).slice(0, 7)
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Календарь оплат</h1>
      <p>Планируйте расходы по датам.</p>
    </div>
    <div class="calendar-controls">
      <button class="icon-button" aria-label="Предыдущий месяц" @click="move(-1)">
        <AppIcon name="left" /></button
      ><input v-model="month" type="month" aria-label="Месяц календаря" required /><button
        class="icon-button"
        aria-label="Следующий месяц"
        @click="move(1)"
      >
        <AppIcon name="right" /></button
      ><button class="button secondary" @click="goToday">Сегодня</button>
    </div>
  </div>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><section class="panel calendar-panel">
      <div class="calendar-weekdays">
        <span v-for="day in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="day">{{ day }}</span>
      </div>
      <div class="calendar-grid">
        <button
          v-for="day in days"
          :key="day.key"
          class="calendar-day"
          :class="{
            outside: !day.currentMonth,
            selected: day.key === selectedDay,
            today: day.key === current,
          }"
          :aria-label="`${dateLabel(day.key)}: счетов ${day.count}`"
          :aria-pressed="day.key === selectedDay"
          @click="selectedDay = day.key"
        >
          <span class="day-number">{{ day.day }}</span
          ><span v-if="day.count" class="calendar-count">{{ day.count }} счет.</span
          ><span
            v-for="currency in currencies.filter((c) => Number(day.currencies[c]))"
            :key="currency"
            class="calendar-amount"
            >{{ money(day.currencies[currency] || '0', currency) }}</span
          >
        </button>
      </div>
    </section>
    <section class="panel payment-panel">
      <div class="section-heading">
        <div>
          <h2>{{ dateLabel(selectedDay, { day: 'numeric', month: 'long', year: 'numeric' }) }}</h2>
          <p>
            {{ dayLedger.total.value }}
            {{ plural(dayLedger.total.value, ['счет', 'счета', 'счетов']) }} на выбранную дату
          </p>
        </div>
        <div class="daily-totals">
          <span
            v-for="currency in currencies.filter((c) => Number(selectedTotals[c]))"
            :key="currency"
            >{{ money(selectedTotals[currency] || '0', currency) }}</span
          >
        </div>
      </div>
      <AsyncState
        :loading="dayLedger.loading.value"
        :error="dayLedger.error.value"
        @retry="dayLedger.reload"
        ><PaymentTable :payments="dayLedger.rows.value" compact /><Pagination
          v-model:page="dayLedger.page.value"
          v-model:page-size="dayLedger.pageSize.value"
          :total="dayLedger.total.value"
          :loading="dayLedger.loading.value"
          label="Страницы счетов выбранной даты"
      /></AsyncState></section
  ></AsyncState>
</template>
