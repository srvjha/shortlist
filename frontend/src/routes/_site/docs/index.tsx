import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { docGroups, docs } from '@/lib/docs'
import { site } from '@/lib/site'

const title = `Docs: How the AI Resume Builder Works | ${site.name}`
const description = `How ${site.name} works: writing and importing resumes, templates, tailoring with AI, the ATS checker, share links, plans and your data.`

export const Route = createFileRoute('/_site/docs/')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:url', content: `${site.url}/docs` },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/docs` }],
  }),
  component: DocsIndex,
})

function DocsIndex() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {site.name} docs
        </h1>
        <p className="text-lg text-muted-foreground">
          Everything {site.name} does and how to use it, from your first resume
          to tailoring it for every job.
        </p>
        <Link
          to="/docs/$slug"
          params={{ slug: 'getting-started' }}
          className="mt-1 inline-flex w-fit items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          Start with Getting started
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </header>
      {docGroups.map((group) => (
        <section
          key={group}
          aria-labelledby={`group-${group}`}
          className="flex flex-col gap-4"
        >
          <h2
            id={`group-${group}`}
            className="font-sans text-sm font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {group}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs
              .filter((doc) => doc.group === group)
              .map((doc) => (
                <li key={doc.slug}>
                  <Link
                    to="/docs/$slug"
                    params={{ slug: doc.slug }}
                    className="flex h-full flex-col gap-1.5 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="font-medium">{doc.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {doc.summary}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
