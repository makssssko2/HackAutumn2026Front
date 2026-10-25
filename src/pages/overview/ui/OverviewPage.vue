<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { paymentApi, PaymentTable, type Occurrence, type Summary } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { AppIcon, AsyncState, Pagination } from '@/shared/ui'
import { readPage } from '@/shared/api'
import {
  currencies,
  dateISO,
  dateLabel,
  money,
  monthRange,
  useAsyncData,
  usePagedList,
  plural,
} from '@/shared/lib'
const session = useSession()
const currentDate = session.settings?.today || dateISO()
const month = ref(currentDate.slice(0, 7))
const tab = ref('all')
const { data, loading, error, reload } = useAsyncData(
  async (signal) => {
    const range = monthRange(month.value)
    const [summary, unpaid, paid, overdue, next] = await Promise.all([
      paymentApi.summary(monthRange(month.value), signal),
      readPage<Occurrence>(
        '/payment-occurrences',
        { ...range, status: 'unpaid', page_size: 1 },
        signal,
      ),
      readPage<Occurrence>(
        '/payment-occurrences',
        { ...range, status: 'paid', page_size: 1 },
        signal,
      ),
      readPage<Occurrence>('/payment-occurrences', { status: 'overdue', page_size: 1 }, signal),
      readPage<Occurrence>(
        '/payment-occurrences',
        {
          ...range,
          date_from: range.date_from! > currentDate ? range.date_from : currentDate,
          status: 'unpaid',
          page_size: 1,
        },
        signal,
      ),
    ])
    return {
      summary,
      unpaid: unpaid.total,
      paid: paid.total,
      overdue: overdue.total,
      next: next.items[0],
    }
  },
  {
    summary: null as Summary | null,
    unpaid: 0,
    paid: 0,
    overdue: 0,
    next: undefined as Occurrence | undefined,
  },
)
watch(month, reload)
const ledger = usePagedList<Occurrence>(
  '/payment-occurrences',
  () => ({ ...monthRange(month.value), status: tab.value === 'all' ? 'active' : tab.value }),
  { pageSize: 8 },
)
const next = computed(() => data.value.next)
const monthName = computed(() => dateLabel(`${month.value}-01`, { month: 'long', year: 'numeric' }))
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>{{ session.isAdmin ? 'Счета и оплаты' : 'Платежи команды' }}</h1>
      <p>
        {{
          session.isAdmin
            ? 'Выставляйте счета, проверяйте рассылку и управляйте оплатой каждого периода.'
            : 'Проверяйте сроки, подтверждайте оплату и храните документы в карточке счета.'
        }}
      </p>
    </div>
    <RouterLink v-if="session.isAdmin" to="/payments/new" class="button"
      ><AppIcon name="plus" :size="18" />Выставить счет</RouterLink
    >
  </div>
  <div class="overview-period">
    <span>Период обзора</span>
    <label class="month-control"
      ><AppIcon name="calendar" :size="17" /><input
        v-model="month"
        type="month"
        aria-label="Месяц обзора"
        required
    /></label>
  </div>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><div class="overview-content">
      <div class="attention-strip" :class="{ calm: !data.overdue }">
        <span class="attention-icon"
          ><AppIcon :name="data.overdue ? 'clock' : 'checks'" :size="20"
        /></span>
        <div>
          <strong>{{
            data.overdue
              ? `${data.overdue} ${plural(data.overdue, ['счет требует', 'счета требуют', 'счетов требуют'])} внимания`
              : 'Просроченных счетов нет'
          }}</strong>
          <p>
            {{
              data.overdue
                ? 'Срок оплаты уже прошел. Проверьте задолженность или уточните дату оплаты.'
                : 'Все в порядке. Следующие платежи появятся по расписанию.'
            }}
          </p>
        </div>
        <RouterLink :to="data.overdue ? '/payments?status=overdue' : '/calendar'"
          >{{ data.overdue ? 'Проверить счета' : 'В календарь' }}<AppIcon name="arrow" :size="17"
        /></RouterLink>
      </div>
      <section class="panel payment-panel">
        <div class="section-heading">
          <div>
            <h2>Счета за {{ monthName }}</h2>
            <p>
              {{ data.unpaid }}
              {{ plural(data.unpaid, ['счет ожидает', 'счета ожидают', 'счетов ожидают']) }}
              оплаты · оплачено {{ data.paid }}
            </p>
          </div>
          <RouterLink to="/payments" class="text-link"
            >Все счета<AppIcon name="arrow" :size="17"
          /></RouterLink>
        </div>
        <div class="tabs" role="group" aria-label="Статус счетов">
          <button
            v-for="[value, label] in [
              ['all', 'Все счета'],
              ['unpaid', 'К оплате'],
              ['paid', 'Оплаченные'],
            ]"
            :key="value"
            :class="{ selected: tab === value }"
            :aria-pressed="tab === value"
            @click="tab = value!"
          >
            {{ label }}
          </button>
        </div>
        <AsyncState
          :loading="ledger.loading.value"
          :error="ledger.error.value"
          @retry="ledger.reload"
          ><PaymentTable
            :payments="ledger.rows.value"
            compact
            :filtered="tab !== 'all'"
            @reset="tab = 'all'" /><Pagination
            v-model:page="ledger.page.value"
            v-model:page-size="ledger.pageSize.value"
            :total="ledger.total.value"
            :loading="ledger.loading.value"
            label="Страницы счетов обзора"
        /></AsyncState>
      </section>
      <section class="overview-summary">
        <div class="section-heading">
          <div>
            <h2>Расходы за месяц</h2>
            <p>{{ monthName }}</p>
          </div>
        </div>
        <div class="currency-summary">
          <div v-for="currency in currencies" :key="currency" class="currency-block">
            <div class="currency-label">
              <span>{{ currency }}</span
              ><span>Плановые расходы</span>
            </div>
            <strong>{{
              money(data.summary?.currencies[currency].planned || '0', currency)
            }}</strong>
            <div class="currency-breakdown">
              <span
                >Оплачено
                <b>{{ money(data.summary?.currencies[currency].paid || '0', currency) }}</b></span
              ><span
                >Осталось
                <b>{{ money(data.summary?.currencies[currency].unpaid || '0', currency) }}</b></span
              >
            </div>
          </div>
        </div>
        <div class="summary-foot">
          <span><AppIcon name="shield" :size="16" />Суммы по валютам учитываются отдельно</span
          ><RouterLink to="/budget">Открыть бюджет<AppIcon name="arrow" :size="16" /></RouterLink>
        </div>
      </section>
      <div class="overview-bottom">
        <section class="next-payment">
          <AppIcon name="calendar" :size="25" />
          <div>
            <h2>Ближайший платеж</h2>
            <template v-if="next"
              ><p>{{ next.title }}</p>
              <strong>{{ money(next.amount, next.currency) }}</strong
              ><span class="muted">до {{ dateLabel(next.due_date) }}</span></template
            >
            <p v-else class="muted">В выбранном месяце предстоящих счетов нет.</p>
          </div>
          <RouterLink
            :to="next ? `/payments/${next.id}` : '/calendar'"
            class="icon-button"
            aria-label="Открыть ближайший платеж"
            ><AppIcon name="external"
          /></RouterLink>
        </section>
        <section class="reminder-note">
          <AppIcon name="telegram" :size="25" />
          <div>
            <h2>Напоминания вовремя</h2>
            <p>
              За три дня до срока — в подключенных каналах. После оплаты напоминания прекращаются.
            </p>
            <RouterLink :to="session.isAdmin ? '/settings' : '/payments'" class="text-link"
              >{{ session.isAdmin ? 'Настроить подключения' : 'Перейти к счетам'
              }}<AppIcon name="arrow" :size="16"
            /></RouterLink>
          </div>
        </section>
      </div></div
  ></AsyncState>
</template>
