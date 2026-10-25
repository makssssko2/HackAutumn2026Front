<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSession } from '@/entities/session'
import {
  ChannelState,
  channelLabels,
  channelWarning,
  channelUpdatePayload,
  connectionLabel,
  connectionReady,
  integrationApi,
  integrationError,
  isIntegration,
  type Channel,
  type IntegrationConnection,
} from '@/entities/channel'
import { api, jsonBody } from '@/shared/api'
import { dateLabel, useAsyncData, usePagedList } from '@/shared/lib'
import { AppIcon, AsyncState, Pagination } from '@/shared/ui'
import ConnectionForm from './ConnectionForm.vue'
import ChannelForm from './ChannelForm.vue'
import IntegrationHelp from './IntegrationHelp.vue'
import LegacyChannelHelp from './LegacyChannelHelp.vue'

const session = useSession()
const {
  rows: channels,
  total,
  page,
  pageSize,
  loading,
  error,
  reload,
} = usePagedList<Channel>('/channels')
const integrations = useAsyncData(
  async (signal) => {
    const [providers, connections] = await Promise.all([
      integrationApi.providers(signal),
      integrationApi.connections(signal),
    ])
    return { providers: providers.filter((p) => isIntegration(p.provider)), connections }
  },
  {
    providers: [] as Awaited<ReturnType<typeof integrationApi.providers>>,
    connections: [] as IntegrationConnection[],
  },
)
const connectionList = computed(() =>
  integrations.error.value ? undefined : integrations.data.value.connections,
)
const bots = usePagedList<IntegrationConnection>('/integrations/connections', () => ({}), {
  enabled: () => !integrations.loading.value && !integrations.error.value,
})
const busy = ref(''),
  operationError = ref(''),
  message = ref('')
const connectionForm = ref(false),
  editedConnection = ref<IntegrationConnection>(),
  verifyOnly = ref(false)
const channelForm = ref(false),
  editedChannel = ref<Channel>(),
  selectedConnection = ref<IntegrationConnection>()
