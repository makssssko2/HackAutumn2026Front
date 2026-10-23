<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { paymentApi } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { api } from '@/shared/api'
import { currencies, dateISO, money, frequencyLabel, useAsyncData } from '@/shared/lib'
import { AppIcon } from '@/shared/ui'
const router = useRouter()
const session = useSession()
const form = reactive({
  title: '',
  description: '',
  amount: '',
  currency: 'RUB',
  first_due_date: session.settings?.today || dateISO(),
  frequency: 'monthly',
  group_ids: [] as string[],
})
const { data: groups } = useAsyncData(() => api<{ id: string; name: string }[]>('/groups'), [])
const busy = ref(false),
  error = ref('')
async function submit() {
  busy.value = true
  error.value = ''
  try {
    const payment = await paymentApi.create(form)
    const rows = await paymentApi.list({ recurring_id: payment.id })
    router.push(rows[0] ? `/payments/${rows[0].id}` : '/recurring')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <RouterLink to="/recurring" class="back-link"
    ><AppIcon name="back" :size="17" />Регулярные платежи</RouterLink
  >
  <div class="page-heading">
    <div>
      <h1>Новый регулярный платеж</h1>
      <p>Один раз настройте расписание — система создаст отдельный счет для каждого периода.</p>
    </div>
  </div>
  <div class="form-layout">
    <form class="panel form-panel" @submit.prevent="submit">
      <h2>Данные платежа</h2>
      <label
        >Название<input
          v-model="form.title"
          required
          maxlength="200"
          placeholder="Например, аренда офиса" /></label
      ><label
        >Описание <span class="optional">необязательно</span
        ><textarea
          v-model="form.description"
          rows="3"
          maxlength="2000"
          placeholder="За что платим и что важно помнить"
        />
      </label>
      <div class="form-grid">
        <label
          >Сумма<input
            v-model="form.amount"
            type="number"
            min="0.01"
            max="999999999999.99"
            step="0.01"
            required
            placeholder="0,00" /></label
        ><label
          >Валюта<select v-model="form.currency">
            <option v-for="item in currencies" :key="item">{{ item }}</option>
          </select></label
        ><label
          >Ближайшая оплата<input
            v-model="form.first_due_date"
            type="date"
            min="2000-01-01"
            max="2100-12-31"
            required /></label
        ><label
          >Повторение<select v-model="form.frequency">
            <option v-for="(label, value) in frequencyLabel" :key="value" :value="value">
              {{ label }}
            </option>
          </select></label
        >
      </div>
      <fieldset>
        <legend>Кому отправлять уведомления</legend>
        <p class="field-help">Без выбранных групп — всем подключенным получателям.</p>
        <label v-for="group in groups" :key="group.id" class="checkbox-label"
          ><input v-model="form.group_ids" type="checkbox" :value="group.id" />{{
            group.name
          }}</label
        >
        <p v-if="!groups.length" class="muted">
          Группы можно добавить в разделе «Группы рассылки».
        </p>
      </fieldset>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <div class="form-actions">
        <RouterLink to="/recurring" class="button secondary">Отмена</RouterLink
        ><button class="button" :disabled="busy">
          <AppIcon :name="busy ? 'loading' : 'plus'" :size="17" />{{
            busy ? 'Создаем…' : 'Создать платеж'
          }}
        </button>
      </div>
    </form>
    <aside class="form-aside">
      <h2>Как это работает</h2>
      <p>Каждый период получает свой счет, дату и статус. История прошлых оплат сохраняется.</p>
      <div class="preview-invoice">
        <AppIcon name="payments" :size="23" /><strong>{{ form.title || 'Название платежа' }}</strong
        ><span>{{ money(form.amount || 0, form.currency) }}</span
        ><small>{{ frequencyLabel[form.frequency] }}</small>
      </div>
      <p>
        Напоминание отправится за три дня до срока. Если до оплаты осталось меньше трех дней — сразу
        после создания.
      </p>
      <p>Если нужного числа нет в месяце, срок переносится на его последний день.</p>
    </aside>
  </div>
</template>
