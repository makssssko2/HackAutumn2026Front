<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { b2bApi, type Environment, type PartnerKey } from '@/entities/b2b'
import { useAsyncData } from '@/shared/lib'
import { AsyncState, EmptyState } from '@/shared/ui'

const { data, loading, error, reload } = useAsyncData(
  async (signal) => {
    const [partners, buyers] = await Promise.all([b2bApi.partners(signal), b2bApi.buyers(signal)])
    return { partners: partners.items, buyers: buyers.items }
  },
  {
    partners: [] as Awaited<ReturnType<typeof b2bApi.partners>>['items'],
    buyers: [] as Awaited<ReturnType<typeof b2bApi.buyers>>['items'],
  },
)
const selectedId = ref(''),
  busy = ref(false),
  operationError = ref(''),
  notice = ref('')
const selected = computed(() =>
  data.value.partners.find((partner) => partner.id === selectedId.value),
)
const organization = reactive({ kind: 'partner', name: '', inn: '', kpp: '' })
const account = reactive({ account_number: '', bank_name: '', bank_bic: '', verified: false })
const buyerId = ref(''),
  environment = ref<Environment>('test'),
  revealedKey = ref(''),
  copyError = ref('')
const keys = ref<PartnerKey[]>([]),
  keysError = ref(''),
  keysLoading = ref(false)
let version = 0,
  keysRequest: AbortController | undefined
watch(
  selectedId,
  () => {
    ++version
    keysRequest?.abort()
    revealedKey.value = ''
    copyError.value = ''
    keys.value = []
    keysError.value = ''
    operationError.value = ''
    notice.value = ''
    buyerId.value = ''
    Object.assign(account, { account_number: '', bank_name: '', bank_bic: '', verified: false })
    void loadKeys()
  },
  { flush: 'sync' },
)
onScopeDispose(() => {
  ++version
  revealedKey.value = ''
  keysRequest?.abort()
})
async function loadKeys() {
  keysRequest?.abort()
  if (!selectedId.value) {
    keysLoading.value = false
    return
  }
  const current = version,
    id = selectedId.value
  const request = new AbortController()
  keysRequest = request
  keysLoading.value = true
  keysError.value = ''
  try {
    const result = await b2bApi.keys(id, request.signal)
    if (current === version && !request.signal.aborted) keys.value = result
  } catch (error) {
    if (current === version && !request.signal.aborted) keysError.value = (error as Error).message
  } finally {
    if (current === version && !request.signal.aborted) keysLoading.value = false
  }
}
async function perform(operation: () => Promise<unknown>, success: string) {
  if (busy.value) return false
  const current = version
  busy.value = true
  operationError.value = ''
  notice.value = ''
  try {
    await operation()
    await reload()
    if (current === version) {
      notice.value = success
      return true
    }
    return false
  } catch (error) {
    if (current === version) operationError.value = (error as Error).message
    return false
  } finally {
    busy.value = false
  }
}
async function createOrganization() {
  const value = {
    name: organization.name.trim(),
    inn: organization.inn.trim(),
    kpp: organization.kpp.trim() || undefined,
  }
  const create = organization.kind === 'partner' ? b2bApi.createPartner : b2bApi.createBuyer
  if (await perform(() => create(value), 'Организация добавлена'))
    Object.assign(organization, { name: '', inn: '', kpp: '' })
}
async function addAccount() {
  const id = selectedId.value,
    value = { ...account }
  if (await perform(() => b2bApi.addAccount(id, value), 'Реквизиты добавлены'))
    Object.assign(account, { account_number: '', bank_name: '', bank_bic: '', verified: false })
}
async function grantAccess() {
  const id = selectedId.value,
    buyer = buyerId.value
  if (await perform(() => b2bApi.grantAccess(id, buyer), 'Доступ к покупателю выдан'))
    buyerId.value = ''
}
async function issueKey() {
  const id = selectedId.value,
    current = version,
    targetEnvironment = environment.value
  revealedKey.value = ''
  copyError.value = ''
  await perform(async () => {
    const result = await b2bApi.issueKey(id, targetEnvironment)
    if (current === version) {
      revealedKey.value = result.api_key
      await loadKeys()
    }
  }, 'Ключ выпущен. Сохраните его: повторно он не отображается.')
}
async function revoke(keyId: string) {
  const id = selectedId.value,
    current = version
  await perform(async () => {
    await b2bApi.revokeKey(id, keyId)
    if (current === version) await loadKeys()
  }, 'Ключ отозван')
}
async function copyKey() {
  try {
    await navigator.clipboard.writeText(revealedKey.value)
    copyError.value = 'Ключ скопирован'
  } catch {
    copyError.value = 'Не удалось скопировать. Выделите ключ и скопируйте вручную.'
  }
}
function hideKey() {
  revealedKey.value = ''
  copyError.value = ''
}
</script>

