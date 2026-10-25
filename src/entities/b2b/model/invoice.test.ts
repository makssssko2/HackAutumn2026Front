import { describe, expect, it } from 'vitest'
import { canRecordPayment, invoiceStatus } from './invoice'

describe('JSON B2B invoices', () => {
  it('is payable as soon as received, without administrator approval', () => {
    expect(canRecordPayment({ review_status: 'submitted', payment_status: 'unpaid' })).toBe(true)
    expect(invoiceStatus({ review_status: 'submitted', payment_status: 'unpaid' })).toBe('К оплате')
  })
  it('preserves existing approved invoices', () => {
    expect(canRecordPayment({ review_status: 'approved', payment_status: 'unpaid' })).toBe(true)
  })
  it('does not offer payment for withdrawn, rejected, draft or already paid invoices', () => {
    for (const review_status of ['cancelled', 'rejected', 'draft'] as const)
      expect(canRecordPayment({ review_status, payment_status: 'unpaid' })).toBe(false)
    expect(canRecordPayment({ review_status: 'submitted', payment_status: 'paid' })).toBe(false)
  })
})
