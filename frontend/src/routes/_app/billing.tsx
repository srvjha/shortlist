import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useCheckout } from '@/hooks/use-checkout'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import {
  meQuery,
  refundQuoteQuery,
  subscriptionQuery,
  usageQuery,
} from '@/lib/api/queries'
import type { Me } from '@/lib/api/types'
import { formatDate, formatDateTime, formatInr, planLabels } from '@/lib/format'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/billing')({
  // A plan from the pricing page or a sign-in redirect, shown highlighted.
  // `code` comes from a shared promo or ambassador link and fills in the code box.
  validateSearch: z.object({
    plan: z.enum(['season_pass', 'pro']).optional(),
    code: z.string().max(40).optional(),
  }),
  head: () => ({ meta: [{ title: `Plans and billing | ${site.name}` }] }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(meQuery)
    void context.queryClient.prefetchQuery(usageQuery)
    void context.queryClient.prefetchQuery(subscriptionQuery)
  },
  component: BillingPage,
})

function BillingPage() {
  const { plan, code } = Route.useSearch()
  const { data: me } = useQuery(meQuery)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Plans and billing"
        description="Your plan, what you've used this month, and upgrades."
      />
      {me ? (
        <Billing me={me} highlight={plan} code={code} />
      ) : (
        <Skeleton className="h-80" />
      )}
    </div>
  )
}

const paidPlans = [
  {
    id: 'season_pass',
    name: 'Season Pass',
    price: '₹499 for 6 months',
    body: 'One payment for 6 months. 40 AI-tailored resumes a month and unlimited AI edits.',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹129 a month',
    body: 'The same AI limits as the Season Pass, billed monthly. Cancel anytime.',
  },
] as const

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const unlimited = limit >= 1000
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} of {unlimited ? 'unlimited' : limit}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={Math.min(100, (used / limit) * 100)}
          aria-label={label}
        />
      )}
    </div>
  )
}

