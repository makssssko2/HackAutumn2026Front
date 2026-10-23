<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { paymentApi } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { money, dateLabel, frequencyLabel, useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState } from '@/shared/ui'
const session = useSession()
const { data, loading, error, reload } = useAsyncData(paymentApi.recurring, [])
const operationError = ref(''),
  busy = ref('')
async function stop(id: string, title: string) {
  if (
    !window.confirm(
      `Прекратить «${title}»? Будущие неоплаченные счета отменятся, история сохранится.`,
    )
  )
    return
  busy.value = id
  operationError.value = ''
  try {
    await paymentApi.stop(id)
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = ''
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Регулярные платежи</h1>
      <p>Расписание расходов и правила создания новых счетов.</p>
    </div>
    <RouterLink v-if="session.isAdmin" to="/payments/new" class="button"
      ><AppIcon name="plus" :size="18" />Выставить счет</RouterLink
    >
  </div>
  <p v-if="operationError" role="alert" class="error-box">{{ operationError }}</p>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><section v-if="data.length" class="panel table-scroll">
      <table class="ledger">
        <thead>
          <tr>
            <th>Платеж</th>
            <th>Сумма за период</th>
            <th>Повторение</th>
            <th>Первый срок</th>
            <th>Рассылка</th>
            <th>Состояние</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in data" :key="payment.id">
            <td>
              <strong>{{ payment.title }}</strong
              ><small>{{ payment.description || 'Регулярный расход' }}</small>
            </td>
            <td class="amount">{{ money(payment.amount, payment.currency) }}</td>
            <td>{{ frequencyLabel[payment.frequency] }}</td>
            <td>{{ dateLabel(payment.first_due_date) }}</td>
            <td>
              {{
                payment.group_ids.length ? `${payment.group_ids.length} групп` : 'Всем получателям'
              }}
            </td>
            <td>
              <span class="status" :class="payment.active ? 'paid' : 'cancelled'"
                ><span class="status-dot" />{{ payment.active ? 'Активен' : 'Прекращен' }}</span
              >
            </td>
            <td>
              <button
                v-if="payment.active && session.isAdmin"
                class="text-button danger-text"
                :disabled="busy === payment.id"
                @click="stop(payment.id, payment.title)"
              >
                {{ busy === payment.id ? 'Сохраняем…' : 'Прекратить' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <EmptyState
      v-else
      title="Добавьте первый регулярный платеж"
      description="Задайте сумму и расписание. Каждый период будет создан автоматически."
      ><RouterLink v-if="session.isAdmin" to="/payments/new" class="button"
        >Выставить счет</RouterLink
      ></EmptyState
    ></AsyncState
  >
</template>
