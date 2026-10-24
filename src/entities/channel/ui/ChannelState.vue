<script setup lang="ts">
import { needsChat, channelWarning, type Channel } from '../model/channel'
import { isIntegration, type IntegrationConnection } from '../model/integration'
defineProps<{ channel: Channel; connections?: IntegrationConnection[] }>()
</script>
<template>
  <span class="channel-state">
    <span class="status" :class="channel.active ? 'paid' : 'cancelled'">{{
      channel.active ? 'Включен' : 'Отключен'
    }}</span>
    <span
      v-if="channel.kind === 'telegram'"
      class="binding-state"
      :class="{ pending: needsChat(channel) }"
      >{{ needsChat(channel) ? 'Чат не привязан' : 'Чат привязан' }}</span
    >
    <span
      v-else-if="isIntegration(channel.kind)"
      class="binding-state"
      :class="{ pending: channel.active && channelWarning(channel, connections) }"
    >
      {{ channelWarning(channel, connections) || 'API бота проверен' }}
    </span>
  </span>
</template>
