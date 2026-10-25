import { onMounted, onScopeDispose, ref, shallowRef } from 'vue'
export function useAsyncData<T>(loader: (signal: AbortSignal) => Promise<T>, initial: T) {
  const data = shallowRef<T>(initial)
  const loading = ref(true)
  const error = ref('')
  let version = 0
  let disposed = false
  let controller: AbortController | undefined
  async function reload() {
    if (disposed) return
    const current = ++version
    controller?.abort()
    const request = new AbortController()
    controller = request
    loading.value = true
    error.value = ''
    try {
      const value = await loader(request.signal)
      if (current === version && !request.signal.aborted) data.value = value
    } catch (e) {
      if (current === version && !request.signal.aborted)
        error.value = e instanceof Error ? e.message : 'Не удалось загрузить данные.'
    } finally {
      if (current === version) loading.value = false
    }
  }
  onMounted(reload)
  onScopeDispose(() => {
    disposed = true
    ++version
    controller?.abort()
  })
  return { data, loading, error, reload }
}
