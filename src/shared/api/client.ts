export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers,
  })
  if (!response.ok) {
    let message = 'Сервис временно недоступен. Попробуйте еще раз.'
    let code: string | undefined
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail))
        message = data.detail.map((item: { msg: string }) => item.msg).join('; ')
      else if (data.detail && typeof data.detail === 'object') {
        if (typeof data.detail.message === 'string') message = data.detail.message
        if (typeof data.detail.code === 'string') code = data.detail.code
      }
    } catch {
      /* Keep a readable fallback for non-JSON errors. */
    }
    if (
      !options.signal?.aborted &&
      response.status === 401 &&
      options.credentials !== 'omit' &&
      !path.startsWith('/auth/')
    )
      window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(response.status, message, code)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const jsonBody = (value: unknown) => JSON.stringify(value)
export function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.size ? `?${query}` : ''
}
