import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckIcon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { FaqList } from '@/components/site/faq-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { useCheckout } from '@/hooks/use-checkout'
import { useSession } from '@/lib/auth-client'
import { plans } from '@/lib/plans'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

const comparison: { label: string; values: [string, string, string] }[] = [
  {
    label: 'Resumes you write yourself',
    values: ['Unlimited', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'Resumes tailored to a job description',
    values: ['1 a month', '40 a month', '60 a month'],
  },
  {
    label: 'Resumes written by AI from your notes',
    values: ['1, to try it', '30 a month', '30 a month'],
  },
  {
    label: 'Imports from PDF, .tex or text',
    values: ['Free (fair use)', 'Free (fair use)', 'Free (fair use)'],
  },
  {
    label: 'AI rewrites, quick changes and LaTeX fixes',
    values: ['50 a month', 'Unlimited (fair use)', 'Unlimited (fair use)'],
  },
  {
    label: 'Templates, form editor and LaTeX editor',
    values: ['All included', 'All included', 'All included'],
  },
  {
    label: 'PDF, .tex and JSON downloads',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'ATS checker with job match',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'Share links with view analytics',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'Hidden phone and email, unlisted and password-protected links',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'Version history with named checkpoints',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'Opening times, link comparison and CSV export',
    values: ['Not included', 'Included', 'Included'],
  },
  {
    label: 'Contact details unlocked with a password',
    values: ['Not included', 'Included', 'Included'],
  },
  {
    label: 'Price',
    values: ['Free', '₹499 once, for 6 months', '₹129 a month'],
  },
]

const faqs = [
  {
    q: 'Is the free plan really free?',
    a: 'Yes. Resumes you write yourself are free and unlimited, including every template, downloads, the ATS checker, version history and share links with their analytics and privacy options. Tailoring a resume to a job description is the main paid feature: Free includes one a month to try it, because each AI request costs us money to run.',
  },
  {
    q: 'What is the difference between Season Pass and Pro?',
    a: 'Both unlock the paid features. Season Pass is one payment of ₹499 for 6 months with 40 tailored resumes a month, best for a placement season. Pro is ₹129 a month with 60 tailored resumes a month, cancel anytime, best if you apply a lot or want to pay monthly.',
  },
  {
    q: 'What counts as a resume tailored with AI?',
    a: 'Each time you ask the AI to tailor a resume to a job description, it counts as one. You get a separate version for that job, so every application has its own resume. Writing and editing by hand, downloading and sharing never count.',
  },
  {
    q: 'Does importing my old resume cost anything?',
    a: 'No. Importing a PDF, .tex or text file is free on every plan, including Free, within fair use.',
  },
  {
    q: 'What happens when the Season Pass ends?',
    a: 'Your account moves back to Free. Nothing is deleted: your resumes, versions and share links all stay. You just get the free AI limits again.',
  },
  {
    q: 'Can I cancel Pro?',
    a: 'Yes, from Settings. You keep Pro until the end of the month you have paid for.',
  },
  {
    q: 'Can I use my own AI key?',
    a: 'Yes. Add an OpenAI, Anthropic or OpenRouter key in Settings and your AI requests run on it, with no monthly limits from us. You pay the provider directly.',
  },
  {
    q: 'How do I pay?',
    a: 'UPI, cards and net banking through Razorpay. Prices include GST where it applies.',
  },
]

// Product and Offer data so search engines and AI assistants can read the prices.
// A web app, not a Product: Google reads Product as goods in a shop and then asks for shipping, returns,
// images and reviews, none of which apply here.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.name,
  description: site.description,
  url: site.url,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: [
    { name: 'Free', price: '0' },
    { name: 'Season Pass (6 months)', price: '499' },
    { name: 'Pro (monthly)', price: '129' },
  ].map((offer) => ({
    '@type': 'Offer',
    ...offer,
    priceCurrency: 'INR',
    url: `${site.url}/pricing`,
  })),
}

