<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { paymentApi, PaymentTable, type Occurrence, type Summary } from '@/entities/payment'
import { useSession } from '@/entities/session'
import { AppIcon, AsyncState } from '@/shared/ui'
import {
  currencies,
  dateISO,
  dateLabel,
  money,
  monthRange,
  useAsyncData,
  plural,
} from '@/shared/lib'
const session = useSession()
const currentDate = session.settings?.today || dateISO()
const month = ref(currentDate.slice(0, 7))
const tab = ref('all')
const { data, loading, error, reload } = useAsyncData(
  async () => {
    const [summary, rows, overdue] = await Promise.all([
      paymentApi.summary(monthRange(month.value)),
      paymentApi.list(monthRange(month.value)),
      paymentApi.list({ status: 'overdue' }),
    ])
    return { summary, rows, overdue }
  },
  { summary: null as Summary | null, rows: [] as Occurrence[], overdue: [] as Occurrence[] },
)
watch(month, reload)
const unpaid = computed(() => data.value.rows.filter((p) => !p.paid && !p.cancelled))
const paid = computed(() => data.value.rows.filter((p) => p.paid))
const visible = computed(() =>
  data.value.rows
    .filter(
      (p) => !p.cancelled && (tab.value === 'all' || (tab.value === 'paid' ? p.paid : !p.paid)),
    )
    .slice(0, 8),
)
const next = computed(() => unpaid.value.find((p) => p.due_date >= currentDate))
const monthName = computed(() => dateLabel(`${month.value}-01`, { month: 'long', year: 'numeric' }))
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>{{ session.isAdmin ? 'Счета и оплаты' : 'Платежи команды' }}</h1>
      <p>
        {{
          session.isAdmin
            ? 'Выставляйте счета и отправляйте их получателям. Оплату участники подтверждают из уведомлений.'
            : 'Проверяйте сроки и историю. Подтвердить оплату можно в уведомлении о счете.'
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
      <div class="attention-strip" :class="{ calm: !data.overdue.length }">
        <span class="attention-icon"
          ><AppIcon :name="data.overdue.length ? 'clock' : 'checks'" :size="20"
        /></span>
        <div>
          <strong>{{
            data.overdue.length
              ? `${data.overdue.length} ${plural(data.overdue.length, ['счет требует', 'счета требуют', 'счетов требуют'])} внимания`
              : 'Просроченных счетов нет'
          }}</strong>
          <p>
            {{
              data.overdue.length
                ? 'Срок оплаты уже прошел. Проверьте задолженность или уточните дату оплаты.'
                : 'Все в порядке. Следующие платежи появятся по расписанию.'
            }}
          </p>
        </div>
        <RouterLink :to="data.overdue.length ? '/payments?status=overdue' : '/calendar'"
          >{{ data.overdue.length ? 'Проверить счета' : 'В календарь'
          }}<AppIcon name="arrow" :size="17"
        /></RouterLink>
      </div>
      <section class="panel payment-panel">
        <div class="section-heading">
          <div>
            <h2>Счета за {{ monthName }}</h2>
            <p>
              {{ unpaid.length }}
              {{ plural(unpaid.length, ['счет ожидает', 'счета ожидают', 'счетов ожидают']) }}
              оплаты · оплачено {{ paid.length }}
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
        <PaymentTable :payments="visible" compact :filtered="tab !== 'all'" @reset="tab = 'all'" />
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
            <RouterLink :to="session.isAdmin ? '/settings' : '/notifications'" class="text-link"
              >{{ session.isAdmin ? 'Настроить подключения' : 'Посмотреть уведомления'
              }}<AppIcon name="arrow" :size="16"
            /></RouterLink>
          </div>
        </section>
      </div></div
  ></AsyncState>
</template>
