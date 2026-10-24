<script setup lang="ts">
defineProps<{ provider?: string }>()
</script>
<template>
  <details v-if="!provider || provider === 'vk_teams'" class="integration-help">
    <summary>Как подключить VK Teams</summary>
    <ol>
      <li>
        В VK Teams своей организации найдите Метабота, создайте бота командой <code>/newbot</code> и
        сохраните токен.
      </li>
      <li>
        Укажите адрес Bot API вашего окружения и токен в форме подключения. Для облака:
        <code>https://myteam.mail.ru/bot/v1</code>. Для корпоративной установки адрес уточните у её
        администратора.
      </li>
      <li>
        Сохраните подключение и нажмите «Проверить бота». Токен хранится на сервере и не
        возвращается в интерфейс.
      </li>
      <li>
        Добавьте бота в групповой чат. Получите ID чата у администратора VK Teams: это строка, она
        может содержать <code>@chat.agent</code>.
      </li>
      <li>
        Нажмите «Добавить чат», укажите его ID и сохраните канал. Один бот может обслуживать
        несколько чатов.
      </li>
      <li>
        Отправьте тест и проверьте журнал рассылок. Для проверки оплаты используйте отдельный
        демонстрационный счёт в тестовом чате.
      </li>
    </ol>
    <p>
      События нажатий получает фоновый процесс приложения. Если бот не отвечает, проверьте токен,
      адрес API, права в чате и работу фонового процесса.
    </p>
    <a href="https://teams.vk.com/botapi/" target="_blank" rel="noopener noreferrer"
      >Официальная документация VK Teams</a
    >
  </details>
  <details v-if="!provider || provider === 'mattermost'" class="integration-help">
    <summary>Как подключить Mattermost</summary>
    <ol>
      <li>
        В Mattermost откройте <strong>Integrations → Bot Accounts</strong> и создайте бота. Если
        раздел недоступен, обратитесь к администратору Mattermost.
      </li>
      <li>
        Скопируйте <strong>Access Token</strong>, а не Token ID. Для этого подключения нужен бот, не
        incoming webhook.
      </li>
      <li>
        Добавьте бота в нужную команду и канал. Для закрытого канала разрешите ему доступ; для
        выдачи чека — отправку файлов.
      </li>
      <li>
        В Invoice Keeper укажите HTTPS-адрес Mattermost без <code>/api/v4</code> и access token.
        Сохраните и проверьте бота.
      </li>
      <li>
        Нажмите «Добавить чат» и укажите Channel ID из сведений о канале либо получите его у
        администратора.
      </li>
      <li>
        Отправьте тест, затем проверьте журнал рассылок и отображение кнопки в Mattermost. API бота
        и работа кнопок проверяются отдельно.
      </li>
    </ol>
    <p>
      Для кнопок серверу Mattermost нужен доступ к публичному HTTPS-адресу Invoice Keeper. Поддержка
      карточек Mattermost Blocks должна быть включена на сервере. Если сообщение пришло, а кнопка не
      работает, проверьте эти настройки у администратора.
    </p>
    <a
      href="https://docs.mattermost.com/developers/integrate/reference/bot-accounts"
      target="_blank"
      rel="noopener noreferrer"
      >Официальная инструкция Mattermost</a
    >
  </details>
</template>
<style scoped>
.integration-help {
  padding: 16px 0;
  border-top: 1px solid var(--line);
}
summary {
  font-weight: 600;
  cursor: pointer;
}
ol {
  padding-left: 21px;
  margin: 15px 0;
  max-width: 74ch;
}
li + li {
  margin-top: 10px;
}
p {
  margin: 14px 0;
  color: var(--muted);
  max-width: 74ch;
}
code {
  overflow-wrap: anywhere;
}
</style>
