import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { PageHeader } from '@/components/app/page-header'
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
import type { Me, ResponseData } from '@/lib/api/types'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  planLabels,
} from '@/lib/format'
import { priceNote, priceOf, usePricing } from '@/lib/pricing'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/billing')({
  // A plan from the pricing page or a sign-in redirect, shown highlighted.
  // `code` comes from a shared promo or ambassador link and fills in the code box.
  validateSearch: z.object({
    plan: z.enum(['pro', 'lifetime']).optional().catch(undefined),
    code: z.string().max(40).optional(),
    // Dodo sends the buyer back here after paying, with the id of their checkout.
    checkout: z.uuid().optional().catch(undefined),
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
  const { plan, code, checkout } = Route.useSearch()
  const { data: me } = useQuery(meQuery)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Plans and billing"
        description="Your plan, what you've used this month, and upgrades."
      />
      {me ? (
        <Billing me={me} highlight={plan} code={code} returnedFrom={checkout} />
      ) : (
        <Skeleton className="h-80" />
      )}
    </div>
  )
}

const paidPlans = [
  {
    id: 'pro',
    name: 'Basic',
    body: '60 AI-tailored resumes a month and unlimited AI edits, paid month by month.',
  },
  {
    id: 'lifetime',
    name: 'Pro',
    body: 'The same AI limits as Basic, for one payment.',
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
  returnedFrom,
}: {
  me: Me
  highlight?: 'pro' | 'lifetime'
  code?: string
  returnedFrom?: string
}) {
  const { data: usage } = useQuery(usageQuery)
  const { data: subscription } = useQuery(subscriptionQuery)
  const { checkout, waiting, refresh, confirmReturn } = useCheckout()
  const navigate = Route.useNavigate()
  const pricing = usePricing()
  useEffect(() => {
    if (!returnedFrom) return
    confirmReturn(returnedFrom, highlight)
    // So a reload doesn't announce the payment again.
    void navigate({
      search: (prev) => ({ ...prev, checkout: undefined }),
      replace: true,
    })
  }, [returnedFrom])
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { data: refundQuote, error: refundQuoteError } =
    useQuery(refundQuoteQuery)
  const quote = refundQuote?.quote
  const refundBlocked = refundQuote?.reason
  const refundStatus = refundQuote?.status
  const [confirmRefund, setConfirmRefund] = useState(false)

  const refund = useMutation({
    mutationFn: (paymentId: string) =>
      unwrap(api.POST('/v1/refunds', { body: { paymentId } })),
    onSuccess: (result) => {
      refresh()
      toast.success(
        `Refund of ${formatMoney(result.refund, result.currency)} started. It reaches your account in 5 to 7 working days.`,
      )
    },
    onError: (error) => {
      refresh()
      toast.error(errorMessage(error))
    },
  })

  const cancel = useMutation({
    mutationFn: () => unwrap(api.DELETE('/v1/subscription')),
    onSuccess: () => {
      refresh()
      toast.success(
        'Basic cancelled. You keep it until the end of this billing period.',
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
            {activeSub?.plan === 'lifetime'
              ? 'One payment. Nothing renews.'
              : activeSub?.currentPeriodEnd
                ? activeSub.status === 'cancelled'
                  ? `Cancelled. Active until ${formatDate(activeSub.currentPeriodEnd)}.`
                  : activeSub.renews
                    ? `Renews on ${formatDate(activeSub.currentPeriodEnd)}.`
                    : `Active until ${formatDate(activeSub.currentPeriodEnd)}.`
                : me.plan === 'free'
                  ? 'Free limits are for the life of your account. AI imports reset on the 1st of every month.'
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
              {usage.pdf && (
                <UsageRow
                  label="PDF downloads"
                  used={usage.pdf.used}
                  limit={usage.pdf.limit}
                />
              )}
              {usage.ownAiKey ? (
                <p className="text-sm text-muted-foreground">
                  AI requests run on your own key, so tailoring, edits and
                  imports aren't limited.
                </p>
              ) : (
                <>
                  <UsageRow
                    label={
                      usage.plan === 'free'
                        ? 'AI-tailored resumes'
                        : 'AI-tailored resumes this month'
                    }
                    used={usage.tailor.used}
                    limit={usage.tailor.limit}
                  />
                  <UsageRow
                    label={
                      usage.plan === 'free' ? 'AI edits' : 'AI edits this month'
                    }
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
        {((activeSub?.renews && activeSub.status === 'active') ||
          quote ||
          refundBlocked ||
          refundStatus ||
          refundQuoteError) && (
          <CardFooter className="flex flex-col items-start gap-3">
            {refundStatus && <RefundStatus status={refundStatus} />}
            <div className="flex flex-wrap gap-2">
              {activeSub?.renews && activeSub.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending && <Spinner data-icon="inline-start" />}
                  Cancel Basic
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
                You can get {formatMoney(quote.refund, quote.currency)} back
                until {formatDateTime(quote.refundableUntil)}, as long as you
                make no more than 3 tailored and 3 AI-written resumes before
                then.
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
          title="Cancel Basic?"
          description="You keep Basic until the end of the period you've paid for, then move to the Free plan. Nothing is deleted."
          confirmLabel="Cancel Basic"
          cancelLabel="Keep Basic"
          destructive
          onConfirm={() => cancel.mutate()}
        />
        {quote && (
          <ConfirmDialog
            open={confirmRefund}
            onOpenChange={setConfirmRefund}
            title={`Refund ${formatMoney(quote.refund, quote.currency)}?`}
            description={`Everything you paid, including any tax, goes back to your original payment method in 5 to 7 working days. Your ${quote.plan ? planLabels[quote.plan] : 'plan'} ends now. Your resumes are not deleted.`}
            confirmLabel={`Refund ${formatMoney(quote.refund, quote.currency)}`}
            cancelLabel="Keep my plan"
            destructive
            onConfirm={() => refund.mutate(quote.paymentId)}
          />
        )}
      </Card>

      {me.plan !== 'lifetime' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {paidPlans
            .filter((plan) => me.plan === 'free' || plan.id === 'lifetime')
            .map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  highlight === plan.id && 'border-primary ring-1 ring-primary',
                )}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {priceOf(plan.id, pricing)}{' '}
                    {plan.id === 'lifetime' ? 'once' : 'a month'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {plan.body} {priceNote(plan.id)}
                </CardContent>
                <CardFooter>
                  <Button
                    variant={plan.id === 'pro' ? 'default' : 'outline'}
                    onClick={() => checkout.mutate(plan.id)}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending && checkout.variables === plan.id && (
                      <Spinner data-icon="inline-start" />
                    )}
                    {plan.id === 'lifetime' ? 'Get Pro' : 'Choose Basic'}
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

type RefundState = ResponseData<'/v1/refunds/quote', 'get'>['status']

// Where a refund is: we only know when it's asked for and when we've sent it; the bank's part is an estimate.
function RefundStatus({ status }: { status: NonNullable<RefundState> }) {
  const sent = status.state === 'refunded'
  const steps = [
    {
      label: 'Requested',
      note: formatDateTime(status.requestedAt),
      done: true,
    },
    {
      label: 'Refund sent',
      note: sent ? 'Sent to your card' : 'Within 4 to 5 working days',
      done: sent,
    },
    {
      label: 'In your account',
      note: '5 to 7 working days after it is sent',
      done: false,
    },
  ]
  return (
    <div role="status" className="w-full rounded-lg border bg-muted/40 p-4">
      <p className="font-medium">
        Refund of {formatMoney(status.amount, status.currency)}{' '}
        {sent ? 'sent' : 'requested'}
      </p>
      <ol className="mt-4 grid grid-cols-3 gap-3 text-sm">
        {steps.map((step) => (
          <li key={step.label} className="flex flex-col gap-1.5">
            <span
              aria-hidden
              className={cn(
                'h-1.5 rounded-full',
                step.done ? 'bg-primary' : 'bg-border',
              )}
            />
            <span className="font-medium">
              {step.label}
              <span className="sr-only">
                {step.done ? ', done' : ', not yet'}
              </span>
            </span>
            <span className="text-muted-foreground">{step.note}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
