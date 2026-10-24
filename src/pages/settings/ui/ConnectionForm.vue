<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  connectionPayload,
  connectionReady,
  integrationApi,
  integrationError,
  integrationLabels,
  type IntegrationConnection,
  type IntegrationKind,
  type IntegrationProvider,
} from '@/entities/channel'
import { AppIcon } from '@/shared/ui'
import IntegrationHelp from './IntegrationHelp.vue'

const props = defineProps<{
  connection?: IntegrationConnection
  verifyOnly?: boolean
  providers: IntegrationProvider[]
}>()
const emit = defineEmits<{
  close: []
  saved: [connection: IntegrationConnection]
  chat: [connection: IntegrationConnection]
}>()
const provider = ref<IntegrationKind>(
  props.connection?.provider || (props.providers[0]?.provider as IntegrationKind) || 'vk_teams',
)
const saved = ref(props.connection)
const editing = ref(!props.verifyOnly)
const busy = ref(false),
  error = ref('')
const title = ref<HTMLElement | null>(null)
const form = reactive({
  name: props.connection?.name || '',
  base_url:
    props.connection?.base_url ||
    (provider.value === 'vk_teams' ? 'https://myteam.mail.ru/bot/v1' : ''),
  credential: '',
})
const label = computed(() => integrationLabels[provider.value])
const ready = computed(() => !!saved.value && connectionReady(saved.value))
const secretLabel = computed(() =>
  provider.value === 'bitrix24'
    ? 'Входящий webhook'
    : provider.value === 'vk_teams'
      ? 'Токен бота'
      : 'Access Token бота',
)
const addressLabel = computed(() =>
  provider.value === 'bitrix24'
    ? 'Адрес портала Битрикс24'
    : provider.value === 'vk_teams'
      ? 'Адрес Bot API'
      : 'Адрес сервера Mattermost',
)
const addressPlaceholder = computed(() =>
  provider.value === 'bitrix24'
    ? 'https://company.bitrix24.ru'
    : provider.value === 'vk_teams'
      ? 'https://myteam.mail.ru/bot/v1'
      : 'https://chat.company.ru',
)
watch(provider, (value) => {
  form.credential = ''
  form.base_url = value === 'vk_teams' ? 'https://myteam.mail.ru/bot/v1' : ''
  error.value = ''
})
onMounted(() => title.value?.focus())
onUnmounted(() => {
  form.credential = ''
})
async function save() {
  if (busy.value) return
  error.value = ''
  busy.value = true
  try {
    const body = connectionPayload(provider.value, form, saved.value)
    saved.value = saved.value
      ? await integrationApi.update(saved.value.id, body)
      : await integrationApi.create(body)
    form.credential = ''
    editing.value = false
    emit('saved', saved.value)
    await nextTick()
    title.value?.focus()
  } catch (e) {
    error.value = integrationError(e)
  } finally {
    busy.value = false
  }
}
async function verify(action: 'validate' | 'setup') {
  if (!saved.value || busy.value) return
  error.value = ''
  busy.value = true
  try {
    saved.value = await integrationApi[action](saved.value.id)
    emit('saved', saved.value)
  } catch (e) {
    error.value = integrationError(e)
    const current = await integrationApi.status(saved.value.id).catch(() => null)
    if (current) {
      saved.value = current
      emit('saved', current)
    }
  } finally {
    busy.value = false
  }
}
function editCredentials() {
  editing.value = true
  error.value = ''
}
</script>
<template>
  <section
    class="panel form-panel connection-form"
    aria-labelledby="connection-form-title"
    :aria-busy="busy"
  >
    <div class="section-heading">
      <div>
        <h2 id="connection-form-title" ref="title" tabindex="-1">
          {{ connection ? 'Настройки бота' : 'Подключить бота' }}
        </h2>
        <p>Один бот для нескольких чатов. Сначала доступ к сервису, затем получатели.</p>
      </div>
      <button
        class="icon-button"
        type="button"
        :disabled="busy"
        aria-label="Закрыть настройку бота"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <ol class="connection-steps" aria-label="Этапы подключения">
      <li :aria-current="editing ? 'step' : undefined"><span>1</span> Реквизиты</li>
      <li :aria-current="!editing && saved?.health_status !== 'healthy' ? 'step' : undefined">
        <span>2</span> Проверка доступа
      </li>
      <li
        v-if="provider === 'bitrix24'"
        :aria-current="
          !editing && saved?.health_status === 'healthy' && !ready ? 'step' : undefined
        "
      >
        <span>3</span> Регистрация бота
      </li>
      <li :aria-current="!editing && ready ? 'step' : undefined">
        <span>{{ provider === 'bitrix24' ? 4 : 3 }}</span> Чат-получатель
      </li>
    </ol>
    <form v-if="editing" @submit.prevent="save">
      <div class="form-grid">
        <label
          >Сервис<select v-model="provider" :disabled="!!saved || busy">
            <option v-for="item in providers" :key="item.provider" :value="item.provider">
              {{ item.label }}
            </option>
          </select></label
        >
        <label
          >Название подключения<input
            v-model="form.name"
            required
            maxlength="120"
            placeholder="Например, рабочий сервер"
            :disabled="busy"
        /></label>
        <label
          >{{ addressLabel
          }}<input
            v-model="form.base_url"
            type="url"
            required
            maxlength="500"
            :placeholder="addressPlaceholder"
            :disabled="busy"
        /></label>
        <label
          >{{ secretLabel
          }}<span v-if="saved?.has_credentials" class="optional"> · новый, если нужно заменить</span
          ><input
            v-model="form.credential"
            type="password"
            :required="!saved?.has_credentials"
            autocomplete="new-password"
            spellcheck="false"
            :disabled="busy"
            :placeholder="
              saved?.has_credentials
                ? 'Оставьте пустым, чтобы сохранить'
                : provider === 'bitrix24'
                  ? 'https://company.bitrix24.ru/rest/1/секрет/'
                  : 'Вставьте токен из настроек бота'
            "
        /></label>
      </div>
      <p class="field-help">
        {{
          saved?.has_credentials
            ? 'Реквизиты уже сохранены на сервере. Пустое поле их не изменит.'
            : 'Секрет отправляется только серверу Invoice Keeper и не сохраняется в браузере.'
        }}
      </p>
      <p v-if="provider === 'bitrix24'" class="field-help">
        Адрес портала не содержит /rest/ и секрета. Полный входящий webhook с правом imbot вставьте
        в отдельное скрытое поле. После проверки доступа потребуется зарегистрировать бота.
      </p>
      <p v-if="error" class="error-box" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button class="button" :disabled="busy">
          {{ busy ? 'Сохраняем…' : 'Сохранить и продолжить' }}</button
        ><button type="button" class="button secondary" :disabled="busy" @click="emit('close')">
          Отмена
        </button>
      </div>
    </form>
    <div v-else-if="saved" class="connection-verification">
      <div class="saved-connection">
        <AppIcon :name="provider" :size="24" />
        <div>
          <strong>{{ saved.name }}</strong>
          <p>{{ label }} · {{ saved.base_url }}</p>
          <p v-if="provider === 'bitrix24' && saved.external_bot_id">
            ID бота: {{ saved.external_bot_id }}
          </p>
        </div>
      </div>
      <p v-if="ready" class="success-box" role="status">
        {{ provider === 'bitrix24' ? 'Бот и команда оплаты зарегистрированы' : 'API бота проверен'
        }}{{
          provider !== 'bitrix24' && saved.external_bot_id ? ` · ID ${saved.external_bot_id}` : ''
        }}. Теперь добавьте чат-получатель. Доставка и кнопка проверяются в самом чате.
      </p>
      <p
        v-else-if="provider === 'bitrix24' && saved.health_status === 'healthy'"
        class="field-help"
      >
        Доступ к API проверен. Нажмите «Зарегистрировать бота»: это создаст бота и команду оплаты на
        вашем портале. После регистрации добавьте бота в чат.
      </p>
      <p v-else class="field-help">
        Реквизиты сохранены. Проверьте доступ к API бота перед добавлением чата.
      </p>
      <p v-if="error" class="error-box" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button
          v-if="saved.health_status !== 'healthy'"
          class="button"
          :disabled="busy || !saved.active"
          @click="verify('validate')"
        >
          {{
            busy ? 'Проверяем…' : provider === 'bitrix24' ? 'Проверить доступ' : 'Проверить бота'
          }}
        </button>
        <button
          v-else-if="provider === 'bitrix24' && !ready"
          class="button"
          :disabled="busy || !saved.active"
          @click="verify('setup')"
        >
          {{ busy ? 'Регистрируем…' : 'Зарегистрировать бота' }}
        </button>
        <button
          v-else
          class="button"
          :disabled="busy || !saved.active"
          @click="emit('chat', saved)"
        >
          <AppIcon name="plus" :size="18" />Добавить чат
        </button>
        <button class="button secondary" :disabled="busy" @click="editCredentials">
          Изменить реквизиты
        </button>
      </div>
    </div>
    <IntegrationHelp :provider="provider" />
  </section>
</template>
<style scoped>
.connection-form {
  margin: 20px 0 28px;
}
.section-heading {
  align-items: flex-start;
}
.section-heading p {
  max-width: 65ch;
}
.connection-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 26px;
  padding: 0;
  margin: 22px 0;
  list-style: none;
  color: var(--muted);
}
.connection-steps li {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: var(--text-secondary);
}
.connection-steps span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-muted);
}
.connection-steps [aria-current] {
  color: var(--accent-ink);
  font-weight: 600;
}
.connection-steps [aria-current] span {
  background: var(--accent-pale);
}
.form-actions {
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.saved-connection {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
}
.saved-connection p {
  margin-top: 4px;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.saved-connection > div {
  min-width: 0;
}
h2:focus {
  outline: none;
}
.field-help {
  max-width: 74ch;
}
@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
