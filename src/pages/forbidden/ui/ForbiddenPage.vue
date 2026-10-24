<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { EmptyState } from '@/shared/ui'
</script>
<template>
  <h1>Нет доступа</h1>
  <EmptyState
    title="Этот раздел доступен администратору"
    description="Вы можете просматривать счета, подтверждать оплату и работать с документами."
  >
    <RouterLink to="/payments" class="button">Перейти к счетам</RouterLink>
  </EmptyState>
</template>
