export type Environment = 'test' | 'live'
export interface IncomingInvoice {
  id: string
  partner_id: string
  buyer_id: string
  environment: Environment
  external_id: string
  number: string
  title: string
  description: string
  amount: string
  currency: string
  issued_at: string
  due_date: string
  review_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
  payment_status: 'unpaid' | 'paid'
  revision: number
  supplier_name: string
  buyer_name: string
  decision_reason: string | null
}
export interface InvoiceDocument {
  id: string
  original_name: string
  scan_status: 'pending' | 'clean' | 'rejected'
  size_bytes: number
}
export interface InvoiceDetail extends IncomingInvoice {
  supplier_snapshot: { name?: string; inn?: string; kpp?: string | null }
  buyer_snapshot: { name?: string; inn?: string; kpp?: string | null }
  bank_account_snapshot: {
    account_number?: string
    bank_name?: string
    bank_bic?: string
    correspondent_account?: string | null
  }
  documents: InvoiceDocument[]
  payments: {
    id: string
    amount: string
    paid_at: string
    reference: string
    reversed_at: string | null
    reversal_reason: string | null
  }[]
}
export interface InvoiceHistory {
  action: string
  actor_type: string
  reason: string | null
  created_at: string
}
export interface BusinessPartner {
  id: string
  name: string
  inn: string
  kpp: string | null
  status: 'active' | 'blocked'
  contact_email: string | null
  buyer_ids: string[]
  bank_accounts: {
    id: string
    account_number: string
    bank_name: string
    bank_bic: string
    verified: boolean
    active: boolean
  }[]
}
export interface Buyer {
  id: string
  name: string
  inn: string
  active: boolean
}
export interface PartnerKey {
  id: string
  prefix: string
  environment: Environment
  scopes: string[]
  revoked_at: string | null
  expires_at: string | null
}
export function canRecordPayment(
  invoice: Pick<IncomingInvoice, 'review_status' | 'payment_status'>,
) {
  return (
    ['submitted', 'approved'].includes(invoice.review_status) && invoice.payment_status === 'unpaid'
  )
}
export function invoiceStatus(invoice: Pick<IncomingInvoice, 'review_status' | 'payment_status'>) {
  if (invoice.review_status === 'cancelled') return 'Отозван поставщиком'
  if (invoice.review_status === 'rejected') return 'Отклонён ранее'
  if (invoice.review_status === 'draft') return 'Старый черновик'
  return invoice.payment_status === 'paid' ? 'Оплачен' : 'К оплате'
}
export function historyLabel(action: string) {
  const labels: Record<string, string> = {
    created: 'Счёт получен через API',
    submitted: 'Счёт отправлен поставщиком',
    payment_recorded: 'Оплата отмечена',
    payment_reversed: 'Отметка оплаты отменена',
    cancelled: 'Счёт отозван поставщиком',
    approved: 'Одобрен ранее',
    rejected: 'Отклонён ранее',
    rejectd: 'Отклонён ранее',
    document_uploaded: 'Добавлено вложение',
    updated: 'Счёт обновлён',
  }
  return labels[action] || action
}
