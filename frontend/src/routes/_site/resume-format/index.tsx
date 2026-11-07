import { Link, createFileRoute } from '@tanstack/react-router'
import { formatPages } from '@/lib/format-pages'
import { breadcrumbs, site } from '@/lib/site'

const title = `Resume Format by Role: Free Samples for Freshers and Professionals | ${site.name}`
const description =
  'The right resume format for your role, with a filled-in sample, the section order, skills and example bullets. For freshers and professionals applying in India.'
const url = `${site.url}/resume-format`

export const Route = createFileRoute('/_site/resume-format/')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(breadcrumbs([['Resume formats', url]])),
      },
    ],
  }),
  component: FormatIndex,
})

function FormatIndex() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-24 lg:pt-20">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Resume format by role
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pick your role to see a filled-in sample, which sections go first and
          why, the skills to list and how to write strong bullets. Then start
          from that format for free.
        </p>
      </div>
      <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {formatPages.map((page) => (
          <li key={page.slug}>
            <Link
              to="/resume-format/$slug"
              params={{ slug: page.slug }}
              className="group flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <img
                src={`/formats/thumbs/${page.slug}.webp`}
                alt=""
                width={560}
                height={725}
                loading="lazy"
                className="aspect-4/5 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5"
              />
              <span className="font-medium group-hover:underline">
                {page.role} resume format
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
