import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  PlusIcon,
  RotateCwIcon,
  SparklesIcon,
  TargetIcon,
  WandSparklesIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AtsReport } from '@/components/ats/ats-report'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useCheckout } from '@/hooks/use-checkout'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { aiErrorMessage } from '@/lib/api/errors'
import {
  jobsQuery,
  queryKeys,
  resumeQuery,
  suggestionsQuery,
  usageQuery,
} from '@/lib/api/queries'
import type { ResumeContent, Suggestion } from '@/lib/api/types'
import { fixInstruction } from '@/lib/ats'
import { formatDate } from '@/lib/format'
import { plans } from '@/lib/plans'
import { panelStorage } from '@/lib/panel-storage'
import { priceNote, priceOf, usePricing } from '@/lib/pricing'
import { CoverageReport } from './coverage-report'
import { SuggestionReview } from './suggestion-review'

export type AiPanelMode = 'tailor' | 'edit' | 'fix'

const quickRequests = [
  'Make every bullet start with a strong action verb',
  'Make the bullets shorter and more specific',
  'Trim it to fit on one page',
  'Bold the key technologies in each bullet',
]

export function NewJobForm({
  onCreated,
}: {
  onCreated: (jobId: string) => void
}) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<'text' | 'url'>('text')
  const [value, setValue] = useState('')
  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/jobs', {
          body:
            kind === 'url'
              ? { sourceUrl: value.trim() }
              : { rawText: value.trim() },
        }),
      ),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs })
      toast.success(
        `Added ${[job.role, job.company].filter(Boolean).join(' at ') || 'the job'}`,
      )
      onCreated(job.id)
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={kind}
        onValueChange={(v) => v && setKind(v as typeof kind)}
      >
        <ToggleGroupItem value="text">Paste description</ToggleGroupItem>
        <ToggleGroupItem value="url">Job link</ToggleGroupItem>
      </ToggleGroup>
      {kind === 'text' ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            aria-label="Job description"
            rows={6}
            placeholder="Paste the full job description"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste the full description, not just the title.
          </p>
        </div>
      ) : (
        <Input
          aria-label="Job link"
          type="url"
          placeholder="https://careers.example.com/backend-engineer"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      )}
      <Button
        size="sm"
        className="self-start"
        disabled={
          create.isPending ||
          (kind === 'text' ? value.trim().length < 50 : !value.trim())
        }
        onClick={() => create.mutate()}
      >
        {create.isPending && <Spinner data-icon="inline-start" />}
        {create.isPending ? 'Reading the job…' : 'Add job'}
      </Button>
    </div>
  )
}

const noJob = 'none'

