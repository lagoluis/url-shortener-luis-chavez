Prompt 01 — Repo & Backend Skeleton

You are writing code for a new project called "url-shortener". Create a root folder layout with two apps: /backend and /frontend (empty for now). In /backend:

1) Initialize Node + TypeScript + Express.
   - package.json with scripts:
     - "dev": "ts-node-dev --respawn src/server.ts"
     - "start": "node dist/server.js"
     - "build": "tsc -p tsconfig.json"
     - "test": "vitest run"
   - tsconfig.json (ES2020, module commonjs or node16, outDir dist, rootDir src, strict true).
   - src/server.ts exporting an Express app (not just createServer) and starting on PORT=3000 if invoked directly.
   - src/app.ts sets up: cors, express.json(), a health route GET /health -> {ok:true}, and a generic error handler that returns JSON: { "error": { "code": "INTERNAL", "message": "Something went wrong" } } on unhandled errors.

2) Add .editorconfig, .gitignore (node, dist, .env).

3) Install dev/test deps: typescript, ts-node-dev, vitest, supertest, @types/node, @types/express.

4) Acceptance:
   - `npm run dev` starts server on 3000, GET /health returns {ok:true}.
   - `npm run build` emits dist/.
Provide all file contents you create/modify.

Prompt 02 — Env & Unified Error Envelope

Enhance /backend to support typed env and a unified error shape.

1) Create src/env.ts:
   - Load dotenv if not in production.
   - Export an object Env with: NODE_ENV, PORT (default "3000"), DATABASE_URL (default "file:./dev.db").
   - Validate types minimally.

2) Create src/middleware/error.ts:
   - export function errorHandler(err, req, res, next)
   - Always respond with JSON: { error: { code, message, details? } }
   - Default code = "INTERNAL", message = "Unexpected error".
   - If err has {status, code, message} use those; ensure safe fallback.

3) Update src/app.ts:
   - Use errorHandler as the last middleware.
   - Add a not-found handler returning { error: { code: "NOT_FOUND", message: "Route not found" } }.

4) Acceptance:
   - Unknown route returns 404 JSON with the envelope.
   - Health still works.
Provide diffs or full files.

Prompt 03 — Prisma + SQLite Schema & Migration

Add Prisma with SQLite.

1) Install prisma and @prisma/client. Run `npx prisma init` with datasource sqlite, url "file:./dev.db".

2) In prisma/schema.prisma define:
   model Link {
     id         String   @id @default(cuid())
     slug       String   @unique
     targetUrl  String
     createdAt  DateTime @default(now())
     clicks     Click[]
   }
   model Click {
     id        String   @id @default(cuid())
     link      Link     @relation(fields: [linkId], references: [id], onDelete: Cascade)
     linkId    String   @index
     tsUtc     DateTime @default(now()) @map("ts_utc")
     userAgent String
     @@index([linkId, tsUtc])
   }

3) Add src/db.ts exporting a singleton PrismaClient.

4) Scripts in package.json:
   - "migrate": "prisma migrate dev --name init"
   - "seed": "ts-node src/seed.ts" (seed will be added later)

5) Run migration and generate client.

6) Acceptance:
   - prisma/migrations exists; `npm run migrate` succeeds.
Provide all new files and updated scripts.

Prompt 04 — Utilities: Slug, Validation, Date Helpers

Create utilities.

1) src/lib/slug.ts:
   - export function randomSlug(len=7): Base62 from crypto randomBytes; URL-safe; tests later.

2) src/lib/validators.ts:
   - Use zod.
   - export schemas:
     * createLinkSchema: { targetUrl: string (http/https only), slug?: [A-Za-z0-9_-]{1,64} }
     * dateRangeSchema: { from?: string ISO, to?: string ISO } and a helper to coerce/validate.

   - Provide helper export parseCreateLink(body) and parseDateRange(query) that throw {status:400, code:"VALIDATION_ERROR", message:"...", details} on failure.

3) src/lib/dates.ts:
   - export normalizeRange({from,to}) returning [fromISO,toISO] in UTC, with sensible defaults (e.g., last 30 days if none provided).

