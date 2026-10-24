import { describe, expect, it } from 'vitest'
import { reminderWindow } from './payment'

describe('manual reminder eligibility', () => {
  const invoice = { paid: false, cancelled: false, due_date: '2026-11-02' }
  it('includes the three-day boundary across a month and overdue invoices', () => {
    expect(reminderWindow(invoice, '2026-10-30')).toBe(true)
    expect(reminderWindow(invoice, '2026-11-10')).toBe(true)
    expect(reminderWindow(invoice, '2026-11-02')).toBe(true)
  })
  it('does not offer a reminder too early, for paid or cancelled invoices', () => {
    expect(reminderWindow(invoice, '2026-10-29')).toBe(false)
    expect(reminderWindow({ ...invoice, paid: true }, '2026-11-02')).toBe(false)
    expect(reminderWindow({ ...invoice, cancelled: true }, '2026-11-02')).toBe(false)
  })
  it('handles leap days and rejects missing dates', () => {
    expect(reminderWindow({ ...invoice, due_date: '2028-03-01' }, '2028-02-27')).toBe(true)
    expect(reminderWindow({ ...invoice, due_date: '' }, '2026-11-02')).toBe(false)
  })
})
