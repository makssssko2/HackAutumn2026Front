<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { EmptyState } from '@/shared/ui'
</script>
<template>
  <EmptyState
    title="Страница не найдена"
    description="Возможно, адрес изменился. Вернитесь к счетам команды."
    ><RouterLink to="/" class="button">На обзор</RouterLink></EmptyState
  >
</template>
