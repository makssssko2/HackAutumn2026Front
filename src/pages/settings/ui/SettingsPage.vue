<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useSession } from '@/entities/session'
import { ChannelState, needsChat, type Channel } from '@/entities/channel'
import { api, jsonBody } from '@/shared/api'
import { useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
const session = useSession()
const { data, loading, error, reload } = useAsyncData(() => api<Channel[]>('/channels'), [])
const showForm = ref(false),
  busy = ref(false),
  operationError = ref(''),
  message = ref('')
const form = reactive({ name: '', kind: 'telegram', email: '', url: '', secret: '' })
const telegramLink = ref<{ channel: string; url: string } | null>(null)
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
    const result = await api<{ url: string }>(`/channels/${channel.id}/telegram-link`, {
      method: 'POST',
    })
    telegramLink.value = { channel: channel.name, url: result.url }
  }, 'Откройте Telegram и выберите группу. Ссылка действует 10 минут')
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
        Нажмите «Подключить чат» → «Выбрать группу в Telegram». Выберите группу, где вы
        администратор, и подтвердите добавление бота. Код передается автоматически, вводить команды
        не нужно. Боту должна быть разрешена отправка сообщений и файлов.
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
  <details class="panel telegram-setup-guide">
    <summary>Как настроить отправку писем</summary>
    <p>
      Приложение на VPS отправляет письма через почтовый ящик. Отдельный почтовый сервер на VPS не
      нужен.
    </p>
    <ol>
      <li>
        Заведите ящик для уведомлений, например в Яндекс.Почте. В настройках разрешите доступ
        почтовым программам и создайте пароль приложения для Почты.
      </li>
      <li>
        В Back/.env укажите параметры отправителя. Пример для Яндекс.Почты — замените имя ящика и
        пароль на свои:
        <pre><code>SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SSL=true
SMTP_STARTTLS=false
SMTP_USERNAME=имя_ящика
SMTP_PASSWORD=пароль_приложения
SMTP_FROM=имя_ящика@yandex.ru</code></pre>
      </li>
      <li>
        Из папки Back выполните <code>docker compose up -d --force-recreate api worker</code>.
      </li>
      <li>
        Нажмите «Добавить канал» → «Email через SMTP», укажите адрес получателя и сохраните. Затем
        нажмите «Тест» и проверьте журнал рассылок.
      </li>
    </ol>
    <p class="field-help">
      Пароль хранится только в Back/.env. Для другого почтового сервиса используйте его настройки
      SMTP. Поддерживаются SSL на порту 465 и STARTTLS на порту 587.
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
      После создания нажмите «Подключить чат» и выберите группу в Telegram. Вводить команды не
      нужно.
    </p>
    <div class="form-actions">
      <button class="button" :disabled="busy">{{ busy ? 'Создаем…' : 'Добавить канал' }}</button>
    </div>
  </form>
  <section v-if="telegramLink" class="panel telegram-link-panel">
    <div class="section-heading">
      <h2>Подключить «{{ telegramLink.channel }}»</h2>
      <button
        class="icon-button"
        aria-label="Скрыть подключение Telegram"
        @click="telegramLink = null"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <p>
      Откройте Telegram, выберите группу, где вы администратор, и подтвердите добавление бота.
      Привязка произойдет автоматически.
    </p>
    <a :href="telegramLink.url" class="button" target="_blank" rel="noopener noreferrer"
      ><AppIcon name="telegram" :size="18" />Выбрать группу в Telegram</a
    >
    <p class="field-help">
      Ссылка одноразовая, действует 10 минут. После подтверждения в Telegram проверьте привязку
      здесь.
    </p>
    <p class="field-help">
      После подключения в чат приходят новые счета. Уже выставленные счета автоматически не
      рассылаются в новый чат.
    </p>
    <button class="button secondary" @click="reload">Проверить привязку</button>
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
          <small v-if="needsChat(channel)" class="binding-hint"
            >Отправка станет доступна после привязки чата. Канал можно оставить включенным.</small
          >
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
        <ChannelState :channel="channel" />
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
            :disabled="busy || !channel.active || needsChat(channel)"
            :title="needsChat(channel) ? 'Сначала привяжите Telegram-чат' : undefined"
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
