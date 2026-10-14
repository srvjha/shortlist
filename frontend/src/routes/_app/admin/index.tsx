import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleDollarSignIcon,
  EyeIcon,
  FileTextIcon,
  IndianRupeeIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  EmptyNote,
  Funnel,
  Meter,
  PlanBadge,
  QueryView,
  RingChart,
  Section,
  ShareBar,
  Swatch,
  TrendChart,
  displayName,
  providerLabel,
  seriesColor,
} from '@/components/admin/admin-ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { adminOverviewQuery } from '@/lib/api/queries'
import type { AdminOverview } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import {
  formatInr,
  formatNumber,
  formatUsd,
  initials,
  percent,
  planLabels,
  timeAgo,
} from '@/lib/format'

export const Route = createFileRoute('/_app/admin/')({
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminOverviewQuery(deps.days)),
  component: OverviewPage,
})

function OverviewPage() {
  const { days = 30 } = Route.useSearch()
  const overview = useQuery(adminOverviewQuery(days))
  return (
    <QueryView query={overview}>{(data) => <Overview data={data} />}</QueryView>
  )
}

const metrics = [
  {
    key: 'signups',
    label: 'Sign-ups',
    unit: ['sign-up', 'sign-ups'],
    color: seriesColor.signups,
  },
  {
    key: 'resumes',
    label: 'Resumes',
    unit: ['resume', 'resumes'],
    color: seriesColor.resumes,
  },
  {
    key: 'aiRuns',
    label: 'AI runs',
    unit: ['AI run', 'AI runs'],
    color: seriesColor.ai,
  },
  {
    key: 'views',
    label: 'Share views',
    unit: ['view', 'views'],
    color: seriesColor.views,
  },
] as const

const planColors: Record<string, string> = {
  free: 'var(--muted-foreground)',
  season_pass: 'var(--viz-1)',
  pro: 'var(--viz-2)',
}

const providerColors: Record<string, string> = {
  google: 'var(--viz-1)',
  github: 'var(--viz-2)',
  chatgpt: 'var(--viz-3)',
  anonymous: 'var(--muted-foreground)',
}

// Above these shares of failed AI runs, the meter turns amber, then red.
const failureColor = (rate: number) =>
  rate > 0.15
    ? 'var(--destructive)'
    : rate > 0.05
      ? 'color-mix(in oklab, var(--highlight), var(--foreground) 35%)'
      : 'var(--success)'

