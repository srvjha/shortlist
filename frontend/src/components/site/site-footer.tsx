import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/brand/logo'
import { site } from '@/lib/site'

const columns = [
  {
    title: 'Product',
    links: [
      { to: '/templates', label: 'Templates' },
      { to: '/ats-checker', label: 'ATS checker' },
      { to: '/guides', label: 'Resume guides' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/docs', label: 'Docs' },
      { to: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Resumes for every field, typeset like LaTeX and tailored to every
            job. Built in India.
          </p>
          <a
            href={`mailto:${site.contactEmail}`}
            className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {site.contactEmail}
          </a>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-3">
            <h2 className="font-sans text-sm font-semibold">{column.title}</h2>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 text-sm text-muted-foreground">
        <span suppressHydrationWarning>© {new Date().getFullYear()}</span>{' '}
        {site.name}. Made in India.
      </div>
    </footer>
  )
}
