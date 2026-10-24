import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from '@/entities/session'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved || { top: 0 },
  routes: [
    {
      path: '/pay/:token',
      component: () => import('@/pages/pay-invoice'),
      meta: { public: true, title: 'Оплата счета' },
    },
    { path: '/login', component: () => import('@/pages/login') },
    { path: '/', component: () => import('@/pages/overview'), meta: { title: 'Обзор' } },
    {
      path: '/profile',
      component: () => import('@/pages/profile'),
      meta: { title: 'Мой профиль' },
    },
    { path: '/payments', component: () => import('@/pages/payments'), meta: { title: 'Счета' } },
    {
      path: '/payments/new',
      component: () => import('@/pages/create-payment'),
      meta: { title: 'Выставить счет', admin: true },
    },
    {
      path: '/payments/:id',
      component: () => import('@/pages/payment-detail'),
      meta: { title: 'Карточка счета' },
    },
    {
      path: '/recurring',
      component: () => import('@/pages/recurring'),
      meta: { title: 'Регулярные платежи' },
    },
    {
      path: '/calendar',
      component: () => import('@/pages/calendar'),
      meta: { title: 'Календарь' },
    },
    { path: '/budget', component: () => import('@/pages/budget'), meta: { title: 'Бюджет' } },
    {
      path: '/notifications',
      component: () => import('@/pages/notifications'),
      meta: { title: 'Журнал рассылок', admin: true },
    },
    {
      path: '/users',
      component: () => import('@/pages/users'),
      meta: { title: 'Пользователи', admin: true },
    },
    {
      path: '/groups',
      component: () => import('@/pages/groups'),
      meta: { title: 'Группы рассылки', admin: true },
    },
    {
      path: '/settings',
      component: () => import('@/pages/settings'),
      meta: { title: 'Подключения', admin: true },
    },
    {
      path: '/audit',
      component: () => import('@/pages/audit'),
      meta: { title: 'Журнал действий', admin: true },
    },
    {
      path: '/forbidden',
      component: () => import('@/pages/forbidden'),
      meta: { title: 'Нет доступа' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/pages/not-found'),
      meta: { title: 'Страница не найдена' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) {
    document.title = 'Оплата счета · Invoice Keeper'
    return true
  }
  const session = useSession()
  if (!session.ready) await session.restore()
  else if (to.path !== '/login') await session.refreshIdentity()
  if (!session.user && to.path !== '/login') return '/login'
  if (session.user && to.path === '/login') return '/'
  if (to.meta.admin && !session.isAdmin) return '/forbidden'
  document.title = `${to.meta.title || 'Вход'} · Invoice Keeper`
})
