<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Totals } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { api } from '@/shared/api'
import { money, currencies, dateISO, dateLabel, type Currency, useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
interface Budget {
  year: number
  currencies: Record<Currency, Totals>
  months: { month: number; currencies: Record<Currency, Totals> }[]
}
const session = useSession()
const year = ref(Number((session.settings?.today || dateISO()).slice(0, 4))),
  currency = ref<Currency>('RUB')
const { data, loading, error, reload } = useAsyncData(
  () => api<Budget>(`/payments/budget?year=${year.value}`),
  null as Budget | null,
)
watch(year, reload)
const maximum = computed(() =>
  Math.max(
    1,
    ...(data.value?.months.map((m) => Number(m.currencies[currency.value].planned)) || []),
  ),
)
function monthName(month: number) {
  return dateLabel(`${year.value}-${String(month).padStart(2, '0')}-01`, { month: 'long' })
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Бюджет команды</h1>
      <p>Плановые расходы по расписанию и фактические оплаты счетов.</p>
    </div>
    <label class="year-control"
      >Год<input v-model.number="year" type="number" min="2000" max="2100" aria-label="Год бюджета"
    /></label>
  </div>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><template v-if="data"
      ><section class="overview-summary budget-summary">
        <div class="section-heading">
          <h2>План на {{ year }} год</h2>
          <span class="muted">Без конвертации валют</span>
        </div>
        <div class="currency-summary">
          <div v-for="item in currencies" :key="item" class="currency-block">
            <div class="currency-label">
              <span>{{ item }}</span
              ><span>За весь год</span>
            </div>
            <strong>{{ money(data.currencies[item].planned, item) }}</strong>
            <div class="currency-breakdown">
              <span
                >Оплачено <b>{{ money(data.currencies[item].paid, item) }}</b></span
              ><span
                >К оплате <b>{{ money(data.currencies[item].unpaid, item) }}</b></span
              >
            </div>
          </div>
        </div>
      </section>
      <section class="panel budget-panel">
        <div class="section-heading">
          <div>
            <h2>Расходы по месяцам</h2>
            <p>План и оплаченные счета · {{ currency }}</p>
          </div>
          <div class="segmented" role="group" aria-label="Валюта бюджета">
            <button
              v-for="item in currencies"
              :key="item"
              :class="{ selected: currency === item }"
              :aria-pressed="currency === item"
              @click="currency = item"
            >
              {{ item }}
            </button>
          </div>
        </div>
        <div class="chart-legend">
          <span><i class="legend-planned" />Плановые расходы</span
          ><span><i class="legend-paid" />Оплачено</span>
        </div>
        <div
          class="budget-chart"
          role="img"
          :aria-label="`Плановые и оплаченные расходы по месяцам ${year} года в ${currency}. Точные значения в таблице ниже.`"
        >
          <div v-for="item in data.months" :key="item.month" class="budget-chart-row">
            <span>{{ monthName(item.month) }}</span>
            <div class="budget-track">
              <div
                class="budget-bar"
                :style="{
                  width: `${(Number(item.currencies[currency].planned) / maximum) * 100}%`,
                }"
              />
              <div
                class="budget-paid-bar"
                :style="{ width: `${(Number(item.currencies[currency].paid) / maximum) * 100}%` }"
              />
            </div>
            <strong>{{ money(item.currencies[currency].planned, currency) }}</strong>
          </div>
        </div>
        <p class="scroll-hint">
          <AppIcon name="arrow" :size="15" />Прокрутите таблицу, чтобы увидеть все суммы.
        </p>
        <div
          class="table-scroll budget-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Бюджет по месяцам"
        >
          <table class="ledger">
            <caption class="sr-only">
              Суммы по месяцам,
              {{
                currency
              }},
              {{
                year
              }}
              год
            </caption>
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Запланировано</th>
                <th>Оплачено</th>
                <th>Ожидает оплаты</th>
                <th>Просрочено</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in data.months" :key="item.month">
                <td class="capitalize">{{ monthName(item.month) }}</td>
                <td class="amount">{{ money(item.currencies[currency].planned, currency) }}</td>
                <td>{{ money(item.currencies[currency].paid, currency) }}</td>
                <td>{{ money(item.currencies[currency].unpaid, currency) }}</td>
                <td :class="{ 'danger-text': Number(item.currencies[currency].overdue) }">
                  {{ money(item.currencies[currency].overdue, currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section></template
    ></AsyncState
  >
</template>
