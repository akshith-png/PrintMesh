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