function Billing({
  me,
  highlight,
  code,
}: {
  me: Me
  highlight?: 'season_pass' | 'pro'
  code?: string
}) {
  const { data: usage } = useQuery(usageQuery)
  const { data: subscription } = useQuery(subscriptionQuery)
  const { checkout, waiting, refresh } = useCheckout()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { data: refundQuote, error: refundQuoteError } =
    useQuery(refundQuoteQuery)
  const quote = refundQuote?.quote
  const refundBlocked = refundQuote?.reason
  const [confirmRefund, setConfirmRefund] = useState(false)

  const refund = useMutation({
    mutationFn: (paymentId: string) =>
      unwrap(api.POST('/v1/refunds', { body: { paymentId } })),
    onSuccess: (result) => {
      refresh()
      toast.success(
        `Refund of ${formatInr(result.refundPaise)} started. It reaches your account in 5 to 7 working days.`,
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const cancel = useMutation({
    mutationFn: () => unwrap(api.DELETE('/v1/subscription')),
    onSuccess: () => {
      refresh()
      toast.success(
        'Pro cancelled. You keep it until the end of this billing period.',
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const activeSub = subscription?.subscription
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {planLabels[me.plan]} plan
            {waiting && <Spinner />}
          </CardTitle>
          <CardDescription>
            {activeSub?.currentPeriodEnd
              ? activeSub.status === 'cancelled'
                ? `Cancelled. Active until ${formatDate(activeSub.currentPeriodEnd)}.`
                : activeSub.plan === 'pro'
                  ? `Renews on ${formatDate(activeSub.currentPeriodEnd)}.`
                  : `Active until ${formatDate(activeSub.currentPeriodEnd)}.`
              : 'Usage resets on the 1st of every month.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <div className="flex flex-col gap-4">
              <UsageRow
                label="Resumes"
                used={usage.resumes.used}
                limit={usage.resumes.limit}
              />
              {usage.ownAiKey ? (
                <p className="text-sm text-muted-foreground">
                  AI requests run on your own key, so tailoring, edits and
                  imports aren't limited.
                </p>
              ) : (
                <>
                  <UsageRow
                    label="AI-tailored resumes this month"
                    used={usage.tailor.used}
                    limit={usage.tailor.limit}
                  />
                  <UsageRow
                    label="AI edits this month"
                    used={usage.edit.used}
                    limit={usage.edit.limit}
                  />
                  <UsageRow
                    label="AI imports this month"
                    used={usage.import.used}
                    limit={usage.import.limit}
                  />
                </>
              )}
            </div>
          ) : (
            <Skeleton className="h-32" />
          )}
        </CardContent>
        {((activeSub?.plan === 'pro' && activeSub.status === 'active') ||
          quote ||
          refundBlocked ||
          refundQuoteError) && (
          <CardFooter className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-2">
              {activeSub?.plan === 'pro' && activeSub.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending && <Spinner data-icon="inline-start" />}
                  Cancel Pro
                </Button>
              )}
              {quote && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmRefund(true)}
                  disabled={refund.isPending}
                >
                  {refund.isPending && <Spinner data-icon="inline-start" />}
                  Request a refund
                </Button>
              )}
            </div>
            {quote && (
              <p className="text-sm text-muted-foreground">
                You can get {formatInr(quote.refundPaise)} back until{' '}
                {formatDateTime(quote.refundableUntil)}, as long as you make no
                more than 3 tailored and 3 AI-written resumes before then.
              </p>
            )}
            {refundBlocked && (
              <p className="text-sm text-muted-foreground">{refundBlocked}</p>
            )}
            {refundQuoteError && (
              <p className="text-sm text-muted-foreground">
                {errorMessage(refundQuoteError)}
              </p>
            )}
          </CardFooter>
        )}
        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="Cancel Pro?"
          description="You keep Pro until the end of the period you've paid for, then move to the Free plan. Nothing is deleted."
          confirmLabel="Cancel Pro"
          cancelLabel="Keep Pro"
          destructive
          onConfirm={() => cancel.mutate()}
        />
        {quote && (
          <ConfirmDialog
            open={confirmRefund}
            onOpenChange={setConfirmRefund}
            title={`Refund ${formatInr(quote.refundPaise)}?`}
            description={`You paid ${formatInr(quote.amountPaidPaise)}. Razorpay keeps ${formatInr(quote.feePaise)} as its payment fee (including GST), so ${formatInr(quote.refundPaise)} goes back to your original payment method in 5 to 7 working days. Your ${quote.plan ? planLabels[quote.plan] : 'plan'} ends now. Your resumes are not deleted.`}
            confirmLabel={`Refund ${formatInr(quote.refundPaise)}`}
            cancelLabel="Keep my plan"
            destructive
            onConfirm={() => refund.mutate(quote.paymentId)}
          />
        )}
      </Card>

      {me.plan === 'free' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {paidPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                highlight === plan.id && 'border-primary ring-1 ring-primary',
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.id === 'season_pass' && <Badge>Most popular</Badge>}
                </CardTitle>
                <CardDescription>{plan.price}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {plan.body}
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.id === 'season_pass' ? 'default' : 'outline'}
                  onClick={() => checkout.mutate(plan.id)}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending && checkout.variables === plan.id && (
                    <Spinner data-icon="inline-start" />
                  )}
                  {plan.id === 'season_pass' ? 'Get the Season Pass' : 'Go Pro'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {me.plan === 'free' && <RedeemCode initial={code} onRedeemed={refresh} />}
    </div>
  )
}

function RedeemCode({
  initial = '',
  onRedeemed,
}: {
  initial?: string
  onRedeemed: () => void
}) {
  const [code, setCode] = useState(initial)
  const redeem = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/v1/promo-redemptions', { body: { code } })),
    onSuccess: (result) => {
      onRedeemed()
      const end = result.subscription?.currentPeriodEnd
      toast.success(
        `${planLabels[result.plan]} added${end ? `, active until ${formatDate(end)}` : ''}.`,
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Have a code?</CardTitle>
        <CardDescription>
          Enter a promo or ambassador code to get a plan for free.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (code.trim()) redeem.mutate()
          }}
        >
          <Input
            aria-label="Promo code"
            placeholder="PLACEMENT100"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="uppercase sm:max-w-xs"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!code.trim() || redeem.isPending}
          >
            {redeem.isPending && <Spinner data-icon="inline-start" />}
            Redeem
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
