import { ApiError } from '@/shared/api'

export type IntegrationKind = 'vk_teams' | 'mattermost' | 'bitrix24'
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
  return kind === 'vk_teams' || kind === 'mattermost' || kind === 'bitrix24'
}
export const integrationLabels: Record<IntegrationKind, string> = {
  vk_teams: 'VK Teams',
  mattermost: 'Mattermost',
  bitrix24: 'Битрикс24',
}
export function connectionReady(connection: IntegrationConnection) {
  return (
    connection.active &&
    connection.has_credentials &&
    connection.health_status === 'healthy' &&
    (connection.provider !== 'bitrix24' ||
      (connection.setup_status === 'ready' && !!connection.external_bot_id))
  )
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
  if (provider === 'bitrix24') {
    if (url.pathname !== '/')
      throw new Error('Укажите адрес портала без /rest/ и секретной части webhook.')
    if (existing?.external_bot_id && new URL(existing.base_url).origin !== url.origin)
      throw new Error(
        'Для другого портала создайте новое подключение, чтобы сохранить текущего бота.',
      )
    if (credential) {
      let webhook: URL
      try {
        webhook = new URL(credential)
      } catch {
        throw new Error('Укажите полный HTTPS-адрес входящего webhook.')
      }
      if (
        webhook.origin !== url.origin ||
        webhook.username ||
        webhook.password ||
        webhook.search ||
        webhook.hash ||
        !/^\/rest\/[^/]+\/[^/]+\/?$/.test(webhook.pathname)
      )
        throw new Error(
          'Webhook должен принадлежать этому порталу и иметь вид https://портал/rest/пользователь/секрет/.',
        )
    }
  }
  if (!existing?.has_credentials && !credential)
    throw new Error(provider === 'bitrix24' ? 'Введите входящий webhook.' : 'Введите токен бота.')
  const credentials = credential
    ? {
        [provider === 'vk_teams'
          ? 'token'
          : provider === 'bitrix24'
            ? 'webhook_url'
            : 'access_token']: credential,
      }
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
  if (connection.provider === 'bitrix24' && !connectionReady(connection))
    return connection.health_status === 'healthy'
      ? 'Требуется регистрация бота'
      : 'Доступ не проверен'
  if (connection.provider === 'bitrix24') return 'Бот зарегистрирован'
  if (connection.health_status === 'healthy') return 'API бота проверен'
  return 'Бот не проверен'
}
export function integrationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503)
      return 'На сервере не настроено защищённое хранение токенов. Обратитесь к администратору сервера.'
    const messages: Record<string, string> = {
      credentials_invalid: 'Проверьте токен или webhook и адрес сервера, затем повторите проверку.',
      provider_http_error:
        'Не удалось обратиться к API. Проверьте адрес, доступность сервера и права бота.',
      provider_invalid_response: 'Сервер вернул неожиданный ответ. Проверьте адрес API.',
      provider_rejected: 'Сервис отклонил запрос. Проверьте токен и разрешения бота.',
      unsupported_provider: 'Этот сервис пока не поддерживается сервером приложения.',
      connection_unavailable: 'Подключение недоступно. Включите и проверьте бота перед отправкой.',
      file_too_large:
        'Файл превышает допустимый размер. Проверьте вложение перед повторной отправкой.',
      invalid_callback: 'Не удалось обработать кнопку. Проверьте сообщение и настройки бота.',
    }
    if (error.code && messages[error.code]) return messages[error.code]!
    if (error.code)
      return 'Сервис отклонил запрос. Проверьте настройки подключения и повторите действие.'
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие. Попробуйте ещё раз.'
}
