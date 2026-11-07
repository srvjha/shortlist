import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CodeIcon,
  FileTextIcon,
  PlusIcon,
} from 'lucide-react'
import { referrerLabel } from '@/components/analytics/labels'
import { ViewsChart } from '@/components/analytics/views-chart'
import { PageHeader } from '@/components/app/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  analyticsQuery,
  meQuery,
  profileQuery,
  resumesQuery,
  usageQuery,
} from '@/lib/api/queries'
import { initials, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/dashboard')({
  head: () => ({ meta: [{ title: `Dashboard | ${site.name}` }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(meQuery),
      context.queryClient.prefetchQuery(usageQuery),
      context.queryClient.prefetchQuery(profileQuery),
      context.queryClient.prefetchQuery(resumesQuery(false)),
      context.queryClient.prefetchQuery(analyticsQuery(30)),
    ]),
  component: DashboardPage,
})

const sectionLink =
  'text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'

function DashboardPage() {
  const { data: me } = useQuery(meQuery)
  const { data: usage } = useQuery(usageQuery)
  const { data: profile } = useQuery(profileQuery)
  const resumes = useQuery(resumesQuery(false))
  const analytics = useQuery(analyticsQuery(30))
  const firstName = me?.name.split(' ')[0]

  const loading = resumes.isPending || analytics.isPending || !usage
  const steps = [
    {
      label: 'Add your details to your profile',
      done: Boolean(profile?.updatedAt),
      to: '/profile',
    },
    {
      label: 'Create your first resume',
      done: Boolean(resumes.data?.length),
      to: '/resumes/new',
    },
    {
      label: 'Tailor a resume to a job',
      done: Boolean(resumes.data?.some((resume) => resume.jobId)),
      to: '/jobs',
    },
    {
      label: 'Share a resume with a link',
      done: Boolean(analytics.data?.links.length),
      to: '/workspace',
    },
  ] as const
  const stepsLeft = steps.filter((step) => !step.done).length

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-8 sm:px-8">
      <PageHeader
        title={
          firstName && firstName !== 'Guest'
            ? `Welcome back, ${firstName}`
            : 'Dashboard'
        }
        description="How your resumes are doing, and what to do next."
        leading={
          me && (
            <Avatar className="size-14 ring-2 ring-border ring-offset-2 ring-offset-background">
              {me.image && <AvatarImage src={me.image} alt="" />}
              <AvatarFallback className="font-serif text-lg">
                {initials(me.name || me.username)}
              </AvatarFallback>
            </Avatar>
          )
        }
        actions={
          <Button asChild>
            <Link to="/resumes/new">
              <PlusIcon data-icon="inline-start" />
              New resume
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <>
          {stepsLeft > 0 && (
            <section
              aria-labelledby="get-started"
              className="flex flex-col gap-4 rounded-2xl border bg-card p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id="get-started"
                  className="font-sans text-lg font-semibold"
                >
                  Get started
                </h2>
                <p className="text-sm text-muted-foreground">
                  {steps.length - stepsLeft} of {steps.length} done
                </p>
              </div>
              <ol className="grid gap-2 sm:grid-cols-2">
                {steps.map((step) => (
                  <li key={step.label}>
                    <Link
                      to={step.to}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
                        step.done && 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border',
                          step.done &&
                            'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {step.done && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className={cn(step.done && 'line-through')}>
                        {step.label}
                      </span>
                      <span className="sr-only">
                        {step.done ? '(done)' : '(to do)'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <dl className="grid gap-6 border-y py-6 sm:grid-cols-3 sm:divide-x">
            <div className="flex flex-col gap-1 sm:pr-6">
              <dt className="text-sm text-muted-foreground">Resumes</dt>
              <dd className="font-serif text-4xl tabular-nums">
                {resumes.data?.length ?? 0}
              </dd>
              <dd className="text-sm text-muted-foreground">
                {analytics.data?.links.length ?? 0} shared with a link
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:px-6">
              <dt className="text-sm text-muted-foreground">
                Views, last 30 days
              </dt>
              <dd className="font-serif text-4xl tabular-nums">
                {analytics.data?.totals.views.toLocaleString('en-IN') ?? 0}
              </dd>
              <dd>
                <ViewsChange
                  current={analytics.data?.totals.views ?? 0}
                  previous={analytics.data?.totals.previousViews ?? 0}
                />
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:pl-6">
              <dt className="text-sm text-muted-foreground">
                {usage.plan === 'free'
                  ? 'Free AI tailoring left'
                  : 'AI tailoring left this month'}
              </dt>
              {usage.ownAiKey ? (
                <>
                  <dd className="font-serif text-4xl">Unlimited</dd>
                  <dd className="text-sm text-muted-foreground">
                    Running on your own AI key
                  </dd>
                </>
              ) : (
                <>
                  <dd className="font-serif text-4xl tabular-nums">
                    {Math.max(0, usage.tailor.limit - usage.tailor.used)}
                    <span className="text-xl text-muted-foreground">
                      {' '}
                      of {usage.tailor.limit}
                    </span>
                  </dd>
                  <dd className="text-sm text-muted-foreground">
                    {usage.plan === 'free' ? (
                      <Link
                        to="/pricing"
                        className="underline-offset-4 hover:underline"
                      >
                        See plans
                      </Link>
                    ) : (
                      'Resets on the 1st of every month'
                    )}
                  </dd>
                </>
              )}
            </div>
          </dl>

          {analytics.data && analytics.data.totals.views > 0 && (
            <section aria-labelledby="views" className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="views" className="font-sans text-base font-semibold">
                  Views per day
                </h2>
                <Link to="/analytics" className={sectionLink}>
                  Full analytics
                </Link>
              </div>
              <ViewsChart data={analytics.data.viewsByDay} />
            </section>
          )}

          <div className="grid gap-10 lg:grid-cols-2">
            <section
              aria-labelledby="recent-resumes"
              className="flex flex-col gap-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="recent-resumes"
                  className="font-sans text-base font-semibold"
                >
                  Recent resumes
                </h2>
                <Link to="/workspace" className={sectionLink}>
                  Open workspace
                </Link>
              </div>
              {resumes.data?.length ? (
                <ul className="flex flex-col divide-y rounded-lg border bg-card">
                  {resumes.data.slice(0, 5).map((resume) => (
                    <li key={resume.id}>
                      <Link
                        to="/resumes/$resumeId"
                        params={{ resumeId: resume.id }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          {resume.mode === 'code' ? (
                            <CodeIcon className="size-4" />
                          ) : (
                            <FileTextIcon className="size-4" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {resume.title}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {resume.mode === 'code'
                              ? 'LaTeX'
                              : (templateCatalog.find(
                                  (t) => t.id === resume.templateId,
                                )?.name ?? 'Form')}
                            , edited {timeAgo(resume.updatedAt)}
                          </span>
                        </span>
                        {resume.jobId && (
                          <span className="shrink-0 rounded-sm bg-highlight px-1.5 py-0.5 text-xs font-medium text-highlight-foreground">
                            Tailored
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No resumes yet.{' '}
                  <Link
                    to="/resumes/new"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Create your first one
                  </Link>
                  .
                </p>
              )}
            </section>

            <section
              aria-labelledby="recent-opens"
              className="flex flex-col gap-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="recent-opens"
                  className="font-sans text-base font-semibold"
                >
                  Recent opens
                </h2>
                <Link to="/analytics" className={sectionLink}>
                  See analytics
                </Link>
              </div>
              {analytics.data?.recentViews.length ? (
                <ol className="flex flex-col divide-y rounded-lg border bg-card">
                  {analytics.data.recentViews.slice(0, 5).map((view) => (
                    <li
                      key={view.id}
                      className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <p className="min-w-0">
                        <span className="font-medium">{view.resumeTitle}</span>{' '}
                        <span className="text-muted-foreground">
                          from {referrerLabel(view.referrer)}
                        </span>
                      </p>
                      <time
                        dateTime={new Date(view.viewedAt).toISOString()}
                        className="shrink-0 text-muted-foreground"
                      >
                        {timeAgo(view.viewedAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  When someone opens a resume you shared, it shows up here.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function ViewsChange({
  current,
  previous,
}: {
  current: number
  previous: number
}) {
  if (previous === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {current === 0 ? 'No views yet' : 'None in the 30 days before'}
      </span>
    )
  }
  const change = Math.round(((current - previous) / previous) * 100)
  const Icon = change >= 0 ? ArrowUpIcon : ArrowDownIcon
  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{change >= 0 ? 'Up' : 'Down'}</span>
      {Math.abs(change)}% vs the 30 days before
    </span>
  )
}
