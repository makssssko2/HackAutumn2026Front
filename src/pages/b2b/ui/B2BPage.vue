<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { invoiceStatus, type IncomingInvoice } from '@/entities/b2b'
import { usePagedList, money, dateLabel } from '@/shared/lib'
import { AppIcon, AsyncState, EmptyState, Pagination } from '@/shared/ui'
import B2BPartnersPanel from './B2BPartnersPanel.vue'

const tab = ref('invoices')
const q = ref(''),
  environment = ref('live'),
  paymentStatus = ref('')
const { rows, total, page, pageSize, loading, error, reload } = usePagedList<IncomingInvoice>(
  '/incoming-invoices',
  () => ({ q: q.value, environment: environment.value, payment_status: paymentStatus.value }),
  { debounce: 250 },
)
</script>

<template>
  <div class="b2b-page">
    <header class="page-heading">
      <div>
        <h1>B2B · Входящие счета</h1>
        <p>Счета поставщиков поступают через API и сразу доступны в реестре.</p>
      </div>
      <button class="button secondary" :disabled="loading" @click="reload">
        <AppIcon name="recurring" :size="17" />Обновить
      </button>
    </header>
    <div class="b2b-tabs" aria-label="Разделы B2B">
      <button
        class="button"
        :class="{ secondary: tab !== 'invoices' }"
        :aria-pressed="tab === 'invoices'"
        @click="tab = 'invoices'"
      >
        Входящие счета
      </button>
      <button
        class="button"
        :class="{ secondary: tab !== 'partners' }"
        :aria-pressed="tab === 'partners'"
        @click="tab = 'partners'"
      >
        Партнёры и доступ
      </button>
    </div>
    <B2BPartnersPanel v-if="tab === 'partners'" />
    <template v-else>
      <div class="b2b-note">
        <AppIcon name="checks" />
        <p>
          Подтверждение администратора не требуется. Поставщик передаёт данные счёта одним
          JSON-запросом. Здесь вы просматриваете реквизиты и отмечаете оплату.
        </p>
      </div>
      <section class="b2b-filters" aria-label="Фильтры входящих счетов">
        <label
          >Поиск<input v-model="q" type="search" placeholder="Номер, название или организация"
        /></label>
        <label
          >Среда<select v-model="environment">
            <option value="live">Рабочая</option>
            <option value="test">Тестовая</option>
            <option value="">Все среды</option>
          </select></label
        >
        <label
          >Оплата<select v-model="paymentStatus">
            <option value="">Все счета</option>
            <option value="unpaid">Не оплачены</option>
            <option value="paid">Оплачены</option>
          </select></label
        >
      </section>
      <AsyncState
        :loading="loading"
        :error="error === 'Not Found' ? 'Раздел B2B пока не включён на сервере.' : error"
        @retry="reload"
      >
        <div v-if="rows.length" class="panel b2b-registry">
          <RouterLink
            v-for="invoice in rows"
            :key="invoice.id"
            :to="`/b2b/invoices/${invoice.id}`"
            class="b2b-invoice-row"
          >
            <div class="b2b-invoice-main">
              <span class="b2b-eyebrow"
                >№ {{ invoice.number }} ·
                {{ invoice.environment === 'test' ? 'Тестовый' : 'Рабочий' }}</span
              >
              <h2>{{ invoice.title }}</h2>
              <p>
                {{ invoice.supplier_name }} <span aria-hidden="true">→</span>
                {{ invoice.buyer_name }}
              </p>
            </div>
            <div class="b2b-invoice-amount">
              <strong>{{ money(invoice.amount, invoice.currency) }}</strong
              ><span>До {{ dateLabel(invoice.due_date) }}</span>
            </div>
            <span class="b2b-status" :class="{ paid: invoice.payment_status === 'paid' }">{{
              invoiceStatus(invoice)
            }}</span>
            <AppIcon class="b2b-row-arrow" name="right" :size="18" />
          </RouterLink>
        </div>
        <EmptyState
          v-else
          title="Входящих счетов пока нет"
          description="Счета появятся автоматически после запроса поставщика. Проверьте выбранную среду и фильтры."
          icon="receipt"
        />
        <Pagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :loading="loading"
        />
      </AsyncState>
    </template>
  </div>
</template>

<style scoped>
.b2b-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.b2b-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  background: var(--accent-pale);
  border-radius: 14px;
  margin-bottom: 24px;
}
.b2b-note svg {
  flex: none;
  color: var(--accent-ink);
}
.b2b-note p {
  margin: 0;
  line-height: 1.65;
  max-width: 85ch;
}
.b2b-filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.b2b-filters label {
  min-width: 0;
}
.b2b-registry {
  padding: 0;
  overflow: hidden;
}
.b2b-invoice-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(130px, auto) minmax(100px, auto) 18px;
  gap: 24px;
  align-items: center;
  padding: 24px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
}
.b2b-invoice-row:last-child {
  border: 0;
}
.b2b-invoice-row:hover {
  background: var(--row-hover);
}
.b2b-invoice-main {
  min-width: 0;
}
.b2b-invoice-main h2 {
  font-size: 16px;
  margin: 6px 0;
  overflow-wrap: anywhere;
}
.b2b-invoice-main p {
  margin: 0;
  color: var(--muted);
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.b2b-eyebrow {
  font-size: 12px;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.b2b-invoice-amount {
  display: grid;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.b2b-invoice-amount strong {
  font-size: 16px;
}
.b2b-invoice-amount span {
  color: var(--muted);
  font-size: 12px;
}
.b2b-status {
  justify-self: start;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--surface-muted);
  font-size: 12px;
  line-height: 1.5;
}
.b2b-status.paid {
  color: var(--success);
  background: var(--success-pale);
}
@media (max-width: 1200px) {
  .b2b-invoice-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
  }
  .b2b-row-arrow {
    display: none;
  }
}
@media (max-width: 600px) {
  .b2b-filters {
    grid-template-columns: minmax(0, 1fr);
  }
  .b2b-invoice-row {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px;
    gap: 12px;
  }
  .b2b-invoice-amount {
    gap: 4px;
  }
  .b2b-note {
    padding: 16px;
  }
  .b2b-tabs .button {
    flex: 1 1 160px;
  }
}
</style>
