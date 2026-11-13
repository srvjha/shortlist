import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon, FileTextIcon } from 'lucide-react'
import { AtsChecker } from '@/components/ats/ats-checker'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resumesQuery } from '@/lib/api/queries'
import { timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/ats')({
  head: () => ({ meta: [{ title: `Check your ATS score | ${site.name}` }] }),
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(resumesQuery(false)),
  component: AtsPage,
})

function AtsPage() {
  const resumes = useQuery(resumesQuery(false))
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? resumes.data : resumes.data?.slice(0, 3)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-8 sm:px-8">
      <PageHeader
        title="Check your ATS score"
        description="See how an applicant tracking system and a recruiter's quick scan read your resume, with concrete fixes."
      />

      {(resumes.isPending || !!resumes.data?.length) && (
        <section aria-labelledby="ats-yours" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="ats-yours" className="font-sans text-lg font-semibold">
              One of your resumes
            </h2>
            <p className="text-sm text-muted-foreground">
              Opens it with the report ready, so you can fix what it finds with
              AI.
            </p>
          </div>
          {resumes.isPending ? (
            <Skeleton className="h-32" />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {shown?.map((resume) => (
                <li key={resume.id}>
                  <Link
                    to="/resumes/$resumeId"
                    params={{ resumeId: resume.id }}
                    search={{ ats: true }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <FileTextIcon
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {resume.title}
                    </span>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      edited {timeAgo(resume.updatedAt)}
                    </span>
                    <ChevronRightIcon
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!showAll && (resumes.data?.length ?? 0) > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setShowAll(true)}
            >
              Show all {resumes.data?.length} resumes
            </Button>
          )}
        </section>
      )}

      <section aria-labelledby="ats-upload" className="flex flex-col gap-1">
        <h2 id="ats-upload" className="font-sans text-lg font-semibold">
          Or upload a PDF
        </h2>
        <p className="text-sm text-muted-foreground">
          A resume made anywhere else. It is checked and not stored.
        </p>
        <div className="-mt-6">
          <AtsChecker />
        </div>
      </section>
    </div>
  )
}
