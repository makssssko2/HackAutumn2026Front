<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
const props = withDefaults(
  defineProps<{
    page: number
    total: number
    pageSize?: number
    loading?: boolean
    label?: string
  }>(),
  {
    pageSize: 12,
    label: 'Страницы списка',
  },
)
defineEmits<{ 'update:page': [value: number]; 'update:pageSize': [value: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>
<template>
  <div v-if="total" class="pagination">
    <span class="muted"
      >{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} из
      {{ total }} записей</span
    >
    <label class="page-size"
      >На странице<select
        :value="pageSize"
        :disabled="loading"
        @change="$emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
      >
        <option
          v-for="size in [...new Set([pageSize, 12, 24, 48])].sort((a, b) => a - b)"
          :key="size"
          :value="size"
        >
          {{ size }}
        </option>
      </select></label
    >
    <nav :aria-label="label">
      <button
        class="icon-button"
        type="button"
        aria-label="Предыдущая страница"
        :disabled="loading || page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        <AppIcon name="left" />
      </button>
      <span role="status" aria-live="polite">{{ page }} / {{ pages }}</span>
      <button
        class="icon-button"
        type="button"
        aria-label="Следующая страница"
        :disabled="loading || page >= pages"
        @click="$emit('update:page', page + 1)"
      >
        <AppIcon name="right" />
      </button>
    </nav>
  </div>
</template>
<style scoped>
.pagination nav {
  flex-direction: row;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  margin: 0;
}
.page-size {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 0 0 0 auto;
  color: var(--muted);
  font-size: var(--text-secondary);
}
.page-size select {
  width: auto;
  min-width: 70px;
  min-height: 44px;
  margin: 0;
  padding: 8px 26px 8px 10px;
}
.icon-button {
  border: 1px solid var(--line);
  background: var(--surface);
  display: inline-flex;
}
.icon-button :deep(svg) {
  display: block;
  width: 20px;
  height: 20px;
}
@media (max-width: 720px) {
  .pagination {
    gap: 12px 18px;
  }
  .pagination > .muted {
    flex-basis: 100%;
  }
  .page-size {
    margin-left: 0;
  }
  .pagination nav {
    margin-left: auto;
  }
}
</style>
