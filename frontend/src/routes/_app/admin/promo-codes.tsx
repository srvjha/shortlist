import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import {
  EmptyNote,
  QueryView,
  Section,
  Stat,
  StatGrid,
} from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { adminPromoCodesQuery, queryKeys } from '@/lib/api/queries'
import type { AdminPromoCodes } from '@/lib/api/types'
import {
  formatDate,
  formatNumber,
  percent,
  planLabels,
  timeAgo,
} from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/promo-codes')({
  head: () => ({ meta: [{ title: `Promo codes · Admin | ${site.name}` }] }),
  loader: ({ context }) =>
    void context.queryClient.prefetchQuery(adminPromoCodesQuery),
  component: PromoCodesPage,
})

function PromoCodesPage() {
  const codes = useQuery(adminPromoCodesQuery)
  return (
    <QueryView query={codes}>
      {(data) => <PromoCodesReport data={data} />}
    </QueryView>
  )
}

const shareLink = (code: string) => `${site.url}/billing?code=${code}`

function PromoCodesReport({ data }: { data: AdminPromoCodes }) {
  const queryClient = useQueryClient()
  const sum = (key: 'redemptions' | 'madeResume' | 'tailored' | 'paid') =>
    data.codes.reduce((total, code) => total + code[key], 0)
  const redemptions = sum('redemptions')

  const toggle = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      unwrap(
        api.PATCH('/v1/admin/promo-codes/{promoCodeId}', {
          params: { path: { promoCodeId: input.id } },
          body: { active: input.active },
        }),
      ),
    onSuccess: (next) =>
      queryClient.setQueryData(adminPromoCodesQuery.queryKey, next),
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="flex flex-col gap-10">
      <StatGrid>
        <Stat
          label="Codes redeemed"
          value={formatNumber(redemptions)}
          hint={`across ${formatNumber(data.codes.length)} ${data.codes.length === 1 ? 'code' : 'codes'}`}
        />
        <Stat
          label="Made a resume"
          value={percent(sum('madeResume'), redemptions)}
          hint={`${formatNumber(sum('madeResume'))} of ${formatNumber(redemptions)}`}
        />
        <Stat
          label="Tailored to a job"
          value={percent(sum('tailored'), redemptions)}
          hint={`${formatNumber(sum('tailored'))} of ${formatNumber(redemptions)}`}
        />
        <Stat
          label="Paid later"
          value={formatNumber(sum('paid'))}
          hint="redeemed a code, then bought a plan"
        />
      </StatGrid>

      <Section
        title="Create a code"
        description="Ambassador codes belong to one person, so you see who brought which users. Each user can redeem one code, once."
      >
        <CreateCode
          onCreated={(next) => {
            queryClient.setQueryData(adminPromoCodesQuery.queryKey, next)
            void queryClient.invalidateQueries({ queryKey: queryKeys.admin })
          }}
        />
      </Section>

      <Section
        title="Codes"
        description="How the people who redeemed each code went on to use Shortlist."
      >
        {data.codes.length === 0 ? (
          <EmptyNote>No codes yet. Create one above.</EmptyNote>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Gives</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Made a resume</TableHead>
                <TableHead className="text-right">Tailored</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.codes.map((code) => {
                const expired =
                  code.expiresAt !== null &&
                  new Date(code.expiresAt) <= new Date()
                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {code.code}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Copy the link for ${code.code}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(
                              shareLink(code.code),
                            )
                            toast.success('Link copied')
                          }}
                        >
                          <CopyIcon />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {code.kind === 'ambassador' && (
                          <Badge variant="secondary">Ambassador</Badge>
                        )}
                        {code.owner}
                        {expired && <Badge variant="outline">Expired</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {code.months} {code.months === 1 ? 'month' : 'months'}{' '}
                      {planLabels[code.plan]}
                      {code.expiresAt && (
                        <div className="text-xs text-muted-foreground">
                          until {formatDate(code.expiresAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(code.redemptions)}
                      {code.maxRedemptions !== null &&
                        ` / ${formatNumber(code.maxRedemptions)}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(code.madeResume)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(code.tailored)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(code.paid)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {code.lastRedeemedAt
                        ? timeAgo(code.lastRedeemedAt)
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={code.active}
                        disabled={toggle.isPending}
                        aria-label={`${code.code} is ${code.active ? 'on' : 'off'}`}
                        onCheckedChange={(active) =>
                          toggle.mutate({ id: code.id, active })
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Recent redemptions">
        {data.recent.length === 0 ? (
          <EmptyNote>Nobody has redeemed a code yet.</EmptyNote>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent.map((row) => (
                <TableRow key={`${row.userId}-${row.code}`}>
                  <TableCell>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: row.userId }}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{row.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(row.redeemedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  )
}

function CreateCode({
  onCreated,
}: {
  onCreated: (next: AdminPromoCodes) => void
}) {
  const empty = {
    code: '',
    ambassador: false,
    owner: '',
    months: '6',
    maxRedemptions: '',
    expiresAt: '',
    note: '',
  }
  const [form, setForm] = useState(empty)
  const set =
    (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: event.target.value })

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/promo-codes', {
          body: {
            code: form.code,
            kind: form.ambassador ? 'ambassador' : 'promo',
            plan: 'pro',
            months: Number(form.months),
            ...(form.maxRedemptions && {
              maxRedemptions: Number(form.maxRedemptions),
            }),
            // End of the chosen day, in the admin's own time zone.
            ...(form.expiresAt && {
              expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
            }),
            ...(form.owner.trim() && { owner: form.owner.trim() }),
            ...(form.note.trim() && { note: form.note.trim() }),
          },
        }),
      ),
    onSuccess: (next) => {
      onCreated(next)
      toast.success(`${form.code.toUpperCase()} created`)
      setForm(empty)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault()
        create.mutate()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-code">Code</Label>
        <Input
          id="promo-code"
          required
          pattern="[A-Za-z0-9\-]{3,32}"
          title="3 to 32 letters, numbers or hyphens"
          placeholder="PLACEMENT100"
          value={form.code}
          onChange={set('code')}
          className="font-mono uppercase"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-months">Pro months</Label>
        <Input
          id="promo-months"
          type="number"
          required
          min={1}
          max={12}
          value={form.months}
          onChange={set('months')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-max">Max uses (blank for no limit)</Label>
        <Input
          id="promo-max"
          type="number"
          min={1}
          placeholder="100"
          value={form.maxRedemptions}
          onChange={set('maxRedemptions')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-expires">Expires (optional)</Label>
        <Input
          id="promo-expires"
          type="date"
          value={form.expiresAt}
          onChange={set('expiresAt')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-owner">
          {form.ambassador ? 'Ambassador' : 'Campaign (optional)'}
        </Label>
        <Input
          id="promo-owner"
          required={form.ambassador}
          placeholder={
            form.ambassador ? 'Rahul, IIT Delhi' : 'Placement season'
          }
          value={form.owner}
          onChange={set('owner')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-note">Note (optional)</Label>
        <Input
          id="promo-note"
          placeholder="Shared in the GDG group"
          value={form.note}
          onChange={set('note')}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="promo-ambassador"
          checked={form.ambassador}
          onCheckedChange={(ambassador) => setForm({ ...form, ambassador })}
        />
        <Label htmlFor="promo-ambassador">Ambassador code</Label>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Spinner data-icon="inline-start" />}
          Create code
        </Button>
      </div>
    </form>
  )
}
