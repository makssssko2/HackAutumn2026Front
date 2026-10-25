import { api, jsonBody } from '@/shared/api'
import type { OidcProvider, OidcProviderInput, PublicOidcProvider } from '../model/types'

export const oidcLoginUrl = '/api/v1/oidc/login'
export const oidcApi = {
  provider: (signal: AbortSignal) => api<OidcProvider>('/oidc/provider', { signal }),
  save: (input: OidcProviderInput) =>
    api<OidcProvider>('/oidc/provider', { method: 'PUT', body: jsonBody(input) }),
  test: () =>
    api<{ ok: true; issuer: string; message: string }>('/oidc/provider/test', { method: 'POST' }),
  publicProvider: (signal: AbortSignal) =>
    api<PublicOidcProvider>('/oidc/public', { signal, credentials: 'omit' }),
}
