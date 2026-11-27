# PrintMesh multi-agent handoff

This file is the shared handoff for every AI working on PrintMesh. Read it before changing code. Update the progress log after each completed task, including the commit, files changed, tests, and anything the user must verify. Never remove deferred verification items.

## Repository layout

- `apps/web`: Next.js web application (customer, merchant, owner portals, API routes).
- `apps/web/src/app/api`: server API routes.
- `apps/web/src/lib`: Supabase clients, auth helpers, environment validation.
- `database/migrations` and `supabase/migrations`: ordered SQL migrations.
- `services`: agent/printing services.
- `docs`: setup and operational documentation.

## Important architecture

- Supabase Auth handles owner and merchant sessions.
- `requireOwner()` protects owner APIs using `PRINTMESH_OWNER_EMAILS`.
- Merchant membership is resolved through `merchant_users.merchant_id`.
- Customer store URLs use `merchants.public_id`: `/s/<public_id>`.
- Store images are stored in Supabase Storage bucket `store-images`; `merchants.image_url` stores the object path. Browser rendering uses the same-origin `/api/store-images/[...path]` proxy.
- Print jobs are created through `/api/jobs`, tracked at `/track/[jobId]`, and cancellable while queued through `/api/jobs/[jobId]/cancel`.

## Working rules

1. Make one focused change at a time and stop at a verification checkpoint.
2. Preserve unrelated user changes and untracked instruction files.
3. Use `apply_patch` for edits.
4. Run the narrowest relevant ESLint/typecheck/build check.
5. Commit and push only the focused change.
6. Report exact commit, cause, fix, tests, and required user verification.
7. Owner-panel errors may expose exact database/server messages; customer and merchant-facing errors should remain safe and friendly.
8. Do not cascade-delete print history. Archive stores with related jobs.

## Deferred verification checklist (do not remove)

- `4de36f5`: verify Next.js security upgrade on Vercel.
- `5c71c85`: verify owner store-edit error details.
- `a416fd5`: verify exact owner API/database errors.
- `1dc79a9`: verify Delete store flow.
- Verify availability/printer failure messages.
- Final owner → merchant → customer → print → tracking smoke test.

## Current known notes

- `a4bc3c5` added Archive/Unarchive store controls; these use lifecycle state and preserve history.
- `c42aaf7` replaced broken browser PDF preview with a clear “PDF ready to print” fallback; image previews still render and support B&W filtering.
- Production build passed on Next.js `16.4.6`.
- ESLint has existing image optimization warnings; do not treat them as functional failures.

## Progress log

| Date | AI/commit | Work and verification |
|---|---|---|
| 2026-11-27 | Codex / `a4bc3c5` | Added owner Archive/Unarchive controls; pushed. User reported lifecycle behavior acceptable for beta. |
| 2026-11-27 | Codex / `c42aaf7` | Added graceful PDF preview fallback; focused ESLint passed with existing `<img>` warning. |
| 2026-11-27 | Codex / `503041d` | Exposed exact Supabase delete error in owner panel. |
| 2026-11-27 | Codex / `4de36f5` | Upgraded Next.js security patch; production build and TypeScript passed. |

## Required handoff entry format

Append a row to the progress log:

`YYYY-MM-DD | AI/name + commit | changed files/behavior; tests; user verification needed; remaining work`

## Post-beta product roadmap (planned; do not implement until beta sign-off)

The next major phase improves PrintMesh's customer and merchant experience while preserving the current working beta. Use original PrintMesh branding, copy, colors, icons, and layout decisions; do not clone Svindo's exact visual design, text, assets, or interaction styling.

### Reference capabilities observed in the Svindo demo

- Guided kiosk-style upload flow.
- Camera scan, gallery/photo upload, PDF documents, and general file picker.
- Quick uniform settings or per-file settings.
- Paper-size selection with unavailable options explained.
- Page preview, page navigation, and custom page selection.
- Copies controls with clear document/page totals.
- B&W/color and single/double-sided controls.
- Order summary before submission.
- Pricing breakdown, tax/GST details, and total payable.
- Online payment and pay-at-counter choices.
- Optional customer name/mobile capture.
- Sample/demo document for testing.
- PWA/install prompt and mobile-first kiosk presentation.
- Privacy messaging and automatic temporary-file cleanup.
- Customer orders/history surface.

### PrintMesh capabilities to preserve

- Owner portal: authenticated store management, store images, lifecycle, archive/unarchive, delete where safe, audit history.
- Merchant portal: dashboard, availability toggle, password change, logout, printer discovery/selection, QR/customer link.
- Customer portal: store directory, store images, file upload, preview, B&W/color, paper size, copies, duplex, print submission.
- Tracking: live status, timeline, five-second/14-second cancellation window, cancellation status.
- Supabase Auth, Storage, database migrations, same-origin image proxy, and Windows agent integration.

### Revised implementation order (simple pre-beta features first)

The user has authorized implementing non-AI Svindo-style basics before public beta. Keep the current working flows intact and deliver one checkpoint at a time.

0. **Orientation and sheet-aware preview:** portrait/landscape control, preview layout, selected paper size and orientation carried into the job record and downstream settings.
1. **Customer upload sources:** guided file-source choices, drag/drop, queue/remove/reorder while preserving the existing file input fallback.
2. **Preview/page basics:** reliable PDF/image preview, page navigation, page selection, per-file settings, and clear totals.
3. **Order review:** summary of files, pages, copies, paper, color, duplex, orientation, and confirmation before submission.
4. **Merchant queue polish:** clearer job cards, details, printer/agent health, and responsive layout.
5. **Owner operations polish:** search/filter/sort stores, archive-first deletion guidance, audit details, image management.
6. **Pricing/payments:** configurable pricing, tax display, counter-payment placeholder, provider integration later.
7. **Privacy/retention:** upload notice, temporary-file lifecycle, purge status, and access controls.
8. **PWA/mobile kiosk:** installable flow, camera/mobile improvements, accessibility/touch review.
9. **AI Print Assistant (later):** clarity/crop/rotation/contrast/blank-page analysis with corrected preview and safe fallback.

### Original post-beta priority reference

1. **Customer flow foundation:** guided upload stepper, file-type cards, drag/drop, camera/gallery/file-source choices, document queue, remove/reorder files.
2. **Preview and page controls:** reliable PDF/image page previews, page navigation, page ranges/custom selection, per-file settings, clear totals.
3. **Order review:** final summary of files, pages, copies, paper, color, duplex, estimated turnaround, and confirmation before submission.
4. **Merchant operations polish:** improved dashboard hierarchy, job queue cards, job detail actions, printer/agent health, clearer availability state, responsive mobile layout.
5. **Owner operations polish:** dashboard metrics, search/filter/sort stores, archive-first deletion guidance, audit detail drawer, image management.
6. **Payments and pricing:** configurable owner pricing, tax display, pay-at-counter placeholder, payment provider integration only after legal/operational review.
7. **Privacy and retention:** explicit upload notice, temporary-file lifecycle, purge status, download/access controls, retention configuration.
8. **PWA/mobile kiosk:** installable customer experience, offline-safe shell, mobile camera flow, accessibility and touch-target review.
9. **AI Print Assistant (later, separate service):** clarity/crop/rotation/contrast/blank-page analysis, corrected preview, accept/reject corrections, safe fallback to original file.

Each item must be implemented as a separate checkpoint, tested, committed, pushed, and added to this roadmap's progress log before starting the next item.

