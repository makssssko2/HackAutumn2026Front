import { onMounted, ref, shallowRef } from 'vue'
export function useAsyncData<T>(loader: () => Promise<T>, initial: T) {
  const data = shallowRef<T>(initial)
  const loading = ref(true)
  const error = ref('')
  let version = 0
  async function reload() {
    const current = ++version
    loading.value = true
    error.value = ''
    try {
      const value = await loader()
      if (current === version) data.value = value
    } catch (e) {
      if (current === version) error.value = (e as Error).message
    } finally {
      if (current === version) loading.value = false
    }
  }
  onMounted(reload)
  return { data, loading, error, reload }
}
