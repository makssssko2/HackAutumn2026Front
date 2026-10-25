import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { publicPaymentApi, type PublicPaymentInvoice } from '@/entities/payment'
import { deferred, flushRequests } from '@/shared/testing'
import { usePublicPayment } from './usePublicPayment'

vi.mock('@/entities/payment', () => ({
  publicPaymentApi: {
    path: (token: string) => `/public/payments/${encodeURIComponent(token)}`,
    get: vi.fn(),
    confirm: vi.fn(),
  },
}))
const stops: (() => void)[] = []
beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
})
const invoice = (title: string): PublicPaymentInvoice => ({
  title,
  description: '',
  amount: '10',
  currency: 'RUB',
  due_date: '2026-10-25',
  paid: false,
  cancelled: false,
  paid_at: null,
  overdue_days: 0,
  revision: 1,
  today: '2026-10-25',
  has_receipt: false,
})
describe('public payment capability isolation', () => {
  it('does not show an old invoice when navigating between tokens', async () => {
    const first = deferred<PublicPaymentInvoice>(),
      second = deferred<PublicPaymentInvoice>()
    vi.mocked(publicPaymentApi.get)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const token = ref('first'),
      scope = effectScope()
    const model = scope.run(() => usePublicPayment(token))!
    stops.push(() => scope.stop())
    model.name.value = 'Old payer'
    token.value = 'second'
    expect(vi.mocked(publicPaymentApi.get).mock.calls[0][1]?.aborted).toBe(true)
    second.resolve(invoice('second'))
    await flushRequests()
    first.resolve(invoice('first'))
    await flushRequests()
    expect(model.invoice.value?.title).toBe('second')
    expect(model.name.value).toBe('')
  })
  it('does not apply an old payment confirmation to the next invoice', async () => {
    vi.mocked(publicPaymentApi.get)
      .mockResolvedValueOnce(invoice('first'))
      .mockResolvedValueOnce(invoice('second'))
    const confirmation = deferred<PublicPaymentInvoice>()
    vi.mocked(publicPaymentApi.confirm).mockReturnValueOnce(confirmation.promise)
    const token = ref('first'),
      scope = effectScope()
    const model = scope.run(() => usePublicPayment(token))!
    stops.push(() => scope.stop())
    await flushRequests()
    const submitting = model.confirm()
    token.value = 'second'
    await flushRequests()
    confirmation.resolve({ ...invoice('first'), paid: true })
    await submitting
    expect(model.invoice.value?.title).toBe('second')
    expect(model.invoice.value?.paid).toBe(false)
    expect(model.submitting.value).toBe(false)
  })
})
