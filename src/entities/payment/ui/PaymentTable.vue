<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { money, dateLabel } from '@/shared/lib'
import { AppIcon, EmptyState } from '@/shared/ui'
import PaymentStatus from './PaymentStatus.vue'
import type { Occurrence } from '../model/types'
defineProps<{ payments: Occurrence[]; compact?: boolean }>()
defineEmits<{ pay: [payment: Occurrence] }>()
</script>
<template>
  <div v-if="payments.length" class="table-scroll">
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
            <button
              v-if="!payment.paid && !payment.cancelled"
              class="button small secondary"
              @click="$emit('pay', payment)"
            >
              Оплатить<AppIcon name="external" :size="14" /></button
            ><RouterLink
              v-else
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
  <EmptyState
    v-else
    title="В этом списке пока нет счетов"
    description="Измените фильтры или добавьте регулярный платеж."
  />
</template>
