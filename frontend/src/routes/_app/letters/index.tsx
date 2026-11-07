import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { FileSignatureIcon, MailIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { JobPicker } from '@/components/ai/ai-panel'
import { PageHeader } from '@/components/app/page-header'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useWriteCoverLetter } from '@/hooks/use-write-cover-letter'
import { lettersQuery, resumesQuery } from '@/lib/api/queries'
import { timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/letters/')({
  head: () => ({ meta: [{ title: `Letters | ${site.name}` }] }),
  loader: ({ context }) => context.queryClient.prefetchQuery(lettersQuery),
  component: LettersPage,
})

function NewCoverLetter({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: resumes } = useQuery({ ...resumesQuery(), enabled: open })
  const [resumeId, setResumeId] = useState<string>()
  const [jobId, setJobId] = useState<string | null>(null)
  const write = useWriteCoverLetter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write a cover letter</DialogTitle>
          <DialogDescription>
            It uses only what's in the resume and your profile, and flags
            anything it can't back up.
          </DialogDescription>
        </DialogHeader>
        {resumes && resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a resume first, then come back to write a letter.
          </p>
        ) : (
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="letter-resume">Resume</FieldLabel>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger id="letter-resume" className="min-h-11 w-full">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="letter-job">Job</FieldLabel>
              <JobPicker id="letter-job" value={jobId} onChange={setJobId} />
            </Field>
            <Button
              className="min-h-11"
              disabled={!resumeId || !jobId || write.isPending}
              onClick={() =>
                resumeId && jobId && write.mutate({ resumeId, jobId })
              }
            >
              <SparklesIcon data-icon="inline-start" />
              {write.isPending ? 'Writing your letter…' : 'Write the letter'}
            </Button>
          </FieldGroup>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LettersPage() {
  const { data: letters, isPending } = useQuery(lettersQuery)
  const [writing, setWriting] = useState(false)

  const actions = (
    <>
      <Button onClick={() => setWriting(true)}>
        <SparklesIcon data-icon="inline-start" />
        Cover letter
      </Button>
      <Button variant="outline" asChild>
        <Link to="/letters/new-resignation">
          <FileSignatureIcon data-icon="inline-start" />
          Resignation letter
        </Link>
      </Button>
    </>
  )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8 sm:px-8">
      <PageHeader
        title="Letters"
        description="Cover and resignation letters are free on every plan, and their PDFs don't count toward any limit."
        actions={actions}
      />

      {isPending ? (
        <Skeleton className="h-40" />
      ) : letters && letters.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {letters.map((letter) => (
            <li key={letter.id}>
              <Link
                to="/letters/$letterId"
                params={{ letterId: letter.id }}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {letter.kind === 'cover' ? (
                    <MailIcon className="size-5" aria-hidden="true" />
                  ) : (
                    <FileSignatureIcon className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{letter.title}</span>
                  <span className="text-sm text-muted-foreground">
                    Edited {timeAgo(letter.updatedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailIcon />
            </EmptyMedia>
            <EmptyTitle>No letters yet</EmptyTitle>
            <EmptyDescription>
              Write a cover letter from a resume and a job, or a resignation
              letter from a few details.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">{actions}</div>
          </EmptyContent>
        </Empty>
      )}

      <NewCoverLetter open={writing} onOpenChange={setWriting} />
    </div>
  )
}
