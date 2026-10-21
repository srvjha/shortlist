import { Link } from '@tanstack/react-router'
import {
  EyeIcon,
  FileTextIcon,
  FileUpIcon,
  LinkIcon,
  PenLineIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useMemo, useState } from 'react'
import { Reveal } from '@/components/landing/reveal'
import { Button } from '@/components/ui/button'
import type { ResumeContent } from '@/lib/api/types'
import { plans } from '@/lib/plans'
import { recommendTemplate } from '@/lib/recommend-template'
import { site } from '@/lib/site'
import { categoryName, templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

const heading =
  'font-serif text-[2rem] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-5xl'

const examples = [
  'Marketing Executive',
  'Financial Analyst',
  'Sales Executive',
  'Final-year student',
  'Management Consultant',
  'Software Engineer',
]

// The same rules the editor uses to suggest a template, run on one typed job.
function suggestFor(jobTitle: string) {
  const student = /\b(student|fresher|intern|graduate)\b/i.test(jobTitle)
  return recommendTemplate({
    basics: { name: 'You', headline: jobTitle, links: [] },
    sections: [
      {
        id: 'x',
        type: 'experience',
        title: 'Experience',
        hidden: false,
        entries: student
          ? []
          : [
              {
                id: 'e',
                hidden: false,
                organization: '',
                role: jobTitle,
                start: '2023-06',
                end: 'present',
                bullets: [],
              },
            ],
      },
    ],
  } as unknown as ResumeContent)
}

export function TemplateFinder() {
  const inputId = useId()
  const [jobTitle, setJobTitle] = useState(examples[0])
  const suggestion = useMemo(() => suggestFor(jobTitle), [jobTitle])
  const ordered = [
    ...templateCatalog.filter((t) => t.id === suggestion.templateId),
    ...templateCatalog.filter((t) => t.id !== suggestion.templateId),
  ].slice(0, 3)

  return (
    <Reveal
      as="section"
      aria-labelledby="templates"
      className="mx-auto max-w-6xl px-5 pt-28 text-center"
    >
      <h2 id="templates" data-reveal className={heading}>
        A resume that fits your field
      </h2>
      <p data-reveal className="mx-auto mt-4 max-w-2xl text-lg">
        Marketing, finance, HR, sales, operations, consulting, design, data or
        tech. Tell us the job and we suggest a layout that suits it.
      </p>
      <div data-reveal className="mx-auto mt-10 max-w-4xl">
        <label htmlFor={inputId} className="text-lg">
          Type the job you’re applying for
        </label>
        <div data-ui className="mt-3 rounded-2xl bg-card px-5 py-4">
          <input
            id={inputId}
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent text-center font-serif text-[2rem] font-semibold tracking-[-0.02em] caret-primary outline-none sm:text-6xl"
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              aria-pressed={example === jobTitle}
              onClick={() => setJobTitle(example)}
              className="min-h-11 rounded-full bg-secondary px-4 text-base hover:bg-accent focus-visible:outline-2 aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {example}
            </button>
          ))}
        </div>
        <p className="mt-6 text-lg" aria-live="polite">
          We’d start you on{' '}
          <span className="font-semibold">
            {templateCatalog.find((t) => t.id === suggestion.templateId)?.name}
          </span>
          . {suggestion.reason}
        </p>
      </div>

      <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-x-3 gap-y-7 text-left md:grid-cols-3">
        {ordered.map((template, index) => (
          <li key={template.id} data-reveal className="max-md:nth-3:hidden">
            <Link
              to="/templates"
              hash={template.id}
              className="group block focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <div className="overflow-hidden bg-sheet">
                <img
                  src={`/templates/thumbs/${template.id}.webp`}
                  alt={`${template.name} template preview`}
                  width={1020}
                  height={1320}
                  loading="lazy"
                  className="aspect-4/5 w-full object-cover object-top"
                />
              </div>
              <div
                className={cn(
                  'flex min-h-24 flex-col justify-between gap-2 p-3 text-sm',
                  index === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground',
                )}
              >
                <p className="flex justify-between gap-2 font-semibold">
                  {template.name}
                  <span className="font-normal tabular-nums">
                    {template.fontSize}pt
                  </span>
                </p>
                <p>
                  {index === 0
                    ? 'Suggested for this job'
                    : template.categories
                        .slice(0, 2)
                        .map(categoryName)
                        .join(', ')}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        variant="secondary"
        asChild
        className="mt-10 rounded-full"
      >
        <Link to="/templates">View all {templateCatalog.length} templates</Link>
      </Button>
    </Reveal>
  )
}

const stages = [
  {
    title: '1. Bring your resume',
    body: 'Upload the PDF you already have, or fill in a simple form. No resume yet? Start blank.',
  },
  {
    title: '2. Add the job',
    body: 'Paste the job description. We pick out what the role asks for and check what your resume already shows.',
  },
  {
    title: '3. Approve the changes',
    body: 'The AI rewrites your points for this job. Each change is highlighted, and you keep only the ones you like.',
  },
  {
    title: '4. Download or share',
    body: 'Get a clean PDF to upload anywhere, or send one link that always shows your latest version.',
  },
]

function StageFragment({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="rounded-xl border bg-card p-4 text-left text-base">
        <p className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
          <FileUpIcon className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium">
            Ananya_Rao_Resume.pdf
          </span>
        </p>
        <p className="mt-3">
          Read into the editor: 2 jobs, 7 points, 9 skills.
        </p>
        <p className="mt-1 text-muted-foreground">
          Every line stays yours to edit.
        </p>
      </div>
    )
  if (index === 1)
    return (
      <div className="rounded-xl border bg-card p-4 text-left text-base">
        <p className="font-medium">Job description</p>
        <div className="mt-2 rounded-lg bg-muted p-3 text-muted-foreground">
          <p className="line-clamp-3">
            We are hiring a Marketing Executive to plan social media, run
            campaigns with creators, and report results from Google Analytics.
            You will also help manage monthly budgets.
          </p>
        </div>
        <p className="mt-4 font-medium">What this role asks for</p>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
          {[
            ['Social media', true],
            ['Campaigns', true],
            ['Google Analytics', true],
            ['Budgets', false],
          ].map(([skill, found]) => (
            <li
              key={String(skill)}
              className={cn(
                'rounded-full px-2.5 py-1',
                found
                  ? 'bg-primary/12 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {skill}
              {found ? '' : ' (not on your resume)'}
            </li>
          ))}
        </ul>
      </div>
    )
  if (index === 2)
    return (
      <div className="flex flex-col gap-2 text-left text-base">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground line-through">
            Helped in Diwali sale campaign, followed up with 30 influencers
          </p>
          <p className="mt-1">
            Coordinated 30 influencers for the Diwali sale{' '}
            <span className="rounded-[2px] bg-highlight/70 px-0.5 dark:bg-primary/30">
              campaign
            </span>
          </p>
          <p className="mt-2 font-medium text-success">Accepted</p>
        </div>
        <div className="rounded-xl border border-destructive/40 bg-card p-4 dark:border-border">
          <p>Managed a ₹20L monthly ad budget</p>
          <p className="mt-2 text-destructive dark:text-muted-foreground">
            Not applied. Your resume never mentions a budget.
          </p>
        </div>
      </div>
    )
  return (
    <div className="rounded-xl border bg-card p-4 text-left text-base">
      <p className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
        <FileTextIcon className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-medium">
          Ananya_Rao_Marketing_Executive.pdf
        </span>
      </p>
      <p className="mt-2 flex min-w-0 items-center gap-3 rounded-lg bg-muted px-3 py-2.5 break-all">
        <LinkIcon className="size-5 shrink-0 text-primary" />
        {site.displayDomain}/ananya/marketing
      </p>
      <p className="mt-4 flex items-center gap-2 text-muted-foreground">
        <EyeIcon className="size-4 shrink-0" />
        See how many times your link was opened.
      </p>
    </div>
  )
}

export function Stages() {
  return (
    <Reveal
      as="section"
      aria-labelledby="how-it-works"
      className="mt-28 bg-secondary px-5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="how-it-works"
          data-reveal
          className={cn(heading, 'text-center')}
        >
          How it works
        </h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-2">
          {stages.map((stage, index) => (
            <li
              key={stage.title}
              data-reveal
              className="flex min-w-0 flex-col gap-6 rounded-2xl bg-background p-6 sm:p-8"
            >
              <div>
                <h3 className="font-serif text-2xl font-semibold tracking-[-0.01em]">
                  {stage.title}
                </h3>
                <p className="mt-2 text-lg">{stage.body}</p>
              </div>
              <div data-ui className="mt-auto">
                <StageFragment index={index} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  )
}

export function PlanPicker() {
  const [selected, setSelected] = useState<string>('season_pass')
  const plan = plans.find((p) => p.id === selected) ?? plans[1]

  return (
    <Reveal
      as="section"
      aria-labelledby="pricing"
      className="mx-auto max-w-6xl px-5 pt-28 text-center"
    >
      <h2 id="pricing" data-reveal className={heading}>
        Pricing
      </h2>
      <p data-reveal className="mt-3 text-lg text-muted-foreground">
        Pick a plan to see what it includes.
      </p>
      <div
        data-reveal
        role="group"
        aria-label="Plans"
        className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2"
      >
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === selected}
            onClick={() => setSelected(p.id)}
            onFocus={() => setSelected(p.id)}
            className="flex min-h-11 items-center gap-2.5 font-serif text-2xl font-semibold tracking-[-0.02em] text-muted-foreground transition-colors hover:text-foreground aria-pressed:text-foreground sm:text-4xl"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-[0.3em] rounded-full bg-primary transition-opacity',
                p.id === selected ? 'opacity-100' : 'opacity-0',
              )}
            />
            {p.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={plan.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-12"
          data-reveal
        >
          <p className="font-serif text-7xl font-semibold tracking-[-0.03em] tabular-nums sm:text-9xl">
            {plan.price}
            {plan.period && (
              <span className="ml-2 font-sans text-lg font-normal tracking-normal text-muted-foreground">
                {plan.period}
              </span>
            )}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-lg">
            {plan.forWhom} {plan.note}
          </p>
          <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="rounded-full bg-secondary px-4 py-2 text-base"
              >
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="rounded-full">
              <Link
                to={plan.id === 'free' ? '/login' : '/pricing'}
                search={plan.id === 'free' ? { mode: 'signup' } : undefined}
              >
                {plan.cta}
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Reveal>
  )
}

const faqs = [
  {
    q: 'Do I need to know LaTeX?',
    a: 'No. Fill in the form and your resume is typeset for you. LaTeX is there if you want it, not required.',
  },
  {
    q: 'Can I bring my resume from Overleaf?',
    a: 'Yes. Paste or upload your .tex file. It compiles here as it is, and you can keep editing the code or convert it to the form editor.',
  },
  {
    q: 'Will it pass applicant tracking systems?',
    a: 'Our templates are single column with real, selectable text, which is what these systems read best. The free ATS checker reads your resume the way they do and shows which job requirements it covers.',
  },
  {
    q: 'Does the AI add things I haven’t done?',
    a: 'It only rephrases, reorders and trims what you have given it. Anything that looks new is flagged and left out unless you confirm it.',
  },
  {
    q: 'Is it only for software jobs?',
    a: 'No. There are templates for banking, finance, consulting, marketing, design, product, data and students, and tailoring works on any job description.',
  },
  {
    q: 'Who can see my resume?',
    a: 'Only people you send a link to. Links hide your phone and email by default, can have a password or an expiry date, and you can export or delete all your data at any time.',
  },
  {
    q: 'Is it free?',
    a: 'Building and editing resumes is free and unlimited. The free plan includes one resume tailored to a job description each month; the Season Pass is ₹499 for six months if you are applying a lot.',
  },
]

export function Faq() {
  const name = useId()
  return (
    <Reveal
      as="section"
      aria-labelledby="faq"
      className="mx-auto max-w-6xl px-5 pt-28"
    >
      <h2 id="faq" data-reveal className={cn(heading, 'text-center')}>
        Questions people ask
      </h2>
      <div className="mt-12 grid items-start gap-2 lg:grid-cols-2">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            name={name}
            data-reveal
            className="group details-smooth rounded-2xl bg-card transition-colors duration-300 open:bg-primary open:text-primary-foreground"
          >
            <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
              {faq.q}
              <span aria-hidden="true" className="relative size-4 shrink-0">
                <span className="absolute top-1/2 left-0 h-[3px] w-4 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute top-1/2 left-0 h-[3px] w-4 -translate-y-1/2 rotate-90 rounded-full bg-current transition-transform duration-200 group-open:rotate-0" />
              </span>
            </summary>
            <p className="max-w-[52ch] px-6 pb-6 text-lg">{faq.a}</p>
          </details>
        ))}
      </div>
    </Reveal>
  )
}

// The product's own "New resume" dialog, open and working: the choice rides through sign-up, so the
// visitor lands on that import screen.
const starts = [
  {
    icon: FileUpIcon,
    label: 'Upload a PDF',
    hint: 'We read your current resume into the editor.',
    action: 'Sign up and upload my PDF',
    source: 'upload',
  },
  {
    icon: PenLineIcon,
    label: 'Start from a blank form',
    hint: 'Fill in your details, then pick a template.',
    action: 'Sign up and start blank',
    source: 'blank',
  },
  {
    icon: FileTextIcon,
    label: 'Paste a LaTeX (.tex) file',
    hint: 'Made your resume on Overleaf? It works here as it is.',
    action: 'Sign up and paste my .tex',
    source: 'tex',
  },
] as const

export function FinalCta() {
  const [source, setSource] =
    useState<(typeof starts)[number]['source']>('upload')
  const chosen = starts.find((s) => s.source === source) ?? starts[0]

  return (
    <section aria-labelledby="start" className="mt-28 bg-primary">
      <Reveal className="px-5 py-20 text-center text-primary-foreground sm:py-28">
        <h2 id="start" data-reveal className={cn(heading, 'mx-auto max-w-4xl')}>
          Start with what you have
        </h2>
        <p
          data-reveal
          className="mx-auto mt-5 max-w-xl text-lg text-balance sm:text-xl"
        >
          Free, no card needed. Choose how to begin and that is where you land
          after signing up.
        </p>

        <div
          data-ui
          data-reveal
          className="mx-auto mt-12 max-w-xl rounded-3xl bg-card p-3 text-left text-card-foreground sm:p-4"
        >
          <fieldset>
            <legend className="px-3 pt-2 pb-3 text-lg font-semibold">
              New resume
            </legend>
            <div className="flex flex-col gap-2">
              {starts.map(({ icon: Icon, label, hint, source: id }) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-accent has-checked:bg-primary/10 has-focus-visible:outline-2 has-focus-visible:outline-primary"
                >
                  <input
                    type="radio"
                    name="start"
                    value={id}
                    checked={source === id}
                    onChange={() => setSource(id)}
                    className="sr-only"
                  />
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold">
                      {label}
                    </span>
                    <span className="block text-base text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      source === id
                        ? 'border-primary bg-primary'
                        : 'border-input',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full bg-primary-foreground transition',
                        source === id
                          ? 'scale-100 opacity-100'
                          : 'scale-75 opacity-0',
                      )}
                    />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            size="lg"
            asChild
            className="mt-3 h-13 w-full rounded-2xl text-base"
          >
            <Link
              to="/login"
              search={{
                mode: 'signup',
                redirect: `/resumes/new?source=${source}`,
              }}
            >
              {chosen.action}
            </Link>
          </Button>
          <p className="px-3 pt-3 pb-1 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              search={{ redirect: `/resumes/new?source=${source}` }}
              className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Reveal>
    </section>
  )
}
