<script setup lang="ts">
import { reactive, ref } from 'vue'
import { api, jsonBody } from '@/shared/api'
import { useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState } from '@/shared/ui'
import {
  ChannelState,
  channelLabels,
  channelWarning,
  integrationApi,
  type Channel,
} from '@/entities/channel'
interface Group {
  id: string
  name: string
  description: string
  channel_ids: string[]
}
const { data, loading, error, reload } = useAsyncData(
  async () => {
    const [groups, channels, connections] = await Promise.all([
      api<Group[]>('/groups'),
      api<Channel[]>('/channels'),
      integrationApi.connections().catch(() => undefined),
    ])
    return { groups, channels, connections }
  },
  {
    groups: [] as Group[],
    channels: [] as Channel[],
    connections: undefined as Awaited<ReturnType<typeof integrationApi.connections>> | undefined,
  },
)
const editing = ref<string | null>(null),
  showForm = ref(false),
  busy = ref(false),
  operationError = ref('')
const form = reactive({ name: '', description: '', channel_ids: [] as string[] })
function open(group?: Group) {
  editing.value = group?.id || null
  form.name = group?.name || ''
  form.description = group?.description || ''
  form.channel_ids = [...(group?.channel_ids || [])]
  operationError.value = ''
  showForm.value = true
}
async function submit() {
  busy.value = true
  operationError.value = ''
  try {
    await api(editing.value ? `/groups/${editing.value}` : '/groups', {
      method: editing.value ? 'PATCH' : 'POST',
      body: jsonBody(form),
    })
    showForm.value = false
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
async function remove(group: Group) {
  if (
    !window.confirm(
      `Удалить группу «${group.name}»? Используемую в активных платежах группу удалить нельзя.`,
    )
  )
    return
  operationError.value = ''
  try {
    await api(`/groups/${group.id}`, { method: 'DELETE' })
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Группы рассылки</h1>
      <p>Отправляйте счета нужным получателям. Без выбранных групп рассылка идет всем.</p>
    </div>
    <button class="button" @click="open()"><AppIcon name="plus" :size="18" />Создать группу</button>
  </div>
  <form v-if="showForm" class="panel form-panel compact-form" @submit.prevent="submit">
    <div class="section-heading">
      <h2>{{ editing ? 'Изменить группу' : 'Новая группа' }}</h2>
      <button
        type="button"
        class="icon-button"
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
          placeholder="Например, инфраструктура" /></label
      ><label>Описание<input v-model="form.description" maxlength="400" /></label>
    </div>
    <fieldset>
      <legend>Подключенные получатели</legend>
      <label
        v-for="channel in data.channels"
        :key="channel.id"
        class="checkbox-label choice-row group-channel-choice"
        ><input v-model="form.channel_ids" type="checkbox" :value="channel.id" /><span
          >{{ channel.name }}<small>{{ channelLabels[channel.kind] }}</small></span
        ><ChannelState :channel="channel" :connections="data.connections"
      /></label>
    </fieldset>
    <p v-if="operationError" class="error-text" role="alert">{{ operationError }}</p>
    <div class="form-actions">
      <button class="button" :disabled="busy">
        {{ busy ? 'Сохраняем…' : 'Сохранить группу' }}
      </button>
    </div>
  </form>
  <p v-if="operationError && !showForm" class="error-box" role="alert">{{ operationError }}</p>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><section v-if="data.groups.length" class="panel group-list">
      <article v-for="group in data.groups" :key="group.id" class="group-row">
        <span class="notification-symbol"><AppIcon name="groups" :size="22" /></span>
        <div class="group-description">
          <h2>{{ group.name }}</h2>
          <p>{{ group.description || 'Группа получателей' }}</p>
          <div class="recipient-labels">
            <span
              v-for="channel in data.channels.filter((c) => group.channel_ids.includes(c.id))"
              :key="channel.id"
              ><AppIcon :name="channel.kind" :size="15" />{{ channel.name
              }}<small v-if="channelWarning(channel, data.connections)">
                · {{ channelWarning(channel, data.connections) }}</small
              ></span
            ><span v-if="!group.channel_ids.length">Получатели не выбраны</span>
          </div>
        </div>
        <button class="button secondary small" @click="open(group)">Изменить</button
        ><button
          class="icon-button danger-text"
          :aria-label="`Удалить группу ${group.name}`"
          @click="remove(group)"
        >
          <AppIcon name="trash" :size="17" />
        </button>
      </article>
    </section>
    <EmptyState
      v-else
      title="Создайте первую группу"
      description="Объедините чаты, email и webhook для адресной рассылки."
      icon="groups"
  /></AsyncState>
</template>
