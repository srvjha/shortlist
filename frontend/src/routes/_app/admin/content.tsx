import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  EmptyNote,
  QueryView,
  Section,
  Stat,
  StatGrid,
  templateName,
} from '@/components/admin/admin-ui'
import { BreakdownList } from '@/components/analytics/breakdown-list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminContentQuery } from '@/lib/api/queries'
import type { AdminContent } from '@/lib/api/types'
import { formatBytes, formatNumber, percent } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/admin/content')({
  head: () => ({ meta: [{ title: `Content · Admin | ${site.name}` }] }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminContentQuery(deps.days)),
  component: ContentPage,
})

function ContentPage() {
  const { days = 30 } = Route.useSearch()
  const content = useQuery(adminContentQuery(days))
  return (
    <QueryView query={content}>
      {(data) => <ContentReport data={data} />}
    </QueryView>
  )
}

const versionLabels: Record<string, string> = {
  manual: 'Own edits',
  ai: 'Accepted AI changes',
  import: 'Imports',
  restore: 'Restores',
  named: 'Named checkpoints',
}

function ContentReport({ data }: { data: AdminContent }) {
  const { resumes, sharing, uploads } = data

  return (
    <div className="flex flex-col gap-10">
      <StatGrid>
        <Stat
          label="Live resumes"
          value={formatNumber(resumes.live)}
          hint={`${formatNumber(resumes.archived)} archived, ${formatNumber(resumes.deleted)} in the bin`}
        />
        <Stat
          label="Tailored to a job"
          value={formatNumber(resumes.tailored)}
          hint={`${percent(resumes.tailored, resumes.total)} of all resumes`}
        />
        <Stat
          label="Share links"
          value={formatNumber(sharing.links)}
          hint={`${formatNumber(sharing.views)} views all time`}
        />
        <Stat
          label="Uploads"
          value={formatNumber(uploads.files)}
          hint={`${formatBytes(uploads.bytes)} stored`}
        />
      </StatGrid>

      <div className="grid gap-10 md:grid-cols-3">
        <BreakdownList
          title="Templates in use"
          color="var(--viz-3)"
          rows={data.byTemplate.map((row) => ({
            label: templateName(row.label),
            views: row.count,
          }))}
          empty="No resumes yet"
        />
        <BreakdownList
          title="Editor"
          color="var(--viz-1)"
          rows={[
            { label: 'Form editor', views: resumes.structured },
            { label: 'LaTeX editor', views: resumes.code },
          ].filter((row) => row.views > 0)}
          empty="No resumes yet"
        />
        <BreakdownList
          title={`Saved versions, last ${data.days} days`}
          color="var(--viz-5)"
          rows={data.versionKinds.map((row) => ({
            label: versionLabels[row.label] ?? row.label,
            views: row.count,
          }))}
          empty="No edits in this period"
        />
      </div>

      <div className="grid gap-10 md:grid-cols-3">
        <BreakdownList
          title="Uploaded files"
          color="var(--viz-4)"
          rows={[
            { label: 'PDF', views: uploads.pdf },
            { label: 'LaTeX', views: uploads.tex },
            { label: 'Pasted text', views: uploads.text },
          ].filter((row) => row.views > 0)}
          empty="No uploads yet"
        />
        <BreakdownList
          title="Share link settings"
          color="var(--viz-2)"
          rows={[
            { label: 'Listed on profile', views: sharing.listed },
            { label: 'Password protected', views: sharing.protected },
            { label: 'Plain link', views: sharing.plain },
          ].filter((row) => row.views > 0)}
          empty="No share links yet"
        />
        <dl className="flex flex-col gap-4 text-sm">
          <h2 className="font-sans text-base font-semibold">Also saved</h2>
          <div className="flex justify-between gap-3 border-b pb-3">
            <dt>Custom templates</dt>
            <dd className="tabular-nums">
              {formatNumber(data.customTemplates)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b pb-3">
            <dt>Job posts</dt>
            <dd className="tabular-nums">{formatNumber(data.jobs)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Job posts added from a URL</dt>
            <dd className="tabular-nums">{formatNumber(data.jobsFromUrl)}</dd>
          </div>
        </dl>
      </div>

      <Section
        title="Most viewed share links"
        description={`Views in the last ${data.days} days.`}
      >
        {data.topLinks.length === 0 ? (
          <EmptyNote>No share links yet.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resume</TableHead>
                  <TableHead className="text-right">
                    Last {data.days} days
                  </TableHead>
                  <TableHead className="text-right">All time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="max-w-80">
                      <a
                        href={`/${link.username}/${link.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:underline"
                      >
                        {link.resumeTitle}
                      </a>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {site.displayDomain}/{link.username}/{link.slug}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(link.views)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatNumber(link.totalViews)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  )
}
