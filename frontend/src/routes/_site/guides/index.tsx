import { Link, createFileRoute } from '@tanstack/react-router'
import { guides } from '@/lib/guides'
import { site } from '@/lib/site'

const title = `Resume Guides for Freshers and Students | ${site.name}`
const description =
  'Free guides for freshers and students: the right resume format, how to get past ATS software, and how to tailor a resume to each job.'

export const Route = createFileRoute('/_site/guides/')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:url', content: `${site.url}/guides` },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/guides` }],
  }),
  component: GuidesIndex,
})

function GuidesIndex() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 pb-24 lg:pt-20">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Resume guides
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      <ul className="mt-10 flex flex-col gap-4">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              to="/guides/$slug"
              params={{ slug: guide.slug }}
              className="flex flex-col gap-1 rounded-lg border p-5 transition-colors hover:bg-muted/40"
            >
              <span className="text-lg font-semibold">{guide.title}</span>
              <span className="text-muted-foreground">{guide.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
