import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  EmptyNote,
  QueryView,
  Section,
  Stat,
  StatGrid,
  stepLabel,
  displayName,
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
import { adminAiQuery } from '@/lib/api/queries'
import type { AdminAi } from '@/lib/api/types'
import { formatNumber, formatUsd, percent, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/ai')({
  head: () => ({ meta: [{ title: `AI · Admin | ${site.name}` }] }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminAiQuery(deps.days)),
  component: AiPage,
})

function AiPage() {
  const { days = 30 } = Route.useSearch()
  const ai = useQuery(adminAiQuery(days))
  return <QueryView query={ai}>{(data) => <AiReport data={data} />}</QueryView>
}

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact' })

function AiReport({ data }: { data: AdminAi }) {
  const { totals } = data
  const [series, setSeries] = useState<'runs' | 'cost'>('runs')

  return (
    <div className="flex flex-col gap-10">
      <StatGrid>
        <Stat
          label="AI runs"
          value={formatNumber(totals.runs)}
          hint={`by ${formatNumber(totals.users)} ${totals.users === 1 ? 'person' : 'people'}`}
        />
        <Stat
          label="Failure rate"
          value={percent(totals.failed, totals.runs)}
          hint={`${formatNumber(totals.failed)} failed`}
        />
        <Stat
          label="Cost to us"
          value={formatUsd(totals.costUsdMicros)}
          hint={
            totals.runs > 0
              ? `${formatUsd(totals.costUsdMicros / totals.runs)} per run`
              : 'No runs yet'
          }
        />
        <Stat
          label="Tokens"
          value={compact.format(totals.inputTokens + totals.outputTokens)}
          hint={`${compact.format(totals.inputTokens)} in (${percent(totals.cachedInputTokens, totals.inputTokens)} cached), ${compact.format(totals.outputTokens)} out`}
        />
      </StatGrid>
      {totals.byok > 0 && (
        <p className="-mt-6 text-sm text-muted-foreground">
          {formatNumber(totals.byok)} of these runs used the person's own API
          key and cost us nothing.
        </p>
      )}

      <Section
        title={series === 'runs' ? 'Runs per day' : 'Cost per day'}
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
            <ToggleGroupItem value="runs">Runs</ToggleGroupItem>
            <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
          </ToggleGroup>
        }
      >
        <TrendChart
          data={data.byDay.map((day) => ({
            day: day.day,
            value: series === 'runs' ? day.runs : day.costUsdMicros,
          }))}
          color={seriesColor.ai}
          unit={series === 'runs' ? ['run', 'runs'] : ['spent', 'spent']}
          format={series === 'runs' ? formatNumber : formatUsd}
        />
      </Section>

      <Section
        title="By step"
        description="Latency is the time the model took to answer."
      >
        {data.bySteps.length === 0 ? (
          <EmptyNote>No AI runs in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Slowest 5%</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bySteps.map((row) => (
                  <TableRow key={row.step}>
                    <TableCell className="font-medium">
                      {stepLabel(row.step)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.runs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.failed)}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {percent(row.failed, row.runs)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(row.p50Ms / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(row.p95Ms / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(row.costUsdMicros)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="By model">
          {data.byModels.length === 0 ? (
            <EmptyNote>No AI runs in this period.</EmptyNote>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byModels.map((row) => (
                    <TableRow key={row.model}>
                      <TableCell className="font-mono text-xs">
                        {row.model}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.runs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {compact.format(row.tokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(row.costUsdMicros)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>

        <Section title="Biggest users" description="By cost to us.">
          {data.topUsers.length === 0 ? (
            <EmptyNote>No AI runs in this period.</EmptyNote>
          ) : (
            <ol className="flex flex-col divide-y rounded-lg border">
              {data.topUsers.map((user) => (
                <li key={user.userId}>
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: user.userId }}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {displayName(user)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {formatUsd(user.costUsdMicros)}
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(user.runs)} runs
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      <Section title="Recent failures">
        {data.failures.length === 0 ? (
          <EmptyNote>No failed AI runs in this period.</EmptyNote>
        ) : (
          <ol className="flex flex-col divide-y rounded-lg border">
            {data.failures.map((failure) => (
              <li
                key={failure.id}
                className="flex flex-col gap-1 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    <span className="font-medium">
                      {stepLabel(failure.step)}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      for{' '}
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: failure.userId }}
                        className="hover:underline"
                      >
                        {failure.email}
                      </Link>{' '}
                      on{' '}
                      <span className="font-mono text-xs">{failure.model}</span>
                    </span>
                  </span>
                  <time
                    dateTime={new Date(failure.createdAt).toISOString()}
                    className="text-muted-foreground"
                  >
                    {timeAgo(failure.createdAt)}
                  </time>
                </div>
                <p className="line-clamp-3 font-mono text-xs break-words text-destructive">
                  {failure.error ?? 'No error message recorded'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  )
}
