<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { paymentApi, type Occurrence } from '@/entities/payment'
import { money } from '@/shared/lib'
import { AppIcon } from '@/shared/ui'
const props = defineProps<{ payment: Occurrence | null }>()
const emit = defineEmits<{ close: []; confirmed: [] }>()
const dialog = ref<HTMLDialogElement>()
const busy = ref(false)
const error = ref('')
watch(
  () => props.payment,
  async (value) => {
    error.value = ''
    await nextTick()
    if (value) dialog.value?.showModal()
    else dialog.value?.close()
  },
)
async function confirm() {
  if (!props.payment) return
  busy.value = true
  error.value = ''
  try {
    await paymentApi.update(props.payment.id, {
      paid: true,
      demo: true,
      expected_revision: props.payment.revision,
    })
    emit('confirmed')
    emit('close')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    @cancel="emit('close')"
    @click="
      (event) => {
        if (event.target === dialog && !busy) emit('close')
      }
    "
  >
    <template v-if="payment"
      ><div class="dialog-top">
        <span class="dialog-symbol"><AppIcon name="receipt" :size="26" /></span
        ><button class="icon-button" aria-label="Закрыть" :disabled="busy" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </div>
      <h2>Подтвердить оплату</h2>
      <p class="muted">{{ payment.title }}</p>
      <div class="confirm-amount">{{ money(payment.amount, payment.currency) }}</div>
      <p class="muted">
        Это демонстрационная оплата. Деньги не списываются. Счет будет отмечен оплаченным, а чек
        сохранится в его карточке.
      </p>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button class="button secondary" :disabled="busy" @click="emit('close')">Отмена</button
        ><button class="button" :disabled="busy" @click="confirm">
          <AppIcon :name="busy ? 'loading' : 'check'" :class="{ spin: busy }" :size="18" />{{
            busy ? 'Подтверждаем…' : 'Подтвердить оплату'
          }}
        </button>
      </div></template
    >
  </dialog>
</template>
