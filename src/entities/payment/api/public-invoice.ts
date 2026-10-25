import { api, jsonBody } from '@/shared/api'
import type { PublicInvoiceView, PublicPaymentInvoice } from '../model/types'

export const publicInvoiceApi = {
  get: (token: string, signal?: AbortSignal) =>
    api<PublicInvoiceView>(`/public/invoices/${encodeURIComponent(token)}`, {
      credentials: 'omit',
      signal,
    }),
}

export const publicPaymentApi = {
  path: (token: string) => `/public/payments/${encodeURIComponent(token)}`,
  get: (token: string, signal?: AbortSignal) =>
    api<PublicPaymentInvoice>(publicPaymentApi.path(token), { credentials: 'omit', signal }),
  confirm: (token: string, value: { paid_at: string; name: string; expected_revision: number }) =>
    api<PublicPaymentInvoice>(`${publicPaymentApi.path(token)}/confirm`, {
      method: 'POST',
      credentials: 'omit',
      body: jsonBody(value),
    }),
}
