import { Link } from '@tanstack/react-router'
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ease } from '@/components/landing/reveal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The hero's live moment: the headline cycles through jobs in many fields, and below it a resume is
// rewritten for an example job, streamed word by word the way the AI answers, with each change the
// visitor's to keep or skip.
// Jobs are described, never tied to a named employer.

// In `after`, *stars* mark the words the job asked for.
const demos = [
  {
    field: 'Marketing',
    name: 'Ananya Rao',
    contact: 'ananya@example.com | linkedin.com/in/ananya | Pune',
    company: 'Skincare brand, Pune',
    dates: 'Jun 2024 – Present',
    role: 'Marketing Associate',
    job: {
      title: 'Marketing Executive',
      where: 'Beauty e-commerce, Mumbai',
      asks: ['Social media', 'Campaigns', 'Google Analytics', 'Budgets'],
      missing: ['Budgets'],
    },
    bullets: [
      {
        before:
          'Handled Instagram page, posted reels 4 times a week, followers went from 8k to 21k',
        after:
          'Ran the brand’s *social media*, posting 4 reels a week and growing followers from 8k to 21k',
      },
      {
        before:
          'Helped in Diwali sale campaign, followed up with 30 influencers, sale got 1,200 orders',
        after:
          'Coordinated 30 influencers for the Diwali sale *campaign*, which drove 1,200 orders',
      },
      { before: 'Member of college dance society', after: null },
    ],
    skills: ['Skills', 'Tools', 'Canva, Meta Business Suite, Google Analytics'],
    refused: {
      text: 'Managed a ₹20L monthly ad budget',
      missing: 'an ad budget',
    },
  },
  {
    field: 'Finance',
    name: 'Priya Nair',
    contact: 'priya@example.com | linkedin.com/in/priya | Mumbai',
    company: 'Mehta & Iyer, Chartered Accountants',
    dates: 'Aug 2023 – Present',
    role: 'Audit Associate',
    job: {
      title: 'Financial Analyst',
      where: 'Private bank, Mumbai',
      asks: ['Excel', 'Financial modelling', 'Valuation', 'Due diligence'],
      missing: ['Due diligence'],
    },
    bullets: [
      {
        before: 'Made Excel models for 12 clients as part of audit work',
        after: 'Built *financial models* in *Excel* for 12 audit clients',
      },
      {
        before: 'Helped the team with valuation of a ₹40 Cr acquisition',
        after: 'Supported the *valuation* of a ₹40 Cr acquisition',
      },
      { before: 'Managed the office cricket league', after: null },
    ],
    skills: ['Skills', 'Tools', 'Excel, Power BI, Tally, SQL'],
    refused: {
      text: 'Led due diligence on three cross-border deals',
      missing: 'due diligence and cross-border deals',
    },
  },
  {
    field: 'Software',
    name: 'Aarav Sharma',
    contact: 'aarav@example.com | github.com/aarav | Bengaluru',
    company: 'Payments startup, Bengaluru',
    dates: 'May 2025 – Jul 2025',
    role: 'Software Engineering Intern',
    job: {
      title: 'Backend Engineer',
      where: 'Food delivery app, Bengaluru',
      asks: ['Go', 'PostgreSQL', 'APIs', 'Kafka'],
      missing: ['Kafka'],
    },
    bullets: [
      {
        before: 'Worked on payouts service in Go which gets 2M requests daily',
        after:
          'Built the merchant payouts service in *Go*, handling 2M requests a day',
      },
      {
        before: 'Made reports 40% faster, fixed PostgreSQL queries and indexes',
        after:
          'Cut report latency by 40% by rewriting *PostgreSQL* queries and adding indexes',
      },
      { before: 'Organised the college tech fest website', after: null },
    ],
    skills: ['Technical Skills', 'Languages', 'Go, TypeScript, Python, SQL'],
    refused: {
      text: 'Scaled Kafka pipelines to 10M events a day',
      missing: 'Kafka and 10M events',
    },
  },
]

type Demo = (typeof demos)[number]

const sectionRule =
  'border-b border-neutral-800 pb-0.5 font-serif text-sm font-semibold [font-variant-caps:small-caps]' // taste-skill-ignore: the resume's own section rule, as typeset

