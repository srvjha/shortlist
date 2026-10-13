import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  EmptyNote,
  QueryView,
  Section,
  Stat,
  StatGrid,
  TrendChart,
  seriesColor,
} from '@/components/admin/admin-ui'
import { BreakdownList } from '@/components/analytics/breakdown-list'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminRevenueQuery } from '@/lib/api/queries'
import type { AdminRevenue } from '@/lib/api/types'
import {
  formatDateTime,
  formatInr,
  formatNumber,
  percent,
  planLabels,
} from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/revenue')({
  head: () => ({ meta: [{ title: `Revenue · Admin | ${site.name}` }] }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminRevenueQuery(deps.days)),
  component: RevenuePage,
})

function RevenuePage() {
  const { days = 30 } = Route.useSearch()
  const revenue = useQuery(adminRevenueQuery(days))
  return (
    <QueryView query={revenue}>
      {(data) => <RevenueReport data={data} />}
    </QueryView>
  )
}

const statusVariant = {
  captured: 'default',
  failed: 'destructive',
  refunded: 'secondary',
  created: 'outline',
} as const

const statusLabels: Record<string, string> = {
  captured: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  created: 'Abandoned or pending',
}

function RevenueReport({ data }: { data: AdminRevenue }) {
  const { totals } = data
  const active = (plan: 'season_pass' | 'pro') =>
    data.activeSubscriptions.find((row) => row.plan === plan)?.active ?? 0

  return (
    <div className="flex flex-col gap-10">
      {!data.razorpayConfigured && (
        <Alert>
          <AlertTitle>Payments are off</AlertTitle>
          <AlertDescription>
            Razorpay keys aren't set on the server, so nobody can buy a plan
            yet. Plans you give from a user's page still work.
          </AlertDescription>
        </Alert>
      )}

      <StatGrid>
        <Stat
          label="Revenue"
          value={formatInr(totals.paise)}
          current={totals.paise}
          previous={totals.previousPaise}
          format={formatInr}
        />
        <Stat
          label="All time"
          value={formatInr(totals.allTimePaise)}
          hint={`from ${formatNumber(totals.payers)} ${totals.payers === 1 ? 'person' : 'people'}`}
        />
        <Stat
          label="Checkout conversion"
          value={percent(totals.checkoutsPaid, totals.checkouts)}
          hint={`${formatNumber(totals.checkoutsPaid)} of ${formatNumber(totals.checkouts)} checkouts paid`}
        />
        <Stat
          label="Active paid plans"
          value={formatNumber(active('season_pass') + active('pro'))}
          hint={`${formatNumber(active('season_pass'))} Season Pass, ${formatNumber(active('pro'))} Pro`}
        />
      </StatGrid>

      <div className="grid gap-10 lg:grid-cols-3">
        <Section title="Revenue per day" className="lg:col-span-2">
          {totals.paise === 0 ? (
            <EmptyNote>No revenue in this period.</EmptyNote>
          ) : (
            <TrendChart
              data={data.byDay.map((day) => ({
                day: day.day,
                value: day.paise,
              }))}
              color={seriesColor.revenue}
              unit={['earned', 'earned']}
              format={formatInr}
            />
          )}
        </Section>
        <BreakdownList
          title="Checkouts by result"
          rows={data.statuses.map((row) => ({
            label: statusLabels[row.label] ?? row.label,
            views: row.count,
          }))}
          empty="No checkouts in this period"
          color={seriesColor.revenue}
        />
      </div>

      <Section
        title="Latest payments"
        description="The 50 most recent checkouts."
      >
        {data.payments.length === 0 ? (
          <EmptyNote>No payments yet.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Razorpay ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(payment.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: payment.userId }}
                        className="hover:underline"
                      >
                        {payment.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {payment.plan ? planLabels[payment.plan] : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInr(payment.amountPaise)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[payment.status]}>
                        {statusLabels[payment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.method ?? 'None'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {payment.razorpayPaymentId ?? 'None'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  )
}
