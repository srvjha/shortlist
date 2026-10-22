import { CheckIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export const stepMs = 650

// The checks the server really runs, in order, so the wait shows what is being looked at.
export function scanSteps(input: {
  pdf: boolean
  words: number
  job: boolean
}) {
  return [
    input.pdf
      ? `Reading ${input.words.toLocaleString('en-IN')} words and their positions from your PDF`
      : `Reading ${input.words.toLocaleString('en-IN')} words of resume text`,
    ...(input.pdf
      ? ['Rebuilding lines and columns the way an ATS parser does']
      : []),
    'Finding your sections and headings',
    'Checking name, email, phone and links',
    'Checking bullets for action verbs, numbers and length',
    ...(input.job
      ? [
          'Matching your skills against the job description',
          'Checking the job’s must-have requirements',
        ]
      : []),
    'Scoring and writing your fixes',
  ]
}

// Ticks through the steps while the check runs. Each step finishes in turn; the last stays active
// until the report arrives.
export function ScanProgress({ steps }: { steps: string[] }) {
  const [done, setDone] = useState(0)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
    panel.current?.scrollIntoView({
      block: 'nearest',
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])
  useEffect(() => {
    const timer = setInterval(
      () => setDone((n) => Math.min(n + 1, steps.length - 1)),
      stepMs,
    )
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div
      ref={panel}
      role="status"
      aria-live="polite"
      className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-7"
    >
      <p className="font-sans font-semibold">Checking your resume</p>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className={cn(
              'flex items-center gap-3 text-sm transition-opacity motion-reduce:transition-none',
              index > done && 'opacity-40',
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              {index < done ? (
                <CheckIcon aria-hidden className="size-4 text-primary" />
              ) : index === done ? (
                <Spinner className="size-4" />
              ) : (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-muted-foreground"
                />
              )}
            </span>
            <span>
              {step}
              {index < done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
