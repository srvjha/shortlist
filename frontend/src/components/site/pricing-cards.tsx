import { Link } from '@tanstack/react-router'
import { CheckIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useCheckout } from '@/hooks/use-checkout'
import { useSession } from '@/lib/auth-client'
import { plans } from '@/lib/plans'
import { cn } from '@/lib/utils'

type Plan = (typeof plans)[number]

function PlanCta({ plan }: { plan: Plan }) {
  const featured = 'featured' in plan && plan.featured
  const { data: session } = useSession()
  const { checkout, me } = useCheckout({ enabled: !!session })
  const style = {
    size: 'lg',
    variant: featured ? 'default' : 'outline',
    className: 'mt-6 h-11 w-full text-base',
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
}: {
  headingLevel?: 2 | 3
  className?: string
}) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className={className}>
      {/* Cards share row lines (subgrid) so names, prices, buttons and lists align across plans. */}
      <ul
        aria-label="Plans and prices"
        className="grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto_auto_1fr]"
      >
        {plans.map((plan) => {
          const featured = 'featured' in plan && plan.featured
          return (
            <li
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-6 sm:p-8 lg:row-span-6 lg:grid lg:grid-rows-subgrid lg:gap-y-0',
                // Featured first on phones, so the plan most people pick is the one they see.
                featured
                  ? 'order-first border-2 border-primary shadow-[0_24px_48px_-24px_rgb(0_0_0/0.3)] lg:order-none'
                  : undefined,
              )}
            >
              <div className="flex flex-col items-start justify-end gap-3">
                {'badge' in plan && (
                  <Badge className="h-7 px-3 text-sm">
                    <StarIcon aria-hidden className="fill-current" />
                    {plan.badge}
                  </Badge>
                )}
                <Heading className="font-sans text-xl font-semibold">
                  {plan.name}
                </Heading>
              </div>
              <p className="mt-2 text-muted-foreground">{plan.forWhom}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-serif text-5xl font-semibold tracking-tight tabular-nums">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.note}</p>
              <PlanCta plan={plan} />
              <div className="mt-8 border-t pt-6">
                <p className="text-sm font-medium">{plan.listTitle}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <CheckIcon
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-primary"
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
        Pay with UPI, cards or net banking through Razorpay. Changed your mind?
        Ask for a refund within 6 hours.
      </p>
    </div>
  )
}
