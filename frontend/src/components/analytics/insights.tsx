import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { DownloadIcon, LockIcon } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  countryLabel,
  deviceLabel,
  referrerLabel,
} from '@/components/analytics/labels'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { insightsQuery, meQuery } from '@/lib/api/queries'
import type { Analytics, Insights } from '@/lib/api/types'
import { saveBlob } from '@/lib/download'
import { cn } from '@/lib/utils'

type Range = 7 | 30 | 90

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const weekdayNames = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
]

function hourLabel(hour: number) {
  const h = hour % 12 || 12
  return `${h}${hour < 12 ? 'am' : 'pm'}`
}

// Teal steps for the heatmap; empty hours stay on the muted track.
const levels = ['bg-primary/20', 'bg-primary/45', 'bg-primary/70', 'bg-primary']

function levelOf(views: number, max: number) {
  return levels[
    Math.min(levels.length - 1, Math.ceil((views / max) * levels.length) - 1)
  ]
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 id="insights" className="font-sans text-base font-semibold">
        {children}
      </h2>
      <Badge variant="secondary">Paid plans</Badge>
    </div>
  )
}

export function PremiumInsights({
  days,
  links,
}: {
  days: Range
  links: Analytics['links']
}) {
  const { data: me } = useQuery(meQuery)
  const paid = !!me && me.plan !== 'free'
  const insights = useQuery({ ...insightsQuery(days), enabled: paid })

  if (!me) return null
  if (!paid) return <LockedInsights />

  return (
    <section
      aria-labelledby="insights"
      className="flex flex-col gap-8 border-t pt-10"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading>Detailed insights</Heading>
          <p className="text-sm text-muted-foreground">
            When your links get opened and how each one is doing.
          </p>
        </div>
        <ExportButton days={days} />
      </div>
      {insights.isPending ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-52" />
          <Skeleton className="h-56" />
        </div>
      ) : insights.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load detailed insights</AlertTitle>
          <AlertDescription>{errorMessage(insights.error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          <OpeningTimes heatmap={insights.data.heatmap} />
          <LinkComparison insights={insights.data} links={links} />
        </>
      )}
    </section>
  )
}

