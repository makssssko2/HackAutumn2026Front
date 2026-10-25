export interface AuditEvent {
  id: string
  actor: string
  action: string
  created_at: string
  details: Record<string, unknown>
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