<template>
  <div class="b2b-partners">
    <section class="panel b2b-onboarding">
      <h2>Подключение поставщика</h2>
      <p>
        Добавьте поставщика и вашу организацию, укажите проверенные реквизиты и выдайте доступ к
        покупателю. После этого выпустите API-ключ и передайте его поставщику.
      </p>
      <p>
        Поставщик отправляет JSON в <code>POST /api/b2b/v1/invoices</code> с заголовками
        <code>Authorization: Bearer …</code> и <code>Idempotency-Key</code>. Счёт сразу появляется в
        реестре.
      </p>
      <a href="/api/v1/docs" target="_blank" rel="noopener">Открыть документацию API</a>
    </section>
    <p v-if="operationError" class="error-box" role="alert">{{ operationError }}</p>
    <p v-if="notice" class="b2b-notice" role="status">{{ notice }}</p>
    <AsyncState
      :loading="loading"
      :error="error === 'Not Found' ? 'Раздел B2B пока не включён на сервере.' : error"
      @retry="reload"
    >
      <div class="b2b-partner-grid">
        <section class="panel b2b-card">
          <h2>Добавить организацию</h2>
          <form @submit.prevent="createOrganization">
            <fieldset :disabled="busy">
              <label
                >Тип организации<select v-model="organization.kind">
                  <option value="partner">Поставщик</option>
                  <option value="buyer">Покупатель (ваша организация)</option>
                </select></label
              ><label
                >Название организации<input
                  v-model="organization.name"
                  required
                  maxlength="240" /></label
              ><label
                >ИНН<input
                  v-model="organization.inn"
                  inputmode="numeric"
                  pattern="[0-9]{10}([0-9]{2})?"
                  required
                  maxlength="12" /></label
              ><label
                >КПП (если есть)<input
                  v-model="organization.kpp"
                  inputmode="numeric"
                  pattern="[0-9]{9}"
                  maxlength="9" /></label
              ><button class="button">Добавить организацию</button>
            </fieldset>
          </form>
        </section>
        <section class="panel b2b-card">
          <h2>Поставщики</h2>
          <label v-if="data.partners.length"
            >Поставщик<select v-model="selectedId" :disabled="busy">
              <option value="">Выберите поставщика</option>
              <option v-for="partner in data.partners" :key="partner.id" :value="partner.id">
                {{ partner.name }} · {{ partner.inn }}
              </option>
            </select></label
          ><EmptyState
            v-else
            title="Добавьте первого поставщика"
            description="Его счета будут доступны в разделе «Входящие счета»."
            icon="users"
          /><template v-if="selected"
            ><p>{{ selected.name }} · ИНН {{ selected.inn }}</p>
            <p class="muted">{{ selected.status === 'active' ? 'Активен' : 'Заблокирован' }}</p>
            <h3>Покупатели</h3>
            <ul>
              <li
                v-for="buyer in data.buyers.filter((item) => selected!.buyer_ids.includes(item.id))"
                :key="buyer.id"
              >
                {{ buyer.name }} · {{ buyer.inn }}
              </li>
            </ul>
            <form @submit.prevent="grantAccess">
              <fieldset :disabled="busy">
                <label
                  >Разрешить выставлять счета организации<select v-model="buyerId" required>
                    <option value="">Выберите покупателя</option>
                    <option
                      v-for="buyer in data.buyers.filter(
                        (item) => item.active && !selected!.buyer_ids.includes(item.id),
                      )"
                      :key="buyer.id"
                      :value="buyer.id"
                    >
                      {{ buyer.name }}
                    </option>
                  </select></label
                ><button class="button secondary" :disabled="!buyerId">Выдать доступ</button>
              </fieldset>
            </form>
            <p v-if="!data.buyers.length" class="muted">
              Сначала добавьте организацию типа «Покупатель».
            </p></template
          >
        </section>
        <template v-if="selected">
          <section class="panel b2b-card">
            <h2>Банковские реквизиты</h2>
            <ul class="b2b-accounts">
              <li v-for="bank in selected.bank_accounts" :key="bank.id">
                <strong>{{ bank.bank_name }}</strong
                ><span>{{ bank.account_number }}</span
                ><small
                  >{{ bank.verified ? 'Проверены' : 'Не проверены' }} ·
                  {{ bank.active ? 'Активны' : 'Отключены' }}</small
                >
              </li>
            </ul>
            <form @submit.prevent="addAccount">
              <fieldset :disabled="busy">
                <label
                  >Расчётный счёт<input
                    v-model="account.account_number"
                    required
                    maxlength="34" /></label
                ><label
                  >Название банка<input
                    v-model="account.bank_name"
                    required
                    maxlength="240" /></label
                ><label>БИК<input v-model="account.bank_bic" required maxlength="16" /></label
                ><label class="b2b-checkbox"
                  ><input v-model="account.verified" type="checkbox" />Реквизиты проверены</label
                ><button class="button secondary">Добавить реквизиты</button>
              </fieldset>
            </form>
            <p class="muted">API принимает счета только с проверенными активными реквизитами.</p>
          </section>
          <section class="panel b2b-card">
            <h2>API-ключи</h2>
            <p>
              Ключ разрешает поставщику создавать и читать свои счета. Рабочая и тестовая среды
              изолированы.
            </p>
            <form @submit.prevent="issueKey">
              <fieldset :disabled="busy || !!revealedKey || selected.status !== 'active'">
                <label
                  >Среда нового ключа<select v-model="environment">
                    <option value="test">Тестовая</option>
                    <option value="live">Рабочая</option>
                  </select></label
                ><button class="button secondary">Выпустить ключ</button>
              </fieldset>
            </form>
            <div v-if="revealedKey" class="b2b-secret">
              <p><strong>Сохраните ключ сейчас</strong></p>
              <p>Он показывается один раз и даёт доступ к счетам поставщика.</p>
              <label
                >Новый API-ключ<textarea
                  :value="revealedKey"
                  readonly
                  rows="3"
                  spellcheck="false"
                />
              </label>
              <div class="b2b-key-actions">
                <button class="button secondary small" @click="copyKey">Скопировать</button
                ><button
                  class="button secondary small"
                  @click="hideKey"
                >
                  Сохранён, скрыть
                </button>
              </div>
              <p v-if="copyError" role="status">{{ copyError }}</p>
            </div>
            <AsyncState :loading="keysLoading" :error="keysError" @retry="loadKeys"
              ><ul class="b2b-key-list">
                <li v-for="key in keys" :key="key.id">
                  <div>
                    <code>b2b_{{ key.prefix }}.…</code
                    ><small
                      >{{ key.environment === 'test' ? 'Тестовый' : 'Рабочий' }} ·
                      {{ key.revoked_at ? 'Отозван' : 'Выпущен' }}</small
                    >
                  </div>
                  <button
                    v-if="!key.revoked_at"
                    class="button secondary small"
                    :disabled="busy"
                    @click="revoke(key.id)"
                  >
                    Отозвать ключ
                  </button>
                </li>
              </ul></AsyncState
            >
          </section>
        </template>
      </div>
    </AsyncState>
  </div>
