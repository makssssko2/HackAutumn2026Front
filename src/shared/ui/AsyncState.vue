<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ loading: boolean; error?: string }>()
defineEmits<{ retry: [] }>()
const hasContent = ref(false)
watch(
  () => [props.loading, props.error],
  () => {
    if (!props.loading && !props.error) hasContent.value = true
  },
  { immediate: true },
)
</script>
<template>
  <div v-if="loading && !hasContent" class="skeleton-group" aria-busy="true" aria-label="Загрузка">
    <div class="skeleton" />
    <div class="skeleton" />
    <div class="skeleton" />
  </div>
  <div v-else-if="error" class="error-box" role="alert">
    <p>{{ error }}</p>
    <button class="button secondary" @click="$emit('retry')">Попробовать снова</button>
  </div>
  <div
    v-else
    class="async-content"
    :class="{ refreshing: loading }"
    :aria-busy="loading"
    :inert="loading"
  >
    <slot />
  </div>
</template>
<style scoped>
.async-content {
  display: flow-root;
  min-width: 0;
  transition: opacity var(--transition-duration-fast);
}
.refreshing {
  opacity: 0.5;
}
</style>
