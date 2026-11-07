import { createFileRoute } from '@tanstack/react-router'
import { docs } from '@/lib/docs'
import { guides } from '@/lib/guides'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'

const lastmod = new Map(
  guides.map((guide) => [`/guides/${guide.slug}`, guide.updated]),
)

// Public pages only. Share links stay out: their owners decide whether they're found.
const paths = [
  '/',
  '/templates',
  ...templateCatalog.map((template) => `/templates/${template.id}`),
  '/ats-checker',
  '/cover-letter-generator',
  '/resignation-letter-generator',
  '/guides',
  ...guides.map((guide) => `/guides/${guide.slug}`),
  '/pricing',
  '/docs',
  ...docs.map((doc) => `/docs/${doc.slug}`),
  '/privacy',
  '/terms',
]

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
            .map((path) => {
              const date = lastmod.get(path)
              return `  <url><loc>${site.url}${path}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`
            })
            .join('\n')}\n</urlset>\n`,
          {
            headers: {
              'content-type': 'application/xml; charset=utf-8',
              'cache-control': 'public, max-age=3600',
            },
          },
        ),
    },
  },
})
