# Paginated records

Mode: Operate. Extend the existing ledger, journals, administration, invoice detail and settings. User explicitly requests server-side page requests everywhere records grow, horizontal pagination arrows and consistent channel rows. Preserve both themes and all payment/integration actions.

## Direction contract

THESIS: A page is a bounded server result, with a truthful total; filtering and sorting apply to the whole collection. Controls should stay aligned across different row content.

OWN-WORLD: Inherit Invoice Keeper's orange/peach and warm graphite semantic tokens, system type, Lucide icons, restrained rows and existing navigation. No new visual identity.

STORY: Read a bounded page, move forward/back, change page size, search or sort and return to page one. Loading/errors are explicit, stale responses cannot overwrite a newer query, and deleting the last row recovers to a valid page. Complete recipient choices remain available through bounded lookup requests.

FIRST VIEWPORT: Existing headings and filters precede each ledger. Pagination follows the records with range/total, page size and a horizontal pair of 44px arrows. Settings uses consistent icon/name/status/action columns on wide screens; smaller screens stack the same groups in order.

FORM: Local extension and repair of existing surfaces, code-led. Fixed annual twelve-month budget totals remain a report, not a growing collection. Calendar cells use full server aggregates and the selected day's ledger is paginated. seed: none (existing surface extension).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
