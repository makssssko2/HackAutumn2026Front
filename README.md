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

Administrator: configured in Back/.env. The local example is `admin / change-me-before-use`. After explicit backend demo seeding: ordinary account `demo / demo12345`.

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
- `features/confirm-payment`: a payment action reused in overview, list, calendar and detail.
- `entities/payment`: occurrence/recurrence models, API and reusable payment/status views.
- `entities/session`: current account, session and account-level settings.
- `shared`: HTTP transport, generic async helper, display utilities and presentation primitives.

Each domain slice exposes an `index.ts` public API. Dependencies point down the layers; slices on one layer do not import each other. Page-specific code stays in the page. Shared contains no payment domain logic. `scripts/check-fsd.mjs` verifies layer direction, slice isolation and public API usage, including relative imports.

## Screens

Overview, filterable invoices, invoice card and independent periods, recurring schedules, calendar with date totals, monthly/yearly currency budget, notification delivery journal, user management, recipient groups, channel connections and action audit. Users can confirm/cancel payment, correct dates and attach a file/link. Admin-only routes are protected in the router and independently enforced by the backend.

## Design

`PRODUCT.md` records confirmed requirements. `DESIGN.md` records the visual system. Current user-provided Aeza screenshots define orange, pale peach, white and graphite. Impeccable's Operate guidance informs hierarchy, restrained decoration, keyboard focus, responsive structure and explicit state feedback. Invoice Keeper retains its own identity.

No remote repository or publication has been configured.
