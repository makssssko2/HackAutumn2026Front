import { describe, expect, it } from 'vitest'
import { recipientChannels, needsChat, type Channel } from './channel'
const channels: Channel[] = [
  { id: 'journal', name: 'Журнал', kind: 'inapp', config: {}, active: true },
  { id: 'chat', name: 'Чат', kind: 'telegram', config: { chat_id: '-1' }, active: true },
  { id: 'unbound', name: 'Без привязки', kind: 'telegram', config: {}, active: true },
  { id: 'mail', name: 'Почта', kind: 'email', config: { email: 'test@example.com' }, active: true },
  { id: 'off', name: 'Отключен', kind: 'email', config: {}, active: false },
]
const groups = [
  { id: 'a', name: 'A', channel_ids: ['chat', 'off'] },
  { id: 'b', name: 'B', channel_ids: ['chat', 'unbound'] },
]
describe('new invoice recipient preview', () => {
  it('broadcast includes active channels outside groups, including an unbound channel', () => {
    expect(recipientChannels(channels, groups, []).map((c) => c.id)).toEqual([
      'journal',
      'chat',
      'unbound',
      'mail',
    ])
    expect(needsChat(channels[2]!)).toBe(true)
    expect(channels[2]!.active).toBe(true)
  })
  it('targets the union of selected groups without duplicates and keeps the journal', () => {
    expect(recipientChannels(channels, groups, ['a', 'b']).map((c) => c.id)).toEqual([
      'journal',
      'chat',
      'unbound',
    ])
  })
  it('an empty group does not imply broadcast', () => {
    expect(
      recipientChannels(channels, [{ id: 'empty', name: 'Empty', channel_ids: [] }], ['empty']).map(
        (c) => c.id,
      ),
    ).toEqual(['journal'])
  })
})
