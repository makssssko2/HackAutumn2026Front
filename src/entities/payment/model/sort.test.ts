import { describe, expect, it } from 'vitest'
import { sortPaymentsByDate } from './sort'

const invoices = [
  { id: 'unpaid', due_date: '2027-01-01', paid_at: null },
  { id: 'later', due_date: '2026-12-31', paid_at: '2027-01-02' },
  { id: 'earlier', due_date: '2026-02-01', paid_at: '2026-12-30' },
  { id: 'same-date', due_date: '2026-12-31', paid_at: null },
]

describe('invoice date sorting', () => {
  it('compares complete ISO dates across months and years', () => {
    expect(
      sortPaymentsByDate(invoices, { field: 'due_date', direction: 'asc' }).map((p) => p.id),
    ).toEqual(['earlier', 'later', 'same-date', 'unpaid'])
    expect(
      sortPaymentsByDate(invoices, { field: 'due_date', direction: 'desc' }).map((p) => p.id),
    ).toEqual(['unpaid', 'later', 'same-date', 'earlier'])
  })
  it('keeps unpaid invoices last for both actual-date directions', () => {
    expect(
      sortPaymentsByDate(invoices, { field: 'paid_at', direction: 'asc' }).map((p) => p.id),
    ).toEqual(['earlier', 'later', 'unpaid', 'same-date'])
    expect(
      sortPaymentsByDate(invoices, { field: 'paid_at', direction: 'desc' }).map((p) => p.id),
    ).toEqual(['later', 'earlier', 'unpaid', 'same-date'])
  })
  it('preserves equal-date order and does not mutate the source array', () => {
    const initial = invoices.map((p) => p.id)
    const sorted = sortPaymentsByDate(invoices, { field: 'due_date', direction: 'asc' })
    expect(sorted).not.toBe(invoices)
    expect(invoices.map((p) => p.id)).toEqual(initial)
    expect(sorted.filter((p) => p.due_date === '2026-12-31').map((p) => p.id)).toEqual([
      'later',
      'same-date',
    ])
  })
})
