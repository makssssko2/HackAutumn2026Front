import { afterEach, describe, expect, it, vi } from 'vitest'
import { allPages, readPage } from './pagination'

afterEach(() => vi.unstubAllGlobals())
describe('server pagination and complete lookups', () => {
  it('stops collecting pages when its owner cancels the request', async () => {
    const controller = new AbortController()
    const fetch = vi.fn(async () => {
      controller.abort()
      return Response.json({ items: [{ id: 1 }], total: 2, page: 1, page_size: 100 })
    })
    vi.stubGlobal('fetch', fetch)
    await expect(allPages('/channels', {}, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('fetches all recipient options through bounded pages', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        const query = new URL(url, 'https://app.example').searchParams
        const page = Number(query.get('page'))
        const rows = Array.from({ length: 205 }, (_, id) => ({ id }))
        return Response.json({
          items: rows.slice((page - 1) * 100, page * 100),
          page,
          page_size: 100,
          total: rows.length,
        })
      }),
    )
    const rows = await allPages<{ id: number }>('/channels')
    expect(rows).toHaveLength(205)
    expect(rows.at(-1)?.id).toBe(204)
    expect(urls).toEqual([1, 2, 3].map((page) => `/api/v1/channels?page=${page}&page_size=100`))
  })
  it('never silently accepts a truncated recipient lookup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ items: [], total: 20, page: 1, page_size: 100 })),
    )
    await expect(allPages('/channels')).rejects.toThrow('не полностью')
  })
  it('passes filters, server sort and cancellation with the page request', async () => {
    const fetch = vi.fn(async (_url: string, _options: RequestInit) =>
      Response.json({ items: [], total: 0, page: 3, page_size: 24 }),
    )
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    await readPage(
      '/payment-occurrences',
      { page: 3, page_size: 24, q: 'счет & аренда', sort: 'paid_at', direction: 'desc' },
      controller.signal,
    )
    const query = new URL(fetch.mock.calls[0]![0] as unknown as string, 'https://app.example')
      .searchParams
    expect(query.get('q')).toBe('счет & аренда')
    expect(query.get('page')).toBe('3')
    expect(query.get('sort')).toBe('paid_at')
    expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBe(
      controller.signal,
    )
  })
  it('rejects a legacy array rather than misreporting its total', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([])),
    )
    await expect(readPage('/audit')).rejects.toThrow('страницу списка')
  })
})
