import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ExternalLinkIcon, PlayIcon } from 'lucide-react'
import { useState } from 'react'
import {
  EmptyNote,
  QueryView,
  Section,
  Stat,
  StatGrid,
  TrendChart,
} from '@/components/admin/admin-ui'
import { BreakdownList } from '@/components/analytics/breakdown-list'
import { referrerLabel } from '@/components/analytics/labels'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { adminTrafficQuery } from '@/lib/api/queries'
import type { AdminTraffic } from '@/lib/api/types'
import { formatDuration, formatNumber, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/traffic')({
  head: () => ({ meta: [{ title: `Traffic · Admin | ${site.name}` }] }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminTrafficQuery(deps.days)),
  component: TrafficPage,
})

function TrafficPage() {
  const { days = 30 } = Route.useSearch()
  const traffic = useQuery(adminTrafficQuery(days))
  return (
    <QueryView query={traffic}>
      {(result) => (
        <div className="flex flex-col gap-10">
          {result.configured && (
            <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                From PostHog, refreshed every five minutes. Page text and inputs
                are masked in recordings.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={result.dashboardUrl} target="_blank" rel="noreferrer">
                  Open PostHog
                  <ExternalLinkIcon data-icon="inline-end" aria-hidden />
                </a>
              </Button>
            </div>
          )}
          {!result.configured ? (
            <NotConfigured />
          ) : result.error || !result.data ? (
            <Alert variant="destructive">
              <AlertTitle>
                {busy(result.error)
                  ? 'PostHog is busy right now'
                  : "PostHog didn't answer"}
              </AlertTitle>
              <AlertDescription>
                {busy(result.error)
                  ? 'It limits how many reports run at once. Wait a moment and try again.'
                  : `${result.error ?? 'No data came back.'} Check that the personal API key has the query:read and session_recording:read scopes.`}
              </AlertDescription>
              <AlertAction>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={traffic.isFetching}
                  onClick={() => traffic.refetch()}
                >
                  {traffic.isFetching && <Spinner data-icon="inline-start" />}
                  Try again
                </Button>
              </AlertAction>
            </Alert>
          ) : (
            <TrafficReport data={result.data} />
          )}
        </div>
      )}
    </QueryView>
  )
}

// 429 and 503 mean PostHog is overloaded for a moment, not that anything is set up wrong.
const busy = (error: string | null) =>
  Boolean(error && /PostHog (429|503)/.test(error))

function NotConfigured() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-6">
      <h2 className="font-sans text-base font-semibold">Connect PostHog</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Events are already being sent to PostHog. To read them back here, add
        these to the API's environment and restart it:
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
        <li>
          <span className="font-mono">POSTHOG_PERSONAL_API_KEY</span>: PostHog,
          Settings, Personal API keys, with the scopes query:read and
          session_recording:read.
        </li>
        <li>
          <span className="font-mono">POSTHOG_PROJECT_ID</span>: the number
          after /project/ in your PostHog URL.
        </li>
      </ol>
    </div>
  )
}

type TrafficData = NonNullable<AdminTraffic['data']>

