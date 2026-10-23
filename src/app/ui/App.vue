<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useSession } from '@/entities/session'
import { AppIcon } from '@/shared/ui'
import { dateLabel } from '@/shared/lib'
const session = useSession()
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const mobileQuery = window.matchMedia('(max-width: 1000px)')
const mobile = ref(mobileQuery.matches)
function updateMobile(event: MediaQueryListEvent) {
  mobile.value = event.matches
  if (!event.matches) menuOpen.value = false
}
const logoutError = ref('')
const primary = [
  ['/', 'overview', 'Обзор'],
  ['/payments', 'payments', 'Счета'],
  ['/recurring', 'recurring', 'Регулярные платежи'],
  ['/calendar', 'calendar', 'Календарь'],
  ['/budget', 'budget', 'Бюджет'],
  ['/notifications', 'notifications', 'Уведомления'],
]
const management = [
  ['/users', 'users', 'Пользователи'],
  ['/groups', 'groups', 'Группы рассылки'],
  ['/settings', 'settings', 'Подключения'],
  ['/audit', 'audit', 'Журнал действий'],
]
const initials = computed(() =>
  session.user?.name
    .split(' ')
    .slice(0, 2)
    .map((v) => v[0])
    .join(''),
)
async function logout() {
  try {
    await session.logout()
    router.push('/login')
  } catch (e) {
    logoutError.value = (e as Error).message
  }
}
function expired() {
  session.user = null
  router.push('/login')
}
onMounted(() => {
  window.addEventListener('session-expired', expired)
  mobileQuery.addEventListener('change', updateMobile)
})
onUnmounted(() => {
  window.removeEventListener('session-expired', expired)
  mobileQuery.removeEventListener('change', updateMobile)
})
</script>
<template>
  <RouterView v-if="route.path === '/login'" />
  <div v-else-if="session.user" class="workspace">
    <a class="skip-link" href="#main-content">К содержимому</a
    ><button
      v-if="menuOpen"
      class="nav-scrim"
      aria-label="Закрыть меню"
      @click="menuOpen = false"
    />
    <aside
      class="sidebar"
      :class="{ open: menuOpen }"
      :inert="mobile && !menuOpen"
      @keydown.esc="menuOpen = false"
    >
      <RouterLink to="/" class="brand" @click="menuOpen = false"
        ><span class="brand-mark"><AppIcon name="checks" :size="24" /></span
        ><span
          >invoice<span class="brand-light">keeper</span><small>Платежи вашей команды</small></span
        ></RouterLink
      >
      <div class="workspace-picker">
        <span class="workspace-avatar">IK</span>
        <div><strong>Рабочее пространство</strong><small>Общий учет расходов</small></div>
      </div>
      <nav aria-label="Основная навигация">
        <RouterLink
          v-for="[path, icon, label] in primary"
          :key="path"
          :to="path!"
          :class="{ active: path === '/' ? route.path === '/' : route.path.startsWith(path!) }"
          @click="menuOpen = false"
          ><AppIcon :name="icon!" :size="19" />{{ label }}</RouterLink
        ><template v-if="session.isAdmin"
          ><p class="nav-label">Управление</p>
          <RouterLink
            v-for="[path, icon, label] in management"
            :key="path"
            :to="path!"
            :class="{ active: route.path === path }"
            @click="menuOpen = false"
            ><AppIcon :name="icon!" :size="19" />{{ label }}</RouterLink
          ></template
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="demo-label">
          <AppIcon name="shield" :size="18" /><span
            >Демонстрационный режим<small>Без списания средств</small></span
          >
        </div>
        <a class="docs-link" href="/api/v1/docs" target="_blank" rel="noopener"
          ><AppIcon name="help" :size="18" />Документация API<AppIcon name="external" :size="14"
        /></a>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="topbar-location">
          <button
            class="icon-button mobile-menu"
            aria-label="Открыть меню"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <AppIcon name="menu" /></button
          ><span>Рабочее пространство</span><span class="breadcrumb-divider">/</span
          ><strong>{{ route.meta.title || 'Страница' }}</strong>
        </div>
        <div class="topbar-right">
          <span class="timezone">{{ session.settings?.timezone }}</span
          ><RouterLink to="/notifications" class="icon-button" aria-label="Уведомления"
            ><AppIcon name="notifications" /></RouterLink
          ><span class="topbar-separator" /><span class="user-avatar">{{ initials }}</span>
          <div class="user-info">
            <strong>{{ session.user.name }}</strong
            ><small>{{ session.isAdmin ? 'Администратор' : 'Пользователь' }}</small>
          </div>
          <button class="icon-button" aria-label="Выйти из системы" @click="logout">
            <AppIcon name="logout" :size="18" />
          </button>
        </div>
      </header>
      <div v-if="logoutError" class="error-box">{{ logoutError }}</div>
      <main id="main-content" class="main-content"><RouterView /></main>
      <footer class="workspace-footer">
        <span>Invoice Keeper · регулярные расходы без забытых платежей</span
        ><span v-if="session.settings">{{ dateLabel(session.settings.today) }}</span>
      </footer>
    </div>
  </div>
  <div v-else class="initial-loading" aria-busy="true">Загружаем рабочее пространство…</div>
</template>
