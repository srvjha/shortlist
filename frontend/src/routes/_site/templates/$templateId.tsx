import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { FaqList } from '@/components/site/faq-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { breadcrumbs, site } from '@/lib/site'
import { templatePages } from '@/lib/template-pages'
import { categoryName, templateCatalog } from '@/lib/templates'

const findTemplate = (id: string) => templateCatalog.find((t) => t.id === id)

export const Route = createFileRoute('/_site/templates/$templateId')({
  loader: ({ params }) => {
    if (!findTemplate(params.templateId)) throw notFound()
  },
  head: ({ params }) => {
    const template = findTemplate(params.templateId)
    if (!template) return {}
    const page = templatePages[template.id]
    const title = `${page.heading} (Free${template.atsSafe ? ', ATS-Friendly' : ''}) | ${site.name}`
    const url = `${site.url}/templates/${template.id}`
    const description =
      page.intro.length > 160
        ? `${page.intro.slice(0, page.intro.lastIndexOf(' ', 157))}…`
        : page.intro
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:url', content: url },
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            breadcrumbs([
              ['Resume templates', `${site.url}/templates`],
              [page.heading, url],
            ]),
          ),
        },
      ],
    }
  },
  component: TemplatePage,
})

function TemplatePage() {
  const { templateId } = Route.useParams()
  const template = findTemplate(templateId)!
  const page = templatePages[template.id]
  const related = templateCatalog
    .filter(
      (t) =>
        t.id !== template.id &&
        t.categories.some((c) =>
          (template.categories as readonly string[]).includes(c),
        ),
    )
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-24 lg:pt-20">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/templates" className="hover:text-foreground">
          Resume templates
        </Link>
        <span aria-hidden> / </span>
        <span>{template.name}</span>
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {page.heading}
          </h1>
          <p className="text-lg text-muted-foreground">{page.intro}</p>
          <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
            {template.atsSafe && (
              <li>
                <Badge variant="outline">ATS-friendly</Badge>
              </li>
            )}
            {template.categories.map((id) => (
              <li key={id}>
                <Badge variant="secondary">{categoryName(id)}</Badge>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/resumes/new" search={{ template: template.id }}>
                Use this template free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/ats-checker">Check your current resume</Link>
            </Button>
          </div>

          <section aria-labelledby="who" className="mt-4 flex flex-col gap-3">
            <h2 id="who" className="font-sans text-xl font-semibold">
              Who it's for
            </h2>
            <p>{page.whoFor}</p>
          </section>

          <section aria-labelledby="includes" className="flex flex-col gap-3">
            <h2 id="includes" className="font-sans text-xl font-semibold">
              What's in the {template.name} template
            </h2>
            <ul className="flex flex-col gap-2">
              {page.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckIcon
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="tips" className="flex flex-col gap-3">
            <h2 id="tips" className="font-sans text-xl font-semibold">
              Tips for filling it in
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              {page.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="example" className="flex flex-col gap-3">
            <h2 id="example" className="font-sans text-xl font-semibold">
              From a weak bullet to a strong one
            </h2>
            <dl className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Before
                </dt>
                <dd className="text-muted-foreground line-through decoration-muted-foreground/40">
                  {page.example.before}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-primary">After</dt>
                <dd>{page.example.after}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              A strong bullet says what you did, with what, and what changed.
            </p>
          </section>

          <section aria-labelledby="how" className="flex flex-col gap-3">
            <h2 id="how" className="font-sans text-xl font-semibold">
              How it works
            </h2>
            <p className="text-muted-foreground">
              Fill in a simple form or import the resume you already have, and{' '}
              {site.name} typesets it with LaTeX for you, no LaTeX knowledge
              needed. Paste a job description to tailor it for each application,
              switch templates anytime without retyping, and download a PDF.
              Building resumes is free.
            </p>
          </section>
        </div>

        <img
          src={`/templates/${template.id}.png`}
          alt={`${template.name} resume template filled in with a sample resume`}
          width={1020}
          height={1320}
          className="aspect-17/22 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5"
        />
      </div>

      <section aria-labelledby="faq" className="mt-24 max-w-3xl">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight">
          {template.name} template FAQ
        </h2>
        <FaqList faqs={page.faqs} className="mt-4" />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-24">
          <h2 id="related" className="text-2xl font-semibold tracking-tight">
            Similar templates
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {related.map((t) => (
              <li key={t.id}>
                <Link
                  to="/templates/$templateId"
                  params={{ templateId: t.id }}
                  className="group flex flex-col gap-3"
                >
                  <img
                    src={`/templates/${t.id}.png`}
                    alt=""
                    width={1020}
                    height={1320}
                    loading="lazy"
                    className="aspect-17/22 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5"
                  />
                  <span className="font-medium group-hover:underline">
                    {templatePages[t.id].heading}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
