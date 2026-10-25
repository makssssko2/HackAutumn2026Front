import { api, jsonBody } from '@/shared/api'
import type {
  BusinessPartner,
  Buyer,
  Environment,
  InvoiceDetail,
  InvoiceHistory,
  PartnerKey,
} from '../model/invoice'

const invoicePath = (id: string) => `/incoming-invoices/${encodeURIComponent(id)}`
const partnerPath = (id: string) => `/business-partners/${encodeURIComponent(id)}`
export const b2bApi = {
  detail: (id: string, signal?: AbortSignal) => api<InvoiceDetail>(invoicePath(id), { signal }),
  history: (id: string, signal?: AbortSignal) =>
    api<InvoiceHistory[]>(`${invoicePath(id)}/history`, { signal }),
  recordPayment: (
    id: string,
    data: { expected_revision: number; amount: string; paid_at: string; reference: string },
  ) => api(`${invoicePath(id)}/record-payment`, { method: 'POST', body: jsonBody(data) }),
  reversePayment: (id: string, expected_revision: number, reason: string) =>
    api(`${invoicePath(id)}/reverse-payment`, {
      method: 'POST',
      body: jsonBody({ expected_revision, reason }),
    }),
  documentUrl: (id: string, documentId: string) =>
    `/api/v1${invoicePath(id)}/documents/${encodeURIComponent(documentId)}/download`,
  partners: (signal?: AbortSignal) =>
    api<{ items: BusinessPartner[] }>('/business-partners', { signal }),
  buyers: (signal?: AbortSignal) =>
    api<{ items: Buyer[] }>('/business-partners/buyers', { signal }),
  createPartner: (data: { name: string; inn: string; kpp?: string }) =>
    api('/business-partners', { method: 'POST', body: jsonBody(data) }),
  createBuyer: (data: { name: string; inn: string; kpp?: string }) =>
    api('/business-partners/buyers', { method: 'POST', body: jsonBody(data) }),
  grantAccess: (id: string, buyer_id: string) =>
    api(`${partnerPath(id)}/buyer-access`, { method: 'POST', body: jsonBody({ buyer_id }) }),
  addAccount: (
    id: string,
    data: { account_number: string; bank_name: string; bank_bic: string; verified: boolean },
  ) => api(`${partnerPath(id)}/bank-accounts`, { method: 'POST', body: jsonBody(data) }),
  keys: (id: string, signal?: AbortSignal) =>
    api<PartnerKey[]>(`${partnerPath(id)}/api-keys`, { signal }),
  issueKey: (id: string, environment: Environment) =>
    api<PartnerKey & { api_key: string }>(`${partnerPath(id)}/api-keys`, {
      method: 'POST',
      body: jsonBody({ environment, scopes: ['invoices:read', 'invoices:write'] }),
    }),
  revokeKey: (id: string, keyId: string) =>
    api(`${partnerPath(id)}/api-keys/${encodeURIComponent(keyId)}/revoke`, { method: 'POST' }),
}
