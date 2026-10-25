<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { b2bApi, canRecordPayment, invoiceStatus, historyLabel } from '@/entities/b2b'
import { dateISO, dateLabel, money } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
import { useB2BInvoice } from '../model/useB2BInvoice'

const route = useRoute()
const { invoice, data, loading, error, reload, busy, operationError, message, mutate } =
  useB2BInvoice(() => String(route.params.id))
const form = reactive({ paid_at: dateISO(), reference: '' })
const reversalReason = ref('')
watch(
  () => route.params.id,
  () => {
    form.paid_at = dateISO()
    form.reference = ''
    reversalReason.value = ''
  },
)
const activePayment = computed(() =>
  invoice.value?.payments.find((payment) => !payment.reversed_at),
)
async function record() {
  if (!form.reference.trim()) return
  await mutate((current) =>
    b2bApi.recordPayment(current.id, {
      expected_revision: current.revision,
      amount: current.amount,
      paid_at: form.paid_at,
      reference: form.reference.trim(),
    }),
  )
}
async function reverse() {
  if (!reversalReason.value.trim()) return
  if (
    await mutate((current) =>
      b2bApi.reversePayment(current.id, current.revision, reversalReason.value.trim()),
    )
  )
    reversalReason.value = ''
}
</script>

<template>
  <div class="b2b-detail">
    <RouterLink class="b2b-back" to="/b2b"
      ><AppIcon name="back" :size="17" />Входящие B2B-счета</RouterLink
    >
    <AsyncState :loading="loading" :error="error" @retry="reload">
      <template v-if="invoice">
        <header class="page-heading">
          <div>
            <h1>Счёт № {{ invoice.number }}</h1>
            <p>{{ invoice.title }}</p>
          </div>
          <span class="b2b-state"
            >{{ invoiceStatus(invoice) }} ·
            {{ invoice.environment === 'test' ? 'Тестовый' : 'Рабочий' }}</span
          >
        </header>
        <p v-if="invoice.environment === 'test'" class="b2b-callout">
          Тестовый счёт. Записи об оплате относятся только к тестовой среде.
        </p>
        <div class="b2b-detail-grid">
          <section class="panel b2b-card">
            <h2>Данные счёта</h2>
            <strong class="b2b-total">{{ money(invoice.amount, invoice.currency) }}</strong>
            <dl>
              <div>
                <dt>Дата выставления</dt>
                <dd>{{ dateLabel(invoice.issued_at) }}</dd>
              </div>
              <div>
                <dt>Оплатить до</dt>
                <dd>{{ dateLabel(invoice.due_date) }}</dd>
              </div>
              <div>
                <dt>Поставщик</dt>
                <dd>
                  {{ invoice.supplier_name
                  }}<small>ИНН {{ invoice.supplier_snapshot.inn || '—' }}</small>
                </dd>
              </div>
              <div>
                <dt>Покупатель</dt>
                <dd>
                  {{ invoice.buyer_name }}<small>ИНН {{ invoice.buyer_snapshot.inn || '—' }}</small>
                </dd>
              </div>
              <div>
                <dt>Внешний номер</dt>
                <dd>{{ invoice.external_id }}</dd>
              </div>
            </dl>
            <p v-if="invoice.description" class="b2b-description">{{ invoice.description }}</p>
            <p v-if="invoice.decision_reason" class="muted">
              Причина: {{ invoice.decision_reason }}
            </p>
          </section>
          <section class="panel b2b-card">
            <h2>Реквизиты поставщика</h2>
            <dl>
              <div>
                <dt>Банк</dt>
                <dd>{{ invoice.bank_account_snapshot.bank_name || '—' }}</dd>
              </div>
              <div>
                <dt>Расчётный счёт</dt>
                <dd>{{ invoice.bank_account_snapshot.account_number || '—' }}</dd>
              </div>
              <div>
                <dt>БИК</dt>
                <dd>{{ invoice.bank_account_snapshot.bank_bic || '—' }}</dd>
              </div>
              <div v-if="invoice.bank_account_snapshot.correspondent_account">
                <dt>Корреспондентский счёт</dt>
                <dd>{{ invoice.bank_account_snapshot.correspondent_account }}</dd>
              </div>
            </dl>
            <p class="muted">Счёт получен через REST API. PDF не требуется.</p>
          </section>
          <section class="panel b2b-card">
            <h2>Учёт оплаты</h2>
            <p>Отметка фиксирует оплату в системе. Списание средств не производится.</p>
            <form v-if="canRecordPayment(invoice)" @submit.prevent="record">
              <fieldset :disabled="busy">
                <label>Дата оплаты<input v-model="form.paid_at" required type="date" /></label
                ><label
                  >Номер платёжного документа<input
                    v-model="form.reference"
                    required
                    maxlength="240"
                    placeholder="Например, п/п № 128" /></label
                ><button class="button" :disabled="!form.reference.trim()">
                  {{ busy ? 'Сохраняем…' : 'Отметить оплату' }}
                </button>
              </fieldset>
            </form>
            <template v-else-if="activePayment"
              ><p>
                <strong>{{ money(activePayment.amount, invoice.currency) }}</strong> ·
                {{ dateLabel(activePayment.paid_at) }}
              </p>
              <p>{{ activePayment.reference }}</p>
              <details>
                <summary>Исправить ошибочную отметку</summary>
                <form @submit.prevent="reverse">
                  <fieldset :disabled="busy">
                    <label
                      >Причина исправления<textarea
                        v-model="reversalReason"
                        required
                        maxlength="10000"
                      /></label
                    ><button class="button secondary" :disabled="!reversalReason.trim()">
                      Отменить отметку оплаты
                    </button>
                  </fieldset>
                </form>
              </details></template
            >
            <p v-else class="muted">Для этого состояния счёта отметка оплаты недоступна.</p>
            <p v-if="operationError" class="error-text" role="alert">{{ operationError }}</p>
            <p v-if="message" role="status">{{ message }}</p>
          </section>
          <section class="panel b2b-card">
            <h2>История</h2>
            <ol class="b2b-history">
              <li v-for="(event, index) in data.history" :key="index">
                <strong>{{ historyLabel(event.action) }}</strong
                ><span
                  >{{
                    dateLabel(event.created_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }}
                  ·
                  {{
                    event.actor_type === 'partner'
                      ? 'Поставщик'
                      : event.actor_type === 'admin'
                        ? 'Администратор'
                        : 'Система'
                  }}</span
                >
                <p v-if="event.reason">{{ event.reason }}</p>
              </li>
            </ol>
          </section>
          <section v-if="invoice.documents.length" class="panel b2b-card">
            <h2>Дополнительные вложения</h2>
            <ul class="b2b-documents">
              <li v-for="document in invoice.documents" :key="document.id">
                <a
                  v-if="document.scan_status === 'clean'"
                  :href="b2bApi.documentUrl(invoice.id, document.id)"
                  ><AppIcon name="download" :size="17" />{{ document.original_name }}</a
                ><span v-else
                  >{{ document.original_name }} ·
                  {{ document.scan_status === 'pending' ? 'Проверяется' : 'Недоступен' }}</span
                >
              </li>
            </ul>
          </section>
        </div>
      </template>
    </AsyncState>
  </div>
</template>

<style scoped>
.b2b-back {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 24px;
  color: var(--muted);
  text-decoration: none;
}
.page-heading h1,
.page-heading p {
  overflow-wrap: anywhere;
}
.b2b-state {
  background: var(--accent-pale);
  color: var(--accent-ink);
  border-radius: 10px;
  padding: 10px 14px;
  line-height: 1.5;
}
.b2b-callout {
  padding: 16px;
  background: var(--warning-pale);
  color: var(--warning);
  border-radius: 12px;
}
.b2b-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.b2b-card {
  min-width: 0;
  padding: 28px;
  margin: 0;
  overflow-wrap: anywhere;
}
.b2b-card h2 {
  font-size: 18px;
  margin: 0 0 20px;
}
.b2b-card p {
  line-height: 1.7;
}
.b2b-total {
  display: block;
  font-size: clamp(24px, 3vw, 36px);
  margin-bottom: 24px;
  font-variant-numeric: tabular-nums;
}
dl {
  margin: 0;
}
dl > div {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1.2fr);
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  line-height: 1.5;
}
dd small {
  display: block;
  color: var(--muted);
  margin-top: 5px;
}
.b2b-description {
  white-space: pre-wrap;
}
fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
  min-width: 0;
}
details {
  margin-top: 24px;
}
summary {
  cursor: pointer;
  line-height: 1.6;
}
details form {
  margin-top: 20px;
}
.b2b-history {
  list-style: none;
  margin: 0;
  padding: 0;
}
.b2b-history li {
  padding: 0 0 20px 18px;
  border-left: 2px solid var(--accent-line);
}
.b2b-history strong,
.b2b-history span {
  display: block;
  line-height: 1.6;
}
.b2b-history span {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.b2b-documents {
  list-style: none;
  padding: 0;
}
.b2b-documents a {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--accent-ink);
}
.b2b-documents svg {
  flex: none;
}
@media (max-width: 1100px) {
  .b2b-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .b2b-card {
    padding: 20px;
  }
  dl > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
  .b2b-detail-grid {
    gap: 16px;
  }
  .b2b-card button {
    width: 100%;
  }
}
</style>
