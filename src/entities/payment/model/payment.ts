import type { Occurrence, PaymentType } from './types'

export const paymentTypeLabel: Record<PaymentType, string> = {
  recurring: 'Регулярный',
  one_time: 'Разовый',
}

/** The API makes the final decision, including parent activity and delivery state. */
export function reminderWindow(
  payment: Pick<Occurrence, 'paid' | 'cancelled' | 'due_date'>,
  today: string,
) {
  if (payment.paid || payment.cancelled) return false
  const due = Date.parse(`${payment.due_date}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  return Number.isFinite(due) && Number.isFinite(now) && due <= now + 3 * 86400000
}
