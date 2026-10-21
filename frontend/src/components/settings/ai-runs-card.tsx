import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { aiRunsQuery } from '@/lib/api/queries'
import type { AiRunList } from '@/lib/api/types'
import { formatDateTime, formatNumber, formatUsd, timeAgo } from '@/lib/format'

const stepLabels: Record<AiRunList['runs'][number]['step'], string> = {
  import: 'Import',
  jd_parse: 'Read job post',
  plan: 'Plan',
  rewrite: 'Tailor',
  verify: 'Verify',
  inline_edit: 'Inline edit',
  chat_edit: 'Chat edit',
  fix_compile: 'Fix LaTeX',
  draft: 'Write from notes',
  ats_match: 'ATS job match',
}

export function AiRunsCard() {
  const { data, isPending } = useQuery(aiRunsQuery)

  if (isPending) return <Skeleton className="h-48" />
  if (!data) return null

  const hasUnknown = data.runs.some((run) => run.costUsdMicros === null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent AI runs</CardTitle>
        <CardDescription>
          Your last 20 AI requests and what each one cost.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI runs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <time
                      dateTime={run.createdAt}
                      title={formatDateTime(run.createdAt)}
                    >
                      {timeAgo(run.createdAt)}
                    </time>
                  </TableCell>
                  <TableCell>
                    {stepLabels[run.step]}
                    {run.status === 'failed' && (
                      <span className="text-muted-foreground"> (failed)</span>
                    )}
                    {run.byok && (
                      <span className="text-muted-foreground">
                        {' '}
                        on your key
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {run.model}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(run.inputTokens + run.outputTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {run.costUsdMicros === null ? (
                      <span className="text-muted-foreground">Unknown</span>
                    ) : (
                      formatUsd(run.costUsdMicros)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1 text-sm">
        <p>
          This month:{' '}
          <span className="font-medium tabular-nums">
            {formatUsd(data.monthCostUsdMicros)}
          </span>
          {data.monthUnpricedRuns > 0 && (
            <span className="text-muted-foreground">
              {' '}
              plus {data.monthUnpricedRuns} run
              {data.monthUnpricedRuns === 1 ? '' : 's'} with an unknown price
            </span>
          )}
        </p>
        {(hasUnknown || data.monthUnpricedRuns > 0) && (
          <p className="text-muted-foreground">
            We don't have prices for some models. For runs on your own key,
            check your provider's dashboard for the exact cost.
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
