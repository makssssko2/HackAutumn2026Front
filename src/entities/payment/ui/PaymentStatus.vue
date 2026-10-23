<script setup lang="ts">
import type { Occurrence } from '../model/types'
defineProps<{ payment: Pick<Occurrence, 'status' | 'overdue_days'> }>()
const labels = {
  paid: 'Оплачено',
  unpaid: 'Ожидает оплаты',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
}
</script>
<template>
  <span class="status" :class="payment.status"
    ><span class="status-dot" />{{ labels[payment.status]
    }}<span v-if="payment.status === 'paid' && payment.overdue_days" class="late-note"
      >с опозданием</span
    ></span
  >
</template>
