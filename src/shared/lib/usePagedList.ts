import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { emptyPage, readPage, type ListFilters, type Page } from '@/shared/api'

export function usePagedList<T>(
  path: string | (() => string),
  filters: () => ListFilters = () => ({}),
  options: { pageSize?: number; debounce?: number; enabled?: () => boolean } = {},
) {
  const page = ref(1),
    pageSize = ref(options.pageSize || 12)
  const data = shallowRef<Page<T>>(emptyPage(pageSize.value))
  const loading = ref(true),
    error = ref('')
  let version = 0,
    mounted = false,
    controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const endpoint = () => (typeof path === 'string' ? path : path())
  async function reload() {
    clearTimeout(timer)
    const current = ++version
    controller?.abort()
    if (options.enabled && !options.enabled()) {
      data.value = emptyPage(pageSize.value)
      loading.value = false
      error.value = ''
      return
    }
    controller = new AbortController()
    loading.value = true
    error.value = ''
    try {
      const result = await readPage<T>(
        endpoint(),
        { ...filters(), page: page.value, page_size: pageSize.value },
        controller.signal,
      )
      if (current !== version) return
      const last = Math.max(1, Math.ceil(result.total / pageSize.value))
      if (page.value > last) {
        page.value = last
        return
      }
      data.value = result
    } catch (e) {
      if (current === version && !(e instanceof Error && e.name === 'AbortError'))
        error.value = e instanceof Error ? e.message : 'Не удалось загрузить список.'
    } finally {
      if (current === version) loading.value = false
    }
  }
  watch(
    [page, pageSize, () => JSON.stringify(filters()), endpoint, () => options.enabled?.() ?? true],
    (values, previous) => {
      if (!mounted) return
      clearTimeout(timer)
      const changed =
        values[1] !== previous[1] || values[2] !== previous[2] || values[3] !== previous[3]
      if (changed && page.value !== 1) {
        page.value = 1
        return
      }
      if (changed && options.debounce) {
        ++version
        controller?.abort()
        loading.value = true
        timer = setTimeout(reload, options.debounce)
      } else void reload()
    },
  )
  onMounted(() => {
    mounted = true
    void reload()
  })
  onUnmounted(() => {
    ++version
    clearTimeout(timer)
    controller?.abort()
  })
  return {
    data,
    rows: computed(() => data.value.items),
    total: computed(() => data.value.total),
    page,
    pageSize,
    loading,
    error,
    reload,
  }
}
