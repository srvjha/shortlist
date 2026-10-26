import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, MailIcon } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { site } from '@/lib/site'

const social =
  'flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent'

const product = [
  { to: '/templates', label: 'Templates' },
  { to: '/ats-checker', label: 'ATS checker' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/login', label: 'Sign in' },
] as const

const fields = [
  { category: 'marketing-sales', label: 'Marketing and sales' },
  { category: 'finance', label: 'Finance and accounting' },
  { category: 'consulting', label: 'Consulting' },
  { category: 'data', label: 'Data' },
  { category: 'software-engineering', label: 'Software' },
  { category: 'students', label: 'Students and freshers' },
] as const

const help = [
  { to: '/guides', label: 'Resume guides' },
  { to: '/docs', label: 'Docs' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
] as const

const heading = 'font-sans text-sm font-semibold'
const list = 'mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground'
const link = 'transition-colors hover:text-foreground'

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 pt-16 lg:grid-cols-[1.6fr_1fr_1.2fr_1fr]">
        <div className="col-span-2 flex flex-col items-start lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Your resume, tailored to every job. For students and professionals
            in every field, anywhere.
          </p>
          <Button asChild className="mt-6 h-10 px-4">
            <Link to="/login" search={{ mode: 'signup' }}>
              Build my resume free
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <p className="mt-3 font-mono text-[0.7rem] text-muted-foreground">
            Free plan · No card needed
          </p>
        </div>

        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className={heading}>
            Product
          </h2>
          <ul className={list}>
            {product.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-fields">
          <h2 id="footer-fields" className={heading}>
            Templates for
          </h2>
          <ul className={list}>
            {fields.map((item) => (
              <li key={item.category}>
                <Link
                  to="/templates"
                  search={{ category: item.category }}
                  className={link}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className={heading}>
            Help
          </h2>
          <ul className={list}>
            {help.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-5 pt-6 text-sm text-muted-foreground">
        <p>
          <span suppressHydrationWarning>© {new Date().getFullYear()}</span>{' '}
          {site.name}.
        </p>
        <div className="flex gap-2">
          <a
            href={site.x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${site.name} on X`}
            className={social}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 fill-current"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href={`mailto:${site.contactEmail}`}
            aria-label={`Email ${site.contactEmail}`}
            className={social}
          >
            <MailIcon className="size-4" />
          </a>
        </div>
      </div>

      {/* The name set huge and faded into the page, as a closing mark. */}
      <p
        aria-hidden="true"
        className="pointer-events-none mt-6 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground),transparent_88%),transparent_85%)] bg-clip-text text-center font-serif text-[clamp(5rem,22vw,17rem)] leading-[0.8] font-semibold tracking-[-0.05em] text-transparent select-none"
      >
        {site.name.toLowerCase()}
      </p>
    </footer>
  )
}
