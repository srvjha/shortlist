import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleHelpIcon,
  CircleXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AtsCheckStatus, AtsReport as Report } from '@/lib/api/types'
import { checkExamples } from '@/components/ats/check-examples'
import { sortChecks } from '@/lib/ats'
import { cn } from '@/lib/utils'

const grades: Record<Report['grade'], { label: string; ring: string }> = {
  excellent: { label: 'Excellent', ring: 'text-success' },
  good: { label: 'Good', ring: 'text-success' },
  fair: { label: 'Fair', ring: 'text-highlight' },
  poor: { label: 'Needs work', ring: 'text-destructive' },
}

const statuses: Record<
  AtsCheckStatus,
  {
    label: string
    icon: typeof CircleCheckIcon
    className: string
    iconClassName: string
  }
> = {
  fail: {
    label: 'Fail',
    icon: CircleXIcon,
    className: 'bg-destructive/10 text-destructive',
    iconClassName: 'text-destructive',
  },
  warn: {
    label: 'Warning',
    icon: TriangleAlertIcon,
    className: 'bg-highlight text-highlight-foreground',
    iconClassName: 'text-foreground',
  },
  pass: {
    label: 'Pass',
    icon: CircleCheckIcon,
    className: 'bg-success/10 text-success',
    iconClassName: 'text-success',
  },
}

// The line with its problem word marked, matched without regard to case.
function Highlighted({
  text,
  highlight = '',
}: {
  text: string
  highlight?: string
}) {
  const at = highlight
    ? text.toLowerCase().indexOf(highlight.toLowerCase())
    : -1
  if (at === -1) return text
  const end = at + highlight.length
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight/60 px-0.5 text-foreground">
        {text.slice(at, end)}
      </mark>
      {text.slice(end)}
    </>
  )
}

function ScoreRing({ score, className }: { score: number; className: string }) {
  const circumference = 2 * Math.PI * 42
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90">
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        strokeWidth="9"
        className="stroke-muted"
      />
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        className={cn('transition-[stroke-dashoffset] duration-700', className)}
      />
    </svg>
  )
}

type Knockout = NonNullable<Report['knockouts']>[number]

const knockoutStatuses: Record<
  Knockout['status'],
  { label: string; icon: typeof CircleCheckIcon; className: string }
> = {
  met: { ...statuses.pass, label: 'Met' },
  'not-met': { ...statuses.fail, label: 'Not met' },
  unclear: {
    label: 'Unclear',
    icon: CircleHelpIcon,
    className: 'bg-muted text-foreground',
  },
  'not-on-resume': {
    label: 'Not on your resume',
    icon: CircleDashedIcon,
    className: 'bg-highlight text-highlight-foreground',
  },
}

function StatusLabel({
  label,
  icon: Icon,
  className,
}: {
  label: string
  icon: typeof CircleCheckIcon
  className: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  )
}

