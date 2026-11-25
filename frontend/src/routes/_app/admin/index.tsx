import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleDollarSignIcon,
  EyeIcon,
  FileTextIcon,
  DollarSignIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  EmptyNote,
  Funnel,
  PlanBadge,
  PlanEnds,
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
  formatMoney,
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
  lifetime: 'var(--viz-3)',
}

const providerColors: Record<string, string> = {
  google: 'var(--viz-1)',
  github: 'var(--viz-2)',
  chatgpt: 'var(--viz-3)',
  anonymous: 'var(--muted-foreground)',
}

// Above this share of failed AI runs, the rate shows in red.
const failureTone = (rate: number) => (rate > 0.15 ? 'bad' : 'good')

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
            label="Paying"
            value={totals.payingUsers}
            hint={`${percent(totals.payingUsers, totals.users)} of people signed up, plus ${formatNumber(totals.freePassUsers)} on a free pass`}
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

      <section aria-labelledby="kpi-period" className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="kpi-period" className="font-sans text-base font-semibold">
            Last {data.days} days
          </h2>
          <p className="text-sm text-muted-foreground">
            Each change is compared with the {data.days} days before.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={UserPlusIcon}
            label="New sign-ups"
            value={totals.newUsers}
            previous={totals.previousNewUsers}
          />
          <Stat
            icon={UsersIcon}
            label="Active users"
            value={totals.activeUsers}
            previous={totals.previousActiveUsers}
          />
          <Stat
            icon={FileTextIcon}
            label="Resumes created"
            value={totals.resumesCreated}
            previous={totals.previousResumesCreated}
          />
          <Stat
            icon={EyeIcon}
            label="Share views"
            value={totals.shareViews}
            previous={totals.previousShareViews}
          />
          <Stat
            icon={SparklesIcon}
            label="AI runs"
            value={totals.aiRuns}
            previous={totals.previousAiRuns}
          />
          <Stat
            icon={TriangleAlertIcon}
            label="AI failure rate"
            display={percent(totals.aiFailed, totals.aiRuns)}
            note={`${formatNumber(totals.aiFailed)} of ${formatNumber(totals.aiRuns)} runs failed`}
            tone={failureTone(failureRate)}
          />
          <Stat
            icon={CircleDollarSignIcon}
            label="AI cost"
            value={totals.aiCostUsdMicros}
            previous={totals.previousAiCostUsdMicros}
            format={formatUsd}
            lowerIsBetter
          />
          <Stat
            icon={DollarSignIcon}
            label="Revenue"
            value={totals.revenueCents}
            previous={totals.previousRevenueCents}
            format={(cents) => formatMoney(cents, 'USD')}
          />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="latest-signups"
          className="flex flex-col rounded-xl border bg-card"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
            <h2
              id="latest-signups"
              className="font-sans text-base font-semibold"
            >
              Latest sign-ups
            </h2>
            <Link
              to="/admin/users"
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
            >
              All users
            </Link>
          </div>
          {data.recentSignups.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyNote>Nobody has signed up yet.</EmptyNote>
            </div>
          ) : (
            <ul className="flex flex-col px-2 pb-2">
              {data.recentSignups.map((user) => (
                <li key={user.id}>
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: user.id }}
                    className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Avatar className="size-9">
                      {user.image && <AvatarImage src={user.image} alt="" />}
                      <AvatarFallback>
                        {initials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {displayName(user)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email} · {timeAgo(user.createdAt)}
                      </span>
                    </span>
                    <PlanBadge plan={user.plan} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
            data={data.byDay.map((day) => ({
              day: day.day,
              value: day[metric],
            }))}
            color={selected.color}
            unit={[...selected.unit]}
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
        title="Plans running"
        description="Everyone on a paid plan, the soonest to end first. Free passes come from you or a promo code."
      >
        {data.runningPlans.length === 0 ? (
          <EmptyNote>Nobody is on a plan right now.</EmptyNote>
        ) : (
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {data.runningPlans.map((user) => (
              <li key={user.id}>
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: user.id }}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {displayName(user)}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <PlanBadge plan={user.plan} />
                  <PlanEnds endsAt={user.planEndsAt} paid={user.planPaid} />
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

// Plain words for how a number moved; color only says whether that is good.
function Stat({
  icon: Icon,
  label,
  value,
  previous,
  display,
  format = formatNumber,
  lowerIsBetter,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: number
  previous?: number
  display?: string
  format?: (n: number) => string
  lowerIsBetter?: boolean
  note?: string
  tone?: 'good' | 'bad'
}) {
  let change: React.ReactNode = note
  if (value !== undefined && previous !== undefined) {
    if (previous === 0) {
      change = value === 0 ? 'None yet' : 'None before'
    } else {
      const pct = Math.round(((value - previous) / previous) * 100)
      const good = lowerIsBetter ? pct < 0 : pct > 0
      const Arrow = pct >= 0 ? ArrowUpIcon : ArrowDownIcon
      change = (
        <>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium tabular-nums',
              pct === 0
                ? 'text-muted-foreground'
                : good
                  ? 'text-success'
                  : 'text-destructive',
            )}
          >
            <Arrow className="size-3" aria-hidden />
            <span className="sr-only">{pct >= 0 ? 'Up' : 'Down'}</span>
            {Math.abs(pct)}%
          </span>{' '}
          from {format(previous)}
        </>
      )
    }
  }
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 rounded-xl border bg-card p-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <dt className="truncate text-sm text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            'font-serif text-3xl leading-tight tabular-nums',
            tone === 'bad' && 'text-destructive',
          )}
        >
          {display ?? format(value ?? 0)}
        </dd>
        <dd className="text-xs text-muted-foreground">{change}</dd>
      </div>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="size-[18px]" />
      </span>
    </div>
  )
}
