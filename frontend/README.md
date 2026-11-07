# Shortlist web app

TanStack Start (React 19, Vite) frontend for Shortlist. It talks to the Express API in `../backend` through a
typed client generated from the API's OpenAPI spec.

## Run locally

Start the backend first (see `../backend/README.md`), then:

```sh
pnpm install
cp .env.example .env   # defaults point at http://localhost:4000
pnpm dev               # http://localhost:3000
```

Sign in with "Continue as guest" (shown in development), or with Google or GitHub once their OAuth apps are set
up in the backend. To see the admin dashboard, sign in with an email listed in the backend's `ADMIN_EMAILS`.

## Scripts

| Script                        | What it does                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`                    | Dev server on port 3000                                                               |
| `pnpm build` / `pnpm preview` | Production build and local preview                                                    |
| `pnpm lint` / `pnpm format`   | ESLint and Prettier                                                                   |
| `pnpm generate-routes`        | Regenerate `src/routeTree.gen.ts` (the dev server does this on its own)               |
| `pnpm api:types`              | Regenerate `src/lib/api/schema.d.ts` from `../backend/openapi.json` after API changes |

## Layout

```
src/
  routes/
    _site/*            public pages: landing, pricing, templates, ATS checker, docs, privacy, terms
    login.tsx          sign in (Google, GitHub, ChatGPT when enabled, guest in development)
    _app/*             signed-in app, rendered in the browser only:
                         dashboard      overview, stats and getting started
                         workspace      all resumes
                         resumes/*      new resume flow and the editor
                         my-templates/* saved templates
                         ats            ATS checker for a saved resume
                         profile, jobs, analytics
                         billing        plans, usage and checkout
                         settings       account, AI provider keys, your data
                         admin/*        admin dashboard (overview, users, AI, revenue, content, traffic, system)
    $username/*        public profile and share pages, rendered on the server
  components/
    ui/                shadcn/ui components (generated, not linted)
    landing, site      public site
    app                app shell and shared app pieces
    editor             form editor, LaTeX editor, PDF preview, history and share panels
    ai                 tailoring, edits and change review
    admin              shared pieces of the admin pages
    analytics          charts, breakdown lists and change indicators
    public             share page rendering
  lib/
    api/               typed client (openapi-fetch), queries, types
    auth-client.ts     Better Auth client
    analytics.ts       PostHog: page views and masked session replay
    theme.tsx          light (default), dark and system themes
    site.ts            product name and URLs
```

## Design

- Light mode is the default for everyone until they pick a theme in the account menu.
- Light mode is a cool paper grey, not white; dark mode is a green-tinted charcoal. Tokens live in `src/styles.css`.
- Accent is fountain-pen teal; the highlighter color marks AI changes. No purple.
- Fonts: Source Serif 4 for headings, Hanken Grotesk for the interface, JetBrains Mono in the LaTeX editor.
- Template previews in `public/templates` are real renders from the backend's templates, made with `pnpm previews` in `backend/` from the made-up people in `src/templates/preview-resumes.ts`.
- UI work follows the `ui-ux-pro-max` skill's checks (contrast, focus states, touch targets, empty states).

## Analytics

With `VITE_POSTHOG_KEY` set, the app sends page views and links them to the signed-in user's id. Session replay
masks every piece of text and every input, so no resume content is recorded. Signing out resets the PostHog
identity.

## Deploy

Vercel builds every push to `main` (project root `frontend`, preset from `vercel.json`). Set these on the Vercel
project:

| Variable            | Production value              |
| ------------------- | ----------------------------- |
| `VITE_API_URL`      | `https://api.shortlist.co.in` |
| `VITE_SITE_URL`     | `https://shortlist.co.in`     |
| `VITE_POSTHOG_KEY`  | PostHog project token         |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com`    |

The API sets its session cookie on the shared parent domain (`COOKIE_DOMAIN=.shortlist.co.in` in the backend),
so `shortlist.co.in` and `api.shortlist.co.in` share the sign-in. `www.shortlist.co.in` permanently redirects to
`shortlist.co.in`.
