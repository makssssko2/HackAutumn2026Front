<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError, jsonBody } from '@/shared/api'
import { money, dateLabel } from '@/shared/lib'
import { AppIcon } from '@/shared/ui'

interface Invoice {
  title: string
  amount: string
  currency: string
  due_date: string
  paid: boolean
  cancelled: boolean
  paid_at: string | null
  revision: number
  today: string
  has_receipt: boolean
  overdue_days: number
}
const route = useRoute()
const path = computed(() => `/public/payments/${encodeURIComponent(String(route.params.token))}`)
const invoice = ref<Invoice | null>(null)
const error = ref('')
const loading = ref(true)
const submitting = ref(false)
const paidAt = ref('')
const name = ref('')
async function load() {
  loading.value = true
  invoice.value = null
  error.value = ''
  try {
    invoice.value = await api<Invoice>(path.value)
    paidAt.value = invoice.value.today
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
async function confirm() {
  if (!invoice.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    invoice.value = await api<Invoice>(`${path.value}/confirm`, {
      method: 'POST',
      body: jsonBody({
        paid_at: paidAt.value,
        name: name.value,
        expected_revision: invoice.value.revision,
      }),
    })
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      await load()
      if (!invoice.value?.paid) error.value = e.message
    } else error.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}
watch(path, load, { immediate: true })
</script>

<template>
  <main class="recipient-page">
    <div class="recipient-brand">
      <AppIcon name="checks" :size="25" /><span>invoice<strong>keeper</strong></span>
    </div>
    <article class="recipient-sheet" :aria-busy="loading || submitting">
      <template v-if="invoice">
        <div class="recipient-status" :class="{ settled: invoice.paid }">
          <AppIcon :name="invoice.paid ? 'checks' : 'payments'" :size="20" />{{
            invoice.cancelled ? 'Счет отменен' : invoice.paid ? 'Счет оплачен' : 'Счет к оплате'
          }}
        </div>
        <h1>{{ invoice.title }}</h1>
        <p class="recipient-amount">{{ money(invoice.amount, invoice.currency) }}</p>
        <dl class="recipient-details">
          <div>
            <dt>Срок оплаты</dt>
            <dd>{{ dateLabel(invoice.due_date) }}</dd>
          </div>
          <div v-if="invoice.paid && invoice.paid_at">
            <dt>Фактическая дата</dt>
            <dd>{{ dateLabel(invoice.paid_at) }}</dd>
          </div>
        </dl>
        <template v-if="invoice.cancelled"
          ><p class="recipient-note">
            Оплата этого счета недоступна. За уточнениями обратитесь к администратору.
          </p></template
        >
        <template v-else-if="invoice.paid">
          <p class="recipient-note" role="status">
            Оплата уже отмечена. Повторное подтверждение не требуется.
          </p>
          <a
            v-if="invoice.has_receipt"
            class="button recipient-submit"
            :href="`/api/v1${path}/receipt`"
            download
            ><AppIcon name="download" :size="19" />Скачать демонстрационный чек</a
          >
        </template>
        <form v-else @submit.prevent="confirm">
          <p v-if="invoice.due_date < invoice.today" class="recipient-note">
            Срок оплаты прошел. Если счет уже оплачен, укажите фактическую дату — просрочка
            пересчитается.
          </p>
          <label class="recipient-field"
            >Дата оплаты<input
              v-model="paidAt"
              type="date"
              required
              min="2000-01-01"
              :max="invoice.today"
              :disabled="submitting"
          /></label>
          <label class="recipient-field"
            >Ваше имя <span>необязательно</span
            ><input
              v-model="name"
              autocomplete="name"
              maxlength="80"
              placeholder="Как к вам обращаться"
              :disabled="submitting"
          /></label>
          <p class="recipient-demo">
            Это имитация оплаты. Деньги не спишутся. После подтверждения счет будет отмечен
            оплаченным, а вы получите демонстрационный чек.
          </p>
          <button class="button recipient-submit" :disabled="submitting">
            {{ submitting ? 'Сохраняем оплату…' : 'Подтвердить оплату'
            }}<AppIcon name="arrow" :size="19" />
          </button>
        </form>
      </template>
      <p v-else-if="loading" role="status">Загружаем счет…</p>
      <template v-else
        ><h1>Не удалось открыть счет</h1>
        <p class="recipient-note">
          Проверьте ссылку из письма или запросите новое уведомление у администратора.
        </p></template
      >
      <div v-if="error" class="error-box" role="alert">
        {{ error
        }}<button v-if="!invoice" class="button secondary" @click="load">Попробовать снова</button>
      </div>
    </article>
    <p class="recipient-footer">
      Ссылка открывает только этот счет.<br />Храните ее у себя: по ней можно подтвердить оплату и
      скачать чек.
    </p>
  </main>
</template>

<style scoped>
.recipient-page {
  min-height: 100dvh;
  background: #faf7f3;
  padding: 44px 20px;
  color: #202020;
}
.recipient-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 28px;
  font-size: 23px;
  letter-spacing: -0.025em;
}
.recipient-brand svg {
  color: #a74700;
}
.recipient-brand strong {
  font-weight: 400;
  color: #615d58;
}
.recipient-sheet {
  max-width: 540px;
  margin: auto;
  padding: 36px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgb(74 43 17 / 7%);
}
.recipient-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #914200;
  font-size: 14px;
  font-weight: 600;
}
.recipient-status.settled {
  color: #256343;
}
h1 {
  font-size: 27px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  margin: 18px 0;
  overflow-wrap: anywhere;
}
.recipient-amount {
  font-size: clamp(28px, 7vw, 40px);
  font-weight: 600;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 26px;
}
.recipient-details {
  margin: 0 0 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid #ebe7e1;
}
.recipient-details div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
  font-size: 14px;
}
dt {
  color: #67615a;
}
dd {
  margin: 0;
  font-weight: 600;
}
.recipient-note {
  font-size: 14px;
  line-height: 1.6;
  background: #fff0e2;
  color: #774014;
  border-radius: 12px;
  padding: 16px;
  margin: 0 0 24px;
}
.recipient-field {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
}
.recipient-field span {
  font-weight: 400;
  color: #70695f;
  margin-left: 6px;
}
.recipient-field input {
  display: block;
  width: 100%;
  margin-top: 8px;
  min-height: 48px;
  background: #fff;
  caret-color: #914200;
}
.recipient-demo {
  font-size: 13px;
  line-height: 1.6;
  color: #67615a;
  margin: 26px 0 20px;
}
.recipient-submit {
  width: 100%;
  min-height: 50px;
  background: #ff8000;
  color: #202020;
  justify-content: center;
  font-weight: 600;
  font-size: 15px;
}
.recipient-submit:hover {
  background: #ec7600;
  color: #202020;
}
.recipient-footer {
  text-align: center;
  max-width: 480px;
  margin: 24px auto 0;
  color: #71685e;
  font-size: 12px;
  line-height: 1.7;
}
.error-box {
  margin-top: 20px;
}
.error-box button {
  margin-top: 12px;
}
@media (max-width: 500px) {
  .recipient-page {
    padding: 28px 14px;
  }
  .recipient-sheet {
    padding: 26px 22px;
  }
  h1 {
    font-size: 24px;
  }
}
</style>
