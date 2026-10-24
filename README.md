# Invoice Keeper — Front

Vue 3 + TypeScript + Vite. Independent local Git repository; Python API lives in the neighboring `Back` repository. UI language: Russian. Payments and generated receipts are explicitly demonstrational.

## Development

Requires Node.js 24 (or 22.18+) and the Back API on `http://127.0.0.1:8000`.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the backend, so session cookies remain HttpOnly and no token is stored in localStorage. `VITE_API_PROXY_TARGET` changes the API upstream. The backend origin allowlist must include the browser's origin.

Administrator: configured in Back/.env. The local example is `admin / change-me-before-use`. Active `user` and `admin` accounts can sign in. Participants can view invoices, schedules, calendar and budget, confirm/undo payment, correct its actual date, and work with receipts and attachments. Creating/managing payments, users, channels, groups, delivery logs and audit remains administrator-only. Telegram and private email links also work without a web account.

## Docker

Start `docker compose up -d --build` in Back first; it creates the `invoice-keeper_default` network and API service. Then in this repository:

```powershell
docker compose up -d --build
```

Open `http://localhost:8080`. The front image builds from the locked npm dependencies and serves static assets through Nginx; `/api` is proxied to the Back API. Deep links fall back to `index.html`. Repositories remain independent and communicate over HTTP / the explicit Docker network.

## Checks

```powershell
npm run check
npm run build
```

Checks include TypeScript (`vue-tsc`), meaningful date/currency/count tests, and FSD import boundaries. Production build uses lazy-loaded pages. `--configLoader native` avoids an unnecessary esbuild config bundle and requires the Node version above. Some npm 12 installations block lifecycle scripts by policy; esbuild's official installer can be run with `node node_modules/esbuild/install.js` if its platform binary is unavailable.

## Feature-Sliced Design

- `app`: startup, providers, router, application layout and global tokens/styles.
- `pages`: route-owned screens and their specific forms/data orchestration.
- `entities/payment`: occurrence/recurrence models, API and reusable payment/status views.
- `entities/session`: current account, session and account-level settings.
- `entities/channel`: channel types, independent activation/binding states and recipient selection.
- `shared`: HTTP transport, generic async helper, display utilities and presentation primitives.

Each domain slice exposes an `index.ts` public API. Dependencies point down the layers; slices on one layer do not import each other. Page-specific code stays in the page. Shared contains no payment domain logic. `scripts/check-fsd.mjs` verifies layer direction, slice isolation and public API usage, including relative imports.

The administrator issues recurring or one-time invoices with the persistent **Выставить счет** action. Both roles manage payment state in the selected invoice's detail: confirmation explicitly uses demo mode and the current revision. After a `409`, detail data is reloaded without replaying the mutation. Actual dates can be backdated, not future-dated; due dates stay unchanged. Canceling a one-time invoice is a separate administrator action available while unpaid. A one-time invoice has no other periods.

The isolated `/pay/:token` page works without login and cannot access other invoices or admin data. Opening it does not pay; explicit confirmation is required. It displays the description, actual payment date and demo receipt. Identity is refreshed on navigation and focus; direct administrator routes show an access-denied state for participants, while API authorization remains independently enforced by Back. **Подключения** includes sender SMTP setup and a Telegram group-selector button.

**Мой профиль** (`/profile`) is available to both roles through navigation and the identity link in the header. It shows login, role and account status; users can edit their own display name and change their password with current-password verification and repeated new-password entry. Login/role are read-only. A successful password change ends every session and returns to login with a confirmation message. Notification channels remain administrator-managed. Apply Back migration `0006` for administrator profile passwords to survive restarts; a changed `ADMIN_PASSWORD` remains the server recovery mechanism.

The public `/invoice/:token` route is a separate read-only invoice sheet. It sends no session cookies and shows the explicit public projection: full description, amount/currency, type, due date, state and actual-date/delay details. It has no payment, document or administrative actions. Manual refresh and focus/visibility return load current data; aborted/stale requests cannot replace another invoice. Network refresh errors identify stale content, and a persistent polite status region announces refresh/state changes without taking focus. Invalid/revoked links have a dedicated state. Nginx disables caching/indexing/referrers and omits access logs for these capability paths. Deploy Back migration `0007` and set its `PUBLIC_FRONTEND_URL`; enable its delivery flag only after this route is live.

## VK Teams and Mattermost

In administrator **Подключения**, save a bot/server connection, choose **Проверить бота**, then add a recipient chat using its string ID (VK Teams chat ID or Mattermost Channel ID). One bot can serve several channels. Connections and channels support editing and independent enable/disable actions; enabling or changing a connection requires API validation again. Tokens are sent to Back, are not returned by its connection API, and are not persisted in browser storage; leaving an existing token field empty preserves it. Groups and invoice creation display readiness warnings alongside channel activation.

API validation checks access to the bot API. Delivery, chat permissions and payment-button callbacks require a separate check in the target chat. **Тест** asks for confirmation because it queues an actual saved invoice with possible invoice data and demo-payment actions. Back selects the latest non-cancelled occurrence by due date; without one, create an invoice first. A queued result is not proof of delivery: inspect **Журнал рассылок** and then the message/buttons in the chat. Use a dedicated demo invoice and test chat when checking payment actions.

