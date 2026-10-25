<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { AppIcon, AsyncState } from '@/shared/ui'
import { useOidcSettings } from '../model/useOidcSettings'

const {
  data,
  loading,
  error,
  reload,
  form,
  busy,
  operationError,
  message,
  mustReload,
  save,
  test,
} = useOidcSettings()
const expanded = ref(false)
const errorElement = ref<HTMLElement | null>(null)
watch(operationError, async (value) => {
  if (value) {
    await nextTick()
    errorElement.value?.focus()
  }
})
watch(expanded, (value) => {
  if (!value) form.client_secret = ''
})
</script>

<template>
  <section class="oidc-settings" aria-labelledby="oidc-title">
    <div class="section-heading">
      <div>
        <h2 id="oidc-title">Корпоративный вход</h2>
        <p>Вход в рабочее пространство через Keycloak, Authentik или другой OIDC-провайдер.</p>
      </div>
      <div class="oidc-actions">
        <span
          v-if="data && !loading && !error"
          class="status"
          :class="data.enabled ? 'paid' : 'cancelled'"
          >{{ data.enabled ? 'Включён' : data.configured ? 'Выключен' : 'Не настроен' }}</span
        >
        <button
          class="button secondary"
          type="button"
          :disabled="!!busy || loading || !!error"
          :aria-expanded="expanded"
          aria-controls="oidc-settings-form"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Скрыть настройки' : 'Настроить вход' }}
        </button>
      </div>
    </div>
    <AsyncState :loading="loading" :error="error" @retry="reload">
      <form
        v-if="data && expanded"
        id="oidc-settings-form"
        class="panel form-panel oidc-form"
        :aria-busy="!!busy"
        @submit.prevent="save"
      >
        <p v-if="!data.configured" class="field-help">
          Корпоративный вход ещё не настроен. Добавьте приложение у провайдера и укажите его
          реквизиты.
        </p>
        <p v-if="!data.encryption_ready" class="error-box" role="alert">
          Защищённое хранение секретов не настроено на сервере. Обратитесь к администратору сервера
          перед сохранением.
        </p>
        <p v-if="!data.allowed_origins.length" class="error-box" role="alert">
          Серверу не разрешено подключаться к провайдерам OIDC. Администратор сервера должен
          добавить доверенные адреса.
        </p>
        <p v-if="operationError" ref="errorElement" class="error-box" role="alert" tabindex="-1">
          {{ operationError }}
        </p>
        <p v-if="message" class="success-box" role="status">{{ message }}</p>
        <fieldset :disabled="!!busy || mustReload">
          <legend class="oidc-legend">Подключение</legend>
          <div class="form-grid">
            <label
              >Название провайдера<input
                v-model="form.name"
                required
                maxlength="120"
                placeholder="Например, Keycloak"
            /></label>
            <label
              >Discovery URL<input
                v-model="form.discovery_url"
                type="url"
                required
                maxlength="2000"
                placeholder="https://sso.example.com/.well-known/openid-configuration"
                spellcheck="false"
            /></label>
            <label
              >Client ID<input
                v-model="form.client_id"
                required
                maxlength="255"
                autocomplete="off"
                spellcheck="false"
            /></label>
            <label
              >Client Secret<input
                v-model="form.client_secret"
                type="password"
                :required="!data.has_client_secret"
                autocomplete="new-password"
                :placeholder="
                  data.has_client_secret
                    ? 'Оставьте пустым, чтобы сохранить'
                    : 'Секрет приложения у провайдера'
                "
                aria-describedby="oidc-secret-help"
            /></label>
          </div>
          <p id="oidc-secret-help" class="field-help">
            Секрет хранится только на сервере и не возвращается в форму. Пустое поле сохраняет ранее
            заданное значение.
          </p>
          <div class="oidc-redirect">
            <strong>Redirect URI</strong>
            <p class="field-help">
              Скопируйте этот адрес в разрешённые адреса возврата приложения у провайдера.
            </p>
            <code class="oidc-uri">{{ data.redirect_uri }}</code>
          </div>
          <label
            >Длительность сеанса, минут<input
              v-model.number="form.session_minutes"
              type="number"
              min="5"
              max="1440"
              step="1"
              required
              aria-describedby="oidc-session-help"
          /></label>
          <p id="oidc-session-help" class="field-help">
            От 5 до 1440 минут. После истечения потребуется снова войти.
          </p>
          <label class="checkbox-label"
            ><input v-model="form.enabled" type="checkbox" />Включить корпоративный вход</label
          >
          <label class="checkbox-label"
            ><input
              v-model="form.auto_provision"
              type="checkbox"
              aria-describedby="oidc-provision-help"
            />Создавать участников при первом входе</label
          >
          <p id="oidc-provision-help" class="field-help">
            При включении новый корпоративный пользователь получает роль участника и доступ к счетам
            команды. Без этой настройки вход доступен только уже связанным учётным записям.
            Совпадение email или логина не связывает аккаунты.
          </p>
        </fieldset>
        <p class="field-help">
          Сохранение завершает корпоративные сеансы. Обычный вход по логину и паролю остаётся
          доступен. Выход из Invoice Keeper не завершает сеанс у провайдера.
        </p>
        <div class="form-actions">
          <button
            v-if="mustReload"
            class="button secondary"
            type="button"
            :disabled="!!busy"
            @click="reload"
          >
            Загрузить актуальные настройки
          </button>
          <button
            class="button secondary"
            type="button"
            :disabled="!!busy || !data.configured || mustReload"
            @click="test"
          >
            <AppIcon
              :name="busy === 'test' ? 'loading' : 'check'"
              :class="{ spin: busy === 'test' }"
              :size="18"
            />{{ busy === 'test' ? 'Проверяем…' : 'Проверить discovery' }}
          </button>
          <button
            class="button"
            type="submit"
            :disabled="!!busy || mustReload || !data.encryption_ready"
          >
            {{ busy === 'save' ? 'Сохраняем…' : 'Сохранить настройки' }}
          </button>
        </div>
        <p class="field-help">
          Проверка использует сохранённые настройки и проверяет discovery и ключи провайдера. Для
          проверки полного входа используйте кнопку на странице входа после сохранения.
        </p>
      </form>
    </AsyncState>
  </section>
</template>

<style scoped>
.oidc-settings {
  margin-bottom: 38px;
  & > .section-heading {
    flex-wrap: wrap;
    align-items: flex-start;
    margin-bottom: 24px;
  }
}
.oidc-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}
.oidc-form {
  & .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  & fieldset {
    min-width: 0;
  }
  & .section-heading,
  & .form-actions {
    flex-wrap: wrap;
  }
  & .button {
    white-space: normal;
  }
  & .success-box {
    overflow-wrap: anywhere;
  }
}
.oidc-legend {
  margin-bottom: 22px;
}
.oidc-redirect {
  margin-bottom: 22px;
}
.oidc-uri {
  overflow-wrap: anywhere;
  user-select: text;
  font-size: var(--text-secondary);
}
@media (max-width: 720px) {
  .oidc-form .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
