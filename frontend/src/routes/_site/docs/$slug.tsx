import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { docs, findDoc, prose } from '@/lib/docs'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_site/docs/$slug')({
  loader: ({ params }) => {
    const doc = findDoc(params.slug)
    if (!doc) throw notFound()
    return { slug: doc.slug }
  },
  head: ({ params }) => {
    const doc = findDoc(params.slug)
    if (!doc) return {}
    const title = `${doc.title} | ${site.name} docs`
    const url = `${site.url}/docs/${doc.slug}`
    return {
      meta: [
        { title },
        { name: 'description', content: doc.summary },
        { property: 'og:title', content: title },
        { property: 'og:url', content: url },
      ],
      links: [{ rel: 'canonical', href: url }],
    }
  },
  component: DocArticle,
})

function DocArticle() {
  const { slug } = Route.useLoaderData()
  const doc = findDoc(slug)!
  const index = docs.indexOf(doc)
  const previous = docs[index - 1] as (typeof docs)[number] | undefined
  const next = docs[index + 1] as (typeof docs)[number] | undefined

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_12rem]">
      <article className="flex min-w-0 flex-col gap-10">
        <header className="flex max-w-2xl flex-col gap-2">
          <p className="text-sm font-medium text-primary">{doc.group}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{doc.title}</h1>
          <p className="text-lg text-muted-foreground">{doc.summary}</p>
        </header>

        {doc.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="flex max-w-2xl scroll-mt-24 flex-col gap-4"
          >
            <h2
              id={`${section.id}-title`}
              className="group font-sans text-xl font-semibold"
            >
              {section.title}
              <a
                href={`#${section.id}`}
                aria-label={`Link to ${section.title}`}
                className="ml-2 text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                #
              </a>
            </h2>
            <div className={prose}>{section.body}</div>
          </section>
        ))}

        <nav
          aria-label="More docs"
          className="grid max-w-2xl gap-3 border-t pt-8 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              to="/docs/$slug"
              params={{ slug: previous.slug }}
              className="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowLeftIcon aria-hidden className="size-3.5" />
                Previous
              </span>
              <span className="font-medium">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to="/docs/$slug"
              params={{ slug: next.slug }}
              className="flex flex-col gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                Next
                <ArrowRightIcon aria-hidden className="size-3.5" />
              </span>
              <span className="font-medium">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      <aside aria-label="On this page" className="hidden xl:block">
        <div className="sticky top-24 flex flex-col gap-3 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            On this page
          </p>
          <ul className="flex flex-col gap-2">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
