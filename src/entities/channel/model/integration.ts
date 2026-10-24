import { ApiError } from '@/shared/api'

export type IntegrationKind = 'vk_teams' | 'mattermost'
export interface IntegrationProvider {
  provider: string
  label: string
  credentials: string[]
  capabilities: string[]
}
export interface IntegrationConnection {
  id: string
  provider: IntegrationKind
  name: string
  base_url: string
  active: boolean
  setup_status: string
  health_status: string
  has_credentials: boolean
  external_bot_id: string | null
  capabilities: Record<string, boolean | string>
  last_checked_at: string | null
  last_event_at: string | null
  last_error_code: string | null
  generation: number
}
export interface ConnectionValues {
  name: string
  base_url: string
  credential: string
}
export function isIntegration(kind: string): kind is IntegrationKind {
  return kind === 'vk_teams' || kind === 'mattermost'
}
export const integrationLabels: Record<IntegrationKind, string> = {
  vk_teams: 'VK Teams',
  mattermost: 'Mattermost',
}
export function connectionPayload(
  provider: IntegrationKind,
  values: ConnectionValues,
  existing?: IntegrationConnection,
) {
  const base_url = values.base_url.trim().replace(/\/+$/, '')
  const name = values.name.trim()
  const credential = values.credential.trim()
  if (!name) throw new Error('Укажите название подключения.')
  let url: URL
  try {
    url = new URL(base_url)
  } catch {
    throw new Error('Укажите полный HTTPS-адрес сервера.')
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Используйте HTTPS-адрес без пароля, параметров и фрагмента.')
  }
  if (!existing?.has_credentials && !credential) throw new Error('Введите токен бота.')
  const credentials = credential
    ? { [provider === 'vk_teams' ? 'token' : 'access_token']: credential }
    : undefined
  return {
    ...(!existing ? { provider } : {}),
    name,
    base_url,
    ...(credentials ? { credentials } : {}),
  }
}
export function connectionLabel(connection: IntegrationConnection) {
  if (!connection.active) return 'Подключение отключено'
  if (!connection.has_credentials) return 'Нужен токен'
  if (connection.health_status === 'error') return 'Ошибка подключения'
  if (connection.health_status === 'healthy') return 'API бота проверен'
  return 'Бот не проверен'
}
export function integrationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503)
      return 'На сервере не настроено защищённое хранение токенов. Обратитесь к администратору сервера.'
    const messages: Record<string, string> = {
      credentials_invalid: 'Проверьте токен бота и адрес сервера, затем повторите проверку.',
      provider_http_error:
        'Не удалось обратиться к API. Проверьте адрес, доступность сервера и права бота.',
      provider_invalid_response: 'Сервер вернул неожиданный ответ. Проверьте адрес API.',
      provider_rejected: 'Сервис отклонил запрос. Проверьте токен и разрешения бота.',
      unsupported_provider: 'Этот сервис пока не поддерживается сервером приложения.',
      connection_unavailable: 'Подключение недоступно. Включите и проверьте бота перед отправкой.',
    }
    if (error.code && messages[error.code]) return messages[error.code]!
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие. Попробуйте ещё раз.'
}
