<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { PaymentTable, type Occurrence, type PaymentDateSort } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { AppIcon, AsyncState, Pagination } from '@/shared/ui'
import { currencies, dateISO, monthRange, usePagedList } from '@/shared/lib'
const session = useSession()
const route = useRoute()
const month = ref((session.settings?.today || dateISO()).slice(0, 7))
const allPeriods = ref(route.query.status === 'overdue' || route.query.all === '1')
const status = ref(String(route.query.status || ''))
const currency = ref('')
const paymentType = ref(
  ['recurring', 'one_time'].includes(String(route.query.payment_type))
    ? String(route.query.payment_type)
    : '',
)
const search = ref('')
const sort = ref<PaymentDateSort>({ field: 'due_date', direction: 'asc' })
const filtered = computed(
  () =>
    !!(search.value || status.value || currency.value || paymentType.value || !allPeriods.value),
)
function reset() {
  search.value = ''
  status.value = ''
  currency.value = ''
  paymentType.value = ''
  allPeriods.value = true
}
const { rows, total, page, pageSize, loading, error, reload } = usePagedList<Occurrence>(
  '/payment-occurrences',
  () => ({
    ...(!allPeriods.value && month.value ? monthRange(month.value) : {}),
    status: status.value,
    currency: currency.value,
    payment_type: paymentType.value,
    q: search.value,
    sort: sort.value.field,
    direction: sort.value.direction,
  }),
  { debounce: 250 },
)
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>{{ session.isAdmin ? 'Выставленные счета' : 'Счета' }}</h1>
      <p>
        {{
          session.isAdmin
            ? 'Разовые счета и периоды регулярных платежей: сроки, оплата и документы.'
            : 'Откройте счет, подтвердите оплату или уточните фактическую дату.'
        }}
      </p>
    </div>
    <RouterLink v-if="session.isAdmin" to="/payments/new" class="button"
      ><AppIcon name="plus" :size="18" />Выставить счет</RouterLink
    >
  </div>
  <p v-if="route.query.created" class="success-box" role="status">
    Платеж создан. Его счет можно найти в списке; повторно создавать платеж не нужно.
  </p>
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
      ><select v-model="paymentType" aria-label="Тип платежа">
        <option value="">Все типы платежей</option>
        <option value="recurring">Регулярные</option>
        <option value="one_time">Разовые</option></select
      ><input v-model="month" type="month" aria-label="Месяц" :disabled="allPeriods" /><label
        class="checkbox-label"
        ><input v-model="allPeriods" type="checkbox" />Все периоды</label
      >
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload"
      ><PaymentTable
        v-model:sort="sort"
        sortable
        server-sorted
        :payments="rows"
        :filtered="filtered"
        @reset="reset" />
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :loading="loading"
        label="Страницы счетов"
    /></AsyncState>
  </section>
</template>
