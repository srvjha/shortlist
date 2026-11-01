import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  HistoryIcon,
  Maximize2Icon,
  Share2Icon,
  SparklesIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDefaultLayout, useGroupRef } from 'react-resizable-panels'
import { toast } from '@/lib/toast'
import { z } from 'zod'
import { AiPanel } from '@/components/ai/ai-panel'
import type { AiPanelMode } from '@/components/ai/ai-panel'
import { ContentEditor } from '@/components/editor/content-editor'
import { DownloadMenu } from '@/components/editor/download-menu'
import { LayoutMenu } from '@/components/editor/layout-menu'
import { HistoryPanel } from '@/components/editor/history-panel'
import { SharePanel } from '@/components/editor/share-panel'
import { UnsavedChangesGuard } from '@/components/app/unsaved-changes-guard'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import {
  TemplatePicker,
  layoutOptions,
} from '@/components/templates/template-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SaveTemplateDialog } from '@/components/templates/save-template-dialog'
import { LatexEditor } from '@/components/editor/latex-editor'
import type { LatexEditorHandle } from '@/components/editor/latex-editor'
import { PdfPreview } from '@/components/editor/pdf-preview'
import type { SaveState } from '@/components/editor/save-status'
import { SaveStatus } from '@/components/editor/save-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCollapsedSidebar } from '@/hooks/use-collapsed-sidebar'
import { useDebouncedEffect } from '@/hooks/use-debounced-effect'
import { useMediaQuery } from '@/hooks/use-media-query'
import { usePdfPreview } from '@/hooks/use-pdf-preview'
import { ApiError, api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys, resumeQuery } from '@/lib/api/queries'
import type { ResumeContent, ResumeDetail, Suggestion } from '@/lib/api/types'
import { panelStorage } from '@/lib/panel-storage'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

const focusKey = 'resume-editor-focus'
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.userAgent)

export const Route = createFileRoute('/_app/resumes/$resumeId')({
  validateSearch: z.object({
    tailor: z.string().optional(),
    created: z.boolean().optional(),
    ats: z.boolean().optional(),
  }),
  head: () => ({ meta: [{ title: `Editor | ${site.name}` }] }),
  component: EditorRoute,
})

function EditorRoute() {
  const { resumeId } = Route.useParams()
  const { data: resume, isPending, error } = useQuery(resumeQuery(resumeId))
  const { tailor, ats } = Route.useSearch()
  // Lives above the editor so the AI panel stays open when applied changes remount it.
  const [aiOpen, setAiOpen] = useState(Boolean(tailor || ats))
  // Autosaves move the head too, so only a head this editor didn't save (restore, AI changes) remounts it.
  const [ownHeads] = useState(() => new Set<string>())
  const [editorKey, setEditorKey] = useState<string | null>(null)
  const head = resume?.headVersionId ?? null
  if (head && head !== editorKey && !ownHeads.has(head)) setEditorKey(head)

  if (isPending) {
    return (
      <div className="grid h-svh gap-4 p-6 lg:grid-cols-2">
        <Skeleton className="h-full" />
        <Skeleton className="h-full" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">{errorMessage(error)}</p>
        <Button variant="outline" asChild>
          <Link to="/workspace">Back to resumes</Link>
        </Button>
      </div>
    )
  }
  return (
    <ResumeEditor
      key={editorKey ?? resume.id}
      resume={resume}
      aiOpen={aiOpen}
      onAiOpenChange={setAiOpen}
      onSaved={(versionId) => ownHeads.add(versionId)}
    />
  )
}