function OpeningTimes({ heatmap }: { heatmap: Insights['heatmap'] }) {
  const max = Math.max(...heatmap.flat())
  const busiest = heatmap
    .flatMap((row, day) => row.map((views, hour) => ({ day, hour, views })))
    .reduce((best, cell) => (cell.views > best.views ? cell : best))

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-base font-semibold">When they open</h3>
        <p className="text-sm text-muted-foreground">
          {max === 0
            ? 'No views in this period.'
            : `Busiest: ${weekdayNames[busiest.day]}, ${hourLabel(busiest.hour)} to ${hourLabel((busiest.hour + 1) % 24)}, in your time zone.`}
        </p>
      </div>
      {/* The top padding leaves room for the first row's tooltips inside the scroll box. */}
      <div className="-mt-4 overflow-x-auto pt-8">
        <figure className="flex min-w-[36rem] flex-col gap-1.5">
          <div
            role="img"
            aria-label="Views by weekday and hour"
            className="flex flex-col gap-[2px]"
          >
            {heatmap.map((row, day) => (
              <div key={weekdays[day]} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-8 shrink-0 text-xs text-muted-foreground"
                >
                  {weekdays[day]}
                </span>
                <div className="grid flex-1 grid-cols-24 gap-[2px]">
                  {row.map((views, hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'group relative h-5 rounded-[3px]',
                        views === 0 ? 'bg-muted' : levelOf(views, max),
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block',
                          hour > 20 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                        )}
                      >
                        <span className="font-medium">
                          {weekdays[day]} {hourLabel(hour)}
                        </span>
                        <span className="text-muted-foreground">
                          , {views} {views === 1 ? 'view' : 'views'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden className="flex gap-2 text-xs text-muted-foreground">
            <span className="w-8 shrink-0" />
            <div className="grid flex-1 grid-cols-4">
              {[0, 6, 12, 18].map((hour) => (
                <span key={hour}>{hourLabel(hour)}</span>
              ))}
            </div>
          </div>
          <figcaption className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Fewer
            <span className="size-3 rounded-[3px] bg-muted" />
            {levels.map((level) => (
              <span key={level} className={cn('size-3 rounded-[3px]', level)} />
            ))}
            More
          </figcaption>
        </figure>
      </div>
      {/* A table can't shrink below its content, so the wrapper is what gets hidden. */}
      <div className="sr-only">
        <table>
          <caption>Views by weekday and hour</caption>
          <tbody>
            {heatmap.map((row, day) => (
              <tr key={weekdays[day]}>
                <th scope="row">{weekdayNames[day]}</th>
                <td>
                  {row
                    .map((views, hour) =>
                      views ? `${hourLabel(hour)}: ${views}` : '',
                    )
                    .filter(Boolean)
                    .join(', ') || 'none'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LinkComparison({
  insights,
  links,
}: {
  insights: Insights
  links: Analytics['links']
}) {
  const title = (id: string) =>
    links.find((link) => link.id === id)?.resumeTitle ?? 'Deleted link'
  // One scale for every row, so the bars compare across links.
  const max = Math.max(
    1,
    ...insights.links.flatMap((link) => link.viewsByDay.map((d) => d.views)),
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-base font-semibold">
          Compare your links
        </h3>
        <p className="text-sm text-muted-foreground">
          Opened again counts a visitor who opened the same link more than once
          on the same day.
        </p>
      </div>
      {insights.links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No views in this period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resume</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Opened again</TableHead>
                <TableHead>Top source</TableHead>
                <TableHead>Views per day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="max-w-56 truncate font-medium">
                    {title(link.id)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {link.views.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {link.repeatOpens.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {referrerLabel(link.topSource)}
                  </TableCell>
                  <TableCell>
                    <Sparkline data={link.viewsByDay} max={max} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function Sparkline({
  data,
  max,
}: {
  data: Insights['links'][number]['viewsByDay']
  max: number
}) {
  const peak = Math.max(...data.map((d) => d.views))
  const activeDays = data.filter((d) => d.views > 0).length
  return (
    <div
      role="img"
      aria-label={`Viewed on ${activeDays} of ${data.length} days, at most ${peak} in a day`}
      className="flex h-6 w-32 items-end gap-px"
    >
      {data.map((d) => (
        <span
          key={d.day}
          className={cn(
            'flex-1 rounded-t-[1px]',
            d.views ? 'bg-primary' : 'h-px bg-border',
          )}
          style={
            d.views
              ? { height: `${Math.max(15, (d.views / max) * 100)}%` }
              : undefined
          }
        />
      ))}
    </div>
  )
}

const csvCell = (value: string | null) => {
  const text = value ?? ''
  // A leading = + - or @ makes spreadsheets run the cell as a formula.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

function ExportButton({ days }: { days: Range }) {
  const download = useMutation({
    mutationFn: async () => {
      const views = await unwrap(
        api.GET('/v1/analytics/views', {
          params: { query: { days: String(days) as '7' | '30' | '90' } },
        }),
      )
      const rows = views.map((view) =>
        [
          new Date(view.viewedAt).toISOString(),
          view.resumeTitle,
          view.slug,
          referrerLabel(view.referrer),
          view.city,
          view.region,
          countryLabel(view.country),
          deviceLabel(view.device),
        ]
          .map(csvCell)
          .join(','),
      )
      const header =
        'Opened at (UTC),Resume,Link,Source,City,Region,Country,Device'
      saveBlob(
        new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }),
        `link-views-${days}-days.csv`,
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Button
      variant="outline"
      onClick={() => download.mutate()}
      disabled={download.isPending}
    >
      <DownloadIcon />
      {download.isPending ? 'Preparing…' : 'Download CSV'}
    </Button>
  )
}

// A fixed pattern, blurred: shows the shape of the feature without passing as anyone's data.
const sample = weekdays.map((_name, day) =>
  Array.from({ length: 24 }, (_, hour) =>
    day < 5 && hour >= 9 && hour <= 19 ? ((day + hour) % 4) + 1 : 0,
  ),
)

function LockedInsights() {
  return (
    <section
      aria-labelledby="insights"
      className="flex flex-col gap-4 border-t pt-10"
    >
      <Heading>Detailed insights</Heading>
      <div className="relative overflow-hidden rounded-lg border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col gap-[2px] p-6 blur-[3px] select-none"
        >
          {sample.map((row, day) => (
            <div
              key={weekdays[day]}
              className="grid flex-1 grid-cols-24 gap-[2px]"
            >
              {row.map((level, hour) => (
                <span
                  key={hour}
                  className={cn(
                    'rounded-[3px]',
                    level ? levels[level - 1] : 'bg-muted',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="relative flex justify-center bg-background/75 p-6 sm:p-10">
          <div className="flex max-w-md flex-col items-start gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockIcon className="size-4" aria-hidden />
              Sample preview
            </span>
            <p className="font-serif text-2xl leading-tight">
              See when your links get opened and how each one is doing
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Busiest weekdays and hours</li>
              <li>Your links side by side, with repeat opens and top source</li>
              <li>Download every view as a CSV</li>
            </ul>
            <Button asChild>
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
