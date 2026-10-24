<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '@/entities/session'
import { AppIcon } from '@/shared/ui'

const session = useSession()
const router = useRouter()
const name = ref(session.user?.name || '')
const savingName = ref(false)
const nameError = ref('')
const nameMessage = ref('')
const changingPassword = ref(false)
const passwordError = ref('')
const showPasswords = ref(false)
const passwords = reactive({ current: '', next: '', repeat: '' })
const roleLabel = computed(() => (session.isAdmin ? 'Администратор' : 'Пользователь'))
const initials = computed(() =>
  (session.user?.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(),
)
const nameChanged = computed(() => name.value.trim() !== session.user?.name)

watch(
  () => session.user?.name,
  (value, previous) => {
    if (value && name.value === previous) name.value = value
  },
)
watch(
  name,
  () => {
    nameMessage.value = ''
    nameError.value = ''
  },
  { flush: 'sync' },
)
watch(passwords, () => {
  passwordError.value = ''
})

async function saveName() {
  if (savingName.value) return
  nameError.value = ''
  nameMessage.value = ''
  if (!name.value.trim()) {
    nameError.value = 'Укажите имя'
    return
  }
  savingName.value = true
  try {
    await session.updateProfile(name.value.trim())
    name.value = session.user?.name || ''
    nameMessage.value = 'Имя сохранено'
  } catch (error) {
    nameError.value = (error as Error).message
  } finally {
    savingName.value = false
  }
}

async function changePassword() {
  if (changingPassword.value) return
  passwordError.value = ''
  if (passwords.next !== passwords.repeat) {
    passwordError.value = 'Новые пароли не совпадают'
    return
  }
  if (passwords.current === passwords.next) {
    passwordError.value = 'Новый пароль должен отличаться от текущего'
    return
  }
  changingPassword.value = true
  try {
    await session.changePassword(passwords.current, passwords.next)
    passwords.current = passwords.next = passwords.repeat = ''
    await router.replace({ path: '/login', query: { password_changed: '1' } })
  } catch (error) {
    passwordError.value = (error as Error).message
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>Мой профиль</h1>
      <p>Ваши данные и безопасность учётной записи.</p>
    </div>
  </div>
  <div class="profile-layout">
    <aside class="profile-overview" aria-label="Учётная запись">
      <div class="profile-identity">
        <span class="profile-avatar" aria-hidden="true">{{ initials }}</span>
        <div>
          <h2>{{ session.user?.name }}</h2>
          <p class="muted">{{ roleLabel }}</p>
        </div>
      </div>
      <dl class="profile-facts">
        <div>
          <dt>Логин</dt>
          <dd>{{ session.user?.login }}</dd>
        </div>
        <div>
          <dt>Роль</dt>
          <dd>{{ roleLabel }}</dd>
        </div>
        <div>
          <dt>Состояние</dt>
          <dd><span class="status paid">Активен</span></dd>
        </div>
      </dl>
      <p class="field-help">Логин и роль закреплены за вашей учётной записью.</p>
      <div class="profile-access-note">
        <AppIcon name="shield" :size="20" />
        <p>
          {{
            session.isAdmin
              ? 'Вы управляете счетами, пользователями и каналами рассылки.'
              : 'Вы можете просматривать счета, отмечать оплату и работать с документами.'
          }}
        </p>
      </div>
    </aside>

    <div class="profile-forms">
      <form class="panel profile-form" :aria-busy="savingName" @submit.prevent="saveName">
        <div class="profile-section-heading">
          <AppIcon name="profile" :size="21" />
          <div>
            <h2>Личные данные</h2>
            <p class="muted">Так ваше имя отображается в приложении.</p>
          </div>
        </div>
        <label for="profile-name"
          >Имя
          <input
            id="profile-name"
            v-model="name"
            name="name"
            autocomplete="name"
            required
            maxlength="120"
            :disabled="savingName || changingPassword"
          />
        </label>
        <p v-if="nameError" class="error-text" role="alert">{{ nameError }}</p>
        <p v-if="nameMessage" class="profile-success" role="status">{{ nameMessage }}</p>
        <div class="form-actions">
          <button class="button" :disabled="savingName || changingPassword || !nameChanged">
            {{ savingName ? 'Сохраняем…' : 'Сохранить имя' }}
          </button>
        </div>
      </form>

      <form
        class="panel profile-form"
        :aria-busy="changingPassword"
        @submit.prevent="changePassword"
      >
        <div class="profile-section-heading">
          <AppIcon name="password" :size="21" />
          <div>
            <h2>Смена пароля</h2>
            <p class="muted">Для изменения понадобится текущий пароль.</p>
          </div>
        </div>
        <input
          class="profile-username"
          :value="session.user?.login"
          name="username"
          autocomplete="username"
          readonly
          tabindex="-1"
          aria-hidden="true"
        />
        <label for="profile-current-password"
          >Текущий пароль
          <input
            id="profile-current-password"
            v-model="passwords.current"
            name="current-password"
            :type="showPasswords ? 'text' : 'password'"
            autocomplete="current-password"
            required
            maxlength="200"
            :disabled="changingPassword || savingName"
          />
        </label>
        <div class="profile-password-grid">
          <label for="profile-new-password"
            >Новый пароль
            <input
              id="profile-new-password"
              v-model="passwords.next"
              name="new-password"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="200"
              :disabled="changingPassword || savingName"
              aria-describedby="profile-password-help"
            />
          </label>
          <label for="profile-repeat-password"
            >Повторите новый пароль
            <input
              id="profile-repeat-password"
              v-model="passwords.repeat"
              name="repeat-password"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="200"
              :disabled="changingPassword || savingName"
            />
          </label>
        </div>
        <p id="profile-password-help" class="field-help">
          От 8 до 200 символов. Используйте пароль, который вы не применяете в других сервисах.
        </p>
        <label class="profile-password-visibility">
          <input v-model="showPasswords" type="checkbox" :disabled="changingPassword" />Показать
          пароли
        </label>
        <p class="profile-session-note">
          После смены пароля все сеансы будут завершены, включая текущий. Нужно будет войти снова.
        </p>
        <p v-if="passwordError" class="error-text" role="alert">{{ passwordError }}</p>
        <div class="form-actions">
          <button class="button secondary" :disabled="changingPassword || savingName">
            {{ changingPassword ? 'Меняем пароль…' : 'Изменить пароль' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 680px);
  gap: 48px;
  align-items: start;
}
.profile-overview {
  padding: 8px 0;
}
.profile-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.profile-avatar {
  width: 56px;
  height: 56px;
  flex: none;
  display: grid;
  place-items: center;
  background: var(--accent-pale);
  color: var(--accent-ink);
  border-radius: 50%;
  font-size: 19px;
  font-weight: 650;
}
.profile-identity h2 {
  margin: 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}
.profile-identity p {
  margin: 5px 0 0;
}
.profile-facts {
  margin: 0;
  padding: 20px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.profile-facts > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 8px 0;
}
.profile-facts dt {
  color: var(--muted);
}
.profile-facts dd {
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
  min-width: 0;
}
.profile-access-note {
  display: flex;
  gap: 10px;
  color: var(--muted);
  margin-top: 28px;
  line-height: 1.6;
  font-size: var(--text-secondary);
}
.profile-access-note svg {
  flex: none;
  margin-top: 2px;
}
.profile-access-note p {
  margin: 0;
}
.profile-forms {
  display: grid;
  gap: 24px;
  min-width: 0;
}
.profile-form {
  padding: 28px;
}
.profile-section-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 26px;
}
.profile-section-heading svg {
  color: var(--accent-ink);
  flex: none;
  margin-top: 2px;
}
.profile-section-heading h2 {
  font-size: 18px;
  margin: 0;
}
.profile-section-heading p {
  margin: 6px 0 0;
  line-height: 1.5;
}
.profile-form label {
  display: grid;
  gap: 8px;
  font-weight: 550;
}
.profile-password-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
.profile-form .profile-password-visibility {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 9px;
  margin: 18px 0;
  font-weight: 400;
}
.profile-session-note {
  color: var(--muted);
  background: var(--ground);
  padding: 14px 16px;
  border-radius: 9px;
  font-size: var(--text-secondary);
  line-height: 1.6;
}
.profile-success {
  color: var(--success);
}
.profile-username {
  position: absolute;
  width: 1px;
  height: 1px;
  min-height: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 1150px) {
  .profile-layout {
    gap: 28px;
    grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
  }
  .profile-password-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .profile-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .profile-form {
    padding: 22px;
  }
  .profile-overview {
    padding: 0;
  }
  .profile-access-note {
    margin-top: 18px;
  }
}
</style>
