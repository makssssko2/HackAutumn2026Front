<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { money, dateLabel } from '@/shared/lib'
import { AppIcon, EmptyState } from '@/shared/ui'
import PaymentStatus from './PaymentStatus.vue'
import type { Occurrence } from '../model/types'
withDefaults(defineProps<{ payments: Occurrence[]; compact?: boolean; filtered?: boolean }>(), {
  filtered: false,
})
defineEmits<{ reset: [] }>()
</script>
<template>
  <template v-if="payments.length">
    <ul class="mobile-payment-list" aria-label="Счета">
      <li v-for="payment in payments" :key="payment.id">
        <RouterLink :to="`/payments/${payment.id}`" class="mobile-payment-row">
          <div class="mobile-payment-heading">
            <strong>{{ payment.title }}</strong
            ><AppIcon name="arrow" :size="18" />
          </div>
          <div class="mobile-payment-values">
            <span class="amount">{{ money(payment.amount, payment.currency) }}</span
            ><PaymentStatus :payment="payment" />
          </div>
          <span class="mobile-payment-due"
            >Срок: {{ dateLabel(payment.due_date)
            }}<template v-if="payment.status === 'overdue'">
              · задержка {{ payment.overdue_days }} дн.</template
            ></span
          >
          <span v-if="payment.paid_at && !compact" class="mobile-payment-due"
            >Оплачено: {{ dateLabel(payment.paid_at) }}</span
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
            <th>Срок оплаты</th>
            <th>Статус</th>
            <th v-if="!compact">Дата оплаты</th>
            <th><span class="sr-only">Действия</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in payments" :key="payment.id">
            <td>
              <RouterLink :to="`/payments/${payment.id}`" class="payment-name"
                ><span class="payment-symbol"><AppIcon name="payments" :size="18" /></span
                ><span
                  >{{ payment.title
                  }}<small>{{
                    dateLabel(payment.due_date, { month: 'long', year: 'numeric' })
                  }}</small></span
                ></RouterLink
              >
            </td>
            <td class="amount">{{ money(payment.amount, payment.currency) }}</td>
            <td>
              <span :class="{ 'danger-text': payment.status === 'overdue' }">{{
                dateLabel(payment.due_date, { day: 'numeric', month: 'short' })
              }}</span
              ><small v-if="payment.status === 'overdue'" class="danger-text"
                >Задержка {{ payment.overdue_days }} дн.</small
              >
            </td>
            <td><PaymentStatus :payment="payment" /></td>
            <td v-if="!compact">{{ dateLabel(payment.paid_at) }}</td>
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
