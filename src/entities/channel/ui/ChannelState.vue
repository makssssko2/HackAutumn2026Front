<script setup lang="ts">
import { needsChat, type Channel } from '../model/channel'
defineProps<{ channel: Channel }>()
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
  </span>
</template>
