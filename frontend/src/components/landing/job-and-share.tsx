import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LinkIcon,
  LockIcon,
  MapPinIcon,
  Share2Icon,
  TimerIcon,
} from 'lucide-react'
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Reveal, ease } from '@/components/landing/reveal'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// The two things the recording above doesn't show: reading a job from its link, and sharing the resume as a
// link. They sit on a desk photo inside a rounded panel the width of the page. The photo is always dark, so
// text here uses fixed light colours rather than the theme's. The cards are tinted, not backdrop-blurred:
// a blur under a card that is still fading in shows the photo's bright window through as a white smear.
const glass =
  'min-w-0 rounded-3xl border border-white/12 bg-[rgb(20_22_20/0.72)] p-6 text-left transition-[border-color,background-color] duration-300 hover:border-white/20 hover:bg-[rgb(20_22_20/0.66)] sm:p-8'
const panel = 'mt-6 rounded-2xl bg-card p-4 text-sm text-card-foreground'

// Made-up postings, described rather than tied to a real employer.
const jobs = [
  {
    field: 'Marketing',
    url: 'linkedin.com/jobs/view/marketing-executive',
    title: 'Marketing Executive, Beauty e-commerce, Mumbai',
    asks: [
      { skill: 'Instagram', found: true },
      { skill: 'Influencer marketing', found: true },
      { skill: 'Google Analytics', found: true },
      { skill: 'Paid social', found: false },
    ],
    requirement:
      '1 to 2 years of experience: met, about 1.5 years from your dates',
  },
  {
    field: 'Finance',
    url: 'naukri.com/job-listings/financial-analyst',
    title: 'Financial Analyst, Private bank, Mumbai',
    asks: [
      { skill: 'Excel', found: true },
      { skill: 'Financial modelling', found: true },
      { skill: 'Valuation', found: false },
      { skill: 'Power BI', found: true },
    ],
    requirement: "Bachelor's in finance or commerce: met, B.Com on your resume",
  },
  {
    field: 'Data',
    url: 'careers.example.com/jobs/data-analyst',
    title: 'Data Analyst, Fintech app, Bengaluru',
    asks: [
      { skill: 'SQL', found: true },
      { skill: 'Python', found: true },
      { skill: 'Tableau', found: false },
      { skill: 'A/B testing', found: false },
    ],
    requirement:
      'Based in Bengaluru or open to it: met, Bengaluru on your resume',
  },
]

// Each "new view" the share card pretends to get, in turn.
const visits = [
  'LinkedIn, Mumbai',
  'Email, Bengaluru',
  'Naukri, Pune',
  'WhatsApp, Delhi',
]

// A real switch, so the settings can be tried.
function Toggle({
  label,
  icon: Icon,
  defaultOn,
}: {
  label: string
  icon: typeof EyeIcon
  defaultOn: boolean
}) {
  const [on, setOn] = useState(defaultOn)
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
            on ? 'bg-primary' : 'bg-input',
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={cn(
              'size-4 rounded-full bg-primary-foreground',
              on && 'ml-auto',
            )}
          />
        </span>
      </button>
    </li>
  )
}

