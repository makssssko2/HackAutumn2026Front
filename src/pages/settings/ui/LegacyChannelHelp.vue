<template>
  <details class="panel telegram-setup-guide">
    <summary>Как подключить Telegram-бота</summary>
    <ol>
      <li>Создайте бота через @BotFather командой /newbot и скопируйте выданный токен.</li>
      <li>
        На сервере откройте <code>Back/.env</code> и заполните
        <code>TELEGRAM_BOT_TOKEN=ваш_токен</code>.
      </li>
      <li>
        Из папки Back запустите:
        <pre><code>docker compose --profile telegram up -d --build --force-recreate api worker bot</code></pre>
      </li>
      <li>Здесь нажмите «Добавить канал», выберите Telegram и задайте название группы.</li>
      <li>
        Нажмите «Подключить чат» → «Выбрать группу в Telegram». Выберите группу, где вы
        администратор, и подтвердите добавление бота. Код передается автоматически, вводить команды
        не нужно. Боту должна быть разрешена отправка сообщений и файлов.
      </li>
      <li>
        Нажмите «Обновить», затем «Тест». После привязки выставляйте новые счета — бот отправит их в
        группу.
      </li>
    </ol>
    <p class="field-help">
      Участники нажимают «Оплатить» прямо в сообщении. Вход в веб-панель им не нужен.
    </p>
  </details>
  <details class="panel telegram-setup-guide">
    <summary>Как настроить отправку писем</summary>
    <p>
      Приложение на VPS отправляет письма через почтовый ящик. Отдельный почтовый сервер на VPS не
      нужен.
    </p>
    <ol>
      <li>
        Заведите ящик для уведомлений, например в Яндекс.Почте. В настройках разрешите доступ
        почтовым программам и создайте пароль приложения для Почты.
      </li>
      <li>
        В Back/.env укажите параметры отправителя. Пример для Яндекс.Почты — замените имя ящика и
        пароль на свои:
        <pre><code>SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SSL=true
SMTP_STARTTLS=false
SMTP_USERNAME=имя_ящика
SMTP_PASSWORD=пароль_приложения
SMTP_FROM=имя_ящика@yandex.ru</code></pre>
      </li>
      <li>
        Из папки Back выполните <code>docker compose up -d --force-recreate api worker</code>.
      </li>
      <li>
        Нажмите «Добавить канал» → «Email через SMTP», укажите адрес получателя и сохраните. Затем
        нажмите «Тест» и проверьте журнал рассылок.
      </li>
    </ol>
    <p class="field-help">
      Пароль хранится только в Back/.env. Для другого почтового сервиса используйте его настройки
      SMTP. Поддерживаются SSL на порту 465 и STARTTLS на порту 587.
    </p>
  </details>
</template>
