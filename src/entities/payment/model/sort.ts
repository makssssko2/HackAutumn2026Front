import type { Occurrence } from './types'

export interface PaymentDateSort {
  field: 'due_date' | 'paid_at'
  direction: 'asc' | 'desc'
}

export function sortPaymentsByDate<T extends Pick<Occurrence, 'due_date' | 'paid_at'>>(
  payments: readonly T[],
  sort: PaymentDateSort,
): T[] {
  return [...payments].sort((left, right) => {
    const a = left[sort.field]
    const b = right[sort.field]
    // Missing actual payment dates remain last in either direction.
    if (!a || !b) return a ? -1 : b ? 1 : 0
    const comparison = a < b ? -1 : a > b ? 1 : 0
    return sort.direction === 'asc' ? comparison : -comparison
  })
}
