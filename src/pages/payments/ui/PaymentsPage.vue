<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { paymentApi, PaymentTable, type Occurrence } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { AppIcon, AsyncState } from '@/shared/ui'
import { currencies, dateISO, monthRange, useAsyncData } from '@/shared/lib'
const session = useSession()
const route = useRoute()
const month = ref((session.settings?.today || dateISO()).slice(0, 7))
const allPeriods = ref(route.query.status === 'overdue')
const status = ref(String(route.query.status || ''))
const currency = ref('')
const search = ref('')
const {
  data: rows,
  loading,
  error,
  reload,
} = useAsyncData(
  () =>
    paymentApi.list({
      ...(!allPeriods.value && month.value ? monthRange(month.value) : {}),
      status: status.value,
      currency: currency.value,
      q: search.value,
    }),
  [],
)
watch([month, allPeriods, status, currency], reload)
let timer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(reload, 250)
})
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>{{ session.isAdmin ? 'Выставленные счета' : 'Счета' }}</h1>
      <p>
        {{
          session.isAdmin
            ? 'Контролируйте статусы счетов, отправленных получателям.'
            : 'Сроки, статусы и история каждого периода. Оплата доступна из уведомлений.'
        }}
      </p>
    </div>
    <RouterLink v-if="session.isAdmin" to="/payments/new" class="button"
      ><AppIcon name="plus" :size="18" />Выставить счет</RouterLink
    >
  </div>
  <section class="panel">
    <div class="filters">
      <label class="search-field"
        ><AppIcon name="search" :size="18" /><input
          v-model="search"
          placeholder="Найти платеж"
          aria-label="Поиск платежа" /></label
      ><select v-model="status" aria-label="Статус">
        <option value="">Все статусы</option>
        <option value="unpaid">К оплате</option>
        <option value="overdue">Просроченные</option>
        <option value="paid">Оплаченные</option>
        <option value="cancelled">Отмененные</option></select
      ><select v-model="currency" aria-label="Валюта">
        <option value="">Все валюты</option>
        <option v-for="item in currencies" :key="item">{{ item }}</option></select
      ><input v-model="month" type="month" aria-label="Месяц" :disabled="allPeriods" /><label
        class="checkbox-label"
        ><input v-model="allPeriods" type="checkbox" />Все периоды</label
      >
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><PaymentTable :payments="rows" />
      <div class="table-footer">Найдено счетов: {{ rows.length }}</div></AsyncState
    >
  </section>
</template>
