import { onScopeDispose, reactive, ref, watch } from 'vue'
import { oidcApi, type OidcProvider } from '@/entities/oidc'
import { ApiError } from '@/shared/api'
import { useAsyncData } from '@/shared/lib'

export function useOidcSettings() {
  const state = useAsyncData(oidcApi.provider, null as OidcProvider | null)
  const form = reactive({
    name: '',
    discovery_url: '',
    client_id: '',
    client_secret: '',
    enabled: false,
    auto_provision: false,
    session_minutes: 60,
  })
  const busy = ref<'save' | 'test' | null>(null)
  const operationError = ref(''),
    message = ref(''),
    mustReload = ref(false)
  let disposed = false
  watch(state.data, (provider) => {
    if (!provider) return
    const { name, discovery_url, client_id, enabled, auto_provision, session_minutes } = provider
    Object.assign(form, {
      name,
      discovery_url,
      client_id,
      enabled,
      auto_provision,
      session_minutes,
      client_secret: '',
    })
    mustReload.value = false
  })
  onScopeDispose(() => {
    disposed = true
    form.client_secret = ''
  })
  async function reload() {
    if (busy.value || disposed) return
    operationError.value = ''
    message.value = ''
    await state.reload()
  }
  async function run(action: 'save' | 'test') {
    const provider = state.data.value
    if (
      disposed ||
      busy.value ||
      state.loading.value ||
      state.error.value ||
      !provider ||
      mustReload.value
    )
      return
    busy.value = action
    operationError.value = ''
    message.value = ''
    try {
      if (action === 'save') {
        const { client_secret, ...fields } = form
        const saved = await oidcApi.save({
          ...fields,
          expected_revision: provider.revision,
          ...(client_secret ? { client_secret } : {}),
        })
        if (disposed) return
        state.data.value = saved
        form.client_secret = ''
        message.value = 'Настройки сохранены. Ранее открытые корпоративные сеансы завершены.'
      } else {
        const result = await oidcApi.test()
        if (disposed) return
        message.value = `Discovery и ключи доступны. Issuer: ${result.issuer}. Вход и реквизиты клиента этой проверкой не проверяются.`
      }
    } catch (error) {
      if (disposed) return
      // A failed response can follow a committed write. Read back before retrying.
      if (
        action === 'save' &&
        (!(error instanceof ApiError) || error.status === 409 || error.status >= 500)
      ) {
        mustReload.value = true
        operationError.value =
          error instanceof ApiError && error.status === 409
            ? 'Настройки уже изменены. Загрузите актуальные данные и проверьте их перед сохранением.'
            : 'Не удалось подтвердить сохранение. Загрузите актуальные данные и проверьте результат перед повтором.'
      } else {
        operationError.value =
          error instanceof Error ? error.message : 'Не удалось выполнить действие.'
      }
    } finally {
      if (!disposed) busy.value = null
    }
  }
  return {
    ...state,
    reload,
    form,
    busy,
    operationError,
    message,
    mustReload,
    save: () => run('save'),
    test: () => run('test'),
  }
}
