import { computed, onScopeDispose, ref, watch } from 'vue'
import { b2bApi, type InvoiceDetail, type InvoiceHistory } from '@/entities/b2b'
import { useAsyncData } from '@/shared/lib'

export function useB2BInvoice(id: () => string) {
  const state = useAsyncData(
    async (signal) => {
      const current = id()
      const [invoice, history] = await Promise.all([
        b2bApi.detail(current, signal),
        b2bApi.history(current, signal),
      ])
      return { invoice, history }
    },
    { invoice: null as InvoiceDetail | null, history: [] as InvoiceHistory[] },
  )
  const busy = ref(false),
    operationError = ref(''),
    message = ref('')
  let version = 0
  watch(
    id,
    () => {
      ++version
      busy.value = false
      operationError.value = ''
      message.value = ''
      void state.reload()
    },
    { flush: 'sync' },
  )
  onScopeDispose(() => {
    ++version
  })
  const invoice = computed(() =>
    state.data.value.invoice?.id === id() ? state.data.value.invoice : null,
  )
  async function mutate(operation: (invoice: InvoiceDetail) => Promise<unknown>) {
    if (busy.value || !invoice.value || state.loading.value || state.error.value) return false
    const current = ++version
    const selected = invoice.value
    busy.value = true
    operationError.value = ''
    message.value = ''
    try {
      await operation(selected)
      if (current !== version || selected.id !== id()) return false
      await state.reload()
      if (current !== version) return false
      message.value = 'Изменения сохранены'
      return true
    } catch (error) {
      if (current === version) operationError.value = (error as Error).message
      return false
    } finally {
      if (current === version) busy.value = false
    }
  }
  return { ...state, invoice, busy, operationError, message, mutate }
}
