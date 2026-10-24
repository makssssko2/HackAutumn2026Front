import { api, jsonBody, allPages } from '@/shared/api'
import type { IntegrationConnection, IntegrationProvider } from '../model/integration'

export const integrationApi = {
  providers: () => api<IntegrationProvider[]>('/integrations/providers'),
  connections: () => allPages<IntegrationConnection>('/integrations/connections'),
  create: (body: unknown) =>
    api<IntegrationConnection>('/integrations/connections', {
      method: 'POST',
      body: jsonBody(body),
    }),
  update: (id: string, body: unknown) =>
    api<IntegrationConnection>(`/integrations/connections/${id}`, {
      method: 'PATCH',
      body: jsonBody(body),
    }),
  validate: (id: string) =>
    api<IntegrationConnection>(`/integrations/connections/${id}/validate`, { method: 'POST' }),
  setup: (id: string) =>
    api<IntegrationConnection>(`/integrations/connections/${id}/setup`, { method: 'POST' }),
  status: (id: string) => api<IntegrationConnection>(`/integrations/connections/${id}/status`),
}
