import { Link } from '@tanstack/react-router'
import { PauseIcon, PlayIcon } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ease } from '@/components/landing/reveal'
import { Button } from '@/components/ui/button'

// The hero: the headline cycles through jobs in many fields, and below it a short recording shows the real app
// importing a resume, tailoring it to a job, reviewing the changes and downloading the PDF.

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
const firstSwapMs = 1500
const titleMs = 2500

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
  const hero = useRef<HTMLElement>(null)
  const onScreen = useInView(hero, { amount: 0.2 })

  // The headline goes through the jobs once and rests back on the first (WCAG 2.2.2).
  const [title, setTitle] = useState(0)
  const swapped = useRef(false)
  useEffect(() => {
    if (reduceMotion || !onScreen || (swapped.current && title === 0)) return
    const timer = setTimeout(
      () => {
        swapped.current = true
        setTitle((t) => (t + 1) % titles.length)
      },
      swapped.current ? titleMs : firstSwapMs,
    )
    return () => clearTimeout(timer)
  }, [title, reduceMotion, onScreen])

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
        Upload your resume and paste the job you want. Our AI tailors it in
        under a minute and shows your ATS match. You keep only the changes you
        like.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild className="h-12 px-7 text-base">
          <Link to="/login" search={{ mode: 'signup' }}>
            Build my resume free
          </Link>
        </Button>
        <Button
          size="lg"
          variant="glass"
          asChild
          className="h-12 px-6 text-base"
        >
          <Link to="/ats-checker">Check my ATS score</Link>
        </Button>
      </div>
      <p className="mt-4 text-base text-muted-foreground">
        Free plan: 5 tailored resumes in your first week, then 1 every month. No
        card needed.
      </p>
      <HowItWorksVideo />
    </section>
  )
}

// Where each caption starts in the recording, in seconds.
const steps = [
  { label: 'Import', at: 0 },
  { label: 'Edit', at: 6.3 },
  { label: 'Tailor with AI', at: 9.3 },
  { label: 'Review', at: 15.3 },
  { label: 'Apply', at: 23 },
  { label: 'Download', at: 26 },
]
const videoLength = 30.8

// The recording with its own quiet controls instead of the browser's: a row of steps that fill as they play
// and jump there when clicked, and a small pause button (WCAG 2.2.2). It plays muted while on screen; with
// reduced motion it waits for a click.
function HowItWorksVideo() {
  const reduceMotion = useReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  const onScreen = useInView(video, { amount: 0.4 })
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    const element = video.current
    if (!element || reduceMotion || stopped) return
    if (onScreen) element.play().catch(() => {})
    else element.pause()
  }, [onScreen, reduceMotion, stopped])

  // timeupdate only fires a few times a second, so the step bars follow the frames while playing.
  useEffect(() => {
    if (!playing) return
    let frame = requestAnimationFrame(function tick() {
      setTime(video.current?.currentTime ?? 0)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (element.paused) {
      setStopped(false)
      element.play().catch(() => {})
    } else {
      setStopped(true)
      element.pause()
    }
  }
  const seek = (at: number) => {
    const element = video.current
    if (!element) return
    element.currentTime = at
    setTime(at)
    setStopped(false)
    element.play().catch(() => {})
  }
  const current = steps.filter((step) => time >= step.at).length - 1

  return (
    <figure className="mx-auto mt-16 max-w-5xl sm:mt-20">
      {/* A faint bezel and a window bar in the page's own colours, so the recording sits in the page like a screen. */}
      <div className="rounded-[1.75rem] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--background),var(--foreground)_5%),var(--background))] p-2.5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.18)] sm:p-4 dark:shadow-none">
        <div className="overflow-hidden rounded-[1.25rem] bg-card ring-1 ring-[color-mix(in_srgb,var(--border),transparent_30%)]">
          <div
            aria-hidden="true"
            className="flex h-8 items-center gap-2 border-b border-[color-mix(in_srgb,var(--border),transparent_30%)] px-4 sm:h-10"
          >
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="relative">
            <video
              ref={video}
              className="block aspect-[1280/800] w-full cursor-pointer bg-sheet"
              poster="/video/how-it-works.jpg"
              width={1280}
              height={800}
              muted
              loop
              playsInline
              preload="metadata"
              aria-describedby="how-it-works-video"
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
            >
              <source src="/video/how-it-works.webm" type="video/webm" />
              <source src="/video/how-it-works.mp4" type="video/mp4" />
            </video>
            {/* The recording is always light, so the button keeps its light glass in dark mode too. */}
            <Button
              variant="glass"
              size="icon-lg"
              onClick={toggle}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className="absolute right-3 bottom-3 size-11 rounded-full border-black/10 bg-[rgb(255_255_255/0.72)] text-[#18201d] dark:border-black/10 dark:bg-[rgb(255_255_255/0.72)] dark:text-[#18201d] sm:right-4 sm:bottom-4"
            >
              {playing ? (
                <PauseIcon className="size-4" />
              ) : (
                <PlayIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-6">
        {steps.map((step, index) => {
          const end = steps[index + 1]?.at ?? videoLength
          const fill =
            index < current
              ? 1
              : index > current
                ? 0
                : (time - step.at) / (end - step.at)
          return (
            <li key={step.label}>
              <button
                type="button"
                onClick={() => seek(step.at)}
                aria-current={index === current ? 'step' : undefined}
                className="group flex min-h-11 w-full flex-col justify-center gap-2 rounded-md text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=step]:text-foreground"
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-full overflow-hidden rounded-full bg-border"
                >
                  <span
                    className="block h-full origin-left rounded-full bg-primary"
                    style={{
                      transform: `scaleX(${Math.min(1, Math.max(0, fill))})`,
                    }}
                  />
                </span>
                <span className="font-medium">
                  {index + 1}. {step.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <figcaption id="how-it-works-video" className="sr-only">
        A screen recording of Shortlist: a marketing resume is imported from a
        PDF, the headline is edited, a job description is pasted and the AI
        tailors the resume, each suggested change is reviewed and one is
        skipped, the changes are applied, and the resume is downloaded as a PDF.
      </figcaption>
    </figure>
  )
}
