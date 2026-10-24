import { isIntegration, type IntegrationConnection } from './integration'

export interface Channel {
  id: string
  name: string
  kind: string
  config: Record<string, string>
  active: boolean
  connection_id?: string | null
  remote_chat_id?: string | null
}
export interface AudienceGroup {
  id: string
  name: string
  channel_ids: string[]
}
export const channelLabels: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  webhook: 'Webhook',
  inapp: 'Журнал администратора',
  vk_teams: 'VK Teams',
  mattermost: 'Mattermost',
  bitrix24: 'Битрикс24',
}
export function needsChat(channel: Channel) {
  return channel.kind === 'telegram'
    ? !channel.config.chat_id
    : isIntegration(channel.kind) && !channel.remote_chat_id
}
export function channelWarning(channel: Channel, connections?: IntegrationConnection[]) {
  if (!channel.active) return 'Канал отключён'
  if (needsChat(channel)) return 'Чат не указан'
  if (!isIntegration(channel.kind)) return ''
  if (!channel.connection_id) return 'Подключение не выбрано'
  if (!connections) return 'Проверка подключения недоступна'
  const connection = connections.find((c) => c.id === channel.connection_id)
  if (!connection || connection.provider !== channel.kind) return 'Подключение недоступно'
  if (!connection.active) return 'Бот отключён'
  if (!connection.has_credentials) return 'Нужен токен бота'
  if (connection.health_status === 'error') return 'Ошибка подключения бота'
  if (connection.health_status !== 'healthy') return 'Бот не проверен'
  if (
    connection.provider === 'bitrix24' &&
    (connection.setup_status !== 'ready' || !connection.external_bot_id)
  )
    return 'Бот не зарегистрирован'
  return ''
}
/** The backend requires a complete ChannelIn for PATCH. Preserve routing. */
export function channelUpdatePayload(channel: Channel, changes: Partial<Channel> = {}) {
  const value = { ...channel, ...changes }
  return {
    name: value.name,
    kind: value.kind,
    config: value.config,
    active: value.active,
    connection_id: value.connection_id ?? null,
    remote_chat_id: value.remote_chat_id ?? null,
  }
}
/** Preview for a newly issued invoice; activity and chat binding remain independent. */
export function recipientChannels(
  channels: Channel[],
  groups: AudienceGroup[],
  groupIds: string[],
) {
  const ids = new Set(groups.filter((g) => groupIds.includes(g.id)).flatMap((g) => g.channel_ids))
  return channels.filter(
    (c) => c.active && (!groupIds.length || c.kind === 'inapp' || ids.has(c.id)),
  )
}
