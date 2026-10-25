import { api, queryString } from './client'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  stats?: { failed: number; pending: number }
}
export type ListFilters = Record<string, string | number | undefined>
export function emptyPage<T>(pageSize = 12): Page<T> {
  return { items: [], total: 0, page: 1, page_size: pageSize }
}
export async function readPage<T>(
  path: string,
  filters: ListFilters = {},
  signal?: AbortSignal,
): Promise<Page<T>> {
  const result = await api<Page<T>>(
    `${path}${queryString({ page: 1, page_size: 12, ...filters })}`,
    { signal },
  )
  if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0)
    throw new Error('Сервер не вернул страницу списка. Обновите приложение и повторите запрос.')
  return result
}
/** Complete lookups for recipient selection; each request is bounded to 100 rows. */
export async function allPages<T>(
  path: string,
  filters: ListFilters = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page++) {
    signal?.throwIfAborted()
    const result = await readPage<T>(path, { ...filters, page, page_size: 100 }, signal)
    rows.push(...result.items)
    if (rows.length >= result.total) return rows
    if (!result.items.length)
      throw new Error('Справочник получен не полностью. Обновите список перед выбором получателей.')
  }
}
