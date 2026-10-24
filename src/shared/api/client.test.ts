import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

const fetchMock = vi.fn()
const dispatch = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  dispatch.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { dispatchEvent: dispatch })
})
afterEach(() => vi.unstubAllGlobals())

describe('public request session isolation', () => {
  it('keeps authenticated requests using the current session', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'current' }), { status: 200 }))
    expect(await api('/auth/me')).toEqual({ id: 'current' })
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include')
  })

  it('omits session cookies for public invoice reads and leaves session state intact on rejection', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Unavailable' }), { status: 401 }),
    )
    await expect(api('/public/invoices/token', { credentials: 'omit' })).rejects.toThrow(
      'Unavailable',
    )
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('omit')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('still reports an expired session for protected requests', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Sign in' }), { status: 401 }),
    )
    await expect(api('/payment-occurrences')).rejects.toThrow('Sign in')
    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch.mock.calls[0]![0].type).toBe('session-expired')
  })
})
