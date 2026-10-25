# USETAG — Sales and commission workspace

Independent Next.js App Router / TypeScript / Tailwind / Supabase application. It does not use older projects, WhatsApp integrations or their credentials. The accepted dashboard image governs the charcoal sidebar, navy canvas, bordered surfaces, green actions, financial grid, sales chart and right-hand dispatch editor. On small screens the navigation collapses and the assistant follows the sales content.

## Run locally

Node 24 and pnpm were used. With a package manager on PATH:

```powershell
pnpm install --frozen-lockfile
pnpm dev
# http://127.0.0.1:4180/dashboard
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

The bundled runtime in this computer can also execute `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 4180` and `node node_modules/typescript/bin/tsc --noEmit`. Browser verification: `node scripts/verify.cjs`; the script currently uses this computer's bundled Playwright and installed Chrome. Adapt its import path on other computers.

Production builds use the officially supported `--webpack` switch because Turbopack's PostCSS subprocess failed in this Windows workspace. Webpack compilation and TypeScript succeeded; this does not change the application stack. The development preview still uses the default bundler.

## Modes and boundaries

Without the two public Supabase variables, the application uses clearly identified fictional records in React memory. Changes survive client navigation, not a reload. There is no simulated production login or localStorage database. No real customers are included in demo data or tests.

With both public variables configured, the app requires a real Supabase session. It loads authorized data through server routes and submits validated commands to transactional database functions. An unavailable database blocks the private workspace with a retry state, rather than replacing real records with fictional data.

Copy `.env.example` to `.env.local` yourself or configure the variables through your environment. Never commit its contents. Variables:

- `NEXT_PUBLIC_SUPABASE_URL`: dedicated project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable project key.
- `SUPABASE_SECRET_KEY`: server-only, needed only for server-mediated receipt uploads.
- `OPENAI_API_KEY` / `OPENAI_MODEL`: optional, server-only AI configuration. Choose an account-accessible model supporting strict Structured Outputs and Chat Completions.

No credentials from existing projects were inspected or reused. Nothing was deployed and no external schema was changed.

## Database setup

The migration was created with the Supabase CLI, and is in `supabase/migrations/20261023210746_panel_core.sql`. Apply first to a new, isolated local Supabase stack, review advisors, then explicitly select the dedicated remote project before any external application. Do not run it against an older USETAG project without review. Remote application was not authorized or performed.

The schema includes profiles, clients, sales/items, commissions, payments, allocations, adjustments, personal transactions, dated goals, receipt metadata, imports and audit events. Public tables enable owner-based SELECT RLS. Direct authenticated writes are revoked. Commands enter an invoker wrapper and a narrowly scoped private definer that checks `auth.uid()`, fixes `search_path` and serializes writes per owner. Private schema must remain excluded from the PostgREST exposed schemas list. Do not grant table DML to browser roles.

Provision the internal user through Supabase Auth. Login uses server-side password authentication and HttpOnly cookies. No public signup is provided. Configure production Site URL and redirect allowlist for the selected host. This release uses password login, so it does not require an OAuth callback. Verify provider-side login rate limits and email/account recovery before releasing to daily use.

Financial rules use integer cents and basis points, with half-up rounding per sale. Only approved, active sales count toward active revenue. Archiving preserves commission rights and receipt history. Cancellation removes current entitlement and records an unresolved excess if money was already received; it never fabricates a cash withdrawal. Payments allocate exactly their total, cannot exceed entitlement minus prior receipts, and generate one personal cash entry. Idempotent replay and optimistic sale versions guard repetition and stale editing. Changing the default rate leaves historical sales unchanged.

Unresolved adjustment review is displayed; a dedicated compensation/refund reconciliation workflow is still pending. Do not clear an adjustment by editing unrelated cash entries. Other current limits: one active dated goal per user; snapshots cap each major list at 1,000 records and stop rather than silently computing totals from truncated lists. Server pagination, advanced payment-method/commission-state filters and historical cash closing reports remain future work.

## Private initial import

The actual two-sale import is kept only in the ignored `private-imports/initial-sales.json`. It contains names, dates, amounts and plate quantities; no documents, contacts or receipts. It is neither bundled nor automatically imported. In the connected workspace, choose it in Settings → Private import and confirm. A stable import key prevents reimporting the same content; any error rolls back the complete import. This initial-import flow records 5% commissions even if the current default differs, then restores the default. Expected result from these two records: R$ 852.80 sales, R$ 42.64 commission, R$ 2,147.20 remaining toward the R$ 3,000 goal, and R$ 0 personal cash.

## Receipts and AI

The receipt bucket is private. The server checks the authenticated owner's sale, file size and magic bytes, uploads with a server-only secret, records metadata and cleans up its newly uploaded object on metadata failure. PDF/JPEG/PNG/WebP up to 10 MB are accepted. Downloads require owner authorization and use 60-second signed URLs. Attaching a receipt never approves payment. This is file-type validation, not antivirus scanning.

Dispatch flow: paste → local extraction or optional AI after an explicit consent checkbox → editable structured fields → optional private receipt attachment → one-click registration of the client, sale, items and commission → editable plain-text preview → copy. The local parser is deliberately conservative; unlabeled/free-form information can require manual completion. It preserves document digits, separates gifts, distinguishes zero from unknown quantity and checks declared totals. No message is sent automatically. Proof images are stored only after the sale is registered and only when the server-only storage secret is configured. Automatic proof-image reading is intentionally disabled until the owner explicitly authorizes sending that sensitive document to an external AI provider.

The optional OpenAI adapter sends only the pasted order to the configured model, without database tools. Server validation, strict JSON schema, 20-second timeout, output token limit and a database-backed per-user budget of 15 requests per 10 minutes bound its use. A provider failure leaves manual editing available. AI output remains a suggestion requiring human review. Provider billing/data-retention settings must be configured on the owner's account before enabling real customer data.

## Verification and limits

- Unit tests cover cents, rounding, totals, partial/grouped allocations, over-allocation rejection, archival/cancellation, CSV formula neutralization and dispatch edge cases.
- `tests/database.test.mjs` executes the migration on PGlite (PostgreSQL WASM) with mocked Auth/Storage schemas. It checks financial side effects, idempotency, rollback, rate-history preservation, private imports, direct-write denial, two-user RLS isolation and the shared AI budget.
- This is not a full Supabase integration test. Actual Auth refresh, PostgREST relationship results, Storage upload/download, remote advisors, backups and multiprocess lock contention require the configured service.
- Browser checks cover 390/768/1024/1440 px, local sale create/edit/archive/restore, commissions → cash, dispatch/copy, mobile menu, Escape and reduced motion. Screenshots are saved in ignored `test-results/` and inspected at wide/narrow sizes.
- Reader software, full WCAG audit and measured field performance have not been evaluated. No performance score is claimed.

## Architecture and references

`components/` holds the shell and focused editors; `lib/domain/` contains pure financial, client and dispatch contracts; `lib/validation/` validates server boundaries; `app/api/` handles identity/data/AI/files; `supabase/migrations/` owns durable constraints and atomic writes. The in-memory demo shares deterministic domain rules, but production authority is the database.

Official references checked during implementation:

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase changelog](https://supabase.com/changelog)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat)

The CodeMakers design skill guided reference fidelity, accessible native controls, the responsive task flow and visual verification. It does not add any client-facing credit or third-party branding.
