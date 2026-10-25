export interface OidcProvider {
  configured: boolean
  name: string
  discovery_url: string
  client_id: string
  has_client_secret: boolean
  enabled: boolean
  auto_provision: boolean
  session_minutes: number
  revision: number
  redirect_uri: string
  encryption_ready: boolean
  allowed_origins: string[]
}

export interface OidcProviderInput {
  name: string
  discovery_url: string
  client_id: string
  client_secret?: string
  enabled: boolean
  auto_provision: boolean
  session_minutes: number
  expected_revision: number
}

export interface PublicOidcProvider {
  enabled: boolean
  name: string
}
