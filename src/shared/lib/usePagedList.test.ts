import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { deferred, flushRequests, mountComposable } from '@/shared/testing'
import { usePagedList } from './usePagedList'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('paged resource lifecycle', () => {
  it('rejects old filter results during the debounce window', async () => {
    vi.useFakeTimers()
    const first = deferred<Response>(),
      second = deferred<Response>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    vi.stubGlobal('fetch', fetch)
    const query = ref('old')
    const mounted = mountComposable(() =>
      usePagedList<{ id: string }>('/rows', () => ({ q: query.value }), { debounce: 250 }),
    )
    cleanups.push(mounted.unmount)
    query.value = 'new'
    first.resolve(Response.json({ items: [{ id: 'old' }], total: 1, page: 1, page_size: 12 }))
    await flushRequests()
    expect(mounted.result.rows.value).toEqual([])
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(250)
    second.resolve(Response.json({ items: [{ id: 'new' }], total: 1, page: 1, page_size: 12 }))
    await flushRequests()
    expect(mounted.result.rows.value).toEqual([{ id: 'new' }])
  })
  it('recovers to the last page after records are removed', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ items: [{ id: 1 }], total: 25, page: 1, page_size: 12 }),
      )
      .mockResolvedValueOnce(Response.json({ items: [], total: 13, page: 3, page_size: 12 }))
      .mockResolvedValueOnce(
        Response.json({ items: [{ id: 13 }], total: 13, page: 2, page_size: 12 }),
      )
    vi.stubGlobal('fetch', fetch)
    const mounted = mountComposable(() => usePagedList<{ id: number }>('/rows'))
    cleanups.push(mounted.unmount)
    await flushRequests()
    mounted.result.page.value = 3
    await flushRequests()
    await flushRequests()
    expect(mounted.result.page.value).toBe(2)
    expect(mounted.result.rows.value).toEqual([{ id: 13 }])
    expect(mounted.result.loading.value).toBe(false)
  })
  it('resets pagination while preserving search debounce', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () =>
      Response.json({ items: [{ id: 1 }], total: 30, page: 1, page_size: 12 }),
    )
    vi.stubGlobal('fetch', fetch)
    const query = ref('old')
    const mounted = mountComposable(() =>
      usePagedList('/rows', () => ({ q: query.value }), { debounce: 250 }),
    )
    cleanups.push(mounted.unmount)
    await flushRequests()
    mounted.result.page.value = 2
    await flushRequests()
    expect(fetch).toHaveBeenCalledTimes(2)
    query.value = 'new'
    expect(mounted.result.page.value).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(250)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls).toHaveLength(3)
  })
})
