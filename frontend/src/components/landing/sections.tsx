import { Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CheckIcon,
  EyeIcon,
  LinkIcon,
  LockIcon,
  PauseIcon,
  PlayIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { FaqList } from '@/components/site/faq-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'
import { templateCatalog } from '@/lib/templates'

function SectionHeading({
  id,
  index,
  label,
  title,
  children,
}: {
  id: string
  index: string
  label: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        <span className="text-primary">{index}</span>
        <span aria-hidden="true" className="h-px w-8 bg-foreground/25" />
        {label}
      </p>
      <h2
        id={id}
        className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-lg text-muted-foreground">{children}</p>
      )}
    </div>
  )
}

const steps = [
  {
    title: 'Bring your resume',
    body: 'Upload a PDF, paste your Overleaf .tex file, or start from a blank form.',
  },
  {
    title: 'Paste the job',
    body: 'Drop in a job description or a link. We pick out the skills the role asks for.',
  },
  {
    title: 'Review every change',
    body: 'Rewrites come back highlighted. Accept the ones you like, skip the rest.',
  },
  {
    title: 'Send one link',
    body: 'Download the PDF or share a link that always points to your latest version.',
  },
]

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works"
      className="mx-auto max-w-6xl px-5 py-24"
    >
      <SectionHeading
        id="how-it-works"
        index="01"
        label="How it works"
        title="From job post to tailored resume in about a minute"
      />
      <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-3 border-t border-foreground/15 pt-5"
          >
            <span className="font-serif text-4xl text-primary tabular-nums">
              {index + 1}
            </span>
            <h3 className="font-sans text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function EditModes() {
  return (
    <section aria-labelledby="edit-modes" className="bg-muted/50 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="edit-modes"
            index="02"
            label="Two ways to edit"
            title="Fill in a form, or write the LaTeX yourself"
          >
            Most people use the form: type your experience, pick a template, and
            the layout takes care of itself. If you already have a resume on
            Overleaf, paste the .tex file and keep editing it here, with a live
            preview next to your code.
          </SectionHeading>
          <ul className="mt-6 flex flex-col gap-3">
            {[
              'Your Overleaf file compiles as it is, no changes needed',
              'Compile errors explained in plain English, with a one-click fix',
              'Switch a form resume to LaTeX whenever you want more control',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">main.tex</span>
            <Badge variant="outline" className="ml-auto">
              Compiled in 1.2s
            </Badge>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
            <code>
              <span className="text-muted-foreground">{'\\section'}</span>
              {'{Experience}\n'}
              <span className="text-muted-foreground">
                {'\\resumeSubheading'}
              </span>
              {'\n  {Razorpay}{May 2025 -- Jul 2025}\n  {'}
              <span className="text-primary">{'\\textbf'}</span>
              {'{Software Engineering Intern}}{Bengaluru}\n'}
              <span className="text-muted-foreground">{'\\resumeItem'}</span>
              {'{Built the payouts service in '}
              <span className="text-primary">{'\\textbf'}</span>
              {'{Go}}\n'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}

export function HonestAi() {
  return (
    <section
      aria-labelledby="honest-ai"
      className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2"
    >
      <div className="order-2 flex flex-col gap-3 lg:order-1">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Rewrite bullet</p>
            <Badge variant="secondary">
              <CheckIcon data-icon="inline-start" />
              Accepted
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-through">
            Worked on payouts service in Go
          </p>
          <p className="mt-1">
            Built the merchant payouts service in{' '}
            <span className="rounded-[2px] bg-highlight/70 px-0.5">Go</span>,
            handling 2M requests a day
          </p>
        </div>
        <div className="rounded-lg border border-destructive/40 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Rewrite bullet</p>
            <Badge variant="destructive">
              <XIcon data-icon="inline-start" />
              Not applied
            </Badge>
          </div>
          <p className="mt-2">
            Scaled Kafka pipelines to 10M events a day at Stripe
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            Not found in your profile: Kafka, 10M, Stripe
          </p>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <SectionHeading
          id="honest-ai"
          index="03"
          label="Honest AI"
          title="The AI rewrites. It doesn't make things up."
        >
          Every suggestion is checked against what you have told us. If a
          rewrite mentions a tool, number or company that isn't in your profile,
          it's flagged and never applied unless you confirm it's true. You stay
          the author of your resume.
        </SectionHeading>
      </div>
    </section>
  )
}

export function TemplatesShowcase() {
  const [paused, setPaused] = useState(false)
  return (
    <section aria-labelledby="templates" className="bg-muted/50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="templates"
            index="04"
            label="Templates"
            title="Templates recruiters in your field already expect"
          >
            Single column, clean type, and text an applicant tracking system can
            read.
          </SectionHeading>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                paused ? 'Play template carousel' : 'Pause template carousel'
              }
              onClick={() => setPaused((p) => !p)}
              className="motion-reduce:hidden"
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/templates">View all templates</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Two identical rows slide left by half their width, so the loop has no seam. */}
      <div className="group mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] motion-reduce:overflow-x-auto">
        <div
          className={cn(
            'flex w-max animate-marquee group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none',
            paused && '[animation-play-state:paused]',
          )}
        >
          {[false, true].map((copy) => (
            <ul
              key={String(copy)}
              aria-hidden={copy || undefined}
              className={cn('flex gap-5 pr-5', copy && 'motion-reduce:hidden')}
            >
              {templateCatalog.map((template) => (
                <li key={template.id} className="w-40 sm:w-52">
                  <Link
                    to="/templates"
                    hash={template.id}
                    tabIndex={copy ? -1 : undefined}
                    className="group/card flex flex-col gap-3 rounded-md"
                  >
                    <img
                      src={`/templates/${template.id}.png`}
                      alt={copy ? '' : `${template.name} template preview`}
                      width={1020}
                      height={1320}
                      loading="lazy"
                      className="aspect-17/22 w-full rounded-sm bg-sheet object-cover object-top shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover/card:-translate-y-1"
                    />
                    <span className="font-medium">{template.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ShareSection() {
  return (
    <section
      aria-labelledby="share"
      className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2"
    >
      <div>
        <SectionHeading
          id="share"
          index="05"
          label="Sharing"
          title="Share a link, not an attachment"
        >
          Every version gets its own link. Update your resume and the link
          updates too, or pin it to the exact version you sent. You can see when
          it was opened.
        </SectionHeading>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-3 py-2.5 font-mono text-sm break-all">
          <LinkIcon className="size-4 text-muted-foreground" />
          {site.displayDomain}/aarav/swiggy-backend
        </div>
        <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Opened</dt>
            <dd className="flex items-center gap-2 text-lg font-medium">
              <EyeIcon className="size-4 text-primary" />3 times
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Last viewed from</dt>
            <dd className="text-lg font-medium">LinkedIn</dd>
          </div>
        </dl>
        <p className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          Phone and email stay hidden unless you choose to show them.
        </p>
      </div>
    </section>
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
    a: 'Our templates are single column with real, selectable text, which is what these systems read best. We show which job requirements your resume covers instead of a made-up score.',
  },
  {
    q: 'Does the AI add things I haven’t done?',
    a: 'It only rephrases, reorders and trims what you have given it. Anything that looks new is flagged and left out unless you confirm it.',
  },
  {
    q: 'Who can see my resume?',
    a: 'Only people you send a link to. Links hide your phone and email by default, can have a password or an expiry date, and you can export or delete all your data at any time.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. Building and editing resumes is free and unlimited. The free plan also includes one resume tailored to a job description each month, and the Season Pass is ₹499 for six months if you are applying a lot.',
  },
]

export function Faq() {
  return (
    <section
      aria-labelledby="faq"
      className="mx-auto grid max-w-6xl gap-10 px-5 py-24 lg:grid-cols-[1fr_1.4fr]"
    >
      <SectionHeading
        id="faq"
        index="06"
        label="FAQ"
        title="Questions students ask us"
      />
      <FaqList faqs={faqs} />
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5">
      <div className="flex flex-col items-start gap-6 rounded-xl bg-primary px-8 py-14 text-primary-foreground sm:px-12">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next application deserves its own resume
        </h2>
        <p className="max-w-xl text-lg opacity-85">
          Start free. Import what you have and tailor it to your first job in
          minutes.
        </p>
        <Button size="lg" variant="secondary" asChild>
          <Link to="/login" search={{ mode: 'signup' }}>
            Build my resume
          </Link>
        </Button>
      </div>
    </section>
  )
}
