import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDashedIcon,
} from 'lucide-react'
import { QueryView, Section, Stat, StatGrid } from '@/components/admin/admin-ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminSystemQuery } from '@/lib/api/queries'
import type { AdminSystem } from '@/lib/api/types'
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
  timeAgo,
} from '@/lib/format'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/system')({
  head: () => ({ meta: [{ title: `System · Admin | ${site.name}` }] }),
  loader: ({ context }) =>
    void context.queryClient.prefetchQuery(adminSystemQuery),
  component: SystemPage,
})

function SystemPage() {
  const system = useQuery(adminSystemQuery)
  return (
    <QueryView query={system}>
      {(data) => <SystemReport data={data} />}
    </QueryView>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

function Check({
  state,
  label,
  detail,
}: {
  state: 'ok' | 'warn' | 'off'
  label: string
  detail: React.ReactNode
}) {
  const Icon =
    state === 'ok'
      ? CheckCircle2Icon
      : state === 'warn'
        ? CircleAlertIcon
        : CircleDashedIcon
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          state === 'ok' && 'text-primary',
          state === 'warn' && 'text-destructive',
          state === 'off' && 'text-muted-foreground',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-3 gap-y-0.5">
        <span className="font-medium">
          {label}
          <span className="sr-only">
            :{' '}
            {state === 'ok'
              ? 'working'
              : state === 'warn'
                ? 'needs attention'
                : 'not set up'}
          </span>
        </span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </li>
  )
}

function SystemReport({ data }: { data: AdminSystem }) {
  const backupAge = data.backup
    ? Date.now() - new Date(data.backup.modifiedAt).getTime()
    : null
  const connections = data.database.connections.reduce(
    (sum, row) => sum + row.count,
    0,
  )

  return (
    <div className="flex flex-col gap-10">
      <p className="-mt-4 text-sm text-muted-foreground">
        Checked live, and again every 30 seconds while this page is open.
      </p>

      <StatGrid>
        <Stat
          label="API uptime"
          value={formatDuration(data.api.uptimeSeconds)}
          hint={`Node ${data.api.nodeVersion}, ${data.api.environment}`}
        />
        <Stat
          label="API memory"
          value={formatBytes(data.api.rssBytes)}
          hint={`${formatBytes(data.api.heapUsedBytes)} heap in use`}
        />
        <Stat
          label="Database size"
          value={formatBytes(data.database.sizeBytes)}
          hint={`Postgres ${data.database.version}`}
        />
        <Stat
          label="Database connections"
          value={formatNumber(connections)}
          hint={`answered in ${data.database.latencyMs} ms`}
        />
      </StatGrid>

      <Section title="Health checks">
        <ul className="flex flex-col divide-y rounded-lg border">
          <Check
            state={data.compiler.ok ? 'ok' : 'warn'}
            label="LaTeX compiler"
            detail={
              data.compiler.mode === 'in-process'
                ? 'Runs inside the API (development)'
                : data.compiler.ok
                  ? `Answered in ${data.compiler.latencyMs} ms`
                  : 'Not answering'
            }
          />
          <Check
            state={
              backupAge === null
                ? 'warn'
                : backupAge > 2 * DAY_MS
                  ? 'warn'
                  : 'ok'
            }
            label="Database backup"
            detail={
              data.backup
                ? `Last ${timeAgo(data.backup.modifiedAt)}, ${formatBytes(data.backup.sizeBytes)}`
                : 'No backup found in storage'
            }
          />
          <Check
            state={data.lastWebhookAt ? 'ok' : 'off'}
            label="Dodo webhooks"
            detail={
              data.lastWebhookAt
                ? `Last delivery ${formatDateTime(data.lastWebhookAt)}`
                : 'None received yet'
            }
          />
        </ul>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          title="Integrations"
          description="Whether each one has its keys set."
        >
          <ul className="flex flex-col divide-y rounded-lg border">
            {data.integrations.map((integration) => (
              <Check
                key={integration.name}
                state={integration.configured ? 'ok' : 'off'}
                label={integration.name}
                detail={integration.configured ? 'Set up' : 'Not set up'}
              />
            ))}
          </ul>
        </Section>

        <Section
          title="Tables"
          description="Row counts are Postgres estimates."
        >
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.database.tables.map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-mono text-xs">
                      {table.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(table.rows)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatBytes(table.sizeBytes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>
    </div>
  )
}
