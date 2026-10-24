<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { money, dateLabel } from '@/shared/lib'
import { AppIcon, EmptyState } from '@/shared/ui'
import PaymentStatus from './PaymentStatus.vue'
import type { Occurrence } from '../model/types'
import { paymentTypeLabel } from '../model/payment'
import { sortPaymentsByDate, type PaymentDateSort } from '../model/sort'
const props = withDefaults(
  defineProps<{
    payments: Occurrence[]
    compact?: boolean
    filtered?: boolean
    sortable?: boolean
  }>(),
  {
    filtered: false,
    sortable: false,
  },
)
const sort = defineModel<PaymentDateSort>('sort', {
  default: () => ({ field: 'due_date', direction: 'asc' }),
})
const sortedPayments = computed(() =>
  props.sortable ? sortPaymentsByDate(props.payments, sort.value) : props.payments,
)
const mobileSort = computed({
  get: () => `${sort.value.field}:${sort.value.direction}`,
  set: (value: string) => {
    const [field, direction] = value.split(':')
    if (
      (field === 'due_date' || field === 'paid_at') &&
      (direction === 'asc' || direction === 'desc')
    )
      sort.value = { field, direction }
  },
})
function toggleSort(field: PaymentDateSort['field']) {
  sort.value = {
    field,
    direction: sort.value.field === field && sort.value.direction === 'asc' ? 'desc' : 'asc',
  }
}
function sortIcon(field: PaymentDateSort['field']) {
  return sort.value.field !== field
    ? 'sort'
    : sort.value.direction === 'asc'
      ? 'sort-up'
      : 'sort-down'
}
function sortAction(field: PaymentDateSort['field'], label: string) {
  return `${label}: сначала ${sort.value.field === field && sort.value.direction === 'asc' ? 'поздние' : 'ранние'}`
}
defineEmits<{ reset: [] }>()
</script>
<template>
  <template v-if="payments.length">
    <p v-if="sortable" class="sr-only" role="status">
      {{ sort.field === 'due_date' ? 'По сроку оплаты' : 'По фактической дате оплаты' }}: сначала
      {{ sort.direction === 'asc' ? 'ранние' : 'поздние' }}.
      <template v-if="sort.field === 'paid_at'">Счета без даты оплаты в конце.</template>
    </p>
    <label v-if="sortable" class="mobile-payment-sort"
      >Сортировка по дате
      <select v-model="mobileSort">
        <option value="due_date:asc">Срок: сначала ранние</option>
        <option value="due_date:desc">Срок: сначала поздние</option>
        <option v-if="!compact" value="paid_at:asc">Оплата: сначала ранние</option>
        <option v-if="!compact" value="paid_at:desc">Оплата: сначала поздние</option>
      </select>
    </label>
    <ul class="mobile-payment-list" aria-label="Счета">
      <li v-for="payment in sortedPayments" :key="payment.id">
        <RouterLink :to="`/payments/${payment.id}`" class="mobile-payment-row">
          <div class="mobile-payment-heading">
            <strong>{{ payment.title }}</strong
            ><AppIcon name="arrow" :size="18" />
          </div>
          <span class="payment-kind">{{
            paymentTypeLabel[payment.payment_type || 'recurring']
          }}</span>
          <p v-if="payment.description" class="payment-description">{{ payment.description }}</p>
          <div class="mobile-payment-values">
            <span class="amount">{{ money(payment.amount, payment.currency) }}</span
            ><PaymentStatus :payment="payment" />
          </div>
          <span class="mobile-payment-due"
            >Срок: <time :datetime="payment.due_date">{{ dateLabel(payment.due_date) }}</time
            ><template v-if="payment.status === 'overdue'">
              · задержка {{ payment.overdue_days }} дн.</template
            ></span
          >
          <span v-if="payment.paid_at && !compact" class="mobile-payment-due"
            >Оплачено:
            <time :datetime="payment.paid_at">{{ dateLabel(payment.paid_at) }}</time></span
          >
        </RouterLink>
      </li>
    </ul>
    <div class="table-scroll desktop-payment-table">
      <table class="ledger">
        <thead>
          <tr>
            <th>Платеж</th>
            <th>Сумма</th>
            <th
              scope="col"
              :aria-sort="
                sortable && sort.field === 'due_date'
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              "
            >
              <button
                v-if="sortable"
                class="table-sort-button"
                :class="{ active: sort.field === 'due_date' }"
                :aria-label="sortAction('due_date', 'Срок оплаты')"
                :title="sortAction('due_date', 'Срок оплаты')"
                @click="toggleSort('due_date')"
              >
                Срок оплаты<AppIcon :name="sortIcon('due_date')" :size="16" />
              </button>
              <template v-else>Срок оплаты</template>
            </th>
            <th>Статус</th>
            <th
              v-if="!compact"
              scope="col"
              :aria-sort="
                sortable && sort.field === 'paid_at'
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              "
            >
              <button
                v-if="sortable"
                class="table-sort-button"
                :class="{ active: sort.field === 'paid_at' }"
                :aria-label="sortAction('paid_at', 'Дата оплаты')"
                :title="sortAction('paid_at', 'Дата оплаты')"
                @click="toggleSort('paid_at')"
              >
                Дата оплаты<AppIcon :name="sortIcon('paid_at')" :size="16" />
              </button>
              <template v-else>Дата оплаты</template>
            </th>
            <th><span class="sr-only">Действия</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in sortedPayments" :key="payment.id">
            <td>
              <RouterLink :to="`/payments/${payment.id}`" class="payment-name"
                ><span class="payment-symbol"><AppIcon name="payments" :size="18" /></span
                ><span
                  >{{ payment.title
                  }}<small class="payment-kind"
                    >{{ paymentTypeLabel[payment.payment_type || 'recurring']
                    }}<template v-if="payment.payment_type !== 'one_time'">
                      ·
                      {{
                        dateLabel(payment.due_date, { month: 'long', year: 'numeric' })
                      }}</template
                    ></small
                  >
                  <small v-if="payment.description" class="payment-description">{{
                    payment.description
                  }}</small></span
                ></RouterLink
              >
            </td>
            <td class="amount">{{ money(payment.amount, payment.currency) }}</td>
            <td>
              <time
                :datetime="payment.due_date"
                :class="{ 'danger-text': payment.status === 'overdue' }"
                >{{ dateLabel(payment.due_date, { day: 'numeric', month: 'short' }) }}</time
              ><small v-if="payment.status === 'overdue'" class="danger-text"
                >Задержка {{ payment.overdue_days }} дн.</small
              >
            </td>
            <td><PaymentStatus :payment="payment" /></td>
            <td v-if="!compact">
              <time v-if="payment.paid_at" :datetime="payment.paid_at">{{
                dateLabel(payment.paid_at)
              }}</time
              ><template v-else>—</template>
            </td>
            <td class="row-action">
              <RouterLink
                :to="`/payments/${payment.id}`"
                class="icon-button"
                :aria-label="`Открыть ${payment.title}`"
                ><AppIcon name="arrow" :size="18"
              /></RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  <EmptyState
    v-else
    :title="filtered ? 'Ничего не найдено' : 'В этом списке пока нет счетов'"
    :description="
      filtered
        ? 'Попробуйте другое название или сбросьте фильтры.'
        : 'Счета появятся после выставления платежа на этот период.'
    "
    ><button v-if="filtered" class="button secondary" @click="$emit('reset')">
      Сбросить фильтры
    </button></EmptyState
  >
</template>
