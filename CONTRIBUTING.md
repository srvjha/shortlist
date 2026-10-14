# Contributing to Shortlist

Thanks for helping. Shortlist is a small project, so a clear issue or a focused pull request goes a long way.

## Ways to help

- **Fix a bug.** Open issues are labelled [`bug`](https://github.com/srvjha/shortlist/labels/bug); newcomers can
  start with [`good first issue`](https://github.com/srvjha/shortlist/labels/good%20first%20issue).
- **Report a bug.** Say what you did, what you expected and what happened instead. A screenshot, the browser and,
  for import problems, the kind of file (PDF from Overleaf, Word, Canva) help most. Never attach a resume with
  someone's real details.
- **Add or improve a template.** Templates live in `backend/src/templates/`; see below.
- **Write a guide.** Guides for students and job seekers live in `frontend/src/lib/guides.tsx`.
- **Accessibility and performance.** Anything that makes the app faster or easier to use with a keyboard or
  screen reader is welcome.

For anything bigger than a bug fix, open an issue first and describe the change, so we can agree on the approach
before you write the code.

## Set up

Follow [Run it locally](README.md#run-it-locally) in the README. You need Node 24, pnpm 11, Docker and
[Tectonic](https://tectonic-typesetting.github.io); without Tectonic, the tests that compile LaTeX are skipped.
You don't need an AI key: AI features return a clear error and everything else works.

## Make a change

1. Fork the repo and create a branch from `main`.
2. Keep each commit to one change, with a message that says what it does in plain words, for example
   "Keep a project's stack on its heading line when there is no date".
3. Add a test for any logic you change, one that fails without your fix. Backend tests are in `backend/test/`.
4. Run the same checks CI runs:

   ```sh
   cd backend && pnpm typecheck && pnpm lint && pnpm test
   cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm build
   ```

5. Open a pull request that says what changed, why, and how you checked it. Add before and after screenshots for
   anything you can see.

CI must pass before a pull request is merged.

## Conventions

The full rules are in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md). The ones that come up most:

- **Reuse before adding.** Look for an existing helper or component first, and avoid new dependencies.
- **API changes.** Endpoints are resource-oriented REST, and Zod schemas validate both input and output. After
  changing one, run `pnpm openapi` in `backend/`, then `pnpm api:types` in `frontend/`, and commit both files.
- **Database changes.** Edit the schema in `backend/src/db/schema/`, then run `pnpm db:generate` and commit the
  migration.
- **UI.** Use the existing tokens in `frontend/src/styles.css` and the shadcn/ui components. Light mode is an
  off-white paper colour, never pure white, and there is no purple.
- **Writing.** Plain, short sentences in code, copy and docs. No em dashes. Comments only where the code can't
  explain itself.
- **Secrets.** Never commit a real key. New settings go in `.env.example` with a comment on where to get them.

## Templates

Each template is one file in `backend/src/templates/` and is registered in `index.ts`. A new template needs:

- a preview image in `frontend/public/templates/`, plus a small copy for the landing page grid in
  `templates/thumbs/` (`cwebp -q 82 -resize 560 0 <id>.png -o thumbs/<id>.webp`),
- an entry in `frontend/src/lib/templates.ts` and copy in `frontend/src/lib/template-pages.ts`,
- passing tests in `backend/test/templates.test.ts`, which compile every template with full, empty and edge-case
  content.

Changing an existing template's default output breaks a test on purpose, so a change to every user's resume is
never accidental. If the change is intended, update the expected hash in the same commit and say why.

## Security

Please don't report security problems in a public issue. Email **support@shortlist.co.in** with the details and
steps to reproduce, and you'll get a reply within a few days.

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE), the same as the
rest of the project.
