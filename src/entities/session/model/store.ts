import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, ApiError, jsonBody } from '@/shared/api'

export interface SessionUser {
  id: string
  login: string
  name: string
  role: 'admin' | 'user'
  active: boolean
  telegram_id: string | null
}
export const useSession = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)
  const settings = ref<{
    today: string
    timezone: string
    telegram_configured: boolean
    smtp_configured: boolean
  } | null>(null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  async function restore() {
    try {
      user.value = await api<SessionUser>('/auth/me')
      settings.value = await api('/settings')
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }
  async function refreshIdentity() {
    try {
      user.value = await api<SessionUser>('/auth/me')
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) user.value = null
    }
  }
  async function login(login: string, password: string) {
    user.value = await api<SessionUser>('/auth/login', {
      method: 'POST',
      body: jsonBody({ login, password }),
    })
    settings.value = await api('/settings')
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    user.value = null
  }
  async function updateProfile(name: string) {
    user.value = await api<SessionUser>('/auth/me', {
      method: 'PATCH',
      body: jsonBody({ name }),
    })
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    await api('/auth/password', {
      method: 'POST',
      body: jsonBody({ current_password: currentPassword, new_password: newPassword }),
    })
    user.value = null
    settings.value = null
  }
  return {
    user,
    ready,
    isAdmin,
    settings,
    restore,
    refreshIdentity,
    login,
    logout,
    updateProfile,
    changePassword,
  }
})
