import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ExternalLinkIcon } from 'lucide-react'
import { useState } from 'react'
import {
  EmptyNote,
  PostHogView,
  Section,
  Stat,
  StatGrid,
  TrendChart,
  seriesColor,
} from '@/components/admin/admin-ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { adminApiQuery } from '@/lib/api/queries'
import type { AdminApi } from '@/lib/api/types'
import { formatNumber, percent, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/api')({
  head: () => ({ meta: [{ title: `API · Admin | ${site.name}` }] }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminApiQuery(deps.days)),
  component: ApiPage,
})

function ApiPage() {
  const { days = 30 } = Route.useSearch()
  const report = useQuery(adminApiQuery(days))
  return (
    <PostHogView
      query={report}
      note="Every API request, from PostHog, refreshed every minute. New requests take about a minute to show up."
    >
      {(data) => <ApiReport data={data} />}
    </PostHogView>
  )
}

type ApiData = NonNullable<AdminApi['data']>
type RequestRow = ApiData['recent']['all'][number]

const ms = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} s`
    : `${formatNumber(Math.round(value))} ms`

const series = {
  requests: {
    label: 'Requests',
    unit: ['request', 'requests'],
    color: seriesColor.views,
  },
  serverErrors: {
    label: 'Server errors',
    unit: ['error', 'errors'],
    color: 'var(--destructive)',
  },
  p95Ms: {
    label: 'Slowest 5%',
    unit: ['slowest 5%', 'slowest 5%'],
    color: seriesColor.ai,
  },
} as const

function ApiReport({ data }: { data: ApiData }) {
  const { totals } = data
  const [chart, setChart] = useState<keyof typeof series>('requests')

  return (
    <>
      <StatGrid>
        <Stat
          label="Requests"
          value={formatNumber(totals.requests)}
          current={totals.requests}
          previous={totals.previousRequests}
        />
        <Stat
          label="Server errors"
          value={formatNumber(totals.serverErrors)}
          hint={`${percent(totals.serverErrors, totals.requests)} of requests, ${formatNumber(totals.previousServerErrors)} in the period before`}
        />
        <Stat
          label="Median response"
          value={ms(totals.p50Ms)}
          hint="Half of requests answered faster"
        />
        <Stat
          label="Slowest 5%"
          value={ms(totals.p95Ms)}
          current={totals.p95Ms}
          previous={totals.previousP95Ms}
          format={ms}
        />
      </StatGrid>
      {totals.clientErrors > 0 && (
        <p className="-mt-6 text-sm text-muted-foreground">
          {formatNumber(totals.clientErrors)} more requests were turned away
          with a 4xx, such as signed out, not found or over a limit. Most are
          normal.
        </p>
      )}

      <Section
        title={`${series[chart].label} per day`}
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={chart}
            onValueChange={(value) => value && setChart(value as typeof chart)}
            aria-label="Series"
          >
            {Object.entries(series).map(([key, { label }]) => (
              <ToggleGroupItem key={key} value={key}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      >
        <TrendChart
          data={data.byDay.map((day) => ({ day: day.day, value: day[chart] }))}
          color={series[chart].color}
          unit={[...series[chart].unit]}
          format={chart === 'p95Ms' ? ms : formatNumber}
          summed={chart !== 'p95Ms'}
        />
      </Section>

      <Errors errors={data.errors} />
      <Routes routes={data.routes} />
      <Recent recent={data.recent} slowMs={data.slowMs} />
    </>
  )
}

function Errors({ errors }: { errors: ApiData['errors'] }) {
  return (
    <Section
      title="Errors"
      description="Unhandled API errors and failed AI calls on our key, grouped by message. API keys are hidden."
    >
      {errors.length === 0 ? (
        <EmptyNote>No errors in this period.</EmptyNote>
      ) : (
        <ol className="flex flex-col divide-y rounded-lg border">
          {errors.map((error) => (
            <li
              key={error.message}
              className="flex flex-col gap-1.5 px-4 py-3 text-sm"
            >
              <p className="font-mono text-xs break-words text-destructive">
                {error.message}
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNumber(error.count)}
                  </span>{' '}
                  {error.count === 1 ? 'time' : 'times'},{' '}
                  {formatNumber(error.users)}{' '}
                  {error.users === 1 ? 'person' : 'people'}
                  {error.where && (
                    <>
                      {' '}
                      in{' '}
                      <span className="font-mono text-xs">{error.where}</span>
                    </>
                  )}
                </span>
                <span className="flex items-baseline gap-3">
                  <span>
                    First {timeAgo(error.firstAt)}, last {timeAgo(error.lastAt)}
                  </span>
                  <a
                    href={error.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    Stack trace
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

const routeSorts = {
  busiest: { label: 'Busiest', by: (row: EndpointRow) => row.requests },
  slowest: { label: 'Slowest', by: (row: EndpointRow) => row.p95Ms },
  errors: { label: 'Errors', by: (row: EndpointRow) => row.serverErrors },
} as const
type EndpointRow = ApiData['routes'][number]

function Routes({ routes }: { routes: ApiData['routes'] }) {
  const [sort, setSort] = useState<keyof typeof routeSorts>('busiest')
  const sorted = [...routes].sort(
    (a, b) => routeSorts[sort].by(b) - routeSorts[sort].by(a),
  )
  return (
    <Section
      title="Endpoints"
      description="Where the time goes is the average request split into the AI model, PDF compiling and everything else."
      actions={
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={sort}
          onValueChange={(value) => value && setSort(value as typeof sort)}
          aria-label="Sort endpoints"
        >
          {Object.entries(routeSorts).map(([key, { label }]) => (
            <ToggleGroupItem key={key} value={key}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      {routes.length === 0 ? (
        <EmptyNote>No API requests in this period.</EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Median</TableHead>
                <TableHead className="text-right">Slowest 5%</TableHead>
                <TableHead className="text-right">Slowest</TableHead>
                <TableHead className="text-right">5xx</TableHead>
                <TableHead className="text-right">4xx</TableHead>
                <TableHead>Where the time goes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.route}>
                  <TableCell className="font-mono text-xs">
                    {row.route}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.requests)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ms(row.p50Ms)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ms(row.p95Ms)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ms(row.maxMs)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      row.serverErrors > 0 && 'font-medium text-destructive',
                    )}
                  >
                    {formatNumber(row.serverErrors)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {formatNumber(row.clientErrors)}
                  </TableCell>
                  <TableCell>
                    <TimeSplit row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}

function TimeSplit({ row }: { row: EndpointRow }) {
  const parts = [
    { label: 'AI', value: row.avgAiMs, color: seriesColor.ai },
    { label: 'PDF', value: row.avgCompileMs, color: seriesColor.resumes },
    {
      label: 'Rest',
      value: Math.max(0, row.avgMs - row.avgAiMs - row.avgCompileMs),
      color: 'color-mix(in oklab, var(--muted-foreground) 35%, transparent)',
    },
  ].filter((part) => part.value > 0)
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return null
  const text = parts.map((part) => `${part.label} ${ms(part.value)}`).join(', ')
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <div
        aria-hidden
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        {parts.map((part) => (
          <span
            key={part.label}
            style={{
              width: `${(part.value / total) * 100}%`,
              backgroundColor: part.color,
            }}
          />
        ))}
      </div>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {text}
      </span>
    </div>
  )
}

function Recent({
  recent,
  slowMs,
}: {
  recent: ApiData['recent']
  slowMs: number
}) {
  const [shown, setShown] = useState<keyof typeof recent>('all')
  const rows = recent[shown]
  return (
    <Section
      title="Recent requests"
      description={`The latest 50. All leaves out sign-in checks, which run on every page load. Slow means over ${ms(slowMs)}.`}
      actions={
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={shown}
          onValueChange={(value) => value && setShown(value as typeof shown)}
          aria-label="Requests to show"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="errors">Errors</ToggleGroupItem>
          <ToggleGroupItem value="slow">Slow</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {rows.length === 0 ? (
        <EmptyNote>
          {shown === 'all'
            ? 'No API requests in this period.'
            : shown === 'errors'
              ? 'No server errors in this period.'
              : 'No slow requests in this period.'}
        </EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Request</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">AI</TableHead>
                <TableHead className="text-right">PDF</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <RecentRow
                  key={`${row.at}-${row.route}-${i}`}
                  row={row}
                  slowMs={slowMs}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}

function RecentRow({ row, slowMs }: { row: RequestRow; slowMs: number }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        <time dateTime={new Date(row.at).toISOString()}>{timeAgo(row.at)}</time>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {row.method} {row.route}
      </TableCell>
      <TableCell
        className={cn(
          'text-right tabular-nums',
          row.status >= 500
            ? 'font-medium text-destructive'
            : row.status >= 400 && 'text-muted-foreground',
        )}
      >
        {row.status}
      </TableCell>
      <TableCell
        className={cn(
          'text-right tabular-nums',
          row.durationMs >= slowMs && 'font-medium',
        )}
      >
        {ms(row.durationMs)}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {row.aiMs === null ? '' : ms(row.aiMs)}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {row.compileMs === null ? '' : ms(row.compileMs)}
      </TableCell>
      <TableCell className="max-w-56 truncate">
        {row.userId ? (
          <Link
            to="/admin/users/$userId"
            params={{ userId: row.userId }}
            className="hover:underline"
          >
            {row.email ?? 'Deleted user'}
          </Link>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
