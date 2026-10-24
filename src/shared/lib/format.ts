export const currencies = ['RUB', 'USD', 'EUR'] as const
export function plural(count: number, forms: [string, string, string]) {
  const lastTwo = Math.abs(count) % 100,
    last = lastTwo % 10
  return lastTwo >= 11 && lastTwo <= 14
    ? forms[2]
    : last === 1
      ? forms[0]
      : last >= 2 && last <= 4
        ? forms[1]
        : forms[2]
}
export type Currency = (typeof currencies)[number]
export function money(value: string | number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}
export function dateLabel(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—'
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  return new Intl.DateTimeFormat(
    'ru-RU',
    options || { day: 'numeric', month: 'short', year: 'numeric' },
  ).format(parsed)
}
export function dateISO(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
export function monthRange(value: string) {
  const [year, month] = value.split('-').map(Number)
  return { date_from: `${value}-01`, date_to: dateISO(new Date(year!, month!, 0)) }
}
export const frequencyLabel: Record<string, string> = {
  monthly: 'Ежемесячно',
  quarterly: 'Раз в квартал',
  yearly: 'Ежегодно',
  weekly: 'Еженедельно',
}
export const actionLabel: Record<string, string> = {
  'auth.login': 'Вход в систему',
  'auth.logout': 'Выход из системы',
  'auth.failed': 'Неудачная попытка входа',
  'auth.denied': 'Отказ во входе: панель только для администратора',
  'payment.created': 'Создан регулярный платеж',
  'payment.stopped': 'Регулярный платеж прекращен',
  'payment.one_time_created': 'Создан разовый платеж',
  'payment.one_time_cancelled': 'Разовый платеж отменен',
  'notification.reminder_requested': 'Запрошено напоминание по счету',
  'occurrence.paid': 'Оплата подтверждена',
  'occurrence.unpaid': 'Отметка оплаты отменена',
  'user.created': 'Создан пользователь',
  'user.updated': 'Изменен пользователь',
  'user.deleted': 'Удален пользователь',
  'channel.created': 'Подключен канал',
  'channel.updated': 'Изменен канал',
  'channel.connected': 'Привязан Telegram-чат',
  'channel.link_requested': 'Создан код подключения',
  'channel.test': 'Тестовая отправка',
  'group.created': 'Создана группа',
  'group.updated': 'Изменена группа',
  'group.deleted': 'Удалена группа',
  'attachment.created': 'Прикреплен файл',
  'attachment.linked': 'Прикреплена ссылка',
  'notification.retry': 'Повторная отправка уведомления',
}
