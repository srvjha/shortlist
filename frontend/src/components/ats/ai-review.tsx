import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LockIcon, SparklesIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api, errorMessage, unwrap } from '@/lib/api/client'
import { meQuery } from '@/lib/api/queries'
import { useSession } from '@/lib/auth-client'

function Heading() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SparklesIcon aria-hidden className="size-4 text-primary" />
      <h3 id="ai-review" className="font-sans text-lg font-semibold">
        AI review
      </h3>
      <Badge variant="secondary">Season Pass / Pro</Badge>
    </div>
  )
}

// A recruiter-style reading on top of the rule-based report. It runs once per resume and job: checking the same
// text again reads the cached answer instead of spending another review.
export function AiReview({
  text,
  jobDescription,
}: {
  text: string
  jobDescription: string
}) {
  const { data: session } = useSession()
  const { data: me } = useQuery({ ...meQuery, enabled: Boolean(session) })
  const paid = !!me && me.plan !== 'free'
  const review = useQuery({
    queryKey: ['ats-review', text, jobDescription],
    queryFn: () =>
      unwrap(
        api.POST('/v1/ats-reviews', {
          body: { text, ...(jobDescription && { jobDescription }) },
        }),
      ),
    enabled: paid,
    staleTime: Infinity,
    retry: false,
  })

  if (session && !me) return null
  if (!paid) return <LockedReview signedIn={Boolean(session)} />

  return (
    <section
      aria-labelledby="ai-review"
      aria-busy={review.isPending}
      className="mt-6 flex flex-col gap-6 rounded-2xl border bg-card p-5 sm:p-7 print:border-0 print:p-0"
    >
      <Heading />
      {review.isPending ? (
        <div role="status" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Reading your resume the way a recruiter would…
          </p>
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : review.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't write the AI review</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {errorMessage(review.error)}
            {!(
              review.error instanceof ApiError && review.error.status === 402
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => review.refetch()}
              >
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-8">
          <p className="font-serif text-xl leading-snug">
            {review.data.verdict}
          </p>

          {review.data.fixes.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="font-sans font-semibold">Fix these first</h4>
              <ol className="flex flex-col gap-4">
                {review.data.fixes.map((fix, index) => (
                  <li
                    key={fix.title}
                    className="flex gap-3 rounded-xl border p-4 print:break-inside-avoid"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs text-primary">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="font-medium">{fix.title}</p>
                      <p className="text-sm text-muted-foreground">{fix.why}</p>
                      {fix.line && (
                        <p className="text-sm break-words">
                          <span className="text-muted-foreground">Now: </span>
                          {fix.line}
                        </p>
                      )}
                      {fix.rewrite && (
                        <p className="text-sm break-words">
                          <span className="text-muted-foreground">Try: </span>
                          <mark className="rounded-sm bg-highlight/50 px-0.5 text-foreground">
                            {fix.rewrite}
                          </mark>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {review.data.fixes.some((fix) => fix.rewrite?.includes('[')) && (
                <p className="text-sm text-muted-foreground">
                  Replace anything in [square brackets] with your real number,
                  or leave it out.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            {review.data.strengths.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-sans font-semibold">Already working</h4>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {review.data.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.data.jobFit && (
              <div className="flex flex-col gap-2">
                <h4 className="font-sans font-semibold">Fit for this job</h4>
                <p className="text-sm text-muted-foreground">
                  {review.data.jobFit.summary}
                </p>
                {review.data.jobFit.gaps.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {review.data.jobFit.gaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Written by AI from your resume's own words. It can be wrong; check
            each change before you use it.
          </p>
        </div>
      )}
    </section>
  )
}

function LockedReview({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      aria-labelledby="ai-review"
      data-print-hide
      className="mt-6 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-7"
    >
      <Heading />
      <div className="flex max-w-xl flex-col items-start gap-3">
        <p className="flex items-center gap-2 font-serif text-2xl leading-tight">
          <LockIcon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          Get a recruiter-style read of this resume
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          <li>A plain verdict on how it reads in the first 30 seconds</li>
          <li>Your top fixes, with rewrites of your own lines</li>
          <li>How well it fits the job you pasted, and what is missing</li>
        </ul>
        <Button asChild>
          {signedIn ? (
            <Link to="/billing">See Season Pass and Pro</Link>
          ) : (
            <Link to="/pricing">See plans</Link>
          )}
        </Button>
      </div>
    </section>
  )
}
