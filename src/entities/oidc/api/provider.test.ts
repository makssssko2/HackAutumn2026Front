import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/shared/api'
import { oidcApi, oidcLoginUrl } from './provider'

vi.mock('@/shared/api', async (original) => ({
  ...(await original<typeof import('@/shared/api')>()),
  api: vi.fn(),
}))
beforeEach(() => vi.resetAllMocks())
describe('OIDC API boundary', () => {
  it('loads public provider without session cookies and supports cancellation', async () => {
    const controller = new AbortController()
    await oidcApi.publicProvider(controller.signal)
    expect(api).toHaveBeenCalledWith('/oidc/public', {
      signal: controller.signal,
      credentials: 'omit',
    })
    expect(oidcLoginUrl).toBe('/api/v1/oidc/login')
  })
  it('reads admin configuration with cancellation and tests only the saved provider', async () => {
    const controller = new AbortController()
    await oidcApi.provider(controller.signal)
    expect(api).toHaveBeenCalledWith('/oidc/provider', { signal: controller.signal })
    await oidcApi.test()
    expect(api).toHaveBeenLastCalledWith('/oidc/provider/test', { method: 'POST' })
  })
})