function ResumeEditor({
  resume,
  aiOpen,
  onAiOpenChange,
  onSaved,
}: {
  resume: ResumeDetail
  aiOpen: boolean
  onAiOpenChange: (open: boolean) => void
  onSaved: (versionId: string) => void
}) {
  useCollapsedSidebar()
  const docked = useMediaQuery('(min-width: 1280px)')
  const wide = useMediaQuery('(min-width: 1024px)')
  const showAi = docked && aiOpen
  // Panel widths are remembered per browser, separately with and without the AI panel.
  const layout = useDefaultLayout({
    id: 'resume-editor',
    panelIds: showAi ? ['edit', 'preview', 'ai'] : ['edit', 'preview'],
    storage: panelStorage,
    // Keeps focus mode's collapsed panels out of the saved sizes.
    onlySaveAfterUserInteractions: true,
  })
  // Focus mode collapses the preview and AI panels instead of unmounting them, then puts back the sizes from before.
  const [focus, setFocus] = useState(
    () => panelStorage.getItem(focusKey) === '1',
  )
  const groupRef = useGroupRef()
  const beforeFocus = useRef<Record<string, number>>(undefined)
  useEffect(() => {
    panelStorage.setItem(focusKey, focus ? '1' : '0')
    const group = groupRef.current
    if (!group) return
    const current = group.getLayout()
    const ids = Object.keys(current)
    if (focus) {
      if (current.preview) beforeFocus.current = current
      group.setLayout(
        Object.fromEntries(ids.map((id) => [id, id === 'edit' ? 100 : 0])),
      )
    } else if (!current.preview) {
      const saved = beforeFocus.current
      const same = saved && ids.every((id) => id in saved)
      group.setLayout(
        same
          ? saved
          : Object.fromEntries(
              ids.map((id) => [id, id === 'edit' ? 50 : 50 / (ids.length - 1)]),
            ),
      )
    }
  }, [focus, wide, groupRef])
  useEffect(() => {
    if (!wide) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '.' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setFocus((on) => !on)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [wide])
  const queryClient = useQueryClient()
  const structured = resume.mode === 'structured'
  const [content, setContent] = useState<ResumeContent | null>(
    resume.head?.content ?? null,
  )
  const [texSource, setTexSource] = useState(resume.head?.texSource ?? '')
  const [title, setTitle] = useState(resume.title)
  const [templateId, setTemplateId] = useState(resume.templateId ?? 'developer')
  const [layoutSettings, setLayoutSettings] = useState(resume.layout)
  const [pageLimit, setPageLimit] = useState(resume.pageLimit)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [pane, setPane] = useState<'edit' | 'preview'>('edit')
  const { tailor, created, ats } = Route.useSearch()
  const navigate = useNavigate()
  // A resume made in this visit offers "save as template" on the way out, once it has edits.
  const [editedSinceCreate, setEditedSinceCreate] = useState(false)
  const [offerTemplate, setOfferTemplate] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Autosaves add versions without remounting the editor, so track the latest one here.
  const [headVersionId, setHeadVersionId] = useState(resume.headVersionId)
  const [shareOpen, setShareOpen] = useState(false)
  const [aiMode, setAiMode] = useState<AiPanelMode>('tailor')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const openAi = (mode: AiPanelMode) => {
    setAiMode(mode)
    if (docked) setFocus(false)
    onAiOpenChange(true)
  }
  const latexEditor = useRef<LatexEditorHandle>(null)
  const lastSaved = useRef(
    JSON.stringify(structured ? resume.head?.content : resume.head?.texSource),
  )

  const preview = usePdfPreview(
    structured
      ? content
        ? { content, templateId, layout: layoutSettings }
        : null
      : { texSource },
  )

  // A save made on a head that another tab or a restore has since moved comes back as a conflict.
  const [conflict, setConflict] = useState(false)
  const overwrite = useRef(false)
  const loadLatest = useRef(false)

  const save = useMutation({
    mutationFn: (payload: string) => {
      const baseVersionId = overwrite.current
        ? undefined
        : (headVersionId ?? undefined)
      overwrite.current = false
      return unwrap(
        api.POST('/v1/resumes/{resumeId}/versions', {
          params: { path: { resumeId: resume.id } },
          body: structured
            ? {
                kind: 'manual',
                baseVersionId,
                content: JSON.parse(payload) as ResumeContent,
              }
            : {
                kind: 'manual',
                baseVersionId,
                texSource: JSON.parse(payload) as string,
              },
        }),
      )
    },
    onMutate: () => setSaveState('saving'),
    onSuccess: (version, payload) => {
      lastSaved.current = payload
      if (created) setEditedSinceCreate(true)
      onSaved(version.id)
      setHeadVersionId(version.id)
      setSaveState((state) => (state === 'saving' ? 'saved' : state))
      // Keep the cached head in sync without remounting the editor.
      queryClient.setQueryData(
        queryKeys.resume(resume.id),
        (old: ResumeDetail | undefined) =>
          old ? { ...old, headVersionId: version.id, head: version } : old,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.versions(resume.id) })
    },
    onError: (error) => {
      setSaveState('error')
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT')
        setConflict(true)
    },
  })

  const draft = JSON.stringify(structured ? content : texSource)
  useEffect(() => {
    if (draft !== lastSaved.current) setSaveState('unsaved')
  }, [draft])
  // Re-armed when a save settles, so edits made while it was in flight still save; a draft that just failed waits for the next edit.
  useDebouncedEffect(
    () => {
      const failed = save.isError && save.variables === draft
      if (
        draft !== lastSaved.current &&
        !save.isPending &&
        !failed &&
        !conflict
      )
        save.mutate(draft)
    },
    [draft, save.isPending],
    1500,
  )

  // Closing the dialog any other way keeps this tab's version; the replaced one stays in History.
  function resolveConflict(open: boolean) {
    if (open) return
    setConflict(false)
    if (loadLatest.current) {
      loadLatest.current = false
      // The other head isn't one this editor saved, so the refetch remounts the editor on it.
      queryClient.invalidateQueries({ queryKey: queryKeys.resume(resume.id) })
    } else {
      overwrite.current = true
      save.mutate(draft)
    }
  }

  const update = useMutation({
    mutationFn: (body: {
      title?: string
      templateId?: string
      layout?: ResumeDetail['layout']
      pageLimit?: number
    }) =>
      unwrap(
        api.PATCH('/v1/resumes/{resumeId}', {
          params: { path: { resumeId: resume.id } },
          body,
        }),
      ),
    onSuccess: (_resume, body) => {
      // The editor compares against this cached resume, e.g. renaming back to the old title.
      queryClient.setQueryData(
        queryKeys.resume(resume.id),
        (old: ResumeDetail | undefined) => (old ? { ...old, ...body } : old),
      )
      return queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const [confirmToForm, setConfirmToForm] = useState(false)
  const [pickingTemplate, setPickingTemplate] = useState(false)
  // The new head comes back from the server, which remounts the editor in the other mode.
  const switchMode = useMutation({
    mutationFn: (mode: ResumeDetail['mode']) =>
      unwrap(
        api.PATCH('/v1/resumes/{resumeId}', {
          params: { path: { resumeId: resume.id } },
          body: { mode },
        }),
      ),
    onSuccess: (_, mode) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.resume(resume.id),
      })
      void queryClient.invalidateQueries({ queryKey: ['resumes'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
      toast.success(
        mode === 'code'
          ? 'Switched to LaTeX. You can switch back anytime.'
          : 'Switched to the form editor.',
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const editorPane =
    structured && content ? (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <ContentEditor value={content} onChange={setContent} />
      </div>
    ) : (
      <LatexEditor
        ref={latexEditor}
        value={texSource}
        onChange={setTexSource}
        errors={preview.errors}
      />
    )
  const currentTemplate = templateCatalog.find((t) => t.id === templateId)
  const roomier =
    layoutSettings.spacing === 'compact'
      ? ('normal' as const)
      : ('relaxed' as const)
  const previewPane = (
    <PdfPreview
      {...preview}
      pageLimit={pageLimit}
      fixes={{
        removeSpace:
          structured && content && hasAddedSpace(content)
            ? () => setContent(withoutAddedSpace(content))
            : undefined,
        compact:
          structured && layoutSettings.spacing !== 'compact'
            ? () => {
                const next = { ...layoutSettings, spacing: 'compact' as const }
                setLayoutSettings(next)
                update.mutate({ layout: next })
              }
            : undefined,
        spread:
          structured && layoutSettings.spacing !== 'relaxed'
            ? {
                label: roomier,
                apply: () => {
                  const next = { ...layoutSettings, spacing: roomier }
                  setLayoutSettings(next)
                  update.mutate({ layout: next })
                },
              }
            : undefined,
        allowPages: (pages) => {
          setPageLimit(pages)
          update.mutate({ pageLimit: pages })
        },
      }}
      onErrorClick={
        structured ? undefined : (line) => latexEditor.current?.goToLine(line)
      }
      onFix={structured ? undefined : () => openAi('fix')}
    />
  )
  const aiPanel = (
    <AiPanel
      open={aiOpen}
      onOpenChange={onAiOpenChange}
      docked={docked}
      mode={aiMode}
      resumeId={resume.id}
      initialJobId={tailor ?? resume.jobId}
      content={content}
      texSource={structured ? null : texSource}
      hasUnsavedChanges={saveState !== 'saved'}
      suggestion={suggestion}
      setSuggestion={setSuggestion}
      checkAtsOnOpen={Boolean(ats)}
    />
  )

  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to="/workspace"
            aria-label="Back to resumes"
            onClick={(event) => {
              if (editedSinceCreate && saveState === 'saved') {
                event.preventDefault()
                setOfferTemplate(true)
              }
            }}
          >
            <ArrowLeftIcon />
          </Link>
        </Button>
        <Input
          aria-label="Resume name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            const next = title.trim()
            if (!next) setTitle(resume.title)
            else if (next !== resume.title) update.mutate({ title: next })
          }}
          className="h-9 max-w-xs border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus-visible:border-input"
        />
        <div className="hidden sm:block">
          <SaveStatus state={saveState} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-label="Editor"
            className="hidden md:flex"
            value={resume.mode}
            disabled={switchMode.isPending || saveState !== 'saved'}
            onValueChange={(mode) => {
              if (mode === 'code') switchMode.mutate('code')
              else if (mode === 'structured') setConfirmToForm(true)
            }}
          >
            <ToggleGroupItem value="structured">
              {switchMode.isPending && !structured && (
                <Spinner data-icon="inline-start" />
              )}
              Form
            </ToggleGroupItem>
            <ToggleGroupItem value="code">
              {switchMode.isPending && structured && (
                <Spinner data-icon="inline-start" />
              )}
              LaTeX
            </ToggleGroupItem>
          </ToggleGroup>
          {structured && (
            <Popover open={pickingTemplate} onOpenChange={setPickingTemplate}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-label={`Template: ${currentTemplate?.name ?? ''}`}
                  className="hidden w-40 justify-between md:flex"
                >
                  <span className="truncate">{currentTemplate?.name}</span>
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="@container max-h-[min(40rem,80svh)] w-[min(52rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain"
              >
                <TemplatePicker
                  value={templateId}
                  onChange={(value) => {
                    setTemplateId(value)
                    update.mutate({ templateId: value })
                    setPickingTemplate(false)
                  }}
                  description="Your content stays the same; only the look changes."
                  options={layoutOptions()}
                  previews={false}
                />
              </PopoverContent>
            </Popover>
          )}
          {structured && (
            <LayoutMenu
              value={layoutSettings}
              templateFontSize={currentTemplate?.fontSize ?? 10}
              onChange={(next) => {
                setLayoutSettings(next)
                update.mutate({ layout: next })
              }}
            />
          )}
          {wide && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Focus mode"
                  aria-pressed={focus}
                  onClick={() => setFocus((on) => !on)}
                  className="aria-pressed:bg-muted"
                >
                  <Maximize2Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Focus mode
                <Kbd>{isMac ? '⌘' : 'Ctrl'} .</Kbd>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="History"
                onClick={() => setHistoryOpen(true)}
              >
                <HistoryIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Every save is kept. Compare or restore older versions.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                aria-label="Share"
                onClick={() => setShareOpen(true)}
              >
                <Share2Icon data-icon="inline-start" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Get a public link to this resume</TooltipContent>
          </Tooltip>
          <DownloadMenu
            resumeId={resume.id}
            title={title}
            structured={structured}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Improve with AI"
                aria-pressed={docked ? aiOpen : undefined}
                onClick={() =>
                  docked && aiOpen ? onAiOpenChange(false) : openAi('tailor')
                }
              >
                <SparklesIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Improve with AI</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Tailor it to a job or polish your bullets. Nothing changes until
              you apply it.
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex shrink-0 justify-center border-b py-2 lg:hidden">
        <Tabs
          value={pane}
          onValueChange={(value) => setPane(value as typeof pane)}
        >
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {wide ? (
        <ResizablePanelGroup
          id="resume-editor"
          groupRef={groupRef}
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
          className="min-h-0 flex-1"
        >
          <ResizablePanel
            id="edit"
            minSize={320}
            // relative: the form's screen-reader-only labels are absolutely positioned and would otherwise
            // hang below the window and make the whole page scroll.
            className="relative overflow-y-auto overscroll-contain"
          >
            {editorPane}
          </ResizablePanel>
          <ResizableHandle withHandle disabled={focus} />
          <ResizablePanel id="preview" minSize={320} collapsible>
            {previewPane}
          </ResizablePanel>
          {showAi && (
            <>
              <ResizableHandle withHandle disabled={focus} />
              <ResizablePanel
                id="ai"
                defaultSize={380}
                minSize={320}
                maxSize={640}
                collapsible
              >
                {aiPanel}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1">
          <div
            className={cn(
              'relative h-full overflow-y-auto overscroll-contain',
              pane === 'preview' && 'hidden',
            )}
          >
            {editorPane}
          </div>
          <div className={cn('h-full', pane === 'edit' && 'hidden')}>
            {previewPane}
          </div>
        </div>
      )}
      {!showAi && aiPanel}
      <UnsavedChangesGuard when={saveState !== 'saved'} />
      <SaveTemplateDialog
        open={offerTemplate}
        onOpenChange={setOfferTemplate}
        resumeId={resume.id}
        defaultName={title}
        title="Also save it as a template?"
        description="Your resume is saved. Keep a copy as a template to start future resumes from it."
        cancelLabel="Not now"
        onDone={() => navigate({ to: '/workspace' })}
      />
      <HistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        resumeId={resume.id}
        headVersionId={headVersionId}
        hasUnsavedChanges={saveState !== 'saved'}
      />
      <ConfirmDialog
        open={conflict}
        onOpenChange={resolveConflict}
        title="This resume changed in another tab"
        description="It was saved or restored somewhere else after you opened it here. Load the latest version and lose the unsaved edits in this tab, or keep this tab's version. Whichever you replace stays in History."
        confirmLabel="Load latest"
        cancelLabel="Keep this tab's version"
        destructive
        onConfirm={() => (loadLatest.current = true)}
      />
      <ConfirmDialog
        open={confirmToForm}
        onOpenChange={setConfirmToForm}
        title="Switch back to the form editor?"
        description="AI reads your LaTeX back into form fields, so your edits are kept. It takes about 10 seconds. Custom formatting from your code isn't kept, and the LaTeX version stays in your history."
        confirmLabel="Switch to form"
        onConfirm={() => switchMode.mutate('structured')}
      />
      <SharePanel
        open={shareOpen}
        onOpenChange={setShareOpen}
        resumeId={resume.id}
        headVersionId={headVersionId}
      />
    </div>
  )
}

// Space the user added after sections or entries, which the page-limit warning can undo in one click.
const hasAddedSpace = (content: ResumeContent) =>
  content.sections.some(
    (s) =>
      (s.spaceAfter ?? 0) > 0 ||
      ('entries' in s && s.entries.some((e) => (e.spaceAfter ?? 0) > 0)),
  )

const withoutAddedSpace = (content: ResumeContent): ResumeContent => ({
  ...content,
  sections: content.sections.map(({ spaceAfter: _, ...s }) =>
    'entries' in s
      ? ({
          ...s,
          entries: s.entries.map(({ spaceAfter: __, ...e }) => e),
        } as ResumeContent['sections'][number])
      : (s as ResumeContent['sections'][number]),
  ),
})
