export interface Channel {
  id: string
  name: string
  kind: string
  config: Record<string, string>
  active: boolean
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
}
export function needsChat(channel: Channel) {
  return channel.kind === 'telegram' && !channel.config.chat_id
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
