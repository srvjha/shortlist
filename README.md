# Shortlist

An AI resume builder for students and professionals in every field, from software and data to banking, finance, consulting, marketing and design, live at [shortlist.co.in](https://shortlist.co.in). For jobs anywhere.
Write a resume in a form or in LaTeX, tailor it to a job post with AI, download a real LaTeX PDF and share it
with a link that tells you who opened it.

## What it does

- **Two editors.** A form editor for most people, and a LaTeX editor with live errors for people who want full
  control. Both render through the same 14 LaTeX templates, grouped by field (software, data, banking, finance,
  consulting, marketing, design, students and more), with spacing and font size presets and per-section or
  per-entry "space below".
- **Import.** Upload a PDF, LaTeX file or pasted text; AI reads it into an editable resume. Rule-based checks on
  the same PDF then put back anything the model got wrong: dropped lines come back as hidden bullets, sections
  follow the PDF's order, bold words stay bold, a bare tech list moves into the project's technologies, and a
  header that names its links ("LinkedIn") keeps that style.
- **Write with AI.** No resume yet: write rough notes and AI drafts a first version from them.
- **Tailoring.** Paste a job post or its URL. AI suggests changes drawn only from the person's own profile, and
  every change is shown for review before it is applied.
- **ATS checker.** A rule-based score out of 100 for how applicant tracking systems read a resume, with the exact
  fixes, in the editor or on a free public page that needs no account.
- **Editing details.** Ctrl+B or Cmd+B bolds selected words, links reorder with arrows, and the Layout menu
  sets spacing, font size and how profile links show: icon and address, icon and name, or the address alone.
- **Versions.** Every save is a version, so any earlier state can be restored. Two tabs editing the same resume
  can't silently overwrite each other: the second save is rejected and the editor asks which version to keep.
- **Share links.** Public links at `shortlist.co.in/<username>/<slug>`, one per company if you like, each with
  its own view analytics (when, how often, which city, where from). A link can hide contact details, ask for a
  password, expire, or stay pinned to the version you sent.
- **Custom templates.** Save any resume or LaTeX file as a starting point.
- **Bring your own key.** People can add their own OpenAI, Anthropic or OpenRouter key; AI limits then don't apply.
- **Plans.** Free: unlimited resumes you write yourself, 1 AI-tailored resume a month, 50 AI edits a month and
  1 AI draft. An AI request that suggests no changes is not counted. Season Pass (₹499 for 6 months, 40 tailored
  a month) and Pro (₹129 a month, 60) raise the AI limits. The app shows what is left in the sidebar and the AI
  panel, and every plan button opens Dodo checkout directly.
- **Public site.** A page per template, resume guides and docs, all in the sitemap for search engines.
- **Admin dashboard** at `/admin` for the emails in `ADMIN_EMAILS`: product numbers, users (with suspend, sign
  out and free plans), AI cost, revenue, content, PostHog traffic and system health.

Sign-in is Google or GitHub, plus one-click guest accounts in development. Sign in with ChatGPT is built and
turns on once OpenAI grants partner access.

## Repository

| Folder      | What it is                                                                         | Hosted on               |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------- |
| `frontend/` | TanStack Start (React 19, Vite), TanStack Router and Query, shadcn/ui, Tailwind v4 | Vercel                  |
| `backend/`  | Express 5 API, Drizzle ORM on Postgres 17, Better Auth, Tectonic LaTeX compiler    | Docker Compose on a VPS |
| `.github/`  | CI for both apps, and the backend deploy                                           | GitHub Actions          |

Each app has its own README with setup, scripts and layout: [frontend](frontend/README.md),
[backend](backend/README.md). Coding rules for people and agents are in [CLAUDE.md](CLAUDE.md) and
[AGENTS.md](AGENTS.md).

## Run it locally

You need Node 24, pnpm 11, Docker and [Tectonic](https://tectonic-typesetting.github.io) (`brew install tectonic`).

```sh
# API on http://localhost:4000
cd backend
pnpm install
cp .env.example .env              # set BETTER_AUTH_SECRET: openssl rand -hex 32
pnpm services:up                  # Postgres in Docker
pnpm db:migrate && pnpm db:seed
pnpm dev

# App on http://localhost:3000, in a second terminal
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

Use "Continue as guest" to sign in before any OAuth app is set up. Without an AI key, AI features return a clear
error and everything else works.

## How production fits together

```
shortlist.co.in  ->  Vercel (frontend)
                        |  fetch with the session cookie (shared on .shortlist.co.in)
api.shortlist.co.in  ->  VPS: shared Caddy (HTTPS)  ->  shortlist-api  ->  Postgres
                                                           |-> compiler (isolated, no internet)
                                                           |-> Cloudflare R2 (PDFs, uploads, backups)
                                                           |-> OpenAI, PostHog, Dodo
                         worker (scheduled cleanup), backup (nightly, encrypted, to R2)
```

- DNS is on Cloudflare, with every record set to DNS only.
- The API shares the VPS and its Caddy with another app, over the `caddy-edge` network; Postgres and the
  compiler sit on private networks. See [backend/README.md](backend/README.md#deploy-to-the-vps).
- The API tells search engines to stay out (`robots.txt` and a `noindex` header), so only the website is indexed.
- There is no Redis. Rate limits count in memory, scheduled jobs take Postgres advisory locks, and webhook
  de-duplication is a Postgres table.

## Deploys

- **Frontend:** Vercel builds every push to `main` (project root `frontend`).
- **Backend:** `.github/workflows/deploy-backend.yml` runs on pushes to `main` that change `backend/`. It runs
  typecheck, lint and tests, then connects to the VPS over SSH (pinned host key), checks out the exact commit
  that passed, rebuilds with Docker Compose and checks `https://api.shortlist.co.in/health`. Migrations run when
  the API starts. Frontend-only pushes never touch the VPS.
- **CI:** `.github/workflows/ci.yml` checks both apps on every push and pull request.
- **Uptime:** `.github/workflows/uptime.yml` calls `https://api.shortlist.co.in/health/deep` (which also checks
  Postgres and the compiler) and the website every 5 minutes, and GitHub emails on a failed run.

Secrets for the deploy live in GitHub Actions: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (a key used only for
deploys) and `VPS_FINGERPRINT` (the server's ECDSA host key).

## Analytics and privacy

PostHog receives page views, product events (ids, counts and choices, never resume content) and sampled API
timings. Links tagged with `utm_source` and `utm_campaign` show up per campaign, with sign-ups, on the admin
Traffic page. Session recordings mask all text and inputs. The admin dashboard reads PostHog back through the API, so
the personal API key never reaches a browser.

## Contributing

Shortlist is open source and contributions are welcome: bug fixes, new templates, guides, accessibility and
performance work. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and look for issues labelled
[`good first issue`](https://github.com/srvjha/shortlist/labels/good%20first%20issue).

Found a security problem? Email support@shortlist.co.in instead of opening an issue.

## License

[MIT](LICENSE). You can use, change and share the code; keep the copyright notice.
