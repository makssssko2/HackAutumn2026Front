# Integrations documentation and persistence evidence

Date: 2026-10-24. Mode: Operate; ordinary extension of the existing settings surface. Authority: `PRODUCT.md`, incumbent `DESIGN.md`, and `.impeccable/surfaces/src-pages-settings-ui-settingspage-vue.md`. Scope: VK Teams and Mattermost; Bitrix24 deferred by the user until backend support exists.

## Persistence verdict

Updated `PRODUCT.md` and `README.md` with the shipped connection/recipient workflow and its limits. Preserved `DESIGN.md`: this surface introduces no approved visual-system change. The pre-existing absent `.impeccable/design.json` and incumbent DESIGN format are not repaired by this task. No application code, configuration, raster asset, commit or push is part of this documentation pass.

## Sources checked directly

- `src/app/styles/main.css`: shared light/dark semantic palette, system sans stack, 14/13/12px body/secondary/caption roles, 44px control token, shared buttons, fields, panels, focus and responsive form primitives.
- `src/pages/settings/ui/SettingsPage.vue`, `ConnectionForm.vue`, `ChannelForm.vue`, `IntegrationHelp.vue`: flat bot/recipient rows, inline save → validate → chat flow, separate activation/API status, credential replacement without readback, wrapping action rows and IDs, native help disclosures, explicit queued-test confirmation and existing Telegram/SMTP/webhook paths.
- `src/entities/channel/model/integration.ts`, `channel.ts`, `ui/ChannelState.vue`, and integration API wrapper: provider-specific credential keys, string recipient IDs, readiness warnings, status/error handling, and actionable backend conflict text. `integration.test.ts` contains the regression for the no-invoice 409 message.
- `src/pages/groups/ui/GroupsPage.vue` and `src/pages/create-payment/ui/CreatePaymentPage.vue`: connection readiness participates in recipient displays and previews.
- Sibling authoritative Back sources: `app/api/integrations.py` exposes only `has_credentials`, not credentials; edits reset health to `not_checked`; validation calls the provider API. `app/api/channels.py` queues test deliveries and rejects missing invoices with actionable 409 text. `app/repositories/channels.py` selects the non-cancelled occurrence with greatest due date. `app/integrations/mattermost.py`, `app/notifications.py`, backend configuration and README establish backend callback/worker responsibility.
- Visually inspected `.impeccable/review/integrations-desktop.png` and `integrations-mobile-dark.png`: established orange/peach and warm graphite worlds, quiet bordered lists, inherited workspace navigation and typography, stacked mobile actions, distinct enabled/API-checked status labels. No new visual world or shipping raster imagery.

## Capability and evidence limits

Credentials save on Back; the frontend clears its transient credential field after success/provider change/unmount and does not persist it in browser storage. A saved/healthy bot can serve multiple recipient channels with string IDs. Connection and recipient edit/enable/disable controls remain distinct. API health does not establish permissions in a particular chat, successful delivery, or callback/button readiness. Test confirmation warns that actual invoice information and demo-payment actions may be sent; successful enqueue directs the administrator to the delivery journal. Missing-invoice errors retain the backend recovery instruction. Bitrix24 is explicitly future work.

The parent implementation pass reports 27 passing unit tests, a passing final production build, and browser fixtures at widths 320, 390, 768, 1000 and 1440 in light/dark themes; detector findings were `[]`. The finish reviewer returned `ship` after checking the sole 409-recovery correction, with no visible regression; the scoped verdict is recorded in `integrations-review.md`. These are inherited verification results, not tests rerun by the documenter. Capture evidence also includes `integrations-mobile.png`, `integrations-dark.png`, `integrations-form.png`, `integrations-validation-error.png`, `integrations-help-mobile.png`, `integrations-recipients-mobile.png` and `integrations-no-invoice.png`. Browser API responses were mocked. Real provider credentials were unavailable; external delivery, receipt upload and payment callbacks were not exercised against live services. API validation is not described as end-to-end verification.

The implementation pass checked provider help against official Mattermost bot-account/Blocks documentation and the VK Teams official bot SDK: <https://docs.mattermost.com/developers/integrate/reference/bot-accounts>, <https://docs.mattermost.com/developers/integrate/reference/mm-blocks>, <https://github.com/mail-ru-im/bot-golang>. This document records that inherited source verification; the documenter did not repeat the web lookup.

## Five-line system summary

Palette: inherited orange actions and peach selection, white light surfaces, warm graphite dark surfaces, semantic labelled status colors.
Type: inherited system sans, 14px base, 13px secondary and 12px captions; existing screen/section hierarchy.
Layout rule: persistent workspace shell, bot connections before recipient rows, inline forms and disclosed provider instructions.
Interaction rule: explicit save/validate/chat stages, separate readiness and activation, labelled feedback with recovery actions.
Responsive rule: inherited field/panel primitives, wrapping actions and IDs, stacked mobile rows and 44px mobile action targets.

Not canonized or repaired: pre-existing DESIGN format/sidecar drift; no new world or approved system change authorizes a system migration. Persistence is complete within the documentation boundary; live provider verification remains outstanding and is not claimed.
