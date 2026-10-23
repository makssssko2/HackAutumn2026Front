<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{ title: string; description?: string; icon?: string }>(), {
  icon: 'payments',
})
</script>
<template>
  <div class="empty-state">
    <AppIcon :name="icon" :size="30" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>
