# Invoice Keeper design

## Direction

An operational workspace for recurring team expenses. Primary reading order: what is due, what is overdue, what needs action. Persistent navigation, a readable ledger, and inline forms. Mode: Operate. Build directly in code.

## Reference and palette

User-pinned Aeza palette, confirmed by three current screenshots supplied by the user. They supersede older indexed blue screenshots: orange actions, pale peach panels, white ground, graphite text and dark neutral sections. The following tokens adapt those references to a ledger UI.

- Ground: #faf9f7; sidebar: #f4f3f1; surface: #ffffff.
- Ink: #202020; secondary ink: #63615e; structural border: #e8e5e1.
- Accent: #ff8000; accent ink: #a44900; pale accent: #fff0e2.
- Success: #196344 on #eaf5ed; danger: #a33230 on #fceeed; warning: #885315 on #fff3df.
- Primary actions are orange with dark text for readable contrast; warm peach identifies active navigation and contextual selection. Graphite provides strong secondary contrast.

## Themes

Light and dark themes share semantic CSS tokens in `src/app/styles/main.css`. Dark mode uses warm graphite ground #1b1917, raised surfaces #24211e, sidebar #201e1b, ivory text #f3eee8 and secondary text #b7aea4. Orange #ff922e remains the primary action with fixed graphite ink; links and focus use lighter orange. Peach selections become warm brown surfaces. Success, warning and danger retain explicit labels and use separate dark backgrounds with readable pastel text. Charts, native fields, selection, scrollbars, overlays and public invoice sheets follow the same theme.

The sun/moon button is available in the workspace header, login and public invoice pages, with a 44px target, visible keyboard focus and `aria-pressed`. On first visit the theme follows the operating system; an explicit choice is saved under `invoice-keeper-theme` in localStorage and synchronized across tabs. The head bootstrap applies the theme before the application loads. If storage is unavailable, switching still works for the current page.

## Typography and layout

One system sans family, Russian-friendly. Compact UI with a 14px base and 28–34px screen headings. Tabular numerals for amounts and dates. 246px left navigation, content width up to 1560px. At narrow widths navigation becomes an explicit menu and multi-column sections collapse. Ledger scrolls within its container, never the document.

## Components and states

Consistent buttons, fields, status labels, restrained 12–16px panel corners. No decorative gradients, metric sparklines or invented claims. Focus-visible rings, keyboard-operable controls, explicit loading/error/empty states. Drawn icons from Lucide. Motion only for state feedback, with reduced-motion support.

Body text uses 14px, secondary text 13px and captions 12px. Main controls and mobile action rows provide 44px targets. The mobile navigation is a modal drawer with an explicit close button, background inertness and focus restoration. Selected filter buttons expose their pressed state. File upload focus is drawn around its visible label.

On mobile, invoices, recurring schedules, participants and audit entries become flat lists with all essential fields visible. Currency budgets retain an explicitly labelled scroll region. Journals show 12 loaded records per page and expose filters/reset actions. The overview leads with overdue attention and invoices, followed by currency summaries. Issuing a new invoice remains a persistent primary action.

Channel activation and Telegram binding are independent facts. An enabled, unbound channel shows both states and a connection action; it is never silently disabled. Invoice creation has explicit all-channels/group modes and a deduplicated preview with readiness notes. The administrator journal is explained separately from external recipients.

## Content

Use actual API data. Label demo mode. Currency totals never mix. Error messages include a recovery action. Confirmation names the invoice and amount. No fiscal or real money claims.

## Recipient invoice

The private email invoice is a standalone narrow sheet without workspace navigation. Show title, amount, due date, actual-date selection and one explicit confirmation action. Orange uses graphite text; muted peach explains backdating. Paid, cancelled, expired, loading and failure states are explicit. Links are capabilities, so suppress referrers and caching on /pay/.

## Invoice types and payment actions

Use native radio choices for recurring versus one-time creation. Hide recurrence fields for one-time invoices. Explain scheduled delivery before saving a distant one-time invoice; the submit action and success message must not promise immediate sending. Descriptions preserve line breaks in detail and public invoices, and use a readable two-line preview in lists. Type labels are neutral, distinct from payment status.

Both roles can manage a selected invoice's demo payment. Use inline confirmation forms with the invoice name/amount, actual-date input and explicit submit/cancel actions. Explain receipt replacement/voiding before date correction or undo. Keep admin delivery and one-time cancellation actions separate from payment state. Conflicts reload data and require a fresh action; focus moves to feedback. Participants never see administrative navigation, and direct admin links explain the access boundary.

In the main invoice list, date headers are native buttons with direction arrows, hover feedback and the shared visible focus ring. `aria-sort` identifies the current column/order; a live status describes changes. Mobile uses a labelled select above the invoice rows. Empty actual dates remain last, and filter changes preserve the selected order.
