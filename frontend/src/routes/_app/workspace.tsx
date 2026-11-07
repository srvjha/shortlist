import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PlusIcon, UserRoundIcon } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/app/page-header'
import {
  BlankSheet,
  ImportSheet,
  LatexSheet,
  ResumeSheet,
} from '@/components/app/paper-sheets'
import { ResumeActions } from '@/components/app/resume-actions'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { profileQuery, resumesQuery, usageQuery } from '@/lib/api/queries'
import { timeAgo } from '@/lib/format'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'

export const Route = createFileRoute('/_app/workspace')({
  head: () => ({ meta: [{ title: `Workspace | ${site.name}` }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(resumesQuery(false)),
      context.queryClient.prefetchQuery(usageQuery),
      context.queryClient.prefetchQuery(profileQuery),
    ]),
  component: WorkspacePage,
})

const startOptions = [
  {
    source: 'upload',
    sheet: ImportSheet,
    title: 'Import a resume',
    body: 'Upload a PDF or text file and we fill in the form for you.',
  },
  {
    source: 'tex',
    sheet: LatexSheet,
    title: 'Paste LaTeX',
    body: 'Bring your Overleaf .tex file. It compiles as it is.',
  },
  {
    source: 'blank',
    sheet: BlankSheet,
    title: 'Start blank',
    body: 'Fill in a simple form. The layout takes care of itself.',
  },
] as const

function templateName(id: string | null) {
  return templateCatalog.find((t) => t.id === id)?.name
}

function WorkspacePage() {
  const [view, setView] = useState<'active' | 'archived'>('active')
  const resumes = useQuery(resumesQuery(view === 'archived'))
  // Loads the other list too, so switching between Active and Archived shows it at once.
  useQuery(resumesQuery(view !== 'archived'))
  const { data: usage } = useQuery(usageQuery)
  const { data: profile } = useQuery(profileQuery)
  const profileEmpty = profile && !profile.updatedAt

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8">
      <PageHeader
        title="Workspace"
        description={
          usage &&
          `${usage.resumes.used} ${usage.resumes.used === 1 ? 'resume' : 'resumes'}. ${
            usage.ownAiKey
              ? 'AI runs on your own key.'
              : `${Math.max(0, usage.tailor.limit - usage.tailor.used)} of ${usage.tailor.limit} AI-tailored resumes left${usage.plan === 'free' ? '' : ' this month'}.`
          }`
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

      {profileEmpty && (
        <Alert>
          <UserRoundIcon />
          <AlertTitle>Add your details once, reuse them everywhere</AlertTitle>
          <AlertDescription>
            Your profile holds every job, project and skill. Tailoring picks
            from it, and never adds anything that isn't there.
          </AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" asChild>
              <Link to="/profile">Fill in profile</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {(view === 'archived' || !!resumes.data?.length) && (
        <div className="flex items-center justify-between gap-4 border-b pb-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(value) => value && setView(value as typeof view)}
            aria-label="Show resumes"
          >
            <ToggleGroupItem value="active">Active</ToggleGroupItem>
            <ToggleGroupItem value="archived">Archived</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {resumes.isPending ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-17/13 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : resumes.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load your resumes</AlertTitle>
          <AlertDescription>
            Check your connection, then try again.
          </AlertDescription>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resumes.refetch()}
            >
              Try again
            </Button>
          </AlertAction>
        </Alert>
      ) : resumes.data.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {resumes.data.map((resume) => (
            <li key={resume.id} className="group relative flex flex-col gap-3">
              <ResumeSheet title={resume.title} tailored={!!resume.jobId} />
              <div className="flex items-start gap-1">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    to="/resumes/$resumeId"
                    params={{ resumeId: resume.id }}
                    className="truncate font-medium after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background"
                  >
                    {resume.title}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {resume.mode === 'code'
                      ? 'LaTeX'
                      : (templateName(resume.templateId) ?? 'Form')}
                    , edited {timeAgo(resume.updatedAt)}
                  </p>
                </div>
                <div className="relative z-10 -mr-2">
                  <ResumeActions resume={resume} />
                </div>
              </div>
            </li>
          ))}
          {view === 'active' && (
            <li className="group relative flex flex-col gap-3">
              <div className="flex aspect-17/13 w-full items-center justify-center rounded-[3px] border border-dashed border-foreground/20 text-muted-foreground transition-colors group-hover:border-primary/60 group-hover:text-primary">
                <PlusIcon className="size-6" />
              </div>
              <Link
                to="/resumes/new"
                className="font-medium after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background"
              >
                New resume
              </Link>
            </li>
          )}
        </ul>
      ) : view === 'archived' ? (
        <p className="py-16 text-center text-muted-foreground">
          Nothing archived. Resumes you archive from their menu move here.
        </p>
      ) : (
        <section aria-labelledby="start" className="flex flex-col gap-8 pt-2">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 id="start" className="text-2xl font-semibold tracking-tight">
              Start your first resume
            </h2>
            <p className="text-muted-foreground">
              Begin with what you already have. Once it's in, you can tailor a
              copy to any job.
            </p>
          </div>
          <ul className="grid max-w-4xl gap-x-6 gap-y-8 sm:grid-cols-3">
            {startOptions.map((option) => (
              <li
                key={option.source}
                className="group relative flex flex-col gap-3"
              >
                <option.sheet />
                <div className="flex flex-col gap-0.5">
                  <Link
                    to="/resumes/new"
                    search={{ source: option.source }}
                    className="font-medium after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background"
                  >
                    {option.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{option.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
