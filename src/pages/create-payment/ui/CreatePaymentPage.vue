<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { paymentApi, reminderWindow, type PaymentType } from '@/entities/payment'
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
const paymentType = ref<PaymentType>('recurring')
const notifyImmediately = computed(
  () =>
    paymentType.value === 'recurring' ||
    reminderWindow(
      { paid: false, cancelled: false, due_date: form.first_due_date },
      session.settings?.today || dateISO(),
    ),
)
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
  if (busy.value) return
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
    const savedType = paymentType.value
    const immediate = notifyImmediately.value
    const common = {
      title: form.title,
      description: form.description,
      amount: form.amount,
      currency: form.currency,
      group_ids: selectedGroupIds.value,
    }
    const payment =
      savedType === 'one_time'
        ? await paymentApi.createOneTime({ ...common, due_date: form.first_due_date })
        : await paymentApi.create({
            ...common,
            first_due_date: form.first_due_date,
            frequency: form.frequency,
          })
    // A successful create must not be repeated if the follow-up lookup fails.
    const rows = await paymentApi.list({ recurring_id: payment.id }).catch(() => [])
    router.push(
      rows[0]
        ? `/payments/${rows[0].id}?issued=1&delivery=${immediate ? 'queued' : 'scheduled'}`
        : `/payments?all=1&payment_type=${savedType}&created=1`,
    )
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
      <p>Укажите сумму, срок и получателей. Оплату можно подтвердить в вебе или из уведомления.</p>
    </div>
  </div>
  <div class="form-layout">
    <form class="panel form-panel" @submit.prevent="submit">
      <h2>Что нужно оплатить</h2>
      <fieldset class="payment-type-choice">
        <legend>Тип платежа</legend>
        <div class="recipient-modes">
          <label class="choice-row"
            ><input
              v-model="paymentType"
              type="radio"
              name="payment-type"
              value="recurring"
            />Регулярный</label
          >
          <label class="choice-row"
            ><input
              v-model="paymentType"
              type="radio"
              name="payment-type"
              value="one_time"
            />Разовый</label
          >
        </div>
        <p class="field-help">
          {{
            paymentType === 'one_time'
              ? 'Один счет на выбранную дату, без повторения.'
              : 'Отдельный счет на каждый период по расписанию.'
          }}
        </p>
      </fieldset>
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
        ><label v-if="paymentType === 'recurring'"
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
              : 'Внешних адресатов нет. Счет будет доступен в списке счетов.'
          }}
        </p>
        <p v-if="pendingChats" class="recipient-warning">
          Чатов без привязки: {{ pendingChats }}. Они включены, но отправка станет доступна после
          подключения.
        </p>
        <p class="field-help">
          Список по текущим подключениям. Адресаты определяются при выпуске уведомления. Результат
          отправки появится в журнале рассылок; журнал администратора ведется отдельно.
        </p>
        <p v-if="!notifyImmediately" class="recipient-warning">
          Счет будет сохранен без немедленной рассылки. Напоминание выйдет, когда до срока останется
          три дня.
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
            busy
              ? 'Сохраняем…'
              : notifyImmediately
                ? 'Выставить счет и уведомить'
                : 'Сохранить разовый счет'
          }}
        </button>
      </div>
    </form>
    <aside class="form-aside">
      <h2>Как это работает</h2>
      <p>
        Вы создаете разовый счет или регулярный платеж. После выпуска уведомления участники увидят
        сумму, срок и описание счета.
      </p>
      <div class="preview-invoice">
        <AppIcon name="payments" :size="23" /><strong>{{ form.title || 'Название платежа' }}</strong
        ><span>{{ money(form.amount || 0, form.currency) }}</span
        ><small>{{
          paymentType === 'one_time' ? 'Разовый платеж' : frequencyLabel[form.frequency]
        }}</small>
        <p v-if="form.description" class="preview-description">{{ form.description }}</p>
      </div>
      <RouterLink to="/settings" class="text-link"
        >Подключить Telegram или другой канал<AppIcon name="arrow" :size="15"
      /></RouterLink>
      <p>
        Регулярный платеж уведомляет о первом счете сразу. Разовый — при создании, если до срока не
        больше трех дней, иначе напоминание выйдет позже.
      </p>
      <p v-if="paymentType === 'recurring'">
        Будущие периоды создаются для бюджета заранее, а напоминания выпускаются за три дня до
        срока. Если нужного числа нет в месяце, срок переносится на последний день.
      </p>
    </aside>
  </div>
</template>
