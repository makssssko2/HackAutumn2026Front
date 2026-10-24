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

## Typography and layout

One system sans family, Russian-friendly. Compact UI with a 14px base and 28–34px screen headings. Tabular numerals for amounts and dates. 246px left navigation, content width up to 1560px. At narrow widths navigation becomes an explicit menu and multi-column sections collapse. Ledger scrolls within its container, never the document.

## Components and states

Consistent buttons, fields, status labels, restrained 12–16px panel corners. No decorative gradients, metric sparklines or invented claims. Focus-visible rings, keyboard-operable controls, explicit loading/error/empty states. Drawn icons from Lucide. Motion only for state feedback, with reduced-motion support.

## Content

Use actual API data. Label demo mode. Currency totals never mix. Error messages include a recovery action. Confirmation names the invoice and amount. No fiscal or real money claims.

## Recipient invoice

The private email invoice is a standalone narrow sheet without workspace navigation. Show title, amount, due date, actual-date selection and one explicit confirmation action. Orange uses graphite text; muted peach explains backdating. Paid, cancelled, expired, loading and failure states are explicit. Links are capabilities, so suppress referrers and caching on /pay/.
