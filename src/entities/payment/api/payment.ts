import { api, jsonBody, queryString, allPages } from '@/shared/api'
import type { Occurrence, OccurrenceDetail, Recurring, Summary } from '../model/types'
export const paymentApi = {
  list: (filters: Record<string, string | number | undefined> = {}) =>
    allPages<Occurrence>('/payment-occurrences', filters),
  detail: (id: string) => api<OccurrenceDetail>(`/payment-occurrences/${id}?include_related=false`),
  update: (
    id: string,
    value: { paid?: boolean; paid_at?: string; demo?: boolean; expected_revision: number },
  ) => api<Occurrence>(`/payment-occurrences/${id}`, { method: 'PATCH', body: jsonBody(value) }),
  recurring: () => allPages<Recurring>('/recurring-payments'),
  create: (value: unknown) =>
    api<Recurring>('/recurring-payments', { method: 'POST', body: jsonBody(value) }),
  stop: (id: string) => api(`/recurring-payments/${id}`, { method: 'DELETE' }),
  createOneTime: (value: unknown) =>
    api<{ id: string }>('/one-time-payments', { method: 'POST', body: jsonBody(value) }),
  cancelOneTime: (id: string) => api(`/one-time-payments/${id}`, { method: 'DELETE' }),
  remind: (id: string) => api(`/notifications/occurrences/${id}/remind`, { method: 'POST' }),
  summary: (filters: Record<string, string | number | undefined> = {}) =>
    api<Summary>(`/payments/summary${queryString(filters)}`),
}
