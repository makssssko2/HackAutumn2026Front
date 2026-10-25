import { afterEach, expect, it, vi } from 'vitest'
import { publicPaymentApi } from './public-invoice'

afterEach(() => vi.unstubAllGlobals())
it('isolates public payment reads and writes from account cookies', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ paid: false }))
  vi.stubGlobal('fetch', fetch)
  await publicPaymentApi.get('token/with?characters')
  await publicPaymentApi.confirm('token', {
    paid_at: '2026-10-25',
    name: 'Payer',
    expected_revision: 1,
  })
  expect(fetch.mock.calls[0][0]).toContain('token%2Fwith%3Fcharacters')
  expect(fetch.mock.calls.every(([, options]) => options?.credentials === 'omit')).toBe(true)
})
