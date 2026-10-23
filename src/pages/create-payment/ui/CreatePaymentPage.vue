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
interface RecipientChannel {
  id: string
  name: string
  kind: string
  config: Record<string, string>
  active: boolean
}
const {
  data: recipients,
  error: recipientsError,
  reload: reloadRecipients,
} = useAsyncData(
  async () => {
    const [groups, channels] = await Promise.all([
      api<{ id: string; name: string }[]>('/groups'),
      api<RecipientChannel[]>('/channels'),
    ])
    return { groups, channels: channels.filter((channel) => channel.active) }
  },
  { groups: [] as { id: string; name: string }[], channels: [] as RecipientChannel[] },
)
const busy = ref(false),
  error = ref('')
async function submit() {
  busy.value = true
  error.value = ''
  try {
    const payment = await paymentApi.create(form)
    const rows = await paymentApi.list({ recurring_id: payment.id })
    router.push(rows[0] ? `/payments/${rows[0].id}?issued=1` : '/recurring')
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
      <h1>Выставить счет</h1>
      <p>Укажите сумму, срок и получателей. Пользователи подтвердят оплату из уведомления.</p>
    </div>
  </div>
  <div class="form-layout">
    <form class="panel form-panel" @submit.prevent="submit">
      <h2>Что нужно оплатить</h2>
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
          >Срок оплаты<input
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
        <legend>Куда отправить счет</legend>
        <p class="field-help">Без выбранных групп — всем подключенным получателям.</p>
        <label v-for="group in recipients.groups" :key="group.id" class="checkbox-label"
          ><input v-model="form.group_ids" type="checkbox" :value="group.id" />{{
            group.name
          }}</label
        >
        <p v-if="!recipients.groups.length" class="muted">
          Группы можно добавить в разделе «Группы рассылки».
        </p>
      </fieldset>
      <p v-if="recipientsError" class="error-text">
        {{ recipientsError }}
        <button type="button" class="text-button" @click="reloadRecipients">Повторить</button>
      </p>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <div class="form-actions">
        <RouterLink to="/recurring" class="button secondary">Отмена</RouterLink
        ><button class="button" :disabled="busy">
          <AppIcon :name="busy ? 'loading' : 'plus'" :size="17" />{{
            busy ? 'Выставляем…' : 'Выставить счет и уведомить'
          }}
        </button>
      </div>
    </form>
    <aside class="form-aside">
      <h2>Как это работает</h2>
      <p>
        Вы выставляете счет. Система отправляет сообщение получателям. Участник подтверждает оплату
        в уведомлении, а здесь обновляются статус и чек.
      </p>
      <div class="preview-invoice">
        <AppIcon name="payments" :size="23" /><strong>{{ form.title || 'Название платежа' }}</strong
        ><span>{{ money(form.amount || 0, form.currency) }}</span
        ><small>{{ frequencyLabel[form.frequency] }}</small>
      </div>
      <h3>Подключенные каналы</h3>
      <ul class="recipient-channel-list">
        <li v-for="channel in recipients.channels" :key="channel.id">
          <AppIcon :name="channel.kind" :size="16" /><span
            >{{ channel.name
            }}<small v-if="channel.kind === 'telegram' && !channel.config.chat_id"
              >Чат еще не привязан</small
            ></span
          >
        </li>
      </ul>
      <RouterLink to="/settings" class="text-link"
        >Подключить Telegram или другой канал<AppIcon name="arrow" :size="15"
      /></RouterLink>
      <p>
        Напоминание отправится за три дня до срока. Если до оплаты осталось меньше трех дней — сразу
        после создания.
      </p>
      <p>Если нужного числа нет в месяце, срок переносится на его последний день.</p>
    </aside>
  </div>
</template>
