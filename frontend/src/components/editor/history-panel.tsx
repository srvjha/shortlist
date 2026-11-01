import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookmarkIcon,
  FileInputIcon,
  HistoryIcon,
  PencilIcon,
  RotateCcwIcon,
  SparklesIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { ContentDiff, LineDiff } from '@/components/diff'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys, versionQuery, versionsQuery } from '@/lib/api/queries'
import type { VersionSummary } from '@/lib/api/types'
import { apiUrl } from '@/lib/env'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PdfPages } from './pdf-pages'

const kindLabels: Record<VersionSummary['kind'], string> = {
  manual: 'Autosave',
  named: 'Named version',
  ai: 'AI changes',
  restore: 'Restored',
  import: 'Created',
}

const kindIcons = {
  manual: HistoryIcon,
  named: BookmarkIcon,
  ai: SparklesIcon,
  restore: RotateCcwIcon,
  import: FileInputIcon,
} as const

function VersionPreview({
  resumeId,
  versionId,
}: {
  resumeId: string
  versionId: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let objectUrl: string | null = null
    // Set when the version changes or the panel closes, so a late reply never lands in the UI or leaks.
    let cancelled = false
    setUrl(null)
    setFailed(false)
    fetch(`${apiUrl}/v1/resumes/${resumeId}/pdf?versionId=${versionId}`, {
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('failed')
        objectUrl = URL.createObjectURL(await response.blob())
        if (cancelled) URL.revokeObjectURL(objectUrl)
        else setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [resumeId, versionId])

  if (failed)
    return (
      <p className="text-sm text-muted-foreground">
        This version doesn't compile, so there's no preview.
      </p>
    )
  if (!url) return <Skeleton className="aspect-17/22 w-full" />
  return <PdfPages url={url} />
}

function VersionChanges({
  resumeId,
  version,
  headVersionId,
}: {
  resumeId: string
  version: VersionSummary
  headVersionId: string | null
}) {
  const canCompareCurrent =
    headVersionId !== null && headVersionId !== version.id
  const [against, setAgainst] = useState<'previous' | 'current'>(
    version.parentId ? 'previous' : 'current',
  )
  const baseId = against === 'current' ? headVersionId : version.parentId
  const after = useQuery(versionQuery(resumeId, version.id))
  const before = useQuery({
    ...versionQuery(resumeId, baseId ?? ''),
    enabled: baseId !== null,
  })

  let body: React.ReactNode = <Skeleton className="h-24 w-full" />
  if (after.isError || before.isError)
    body = (
      <p className="text-sm text-muted-foreground">
        Couldn't load the changes.
      </p>
    )
  else if (after.data && before.data) {
    const a = before.data
    const b = after.data
    body =
      a.texSource !== null && b.texSource !== null ? (
        <LineDiff before={a.texSource} after={b.texSource} />
      ) : a.content && b.content ? (
        <ContentDiff before={a.content} after={b.content} />
      ) : (
        <p className="text-sm text-muted-foreground">
          These versions use different editors, so there's no text comparison.
        </p>
      )
  }

  return (
    <div className="flex flex-col gap-3">
      {version.parentId && canCompareCurrent && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Compared with
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={against}
            onValueChange={(v) => v && setAgainst(v as typeof against)}
          >
            <ToggleGroupItem value="previous">Version before</ToggleGroupItem>
            <ToggleGroupItem value="current">Current version</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {against === 'current'
          ? 'Struck text is in your current version. Marked text is what restoring brings back.'
          : 'Struck text was removed in this version. Marked text was added.'}
      </p>
      {body}
    </div>
  )
}

function NameVersionDialog({
  resumeId,
  version,
  onOpenChange,
}: {
  resumeId: string
  version: VersionSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [semver, setSemver] = useState('')
  useEffect(() => {
    setLabel(version?.label ?? '')
    setSemver(version?.semver ?? '')
  }, [version])

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/v1/resumes/{resumeId}/versions/{versionId}', {
          params: { path: { resumeId, versionId: version!.id } },
          body: { label: label.trim() || null, semver: semver.trim() || null },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.versions(resumeId) })
      toast.success('Version named')
      onOpenChange(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Dialog open={version !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name this version</DialogTitle>
          <DialogDescription>
            Give it a name you'll recognise later, like the company you sent it
            to.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="version-label">Name</FieldLabel>
            <Input
              id="version-label"
              placeholder="Sent to Razorpay"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="version-semver">
              Version number (optional)
            </FieldLabel>
            <Input
              id="version-semver"
              inputMode="decimal"
              spellCheck={false}
              placeholder="1.0.0"
              value={semver}
              onChange={(e) => setSemver(e.target.value)}
            />
            <FieldDescription>
              Three numbers separated by dots.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={
              save.isPending ||
              (semver !== '' && !/^\d+\.\d+\.\d+$/.test(semver))
            }
          >
            {save.isPending && <Spinner data-icon="inline-start" />}
            Save name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HistoryPanel({
  open,
  onOpenChange,
  resumeId,
  headVersionId,
  hasUnsavedChanges,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumeId: string
  headVersionId: string | null
  hasUnsavedChanges: boolean
}) {
  const queryClient = useQueryClient()
  const { data: versions, isPending } = useQuery({
    ...versionsQuery(resumeId),
    enabled: open,
  })
  const [namedOnly, setNamedOnly] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [naming, setNaming] = useState<VersionSummary | null>(null)

  const restore = useMutation({
    mutationFn: (fromVersionId: string) =>
      unwrap(
        api.POST('/v1/resumes/{resumeId}/versions', {
          params: { path: { resumeId } },
          body: { kind: 'restore', fromVersionId },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resume(resumeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.versions(resumeId) })
      toast.success(
        'Version restored. Your previous state is still in history.',
      )
      setSelected(null)
      onOpenChange(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const shown = (versions ?? []).filter(
    (v) => !namedOnly || v.label || v.semver,
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>History</SheetTitle>
          <SheetDescription>
            Every change is kept. Restoring adds a new version, so nothing is
            lost.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={!versions?.length}
            onClick={() => versions?.[0] && setNaming(versions[0])}
          >
            <BookmarkIcon data-icon="inline-start" />
            Save checkpoint
          </Button>
          <div className="flex items-center gap-2">
            <label htmlFor="named-only" className="text-muted-foreground">
              Named only
            </label>
            <Switch
              id="named-only"
              checked={namedOnly}
              onCheckedChange={setNamedOnly}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isPending ? (
            <div className="flex flex-col gap-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {namedOnly
                ? 'No named versions yet. Name one to find it quickly later.'
                : 'No versions yet.'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {shown.map((version) => {
                const Icon = kindIcons[version.kind]
                const isCurrent = version.id === headVersionId
                const isSelected = version.id === selected
                return (
                  <li
                    key={version.id}
                    className={cn('border-b', isSelected && 'bg-muted/60')}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(isSelected ? null : version.id)
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      aria-expanded={isSelected}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {version.label ?? kindLabels[version.kind]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(version.createdAt)}
                        </span>
                      </span>
                      {version.semver && (
                        <Badge variant="outline">v{version.semver}</Badge>
                      )}
                      {isCurrent && <Badge variant="secondary">Current</Badge>}
                    </button>
                    {isSelected && (
                      <div className="flex flex-col gap-3 px-4 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {!isCurrent && (
                            <Button
                              size="sm"
                              onClick={() => restore.mutate(version.id)}
                              disabled={restore.isPending || hasUnsavedChanges}
                            >
                              {restore.isPending ? (
                                <Spinner data-icon="inline-start" />
                              ) : (
                                <RotateCcwIcon data-icon="inline-start" />
                              )}
                              Restore this version
                            </Button>
                          )}
                          {!isCurrent && hasUnsavedChanges && (
                            <p className="w-full text-xs text-muted-foreground">
                              Saving your edits... Restore is available once
                              they're saved.
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNaming(version)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            {version.label ? 'Rename' : 'Name it'}
                          </Button>
                        </div>
                        {version.parentId || !isCurrent ? (
                          <Tabs
                            defaultValue={
                              version.parentId ? 'changes' : 'preview'
                            }
                          >
                            <TabsList>
                              <TabsTrigger value="preview">Preview</TabsTrigger>
                              <TabsTrigger value="changes">Changes</TabsTrigger>
                            </TabsList>
                            <TabsContent value="preview">
                              <VersionPreview
                                resumeId={resumeId}
                                versionId={version.id}
                              />
                            </TabsContent>
                            <TabsContent value="changes">
                              <VersionChanges
                                resumeId={resumeId}
                                version={version}
                                headVersionId={headVersionId}
                              />
                            </TabsContent>
                          </Tabs>
                        ) : (
                          <VersionPreview
                            resumeId={resumeId}
                            versionId={version.id}
                          />
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <NameVersionDialog
          resumeId={resumeId}
          version={naming}
          onOpenChange={(value) => !value && setNaming(null)}
        />
      </SheetContent>
    </Sheet>
  )
}