function pathOf(url: string | null) {
  if (!url) return 'Unknown page'
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

const eventLabels: Record<string, string> = {
  user_signed_up: 'Signed up',
  resume_created: 'Created a resume',
  resume_imported: 'Imported a resume',
  ai_suggestion_created: 'Asked AI for changes',
  ai_suggestion_applied: 'Applied AI changes',
  share_link_created: 'Created a share link',
  job_added: 'Added a job post',
  template_created: 'Saved a template',
  ai_key_added: 'Added own AI key',
  checkout_started: 'Started checkout',
  payment_captured: 'Paid',
}

function TrafficReport({ data }: { data: TrafficData }) {
  const { totals } = data
  const [series, setSeries] = useState<'views' | 'visitors'>('visitors')

  return (
    <>
      <StatGrid className="lg:grid-cols-3">
        <Stat
          label="Visitors"
          value={formatNumber(totals.visitors)}
          current={totals.visitors}
          previous={totals.previousVisitors}
        />
        <Stat
          label="Page views"
          value={formatNumber(totals.pageviews)}
          current={totals.pageviews}
          previous={totals.previousPageviews}
        />
        <Stat
          label="Sessions"
          value={formatNumber(totals.sessions)}
          hint={
            totals.sessions > 0
              ? `${(totals.pageviews / totals.sessions).toFixed(1)} pages per session`
              : 'No sessions yet'
          }
        />
      </StatGrid>

      <Section
        title={
          series === 'visitors' ? 'Visitors per day' : 'Page views per day'
        }
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={series}
            onValueChange={(value) =>
              value && setSeries(value as typeof series)
            }
            aria-label="Series"
          >
            <ToggleGroupItem value="visitors">Visitors</ToggleGroupItem>
            <ToggleGroupItem value="views">Page views</ToggleGroupItem>
          </ToggleGroup>
        }
      >
        <TrendChart
          data={data.byDay.map((day) => ({ day: day.day, value: day[series] }))}
          color={series === 'visitors' ? 'var(--viz-1)' : 'var(--viz-2)'}
          unit={
            series === 'visitors' ? ['visitor', 'visitors'] : ['view', 'views']
          }
        />
      </Section>

      <div className="grid gap-10 md:grid-cols-2">
        <BreakdownList
          title="Top pages"
          color="var(--viz-1)"
          rows={data.pages.map((row) => ({
            label: row.label,
            views: row.count,
          }))}
          empty="No page views yet"
        />
        <BreakdownList
          title="Where visitors came from"
          color="var(--viz-2)"
          rows={data.referrers.map((row) => ({
            label: referrerLabel(
              row.label === '$direct' ? 'direct' : row.label,
            ),
            views: row.count,
          }))}
          empty="No page views yet"
        />
      </div>

      <Section
        title="Campaigns"
        description="Visitors who arrived on a tagged link, and how many signed up. Tag a link with ?utm_source=x&utm_campaign=launch to see it here."
      >
        {data.campaigns.length === 0 ? (
          <EmptyNote>No visits from tagged links in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Sign-ups</TableHead>
                  <TableHead className="text-right">Sign-up rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.map((row) => (
                  <TableRow key={`${row.source}/${row.campaign}`}>
                    <TableCell className="font-mono text-sm">
                      {row.source}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.campaign || (
                        <span className="text-muted-foreground">none</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.visitors)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.signups)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.round((row.signups / row.visitors) * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <div className="grid gap-10 md:grid-cols-3">
        <BreakdownList
          title="Countries"
          color="var(--viz-3)"
          rows={data.countries.map((row) => ({
            label: row.label,
            views: row.count,
          }))}
          empty="No page views yet"
        />
        <BreakdownList
          title="Devices"
          color="var(--viz-5)"
          rows={data.devices.map((row) => ({
            label: row.label,
            views: row.count,
          }))}
          empty="No page views yet"
        />
        <BreakdownList
          title="Browsers"
          color="var(--viz-4)"
          rows={data.browsers.map((row) => ({
            label: row.label,
            views: row.count,
          }))}
          empty="No page views yet"
        />
      </div>

      <Section
        title="Product events"
        description="Actions people took, as sent to PostHog by the app."
      >
        {data.events.length === 0 ? (
          <EmptyNote>No product events in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Times</TableHead>
                  <TableHead className="text-right">People</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((row) => (
                  <TableRow key={row.event}>
                    <TableCell>
                      {eventLabels[row.event] ?? row.event}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {row.event}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.people)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section
        title="API speed"
        description="Estimated from a sample: every error and slow request, and one in ten of the rest."
      >
        {data.api.length === 0 ? (
          <EmptyNote>No API timings in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Slowest 5%</TableHead>
                  <TableHead className="text-right">Server errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.api.map((row) => (
                  <TableRow key={row.route}>
                    <TableCell className="font-mono text-xs">
                      {row.route}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.requests)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.p50Ms)} ms
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.p95Ms)} ms
                    </TableCell>
                    <TableCell
                      className={
                        row.errors > 0
                          ? 'text-right font-medium text-destructive tabular-nums'
                          : 'text-right tabular-nums'
                      }
                    >
                      {formatNumber(row.errors)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section
        title="PDF compiles"
        description="Previews and downloads. A cache hit reuses an earlier PDF of the exact same LaTeX; compile times count only real compiles."
      >
        {data.compiles.requests === 0 ? (
          <EmptyNote>No compiles recorded in this period.</EmptyNote>
        ) : (
          <StatGrid className="lg:grid-cols-5">
            <Stat
              label="Compiles"
              value={formatNumber(data.compiles.requests)}
            />
            <Stat
              label="Served from cache"
              value={`${Math.round(data.compiles.cacheHitRate * 100)}%`}
            />
            <Stat
              label="Compile time"
              value={`${formatNumber(data.compiles.compileP50Ms)} ms`}
              hint={`Slowest 5%: ${formatNumber(data.compiles.compileP95Ms)} ms`}
            />
            <Stat
              label="Wait in the editor"
              value={`${formatNumber(data.compiles.seenP50Ms)} ms`}
              hint={`Edit to PDF on screen. Slowest 5%: ${formatNumber(data.compiles.seenP95Ms)} ms`}
            />
            <Stat
              label="Cache lookup"
              value={`${formatNumber(data.compiles.lookupP50Ms)} ms`}
              hint="Median round trip to storage"
            />
          </StatGrid>
        )}
      </Section>

      <Section title="Latest session recordings">
        {data.recordings.length === 0 ? (
          <EmptyNote>
            No recordings yet. Check that session replay is turned on in
            PostHog.
          </EmptyNote>
        ) : (
          <ol className="flex flex-col divide-y rounded-lg border">
            {data.recordings.map((recording) => (
              <li key={recording.id}>
                <a
                  href={recording.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PlayIcon className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {pathOf(recording.startUrl)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(recording.durationSeconds)},{' '}
                      {formatNumber(recording.clicks)} clicks
                    </span>
                  </span>
                  <time
                    dateTime={new Date(recording.startedAt).toISOString()}
                    className="shrink-0 text-muted-foreground"
                  >
                    {timeAgo(recording.startedAt)}
                  </time>
                  <span className="sr-only">(opens PostHog)</span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  )
}
