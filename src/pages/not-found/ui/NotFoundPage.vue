<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { EmptyState } from '@/shared/ui'
</script>
<template>
  <div class="page-heading"><h1>Страница не найдена</h1></div>
  <EmptyState
    title="Проверьте адрес страницы"
    description="Возможно, адрес изменился. Вернитесь к счетам команды."
    ><RouterLink to="/" class="button">На обзор</RouterLink></EmptyState
  >
</template>
