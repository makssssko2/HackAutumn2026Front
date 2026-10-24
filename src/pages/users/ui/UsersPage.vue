<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { SessionUser } from '@/entities/session'
import { api, jsonBody } from '@/shared/api'
import { useAsyncData } from '@/shared/lib'
import { AppIcon, AsyncState } from '@/shared/ui'
const { data, loading, error, reload } = useAsyncData(() => api<SessionUser[]>('/users'), [])
const editing = ref<string | null>(null),
  showForm = ref(false),
  busy = ref(false),
  operationError = ref('')
const form = reactive({ login: '', name: '', password: '' })
function open(user?: SessionUser) {
  editing.value = user?.id || null
  form.login = user?.login || ''
  form.name = user?.name || ''
  form.password = ''
  operationError.value = ''
  showForm.value = true
}
async function submit() {
  busy.value = true
  operationError.value = ''
  try {
    await api(editing.value ? `/users/${editing.value}` : '/users', {
      method: editing.value ? 'PATCH' : 'POST',
      body: jsonBody(
        editing.value
          ? { name: form.name, ...(form.password ? { password: form.password } : {}) }
          : form,
      ),
    })
    showForm.value = false
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
async function remove(user: SessionUser) {
  if (
    !window.confirm(
      `Удалить пользователя «${user.name}»? Его сессии будут завершены, история действий сохранится.`,
    )
  )
    return
  operationError.value = ''
  try {
    await api(`/users/${user.id}`, { method: 'DELETE' })
    await reload()
  } catch (e) {
    operationError.value = (e as Error).message
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Пользователи</h1>
      <p>
        Участники входят в веб-приложение, просматривают счета и подтверждают оплату. Управление
        пользователями, платежами и рассылкой доступно только администратору.
      </p>
    </div>
    <button class="button" @click="open()">
      <AppIcon name="plus" :size="18" />Добавить пользователя
    </button>
  </div>
  <form v-if="showForm" class="panel form-panel compact-form" @submit.prevent="submit">
    <div class="section-heading">
      <h2>{{ editing ? 'Изменить пользователя' : 'Новый пользователь' }}</h2>
      <button
        type="button"
        class="icon-button"
        aria-label="Закрыть форму"
        @click="showForm = false"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <div class="form-grid">
      <label>Имя<input v-model="form.name" required maxlength="120" /></label
      ><label
        >Логин<input
          v-model="form.login"
          required
          minlength="3"
          pattern="[a-zA-Z0-9_.@\-]+"
          :disabled="!!editing"
          autocomplete="off" /></label
      ><label
        >{{ editing ? 'Новый пароль (необязательно)' : 'Пароль'
        }}<input
          v-model="form.password"
          type="password"
          minlength="8"
          :required="!editing"
          autocomplete="new-password"
      /></label>
    </div>
    <p class="field-help">
      Запись участника не дает доступа в админку. Участники подтверждают оплату и получают чек из
      уведомлений.
    </p>
    <p v-if="operationError" class="error-text" role="alert">{{ operationError }}</p>
    <div class="form-actions">
      <button class="button" :disabled="busy">{{ busy ? 'Сохраняем…' : 'Сохранить' }}</button>
    </div>
  </form>
  <p v-if="operationError && !showForm" class="error-box" role="alert">{{ operationError }}</p>
  <AsyncState :loading="loading" :error="error" @retry="reload"
    ><ul class="mobile-record-list panel">
      <li v-for="user in data" :key="user.id">
        <div class="record-heading">
          <strong>{{ user.name }}</strong
          ><span class="status" :class="user.active ? 'paid' : 'cancelled'">{{
            user.active ? 'Активен' : 'Отключен'
          }}</span>
        </div>
        <p class="muted">
          {{ user.login }} · {{ user.role === 'admin' ? 'Администратор' : 'Участник' }}
        </p>
        <p v-if="user.role === 'admin'" class="field-help">Имя и пароль — в своём профиле</p>
        <div v-else class="record-actions">
          <button class="button secondary" @click="open(user)">Изменить</button
          ><button
            class="icon-button danger-text"
            :aria-label="`Удалить ${user.name}`"
            @click="remove(user)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </li>
    </ul>
    <section class="panel table-scroll desktop-record-table">
      <table class="ledger">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Логин</th>
            <th>Роль</th>
            <th>Состояние</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data" :key="user.id">
            <td>
              <strong>{{ user.name }}</strong>
            </td>
            <td>{{ user.login }}</td>
            <td>{{ user.role === 'admin' ? 'Администратор' : 'Пользователь' }}</td>
            <td>
              <span class="status" :class="user.active ? 'paid' : 'cancelled'">{{
                user.active ? 'Активен' : 'Отключен'
              }}</span>
            </td>
            <td class="row-action">
              <span v-if="user.role === 'admin'" class="muted">Имя и пароль — в своём профиле</span
              ><template v-else
                ><button class="text-button" @click="open(user)">Изменить</button
                ><button
                  class="icon-button danger-text"
                  :aria-label="`Удалить ${user.name}`"
                  @click="remove(user)"
                >
                  <AppIcon name="trash" :size="17" /></button
              ></template>
            </td>
          </tr>
        </tbody>
      </table></section
  ></AsyncState>
</template>
