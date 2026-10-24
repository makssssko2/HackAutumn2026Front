<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
const props = withDefaults(defineProps<{ page: number; total: number; pageSize?: number }>(), {
  pageSize: 12,
})
defineEmits<{ 'update:page': [value: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>
<template>
  <div v-if="total" class="pagination">
    <span class="muted"
      >{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} из
      {{ total }} записей</span
    >
    <nav v-if="pages > 1" aria-label="Страницы списка">
      <button
        class="icon-button"
        aria-label="Предыдущая страница"
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        <AppIcon name="left" />
      </button>
      <span role="status">{{ page }} / {{ pages }}</span>
      <button
        class="icon-button"
        aria-label="Следующая страница"
        :disabled="page >= pages"
        @click="$emit('update:page', page + 1)"
      >
        <AppIcon name="right" />
      </button>
    </nav>
  </div>
</template>