export const Route = createFileRoute('/_site/pricing')({
  head: () => ({
    meta: [
      {
        title: `Pricing: Free Resume Builder, Paid AI Tailoring | ${site.name}`,
      },
      {
        name: 'description',
        content:
          'Build unlimited resumes free. Season Pass ₹499 for six months of AI tailoring, or Pro at ₹129 a month.',
      },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/pricing` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
    ],
  }),
  component: PricingPage,
})

function PlanCta({
  plan,
  className,
}: {
  plan: (typeof plans)[number]
  className?: string
}) {
  const featured = 'featured' in plan && plan.featured
  const { data: session } = useSession()
  const { checkout, me } = useCheckout({ enabled: !!session })
  const style = {
    size: 'lg',
    variant: featured ? 'default' : 'outline',
    className: cn('w-full', className),
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

function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 lg:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        {/* One sentence per line, so the break never splits "Pay only for more AI help". */}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="block">Resumes are free.</span>
          <span className="block">Pay only for more AI help.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Build, edit, download and share as many resumes as you like at no
          cost. Upgrade when you are tailoring one for every application.
        </p>
      </div>

      {/* Cards share row lines (subgrid) so names, prices, buttons and lists align across plans. */}
      <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto_auto_1fr]">
        {plans.map((plan) => {
          const featured = 'featured' in plan && plan.featured
          return (
            <section
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-7 sm:p-8 lg:row-span-6 lg:grid lg:grid-rows-subgrid lg:gap-y-0',
                featured &&
                  'border-primary/60 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.25)] ring-1 ring-primary/60',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id={`plan-${plan.id}`}
                  className="font-sans text-xl font-semibold"
                >
                  {plan.name}
                </h2>
                {featured && <Badge>Best value</Badge>}
              </div>
              <p className="mt-2 font-serif text-lg text-muted-foreground">
                {plan.forWhom}
              </p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-serif text-5xl font-semibold tracking-tight tabular-nums">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.note}</p>
              <PlanCta plan={plan} className="mt-6" />
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
            </section>
          )
        })}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <ShieldCheckIcon
          aria-hidden
          className="mr-2 inline size-4 align-[-3px] text-primary"
        />
        Pay with UPI, cards or net banking through Razorpay
      </p>

      {/* Deliberately quieter than the plan cards: it works on any plan and isn't a plan itself. */}
      <section
        aria-labelledby="own-key"
        className="mt-12 flex flex-col gap-5 rounded-2xl border border-dashed p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRoundIcon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 id="own-key" className="font-sans text-lg font-semibold">
            Have your own AI key?
          </h2>
          <p className="text-muted-foreground">
            Add an OpenAI, Anthropic or OpenRouter key in Settings and AI
            requests run on your key, with no monthly limits from us. Works on
            every plan, including Free.
          </p>
          <p className="text-sm text-muted-foreground">
            You pay the provider directly. Your key is encrypted and never shown
            again after you save it.
          </p>
        </div>
        <Button variant="ghost" className="self-start sm:self-center" asChild>
          <Link to="/settings" search={{ tab: 'ai' }}>
            Add your key
          </Link>
        </Button>
      </section>

      <section aria-labelledby="compare" className="mt-24">
        <h2
          id="compare"
          className="text-center text-3xl font-semibold tracking-tight"
        >
          Compare plans
        </h2>
        <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-[640px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">
                  <span className="sr-only">Feature</span>
                </TableHead>
                {plans.map((plan) => (
                  <TableHead
                    key={plan.id}
                    className={cn(
                      'font-semibold text-foreground',
                      plan.id === 'season_pass' && 'bg-primary/5',
                    )}
                  >
                    {plan.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium whitespace-normal">
                    {row.label}
                  </TableCell>
                  {row.values.map((value, index) => (
                    <TableCell
                      key={plans[index].id}
                      className={cn(
                        'whitespace-normal text-muted-foreground',
                        plans[index].id === 'season_pass' && 'bg-primary/5',
                      )}
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section
        aria-labelledby="billing-faq"
        className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]"
      >
        <h2 id="billing-faq" className="text-3xl font-semibold tracking-tight">
          Questions about pricing
        </h2>
        <FaqList faqs={faqs} />
      </section>

      <section className="mt-24 flex flex-col items-center gap-5 rounded-2xl border bg-card px-6 py-14 text-center">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight">
          Start with the free plan. Upgrade when applications pick up.
        </h2>
        <Button size="lg" asChild>
          <Link to="/login" search={{ mode: 'signup' }}>
            Build my resume free
          </Link>
        </Button>
      </section>
    </div>
  )
}
