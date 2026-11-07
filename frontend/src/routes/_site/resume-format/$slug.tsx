import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { CheckIcon, XIcon } from 'lucide-react'
import { FaqList } from '@/components/site/faq-list'
import { Button } from '@/components/ui/button'
import { findFormatPage, formatPages } from '@/lib/format-pages'
import { breadcrumbs, site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'

const h2 = 'font-sans text-xl font-semibold'

export const Route = createFileRoute('/_site/resume-format/$slug')({
  loader: ({ params }) => {
    if (!findFormatPage(params.slug)) throw notFound()
  },
  head: ({ params }) => {
    const page = findFormatPage(params.slug)
    if (!page) return {}
    const heading = `${page.role} Resume Format`
    const title = `${heading} (Free Sample, ATS-Friendly) | ${site.name}`
    const url = `${site.url}/resume-format/${page.slug}`
    const description =
      page.intro.length > 160
        ? `${page.intro.slice(0, page.intro.lastIndexOf(' ', 157))}…`
        : page.intro
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        {
          property: 'og:image',
          content: `${site.url}/formats/${page.slug}.png`,
        },
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            breadcrumbs([
              ['Resume formats', `${site.url}/resume-format`],
              [heading, url],
            ]),
          ),
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          }),
        },
      ],
    }
  },
  component: FormatPageView,
})

function FormatPageView() {
  const { slug } = Route.useParams()
  const page = findFormatPage(slug)!
  const template = templateCatalog.find((t) => t.id === page.templateId)!
  const others = formatPages.filter((p) => p.slug !== page.slug).slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-24 lg:pt-20">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/resume-format" className="hover:text-foreground">
          Resume formats
        </Link>
        <span aria-hidden> / </span>
        <span>{page.role}</span>
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {page.role} Resume Format
          </h1>
          <p className="text-lg text-muted-foreground">{page.intro}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/resumes/new" search={{ template: template.id }}>
                Use this format free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/ats-checker">Check your current resume</Link>
            </Button>
          </div>

          <section
            aria-labelledby="layout"
            className="mt-4 flex flex-col gap-3"
          >
            <h2 id="layout" className={h2}>
              The layout: {template.name}
            </h2>
            <p>{page.layoutWhy}</p>
          </section>

          <section aria-labelledby="order" className="flex flex-col gap-3">
            <h2 id="order" className={h2}>
              Sections, in this order
            </h2>
            <ol className="flex flex-col gap-4">
              {page.sections.map((section, index) => (
                <li key={section.name} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{section.name}</p>
                    <p className="text-muted-foreground">{section.why}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <figure className="lg:sticky lg:top-24 lg:self-start">
          <img
            src={`/formats/${page.slug}.png`}
            alt={`Sample ${page.role.toLowerCase()} resume in this format, filled in for a made-up person`}
            width={1020}
            height={1320}
            className="aspect-17/22 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5"
          />
          <figcaption className="mt-3 text-sm text-muted-foreground">
            A sample for a made-up person, in the {template.name} template.
          </figcaption>
        </figure>
      </div>

      <div className="mt-20 grid gap-16 lg:grid-cols-2">
        <section aria-labelledby="skills" className="flex flex-col gap-4">
          <h2 id="skills" className={h2}>
            Skills to list, grouped
          </h2>
          <dl className="flex flex-col gap-3">
            {page.skills.map((group) => (
              <div key={group.group} className="rounded-lg border bg-card p-4">
                <dt className="text-sm font-medium">{group.group}</dt>
                <dd className="mt-1 text-muted-foreground">
                  {group.items.join(', ')}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            List only what you could answer interview questions on, and match
            the words the job description uses.
          </p>
        </section>

        <section aria-labelledby="examples" className="flex flex-col gap-4">
          <h2 id="examples" className={h2}>
            From a weak bullet to a strong one
          </h2>
          {page.examples.map((example) => (
            <dl
              key={example.after}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Before
                </dt>
                <dd className="text-muted-foreground line-through decoration-muted-foreground/40">
                  {example.before}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-primary">After</dt>
                <dd>{example.after}</dd>
              </div>
            </dl>
          ))}
        </section>

        <section aria-labelledby="india" className="flex flex-col gap-4">
          <h2 id="india" className={h2}>
            Applying in India
          </h2>
          <ul className="flex flex-col gap-2">
            {page.indiaTips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <CheckIcon
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="mistakes" className="flex flex-col gap-4">
          <h2 id="mistakes" className={h2}>
            Mistakes to avoid
          </h2>
          <ul className="flex flex-col gap-2">
            {page.mistakes.map((mistake) => (
              <li key={mistake} className="flex gap-2">
                <XIcon
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-destructive"
                />
                {mistake}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="tailor"
        className="mt-20 rounded-2xl border bg-card p-6 sm:p-8"
      >
        <h2 id="tailor" className="text-2xl font-semibold tracking-tight">
          Start from this format, then fit it to each job
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Fill in a simple form or import the resume you have, and {site.name}{' '}
          lays it out in the {template.name} template. Paste a job description
          and the AI suggests changes using only what is in your resume, and you
          keep the ones you like. Building your resume is free.
        </p>
        <Button size="lg" asChild className="mt-6">
          <Link to="/resumes/new" search={{ template: template.id }}>
            Build my {page.role.toLowerCase()} resume
          </Link>
        </Button>
      </section>

      <section aria-labelledby="faq" className="mt-24 max-w-3xl">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight">
          {page.role} resume FAQ
        </h2>
        <FaqList faqs={page.faqs} className="mt-4" />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="more" className="mt-24">
          <h2 id="more" className="text-2xl font-semibold tracking-tight">
            Resume formats for other roles
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  to="/resume-format/$slug"
                  params={{ slug: other.slug }}
                  className="inline-flex min-h-11 items-center rounded-full bg-secondary px-4 hover:bg-accent"
                >
                  {other.role}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
