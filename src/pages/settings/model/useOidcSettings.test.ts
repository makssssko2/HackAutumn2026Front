import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { oidcApi, type OidcProvider } from '@/entities/oidc'
import { ApiError } from '@/shared/api'
import { deferred, flushRequests, mountComposable } from '@/shared/testing'
import { useOidcSettings } from './useOidcSettings'

vi.mock('@/entities/oidc', () => ({ oidcApi: { provider: vi.fn(), save: vi.fn(), test: vi.fn() } }))
const provider: OidcProvider = {
  configured: true,
  name: 'Компания',
  discovery_url: 'https://sso.example.test/discovery',
  client_id: 'invoice',
  has_client_secret: true,
  enabled: false,
  auto_provision: false,
  session_minutes: 60,
  revision: 3,
  redirect_uri: 'https://invoice.example.test/api/v1/oidc/callback',
  encryption_ready: true,
  allowed_origins: ['https://sso.example.test'],
}
const stops: (() => void)[] = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(oidcApi.provider).mockResolvedValue({ ...provider })
})
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
})
async function mount() {
  const mounted = mountComposable(useOidcSettings)
  stops.push(mounted.unmount)
  await flushRequests()
  return mounted
}

describe('OIDC settings ownership', () => {
  it('preserves an existing secret and sends the saved revision exactly once', async () => {
    const { result } = await mount()
    const saved = deferred<OidcProvider>()
    vi.mocked(oidcApi.save).mockReturnValue(saved.promise)
    result.form.enabled = true
    const saving = result.save()
    await result.save()
    expect(oidcApi.save).toHaveBeenCalledTimes(1)
    expect(oidcApi.save).toHaveBeenCalledWith({
      name: provider.name,
      discovery_url: provider.discovery_url,
      client_id: provider.client_id,
      enabled: true,
      auto_provision: false,
      session_minutes: 60,
      expected_revision: 3,
    })
    saved.resolve({ ...provider, enabled: true, revision: 4 })
    await saving
    expect(result.data.value?.revision).toBe(4)
    expect(result.message.value).toContain('сохранены')
  })
  it('clears a newly entered secret after saving without reading it back', async () => {
    const { result } = await mount()
    result.form.client_secret = 'test-only-value'
    vi.mocked(oidcApi.save).mockResolvedValue({ ...provider, revision: 4 })
    await result.save()
    expect(vi.mocked(oidcApi.save).mock.calls[0][0].client_secret).toBe('test-only-value')
    expect(result.form.client_secret).toBe('')
  })
  it.each([409, 503])(
    'requires an explicit read after a %s save response; never retries the write',
    async (status) => {
      const { result } = await mount()
      vi.mocked(oidcApi.save).mockRejectedValue(new ApiError(status, 'Failed'))
      await result.save()
      await result.save()
      expect(oidcApi.save).toHaveBeenCalledTimes(1)
      expect(result.mustReload.value).toBe(true)
      expect(result.message.value).toBe('')
      vi.mocked(oidcApi.provider).mockResolvedValue({ ...provider, revision: 8 })
      await result.reload()
      await flushRequests()
      expect(result.data.value?.revision).toBe(8)
      expect(result.mustReload.value).toBe(false)
    },
  )
  it.each([403, 422])(
    'reports a denied/invalid %s save without success or retry',
    async (status) => {
      const { result } = await mount()
      vi.mocked(oidcApi.save).mockRejectedValue(new ApiError(status, 'Действие отклонено'))
      await result.save()
      expect(result.operationError.value).toBe('Действие отклонено')
      expect(result.message.value).toBe('')
      expect(result.data.value?.revision).toBe(3)
      expect(oidcApi.save).toHaveBeenCalledTimes(1)
    },
  )
  it('tests saved discovery without sending draft values and reports failures', async () => {
    const { result } = await mount()
    result.form.client_id = 'unsaved'
    vi.mocked(oidcApi.test).mockResolvedValue({
      ok: true,
      issuer: 'https://sso.example.test',
      message: 'ok',
    })
    await result.test()
    expect(oidcApi.test).toHaveBeenCalledWith()
    expect(oidcApi.save).not.toHaveBeenCalled()
    expect(result.message.value).toContain('не проверяются')
    vi.mocked(oidcApi.test).mockRejectedValue(new ApiError(502, 'Провайдер недоступен'))
    await result.test()
    expect(result.operationError.value).toBe('Провайдер недоступен')
    expect(result.message.value).toBe('')
  })
  it('cancels reads and ignores late saves when the page is left', async () => {
    const { result, unmount } = await mount()
    const saved = deferred<OidcProvider>()
    vi.mocked(oidcApi.save).mockReturnValue(saved.promise)
    result.form.client_secret = 'test-only-value'
    const saving = result.save()
    unmount()
    saved.resolve({ ...provider, revision: 4 })
    await saving
    expect(vi.mocked(oidcApi.provider).mock.calls[0][0].aborted).toBe(true)
    expect(result.form.client_secret).toBe('')
    expect(result.data.value?.revision).toBe(3)
    expect(result.message.value).toBe('')
  })
})
