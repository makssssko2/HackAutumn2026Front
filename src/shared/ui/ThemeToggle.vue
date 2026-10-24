<script setup lang="ts">
import { useTheme } from '@/shared/lib'
import AppIcon from './AppIcon.vue'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="icon-button theme-toggle"
    aria-label="Тёмная тема"
    :aria-pressed="isDark"
    :title="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
    @click="toggleTheme"
  >
    <AppIcon :name="isDark ? 'sun' : 'moon'" />
  </button>
</template>
