<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useSession } from '@/entities/session'
import { AppIcon, ThemeToggle } from '@/shared/ui'
import { dateLabel } from '@/shared/lib'
const session = useSession()
const route = useRoute()
const router = useRouter()
watch(
  () => session.user,
  (user, previous) => {
    if (previous && !user && !route.meta.public && route.path !== '/login')
      void router.replace('/login')
  },
)
const menuOpen = ref(false)
const mobileQuery = window.matchMedia('(max-width: 1000px)')
const mobile = ref(mobileQuery.matches)
const sidebar = ref<HTMLElement | null>(null)
const menuToggle = ref<HTMLButtonElement | null>(null)
let previousOverflow = ''
watch(menuOpen, async (open) => {
  if (open && mobile.value) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    sidebar.value?.querySelector<HTMLButtonElement>('button')?.focus()
  } else {
    document.body.style.overflow = previousOverflow
    if (mobile.value) {
      await nextTick()
      menuToggle.value?.focus()
    }
  }
})
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
function menuKeyboard(event: KeyboardEvent) {
  if (!menuOpen.value || !mobile.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    menuOpen.value = false
    return
  }
  if (event.key !== 'Tab') return
  const items = [
    ...(sidebar.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || []),
  ]
  const first = items[0],
    last = items.at(-1)
  if (!first || !last) return
  if (
    !sidebar.value?.contains(document.activeElement) ||
    (!event.shiftKey && document.activeElement === last)
  ) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
}
function updateMobile(event: MediaQueryListEvent) {
  mobile.value = event.matches
  if (!event.matches) menuOpen.value = false
}
const logoutError = ref('')
const primary = computed(() => [
  ['/', 'overview', 'Обзор'],
  ['/payments', 'payments', session.isAdmin ? 'Выставленные счета' : 'Счета'],
  ...(session.isAdmin ? [['/b2b', 'receipt', 'B2B · Входящие счета']] : []),
  ['/recurring', 'recurring', 'Регулярные платежи'],
  ['/calendar', 'calendar', 'Календарь'],
  ['/budget', 'budget', 'Бюджет'],
  ...(session.isAdmin ? [['/notifications', 'notifications', 'Журнал рассылок']] : []),
  ['/profile', 'profile', 'Мой профиль'],
])
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
  if (route.meta.public) return
  session.clear()
  router.push('/login')
}
async function syncSession() {
  if (route.meta.public) return
  await session.refreshIdentity()
  if (!session.user && route.path !== '/login') router.push('/login')
  else if (route.meta.admin && !session.isAdmin) router.push('/forbidden')
}
onMounted(() => {
  window.addEventListener('session-expired', expired)
  window.addEventListener('focus', syncSession)
  mobileQuery.addEventListener('change', updateMobile)
  window.addEventListener('keydown', menuKeyboard)
})
onUnmounted(() => {
  window.removeEventListener('session-expired', expired)
  window.removeEventListener('focus', syncSession)
  mobileQuery.removeEventListener('change', updateMobile)
  window.removeEventListener('keydown', menuKeyboard)
  if (menuOpen.value) document.body.style.overflow = previousOverflow
})
</script>
<template>
  <div v-if="route.path === '/login' || route.meta.public" class="public-shell">
    <div class="public-theme-toolbar"><ThemeToggle /></div>
    <RouterView />
  </div>
  <div v-else-if="session.user" class="workspace">
    <a class="skip-link" href="#main-content">К содержимому</a
    ><button
      v-if="menuOpen"
      class="nav-scrim"
      tabindex="-1"
      aria-hidden="true"
      @click="menuOpen = false"
    />
    <aside
      id="workspace-navigation"
      ref="sidebar"
      class="sidebar"
      :role="mobile ? 'dialog' : undefined"
      :aria-modal="mobile && menuOpen ? true : undefined"
      aria-label="Навигация по приложению"
      :class="{ open: menuOpen }"
      :inert="mobile && !menuOpen"
      @keydown.esc="menuOpen = false"
    >
      <div v-if="mobile" class="mobile-nav-heading">
        <strong>Навигация</strong
        ><button class="icon-button" aria-label="Закрыть меню" @click="menuOpen = false">
          <AppIcon name="close" />
        </button>
      </div>
      <RouterLink to="/" class="brand" @click="menuOpen = false"
        ><span class="brand-mark"><AppIcon name="checks" :size="24" /></span
        ><span
          >invoice<span class="brand-light">keeper</span><small>Платежи вашей команды</small></span
        ></RouterLink
      >
      <div class="workspace-picker">
        <span class="workspace-avatar">IK</span>
        <div>
          <strong>{{ session.isAdmin ? 'Панель администратора' : 'Кабинет пользователя' }}</strong
          ><small>{{
            session.isAdmin ? 'Выставление счетов и рассылки' : 'Счета, оплата и документы'
          }}</small>
        </div>
      </div>
      <RouterLink
        v-if="session.isAdmin"
        to="/payments/new"
        class="button sidebar-issue"
        @click="menuOpen = false"
      >
        <AppIcon name="plus" :size="18" />Выставить счет
      </RouterLink>
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
    <div class="main-shell" :inert="mobile && menuOpen">
      <header class="topbar">
        <div class="topbar-location">
          <button
            ref="menuToggle"
            class="icon-button mobile-menu"
            aria-label="Открыть меню"
            aria-controls="workspace-navigation"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <AppIcon name="menu" /></button
          ><span>Рабочее пространство</span><span class="breadcrumb-divider">/</span
          ><strong>{{ route.meta.title || 'Страница' }}</strong>
        </div>
        <div class="topbar-right">
          <span class="timezone">{{ session.settings?.timezone }}</span>
          <ThemeToggle />
          <RouterLink
            v-if="session.isAdmin"
            to="/notifications"
            class="icon-button"
            aria-label="Журнал рассылок"
            ><AppIcon name="notifications" /></RouterLink
          ><span class="topbar-separator" />
          <RouterLink to="/profile" class="profile-entry" aria-label="Открыть мой профиль">
            <span class="user-avatar">{{ initials }}</span>
            <div class="user-info">
              <strong :title="session.user.name">{{ session.user.name }}</strong
              ><small>{{ session.isAdmin ? 'Администратор' : 'Пользователь' }}</small>
            </div>
          </RouterLink>
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