// One tick streams one word; a hidden bullet takes a few ticks so its strike lands like a beat.
const hidePause = 3
const tickMs = 170
// How long a finished resume stays before the demo moves to the next job, long enough to read it.
const holdMs = 7000

// The headline keeps its own quicker rhythm, independent of the demo, across many fields.
const titles = [
  'Marketing',
  'Finance',
  'HR',
  'Sales',
  'Operations',
  'Consulting',
  'Design',
  'Data',
  'Software',
]
const firstSwapMs = 2500
const titleMs = 3500

// Splits a rewrite into words, bolding what sits between *stars*.
const wordsOf = (text: string) =>
  text.split('*').flatMap((part, index) =>
    part
      .split(/(?<=\s)/)
      .filter(Boolean)
      .map((word) => ({ word, bold: index % 2 === 1 })),
  )

const spans = (demo: Demo) => {
  let start = 0
  return demo.bullets.map((bullet) => {
    const length = bullet.after ? wordsOf(bullet.after).length : hidePause
    const span = { start, length }
    start += length
    return span
  })
}

// The streamed part of a rewrite: each word fades in.
function Streamed({ text, upTo }: { text: string; upTo: number }) {
  const reduceMotion = useReducedMotion()
  return wordsOf(text)
    .slice(0, upTo)
    .map(({ word, bold }, index) => {
      const Tag = bold ? motion.b : motion.span
      return (
        <Tag
          key={index}
          className="whitespace-pre-wrap"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease }}
        >
          {word}
        </Tag>
      )
    })
}

function Choice({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean
  onClick: () => void
  label?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-11 min-w-11 justify-center items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 aria-pressed:bg-foreground aria-pressed:text-background"
    >
      {children}
    </button>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
        />
      ))}
    </span>
  )
}

// The job in the headline fades to the next one, and the highlighter marks it, as it marks rewrites below.
function JobTitle({ word }: { word: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={word}
        className="relative inline-block whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.4, ease } }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[0.1em] -z-10 h-[0.28em] origin-left bg-highlight/80 dark:bg-primary/40"
          initial={{ scaleX: 0 }}
          animate={{
            scaleX: 1,
            transition: { delay: 0.2, duration: 0.5, ease },
          }}
        />
        {word}
      </motion.span>
    </AnimatePresence>
  )
}