const telegramLink = ref<{ channel: string; url: string } | null>(null)
const testChannel = ref<Channel | null>(null)
const addChannelButton = ref<HTMLButtonElement | null>(null)
function openConnection(connection?: IntegrationConnection, verification = false) {
  editedConnection.value = connection
  verifyOnly.value = verification
  connectionForm.value = true
  channelForm.value = false
  operationError.value = ''
  message.value = ''
}
function openChannel(connection?: IntegrationConnection, channel?: Channel) {
  selectedConnection.value = connection
  editedChannel.value = channel
  channelForm.value = true
  connectionForm.value = false
  operationError.value = ''
  message.value = ''
}
async function closeForm() {
  connectionForm.value = false
  channelForm.value = false
  await nextTick()
  addChannelButton.value?.focus()
}
function savedConnection(connection: IntegrationConnection) {
  const existing = integrations.data.value.connections.filter((c) => c.id !== connection.id)
  integrations.data.value = { ...integrations.data.value, connections: [...existing, connection] }
  void bots.reload()
}
async function savedChannel() {
  message.value = 'Канал сохранён. Отправьте тест и проверьте результат в журнале рассылок.'
  channelForm.value = false
  await reload()
  await nextTick()
  addChannelButton.value?.focus()
}
async function operate(id: string, action: () => Promise<unknown>, success: string) {
  if (busy.value) return
  busy.value = id
  operationError.value = ''
  message.value = ''
  try {
    await action()
    message.value = success
  } catch (e) {
    operationError.value = integrationError(e)
  } finally {
    busy.value = ''
  }
}
async function validate(connection: IntegrationConnection) {
  await operate(
    connection.id,
    async () => {
      try {
        savedConnection(await integrationApi.validate(connection.id))
      } catch (e) {
        const current = await integrationApi.status(connection.id).catch(() => null)
        if (current) savedConnection(current)
        throw e
      }
    },
    connection.provider === 'bitrix24'
      ? 'Доступ к API проверен. Если бот ещё не зарегистрирован, завершите регистрацию перед добавлением чата.'
      : 'API бота проверен. Отправку и работу кнопки проверьте в целевом чате.',
  )
}
async function toggleConnection(connection: IntegrationConnection) {
  await operate(
    connection.id,
    async () => {
      savedConnection(await integrationApi.update(connection.id, { active: !connection.active }))
    },
    connection.active
      ? 'Бот отключён для всех его чатов.'
      : 'Бот включён. Проверьте API повторно перед отправкой.',
  )
}
async function connectTelegram(channel: Channel) {
  await operate(
    channel.id,
    async () => {
      const result = await api<{ url: string }>(`/channels/${channel.id}/telegram-link`, {
        method: 'POST',
      })
      telegramLink.value = { channel: channel.name, url: result.url }
    },
    'Откройте Telegram и выберите группу. Ссылка действует 10 минут.',
  )
}
async function toggleChannel(channel: Channel) {
  await operate(
    channel.id,
    async () => {
      await api(`/channels/${channel.id}`, {
        method: 'PATCH',
        body: jsonBody(channelUpdatePayload(channel, { active: !channel.active })),
      })
      await reload()
    },
    channel.active ? 'Канал отключён.' : 'Канал включён.',
  )
}
async function sendTest(channel: Channel) {
  await operate(
    channel.id,
    () => api(`/channels/${channel.id}/test`, { method: 'POST' }),
    'Тест поставлен в очередь. Результат отправки появится в журнале рассылок.',
  )
  testChannel.value = null
}
function connectionFor(channel: Channel) {
  return connectionList.value?.find((c) => c.id === channel.connection_id)
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Подключения</h1>
      <p>Подключите бота один раз и выберите чаты, в которые будут приходить счета.</p>
    </div>
    <button ref="addChannelButton" class="button" @click="openChannel()">
      <AppIcon name="plus" :size="18" />Добавить канал
    </button>
  </div>
  <div v-if="message" class="success-box" role="status">
    {{ message }}
    <RouterLink v-if="message.startsWith('Тест')" to="/notifications">Открыть журнал</RouterLink>
  </div>
  <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
  <section class="integration-section" aria-labelledby="integration-title">
    <div class="section-heading">
      <div>
        <h2 id="integration-title">Боты и серверы</h2>
        <p>VK Teams, Mattermost и Битрикс24. Одно подключение — несколько чатов-получателей.</p>
      </div>
      <button
        class="button secondary"
        :disabled="
          integrations.loading.value ||
          !!integrations.error.value ||
          !integrations.data.value.providers.length
        "
        @click="openConnection()"
      >
        <AppIcon name="plus" :size="17" />Подключить бота
      </button>
    </div>
    <p v-if="integrations.loading.value" class="muted" role="status" aria-busy="true">
      Загружаем подключения ботов…
    </p>
    <div v-else-if="integrations.error.value || bots.error.value" class="error-box" role="alert">
      Не удалось загрузить подключения ботов. Остальные каналы доступны.
      <button class="text-button" @click="integrations.reload">Повторить</button>
    </div>
    <p v-else-if="bots.loading.value" class="muted" role="status" aria-busy="true">
      Загружаем страницу подключений…
    </p>
    <div v-else-if="bots.rows.value.length" class="panel bot-list">
      <article v-for="connection in bots.rows.value" :key="connection.id" class="bot-row">
        <AppIcon :name="connection.provider" :size="24" />
        <div class="bot-description">
          <h3>{{ connection.name }}</h3>
          <p>{{ channelLabels[connection.provider] }} · {{ connection.base_url }}</p>
          <small v-if="connection.last_checked_at"
            >Проверка:
            {{
              dateLabel(connection.last_checked_at, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            }}</small
          ><small v-if="connection.last_event_at"
            >Последнее событие:
            {{
              dateLabel(connection.last_event_at, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            }}</small
          >
        </div>
        <span
          class="status"
          :class="
            !connection.active
              ? 'cancelled'
              : connectionReady(connection)
                ? 'paid'
                : connection.health_status === 'error'
                  ? 'overdue'
                  : 'unpaid'
          "
          >{{ connectionLabel(connection) }}</span
        >
        <div class="bot-actions">
          <button
            class="text-button"
            :disabled="!!busy || !connection.active"
            @click="validate(connection)"
          >
            {{
              busy === connection.id
                ? 'Подождите…'
                : connection.provider === 'bitrix24'
                  ? 'Проверить доступ'
                  : 'Проверить бота'
            }}
          </button>
          <button
            class="text-button"
            :disabled="!!busy"
            @click="
              openConnection(
                connection,
                connection.provider === 'bitrix24' &&
                  connection.health_status === 'healthy' &&
                  !connectionReady(connection),
              )
            "
          >
            {{
              connection.provider === 'bitrix24' &&
              connection.health_status === 'healthy' &&
              !connectionReady(connection)
                ? 'Завершить регистрацию'
                : 'Настроить'
            }}
          </button>
          <button
            class="button secondary small"
            :disabled="!!busy || !connectionReady(connection)"
            @click="openChannel(connection)"
          >
            Добавить чат
          </button>
          <button class="text-button" :disabled="!!busy" @click="toggleConnection(connection)">
            {{ connection.active ? 'Отключить бота' : 'Включить бота' }}
          </button>
        </div>
      </article>
    </div>
    <p v-else class="integration-empty">
      Ботов пока нет. Подключите VK Teams, Mattermost или Битрикс24, чтобы команда подтверждала
      оплату прямо в чате.
    </p>
    <Pagination
      v-if="!integrations.error.value && !bots.error.value"
      v-model:page="bots.page.value"
      v-model:page-size="bots.pageSize.value"
      :total="bots.total.value"
      :loading="bots.loading.value"
      label="Страницы подключений ботов"
    />
    <ConnectionForm
      v-if="connectionForm"
      :key="editedConnection?.id || 'new'"
      :connection="editedConnection"
      :verify-only="verifyOnly"
      :providers="integrations.data.value.providers"
      @close="closeForm"
      @saved="savedConnection"
      @chat="openChannel"
    />
  </section>
  <section class="recipient-section" aria-labelledby="recipient-title">
    <div class="section-heading">
      <div>
        <h2 id="recipient-title">Каналы-получатели</h2>
        <p>Чаты, почта и внешние сервисы. Выбираются при выставлении счёта и в группах рассылки.</p>
      </div>
      <button class="text-button" :disabled="loading" @click="reload">Обновить список</button>
    </div>
    <ChannelForm
      v-if="channelForm"
      :key="`${editedChannel?.id || 'new'}-${selectedConnection?.id || ''}`"
      :channel="editedChannel"
      :connection="selectedConnection"
      :connections="integrations.data.value.connections"
      :providers="integrations.data.value.providers"
      @close="closeForm"
      @saved="savedChannel"
      @connect="openConnection()"
    />
    <section v-if="telegramLink" class="panel telegram-link-panel">
      <div class="section-heading">
        <h3>Подключить «{{ telegramLink.channel }}»</h3>
        <button
          class="icon-button"
          aria-label="Скрыть подключение Telegram"
          @click="telegramLink = null"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <p>
        Выберите группу, где вы администратор, и подтвердите добавление бота. Ссылка одноразовая и
        действует 10 минут.
      </p>
      <a :href="telegramLink.url" class="button" target="_blank" rel="noopener noreferrer"
        >Выбрать группу в Telegram</a
      >
      <button class="button secondary" @click="reload">Проверить привязку</button>
    </section>
    <AsyncState :loading="loading" :error="error" @retry="reload">
      <section v-if="channels.length" class="panel channel-list">
        <article v-for="channel in channels" :key="channel.id" class="channel-row">
          <span class="channel-symbol"><AppIcon :name="channel.kind" :size="24" /></span>
          <div class="channel-description">
            <h3>{{ channel.name }}</h3>
            <p>
              {{ channelLabels[channel.kind] || channel.kind
              }}<template v-if="isIntegration(channel.kind)">
                · {{ connectionFor(channel)?.name || 'Подключение недоступно' }} ·
                {{ channel.remote_chat_id || 'Чат не указан' }}</template
              ><template v-else-if="channel.kind === 'telegram' && channel.config.chat_id">
                · Чат {{ channel.config.chat_id }}</template
              ><template v-else-if="channel.kind === 'email'">
                · {{ channel.config.email }}</template
              ><template v-else-if="channel.kind === 'webhook'">
                · {{ channel.config.url }}</template
              >
            </p>
            <small
              v-if="channel.kind === 'telegram' && !session.settings?.telegram_configured"
              class="warning-text"
              >Токен Telegram-бота пока не задан</small
            ><small
              v-if="channel.kind === 'email' && !session.settings?.smtp_configured"
              class="warning-text"
              >SMTP пока не настроен</small
            >
          </div>
          <ChannelState :channel="channel" :connections="connectionList" />
          <div class="channel-actions">
            <button
              v-if="channel.kind === 'telegram'"
              class="button small secondary"
              :disabled="!!busy"
              @click="connectTelegram(channel)"
            >
              {{ channel.config.chat_id ? 'Перепривязать' : 'Подключить чат' }}
            </button>
            <button
              v-if="channel.kind !== 'inapp'"
              class="text-button"
              :disabled="!!busy"
              @click="openChannel(undefined, channel)"
            >
              Изменить
            </button>
            <button
              class="text-button"
              :disabled="!!busy || !!channelWarning(channel, connectionList)"
              @click="testChannel = channel"
            >
              Тест
            </button>
            <button
              v-if="channel.kind !== 'inapp'"
              class="text-button"
              :disabled="!!busy"
              @click="toggleChannel(channel)"
            >
              {{ channel.active ? 'Отключить' : 'Включить' }}
            </button>
          </div>
          <div
            v-if="testChannel?.id === channel.id"
            class="test-confirmation"
            role="group"
            :aria-label="`Тест канала ${channel.name}`"
          >
            <p>
              Отправить тест в «{{ channel.name }}»? Сервер использует один из сохранённых счетов. В
              сообщении могут быть данные счёта и кнопка демонстрационной оплаты.
            </p>
            <div class="test-actions">
              <button class="button secondary small" :disabled="!!busy" @click="sendTest(channel)">
                Отправить тест</button
              ><button class="text-button" :disabled="!!busy" @click="testChannel = null">
                Отмена
              </button>
            </div>
          </div>
        </article>
      </section>
      <p v-else class="integration-empty">Добавьте первый канал, чтобы отправлять счета команде.</p>
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :loading="loading"
        label="Страницы каналов-получателей"
      />
    </AsyncState>
  </section>
  <section class="connection-guides" aria-labelledby="connection-guides-title">
    <h2 id="connection-guides-title">Инструкции подключения</h2>
    <IntegrationHelp /><LegacyChannelHelp />
    <p class="field-help">
      Часовой пояс: {{ session.settings?.timezone }}. Настройки Telegram и отправителя SMTP задаются
      администратором сервера.
    </p>
  </section>
</template>
<style scoped>
.recipient-section > .section-heading {
  margin-bottom: 24px;
}
.integration-section {
  margin: 30px 0 36px;
}
.integration-section > .section-heading {
  padding-bottom: 20px;
}
.recipient-section {
  margin-bottom: 38px;
}
.section-heading {
  align-items: flex-start;
  flex-wrap: wrap;
}
.section-heading p {
  max-width: 70ch;
}
.bot-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  gap: 14px;
  padding: 22px 24px;
  align-items: center;
}
.bot-row + .bot-row {
  border-top: 1px solid var(--line);
}
.bot-row > svg {
  color: var(--accent-ink);
}
.bot-description {
  min-width: 0;
}
.bot-description h3,
.channel-description h3 {
  font-size: 15px;
  overflow-wrap: anywhere;
}
.bot-description p {
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: var(--muted);
  font-size: var(--text-secondary);
}
.bot-description small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
}
.bot-actions {
  grid-column: 2 / -1;
  display: flex;
  gap: 10px 18px;
  align-items: center;
  flex-wrap: wrap;
}
.integration-empty {
  padding: 22px 0;
  border-top: 1px solid var(--line);
  color: var(--muted);
  max-width: 75ch;
}
.channel-description {
  min-width: 0;
}
.channel-description p {
  overflow-wrap: anywhere;
}
.channel-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 156px;
  align-items: start;
  gap: 14px 18px;
}
.channel-actions {
  display: flex;
  grid-column: 2 / -1;
  justify-self: start;
  justify-content: flex-start;
  width: 100%;
  max-width: none;
  margin: 0;
  gap: 8px 16px;
  flex-wrap: wrap;
}
.test-confirmation {
  grid-column: 2 / -1;
  padding: 16px 0 0;
  border-top: 1px solid var(--line);
}
.test-confirmation p {
  max-width: 75ch;
  margin-bottom: 12px;
}
.test-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.connection-guides > h2 {
  margin-bottom: 18px;
}
.connection-guides :deep(.telegram-setup-guide) {
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0;
  padding: 16px 0;
  margin: 0;
  background: transparent;
}
.integration-future {
  padding: 16px 0;
  border-top: 1px solid var(--line);
}
.integration-future summary {
  cursor: pointer;
  font-weight: 600;
}
.integration-future p {
  color: var(--muted);
  margin-top: 14px;
  max-width: 74ch;
}
.connection-guides > .field-help {
  margin-top: 22px;
}
@media (max-width: 640px) {
  .channel-row {
    grid-template-columns: 44px minmax(0, 1fr);
  }
  .channel-row > .channel-state {
    grid-column: 2;
  }
  .bot-row {
    padding: 18px;
    grid-template-columns: 24px minmax(0, 1fr);
  }
  .bot-row > .status {
    grid-column: 2;
    justify-self: start;
  }
  .bot-actions {
    grid-column: 1 / -1;
    gap: 8px 16px;
  }
  .bot-actions .text-button,
  .channel-actions .text-button {
    min-height: 44px;
  }
  .channel-actions {
    width: 100%;
  }
}
@media (min-width: 1300px) {
  .channel-row {
    grid-template-columns: 44px minmax(180px, 1fr) 156px minmax(340px, 400px);
    align-items: center;
  }
  .channel-actions {
    grid-column: auto;
  }
}
</style>
