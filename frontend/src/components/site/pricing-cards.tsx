import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useCheckout } from '@/hooks/use-checkout'
import { useSession } from '@/lib/auth-client'
import type { Pricing } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { plans } from '@/lib/plans'
import { paymentLine, priceNote, priceOf, usePricing } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type Plan = (typeof plans)[number]

function PlanCta({ plan }: { plan: Plan }) {
  const featured = 'featured' in plan && plan.featured
  const { data: session } = useSession()
  const { checkout, me } = useCheckout({ enabled: !!session })
  const style = {
    size: 'lg',
    variant: featured
      ? 'secondary'
      : plan.id === 'free'
        ? 'outline'
        : 'default',
    className: 'mt-8 h-12 w-full text-base',
  } as const

  if (plan.id === 'free')
    return (
      <Button {...style} asChild>
        <Link to="/login" search={{ mode: 'signup' }}>
          {plan.cta}
        </Link>
      </Button>
    )
  // Signed out: sign up, then land on billing with this plan picked.
  if (!session)
    return (
      <Button {...style} asChild>
        <Link
          to="/login"
          search={{ mode: 'signup', redirect: `/billing?plan=${plan.id}` }}
        >
          {plan.cta}
        </Link>
      </Button>
    )
  // Already on a paid plan: billing shows what they have and when it renews.
  if (me && me.plan !== 'free')
    return (
      <Button {...style} asChild>
        <Link to="/billing">Manage your plan</Link>
      </Button>
    )
  return (
    <Button
      {...style}
      onClick={() => checkout.mutate(plan.id)}
      disabled={checkout.isPending}
    >
      {checkout.isPending && <Spinner data-icon="inline-start" />}
      {plan.cta}
    </Button>
  )
}

// headingLevel: 2 under a page h1 (pricing page), 3 under a section h2 (landing page).
export function PricingCards({
  headingLevel = 3,
  className,
  pricing: initial,
}: {
  headingLevel?: 2 | 3
  className?: string
  pricing?: Pricing | null
}) {
  const Heading = `h${headingLevel}` as const
  const pricing = usePricing(initial)
  return (
    <div className={className}>
      {/* Cards share row lines (subgrid) so names, prices, buttons and lists align across plans. */}
      <ul
        aria-label="Plans and prices"
        className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto_1fr]"
      >
        {plans.map((plan) => {
          const featured = 'featured' in plan && plan.featured
          return (
            <li
              key={plan.id}
              className={cn(
                'flex flex-col rounded-3xl border p-7 sm:p-8 lg:row-span-5 lg:grid lg:grid-rows-subgrid lg:gap-y-0',
                // Featured first on phones, so the plan most people pick is the one they see.
                featured
                  ? 'order-first border-primary bg-primary text-primary-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.35)] lg:order-none'
                  : 'bg-card text-card-foreground',
              )}
            >
              <Heading className="font-sans text-xl font-semibold">
                {plan.name}
              </Heading>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="font-serif text-5xl font-semibold tracking-tight tabular-nums">
                  {plan.id === 'free'
                    ? formatMoney(0, pricing.currency)
                    : priceOf(plan.id, pricing)}
                </span>
                {plan.period && (
                  <span
                    className={
                      featured ? 'opacity-80' : 'text-muted-foreground'
                    }
                  >
                    {plan.period}
                  </span>
                )}
              </p>
              <div
                className={cn(
                  'mt-4',
                  featured ? 'opacity-90' : 'text-muted-foreground',
                )}
              >
                <p>{plan.forWhom}</p>
                <p className="mt-1 text-sm">
                  {plan.id === 'free' ? plan.note : priceNote(plan.id)}
                </p>
              </div>
              <PlanCta plan={plan} />
              <div className="mt-8">
                <p
                  className={cn(
                    'text-sm font-medium',
                    featured && 'opacity-90',
                  )}
                >
                  {plan.listTitle}
                </p>
                <ul
                  className={cn(
                    'mt-2 divide-y',
                    featured ? 'divide-primary-foreground/20' : 'divide-border',
                  )}
                >
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 py-3">
                      <CheckIcon
                        aria-hidden
                        className={cn(
                          'mt-0.5 size-5 shrink-0',
                          featured ? 'text-primary-foreground' : 'text-primary',
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {paymentLine} Changed your mind? You can ask for a refund within 7 days,
        if you've made at most 3 tailored and 3 AI-written resumes.
      </p>
    </div>
  )
}