// With optional, the picker offers "no job" and hides the new job form behind a button.
function JobPicker({
  id,
  value,
  onChange,
  optional,
}: {
  id: string
  value: string | null
  onChange: (jobId: string | null) => void
  optional?: boolean
}) {
  const { data: jobs } = useQuery(jobsQuery)
  const [adding, setAdding] = useState(false)
  const hasJobs = jobs && jobs.length > 0

  if (optional && !hasJobs && !adding) {
    return (
      <Button
        id={id}
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setAdding(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Add a job
      </Button>
    )
  }
  if (!hasJobs || adding) {
    return (
      <NewJobForm
        onCreated={(jobId) => {
          onChange(jobId)
          setAdding(false)
        }}
      />
    )
  }
  return (
    <div className="flex gap-2">
      <Select
        value={value ?? (optional ? noJob : undefined)}
        onValueChange={(next) => onChange(next === noJob ? null : next)}
      >
        <SelectTrigger id={id} className="min-w-0 flex-1">
          <SelectValue placeholder="Choose a job" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {optional && (
              <SelectItem value={noJob}>No job, general check</SelectItem>
            )}
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {[job.role, job.company].filter(Boolean).join(' at ') ||
                  'Untitled job'}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        aria-label="Add a new job"
        onClick={() => setAdding(true)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

type SuggestBody =
  | { type: 'tailor'; jobId: string; instructions?: string }
  | { type: 'edit'; instruction: string }
  | { type: 'fix_compile' }

const pendingText: Record<SuggestBody['type'], string> = {
  tailor: 'Matching your resume to the job…',
  edit: 'Working on your request…',
  fix_compile: 'Fixing the LaTeX…',
}

// Docked beside the preview on wide screens, a slide-over sheet on smaller ones.
export function AiPanel({
  open,
  onOpenChange,
  docked,
  mode,
  resumeId,
  initialJobId,
  content,
  texSource,
  hasUnsavedChanges,
  suggestion,
  setSuggestion,
  checkAtsOnOpen = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docked: boolean
  mode: AiPanelMode
  resumeId: string
  initialJobId: string | null
  content: ResumeContent | null
  texSource: string | null
  hasUnsavedChanges: boolean
  // Owned by the editor so an open suggestion survives the panel remounting between docked and sheet.
  suggestion: Suggestion | null
  setSuggestion: (suggestion: Suggestion | null) => void
  checkAtsOnOpen?: boolean
}) {
  const [jobId, setJobId] = useState<string | null>(initialJobId)
  const [atsJobId, setAtsJobId] = useState<string | null>(initialJobId)
  const [atsOpen, setAtsOpen] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [request, setRequest] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)

  // A run keeps going on the server if the page reloads, so offer a finished suggestion the user never saw.
  const seenKey = `seen-suggestion:${resumeId}`
  const [seenId, setSeenId] = useState(() => panelStorage.getItem(seenKey))
  const markSeen = (id: string) => {
    setSeenId(id)
    panelStorage.setItem(seenKey, id)
  }
  // The editor already holds this query; refetching here could remount it mid-edit.
  const { data: headId } = useQuery({
    ...resumeQuery(resumeId),
    select: (resume) => resume.head?.id,
    refetchOnMount: false,
  })
  const { data: suggestions } = useQuery({
    ...suggestionsQuery(resumeId),
    enabled: open,
  })
  const { data: usage } = useQuery(usageQuery)
  const queryClient = useQueryClient()
  const latest = suggestions?.[0]
  const ready =
    latest &&
    latest.status === 'pending' &&
    latest.id !== seenId &&
    latest.baseVersionId === headId &&
    Date.now() - new Date(latest.createdAt).getTime() < 24 * 60 * 60_000
      ? latest
      : null
  const reopen = useMutation({
    mutationFn: (suggestionId: string) =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}/suggestions/{suggestionId}', {
          params: { path: { resumeId, suggestionId } },
        }),
      ),
    onSuccess: (next) => {
      markSeen(next.id)
      setSuggestion(next)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const suggest = useMutation({
    mutationFn: (body: SuggestBody) =>
      unwrap(
        api.POST('/v1/resumes/{resumeId}/suggestions', {
          params: { path: { resumeId } },
          body,
        }),
      ),
    onSuccess: (next, body) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usage })
      markSeen(next.id)
      setSuggestion(next)
      if (body.type === 'edit') setRequest('')
    },
    onError: (error) => {
      // A quota error means the counts shown are stale; refetch so the upgrade card appears.
      queryClient.invalidateQueries({ queryKey: queryKeys.usage })
      toast.error(aiErrorMessage(error))
    },
  })
  const tailorsLeft =
    usage?.plan === 'free' && !usage.ownAiKey
      ? Math.max(0, usage.tailor.limit - usage.tailor.used)
      : null

  const ats = useMutation({
    mutationFn: (forJob: string | null) =>
      unwrap(
        api.POST('/v1/resumes/{resumeId}/ats-reports', {
          params: { path: { resumeId } },
          body: forJob ? { jobId: forJob } : {},
        }),
      ),
  })
  const checkAts = () => {
    setAtsOpen(true)
    ats.mutate(atsJobId)
  }
  const startSuggestion = (next: SuggestBody) => {
    setAtsOpen(false)
    suggest.mutate(next)
  }
  const atsFix = ats.data ? fixInstruction(ats.data) : null
  // Arriving from "Check your ATS score" runs the check once, straight away.
  useEffect(() => {
    if (checkAtsOnOpen) checkAts()
    // Only on the first render.
  }, [])

  useEffect(() => {
    if (!open) return
    if (mode === 'fix' && !suggestion && !suggest.isPending)
      suggest.mutate({ type: 'fix_compile' })
    if (mode === 'edit') composer.current?.focus()
    // Only when the panel opens or switches mode.
  }, [open, mode])

  function sendRequest() {
    const instruction = request.trim()
    if (instruction.length >= 3 && !suggest.isPending)
      suggest.mutate({ type: 'edit', instruction })
  }

  const reviewing = suggestion !== null
  const title = reviewing
    ? 'Suggested changes'
    : atsOpen
      ? 'ATS score'
      : mode === 'fix'
        ? 'Fix the LaTeX'
        : 'Improve with AI'
  const description = reviewing
    ? 'Nothing changes until you apply. You can undo from History.'
    : atsOpen
      ? "How well a typical ATS and a recruiter's quick scan will read your last saved version. Each company's ATS differs, so treat it as a guide."
      : 'Suggestions only use what is already in your resume and profile.'

  const body = (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        {hasUnsavedChanges && !reviewing && (
          <Alert className="mb-4">
            <AlertDescription>
              Your latest edits are still saving. Suggestions use the last saved
              version.
            </AlertDescription>
          </Alert>
        )}

        {suggest.isPending ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground"
            aria-live="polite"
          >
            <Spinner className="size-6" />
            <p>{pendingText[suggest.variables.type]}</p>
            <p className="text-sm">
              This can take a minute or two. If you reload, the result waits for
              you here.
            </p>
          </div>
        ) : suggestion ? (
          <SuggestionReview
            resumeId={resumeId}
            suggestion={suggestion}
            content={content}
            texSource={texSource}
            onApplied={() => {
              setSuggestion(null)
              if (!docked) onOpenChange(false)
            }}
            onDiscard={() => setSuggestion(null)}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        ) : mode === 'fix' && suggest.isError ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">Couldn't prepare a fix.</p>
            <Button
              className="self-start"
              onClick={() => suggest.mutate({ type: 'fix_compile' })}
            >
              Try again
            </Button>
          </div>
        ) : atsOpen ? (
          <div className="flex flex-col gap-6">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 self-start"
              onClick={() => setAtsOpen(false)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
            {ats.isPending ? (
              <div
                className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground"
                aria-live="polite"
              >
                <Spinner className="size-6" />
                <p>Checking your resume…</p>
              </div>
            ) : ats.isError ? (
              <div role="alert" className="flex flex-col gap-3">
                <p className="text-muted-foreground">
                  {aiErrorMessage(ats.error)}
                </p>
                <Button className="self-start" onClick={checkAts}>
                  Try again
                </Button>
              </div>
            ) : (
              ats.data && (
                <>
                  <AtsReport report={ats.data} />
                  <div className="flex flex-col gap-2 border-t pt-4">
                    {atsFix ? (
                      <Button
                        onClick={() =>
                          startSuggestion({ type: 'edit', instruction: atsFix })
                        }
                      >
                        <WandSparklesIcon data-icon="inline-start" />
                        Fix with AI
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nothing left to fix. Nice work.
                      </p>
                    )}
                    {ats.variables && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const forJob = ats.variables as string
                          setJobId(forJob)
                          startSuggestion({ type: 'tailor', jobId: forJob })
                        }}
                      >
                        <TargetIcon data-icon="inline-start" />
                        Tailor to this job
                      </Button>
                    )}
                    <Button variant="ghost" onClick={checkAts}>
                      <RotateCwIcon data-icon="inline-start" />
                      Check again
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Nothing changes until you apply it. Check again after
                      saving to see the new score.
                    </p>
                  </div>
                </>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {ready && (
              <Alert role="status">
                <SparklesIcon />
                <AlertTitle>Your last suggestion is ready</AlertTitle>
                <AlertDescription>
                  It finished while you were away. Review it before asking for a
                  new one.
                </AlertDescription>
                <div className="col-start-2 mt-2 flex gap-2">
                  <Button
                    size="sm"
                    disabled={reopen.isPending}
                    onClick={() => reopen.mutate(ready.id)}
                  >
                    {reopen.isPending && <Spinner data-icon="inline-start" />}
                    Review it
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markSeen(ready.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}

            <section
              aria-labelledby="ai-tailor"
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <h3
                  id="ai-tailor"
                  className="font-sans text-base font-semibold"
                >
                  Tailor to a job
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reorders, trims and rephrases your resume for one job.
                </p>
                {usage && tailorsLeft !== null && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {usage.trialEndsAt
                      ? `${tailorsLeft} of ${usage.tailor.limit} tailored resumes left in your first week, until ${formatDate(usage.trialEndsAt)}`
                      : `${tailorsLeft} of ${usage.tailor.limit} tailored resume left this month`}
                  </p>
                )}
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="job">Job</FieldLabel>
                  <JobPicker id="job" value={jobId} onChange={setJobId} />
                  <FieldDescription>
                    Jobs you add are saved on the{' '}
                    <Link to="/jobs" className="underline underline-offset-2">
                      Jobs page
                    </Link>
                    .
                  </FieldDescription>
                </Field>

                {jobId && content && (
                  <CoverageReport resumeId={resumeId} jobId={jobId} />
                )}

                <Field>
                  <FieldLabel htmlFor="instructions">
                    Anything to focus on? (optional)
                  </FieldLabel>
                  <Textarea
                    id="instructions"
                    rows={2}
                    placeholder="Focus on backend work and drop the college fest project"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                  />
                </Field>
                {tailorsLeft === 0 ? (
                  <TailorUpgrade />
                ) : (
                  <Button
                    disabled={!jobId}
                    onClick={() =>
                      jobId &&
                      suggest.mutate({
                        type: 'tailor',
                        jobId,
                        ...(instructions.trim() && {
                          instructions: instructions.trim(),
                        }),
                      })
                    }
                  >
                    <SparklesIcon data-icon="inline-start" />
                    Tailor resume
                  </Button>
                )}
              </FieldGroup>
            </section>

            <section aria-labelledby="ai-quick" className="flex flex-col gap-3">
              <h3 id="ai-quick" className="font-sans text-base font-semibold">
                Quick changes
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickRequests.map((quick) => (
                  <Button
                    key={quick}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 text-left whitespace-normal"
                    onClick={() =>
                      suggest.mutate({ type: 'edit', instruction: quick })
                    }
                  >
                    {quick}
                  </Button>
                ))}
              </div>
            </section>

            <section aria-labelledby="ai-ats" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 id="ai-ats" className="font-sans text-base font-semibold">
                  Test your resume
                </h3>
                <p className="text-sm text-muted-foreground">
                  Scores how well a typical ATS and a recruiter's quick scan
                  will read it, with a list of fixes. A rule based check, so
                  it's instant.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="ats-job">
                  Check keywords for a job (optional)
                </FieldLabel>
                <JobPicker
                  id="ats-job"
                  value={atsJobId}
                  onChange={setAtsJobId}
                  optional
                />
              </Field>
              <Button variant="outline" onClick={checkAts}>
                Check ATS score
              </Button>
            </section>
          </div>
        )}
      </div>

      {!reviewing && !suggest.isPending && !atsOpen && (
        <form
          className="shrink-0 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            sendRequest()
          }}
        >
          <div className="flex flex-col gap-2 rounded-lg border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              ref={composer}
              aria-label="Ask for a change"
              rows={2}
              placeholder="Ask for a change, like: rewrite my project bullets to show impact"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendRequest()
                }
              }}
              className="min-h-0 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                Nothing changes until you apply it
                {usage?.plan === 'free' &&
                  !usage.ownAiKey &&
                  ` · ${Math.max(0, usage.edit.limit - usage.edit.used)} of ${usage.edit.limit} AI edits left`}
              </span>
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send"
                disabled={request.trim().length < 3}
              >
                <ArrowUpIcon />
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  )

  if (docked) {
    if (!open) return null
    return (
      <aside
        aria-label="AI assistant"
        className="flex h-full min-h-0 flex-col bg-card"
      >
        <div className="flex shrink-0 items-start gap-2 border-b p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-sans text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI panel"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
          </Button>
        </div>
        {body}
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

const seasonPass = plans.find((plan) => plan.id === 'season_pass')!

// Shown in place of the Tailor button once a Free account has no tailored resumes left.
function TailorUpgrade() {
  const { checkout } = useCheckout()
  const pricing = usePricing()
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">
          You've used your free tailored resumes
        </p>
        <p className="text-sm text-muted-foreground">
          The Season Pass gives you 40 tailored resumes a month and unlimited AI
          edits, for {priceOf('season_pass', pricing)} {seasonPass.period}.{' '}
          {priceNote('season_pass', pricing)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => checkout.mutate('season_pass')}
          disabled={checkout.isPending}
        >
          {checkout.isPending && <Spinner data-icon="inline-start" />}
          {seasonPass.cta}
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/billing">See all plans</Link>
        </Button>
      </div>
    </div>
  )
}