4) Install zod.

5) Acceptance:
   - Building succeeds, functions exported.
Provide code for all new files.

Prompt 05 — POST /api/v1/links (create) + Uniqueness Handling

Implement link creation with validation and uniqueness.

1) Router:
   - Create src/routes/links.ts with Express Router.
   - POST /api/v1/links:
     * Validate with parseCreateLink.
     * If slug provided, use as-is after validation; else generate via randomSlug().
     * Attempt prisma.link.create({data:{slug,targetUrl}}).
     * On unique constraint error (Prisma P2002):
       - If slug was provided by user -> respond 409 {error:{code:"SLUG_TAKEN", message:"Slug already exists"}}
       - If slug was generated -> retry with a new generated slug up to 3 times, then fail 500.
     * Respond 201 with {link:{id,slug,targetUrl,shortUrl,createdAt}} (shortUrl = `${base}/r/${slug}`; derive base from request host/proto).

2) Wire router in src/app.ts: app.use('/api/v1/links', linksRouter).

3) Add a minimal GET /api/v1/links to list all links (id, slug, targetUrl, createdAt) for the UI.

4) Acceptance:
   - POST valid targetUrl returns 201 and link payload.
   - POST with duplicate custom slug returns 409.
   - GET /api/v1/links returns an array.
Provide updated files (router, app).

Prompt 06 — GET /r/:slug (redirect) with Click Recording

Implement redirect with click recording.

1) Create src/routes/redirect.ts:
   - GET /r/:slug:
     * Lookup link by slug. If not found -> 404 text "Not found".
     * Insert a click: prisma.click.create({data:{linkId: link.id, userAgent: req.headers['user-agent'] ?? ''}})
     * Respond 302 with Location: link.targetUrl

2) Wire in src/app.ts: app.use('/', redirectRouter) (ensure route path is '/r/:slug').

3) Acceptance:
   - Visiting /r/<existing-slug> returns 302 and records a click row.
   - /r/unknown returns 404.
Provide code.

Prompt 07 — Analytics Endpoints (summary & daily)

Add analytics.

1) In src/routes/links.ts add:
   - GET /api/v1/links/:id/analytics/summary?from&to
     * Validate :id exists; validate date range; COUNT(*) clicks for link_id in [from,to].
     * Return { total: number }

   - GET /api/v1/links/:id/analytics/daily?from&to
     * SQLite SQL: SELECT date(ts_utc) AS day, COUNT(*) AS count FROM clicks WHERE link_id=? AND ts_utc BETWEEN ? AND ? GROUP BY 1 ORDER BY 1
     * Return [{ day: 'YYYY-MM-DD', count: number }]

2) Add small helper to ensure the link exists, else 404 {error:{code:"NOT_FOUND",...}}.

3) Acceptance:
   - Both endpoints return correct shapes; empty arrays when no clicks.
Provide code changes.

Prompt 08 — Seed Script with Deterministic Data

Create src/seed.ts to populate demo data.

1) Create 3 links (one custom slug).
2) For link[0], insert ~120 clicks over the last 7 days, spread deterministically (use a fixed seed or fixed loop).
3) Add script "seed": "ts-node src/seed.ts".

4) Acceptance:
   - Running seed after migrate populates links and clicks.
   - Analytics endpoints show non-empty results.
Provide full seed script.

Prompt 09 — Tests: Redirect, Daily Aggregation, Validation Failure

Add Vitest + Supertest tests.

1) tests/redirect.spec.ts:
   - Arrange: create a link via Prisma (or API).
   - Act: GET /r/:slug with Supertest.
   - Assert: status 302, exactly 1 click row added.

2) tests/analytics.spec.ts:
   - Arrange: insert clicks across 3 distinct days.
   - Act: GET /api/v1/links/:id/analytics/daily?from&to
   - Assert: 3 buckets with correct counts and sorted days.

3) tests/validation.spec.ts:
   - Act: POST /api/v1/links with "javascript:alert(1)".
   - Assert: 400 with error envelope and human-readable message.

