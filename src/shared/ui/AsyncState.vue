<script setup lang="ts">
defineProps<{ loading: boolean; error?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="skeleton-group" aria-busy="true" aria-label="Загрузка">
    <div class="skeleton" />
    <div class="skeleton" />
    <div class="skeleton" />
  </div>
  <div v-else-if="error" class="error-box" role="alert">
    <p>{{ error }}</p>
    <button class="button secondary" @click="$emit('retry')">Попробовать снова</button>
  </div>
  <slot v-else />
</template>