</template>

<style scoped>
.b2b-onboarding {
  padding: 24px;
  margin-bottom: 24px;
  overflow-wrap: anywhere;
}
h2 {
  font-size: 18px;
  margin: 0 0 18px;
}
h3 {
  font-size: 15px;
  margin: 24px 0 14px;
}
p {
  line-height: 1.7;
}
a {
  color: var(--accent-ink);
}
.b2b-partner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.b2b-card {
  margin: 0;
  padding: 28px;
  min-width: 0;
  overflow-wrap: anywhere;
}
fieldset {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
label,
select,
input,
textarea {
  min-width: 0;
  max-width: 100%;
}
.b2b-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
}
.b2b-checkbox input {
  width: auto;
  margin: 0;
}
.b2b-accounts {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
}
.b2b-accounts li {
  display: grid;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
small {
  color: var(--muted);
  line-height: 1.6;
}
.b2b-secret {
  background: var(--accent-pale);
  padding: 18px;
  border-radius: 12px;
  margin: 20px 0;
}
.b2b-secret textarea {
  width: 100%;
  font-family: monospace;
  word-break: break-all;
}
.b2b-key-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.b2b-key-list {
  list-style: none;
  margin: 24px 0 0;
  padding: 0;
}
.b2b-key-list li {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.b2b-key-list li > div {
  min-width: 0;
}
.b2b-key-list code,
.b2b-key-list small {
  display: block;
}
.b2b-notice {
  padding: 14px 18px;
  background: var(--success-pale);
  color: var(--success);
  border-radius: 12px;
}
@media (max-width: 1100px) {
  .b2b-partner-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .b2b-card,
  .b2b-onboarding {
    padding: 20px;
  }
  .b2b-key-list li {
    align-items: flex-start;
    flex-direction: column;
  }
  .b2b-card fieldset > .button {
    width: 100%;
  }
  .b2b-partner-grid {
    gap: 16px;
  }
}
</style>