function Overview({ data }: { data: AdminOverview }) {
  const { totals } = data
  const [metric, setMetric] =
    useState<(typeof metrics)[number]['key']>('signups')
  const selected = metrics.find((m) => m.key === metric)!
  const series = (key: (typeof metrics)[number]['key']) =>
    data.byDay.map((day) => day[key])
  const selectedTotal = series(metric).reduce((sum, n) => sum + n, 0)
  const failureRate = totals.aiRuns ? totals.aiFailed / totals.aiRuns : 0

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-label="People"
        className="overflow-hidden rounded-xl border bg-card"
      >
        <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Total
            label="People signed up"
            value={totals.users}
            hint={`${formatNumber(totals.newUsers)} new in the last ${data.days} days`}
          />
          <Total
            label="On a paid plan"
            value={totals.paidUsers}
            hint={`${percent(totals.paidUsers, totals.users)} of people signed up`}
          />
          <Total
            label="Guests"
            value={totals.guests}
            hint="Using it without an account"
          />
          <Total
            label="Suspended"
            value={totals.suspendedUsers}
            hint="Blocked by an admin"
          />
        </dl>
        <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
          <h2 className="shrink-0 font-sans text-sm text-muted-foreground">
            By plan
          </h2>
          <ShareBar
            parts={data.plans.map((row) => ({
              label:
                (planLabels as Record<string, string>)[row.label] ?? row.label,
              value: row.count,
              color: planColors[row.label] ?? 'var(--viz-3)',
            }))}
          />
        </div>
      </section>

      <KpiGroup title="Growth" days={data.days}>
        <Kpi
          icon={UserPlusIcon}
          color={seriesColor.signups}
          label="New sign-ups"
          value={formatNumber(totals.newUsers)}
          current={totals.newUsers}
          previous={totals.previousNewUsers}
          trend={series('signups')}
        />
        <Kpi
          icon={UsersIcon}
          color={seriesColor.signups}
          label="Active users"
          value={formatNumber(totals.activeUsers)}
          current={totals.activeUsers}
          previous={totals.previousActiveUsers}
          hint="Signed in during this range"
        />
        <Kpi
          icon={FileTextIcon}
          color={seriesColor.resumes}
          label="Resumes created"
          value={formatNumber(totals.resumesCreated)}
          current={totals.resumesCreated}
          previous={totals.previousResumesCreated}
          trend={series('resumes')}
        />
        <Kpi
          icon={EyeIcon}
          color={seriesColor.views}
          label="Share views"
          value={formatNumber(totals.shareViews)}
          current={totals.shareViews}
          previous={totals.previousShareViews}
          trend={series('views')}
        />
      </KpiGroup>

      <KpiGroup title="AI and revenue" days={data.days}>
        <Kpi
          icon={SparklesIcon}
          color={seriesColor.ai}
          label="AI runs"
          value={formatNumber(totals.aiRuns)}
          current={totals.aiRuns}
          previous={totals.previousAiRuns}
          trend={series('aiRuns')}
        />
        <Kpi
          icon={TriangleAlertIcon}
          color={failureColor(failureRate)}
          label="AI failure rate"
          value={percent(totals.aiFailed, totals.aiRuns)}
          footer={
            <span className="flex w-full flex-col gap-1.5">
              <Meter value={failureRate} color={failureColor(failureRate)} />
              <span className="text-xs text-muted-foreground">
                {formatNumber(totals.aiFailed)} of {formatNumber(totals.aiRuns)}{' '}
                runs failed
              </span>
            </span>
          }
        />
        <Kpi
          icon={CircleDollarSignIcon}
          color={seriesColor.ai}
          label="AI cost"
          value={formatUsd(totals.aiCostUsdMicros)}
          current={totals.aiCostUsdMicros}
          previous={totals.previousAiCostUsdMicros}
          lowerIsBetter
          hint="What the AI provider charged"
        />
        <Kpi
          icon={IndianRupeeIcon}
          color={seriesColor.revenue}
          label="Revenue"
          value={formatInr(totals.revenuePaise)}
          current={totals.revenuePaise}
          previous={totals.previousRevenuePaise}
          hint="Paid in this range, minus refunds"
        />
      </KpiGroup>

      <Section
        title={`${selected.label} per day`}
        description={`${formatNumber(selectedTotal)} ${selectedTotal === 1 ? selected.unit[0] : selected.unit[1]} in the last ${data.days} days`}
        className={panel}
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={metric}
            onValueChange={(value) =>
              value && setMetric(value as typeof metric)
            }
            aria-label="Metric"
            className="flex-wrap"
          >
            {metrics.map((m) => (
              <ToggleGroupItem key={m.key} value={m.key} className="gap-1.5">
                <Swatch color={m.color} />
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      >
        <TrendChart
          data={data.byDay.map((day) => ({ day: day.day, value: day[metric] }))}
          color={selected.color}
          unit={[...selected.unit]}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Activation"
          description={`Of the ${formatNumber(data.funnel.signedUp)} who signed up in the last ${data.days} days`}
          className={panel}
        >
          <Funnel
            steps={[
              { label: 'Signed up', count: data.funnel.signedUp },
              { label: 'Created a resume', count: data.funnel.createdResume },
              { label: 'Used AI', count: data.funnel.usedAi },
              { label: 'Shared a link', count: data.funnel.shared },
              { label: 'Paid', count: data.funnel.paid },
            ]}
          />
        </Section>
        <Section
          title="Sign-in methods"
          description="How everyone signs in, all time"
          className={panel}
        >
          <RingChart
            unit={['person', 'people']}
            parts={data.providers.map((row) => ({
              label: providerLabel(row.label),
              value: row.count,
              color: providerColors[row.label] ?? 'var(--viz-5)',
            }))}
          />
        </Section>
      </div>

      <Section
        title="Latest sign-ups"
        actions={
          <Link
            to="/admin/users"
            className="text-sm font-medium text-primary hover:underline"
          >
            All users
          </Link>
        }
      >
        {data.recentSignups.length === 0 ? (
          <EmptyNote>Nobody has signed up yet.</EmptyNote>
        ) : (
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {data.recentSignups.map((user) => (
              <li key={user.id}>
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: user.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <Avatar className="size-9">
                    {user.image && <AvatarImage src={user.image} alt="" />}
                    <AvatarFallback>
                      {initials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {displayName(user)}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {user.email}
                      {user.providers.length > 0 &&
                        ` · ${user.providers.map(providerLabel).join(', ')}`}
                    </span>
                  </span>
                  <PlanBadge plan={user.plan} />
                  <time
                    dateTime={new Date(user.createdAt).toISOString()}
                    className="hidden w-28 shrink-0 text-right text-sm text-muted-foreground sm:block"
                  >
                    {timeAgo(user.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

const panel = 'rounded-xl border bg-card p-5'

function Total({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card px-5 py-4">
      <dt className="truncate text-sm text-muted-foreground">{label}</dt>
      <dd className="font-serif text-4xl leading-tight">
        {formatNumber(value)}
      </dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

function KpiGroup({
  title,
  days,
  children,
}: {
  title: string
  days: number
  children: React.ReactNode
}) {
  const id = `kpi-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-sans text-base font-semibold">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">
          Last {days} days vs the {days} before
        </span>
      </div>
      <dl className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {children}
      </dl>
    </section>
  )
}

function Kpi({
  icon: Icon,
  color,
  label,
  value,
  current,
  previous,
  lowerIsBetter,
  trend,
  hint,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: string
  label: string
  value: string
  current?: number
  previous?: number
  lowerIsBetter?: boolean
  trend?: number[]
  hint?: string
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <dt className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            style={{
              color,
              backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
            }}
          >
            <Icon className="size-4" />
          </span>
          <span className="truncate">{label}</span>
        </dt>
        {current !== undefined && previous !== undefined && (
          <dd>
            <Delta
              current={current}
              previous={previous}
              lowerIsBetter={lowerIsBetter}
            />
          </dd>
        )}
      </div>
      <dd className="truncate font-serif text-3xl">{value}</dd>
      {/* Same height with or without a trend, so cards in a row line up. */}
      <dd className="flex h-9 items-end">
        {footer ??
          (trend && hasTrend(trend) ? (
            <Sparkline values={trend} color={color} />
          ) : (
            hint && (
              <span className="text-xs text-muted-foreground">{hint}</span>
            )
          ))}
      </dd>
    </div>
  )
}

// Green when the move is good for the business, red when it is bad; the arrow carries the direction too.
function Delta({
  current,
  previous,
  lowerIsBetter,
}: {
  current: number
  previous: number
  lowerIsBetter?: boolean
}) {
  if (previous === 0)
    return (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {current === 0 ? 'None yet' : 'No earlier data'}
      </span>
    )
  const change = Math.round(((current - previous) / previous) * 100)
  const good = lowerIsBetter ? change < 0 : change > 0
  const Icon = change >= 0 ? ArrowUpIcon : ArrowDownIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums',
        change === 0
          ? 'bg-muted text-muted-foreground'
          : good
            ? 'bg-success/15 text-success'
            : 'bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span className="sr-only">{change >= 0 ? 'Up' : 'Down'}</span>
      {Math.abs(change)}%<span className="sr-only"> vs the period before</span>
    </span>
  )
}

// A trend needs a few days with activity; one bar on a flat line says nothing.
const hasTrend = (values: number[]) => values.filter((v) => v > 0).length >= 2

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values)
  const points = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * 100).toFixed(2)},${(34 - (v / max) * 30).toFixed(2)}`,
  )
  const line = `M${points.join(' L')}`
  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      aria-hidden
      className="h-9 w-full"
      style={{ color }}
    >
      <path
        d={`${line} L100,36 L0,36 Z`}
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
