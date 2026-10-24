import type { Currency } from '@/shared/lib'
export type PaymentType = 'recurring' | 'one_time'
export interface PublicInvoiceView {
  title: string
  description: string
  amount: string
  currency: Currency
  payment_type: PaymentType
  due_date: string
  paid: boolean
  cancelled: boolean
  paid_at: string | null
  overdue_days: number
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
}
export interface Occurrence {
  id: string
  recurring_id: string
  title: string
  description: string
  payment_type: PaymentType
  amount: string
  currency: Currency
  due_date: string
  paid: boolean
  paid_at: string | null
  paid_by: string | null
  cancelled: boolean
  revision: number
  overdue_days: number
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
}
export interface Recurring {
  id: string
  title: string
  description: string
  amount: string
  currency: Currency
  first_due_date: string
  frequency: string
  group_ids: string[]
  active: boolean
  stopped_at: string | null
}
export interface Receipt {
  id: string
  number: string
  paid_at: string
  payer: string
  voided: boolean
}
export interface Attachment {
  id: string
  name: string
  url: string | null
  created_at: string
}
export interface HistoryItem {
  id: string
  actor: string
  action: string
  created_at: string
  details: Record<string, unknown>
}
export interface OccurrenceDetail extends Occurrence {
  description: string
  frequency: string
  receipts: Receipt[]
  attachments: Attachment[]
  history: HistoryItem[]
}
export interface Totals {
  planned: string
  paid: string
  unpaid: string
  overdue: string
}
export interface Summary {
  date_from: string
  date_to: string
  currencies: Record<Currency, Totals>
}
