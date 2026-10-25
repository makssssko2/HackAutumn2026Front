<script setup lang="ts">
import { RouterView } from 'vue-router'
import { AnimatedRegion } from '@/shared/ui'
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" appear>
      <!-- A real element also supports pages with multiple template roots.
           Query-only updates preserve the current form and page state. -->
      <AnimatedRegion :key="route.path" class="page-view">
        <component :is="Component" />
      </AnimatedRegion>
    </Transition>
  </RouterView>
</template>

<style scoped>
.page-enter-active {
  transition: opacity var(--transition-duration-fast);
}
.page-enter-from {
  opacity: 0;
}
</style>
