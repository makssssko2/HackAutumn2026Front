export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Сервис временно недоступен. Попробуйте еще раз.'
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail))
        message = data.detail.map((item: { msg: string }) => item.msg).join('; ')
    } catch {
      /* Keep a readable fallback for non-JSON errors. */
    }
    if (response.status === 401 && options.credentials !== 'omit' && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(response.status, message)
  }
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