// Reads a job when the card first comes into view, and again for each example or click.
function JobPanel() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState(0)
  const [reading, setReading] = useState(false)
  const job = jobs[index]
  const covered = job.asks.filter((a) => a.found).length

  useEffect(() => {
    if (!seen) return
    if (reduceMotion) return setReading(false)
    setReading(true)
    const timer = setTimeout(() => setReading(false), 900)
    return () => clearTimeout(timer)
  }, [seen, run, index, reduceMotion])

  const read = (next = index) => {
    setIndex(next)
    setRun((n) => n + 1)
  }
  const shown = seen && !reading

  return (
    <div ref={ref} className={panel}>
      <div
        role="group"
        aria-label="Example job"
        className="mb-3 flex gap-1 rounded-full bg-muted p-1"
      >
        {jobs.map((j, i) => (
          <button
            key={j.field}
            type="button"
            aria-pressed={i === index}
            onClick={() => read(i)}
            className="min-h-8 flex-1 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {j.field}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted py-1.5 pr-1.5 pl-3">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{job.url}</span>
        <button
          type="button"
          onClick={() => read()}
          disabled={reading}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-[filter] hover:brightness-110 disabled:opacity-80"
        >
          {reading && <Spinner className="size-3" />}
          {reading ? 'Reading' : 'Read job'}
        </button>
      </div>

      <div className="min-h-[13.5rem]" aria-live="polite">
        <AnimatePresence mode="wait">
          {shown ? (
            <motion.div
              key={`${index}-${run}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <p className="mt-4 font-medium">{job.title}</p>
              <p className="mt-3 text-muted-foreground">Must-haves</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {job.asks.map(({ skill, found }, i) => (
                  <motion.li
                    key={skill}
                    initial={
                      reduceMotion ? false : { opacity: 0, y: 6, scale: 0.96 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.08 + i * 0.09, duration: 0.3, ease }}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1',
                      found
                        ? 'bg-primary/12 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {found && <CheckIcon className="size-3.5" />}
                    {skill}
                    {!found && ' (not on your resume)'}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Skills covered</span>
                <span className="font-medium tabular-nums">
                  {covered} of {job.asks.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full origin-left rounded-full bg-primary"
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: covered / job.asks.length }}
                  transition={{ delay: 0.45, duration: 0.7, ease }}
                />
              </div>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="mt-3 flex items-start gap-2 text-muted-foreground"
              >
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                {job.requirement}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex flex-col gap-2.5"
              role="status"
              aria-label="Reading the job"
            >
              {[70, 45, 90, 60].map((w, i) => (
                <motion.span
                  key={i}
                  className="h-3 rounded-full bg-muted"
                  style={{ width: `${w}%` }}
                  animate={
                    reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }
                  }
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// The view count rolls up when the card comes into view, then a new view arrives every few seconds.
function SharePanel() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const [views, setViews] = useState(12)
  const [visit, setVisit] = useState(0)
  const [copied, setCopied] = useState(false)
  const counted = useRef(false)

  useEffect(() => {
    if (!inView || counted.current || reduceMotion) return
    counted.current = true
    const controls = animate(0, 12, {
      duration: 1.2,
      ease,
      onUpdate: (v) => setViews(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, reduceMotion])

  useEffect(() => {
    if (!inView || reduceMotion) return
    const timer = setInterval(() => {
      setViews((v) => v + 1)
      setVisit((i) => (i + 1) % visits.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [inView, reduceMotion])

  const copy = () => {
    navigator.clipboard
      .writeText('https://shortlist.co.in/neha/marketing')
      .catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div ref={ref} className={panel}>
      <div className="flex items-center gap-2 rounded-lg bg-muted py-1.5 pr-1.5 pl-3">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          shortlist.co.in/neha/marketing
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'copied' : 'copy'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5"
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-success" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-lg border p-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <EyeIcon className="size-4" />
            Opened
          </dt>
          <dd className="mt-1 text-base font-medium tabular-nums sm:text-lg">
            {views} times
          </dd>
        </div>
        <div className="relative min-w-0 overflow-hidden rounded-lg border p-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <MapPinIcon className="size-4" />
            Last opened
            {inView && !reduceMotion && (
              <span className="relative ml-auto flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </dt>
          <dd className="mt-1 text-base font-medium sm:text-lg">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={visit}
                className="block truncate"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease }}
              >
                {visits[visit]}
              </motion.span>
            </AnimatePresence>
          </dd>
        </div>
      </dl>
      <ul className="mt-3 flex flex-col gap-1">
        <Toggle label="Phone and email hidden" icon={EyeIcon} defaultOn />
        <Toggle
          label="Unlock contacts with a password"
          icon={LockIcon}
          defaultOn={false}
        />
        <Toggle
          label="Link expires after this season"
          icon={TimerIcon}
          defaultOn
        />
      </ul>
    </div>
  )
}

export function JobAndShare() {
  return (
    <section
      aria-labelledby="job-and-share"
      className="relative mx-auto mt-20 max-w-6xl overflow-hidden rounded-[2rem] max-sm:mx-3"
    >
      <img
        src="/images/desk.webp"
        srcSet="/images/desk-1000.webp 1000w, /images/desk.webp 2000w"
        sizes="100vw"
        alt=""
        width={2000}
        height={1333}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgb(16_18_16/0.66)]"
      />
      <Reveal className="relative px-4 py-16 text-center text-[#f4f1ea] sm:px-10 sm:py-20">
        <h2
          id="job-and-share"
          data-reveal
          className="font-serif text-[2rem] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-5xl"
        >
          Read the job. Send one link.
        </h2>
        <p
          data-reveal
          className="mx-auto mt-4 max-w-xl text-lg text-[#f4f1ea]/80"
        >
          The two steps around tailoring that take the most time when you apply,
          done for you.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article data-reveal className={glass}>
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <LinkIcon className="size-5" />
            </span>
            <h3 className="mt-5 font-serif text-2xl font-semibold">
              Paste a job link, we read the job
            </h3>
            <p className="mt-2 text-base text-[#f4f1ea]/80">
              Drop in a link from any job site. Shortlist pulls out the role,
              the must-have skills and the requirements, and shows which ones
              your resume already covers.
            </p>
            <JobPanel />
          </article>

          <article data-reveal className={glass}>
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <Share2Icon className="size-5" />
            </span>
            <h3 className="mt-5 font-serif text-2xl font-semibold">
              Send one link, not an attachment
            </h3>
            <p className="mt-2 text-base text-[#f4f1ea]/80">
              Your link always shows your latest version, so you never resend a
              file. See when it was opened and from where, and keep your phone
              and email private.
            </p>
            <SharePanel />
          </article>
        </div>
      </Reveal>
    </section>
  )
}
