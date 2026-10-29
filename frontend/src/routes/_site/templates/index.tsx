import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  CategoryFilter,
  LoadMore,
  useLoadMore,
} from '@/components/templates/template-filters'
import { TemplatePreview } from '@/components/templates/template-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { site } from '@/lib/site'
import {
  categoryName,
  inCategory,
  templateCatalog,
  templateCategories,
} from '@/lib/templates'

// Two rows of the three-column desktop grid.
const batch = 6
const title = `Free ATS-Friendly Resume Templates for Freshers | ${site.name}`

export const Route = createFileRoute('/_site/templates/')({
  validateSearch: z.object({
    category: z
      .literal(templateCategories.map((category) => category.id))
      .optional()
      .catch(undefined),
  }),
  head: () => ({
    meta: [
      { title },
      { property: 'og:title', content: title },
      { property: 'og:url', content: `${site.url}/templates` },
      {
        name: 'description',
        content:
          '14 free resume templates for freshers, campus placements, software, data, banking, consulting and more. LaTeX-quality, ATS-friendly, one page, no LaTeX needed.',
      },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/templates` }],
  }),
  component: TemplatesPage,
})

function TemplatesPage() {
  const { category } = Route.useSearch()
  const templates = templateCatalog.filter((template) =>
    inCategory(template, category),
  )
  const { limit, listRef, more } = useLoadMore<HTMLUListElement>(
    batch,
    category,
  )

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 lg:pt-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Resume templates
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Templates for different fields, from software engineering to your
          first job out of college. Every one is typeset with LaTeX and fits one
          page. Switch between them anytime; your content stays the same.
        </p>
      </div>
      <div className="mt-10 flex flex-col gap-4">
        <CategoryFilter value={category} />
        <p className="text-sm text-muted-foreground">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          {category && ` for ${categoryName(category)}`}
        </p>
      </div>
      {templates.length === 0 ? (
        <Empty className="mt-10 border">
          <EmptyHeader>
            <EmptyTitle>
              No {category && categoryName(category)} templates yet
            </EmptyTitle>
            <EmptyDescription>
              We're adding more. Any template works for any field; your content
              is what changes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link to="/templates">See all templates</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul
            ref={listRef}
            className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
          >
            {templates.slice(0, limit).map((template, index) => (
              <li
                key={template.id}
                id={template.id}
                className="flex scroll-mt-24 flex-col gap-4"
              >
                <div className="group/card relative">
                  <img
                    src={`/templates/${template.id}.png`}
                    alt={`${template.name} template with a sample resume`}
                    width={1020}
                    height={1320}
                    loading={index < 3 ? 'eager' : 'lazy'}
                    className="aspect-17/22 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5"
                  />
                  <TemplatePreview
                    templateId={template.id}
                    className="absolute top-3 right-3"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <h2 className="font-sans text-xl font-semibold">
                      <Link
                        to="/templates/$templateId"
                        params={{ templateId: template.id }}
                        className="hover:underline"
                      >
                        {template.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
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
                  <Button asChild className="mt-auto self-start">
                    <Link to="/resumes/new" search={{ template: template.id }}>
                      Use this template
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {templates.length > batch && (
            <div className="mt-14">
              <LoadMore shown={limit} total={templates.length} onClick={more} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
