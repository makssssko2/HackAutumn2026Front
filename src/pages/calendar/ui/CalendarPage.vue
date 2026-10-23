<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { paymentApi, PaymentTable, type Occurrence } from '@/entities/payment'
import { useSession } from '@/entities/session'
import {
  dateISO,
  dateLabel,
  money,
  currencies,
  monthRange,
  useAsyncData,
  plural,
} from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
const session = useSession()
const current = session.settings?.today || dateISO()
const month = ref(current.slice(0, 7)),
  selectedDay = ref(current)

const {
  data: rows,
  loading,
  error,
  reload,
} = useAsyncData(() => paymentApi.list(monthRange(month.value)), [])
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
      const payments = rows.value.filter((p) => p.due_date === key && !p.cancelled)
      return { key, day: value.getDate(), currentMonth: key.startsWith(month.value), payments }
    },
  )
})
const dayRows = computed(() => rows.value.filter((p) => p.due_date === selectedDay.value && !p.cancelled))
function goToday() {
  month.value = current.slice(0, 7)
  selectedDay.value = current
}
function move(delta: number) {
  const [year, m] = month.value.split('-').map(Number)
  month.value = dateISO(new Date(year!, m! - 1 + delta, 1)).slice(0, 7)
}
function sum(payments: Occurrence[], currency: string) {
  return payments
    .filter((p) => p.currency === currency)
    .reduce((total, p) => total + Number(p.amount), 0)
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Календарь оплат</h1>
      <p>Планируйте расходы по датам, не смешивая валюты.</p>
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
          :aria-label="`${dateLabel(day.key)}: счетов ${day.payments.length}`"
          :aria-pressed="day.key === selectedDay"
          @click="selectedDay = day.key"
        >
          <span class="day-number">{{ day.day }}</span
          ><span v-if="day.payments.length" class="calendar-count"
            >{{ day.payments.length }} счет.</span
          ><span
            v-for="currency in currencies.filter((c) => sum(day.payments, c))"
            :key="currency"
            class="calendar-amount"
            >{{ money(sum(day.payments, currency), currency) }}</span
          >
        </button>
      </div>
    </section>
    <section class="panel payment-panel">
      <div class="section-heading">
        <div>
          <h2>{{ dateLabel(selectedDay, { day: 'numeric', month: 'long', year: 'numeric' }) }}</h2>
          <p>
            {{ dayRows.length }} {{ plural(dayRows.length, ['счет', 'счета', 'счетов']) }} на
            выбранную дату
          </p>
        </div>
        <div class="daily-totals">
          <span v-for="currency in currencies.filter((c) => sum(dayRows, c))" :key="currency">{{
            money(sum(dayRows, currency), currency)
          }}</span>
        </div>
      </div>
      <PaymentTable :payments="dayRows" compact /></section
  ></AsyncState>
</template>
