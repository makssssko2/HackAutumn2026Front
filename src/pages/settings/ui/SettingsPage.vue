<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useSession } from '@/entities/session'
import { api, jsonBody } from '@/shared/api'
import { useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
interface Channel {
  id: string
  name: string
  kind: string
  config: Record<string, string>
  active: boolean
}
const session = useSession()
const { data, loading, error, reload } = useAsyncData(() => api<Channel[]>('/channels'), [])
const showForm = ref(false),
  busy = ref(false),
  operationError = ref(''),
  message = ref('')
const form = reactive({ name: '', kind: 'telegram', email: '', url: '', secret: '' })
const linkCommand = ref<{ channel: string; command: string } | null>(null)
const kindLabel: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  webhook: 'Webhook',
  inapp: 'Внутри приложения',
}
async function operate(action: () => Promise<unknown>, success: string) {
  busy.value = true
  operationError.value = ''
  message.value = ''
  try {
    await action()
    await reload()
    message.value = success
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
async function submit() {
  const config =
    form.kind === 'email'
      ? { email: form.email }
      : form.kind === 'webhook'
        ? { url: form.url, secret: form.secret }
        : {}
  await operate(
    () =>
      api('/channels', {
        method: 'POST',
        body: jsonBody({ name: form.name, kind: form.kind, config }),
      }),
    'Подключение создано',
  )
  if (!operationError.value) {
    showForm.value = false
    form.name = ''
    form.secret = ''
  }
}
async function connect(channel: Channel) {
  await operate(async () => {
    const result = await api<{ command: string }>(`/channels/${channel.id}/telegram-link`, {
      method: 'POST',
    })
    linkCommand.value = { channel: channel.name, command: result.command }
  }, 'Код подключения действует 10 минут')
}
async function toggle(channel: Channel) {
  await operate(
    () =>
      api(`/channels/${channel.id}`, {
        method: 'PATCH',
        body: jsonBody({
          name: channel.name,
          kind: channel.kind,
          config: channel.config,
          active: !channel.active,
        }),
      }),
    channel.active ? 'Канал отключен' : 'Канал включен',
  )
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Подключения</h1>
      <p>Куда отправлять счета и напоминания команды.</p>
    </div>
    <button class="button" @click="showForm = !showForm">
      <AppIcon name="plus" :size="18" />Добавить канал
    </button>
  </div>
  <div class="setup-note">
    <AppIcon name="settings" :size="22" />
    <p>
      Часовой пояс: <strong>{{ session.settings?.timezone }}</strong
      >. Токен бота и параметры SMTP задаются на сервере через <code>.env</code>.
    </p>
  </div>
  <details class="panel telegram-setup-guide">
    <summary>Как подключить Telegram-бота</summary>
    <ol>
      <li>Создайте бота через @BotFather командой /newbot и скопируйте выданный токен.</li>
      <li>
        На сервере откройте <code>Back/.env</code> и заполните
        <code>TELEGRAM_BOT_TOKEN=ваш_токен</code>.
      </li>
      <li>
        Из папки Back запустите:
        <pre><code>docker compose --profile telegram up -d --build --force-recreate api worker bot</code></pre>
      </li>
      <li>Здесь нажмите «Добавить канал», выберите Telegram и задайте название группы.</li>
      <li>
        Добавьте бота в группу с разрешением отправлять сообщения и файлы. Нажмите «Подключить чат»
        и выполните выданную команду от имени администратора группы. Код действует 10 минут. Чтобы
        команда точно дошла нужному боту, используйте <code>/connect@имя_бота КОД</code>.
      </li>
      <li>
        Нажмите «Обновить», затем «Тест». После привязки выставляйте новые счета — бот отправит их в
        группу.
      </li>
    </ol>
    <p class="field-help">
      Участники нажимают «Оплатить» прямо в сообщении. Вход в веб-панель им не нужен.
    </p>
  </details>
  <div v-if="message" class="success-box" role="status">{{ message }}</div>
  <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
  <form v-if="showForm" class="panel form-panel compact-form" @submit.prevent="submit">
    <div class="section-heading">
      <h2>Новый канал</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Закрыть форму"
        @click="showForm = false"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <div class="form-grid">
      <label
        >Название<input
          v-model="form.name"
          required
          maxlength="120"
          placeholder="Например, общий чат команды" /></label
      ><label
        >Способ доставки<select v-model="form.kind">
          <option value="telegram">Telegram</option>
          <option value="email">Email через SMTP</option>
          <option value="webhook">Webhook</option>
        </select></label
      ><label v-if="form.kind === 'email'"
        >Email получателя<input
          v-model="form.email"
          type="email"
          required
          placeholder="team@example.com" /></label
      ><template v-if="form.kind === 'webhook'"
        ><label
          >Адрес webhook<input
            v-model="form.url"
            type="url"
            required
            placeholder="https://example.com/invoice-events" /></label
        ><label
          >Секрет подписи <span class="optional">необязательно</span
          ><input v-model="form.secret" type="password" autocomplete="new-password" /></label
      ></template>
    </div>
    <p v-if="form.kind === 'telegram'" class="field-help">
      После создания получите код и выполните команду /connect в группе, где вы администратор.
    </p>
    <div class="form-actions">
      <button class="button" :disabled="busy">{{ busy ? 'Создаем…' : 'Добавить канал' }}</button>
    </div>
  </form>
  <section v-if="linkCommand" class="panel telegram-link-panel">
    <div class="section-heading">
      <h2>Подключить «{{ linkCommand.channel }}»</h2>
      <button class="icon-button" aria-label="Скрыть код подключения" @click="linkCommand = null">
        <AppIcon name="close" />
      </button>
    </div>
    <p>
      Добавьте бота в группу. Выполните команду от имени администратора чата в течение 10 минут:
    </p>
    <code class="connection-code">{{ linkCommand.command }}</code>
    <p class="field-help">
      Код одноразовый. Если в группе включен режим приватности бота, используйте /connect@имя_бота
      КОД. После привязки нажмите «Обновить».
    </p>
    <button class="button secondary" @click="reload">Обновить</button>
  </section>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><section class="panel channel-list">
      <article v-for="channel in data" :key="channel.id" class="channel-row">
        <span class="channel-symbol"><AppIcon :name="channel.kind" :size="24" /></span>
        <div class="channel-description">
          <h2>{{ channel.name }}</h2>
          <p>
            {{ kindLabel[channel.kind]
            }}<span v-if="channel.kind === 'telegram'">
              ·
              {{
                channel.config.chat_id ? `Чат ${channel.config.chat_id}` : 'Чат не привязан'
              }}</span
            ><span v-if="channel.kind === 'email'"> · {{ channel.config.email }}</span
            ><span v-if="channel.kind === 'webhook'"> · {{ channel.config.url }}</span>
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
        <span class="status" :class="channel.active ? 'paid' : 'cancelled'">{{
          channel.active ? 'Включен' : 'Отключен'
        }}</span>
        <div class="channel-actions">
          <button
            v-if="channel.kind === 'telegram'"
            class="button small secondary"
            :disabled="busy"
            @click="connect(channel)"
          >
            {{ channel.config.chat_id ? 'Перепривязать' : 'Подключить чат' }}</button
          ><button
            class="text-button"
            :disabled="busy || !channel.active"
            @click="
              operate(
                () => api(`/channels/${channel.id}/test`, { method: 'POST' }),
                'Тест отправлен в очередь. Результат появится в уведомлениях.',
              )
            "
          >
            Тест</button
          ><button
            v-if="channel.kind !== 'inapp'"
            class="text-button"
            :disabled="busy"
            @click="toggle(channel)"
          >
            {{ channel.active ? 'Отключить' : 'Включить' }}
          </button>
        </div>
      </article>
    </section></AsyncState
  >
</template>
