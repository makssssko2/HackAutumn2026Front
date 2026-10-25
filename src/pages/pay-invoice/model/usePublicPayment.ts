import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import { publicPaymentApi, type PublicPaymentInvoice } from '@/entities/payment'
import { ApiError } from '@/shared/api'

export function usePublicPayment(token: Readonly<Ref<string>>) {
  const path = computed(() => publicPaymentApi.path(token.value))
  const invoice = ref<PublicPaymentInvoice | null>(null)
  const error = ref(''),
    invalidLink = ref(false),
    loading = ref(true),
    submitting = ref(false)
  const paidAt = ref(''),
    name = ref('')
  let generation = 0
  let submission = 0
  let request: AbortController | undefined
  let disposed = false

  async function load() {
    if (disposed) return
    const current = ++generation
    ++submission
    request?.abort()
    const controller = new AbortController()
    request = controller
    loading.value = true
    submitting.value = false
    invoice.value = null
    error.value = ''
    invalidLink.value = false
    try {
      const value = await publicPaymentApi.get(token.value, controller.signal)
      if (current !== generation || controller.signal.aborted) return
      invoice.value = value
      paidAt.value = value.today
    } catch (failure) {
      if (current !== generation || controller.signal.aborted) return
      invalidLink.value = failure instanceof ApiError && failure.status === 404
      error.value = failure instanceof Error ? failure.message : 'Не удалось загрузить счёт.'
    } finally {
      if (current === generation) loading.value = false
    }
  }
  async function confirm() {
    if (!invoice.value || submitting.value || disposed) return
    const current = generation
    const operation = ++submission
    const targetToken = token.value
    submitting.value = true
    error.value = ''
    try {
      const value = await publicPaymentApi.confirm(targetToken, {
        paid_at: paidAt.value,
        name: name.value,
        expected_revision: invoice.value.revision,
      })
      if (current === generation) invoice.value = value
    } catch (failure) {
      if (current !== generation) return
      if (failure instanceof ApiError && failure.status === 409) {
        const recovery = generation + 1
        await load()
        if (
          !disposed &&
          generation === recovery &&
          token.value === targetToken &&
          !invoice.value?.paid
        )
          error.value = failure.message
      } else
        error.value = failure instanceof Error ? failure.message : 'Не удалось подтвердить оплату.'
    } finally {
      if (!disposed && operation === submission) submitting.value = false
    }
  }
  watch(
    token,
    () => {
      name.value = ''
      void load()
    },
    { immediate: true, flush: 'sync' },
  )
  onScopeDispose(() => {
    disposed = true
    ++generation
    request?.abort()
  })
  return { path, invoice, error, invalidLink, loading, submitting, paidAt, name, load, confirm }
}
