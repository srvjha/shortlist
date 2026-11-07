import { Link, createFileRoute } from '@tanstack/react-router'
import { KeyRoundIcon } from 'lucide-react'
import { FaqList } from '@/components/site/faq-list'
import { PricingCards } from '@/components/site/pricing-cards'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Pricing } from '@/lib/api/types'
import { plans } from '@/lib/plans'
import { priceOf, usePricing } from '@/lib/pricing'
import { fetchPricing } from '@/lib/public-api'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

const comparison: { label: string; values: [string, string, string] }[] = [
  {
    label: 'Resumes',
    values: ['1', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'Resumes tailored to a job description',
    values: ['1', '60 a month', '60 a month'],
  },
  {
    label: 'Resumes written by AI from your notes',
    values: ['1', '30 a month', '30 a month'],
  },
  {
    label: 'AI rewrites and quick changes',
    values: ['1', 'Unlimited (fair use)', 'Unlimited (fair use)'],
  },
  {
    label: 'AI fixes for LaTeX that will not compile',
    values: ['5 a month', 'Unlimited (fair use)', 'Unlimited (fair use)'],
  },
  {
    label: 'PDF downloads',
    values: ['5', 'Unlimited', 'Unlimited'],
  },
  {
    label: '.tex and JSON downloads',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'AI cover letters from your resume',
    values: ['30 a month', '30 a month', '30 a month'],
  },
  {
    label: 'Resignation letters',
    values: ['Unlimited', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'Imports from PDF, .tex or text',
    values: ['Free (fair use)', 'Free (fair use)', 'Free (fair use)'],
  },
  {
    label: 'Templates, form editor and LaTeX editor',
    values: ['All included', 'All included', 'All included'],
  },
  {
    label: 'ATS checker with job match',
    values: ['Included', 'Included', 'Included'],
  },
  {
    label: 'AI review in the ATS checker: verdict, top fixes and rewrites',
    values: ['Not included', '100 a month', '100 a month'],
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
]

function priceRow(pricing: Pricing): (typeof comparison)[number] {
  return {
    label: 'Price',
    values: [
      'Free',
      `${priceOf('pro', pricing)} a month`,
      `${priceOf('lifetime', pricing)} once`,
    ],
  }
}

const faqs = [
  {
    q: 'Is the free plan really free?',
    a: 'Yes, with no card and no time limit. You get 1 resume with every template, and you can keep editing it by hand for as long as you like. You also get 1 tailored resume, 1 AI edit, 1 AI-written resume and 5 PDF downloads, the ATS checker, and cover and resignation letters. Those AI allowances are once per account, not monthly, because each AI request costs us money to run.',
  },
  {
    q: 'What is the difference between Basic and Pro?',
    a: 'They have the same features and the same monthly limits. Basic is paid month by month and you can cancel at any time. Pro is one payment, never renews and lasts as long as Shortlist runs.',
  },
  {
    q: 'Does Pro mean unlimited AI?',
    a: 'No. Pro has the same monthly fair-use limits as Basic, such as 60 tailored resumes a month, and they reset on the 1st of every month.',
  },
  {
    q: 'What counts as a resume tailored with AI?',
    a: 'Each time you ask the AI to tailor a resume to a job description, it counts as one. You get a separate version for that job. Writing and editing by hand, and sharing, never count.',
  },
  {
    q: 'What counts as a PDF download?',
    a: 'On Free, each version of your resume you download as a PDF counts once, up to 5. Downloading the same version again is free, and so is previewing it. Paid plans have no limit, and .tex and JSON downloads are open to everyone.',
  },
  {
    q: 'Does importing my old resume cost anything?',
    a: 'No. Importing a PDF, .tex or text file is free on every plan, including Free, within fair use.',
  },
  {
    q: 'What happens when Basic ends?',
    a: 'Your account moves back to Free. Nothing is deleted: your resumes, versions and share links all stay, and you can keep editing them. You just get the free limits again, so creating another resume or using more AI needs a paid plan.',
  },
  {
    q: 'Can I cancel Basic?',
    a: 'Yes, from Plans and billing. You keep Basic until the end of the month you have paid for. Pro is one payment, so there is nothing to cancel.',
  },
  {
    q: 'Can I get a refund?',
    a: "Yes, a full refund within 7 days of paying, if you've made no more than 3 tailored and 3 AI-written resumes since, and once per account. Click Request a refund in Plans and billing. Your plan ends straight away. After 7 days, payments can't be refunded.",
  },
  {
    q: 'Can I use my own AI key?',
    a: 'Yes. Add an OpenAI, Anthropic or OpenRouter key in Settings and your AI requests run on it, with no AI limits from us. You pay the provider directly. The limits on resumes and PDF downloads still apply.',
  },
  {
    q: 'How do I pay?',
    a: 'Through Dodo Payments, which sells the plan as the merchant of record, in US dollars. It adds any sales tax or VAT where you live and sends your receipt.',
  },
  {
    q: 'I have a college or a team. Can we buy together?',
    a: 'Yes. Choose Book a demo at the bottom of any page, or email us, and tell us how many people you have.',
  },
]

// Product and Offer data so search engines and AI assistants can read the prices.
// A web app, not a Product: Google reads Product as goods in a shop and then asks for shipping, returns,
// images and reviews, none of which apply here.
const title = `Pricing: AI Resume Builder, Free to Start | ${site.name}`

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
    { name: 'Basic (monthly)', price: '12' },
    { name: 'Pro (one payment)', price: '90' },
  ].map((offer) => ({
    '@type': 'Offer',
    ...offer,
    priceCurrency: 'USD',
    url: `${site.url}/pricing`,
  })),
}

export const Route = createFileRoute('/_site/pricing')({
  head: () => ({
    meta: [
      { title },
      { property: 'og:title', content: title },
      { property: 'og:url', content: `${site.url}/pricing` },
      {
        name: 'description',
        content:
          'Tailor your resume to each job with AI. Start free, get Basic at $12 a month, or Pro at $90 once.',
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
  loader: () => fetchPricing(),
  component: PricingPage,
})

function PricingPage() {
  const pricing = usePricing(Route.useLoaderData())
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 lg:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          Pricing
        </p>
        {/* One sentence per line, so the break never splits "Pay when you need more AI". */}
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="block">Start free.</span>
          <span className="block">Pay when you need more AI.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tailor your resume to each job description, edit it by asking the AI,
          and turn rough notes into a full resume. Try it all free, then upgrade
          when you apply every week.
        </p>
      </div>

      <PricingCards headingLevel={2} className="mt-14" pricing={pricing} />

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
            requests run on your key, with no AI limits from us. Works on every
            plan, including Free.
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
                      plan.id === 'pro' && 'bg-primary/5',
                    )}
                  >
                    {plan.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...comparison, priceRow(pricing)].map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium whitespace-normal">
                    {row.label}
                  </TableCell>
                  {row.values.map((value, index) => (
                    <TableCell
                      key={plans[index].id}
                      className={cn(
                        'whitespace-normal text-muted-foreground',
                        plans[index].id === 'pro' && 'bg-primary/5',
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
