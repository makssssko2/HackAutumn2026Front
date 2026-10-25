import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api, ApiError } from '@/shared/api'
import { deferred } from '@/shared/testing'
import { useSession, type SessionUser } from './store'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: vi.fn(),
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
  it('keeps authentication when optional settings cannot be loaded', async () => {
    const session = useSession()
    vi.mocked(api)
      .mockResolvedValueOnce(original)
      .mockRejectedValueOnce(new ApiError(503, 'Unavailable'))
    await session.restore()
    expect(session.user?.id).toBe(original.id)
    expect(session.ready).toBe(true)
    expect(session.settings).toBeNull()
  })
  it('does not retain an identity if settings reveal an expired session', async () => {
    const session = useSession()
    vi.mocked(api)
      .mockResolvedValueOnce(original)
      .mockRejectedValueOnce(new ApiError(401, 'Expired'))
    await session.restore()
    expect(session.user).toBeNull()
    expect(session.settings).toBeNull()
  })
  it('coalesces identity refresh and prevents late responses from undoing logout', async () => {
    const session = useSession()
    session.user = original
    const pending = deferred<SessionUser>()
    vi.mocked(api).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ok: true })
    const first = session.refreshIdentity()
    const second = session.refreshIdentity()
    expect(vi.mocked(api)).toHaveBeenCalledTimes(1)
    await session.logout()
    pending.resolve(original)
    await Promise.all([first, second])
    expect(session.user).toBeNull()
    expect(session.settings).toBeNull()
    expect(vi.mocked(api)).toHaveBeenCalledTimes(2)
  })
  it('ignores an identity read started before a profile update', async () => {
    const session = useSession()
    session.user = original
    const pending = deferred<SessionUser>()
    vi.mocked(api)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ ...original, name: 'Новое имя' })
    const refresh = session.refreshIdentity()
    await session.updateProfile('Новое имя')
    pending.resolve(original)
    await refresh
    expect(session.user?.name).toBe('Новое имя')
  })
  it('does not let a concurrent profile write prevent logout', async () => {
    const session = useSession()
    session.user = original
    const profile = deferred<SessionUser>()
    const logout = deferred<unknown>()
    vi.mocked(api).mockReturnValueOnce(logout.promise).mockReturnValueOnce(profile.promise)
    const leaving = session.logout()
    const updating = session.updateProfile('New')
    logout.resolve({ ok: true })
    await leaving
    profile.resolve({ ...original, name: 'New' })
    await updating
    expect(session.user).toBeNull()
  })
  it('clears identity and settings on authorization rejection', async () => {
    const session = useSession()
    session.user = original
    vi.mocked(api).mockRejectedValueOnce(new ApiError(401, 'Expired'))
    await session.refreshIdentity()
    expect(session.user).toBeNull()
    expect(session.ready).toBe(true)
  })
  it('allows signing out locally when the server session has already expired', async () => {
    const session = useSession()
    session.user = original
    vi.mocked(api).mockRejectedValueOnce(new ApiError(401, 'Expired'))
    await session.logout()
    expect(session.user).toBeNull()
    expect(session.settings).toBeNull()
  })
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
