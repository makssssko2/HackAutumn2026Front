<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { paymentApi } from '@/entities/payment'
import { useSession } from '@/entities/session'
import {
  recipientChannels,
  needsChat,
  channelLabels,
  type Channel,
  type AudienceGroup,
} from '@/entities/channel'
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
const recipientMode = ref<'all' | 'groups'>('all')
const selectedGroupIds = computed(() => (recipientMode.value === 'all' ? [] : form.group_ids))
const {
  data: recipients,
  loading: recipientsLoading,
  error: recipientsError,
  reload: reloadRecipients,
} = useAsyncData(
  async () => {
    const [groups, channels] = await Promise.all([
      api<AudienceGroup[]>('/groups'),
      api<Channel[]>('/channels'),
    ])
    return { groups, channels: channels.filter((channel) => channel.active) }
  },
  { groups: [] as AudienceGroup[], channels: [] as Channel[] },
)
const targets = computed(() =>
  recipientMode.value === 'groups' && !form.group_ids.length
    ? []
    : recipientChannels(
        recipients.value.channels,
        recipients.value.groups,
        selectedGroupIds.value,
      ).filter((c) => c.kind !== 'inapp'),
)
const pendingChats = computed(() => targets.value.filter(needsChat).length)
const busy = ref(false),
  error = ref('')
async function submit() {
  if (recipientMode.value === 'groups' && !form.group_ids.length) {
    error.value = 'Выберите хотя бы одну группу или режим «Всем активным каналам».'
    return
  }
  if (recipientsError.value) {
    error.value = 'Не удалось проверить получателей. Повторите загрузку перед отправкой.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const payment = await paymentApi.create({ ...form, group_ids: selectedGroupIds.value })
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
        <div class="recipient-modes">
          <label class="choice-row"
            ><input v-model="recipientMode" type="radio" value="all" name="recipient-mode" />Всем
            активным каналам</label
          >
          <label class="choice-row"
            ><input
              v-model="recipientMode"
              type="radio"
              value="groups"
              name="recipient-mode"
            />Выбранным группам</label
          >
        </div>
        <p class="field-help">
          {{
            recipientMode === 'all'
              ? 'Включает активные каналы без групп. Непривязанные чаты остаются включенными и ждут подключения.'
              : 'Сообщение получат каналы выбранных групп. Повторяющиеся адресаты учитываются один раз.'
          }}
        </p>
        <label
          v-for="group in recipientMode === 'groups' ? recipients.groups : []"
          :key="group.id"
          class="checkbox-label choice-row"
          ><input v-model="form.group_ids" type="checkbox" :value="group.id" />{{
            group.name
          }}</label
        >
        <p v-if="recipientMode === 'groups' && !recipients.groups.length" class="muted">
          Группы можно добавить в разделе «Группы рассылки».
        </p>
      </fieldset>
      <section class="recipient-preview" aria-labelledby="recipient-preview-title">
        <div class="section-heading">
          <h3 id="recipient-preview-title">Получатели этого счета</h3>
          <span class="muted">{{
            recipientsLoading ? 'Загружаем…' : `Каналов: ${targets.length}`
          }}</span>
        </div>
        <ul v-if="targets.length" class="recipient-channel-list">
          <li v-for="channel in targets" :key="channel.id">
            <AppIcon :name="channel.kind" :size="18" /><span
              >{{ channel.name
              }}<small
                >{{ channelLabels[channel.kind]
                }}<template v-if="needsChat(channel)"> · чат не привязан</template></small
              ></span
            >
          </li>
        </ul>
        <p v-else-if="!recipientsLoading" class="field-help">
          {{
            recipientMode === 'groups' && !form.group_ids.length
              ? 'Выберите группы, чтобы увидеть адресатов.'
              : 'Внешних адресатов нет. Счет останется в журнале администратора.'
          }}
        </p>
        <p v-if="pendingChats" class="recipient-warning">
          Чатов без привязки: {{ pendingChats }}. Они включены, но отправка станет доступна после
          подключения. Старые счета автоматически не догоняются.
        </p>
        <p class="field-help">
          Предварительный список для нового счета. Результат отправки появится в журнале рассылок.
          Журнал администратора ведется отдельно.
        </p>
      </section>
      <p v-if="recipientsError" class="error-text">
        {{ recipientsError }}
        <button type="button" class="text-button" @click="reloadRecipients">Повторить</button>
      </p>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <div class="form-actions">
        <RouterLink to="/recurring" class="button secondary">Отмена</RouterLink
        ><button class="button" :disabled="busy || recipientsLoading || !!recipientsError">
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
