<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  channelLabels,
  channelUpdatePayload,
  isIntegration,
  integrationError,
  type Channel,
  type IntegrationConnection,
  type IntegrationProvider,
} from '@/entities/channel'
import { api, jsonBody } from '@/shared/api'
import { AppIcon } from '@/shared/ui'
const props = defineProps<{
  channel?: Channel
  connection?: IntegrationConnection
  connections: IntegrationConnection[]
  providers: IntegrationProvider[]
}>()
const emit = defineEmits<{ close: []; saved: []; connect: [] }>()
const form = reactive({
  name: props.channel?.name || '',
  kind: props.channel?.kind || props.connection?.provider || 'telegram',
  email: props.channel?.config.email || '',
  url: props.channel?.config.url || '',
  secret: '',
  connection_id: props.channel?.connection_id || props.connection?.id || '',
  remote_chat_id: props.channel?.remote_chat_id || '',
})
const busy = ref(false),
  error = ref('')
const title = ref<HTMLElement | null>(null)
onMounted(() => title.value?.focus())
const available = computed(() =>
  props.connections.filter((c) => c.provider === form.kind && c.active),
)
const selected = computed(() =>
  props.connections.find((c) => c.id === form.connection_id && c.provider === form.kind),
)
watch(
  () => form.kind,
  () => {
    form.secret = ''
    form.connection_id = ''
    form.remote_chat_id = ''
    error.value = ''
  },
)
async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (!form.name.trim()) throw new Error('Укажите название канала.')
    if (
      isIntegration(form.kind) &&
      (!selected.value?.active || selected.value.health_status !== 'healthy')
    )
      throw new Error('Сначала включите и проверьте выбранного бота.')
    if (isIntegration(form.kind) && !form.remote_chat_id.trim()) throw new Error('Укажите ID чата.')
    const config: Record<string, string> =
      form.kind === 'email'
        ? { email: form.email.trim() }
        : form.kind === 'webhook'
          ? { url: form.url.trim(), ...(form.secret ? { secret: form.secret } : {}) }
          : props.channel?.kind === 'telegram'
            ? props.channel.config
            : {}
    const body = channelUpdatePayload({
      id: '',
      name: form.name.trim(),
      kind: form.kind,
      config,
      active: props.channel?.active ?? true,
      connection_id: isIntegration(form.kind) ? form.connection_id : null,
      remote_chat_id: isIntegration(form.kind) ? form.remote_chat_id.trim() : null,
    })
    await api(props.channel ? `/channels/${props.channel.id}` : '/channels', {
      method: props.channel ? 'PATCH' : 'POST',
      body: jsonBody(body),
    })
    form.secret = ''
    emit('saved')
  } catch (e) {
    error.value = integrationError(e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <form
    class="panel form-panel recipient-form"
    aria-labelledby="channel-form-title"
    :aria-busy="busy"
    @submit.prevent="save"
  >
    <div class="section-heading">
      <div>
        <h2 id="channel-form-title" ref="title" tabindex="-1">
          {{ channel ? 'Изменить канал' : 'Новый канал-получатель' }}
        </h2>
        <p>Выберите, куда отправлять счета и напоминания.</p>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="Закрыть форму канала"
        :disabled="busy"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <div class="form-grid">
      <label
        >Название канала<input
          v-model="form.name"
          required
          maxlength="120"
          placeholder="Например, бухгалтерия"
          :disabled="busy"
      /></label>
      <label
        >Способ доставки<select v-model="form.kind" :disabled="busy || !!channel">
          <option value="telegram">Telegram</option>
          <option value="email">Email через SMTP</option>
          <option value="webhook">Webhook</option>
          <option v-for="item in providers" :key="item.provider" :value="item.provider">
            {{ item.label }}
          </option>
        </select></label
      >
      <label v-if="form.kind === 'email'"
        >Email получателя<input
          v-model="form.email"
          type="email"
          required
          :disabled="busy"
          placeholder="team@example.com"
      /></label>
      <template v-if="form.kind === 'webhook'"
        ><label
          >Адрес webhook<input
            v-model="form.url"
            type="url"
            required
            :disabled="busy"
            placeholder="https://example.com/events" /></label
        ><label
          >Секрет подписи <span class="optional">необязательно</span
          ><input
            v-model="form.secret"
            type="password"
            autocomplete="new-password"
            :disabled="busy"
            :placeholder="channel ? 'Оставьте пустым, чтобы сохранить' : ''" /></label
      ></template>
      <template v-if="isIntegration(form.kind)">
        <label
          >Бот / сервер<select v-model="form.connection_id" required :disabled="busy">
            <option value="" disabled>Выберите подключение</option>
            <option v-for="item in available" :key="item.id" :value="item.id">
              {{ item.name }}{{ item.health_status !== 'healthy' ? ' · не проверен' : '' }}
            </option>
          </select></label
        >
        <label
          >{{ form.kind === 'vk_teams' ? 'ID чата VK Teams' : 'Channel ID Mattermost'
          }}<input
            v-model="form.remote_chat_id"
            required
            maxlength="200"
            :disabled="busy"
            :placeholder="
              form.kind === 'vk_teams' ? 'Например, 123456@chat.agent' : 'ID из сведений о канале'
            "
        /></label>
      </template>
    </div>
    <p v-if="form.kind === 'telegram'" class="field-help">
      После сохранения нажмите «Подключить чат» и выберите группу в Telegram.
    </p>
    <div v-if="isIntegration(form.kind)" class="recipient-hint">
      <p class="field-help">
        {{ channelLabels[form.kind] }}: добавьте бота в целевой чат перед отправкой. ID передаётся
        как строка. Сохранение канала не проверяет права бота в чате.
      </p>
      <button
        v-if="!available.length"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="emit('connect')"
      >
        Сначала подключить бота
      </button>
    </div>
    <p v-if="error" class="error-box" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button class="button" :disabled="busy || (isIntegration(form.kind) && !available.length)">
        {{ busy ? 'Сохраняем…' : channel ? 'Сохранить канал' : 'Добавить канал' }}</button
      ><button type="button" class="button secondary" :disabled="busy" @click="emit('close')">
        Отмена
      </button>
    </div>
  </form>
</template>
<style scoped>
.recipient-form {
  margin: 18px 0 24px;
}
.section-heading {
  align-items: flex-start;
}
.form-actions {
  flex-wrap: wrap;
}
.recipient-hint {
  margin: 8px 0 16px;
}
h2:focus {
  outline: none;
}
</style>
