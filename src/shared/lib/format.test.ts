import { describe, expect, it } from 'vitest'
import { dateISO, dateLabel, money, monthRange, plural } from './format'
describe('currency and calendar display', () => {
  it('uses correct Russian count forms', () => {
    expect(
      [1, 2, 5, 11, 21, 24].map((count) => plural(count, ['счет', 'счета', 'счетов'])),
    ).toEqual(['счет', 'счета', 'счетов', 'счетов', 'счет', 'счета'])
  })
  it('keeps currency identity and decimal precision', () => {
    expect(money('100.25', 'RUB')).toContain('100,25')
    expect(money('20', 'USD')).toContain('$')
    expect(money('30', 'EUR')).toContain('€')
  })
  it('uses leap-year and short-month boundaries', () => {
    expect(monthRange('2024-02')).toEqual({ date_from: '2024-02-01', date_to: '2024-02-29' })
    expect(monthRange('2026-02').date_to).toBe('2026-02-28')
  })
  it('preserves date-only values without UTC conversion', () => {
    expect(dateISO(new Date(2026, 0, 31))).toBe('2026-01-31')
    expect(dateLabel('2026-01-31')).toContain('31')
    expect(dateLabel(null)).toBe('—')
    expect(dateLabel('invalid-date')).toBe('—')
  })
})
