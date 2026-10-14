import type { UseQueryResult } from '@tanstack/react-query'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Change } from '@/components/analytics/change'
import { formatDay, niceMax } from '@/components/analytics/views-chart'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api/client'
import { formatNumber, percent, planLabels } from '@/lib/format'
import { templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

// Loading, error and success states for one admin report.
export function QueryView<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>
  children: (data: T) => React.ReactNode
}) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-28" />
        <Skeleton className="h-56" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn't load this report</AlertTitle>
        <AlertDescription>{errorMessage(query.error)}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </AlertAction>
      </Alert>
    )
  }
  return <>{children(query.data)}</>
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border min-[420px]:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </dl>
  )
}

export function Stat({
  label,
  value,
  current,
  previous,
  format,
  hint,
}: {
  label: string
  value: React.ReactNode
  current?: number
  previous?: number
  format?: (value: number) => string
  hint?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-background p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="truncate font-serif text-3xl tabular-nums">{value}</dd>
      {current !== undefined && previous !== undefined ? (
        <dd>
          <Change current={current} previous={previous} format={format} />
        </dd>
      ) : (
        hint && <dd className="text-sm text-muted-foreground">{hint}</dd>
      )}
    </div>
  )
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="font-sans text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

// Each step as a share of the first, so drop-off between steps is visible. Later steps fade, as the stages are ordered.
export function Funnel({
  steps,
}: {
  steps: { label: string; count: number }[]
}) {
  const first = steps[0]?.count ?? 0
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-muted-foreground tabular-nums">
                {index + 1}.
              </span>
              {step.label}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatNumber(step.count)}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {percent(step.count, first)}
              </span>
            </span>
          </div>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{
                width: first ? `${(step.count / first) * 100}%` : 0,
                backgroundColor: `color-mix(in oklab, var(--viz-1) ${Math.max(40, 100 - index * 12)}%, var(--card))`,
              }}
            />
          </span>
          {index > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {percent(step.count, steps[index - 1].count)} of the step before
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

// Fixed colours per series, so a metric keeps its colour on every chart and page.
export const seriesColor = {
  signups: 'var(--viz-1)',
  views: 'var(--viz-2)',
  resumes: 'var(--viz-3)',
  revenue: 'var(--viz-4)',
  ai: 'var(--viz-5)',
} as const

export function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

// A daily series as a line over a soft fill, with a crosshair on hover or arrow keys.
export function TrendChart({
  data,
  color,
  unit,
  format = formatNumber,
}: {
  data: { day: string; value: number }[]
  color: string
  // Singular and plural name of what is counted.
  unit: [string, string]
  format?: (value: number) => string
}) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const top = niceMax(Math.max(...data.map((d) => d.value)))
  const last = data.length - 1
  const x = (i: number) => (i / Math.max(1, last)) * 100
  const y = (v: number) => 100 - (v / top) * 100
  const line = `M${data.map((d, i) => `${x(i).toFixed(2)},${y(d.value).toFixed(2)}`).join(' L')}`
  const labelIndexes = [
    ...new Set([0, 1, 2, 3].map((i) => Math.round((i * last) / 3))),
  ]
  const point = active === null ? null : data[active]
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <figure className="flex flex-col gap-2" style={{ color }}>
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex h-52 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums"
        >
          {[top, top / 2, 0].map((tick) => (
            <span key={tick} className="-my-2 leading-4">
              {format(tick)}
            </span>
          ))}
        </div>
        <div
          role="img"
          tabIndex={0}
          aria-label={`${unit[1]} per day, ${data.length} days, ${format(total)} in total. Use the arrow keys to read each day.`}
          className="relative h-52 flex-1 touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const i = Math.round(
              ((event.clientX - rect.left) / rect.width) * last,
            )
            setActive(Math.min(last, Math.max(0, i)))
          }}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((i) => i ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
            if (event.key === 'Home') setActive(0)
            else if (event.key === 'End') setActive(last)
            else if (step)
              setActive((i) => Math.min(last, Math.max(0, (i ?? last) + step)))
            else return
            event.preventDefault()
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 flex flex-col justify-between"
          >
            {[0, 1, 2].map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${id})`} />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {point && active !== null && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <span
                className="absolute inset-y-0 w-px bg-foreground/25"
                style={{ left: `${x(active)}%` }}
              />
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-card"
                style={{ left: `${x(active)}%`, top: `${y(point.value)}%` }}
              />
              <span
                className={cn(
                  'absolute -top-2 z-10 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md',
                  active < last * 0.2
                    ? ''
                    : active > last * 0.8
                      ? '-translate-x-full'
                      : '-translate-x-1/2',
                )}
                style={{ left: `${x(active)}%` }}
              >
                <span className="font-medium">{formatDay(point.day)}</span>
                <span className="text-muted-foreground">
                  , {format(point.value)}{' '}
                  {point.value === 1 ? unit[0] : unit[1]}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="flex gap-3 text-xs text-muted-foreground">
        <span className="invisible tabular-nums">{format(top)}</span>
        <div className="relative h-4 flex-1">
          {labelIndexes.map((index) => (
            <span
              key={index}
              className={cn(
                'absolute whitespace-nowrap',
                index === 0
                  ? 'left-0'
                  : index === last
                    ? 'right-0'
                    : '-translate-x-1/2',
              )}
              style={
                index === 0 || index === last
                  ? undefined
                  : { left: `${x(index)}%` }
              }
            >
              {formatDay(data[index].day)}
            </span>
          ))}
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        {point &&
          `${formatDay(point.day)}, ${format(point.value)} ${point.value === 1 ? unit[0] : unit[1]}`}
      </span>
      <table className="sr-only">
        <caption>{unit[1]} per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{formatDay(d.day)}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

type Part = { label: string; value: number; color: string }

function Legend({
  parts,
  total,
  active,
  onActive,
}: {
  parts: Part[]
  total: number
  active?: string | null
  onActive?: (label: string | null) => void
}) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {parts.map((part) => (
        <li
          key={part.label}
          className={cn(
            'flex items-center gap-2 transition-opacity',
            active && active !== part.label && 'opacity-50',
          )}
          onPointerEnter={() => onActive?.(part.label)}
          onPointerLeave={() => onActive?.(null)}
        >
          <Swatch color={part.color} />
          <span className="min-w-0 flex-1 truncate">{part.label}</span>
          <span className="shrink-0 tabular-nums">
            {formatNumber(part.value)}
            <span className="ml-1.5 inline-block w-9 text-right text-xs text-muted-foreground">
              {percent(part.value, total)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Part-to-whole as one bar split by a 2px gap.
export function ShareBar({ parts }: { parts: Part[] }) {
  const shown = parts.filter((part) => part.value > 0)
  const total = shown.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return <EmptyNote>No users yet.</EmptyNote>
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
      <div
        aria-hidden
        className="flex h-2.5 w-full min-w-0 gap-0.5 overflow-hidden rounded-full md:flex-1"
      >
        {shown.map((part) => (
          <span
            key={part.label}
            className="h-full min-w-1"
            style={{ flexGrow: part.value, backgroundColor: part.color }}
          />
        ))}
      </div>
      <ul className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 text-sm">
        {shown.map((part) => (
          <li key={part.label} className="flex items-center gap-2">
            <Swatch color={part.color} />
            {part.label}
            <span className="font-medium tabular-nums">
              {formatNumber(part.value)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {percent(part.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Part-to-whole as a ring, for a few parts; the centre names the hovered part.
export function RingChart({
  parts,
  unit,
}: {
  parts: Part[]
  unit: [string, string]
}) {
  const [active, setActive] = useState<string | null>(null)
  const shown = parts.filter((part) => part.value > 0)
  const total = shown.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return <EmptyNote>No users yet.</EmptyNote>
  // The ring's circumference is 100, so dash lengths are percentages.
  const gap = shown.length > 1 ? 1.5 : 0
  let start = 0
  const focus = shown.find((part) => part.label === active)
  const centre = focus?.value ?? total
  return (
    <div className="my-auto flex flex-col items-center gap-6 min-[420px]:flex-row">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 42 42" aria-hidden className="size-full -rotate-90">
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          {shown.map((part) => {
            const size = (part.value / total) * 100
            const offset = -start
            start += size
            return (
              <circle
                key={part.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                strokeWidth={active === part.label ? 6 : 5}
                stroke={part.color}
                strokeDasharray={`${Math.max(0.5, size - gap)} ${100 - size + gap}`}
                strokeDashoffset={offset}
                className={cn(
                  'transition-[opacity,stroke-width] duration-200',
                  active && active !== part.label && 'opacity-35',
                )}
                onPointerEnter={() => setActive(part.label)}
                onPointerLeave={() => setActive(null)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-2xl">{formatNumber(centre)}</span>
          <span className="max-w-24 truncate text-xs text-muted-foreground">
            {focus ? focus.label : centre === 1 ? unit[0] : unit[1]}
          </span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1">
        <Legend
          parts={shown}
          total={total}
          active={active}
          onActive={setActive}
        />
      </div>
    </div>
  )
}

// A ratio against its limit; the caller picks a fill that says how good or bad it is.
export function Meter({ value, color }: { value: number; color: string }) {
  return (
    <span
      aria-hidden
      className="block h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          backgroundColor: color,
        }}
      />
    </span>
  )
}

export function PlanBadge({ plan }: { plan: keyof typeof planLabels }) {
  return (
    <Badge variant={plan === 'free' ? 'secondary' : 'default'}>
      {planLabels[plan]}
    </Badge>
  )
}

const providerLabels: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  chatgpt: 'ChatGPT',
  anonymous: 'Guest',
}

// Some sign-ins arrive without a name.
export const displayName = (user: { name: string; email: string }) =>
  user.name.trim() || user.email

export const providerLabel = (id: string) => providerLabels[id] ?? id

const stepLabels: Record<string, string> = {
  import: 'Import',
  jd_parse: 'Read job post',
  plan: 'Plan changes',
  rewrite: 'Tailor',
  verify: 'Check facts',
  inline_edit: 'Inline edit',
  chat_edit: 'Chat edit',
  fix_compile: 'Fix LaTeX',
  draft: 'Write from notes',
}

export const stepLabel = (step: string) => stepLabels[step] ?? step

export const templateName = (id: string) =>
  templateCatalog.find((template) => template.id === id)?.name ?? id

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

// An email with a copy button. relative z-10 lifts the button above a row-wide link overlay.
export function CopyEmail({
  email,
  className,
}: {
  email: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  // Under reduced motion the icons only fade; no scale or blur.
  const reduce = useReducedMotion()
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }
  const shown = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: 'blur(0px)' }
  return (
    <span className={cn('flex min-w-0 items-center gap-1', className)}>
      <span className="truncate">{email}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="relative z-10 shrink-0"
        aria-label={`Copy ${email}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            toast.error('Could not copy. Select the email instead.')
          }
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? 'copied' : 'copy'}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="flex"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </span>
  )
}
