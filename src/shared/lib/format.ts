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
  if (!Number.isFinite(parsed.getTime())) return '—'
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
