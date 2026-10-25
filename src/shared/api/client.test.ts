import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

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
  it('accepts all standard header formats and preserves explicit content types', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    expect(
      await api('/rows', { method: 'DELETE', headers: new Headers({ 'X-Trace': 'test' }) }),
    ).toBeUndefined()
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-Trace')).toBe('test')
    fetchMock.mockResolvedValue(Response.json({ ok: true }))
    await api('/rows', {
      method: 'POST',
      body: '{}',
      headers: [['Content-Type', 'application/problem+json']],
    })
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Content-Type')).toBe(
      'application/problem+json',
    )
  })
  it('does not expire the active session because of an obsolete aborted request', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(async () => {
      controller.abort()
      return Response.json({ detail: 'Old session' }, { status: 401 })
    })
    await expect(api('/rows', { signal: controller.signal })).rejects.toBeInstanceOf(ApiError)
    expect(dispatch).not.toHaveBeenCalled()
  })
  it('preserves structured integration failures for actionable feedback', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: { code: 'credentials_invalid', message: 'Проверьте токен' } }),
        { status: 422 },
      ),
    )
    const error = await api('/integrations/connections/id/validate', { method: 'POST' }).catch(
      (error) => error,
    )
    expect(error).toBeInstanceOf(ApiError)
    if (!(error instanceof ApiError)) throw error
    expect(error.code).toBe('credentials_invalid')
    expect(error.message).toBe('Проверьте токен')
    expect(dispatch).not.toHaveBeenCalled()
  })
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
