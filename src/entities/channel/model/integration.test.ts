import { describe, expect, it } from 'vitest'
import {
  connectionPayload,
  connectionLabel,
  connectionReady,
  integrationError,
  type IntegrationConnection,
} from './integration'
import { channelUpdatePayload, channelWarning, needsChat, type Channel } from './channel'
import { ApiError } from '@/shared/api'

const connection: IntegrationConnection = {
  id: 'server',
  provider: 'mattermost',
  name: 'Рабочий сервер',
  base_url: 'https://chat.example.com',
  active: true,
  setup_status: 'ready',
  health_status: 'healthy',
  has_credentials: true,
  external_bot_id: 'bot',
  capabilities: {},
  last_checked_at: null,
  last_event_at: null,
  last_error_code: null,
  generation: 1,
}
const channel: Channel = {
  id: 'chat',
  kind: 'mattermost',
  name: 'Команда',
  config: {},
  active: true,
  connection_id: 'server',
  remote_chat_id: 'non-numeric-channel',
}

describe('connection credentials and routing', () => {
  it('keeps the Bitrix webhook write-only and validates its portal', () => {
    const values = {
      name: 'Портал',
      base_url: 'https://company.bitrix24.ru',
      credential: 'https://company.bitrix24.ru/rest/1/secret/',
    }
    expect(connectionPayload('bitrix24', values)).toMatchObject({
      credentials: { webhook_url: values.credential },
      base_url: values.base_url,
    })
    for (const credential of [
      'https://other.example/rest/1/secret/',
      'http://company.bitrix24.ru/rest/1/secret/',
      'https://company.bitrix24.ru/rest/1/secret/?token=x',
    ])
      expect(() => connectionPayload('bitrix24', { ...values, credential })).toThrow('Webhook')
    expect(() => connectionPayload('bitrix24', { ...values, base_url: values.credential })).toThrow(
      'адрес портала',
    )
    expect(() =>
      connectionPayload('bitrix24', values, { ...connection, provider: 'bitrix24' }),
    ).toThrow('другого портала')
  })
  it('requires Bitrix bot registration after successful API validation', () => {
    const bot: IntegrationConnection = {
      ...connection,
      provider: 'bitrix24',
      setup_status: 'configured',
      external_bot_id: null,
    }
    const chat: Channel = { ...channel, kind: 'bitrix24', remote_chat_id: 'chat123' }
    expect(connectionReady(bot)).toBe(false)
    expect(connectionLabel(bot)).toBe('Требуется регистрация бота')
    expect(channelWarning(chat, [bot])).toBe('Бот не зарегистрирован')
    expect(connectionReady({ ...bot, setup_status: 'ready' })).toBe(false)
    expect(connectionReady({ ...bot, setup_status: 'ready', external_bot_id: '123' })).toBe(true)
    expect(needsChat(chat)).toBe(false)
  })
  it('redacts unknown structured provider errors', () => {
    expect(
      integrationError(
        new ApiError(422, 'https://portal/rest/1/private', 'unexpected_provider_code'),
      ),
    ).not.toContain('private')
  })
  it('maps tokens to the backend provider contract and normalizes URL', () => {
    expect(
      connectionPayload('vk_teams', {
        name: ' VK ',
        base_url: ' https://example.com/bot/v1/ ',
        credential: ' secret ',
      }),
    ).toEqual({
      provider: 'vk_teams',
      name: 'VK',
      base_url: 'https://example.com/bot/v1',
      credentials: { token: 'secret' },
    })
    expect(
      connectionPayload('mattermost', {
        name: 'MM',
        base_url: 'https://example.com',
        credential: 'access',
      }),
    ).toMatchObject({ credentials: { access_token: 'access' } })
  })
  it('omits unchanged credentials on update instead of replacing with an empty string', () => {
    const payload = connectionPayload(
      'mattermost',
      { name: 'Renamed', base_url: connection.base_url, credential: '' },
      connection,
    )
    expect(payload).not.toHaveProperty('credentials')
    expect(payload).not.toHaveProperty('provider')
    expect(() =>
      connectionPayload('mattermost', {
        name: 'New',
        base_url: connection.base_url,
        credential: '',
      }),
    ).toThrow('токен')
  })
  it('rejects secret-bearing URLs and non-HTTPS endpoints', () => {
    for (const base_url of [
      'http://example.com',
      'https://user:secret@example.com',
      'https://example.com?token=secret',
      'https://example.com#token',
    ]) {
      expect(() =>
        connectionPayload('mattermost', { name: 'MM', base_url, credential: 'x' }),
      ).toThrow('HTTPS')
    }
  })
  it('preserves integration routing when toggling a channel with full ChannelIn', () => {
    expect(channelUpdatePayload(channel, { active: false })).toEqual({
      name: 'Команда',
      kind: 'mattermost',
      config: {},
      active: false,
      connection_id: 'server',
      remote_chat_id: 'non-numeric-channel',
    })
  })
  it('keeps API validation separate from credentials being saved or a channel being active', () => {
    expect(connectionLabel({ ...connection, health_status: 'not_checked' })).toBe('Бот не проверен')
    expect(channelWarning(channel, [connection])).toBe('')
    expect(channelWarning(channel, [{ ...connection, active: false }])).toBe('Бот отключён')
    expect(channelWarning(channel, [{ ...connection, health_status: 'error' }])).toBe(
      'Ошибка подключения бота',
    )
    expect(channelWarning(channel, [])).toBe('Подключение недоступно')
    expect(channelWarning(channel)).toBe('Проверка подключения недоступна')
    expect(needsChat({ ...channel, kind: 'vk_teams', remote_chat_id: '1@chat.agent' })).toBe(false)
    expect(needsChat({ ...channel, remote_chat_id: '' })).toBe(true)
  })
  it('maps provider errors without displaying provider diagnostics containing a secret', () => {
    expect(
      integrationError(new ApiError(422, 'secret-token', 'credentials_invalid')),
    ).not.toContain('secret-token')
    expect(integrationError(new ApiError(503, 'key error'))).toContain('защищённое хранение')
  })
  it('preserves actionable channel conflicts during initial setup', () => {
    const message = 'Сначала создайте хотя бы один платеж'
    expect(integrationError(new ApiError(409, message))).toBe(message)
  })
})