export function Hero() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(false)
  const [run, setRun] = useState(0)
  const [ticks, setTicks] = useState(0)
  const [skipped, setSkipped] = useState<number[]>([])
  const demo = demos[index]
  const bulletSpans = spans(demo)
  const total = bulletSpans.reduce((sum, s) => sum + s.length, 0)
  const done = ticks >= total

  useEffect(() => {
    setSkipped([])
    if (reduceMotion) {
      setTicks(Infinity)
      return
    }
    setTicks(0)
    const timer = setInterval(
      () =>
        setTicks((t) => {
          if (t + 1 >= total) clearInterval(timer)
          return Math.min(t + 1, total)
        }),
      tickMs,
    )
    return () => clearInterval(timer)
  }, [reduceMotion, run, index, total])

  // Resets progress in the same render as the switch, so the next job never flashes as finished.
  const show = (next: number) => {
    setIndex(next)
    setTicks(reduceMotion ? Infinity : 0)
    setSkipped([])
  }

  // The headline goes through the jobs once and rests back on the first; the demo keeps cycling while the hero
  // is on screen. The pause button, or choosing a job or a change, stops both (WCAG 2.2.2).
  const hero = useRef<HTMLElement>(null)
  const onScreen = useInView(hero, { amount: 0.2 })

  const [title, setTitle] = useState(0)
  const swapped = useRef(false)
  useEffect(() => {
    if (picked || reduceMotion || !onScreen || (swapped.current && title === 0))
      return
    const timer = setTimeout(
      () => {
        swapped.current = true
        setTitle((t) => (t + 1) % titles.length)
      },
      swapped.current ? titleMs : firstSwapMs,
    )
    return () => clearTimeout(timer)
  }, [title, picked, reduceMotion, onScreen])
  useEffect(() => {
    if (!done || picked || reduceMotion || !onScreen) return
    const timer = setTimeout(() => show((index + 1) % demos.length), holdMs)
    return () => clearTimeout(timer)
  }, [done, picked, reduceMotion, onScreen, index])

  const typed = (i: number) =>
    Math.max(0, Math.min(ticks - bulletSpans[i].start, bulletSpans[i].length))
  const finished = (i: number) => typed(i) >= bulletSpans[i].length
  const kept = demo.bullets.length - skipped.length
  const toggle = (i: number, skip: boolean) => {
    setPicked(true)
    setSkipped((list) =>
      skip ? [...new Set([...list, i])] : list.filter((s) => s !== i),
    )
  }

  return (
    <section ref={hero} className="px-5 pt-16 pb-12 text-center sm:pt-24">
      {/* The label keeps one steady name for the page while the job in the line keeps changing. */}
      <h1
        aria-label="Your resume, tailored to every job you apply for"
        className="isolate mx-auto max-w-6xl font-serif text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl"
      >
        {/* Phones drop "Your resume," so the line and the job each fit on one line. */}
        <span className="max-sm:hidden">Your resume, tailored to every</span>
        <span className="sm:hidden">Tailored to every</span>
        <br />
        <span className="whitespace-nowrap">
          <JobTitle word={titles[title]} /> job
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg sm:mt-8 sm:text-xl">
        Paste the job you want. Our AI rewrites your resume for it, using only
        what you have really done. You see every change and keep the ones you
        like.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild className="h-12 rounded-full px-7 text-base">
          <Link to="/login" search={{ mode: 'signup' }}>
            Build my resume free
          </Link>
        </Button>
        <Button
          size="lg"
          variant="ghost"
          asChild
          className="h-12 rounded-full px-6 text-base"
        >
          <Link to="/ats-checker">Check my ATS score</Link>
        </Button>
      </div>
      <p className="mt-4 text-base text-muted-foreground">
        Free plan: 1 tailored resume and 50 AI edits every month. No card
        needed.
      </p>

      <h2 className="mt-20 font-serif text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
        Try it on an example
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-lg">
        Pick a field. Watch the resume change for the job, then keep or skip
        each change.
      </p>

      <div
        data-ui
        className="mx-auto mt-8 grid w-full max-w-2xl items-start gap-3 text-left xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_34rem_minmax(0,1fr)] xl:gap-4"
      >
        <aside className="flex flex-col gap-5 rounded-2xl bg-card p-5 xl:sticky xl:top-24">
          <div
            role="group"
            aria-label="Example job"
            className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1 [&>button]:justify-center [&>button]:px-2"
          >
            {demos.map((d, i) => (
              <Choice
                key={d.field}
                pressed={i === index}
                onClick={() => {
                  setPicked(true)
                  show(i)
                }}
              >
                {d.field}
              </Choice>
            ))}
          </div>
          <div className="relative">
            {!reduceMotion && (
              <div className="absolute top-0 right-0">
                <Choice
                  pressed={picked}
                  onClick={() => setPicked((p) => !p)}
                  label="Pause demo"
                >
                  {picked ? (
                    <PlayIcon className="size-3.5" />
                  ) : (
                    <PauseIcon className="size-3.5" />
                  )}
                </Choice>
              </div>
            )}
            <p className="text-base text-muted-foreground">Tailoring for</p>
            <p className="mt-1 font-serif text-2xl leading-tight font-semibold">
              {demo.job.title}
            </p>
            <p className="text-base">{demo.job.where}</p>
          </div>
          <div>
            <p className="text-base text-muted-foreground">
              What the job asks for
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {demo.job.asks.map((skill) => {
                const missing = demo.job.missing.includes(skill)
                return (
                  <li
                    key={skill}
                    className={cn(
                      'rounded-full px-3 py-1',
                      missing
                        ? 'bg-secondary text-muted-foreground'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {skill}
                    {missing && (
                      <span className="sr-only">, not on your resume</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-base text-muted-foreground">
              Grey: not on your resume, so it won’t be added.
            </p>
          </div>
        </aside>

        <figure
          aria-label={`${demo.name}'s resume, tailored for a ${demo.job.title} role`}
          className="bg-sheet px-6 pt-10 pb-8 text-left text-sheet-foreground ring-1 ring-black/5 sm:px-12"
        >
          <div className="text-center font-serif">
            <p className="text-2xl tracking-wide [font-variant-caps:small-caps]">
              {demo.name}
            </p>
            <p className="mt-1 text-[13px] text-neutral-600">{demo.contact}</p>
          </div>
          <p className={cn('mt-5', sectionRule)}>Experience</p>
          <div className="mt-2 flex items-baseline justify-between font-serif text-sm">
            <span className="font-semibold">{demo.company}</span>
            <span className="font-semibold">{demo.dates}</span>
          </div>
          <p className="font-serif text-sm italic">{demo.role}</p>
          <ul className="mt-2 flex flex-col gap-1.5 font-serif text-sm leading-snug sm:text-[15px]">
            {demo.bullets.map((bullet, i) => {
              const skip = skipped.includes(i)
              const rewriting = bullet.after && typed(i) > 0 && !skip
              const struck = !bullet.after && finished(i) && !skip
              return (
                <motion.li
                  key={`${demo.field}-${i}`}
                  className="flex gap-2 pl-1"
                  // 0.6 keeps the struck line readable (4.5:1 contrast); the strike shows it's removed.
                  animate={{ opacity: struck ? 0.6 : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <span aria-hidden="true">•</span>
                  <span
                    className={cn(
                      struck && 'line-through decoration-neutral-500',
                    )}
                  >
                    {rewriting && bullet.after ? (
                      <span className="box-decoration-clone rounded-[2px] bg-highlight/80 px-0.5 dark:bg-highlight/50">
                        <Streamed text={bullet.after} upTo={typed(i)} />
                      </span>
                    ) : (
                      bullet.before
                    )}
                  </span>
                </motion.li>
              )
            })}
          </ul>
          <p className={cn('mt-4', sectionRule)}>{demo.skills[0]}</p>
          <p className="mt-1.5 font-serif text-sm sm:text-[15px]">
            <b>{demo.skills[1]}</b>: {demo.skills[2]}
          </p>
        </figure>

        <div className="rounded-2xl bg-card p-4 text-left text-base">
          <div className="flex min-h-9 items-center justify-between gap-3">
            <p className="font-medium" aria-live={picked ? 'polite' : 'off'}>
              {done
                ? `${kept} of ${demo.bullets.length} changes kept`
                : 'Rewriting for this job'}
            </p>
            {done && !reduceMotion && (
              <Choice
                pressed={false}
                onClick={() => {
                  setPicked(true)
                  show(index)
                  setRun((n) => n + 1)
                }}
              >
                <RotateCcwIcon className="size-3.5" />
                Run again
              </Choice>
            )}
          </div>
          {/* Changes arrive like messages: a typing indicator, then the row. */}
          <ul className="mt-2 flex min-h-80 flex-col gap-2">
            <AnimatePresence initial={false}>
              {demo.bullets.map((bullet, i) =>
                finished(i) ? (
                  <motion.li
                    key={`${demo.field}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="flex items-center gap-3 rounded-xl bg-secondary py-1 pr-1 pl-3"
                  >
                    <span className="line-clamp-2 min-w-0 flex-1">
                      <span className="font-medium">
                        {bullet.after ? 'Rewritten' : 'Hidden for this job'}:
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {bullet.before}
                      </span>
                    </span>
                    <div
                      role="group"
                      aria-label={`Change ${i + 1}`}
                      className="flex shrink-0 gap-1"
                    >
                      <Choice
                        pressed={!skipped.includes(i)}
                        onClick={() => toggle(i, false)}
                        label="Accept"
                      >
                        <CheckIcon className="size-3.5" />
                      </Choice>
                      <Choice
                        pressed={skipped.includes(i)}
                        onClick={() => toggle(i, true)}
                        label="Skip"
                      >
                        <XIcon className="size-3.5" />
                      </Choice>
                    </div>
                  </motion.li>
                ) : null,
              )}
              {done ? (
                <motion.li
                  key={`${demo.field}-refused`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="rounded-xl bg-destructive/10 px-3 py-2.5 text-destructive dark:bg-secondary dark:text-muted-foreground"
                >
                  Not applied: “{demo.refused.text}”. It mentions{' '}
                  {demo.refused.missing}, which aren’t in your profile.
                </motion.li>
              ) : (
                <motion.li
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="flex h-11 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
                >
                  <TypingDots />
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </section>
  )
}
