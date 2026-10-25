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
interface SessionSettings {
  today: string
  timezone: string
  telegram_configured: boolean
  smtp_configured: boolean
}
const unauthorized = (error: unknown) =>
  error instanceof ApiError && [401, 403].includes(error.status)

export const useSession = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)
  const settings = ref<SessionSettings | null>(null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  let generation = 0
  let identityRequest: { generation: number; promise: Promise<void> } | undefined

  function clear() {
    ++generation
    user.value = null
    settings.value = null
    ready.value = true
  }
  async function loadSettings(current: number) {
    try {
      const value = await api<SessionSettings>('/settings')
      if (current === generation) settings.value = value
    } catch (error) {
      // Optional configuration failure must not turn a successful login into
      // an authentication failure. Retry on the next identity refresh.
      if (current === generation) {
        if (unauthorized(error)) clear()
        else settings.value = null
      }
    }
  }
  function refreshIdentity(): Promise<void> {
    if (identityRequest?.generation === generation) return identityRequest.promise
    const current = generation
    const promise = (async () => {
      try {
        const value = await api<SessionUser>('/auth/me')
        if (current !== generation) return
        user.value = value
        if (!settings.value) await loadSettings(current)
      } catch (error) {
        if (current === generation && unauthorized(error)) clear()
      } finally {
        if (current === generation) ready.value = true
        if (identityRequest?.generation === current) identityRequest = undefined
      }
    })()
    identityRequest = { generation: current, promise }
    return promise
  }
  async function restore() {
    await refreshIdentity()
  }
  async function login(login: string, password: string) {
    const current = ++generation
    const value = await api<SessionUser>('/auth/login', {
      method: 'POST',
      body: jsonBody({ login, password }),
    })
    if (current !== generation) return
    user.value = value
    settings.value = null
    ready.value = true
    await loadSettings(current)
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (error) {
      if (!unauthorized(error)) throw error
    }
    clear()
  }
  async function updateProfile(name: string) {
    const current = ++generation
    try {
      const value = await api<SessionUser>('/auth/me', {
        method: 'PATCH',
        body: jsonBody({ name }),
      })
      if (current === generation) user.value = value
    } catch (error) {
      if (current === generation && unauthorized(error)) clear()
      throw error
    }
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    await api('/auth/password', {
      method: 'POST',
      body: jsonBody({ current_password: currentPassword, new_password: newPassword }),
    })
    clear()
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
    clear,
  }
})
