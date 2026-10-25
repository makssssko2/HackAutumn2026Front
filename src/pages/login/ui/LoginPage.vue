<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSession } from '@/entities/session'
import { oidcApi, oidcLoginUrl } from '@/entities/oidc'
import { useAsyncData } from '@/shared/lib'
import { AppIcon } from '@/shared/ui'
const session = useSession()
const router = useRouter()
const route = useRoute()
const login = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const {
  data: provider,
  loading: providerLoading,
  error: providerError,
  reload: reloadProvider,
} = useAsyncData(oidcApi.publicProvider, { enabled: false, name: '' })
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
    </section>
    <section class="login-form-section">
      <form class="login-form" @submit.prevent="submit">
        <h2>С возвращением</h2>
        <p class="muted">Вход для администратора и участников команды.</p>
        <p v-if="route.query.password_changed === '1'" class="profile-login-success" role="status">
          Пароль изменён. Все сеансы завершены — войдите с новым паролем.
        </p>
        <p v-if="route.query.oidc_error === '1'" class="error-box" role="alert">
          Не удалось выполнить корпоративный вход. Повторите попытку или обратитесь к
          администратору.
        </p>
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
        <a
          v-if="provider.enabled && !providerError && !providerLoading"
          class="button secondary oidc-login"
          :href="oidcLoginUrl"
          ><span>Войти через компанию</span
          ><AppIcon name="shield" :size="18"
        /></a>
        <p v-if="providerLoading" class="field-help" role="status">Проверяем корпоративный вход…</p>
        <div v-else-if="providerError" class="field-help" role="status">
          Корпоративный вход временно недоступен.
          <button class="text-button" type="button" @click="reloadProvider">
            Повторить проверку
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.oidc-login {
  white-space: normal;
  & span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  & svg {
    flex: none;
  }
}
</style>