Back owns encrypted credential storage, the running worker and provider callbacks. Mattermost needs its server to reach the public HTTPS callback address and support the Blocks cards used by the adapter; the bot must have access to the target channel and file-upload permission for receipts. VK Teams event handling requires the backend worker. The frontend does not configure these server prerequisites. Follow the inline provider instructions and deploy the matching Back integration routes/schema. Existing Telegram, SMTP and ordinary outgoing webhook channels remain available.

Frontend verification uses API fixtures; live VK Teams/Mattermost delivery and button callbacks have not been verified with real credentials.

## Bitrix24 Chatbots 2.0

In administrator **Подключения**, choose Bitrix24, enter the portal origin (for example, `https://company.bitrix24.ru`) and put the full incoming webhook with `imbot` access into the separate password field. Choose **Сохранить и продолжить**, then **Проверить доступ**. Successful API validation sets `health_status=healthy`; it does not create a bot. Explicitly choose **Зарегистрировать бота** to register the bot and payment command. `setup_status=ready` and the visible bot ID identify completed registration. Add this bot to the target group chat, choose **Добавить чат**, and save its string Dialog ID, for example `chat123`. One connection can serve several chats.

The webhook is write-only: Back encrypts it and never returns it, and the frontend does not persist it in browser storage. Leaving the secret field empty preserves existing credentials. Back generates `bot_token`; the client neither supplies nor receives it. Replacing the webhook on the same portal preserves the generated bot token; validate access again after saving. For another portal, create a new connection so the current bot remains attached to its portal.

API health, bot registration and channel activation are separate facts. A healthy/registered connection does not prove delivery, chat permissions or working payment buttons. **Тест** uses the same explicit confirmation and saved-invoice queue described above: inspect **Журнал рассылок**, then check the message, demo-payment button and receipt in a test chat. An ordinary outgoing Webhook channel is separate from this integration.

Back's delivery worker sends messages; its separate `bitrix-events` service (`python -m app.bitrix24_runner`) fetches button events through Chatbots 2.0. Bitrix24 needs no public callback endpoint. Deploy the matching Back integration routes/schema, configure encrypted credential storage and run that event process; see `Back/docs/bitrix24-integration-guide.md`. Frontend verification used API fixtures and backend mock tests. Live portal credentials were unavailable, so actual Bitrix24 delivery, button actions and receipts have not been verified.

## Screens

Shared overview, invoices with type/status/currency/date filters, invoice detail, recurring schedules, calendar and monthly/yearly currency budget. Administrator-only creation, delivery journal, users, recipient groups, channel connections and audit. Descriptions appear in invoice lists/details, delivery entries and the public email invoice; empty descriptions do not create an empty block.

Requires Back migration **0005** and the API in `Back/docs/frontend-guide.md`. Future periods for budgets do not imply notifications have been released. One-time invoices due beyond three days are saved without immediate delivery. An eligible unpaid invoice exposes a manual reminder action for the administrator; it calls `/notifications/occurrences/:id/remind`, distinct from retrying an existing delivery. Existing reminders are not duplicated; uncertain delivery requires checking the channel before an explicit retry. Recurring templates remain separate from one-time invoices.

Invoice creation explicitly selects all active channels or selected groups, with a deduplicated recipient preview. An enabled Telegram channel may be unbound; activation and chat readiness are displayed separately. The preview describes recipients for a new invoice; delivery results remain authoritative in the journal. Mobile invoices, recurrences, users and audit records use readable lists. The mobile navigation traps keyboard focus while open and supports Escape and focus restoration.

All growing record lists request server pages: overview and invoice ledgers, recurrences, users, groups, channels, bot connections, both journals, calendar-day invoices, and invoice periods/history/documents/receipts. Requests send `page` and `page_size` and consume `{items,total,page,page_size}`; pages start at 12 rows except the overview (8) and invoice history/receipts (6), with selectable sizes. Search, filters and date sorting apply before pagination on Back. Filter/size changes return to page one; abort/version guards reject stale responses, and deleting the last record recovers to a valid page. Complete recipient selectors load bounded 100-row lookup pages. Calendar cells use server aggregates for the entire visible date range; the annual budget remains a fixed twelve-month aggregate report. See `Back/docs/pagination-guide.md` for the API contract. Deploy Back before or together with Front.

The main invoice list sorts the complete server result by due date or actual payment date. Clicking a date header toggles direction; empty actual dates stay last in either order. The selection survives filter reloads. Mobile lists expose the same choices in a labelled select. Sorted headers use `aria-sort` and native keyboard-operable buttons. Shared pagination keeps its 44px arrows horizontal in both themes; channel rows use consistent action columns and stack at smaller widths.

## Design

`PRODUCT.md` records confirmed requirements. `DESIGN.md` records the visual system. Current user-provided Aeza screenshots define orange, pale peach, white and graphite. Impeccable's Operate guidance informs hierarchy, restrained decoration, keyboard focus, responsive structure and explicit state feedback. Invoice Keeper retains its own identity.

The sun/moon button in the header switches light and dark themes; it is also available before login and on public invoice pages. The first visit follows the system color scheme. An explicit choice is saved locally and synchronized across tabs. `public/theme-init.js` applies it before the app renders, while shared semantic CSS tokens cover forms, tables, calendar, budget charts and payment states in both themes.

GitHub: https://github.com/makssssko2/HackAutumn2026Front. Deployment: https://aezainvoice.xxxmgxxx.com. Environment files remain ignored.