function KeywordList({
  title,
  words,
  variant = 'secondary',
}: {
  title: string
  words: string[]
  variant?: 'secondary' | 'outline'
}) {
  if (words.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-sans text-sm font-medium">
        {title} <span className="text-muted-foreground">({words.length})</span>
      </h4>
      <ul className="flex flex-wrap gap-1.5">
        {words.map((word) => (
          <li key={word}>
            <Badge variant={variant} className="h-6 text-sm font-normal">
              {word}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AiLabel() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
      checked with AI
    </span>
  )
}

const titleLevels = {
  exact: 'exact match',
  close: 'close match',
  none: 'no match',
}

function SectionHeading({
  id,
  title,
  note,
}: {
  id: string
  title: string
  note?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 id={id} className="font-sans text-lg font-semibold">
        {title}
      </h3>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

// Two columns when there's room (the checker page), one in the editor's narrow AI panel.
// `aside` goes under the score, for actions like downloading or importing.
export function AtsReport({
  report,
  aside,
}: {
  report: Report
  aside?: React.ReactNode
}) {
  const grade = grades[report.grade]
  const { stats, keywords, parse } = report
  const impliedSkills = new Set(keywords?.implied.map((i) => i.skill))
  const mustHaveMissing =
    keywords?.mustHaveMissing.filter((word) => !impliedSkills.has(word)) ?? []
  const toFix = report.categories.flatMap((category) =>
    sortChecks(category.checks)
      .filter((check) => check.status !== 'pass')
      .map((check) => ({
        ...check,
        category: category.label,
        example: checkExamples[check.id],
      })),
  )
  const statList = [
    { label: 'Words', value: stats.words },
    { label: 'Bullets', value: stats.bullets },
    {
      label: 'With numbers',
      value: `${stats.quantifiedBullets} of ${stats.bullets}`,
    },
    { label: 'Sections', value: stats.sections.length },
  ]

  return (
    <div className="@container">
      <div className="grid gap-8 @3xl:grid-cols-[17rem_minmax(0,1fr)] @3xl:items-start">
        <div className="flex flex-col gap-5 @3xl:sticky @3xl:top-24 print:static">
          <div className="flex items-center gap-4 @3xl:flex-col @3xl:items-start">
            <div className="relative size-28 shrink-0">
              <ScoreRing score={report.score} className={grade.ring} />
              <p className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="font-serif text-4xl font-semibold tabular-nums">
                  {report.score}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  out of 100
                </span>
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-sans text-xl font-semibold">{grade.label}</p>
              <p className="text-sm text-muted-foreground">
                {/* The summary starts with the grade, which is already shown above it. */}
                {report.summary.replace(/^\w[\w ]*:\s*/, '')}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
            {statList.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-0.5 bg-card p-3"
              >
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="font-medium tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
          {stats.sections.length > 0 && (
            <p className="-mt-2 text-sm text-muted-foreground">
              Sections an ATS can find: {stats.sections.join(', ')}
            </p>
          )}
          {aside}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="ats-to-fix" className="flex flex-col gap-3">
            <h3 id="ats-to-fix" className="font-sans text-lg font-semibold">
              {toFix.length === 0
                ? 'Nothing to fix'
                : `What to fix (${toFix.length})`}
            </h3>
            {toFix.length === 0 ? (
              <p className="text-muted-foreground">
                Every check passes. An ATS should read this resume cleanly.
              </p>
            ) : (
              <ol className="flex flex-col divide-y rounded-lg border bg-card">
                {toFix.map((check) => (
                  <li
                    key={`${check.category}-${check.id}`}
                    className="flex flex-col gap-1.5 p-4 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusLabel {...statuses[check.status]} />
                      <span className="font-medium">{check.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {check.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {check.detail}
                    </p>
                    {check.lines && check.lines.length > 0 && (
                      <ul
                        aria-label="From your resume"
                        className="flex flex-col gap-1 border-l-2 pl-3 text-sm"
                      >
                        {check.lines.map((line) => (
                          <li key={line.text} className="break-words">
                            <Highlighted {...line} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {check.fix && (
                      <p className="text-sm">
                        <span className="font-medium">How to fix: </span>
                        {check.fix}
                      </p>
                    )}
                    {check.example && (
                      <dl className="grid gap-x-3 gap-y-1 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-[auto_1fr]">
                        <dt className="text-muted-foreground">Before</dt>
                        <dd className="text-muted-foreground line-through decoration-muted-foreground/40">
                          {check.example.before}
                        </dd>
                        <dt className="font-medium">After</dt>
                        <dd>{check.example.after}</dd>
                      </dl>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {keywords && (
            <section aria-labelledby="ats-job" className="flex flex-col gap-4">
              <SectionHeading
                id="ats-job"
                title="Job match"
                note="Add missing skills only where they are true for you."
              />
              {report.title && (
                <p className="text-sm">
                  <span className="font-medium">Job title:</span>{' '}
                  {report.title.jobTitle}.{' '}
                  {report.title.best
                    ? `${report.title.level === 'exact' ? 'On' : 'Closest on'} your resume: ${report.title.best} (${titleLevels[report.title.level]}).`
                    : 'Not found on your resume.'}
                </p>
              )}
              {mustHaveMissing.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="flex items-center gap-2 font-medium text-destructive">
                    <CircleXIcon aria-hidden className="size-4 shrink-0" />
                    Must-have skills missing
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The job lists these as required. Recruiters filter and
                    search on them first.
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {mustHaveMissing.map((word) => (
                      <li key={word}>
                        <Badge
                          variant="outline"
                          className="h-6 border-destructive/40 bg-card text-sm font-normal"
                        >
                          {word}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <KeywordList
                title="Other hard skills missing"
                words={keywords.hard.missing.filter(
                  (word) =>
                    !keywords.mustHaveMissing.includes(word) &&
                    !impliedSkills.has(word),
                )}
                variant="outline"
              />
              {keywords.implied.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="flex flex-wrap items-center gap-x-2 font-sans text-sm font-medium">
                    Implied by your resume{' '}
                    <span className="text-muted-foreground">
                      ({keywords.implied.length})
                    </span>
                    <AiLabel />
                  </h4>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {keywords.implied.map(({ skill, evidence }) => (
                      <li key={skill} className="break-words">
                        <Badge
                          variant="outline"
                          className="mr-2 h-6 text-sm font-normal"
                        >
                          {skill}
                        </Badge>
                        Implied by {evidence}. Add '{skill}' so keyword searches
                        find you.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <KeywordList
                title="Hard skills found"
                words={keywords.hard.matched}
              />
              {keywords.soft.matched.length + keywords.soft.missing.length >
                0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Soft skills.</span>{' '}
                  {keywords.soft.missing.length > 0 &&
                    `Missing: ${keywords.soft.missing.join(', ')}. `}
                  {keywords.soft.matched.length > 0 &&
                    `Found: ${keywords.soft.matched.join(', ')}. `}
                  These count for less; show them through what you did.
                </p>
              )}
            </section>
          )}

          {report.knockouts && report.knockouts.length > 0 && (
            <section
              aria-labelledby="ats-knockouts"
              className="flex flex-col gap-3"
            >
              <SectionHeading
                id="ats-knockouts"
                title="Requirements a recruiter will check"
                note="Application forms often ask these as yes or no questions. These don't change your score."
              />
              <ul className="flex flex-col divide-y rounded-lg border bg-card">
                {report.knockouts.map((knockout) => (
                  <li
                    key={`${knockout.id}-${knockout.label}`}
                    className="flex flex-col gap-1.5 p-4 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusLabel {...knockoutStatuses[knockout.status]} />
                      <span className="font-medium">{knockout.label}</span>
                      {!knockout.required && (
                        <span className="text-sm text-muted-foreground">
                          Preferred
                        </span>
                      )}
                      {knockout.checkedWithAi && <AiLabel />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The job says: <q>{knockout.requirement}</q>
                    </p>
                    {knockout.evidence && (
                      <p className="text-sm text-muted-foreground">
                        {knockout.checkedWithAi ? (
                          <>
                            Your resume says: <q>{knockout.evidence}</q>
                          </>
                        ) : (
                          knockout.evidence
                        )}
                      </p>
                    )}
                    <p className="text-sm">{knockout.advice}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {parse && (
            <section
              aria-labelledby="ats-parse"
              className="flex flex-col gap-3"
            >
              <SectionHeading
                id="ats-parse"
                title="How an ATS reads it"
                note={
                  parse.parseRate === null
                    ? 'Here is what a parser pulled out of your PDF.'
                    : `An ATS parser read ${parse.fields.filter((field) => field.ok).length} of ${parse.fields.length} fields correctly.`
                }
              />
              <ul className="grid gap-x-6 rounded-lg border bg-card p-4 text-sm @lg:grid-cols-2">
                {parse.fields.map((field) => {
                  const { icon: Icon, iconClassName } =
                    statuses[field.ok ? 'pass' : 'fail']
                  return (
                    <li
                      key={field.id}
                      className="flex min-w-0 gap-2 py-1.5 break-inside-avoid"
                    >
                      <Icon
                        aria-hidden
                        className={cn('mt-0.5 size-4 shrink-0', iconClassName)}
                      />
                      <span className="sr-only">
                        {field.ok ? 'Read correctly' : 'Missed'}:{' '}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">{field.label}</span>
                        <span className="block break-words text-muted-foreground">
                          {field.found ?? 'Not found'}
                          {!field.ok &&
                            field.expected &&
                            field.found !== field.expected &&
                            ` (expected ${field.expected})`}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section
            aria-labelledby="ats-breakdown"
            className="flex flex-col gap-3"
          >
            <h3 id="ats-breakdown" className="font-sans text-lg font-semibold">
              Score breakdown
            </h3>
            <ul className="grid gap-3 @lg:grid-cols-2">
              {report.categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-3 rounded-lg border bg-card p-4 break-inside-avoid"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{category.label}</span>
                    <span className="text-sm tabular-nums">
                      {category.score}/{category.maxScore}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${(category.score / Math.max(1, category.maxScore)) * 100}%`,
                      }}
                    />
                  </span>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {sortChecks(category.checks).map((check) => {
                      const {
                        icon: Icon,
                        label,
                        iconClassName,
                      } = statuses[check.status]
                      return (
                        <li key={check.id} className="flex items-center gap-2">
                          <Icon
                            aria-hidden
                            className={cn('size-4 shrink-0', iconClassName)}
                          />
                          <span className="sr-only">{label}: </span>
                          <span
                            className={
                              check.status === 'pass'
                                ? 'text-muted-foreground'
                                : undefined
                            }
                          >
                            {check.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
