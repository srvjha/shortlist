import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  EmptyNote,
  PlanBadge,
  QueryView,
  Section,
  Stat,
  StatGrid,
  providerLabel,
  stepLabel,
  CopyEmail,
  displayName,
  templateName,
} from '@/components/admin/admin-ui'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import { adminUserQuery, meQuery, queryKeys } from '@/lib/api/queries'
import type { AdminUser } from '@/lib/api/types'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatUsd,
  initials,
  planLabels,
  timeAgo,
} from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/users/$userId')({
  head: () => ({ meta: [{ title: `User · Admin | ${site.name}` }] }),
  loader: ({ context, params }) =>
    void context.queryClient.prefetchQuery(adminUserQuery(params.userId)),
  component: UserPage,
})

function UserPage() {
  const { userId } = Route.useParams()
  const user = useQuery(adminUserQuery(userId))
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        All users
      </Link>
      <QueryView query={user}>{(data) => <UserReport data={data} />}</QueryView>
    </div>
  )
}

// A readable device from a user agent, enough to tell sessions apart.
function deviceOf(userAgent: string | null) {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser'
  const os = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Mac OS X/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Unknown OS'
  return `${browser} on ${os}`
}

function useAdminAction<T>(
  userId: string,
  action: (input: T) => Promise<unknown>,
  success: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      toast.success(success)
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminUser(userId),
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

function UserReport({ data }: { data: AdminUser }) {
  const { user } = data
  const { data: me } = useQuery(meQuery)
  const [confirm, setConfirm] = useState<
    'suspend' | 'restore' | 'sessions' | 'usage' | null
  >(null)
  const [ending, setEnding] = useState<string | null>(null)
  const [granting, setGranting] = useState(false)
  const path = { params: { path: { userId: user.id } } }

  const suspend = useAdminAction(
    user.id,
    (suspended: boolean) =>
      unwrap(
        api.PATCH('/v1/admin/users/{userId}', { ...path, body: { suspended } }),
      ),
    user.suspendedAt ? 'Account restored' : 'Account suspended and signed out',
  )
  const signOut = useAdminAction(
    user.id,
    () => expectOk(api.DELETE('/v1/admin/users/{userId}/sessions', path)),
    'Signed out on every device',
  )
  const resetUsage = useAdminAction(
    user.id,
    () => expectOk(api.DELETE('/v1/admin/users/{userId}/usage', path)),
    'Usage reset',
  )
  const revoke = useAdminAction(
    user.id,
    (subscriptionId: string) =>
      expectOk(
        api.DELETE('/v1/admin/users/{userId}/subscriptions/{subscriptionId}', {
          params: { path: { userId: user.id, subscriptionId } },
        }),
      ),
    'Plan ended',
  )
  const isSelf = me?.id === user.id

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-start gap-4">
        <Avatar className="size-16">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="text-lg">
            {initials(user.name || user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {displayName(user)}
          </h2>
          <p className="flex min-w-0 items-center gap-1 text-muted-foreground">
            <CopyEmail email={user.email} />
            {!user.emailVerified && (
              <span className="shrink-0">(not verified)</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <PlanBadge plan={user.plan} />
            {user.suspendedAt && (
              <Badge variant="destructive">
                Suspended {formatDate(user.suspendedAt)}
              </Badge>
            )}
            {user.isAnonymous && <Badge variant="outline">Guest</Badge>}
            {data.accounts.map((account) => (
              <Badge key={account.providerId} variant="outline">
                {providerLabel(account.providerId)}
              </Badge>
            ))}
            <span className="text-muted-foreground">
              @{user.username}, joined {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setGranting(true)}>
            Give a plan
          </Button>
          <Button
            variant="outline"
            disabled={data.sessions.length === 0 || signOut.isPending}
            onClick={() => setConfirm('sessions')}
          >
            Sign out everywhere
          </Button>
          {user.suspendedAt ? (
            <Button variant="outline" onClick={() => setConfirm('restore')}>
              Restore account
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={isSelf}
              title={isSelf ? "You can't suspend your own account" : undefined}
              onClick={() => setConfirm('suspend')}
            >
              Suspend
            </Button>
          )}
        </div>
      </header>

      <StatGrid className="lg:grid-cols-5">
        <Stat
          label="Resumes"
          value={formatNumber(data.resumes.filter((r) => !r.deletedAt).length)}
          hint={`${data.resumes.filter((r) => r.deletedAt).length} deleted`}
        />
        <Stat
          label="AI runs"
          value={formatNumber(data.ai.runs)}
          hint={
            data.ai.lastRunAt
              ? `Last ${timeAgo(data.ai.lastRunAt)}`
              : 'Never used'
          }
        />
        <Stat
          label="AI cost"
          value={formatUsd(data.ai.costUsdMicros)}
          hint={
            data.ai.byokRuns > 0
              ? `${formatNumber(data.ai.byokRuns)} runs on their own key`
              : 'All on our key'
          }
        />
        <Stat
          label="Share links"
          value={formatNumber(data.shareLinks)}
          hint={`${formatNumber(data.shareViews)} views`}
        />
        <Stat label="Jobs saved" value={formatNumber(data.jobs)} />
      </StatGrid>

      <Section
        title="This month's limits"
        description={
          data.usage.ownAiKey
            ? 'They use their own AI key, so AI limits do not apply.'
            : `Resets ${formatDate(data.usage.periodEnd)}.`
        }
        actions={
          !data.usage.ownAiKey && (
            <Button
              variant="outline"
              size="sm"
              disabled={resetUsage.isPending}
              onClick={() => setConfirm('usage')}
            >
              Reset usage
            </Button>
          )
        }
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {(
            [
              ['AI-tailored resumes', data.usage.tailor],
              ['AI edits', data.usage.edit],
              ['AI imports', data.usage.import],
            ] as const
          ).map(([label, counter]) => (
            <div key={label} className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <span>{label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {counter.used} of {counter.limit}
                </span>
              </div>
              <Progress
                value={Math.min(100, (counter.used / counter.limit) * 100)}
                aria-label={`${label}: ${counter.used} of ${counter.limit} used`}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Resumes">
        {data.resumes.length === 0 ? (
          <EmptyNote>No resumes yet.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Editor</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Versions</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.resumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell className="max-w-64 truncate font-medium">
                      {resume.title}
                    </TableCell>
                    <TableCell>
                      {resume.mode === 'code' ? 'LaTeX' : 'Form'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {resume.templateId
                        ? templateName(resume.templateId)
                        : 'Own LaTeX'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {resume.versions}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                      {timeAgo(resume.updatedAt)}
                    </TableCell>
                    <TableCell>
                      {resume.deletedAt ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : resume.archivedAt ? (
                        <Badge variant="secondary">Archived</Badge>
                      ) : (
                        <Badge variant="outline">Live</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="AI by step">
          {data.ai.bySteps.length === 0 ? (
            <EmptyNote>No AI runs yet.</EmptyNote>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ai.bySteps.map((row) => (
                    <TableRow key={row.step}>
                      <TableCell>{stepLabel(row.step)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.runs}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.failed}
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

        <Section title="Plans">
          {data.subscriptions.length === 0 ? (
            <EmptyNote>Always been on Free.</EmptyNote>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {data.subscriptions.map((subscription) => {
                const current =
                  ['active', 'cancelled', 'past_due'].includes(
                    subscription.status,
                  ) &&
                  subscription.currentPeriodEnd &&
                  new Date(subscription.currentPeriodEnd) > new Date()
                return (
                  <li
                    key={subscription.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {planLabels[subscription.plan]}
                    </span>
                    <Badge variant={current ? 'default' : 'secondary'}>
                      {subscription.status.replace('_', ' ')}
                    </Badge>
                    {subscription.complimentary && (
                      <Badge variant="outline">Given by admin</Badge>
                    )}
                    <span className="flex-1 text-muted-foreground">
                      {subscription.currentPeriodEnd
                        ? `${current ? 'until' : 'ended'} ${formatDate(subscription.currentPeriodEnd)}`
                        : 'not started'}
                    </span>
                    {subscription.complimentary && current && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={revoke.isPending}
                        onClick={() => setEnding(subscription.id)}
                      >
                        End now
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Payments">
          {data.payments.length === 0 ? (
            <EmptyNote>No payments.</EmptyNote>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {data.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <span className="font-medium tabular-nums">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <Badge
                    variant={
                      payment.status === 'captured'
                        ? 'default'
                        : payment.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {payment.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {payment.method ?? 'no method'}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {payment.providerPaymentId ?? 'no payment id'}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTime(payment.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Signed-in devices"
          description="The ten most recently used sessions."
        >
          {data.sessions.length === 0 ? (
            <EmptyNote>Not signed in anywhere.</EmptyNote>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {data.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <span className="font-medium">
                    {deviceOf(session.userAgent)}
                  </span>
                  <span className="text-muted-foreground">
                    Active {timeAgo(session.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={confirm === 'suspend'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Suspend ${displayName(user)}?`}
        description="They are signed out on every device and can't sign in again until you restore the account. Their resumes and share links stay as they are."
        confirmLabel="Suspend account"
        destructive
        onConfirm={() => suspend.mutate(true)}
      />
      <ConfirmDialog
        open={confirm === 'restore'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Restore ${displayName(user)}?`}
        description="They can sign in again straight away."
        confirmLabel="Restore account"
        onConfirm={() => suspend.mutate(false)}
      />
      <ConfirmDialog
        open={confirm === 'sessions'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Sign out everywhere?"
        description={`Ends all ${data.sessions.length} of their sessions. They can sign in again whenever they like.`}
        confirmLabel="Sign out everywhere"
        onConfirm={() => signOut.mutate(undefined)}
      />
      <ConfirmDialog
        open={confirm === 'usage'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reset this month's usage?"
        description="Their AI-tailored resumes, edits and imports count from zero again. Their plan stays the same."
        confirmLabel="Reset usage"
        onConfirm={() => resetUsage.mutate(undefined)}
      />
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this plan now?"
        description="They go back to the Free limits straight away. You can give them a plan again later."
        confirmLabel="End plan"
        destructive
        onConfirm={() => ending && revoke.mutate(ending)}
      />
      <GrantPlanDialog
        userId={user.id}
        name={displayName(user)}
        open={granting}
        onOpenChange={setGranting}
      />
    </div>
  )
}

function GrantPlanDialog({
  userId,
  name,
  open,
  onOpenChange,
}: {
  userId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [plan, setPlan] = useState<'season_pass' | 'pro'>('season_pass')
  const [months, setMonths] = useState('6')
  const grant = useAdminAction(
    userId,
    () =>
      unwrap(
        api.POST('/v1/admin/users/{userId}/subscriptions', {
          params: { path: { userId } },
          body: { plan, months: Number(months) },
        }),
      ),
    'Plan given',
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            grant.mutate(undefined, { onSuccess: () => onOpenChange(false) })
          }}
        >
          <DialogHeader>
            <DialogTitle>Give {name} a plan</DialogTitle>
            <DialogDescription>
              Free of charge, with no payment through a provider. It ends on its
              own when the time runs out, and you can end it early from this
              page.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="grant-plan">Plan</FieldLabel>
              <Select
                value={plan}
                onValueChange={(value) => setPlan(value as typeof plan)}
              >
                <SelectTrigger id="grant-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="season_pass">Season Pass</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="grant-months">For</FieldLabel>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger id="grant-months">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 6, 12].map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} {count === 1 ? 'month' : 'months'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={grant.isPending}>
              {grant.isPending && <Spinner data-icon="inline-start" />}
              Give plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
