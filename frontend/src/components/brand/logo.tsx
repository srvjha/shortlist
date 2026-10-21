import { Link } from '@tanstack/react-router'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

// A bookmark with a tick: the resume that made the shortlist. No tile, so the silhouette is the mark.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-7 shrink-0', className)}
    >
      <path
        d="M7.5 2h17A2.5 2.5 0 0 1 27 4.5V30l-11-7-11 7V4.5A2.5 2.5 0 0 1 7.5 2z"
        className="fill-primary"
      />
      <path
        d="m10.5 12.5 4.5 4.5 7.5-8.5"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}

export function Logo({
  className,
  to = '/',
}: {
  className?: string
  to?: string
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 rounded-md', className)}
      aria-label={`${site.name} home`}
    >
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight">
        {site.name}
      </span>
    </Link>
  )
}
