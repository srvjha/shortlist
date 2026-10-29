import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { prose } from '@/lib/docs'
import { findGuide, guides } from '@/lib/guides'
import { breadcrumbs, site } from '@/lib/site'

export const Route = createFileRoute('/_site/guides/$slug')({
  loader: ({ params }) => {
    if (!findGuide(params.slug)) throw notFound()
  },
  head: ({ params }) => {
    const guide = findGuide(params.slug)
    if (!guide) return {}
    const url = `${site.url}/guides/${guide.slug}`
    const title = `${guide.seoTitle} | ${site.name}`
    return {
      meta: [
        { title },
        { name: 'description', content: guide.summary },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: title },
        { property: 'og:url', content: url },
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.title,
            description: guide.summary,
            dateModified: guide.updated,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: site.name, url: site.url },
            publisher: {
              '@type': 'Organization',
              name: site.name,
              url: site.url,
            },
          }),
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            breadcrumbs([
              ['Resume guides', `${site.url}/guides`],
              [guide.title, url],
            ]),
          ),
        },
      ],
    }
  },
  component: GuideArticle,
})

function GuideArticle() {
  const { slug } = Route.useParams()
  const guide = findGuide(slug)!
  const others = guides.filter((g) => g !== guide)

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-10 px-5 pt-14 pb-24 lg:pt-20">
      <header className="flex flex-col gap-3">
        <Link to="/guides" className="text-sm font-medium text-primary">
          Guides
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {guide.title}
        </h1>
        <p className="text-lg text-muted-foreground">{guide.summary}</p>
        <p className="text-sm text-muted-foreground">
          Updated{' '}
          <time dateTime={guide.updated}>
            {new Date(guide.updated).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </p>
      </header>

      {guide.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="flex scroll-mt-24 flex-col gap-4"
        >
          <h2
            id={`${section.id}-title`}
            className="font-sans text-2xl font-semibold"
          >
            {section.title}
          </h2>
          <div className={prose}>{section.body}</div>
        </section>
      ))}

      <aside className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-6">
        <p className="text-lg font-semibold">
          Build a resume that follows this guide, free
        </p>
        <Button asChild>
          <Link to="/login" search={{ mode: 'signup' }}>
            Build my resume
          </Link>
        </Button>
      </aside>

      {others.length > 0 && (
        <nav
          aria-label="More guides"
          className="flex flex-col gap-2 border-t pt-8"
        >
          <p className="text-sm text-muted-foreground">More guides</p>
          {others.map((g) => (
            <Link
              key={g.slug}
              to="/guides/$slug"
              params={{ slug: g.slug }}
              className="font-medium hover:underline"
            >
              {g.title}
            </Link>
          ))}
        </nav>
      )}
    </article>
  )
}