4) Test runner setup:
   - Use an isolated SQLite file per test run (e.g., file:./test.db) or use :memory: with Prisma workarounds if simpler.
   - Run migrations before tests; clean up between tests.

5) Acceptance:
   - `npm test` passes all three specs.
Provide new test files and any config changes.

Prompt 10 — Frontend Scaffold (Vite React TS) + API Base

Create /frontend with Vite React TS.

1) Initialize Vite React TS app. Scripts:
   - "dev": "vite"
   - "build": "tsc && vite build"
   - "start": "vite"

2) Add .env.local with VITE_API_BASE defaulting to http://localhost:3000.

3) Create src/lib/api.ts:
   - Export functions: listLinks(), createLink(body), getSummary(id, range), getDaily(id, range).
   - Narrow types for responses; parse unified error envelope.

4) Acceptance:
   - `npm run dev` starts on 5173.
   - `listLinks()` works against backend.
Provide key files.

Prompt 11 — Links Page (Create + List)

Implement LinksPage and minimal routing.

1) src/main.tsx + src/App.tsx with basic router:
   - "/" -> LinksPage
   - "/links/:id" -> LinkDetailPage (placeholder)

2) src/pages/LinksPage.tsx:
   - Shows CreateLinkForm and LinksTable.
   - Fetches list on mount; refreshes after create.

3) src/components/CreateLinkForm.tsx:
   - Inputs: targetUrl, optional slug; submit -> POST; show inline errors from server.
   - Disable while submitting; clear form on success.

4) src/components/LinksTable.tsx:
   - Columns: slug, targetUrl (truncate), createdAt, totalClicks (optional if available), and a "Copy short URL" button.
   - Each row links to /links/:id.

5) Acceptance:
   - Can create links (custom or generated).
   - List refreshes; copy button works (use navigator.clipboard).
Provide all components.

Prompt 12 — Link Detail: Summary + Daily Chart

Build LinkDetailPage with simple date range and Recharts chart.

1) src/pages/LinkDetailPage.tsx:
   - Read :id from route.
   - Two inputs for date range (from/to ISO strings).
   - Fetch summary and daily; show total and a BarChart or LineChart from Recharts with X=day (YYYY-MM-DD), Y=count.
   - Handle loading, empty, and error states.

2) src/components/ClicksChart.tsx:
   - Generic chart component that accepts [{day,count}] and renders Recharts chart.
   - If there are gaps, show 0 bars for missing days by filling client-side.

3) Acceptance:
   - Navigating from list -> detail shows chart populated from seed data.
   - Changing dates updates chart and summary.
Provide code.

Prompt 13 — Polishing: Empty/Loading/Error UX

Improve UX.

1) Add small Spinner component and an Alert component (unstyled or minimal CSS).
2) Ensure CreateLinkForm shows server validation errors under fields; show a top-level error for 409 (slug taken).
3) LinksTable shows empty state when no links.
4) LinkDetailPage shows “No clicks in this range” empty state.

Acceptance: flows are clear and accessible with basic HTML semantics.
Provide diffs.

Prompt 14 — Final Seeds + README + Scripts

Finish the project scaffolding.

1) Ensure backend package.json has:
   - "dev", "start", "build", "migrate", "seed", "test" (as previously).
2) Ensure frontend has "dev", "build", "start".
3) Review README.md at root with:
   - Quickstart (backend migrate/seed/start; frontend start)
   - Architecture notes, assumptions, trade-offs, next steps
   - API samples (curl)
   - LLM prompts used (copy this list)
   - Switching to Postgres instructions (DATABASE_URL), and a note on date_trunc vs date()
4) Acceptance: A new reviewer can run both apps with the commands and see charts on seed data.
Provide the final README contents and any script tweaks.

Prompt 15 — Hardening Tests & CI Script (Optional if time)
Add a lightweight CI script and extra tests.

1) Add npm script "ci": "npm run build && npm test".
2) Add a test for GET /api/v1/links list shape (id, slug, targetUrl, createdAt).
3) Add a test for summary endpoint with from/to filters.
4) Ensure deterministic seeds in tests.

Acceptance: `npm run ci` passes.
Provide files.