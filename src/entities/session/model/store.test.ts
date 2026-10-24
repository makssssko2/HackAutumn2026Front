import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '@/shared/api'
import { useSession, type SessionUser } from './store'

vi.mock('@/shared/api', () => ({
  api: vi.fn(),
  jsonBody: JSON.stringify,
  ApiError: class extends Error {},
}))

const original: SessionUser = {
  id: 'user-1',
  login: 'user',
  name: 'Прежнее имя',
  role: 'user',
  active: true,
  telegram_id: null,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(api).mockReset()
})

describe('self-service profile', () => {
  it('updates the shared identity after saving the name', async () => {
    const session = useSession()
    session.user = { ...original }
    vi.mocked(api).mockResolvedValue({ ...original, name: 'Новое имя' })
    await session.updateProfile('Новое имя')
    expect(session.user?.name).toBe('Новое имя')
    expect(session.user?.role).toBe('user')
  })

  it('retains the current identity when saving fails', async () => {
    const session = useSession()
    session.user = { ...original }
    vi.mocked(api).mockRejectedValue(new Error('Ошибка сети'))
    await expect(session.updateProfile('Новое имя')).rejects.toThrow('Ошибка сети')
    expect(session.user?.name).toBe('Прежнее имя')
  })

  it('clears identity and account settings only after a successful password change', async () => {
    const session = useSession()
    session.user = { ...original }
    session.settings = {
      today: '2026-10-24',
      timezone: 'Europe/Moscow',
      telegram_configured: true,
      smtp_configured: false,
    }
    vi.mocked(api).mockRejectedValueOnce(new Error('Текущий пароль указан неверно'))
    await expect(session.changePassword('wrong', 'new-password')).rejects.toThrow()
    expect(session.user?.id).toBe(original.id)
    expect(session.settings).not.toBeNull()
    vi.mocked(api).mockResolvedValueOnce({ ok: true })
    await session.changePassword('current-password', 'new-password')
    expect(session.user).toBeNull()
    expect(session.settings).toBeNull()
  })
})
