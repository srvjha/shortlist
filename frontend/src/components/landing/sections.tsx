import { Link } from '@tanstack/react-router'
import { FileTextIcon, FileUpIcon, PenLineIcon } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useId, useMemo, useRef, useState } from 'react'
import { Reveal, ease } from '@/components/landing/reveal'
import { PricingCards } from '@/components/site/pricing-cards'
import { Button } from '@/components/ui/button'
import type { Pricing, ResumeContent } from '@/lib/api/types'
import { recommendTemplate } from '@/lib/recommend-template'
import { categoryName, templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

const heading =
  'font-serif text-[2rem] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-5xl'

const examples = [
  'Marketing Executive',
  'Financial Analyst',
  'Sales Executive',
  'Final-year student',
  'Software Engineer',
]

// After the suggestion, the front page shows layouts from fields beyond tech.
const showcase = ['marketing', 'finance', 'campus', 'consulting']

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
    suggestion.templateId,
    ...showcase.filter((id) => id !== suggestion.templateId),
  ]
    .slice(0, 3)
    .map((id) => templateCatalog.find((t) => t.id === id)!)

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
            className="w-full bg-transparent text-center font-serif text-[2rem] font-semibold tracking-[-0.02em] caret-primary outline-none sm:text-4xl"
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
        className="mt-10 h-12 px-6 text-base"
      >
        <Link to="/templates">View all {templateCatalog.length} templates</Link>
      </Button>
    </Reveal>
  )
}

export function PlanPicker({ pricing }: { pricing: Pricing | null }) {
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
        Start free. Pay only when you want more AI help.
      </p>
      <div data-reveal className="mt-10 text-left">
        <PricingCards pricing={pricing} />
      </div>
    </Reveal>
  )
}

const faqs = [
  {
    q: 'Who is Shortlist for?',
    a: 'Students, freshers and early professionals in any field: marketing, finance, HR, sales, operations, consulting, design, data and tech. Tailoring works on any job description.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. The Free plan includes 1 resume tailored to a job description and 50 AI edits each month, and you can make and edit as many resumes as you like by hand. The Season Pass is ₹499 for six months if you are applying a lot.',
  },
  {
    q: 'Does the AI add things I haven’t done?',
    a: 'No. It only rephrases, reorders and trims what you have given it. Anything that looks new is flagged and left out unless you confirm it.',
  },
  {
    q: 'Will it pass applicant tracking systems?',
    a: 'Our templates are single column with real, selectable text, which is what these systems read best. The free ATS checker reads your resume the way they do and shows which job requirements it covers.',
  },
  {
    q: 'Who can see my resume?',
    a: 'Only people you send a link to. Links hide your phone and email by default, can have a password or an expiry date, and you can export or delete all your data at any time.',
  },
  {
    q: 'Do I need to know LaTeX?',
    a: 'No. Fill in the form and your resume is typeset for you. LaTeX is there if you want it, not required.',
  },
  {
    q: 'Can I bring my resume from Overleaf?',
    a: 'Yes. Paste or upload your .tex file. It compiles here as it is, and you can keep editing the code or convert it to the form editor.',
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

// Real renders of four templates, laid on the field like printed resumes on a desk. They sit in the
// side margins only, so nothing ever covers the heading or the dialog.
const prints = [
  {
    id: 'developer',
    side: 'left',
    top: '18%',
    inset: '4%',
    rotate: -9,
    sway: 2,
    float: 6,
  },
  {
    id: 'finance',
    side: 'left',
    top: '50%',
    inset: '11%',
    rotate: 5,
    sway: -1.5,
    float: 7.5,
  },
  {
    id: 'consulting',
    side: 'right',
    top: '14%',
    inset: '10%',
    rotate: 7,
    sway: -2,
    float: 6.8,
  },
  {
    id: 'designer',
    side: 'right',
    top: '48%',
    inset: '3%',
    rotate: -6,
    sway: 1.5,
    float: 8,
  },
] as const

function Print({
  print,
  progress,
}: {
  print: (typeof prints)[number]
  progress: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const reduceMotion = useReducedMotion()
  const from = print.side === 'left' ? -80 : 80
  // Drifts in from its own side and settles as the section scrolls into place.
  const x = useTransform(progress, [0, 1], [reduceMotion ? 0 : from, 0])
  const rotate = useTransform(
    progress,
    [0, 1],
    [reduceMotion ? print.rotate : print.rotate * 1.8, print.rotate],
  )
  return (
    <motion.div
      aria-hidden="true"
      style={{ x, rotate, top: print.top, [print.side]: print.inset }}
      whileHover={reduceMotion ? undefined : { rotate: 0, scale: 1.04 }}
      transition={{ duration: 0.25, ease }}
      className="absolute hidden w-52 hover:z-10 min-[1400px]:block 2xl:w-60"
    >
      {/* Keeps floating once settled, each print on its own slow rhythm, like paper in a light draught. */}
      <motion.div
        className="bg-sheet p-2"
        animate={
          reduceMotion
            ? undefined
            : { y: [0, -14, 0], rotate: [0, print.sway, 0] }
        }
        transition={{
          duration: print.float,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={`/templates/thumbs/${print.id}.webp`}
          alt=""
          width={560}
          height={724}
          loading="lazy"
          className="aspect-[560/724] w-full"
        />
      </motion.div>
    </motion.div>
  )
}

export function FinalCta() {
  const field = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: field,
    offset: ['start end', 'start 0.25'],
  })
  const [source, setSource] =
    useState<(typeof starts)[number]['source']>('upload')
  const chosen = starts.find((s) => s.source === source) ?? starts[0]

  return (
    <section
      ref={field}
      aria-labelledby="start"
      className="relative mt-28 overflow-hidden bg-primary"
    >
      {prints.map((print) => (
        <Print key={print.id} print={print} progress={scrollYProgress} />
      ))}
      <Reveal className="relative px-5 py-20 text-center text-primary-foreground sm:py-28">
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
          <Button size="lg" asChild className="mt-3 h-13 w-full text-base">
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
