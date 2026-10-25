import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { b2bApi, type InvoiceDetail } from '@/entities/b2b'
import { deferred, flushRequests, mountComposable } from '@/shared/testing'
import { useB2BInvoice } from './useB2BInvoice'

vi.mock('@/entities/b2b', () => ({ b2bApi: { detail: vi.fn(), history: vi.fn() } }))
const stops: (() => void)[] = []
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(b2bApi.history).mockResolvedValue([])
})
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
})
const invoice = (id: string) => ({ id, revision: 1, amount: '10.00' }) as InvoiceDetail
describe('B2B invoice ownership', () => {
  it('discards an obsolete invoice response after route change', async () => {
    const first = deferred<InvoiceDetail>(),
      second = deferred<InvoiceDetail>()
    vi.mocked(b2bApi.detail).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const id = ref('first'),
      mounted = mountComposable(() => useB2BInvoice(() => id.value))
    stops.push(mounted.unmount)
    id.value = 'second'
    expect(vi.mocked(b2bApi.detail).mock.calls[0][1]?.aborted).toBe(true)
    second.resolve(invoice('second'))
    await flushRequests()
    first.resolve(invoice('first'))
    await flushRequests()
    expect(mounted.result.invoice.value?.id).toBe('second')
  })
  it('does not apply a late payment result to a different invoice', async () => {
    vi.mocked(b2bApi.detail)
      .mockResolvedValueOnce(invoice('first'))
      .mockResolvedValueOnce(invoice('second'))
    const id = ref('first'),
      mounted = mountComposable(() => useB2BInvoice(() => id.value))
    stops.push(mounted.unmount)
    await flushRequests()
    const payment = deferred<unknown>(),
      operation = vi.fn(() => payment.promise)
    const result = mounted.result.mutate(operation)
    await mounted.result.mutate(operation)
    expect(operation).toHaveBeenCalledTimes(1)
    id.value = 'second'
    await flushRequests()
    payment.resolve({})
    expect(await result).toBe(false)
    expect(mounted.result.invoice.value?.id).toBe('second')
    expect(mounted.result.message.value).toBe('')
    expect(vi.mocked(b2bApi.detail)).toHaveBeenCalledTimes(2)
  })
  it('does not refresh after disposal', async () => {
    vi.mocked(b2bApi.detail).mockResolvedValue(invoice('first'))
    const mounted = mountComposable(() => useB2BInvoice(() => 'first'))
    await flushRequests()
    const payment = deferred<unknown>(),
      result = mounted.result.mutate(() => payment.promise)
    mounted.unmount()
    payment.resolve({})
    expect(await result).toBe(false)
    expect(vi.mocked(b2bApi.detail)).toHaveBeenCalledTimes(1)
  })
})
