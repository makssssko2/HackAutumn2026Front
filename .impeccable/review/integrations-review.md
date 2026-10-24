# Integration frontend review — 2026-10-24

Scope: ordinary extension of the existing settings surface for VK Teams and Mattermost. Bitrix24 deferred by the user. No new visual world or shipping raster assets.

Fresh Impeccable finish reviewer inspected all eight named captures, the surface contract, existing DESIGN.md and source. Initial disposition: **fix**. Typography, material, themes, composition, workflow and scope matched the existing operational design. One material finding: preserve the backend channel-test 409 recovery message when no invoice exists.

Correction: removed the unconditional 409 message override; added a regression test and a browser scenario asserting the exact first-payment recovery message. All eight original captures were recaptured. Additional evidence: `integrations-no-invoice.png`.

Reviewer verdict pass: **ship**, sole material fix **resolved**; all eight recaptures valid, no visible regression from the fix. This verdict scores the listed fix and is not a claim of live provider certification.

Validation: `npm run check` passed FSD, TypeScript and 27 tests in seven files; `npm run build` passed. Browser checks used mocked API responses and exercised credentials, retries, routing, explicit queued test, first-invoice recovery, partial API failures, participant access, widths 320/390/768/1000/1440, and both themes. External delivery and native chat payment actions require real deployment credentials and were not exercised.

Detector: one run over the changed UI targets returned `[]`. No generated or sourced raster is bundled with this feature; captures here are development evidence.
