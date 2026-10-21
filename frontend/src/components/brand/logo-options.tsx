import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

// Candidate logos for the owner to pick from; logo.tsx stays the live one until then.

type MarkProps = { className?: string }

function Svg({
  className,
  children,
}: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-7 shrink-0', className)}
    >
      {children}
    </svg>
  )
}

/** A: Ticked list. A short list on a tile, the top entry ticked and highlighted. */
export function TickListMark({ className }: MarkProps) {
  return (
    <Svg className={className}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <rect
        x="5"
        y="6"
        width="22"
        height="9"
        rx="2.5"
        className="fill-highlight"
      />
      <path
        d="m11 10.5 3 3 6-6.5"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-highlight-foreground"
      />
      <rect
        x="7"
        y="19"
        width="18"
        height="2.6"
        rx="1.3"
        className="fill-primary-foreground"
      />
      <rect
        x="7"
        y="24"
        width="12"
        height="2.6"
        rx="1.3"
        className="fill-primary-foreground"
        opacity=".6"
      />
    </Svg>
  )
}

/** B: Bookmark. A saved-for-later ribbon with a tick cut through it; no tile, so the silhouette is the mark. */
export function BookmarkMark({ className }: MarkProps) {
  return (
    <Svg className={className}>
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
    </Svg>
  )
}

/** C: Highlighted S. An S underlined with a highlighter swipe, the same mark the editor uses for AI changes. */
export function HighlightSMark({ className }: MarkProps) {
  return (
    <Svg className={className}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <rect
        x="6"
        y="23.5"
        width="20"
        height="4"
        rx="2"
        className="fill-highlight"
        transform="rotate(-4 16 25.5)"
      />
      <path
        d="M20.8 7.9C20 6.5 18.3 5.6 16.2 5.6c-2.7 0-4.6 1.4-4.6 3.5 0 4.7 9.4 3 9.4 7.9 0 2.2-2 3.7-4.8 3.7-2.3 0-4.1-.9-5-2.6"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </Svg>
  )
}

export const logoOptions = [
  { id: 'tick-list', name: 'Ticked list', Mark: TickListMark },
  { id: 'bookmark', name: 'Bookmark', Mark: BookmarkMark },
  { id: 'highlight-s', name: 'Highlighted S', Mark: HighlightSMark },
] as const

export function LogoOption({
  Mark,
  className,
}: {
  Mark: (props: MarkProps) => React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Mark />
      <span className="font-serif text-xl font-semibold tracking-tight">
        {site.name}
      </span>
    </span>
  )
}
