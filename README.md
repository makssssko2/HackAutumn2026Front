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

## Screens

Shared overview, invoices with type/status/currency/date filters, invoice detail, recurring schedules, calendar and monthly/yearly currency budget. Administrator-only creation, delivery journal, users, recipient groups, channel connections and audit. Descriptions appear in invoice lists/details, delivery entries and the public email invoice; empty descriptions do not create an empty block.

Requires Back migration **0005** and the API in `Back/docs/frontend-guide.md`. Future periods for budgets do not imply notifications have been released. One-time invoices due beyond three days are saved without immediate delivery. An eligible unpaid invoice exposes a manual reminder action for the administrator; it calls `/notifications/occurrences/:id/remind`, distinct from retrying an existing delivery. Existing reminders are not duplicated; uncertain delivery requires checking the channel before an explicit retry. Recurring templates remain separate from one-time invoices.

Invoice creation explicitly selects all active channels or selected groups, with a deduplicated recipient preview. An enabled Telegram channel may be unbound; activation and chat readiness are displayed separately. The preview describes recipients for a new invoice; delivery results remain authoritative in the journal. Notifications support search, channel/status filters and local pagination; the action journal also paginates loaded records. Mobile invoices, recurrences, users and audit records use readable lists. The mobile navigation traps keyboard focus while open and supports Escape and focus restoration.

The main invoice list sorts loaded rows by due date or actual payment date. Clicking a date header toggles direction; empty actual dates stay last in either order. The selection survives filter reloads. Mobile lists expose the same choices in a labelled select. Sorted headers use `aria-sort` and native keyboard-operable buttons.

## Design

`PRODUCT.md` records confirmed requirements. `DESIGN.md` records the visual system. Current user-provided Aeza screenshots define orange, pale peach, white and graphite. Impeccable's Operate guidance informs hierarchy, restrained decoration, keyboard focus, responsive structure and explicit state feedback. Invoice Keeper retains its own identity.

GitHub: https://github.com/makssssko2/HackAutumn2026Front. Deployment: https://aezainvoice.xxxmgxxx.com. Environment files remain ignored.
