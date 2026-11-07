# Shortlist API

Express 5 + TypeScript backend for Shortlist: auth, resumes and versions, LaTeX compilation, AI import and
tailoring, share links and their analytics, billing and the admin dashboard. The frontend lives in `../frontend`.

## Run locally

Requirements: Node 24, pnpm 11, Docker, and [Tectonic](https://tectonic-typesetting.github.io) (`brew install tectonic`).

```sh
pnpm install
cp .env.example .env              # then set BETTER_AUTH_SECRET: openssl rand -hex 32
pnpm services:up                  # Postgres in Docker
pnpm db:migrate && pnpm db:seed   # tables + templates
pnpm dev                          # API on http://localhost:4000
pnpm worker                       # optional: scheduled maintenance jobs
```

- Before OAuth apps are set up, use "Continue as guest" on the sign-in page (on by default in development).
- Without an AI key, AI endpoints return `AI_NOT_CONFIGURED`; everything else works.
- In development, LaTeX compiles inside the API process. Production uses the separate compiler service.
- To open `/admin` locally, put your sign-in email in `ADMIN_EMAILS`.

## Scripts

| Script                                         | What it does                                              |
| ---------------------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                                     | API with reload                                           |
| `pnpm worker`                                  | Background worker (subscription expiry, cleanup)          |
| `pnpm compiler`                                | Standalone LaTeX compiler service, as used in production  |
| `pnpm test`                                    | Unit tests (template tests need Tectonic installed)       |
| `pnpm lint` / `pnpm format` / `pnpm typecheck` | Code quality                                              |
| `pnpm db:generate`                             | Create a migration after changing `src/db/schema`         |
| `pnpm db:migrate` / `pnpm db:seed`             | Apply migrations / sync templates (development)           |
| `pnpm db:studio`                               | Browse the database                                       |
| `pnpm openapi`                                 | Regenerate `openapi.json` for the frontend's typed client |
| `pnpm build` then `pnpm start`                 | Production build                                          |

After changing any API schema, run `pnpm openapi` here and `pnpm api:types` in `../frontend`.

## Layout

```
src/
  server.ts            API entry            worker.ts          scheduled jobs
  app.ts               middleware + routes  compiler-server.ts isolated LaTeX compiler
  config/env.ts        validated env vars   openapi.ts         API spec from Zod schemas
  db/                  Drizzle schema, client, seed
  jobs/                maintenance tasks the worker runs
  lib/                 auth, ai (models, pricing), latex, storage, analytics (PostHog), errors
  middleware/          requireAuth, requireAdmin, validate, rate limits, request metrics, errors
  modules/<name>/      routes -> controller -> service, plus Zod schemas
  schemas/             resume content schema shared by every module
  templates/           LaTeX templates (Developer, Jake's Resume, Compact, Modern)
drizzle/               SQL migrations
deploy/                Caddy block for the VPS's existing Caddy, backup script
test/                  unit tests (Vitest)
```

Services never touch `req`/`res`, so the same logic can be reused by the worker or a future MCP server.
The API is resource-oriented: actions like restoring or applying an AI suggestion are modelled as creating a
version (`POST /v1/resumes/:id/versions`), not as action URLs.

## API

The full spec is served at `GET /v1/openapi.json` and committed as `openapi.json`. Auth is handled by Better Auth
under `/api/auth/*` (session cookie). Errors always look like `{ "error": { "code", "message", "details" } }`.

| Area                  | Endpoints                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Account               | `GET/PATCH/DELETE /v1/me`, `GET /v1/me/data`, `GET /v1/usernames/:username`, `GET /v1/usage`                                         |
| Own AI key            | `GET/PUT/DELETE /v1/me/ai-key`                                                                                                       |
| Profile and templates | `GET/PUT /v1/profile`, `GET /v1/templates`, `/v1/custom-templates`, `/v1/custom-templates/:id`                                       |
| Resumes               | `GET/POST /v1/resumes`, `GET/PATCH/DELETE /v1/resumes/:id`                                                                           |
| Versions              | `GET/POST /v1/resumes/:id/versions`, `GET/PATCH /v1/resumes/:id/versions/:versionId`                                                 |
| Output                | `GET /v1/resumes/:id/pdf`, `/tex`, `/json-resume`, `POST /v1/previews`                                                               |
| Import                | `POST /v1/uploads`, `GET /v1/uploads/:id`, `POST /v1/imports`                                                                        |
| Jobs and AI           | `/v1/jobs`, `/v1/resumes/:id/suggestions`, `/v1/resumes/:id/suggestions/:id`, `/v1/resumes/:id/coverage`                             |
| Sharing               | `/v1/resumes/:id/share-links`, `/v1/share-links/:id`, `/v1/share-links/:id/stats`, `GET /v1/analytics`                               |
| Public                | `GET /v1/public/users/:username`, `/v1/public/users/:username/resumes/:slug` (+ `/pdf`)                                              |
| Billing               | `POST /v1/checkouts`, `GET/DELETE /v1/subscription`, `POST /v1/webhooks/dodo`                                                        |
| Admin                 | `/v1/admin/overview`, `/users`, `/users/:id` (+ `/sessions`, `/subscriptions`), `/ai`, `/revenue`, `/content`, `/traffic`, `/system` |

## Admin

`/v1/admin/*` is open only to signed-in users whose email is in `ADMIN_EMAILS` and verified by their sign-in
provider (`src/middleware/require-admin.ts`, tested in `test/admin.test.ts`). Admins can suspend and restore
accounts (a suspended user can't start a session), sign a user out everywhere, and give a Season Pass or Pro for
free. Plans paid through Dodo are cancelled or refunded in Dodo, not here, so nobody keeps being billed.

The traffic report queries PostHog with HogQL using `POSTHOG_PERSONAL_API_KEY`, and caches results in memory for
five minutes because PostHog rate-limits its query API. Admin actions are sent to PostHog as `admin_*` events.

## Credentials

Every variable is listed in `.env.example`. Where to get them:

| Variable                                                                  | Source                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`, `AI_KEY_ENCRYPTION_SECRET`, `BACKUP_ENCRYPTION_KEY` | `openssl rand -hex 32`. Keep a copy of the backup key outside the server; never change the AI key secret once users have saved keys         |
| `POSTGRES_PASSWORD`                                                       | `openssl rand -hex 24` (production only; Postgres reads it once, when its volume is first created)                                          |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY`             | Provider dashboard; set `AI_PROVIDER` to match                                                                                              |
| `GOOGLE_CLIENT_ID/SECRET`                                                 | Google Cloud Console, OAuth client, redirect `<BETTER_AUTH_URL>/api/auth/callback/google`                                                   |
| `GITHUB_CLIENT_ID/SECRET`                                                 | GitHub Developer Settings, OAuth App (one per environment), callback `<BETTER_AUTH_URL>/api/auth/callback/github`                           |
| `CHATGPT_CLIENT_ID/SECRET`                                                | Partner access only for now: apply at openai.com/form/sign-in-with-chatgpt-interest, redirect `<BETTER_AUTH_URL>/api/auth/callback/chatgpt` |
| `R2_*`                                                                    | Cloudflare dashboard, R2, bucket + Account API token with Object Read & Write on it                                                         |
| `POSTHOG_KEY`, `POSTHOG_HOST`                                             | PostHog, Settings, Project, the project token and your region's ingest host                                                                 |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`                          | PostHog, Settings, Personal API keys, scopes `query:read` and `session_recording:read`; the ID is in the URL                                |
| `ADMIN_EMAILS`                                                            | Comma-separated emails allowed into `/admin`                                                                                                |
| `DODO_PAYMENTS_API_KEY`                                                   | Dodo dashboard, Developer, API Keys (test and live mode have separate keys)                                                                 |
| `DODO_PAYMENTS_ENVIRONMENT`                                               | `test_mode` or `live_mode`, matching the key                                                                                                |
| `DODO_PAYMENTS_WEBHOOK_KEY`                                               | Dodo dashboard, Developer, Webhooks, URL `<BETTER_AUTH_URL>/v1/webhooks/dodo`; events listed in `.env.example`                              |
| `DODO_PRODUCT_PRO`, `DODO_PRODUCT_LIFETIME`                               | Printed by `pnpm dodo:products`                                                                                                             |
| `JINA_API_KEY`                                                            | Optional, jina.ai, raises the limit for fetching job posts by URL                                                                           |

## Deploy to the VPS

The production stack (`docker-compose.prod.yml`) runs the API, the worker, the LaTeX compiler, Postgres and
nightly encrypted backups. HTTPS comes from the one Caddy on the VPS, shared with another app. Only the API
joins the shared `caddy-edge` network, as the service `shortlist-api` (never a generic name like `api`, which
Compose would register on that network and collide with another app's service). Postgres and the other internals
stay on the private `shortlist-backend` network.

The compiler runs untrusted LaTeX, so it holds no secrets, has no internet access (the TeX packages are
downloaded when the image is built), runs as a non-root user on a read-only filesystem, and has CPU, memory and
process limits. Postgres and the compiler are on internal networks only.

First setup:

1. Harden the server once: create a sudo user, log in with SSH keys, disable root and password login, allow only
   ports 22, 80 and 443 (`ufw`), install `fail2ban` and `unattended-upgrades`, install Docker. Add a swap file.
2. Point DNS for `api.shortlist.co.in` at the server (an `A` record, DNS only if the domain is on Cloudflare).
3. Clone only the backend:
   ```sh
   git clone --filter=blob:none --sparse https://github.com/srvjha/shortlist.git ~/shortlist
   cd ~/shortlist && git sparse-checkout set backend && cd backend
   ```
4. Create `.env.production` from `.env.example` with production values (`NODE_ENV=production`,
   `STORAGE_DRIVER=r2`, `FRONTEND_URL=https://shortlist.co.in`, `BETTER_AUTH_URL=https://api.shortlist.co.in`,
   `COOKIE_DOMAIN=.shortlist.co.in`). The shared `caddy-edge` network must exist (`docker network create caddy-edge`),
   with the Caddy container attached to it.
   Leave out `DATABASE_URL` and `COMPILER_URL`; the compose file sets them. Keep the file at `chmod 600`.
5. Start it:
   ```sh
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
   The API container applies migrations and syncs templates on every start.
6. Append `deploy/Caddyfile` to the existing Caddy's Caddyfile, then validate and reload that Caddy:
   ```sh
   docker exec <caddy> caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
   docker exec <caddy> caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
   ```
   Commit the Caddyfile change in the other app's repo so its deploys keep the block.

After that, every push to `main` that changes `backend/` deploys itself through
`.github/workflows/deploy-backend.yml` (checks, then SSH, pull, rebuild and a health check).

Two health endpoints: `GET /health` only says the process is up (deploys wait on it), and `GET /health/deep`
also runs a query on Postgres and pings the compiler, answering 503 with the part that is down.
`.github/workflows/uptime.yml` calls the deep one every 5 minutes and GitHub emails on failure.

After editing `.env.production` on the server, recreate the containers so they read it (a plain `restart` keeps
the old values):

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api worker
```

## Backups

The `backup` service dumps Postgres every 24 hours, encrypts it with `BACKUP_ENCRYPTION_KEY` and uploads it to
`backups/postgres/` in the R2 bucket. The admin dashboard's System page warns when the newest backup is more
than two days old. Add an R2 lifecycle rule to delete old backups (for example after 30 days).

Restore (test this once before launch):

```sh
aws s3 cp s3://$R2_BUCKET/backups/postgres/<file>.sql.gz.enc . --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in <file>.sql.gz.enc | gunzip \
  | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d resumebuilder
```
