<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '@/entities/session'
import { AppIcon } from '@/shared/ui'
const session = useSession()
const router = useRouter()
const login = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await session.login(login.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <main class="login-layout">
    <section class="login-story">
      <div class="brand">
        <span class="brand-mark"><AppIcon name="checks" :size="26" /></span
        ><span>invoice<span class="brand-light">keeper</span></span>
      </div>
      <div class="login-message">
        <h1>
          У каждого платежа<br />{{ ' ' }}свое время.<br />{{ ' '
          }}<span>Держите его<br />{{ ' ' }}под контролем.</span>
        </h1>
        <p>
          Регулярные расходы, своевременные напоминания и история оплат в одном рабочем
          пространстве.
        </p>
        <div class="login-benefits">
          <span><AppIcon name="check" :size="18" />Отдельный счет для каждого периода</span
          ><span><AppIcon name="check" :size="18" />Напоминания в Telegram и других каналах</span
          ><span><AppIcon name="check" :size="18" />Прозрачная история для всей команды</span>
        </div>
      </div>
      <small>Invoice Keeper · демонстрационная версия</small>
    </section>
    <section class="login-form-section">
      <form class="login-form" @submit.prevent="submit">
        <h2>С возвращением</h2>
        <p class="muted">Вход для администратора и участников команды.</p>
        <label
          >Логин<input
            v-model="login"
            name="username"
            autocomplete="username"
            required
            autofocus
            placeholder="Ваш логин" /></label
        ><label
          >Пароль<input
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Введите пароль"
        /></label>
        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
        <button class="button" :disabled="busy">
          {{ busy ? 'Входим…' : 'Войти в пространство'
          }}<AppIcon :name="busy ? 'loading' : 'arrow'" :class="{ spin: busy }" :size="18" />
        </button>
        <p class="login-hint">
          Администратор выставляет счета, участники подтверждают оплату в карточке счета. Кнопки в
          Telegram и email работают и без веб-аккаунта.
        </p>
      </form>
    </section>
  </main>
</template>
