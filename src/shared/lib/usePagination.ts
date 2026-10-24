import { computed, ref, watch, type Ref } from 'vue'
export function usePagination<T>(items: Readonly<Ref<T[]>>, pageSize = 12) {
  const requestedPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))
  const page = computed({
    get: () => Math.min(requestedPage.value, totalPages.value),
    set: (value: number) => {
      requestedPage.value = Math.max(1, Math.min(value, totalPages.value))
    },
  })
  const pageRows = computed(() =>
    items.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  )
  watch(items, () => {
    requestedPage.value = 1
  })
  return { page, pageRows }
}
