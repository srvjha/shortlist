import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BriefcaseBusinessIcon,
  ExternalLinkIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { NewJobForm } from '@/components/ai/ai-panel'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
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
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage, expectOk } from '@/lib/api/client'
import { jobQuery, jobsQuery, queryKeys, resumesQuery } from '@/lib/api/queries'
import { timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/jobs')({
  head: () => ({ meta: [{ title: `Jobs | ${site.name}` }] }),
  loader: ({ context }) => context.queryClient.prefetchQuery(jobsQuery),
  component: JobsPage,
})

function jobTitle(job: { role: string | null; company: string | null }) {
  return [job.role, job.company].filter(Boolean).join(' at ') || 'Untitled job'
}

function RequirementGroup({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function JobDetail({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: job } = useQuery(jobQuery(jobId))
  const { data: resumes } = useQuery(resumesQuery())
  const [resumeId, setResumeId] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const remove = useMutation({
    mutationFn: () =>
      expectOk(api.DELETE('/v1/jobs/{jobId}', { params: { path: { jobId } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs })
      toast.success('Job deleted')
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (!job) return <Skeleton className="m-4 h-60" />
  const parsed = job.parsed

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Tailor a resume to this job</p>
        {resumes && resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a resume first, then come back to tailor it.
          </p>
        ) : (
          <div className="flex gap-2">
            <Select value={resumeId} onValueChange={setResumeId}>
              <SelectTrigger className="flex-1" aria-label="Resume">
                <SelectValue placeholder="Choose a resume" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {resumes?.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              disabled={!resumeId}
              onClick={() =>
                resumeId &&
                navigate({
                  to: '/resumes/$resumeId',
                  params: { resumeId },
                  search: { tailor: job.id },
                })
              }
            >
              <SparklesIcon data-icon="inline-start" />
              Tailor
            </Button>
          </div>
        )}
      </div>

      {parsed && (
        <>
          <RequirementGroup title="Must have" items={parsed.mustHave} />
          <RequirementGroup title="Nice to have" items={parsed.niceToHave} />
          <RequirementGroup title="Keywords" items={parsed.keywords} />
          {parsed.responsibilities.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-sans text-sm font-medium">What you'd do</h3>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">
                {parsed.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this job?"
        description="Resumes you tailored to it stay as they are."
        confirmLabel="Delete job"
        destructive
        onConfirm={() => remove.mutate()}
      />

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Original job description
        </summary>
        <p className="mt-3 break-words whitespace-pre-wrap text-muted-foreground">
          {job.rawText}
        </p>
      </details>

      <div className="flex flex-wrap gap-2">
        {job.sourceUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={job.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              Open job post
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete job
        </Button>
      </div>
    </div>
  )
}

function JobsPage() {
  const { data: jobs, isPending } = useQuery(jobsQuery)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const selectedJob = jobs?.find((job) => job.id === selected)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8 sm:px-8">
      <PageHeader
        title="Jobs"
        description="Job posts you are applying to. Each one keeps the requirements pulled from the post, ready for tailoring."
        actions={
          <Button onClick={() => setAdding(true)}>
            <PlusIcon data-icon="inline-start" />
            Add job
          </Button>
        }
      />

      {isPending ? (
        <Skeleton className="h-40" />
      ) : jobs && jobs.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => setSelected(job.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <BriefcaseBusinessIcon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{jobTitle(job)}</span>
                  <span className="text-sm text-muted-foreground">
                    Added {timeAgo(job.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseBusinessIcon />
            </EmptyMedia>
            <EmptyTitle>No jobs yet</EmptyTitle>
            <EmptyDescription>
              Add a job post to see the skills it asks for.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon data-icon="inline-start" />
              Add job
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a job</DialogTitle>
            <DialogDescription>
              Paste the description or a link to the job post.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel className="sr-only">Job</FieldLabel>
            <NewJobForm
              onCreated={(id) => {
                setAdding(false)
                setSelected(id)
              }}
            />
          </Field>
        </DialogContent>
      </Dialog>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto overscroll-contain sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>
              {selectedJob ? jobTitle(selectedJob) : 'Job'}
            </SheetTitle>
            <SheetDescription>What this role asks for.</SheetDescription>
          </SheetHeader>
          {selected && (
            <JobDetail jobId={selected} onClose={() => setSelected(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
