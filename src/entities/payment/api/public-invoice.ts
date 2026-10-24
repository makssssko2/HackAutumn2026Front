import { api } from '@/shared/api'
import type { PublicInvoiceView } from '../model/types'

export const publicInvoiceApi = {
  get: (token: string, signal?: AbortSignal) =>
    api<PublicInvoiceView>(`/public/invoices/${encodeURIComponent(token)}`, {
      credentials: 'omit',
      signal,
    }),
}
