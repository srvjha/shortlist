import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CodeIcon,
  FilePlusIcon,
  SparklesIcon,
  EyeOffIcon,
  FileUpIcon,
  UploadCloudIcon,
  UserRoundIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/app/page-header'
import { PdfPreview } from '@/components/editor/pdf-preview'
import {
  TemplatePicker,
  layoutOptions,
} from '@/components/templates/template-picker'
import {
  BlankPageSheet,
  LatexSheet,
  ResumeSheet,
} from '@/components/app/paper-sheets'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ApiError,
  api,
  errorMessage,
  toApiError,
  unwrap,
} from '@/lib/api/client'
import {
  customTemplatesQuery,
  profileQuery,
  usageQuery,
} from '@/lib/api/queries'
import type {
  CreateResumeBody,
  ResumeContent,
  ResumeDetail,
} from '@/lib/api/types'
import { usePdfPreview } from '@/hooks/use-pdf-preview'
import { apiUrl } from '@/lib/env'
import { recommendTemplate } from '@/lib/recommend-template'
import type { TemplateRecommendation } from '@/lib/recommend-template'
import { site } from '@/lib/site'
import { blankLatex, templateCatalog } from '@/lib/templates'
import type { TemplateId } from '@/lib/templates'
import { cn } from '@/lib/utils'

const searchSchema = z.object({
  template: z.string().optional(),
  customTemplate: z.string().optional(),
  source: z.enum(['blank', 'profile', 'upload', 'tex', 'ai']).optional(),
})

export const Route = createFileRoute('/_app/resumes/new')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: `New resume | ${site.name}` }] }),
  loader: ({ context }) => context.queryClient.prefetchQuery(profileQuery),
  component: NewResumePage,
})

type Source = 'profile' | 'upload' | 'ai' | 'tex' | 'blank'

const sources = [
  {
    id: 'blank',
    icon: FilePlusIcon,
    title: 'Start blank',
    body: 'A layout, a blank page or your own template',
  },
  {
    id: 'profile',
    icon: UserRoundIcon,
    title: 'From my profile',
    body: 'Use everything in your profile',
  },
  {
    id: 'upload',
    icon: FileUpIcon,
    title: 'Import a file',
    body: 'PDF, .tex or text file',
  },
  {
    id: 'ai',
    icon: SparklesIcon,
    title: 'Write with AI',
    body: 'From a few notes, no resume needed',
  },
  {
    id: 'tex',
    icon: CodeIcon,
    title: 'Paste LaTeX',
    body: 'Keep editing your Overleaf code',
  },
] as const

function NewResumePage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profile, isSuccess: profileLoaded } = useQuery(profileQuery)
  const hasProfile = Boolean(profile?.updatedAt)
  // Only offer to save over the profile once it is known to be empty, not while loading or failed.
  const canSaveProfile = profileLoaded && !hasProfile

  const { data: customTemplates } = useQuery(customTemplatesQuery)
  const initialTemplate = templateCatalog.some((t) => t.id === search.template)
    ? (search.template as TemplateId)
    : 'developer'
  // What a blank start begins from: a layout, the blank LaTeX page, or one of the user's templates.
  const [blankStart, setBlankStart] = useState(
    search.customTemplate
      ? `custom:${search.customTemplate}`
      : search.template === 'blank'
        ? 'blank-page'
        : initialTemplate,
  )
  const [source, setSource] = useState<Source>(
    search.source ?? (hasProfile ? 'profile' : 'upload'),
  )
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate)
  const [texSource, setTexSource] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [role, setRole] = useState('')
  const [notes, setNotes] = useState('')
  const { data: usage } = useQuery(usageQuery)
  // Free gets one draft per account; paid plans a monthly allowance; an own AI key has no limit.
  const draftsLeft = usage
    ? usage.ownAiKey
      ? Infinity
      : Math.max(0, usage.draft.limit - usage.draft.used)
    : 1
  const [texChoice, setTexChoice] = useState<'code' | 'form'>('code')
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // Uploaded LaTeX, read in the browser so it can be previewed before creating.
  const [fileTex, setFileTex] = useState('')
  // What the AI read from an uploaded or pasted resume, shown for review before creating.
  const [imported, setImported] = useState<ResumeContent | null>(null)
  const [recommendation, setRecommendation] =
    useState<TemplateRecommendation | null>(null)
  // PDF lines the AI skipped. Placed ones are already in the import as hidden bullets.
  const [missed, setMissed] = useState<Missed>([])
  // The source PDF's link style, so an import that named its links ("LinkedIn") keeps doing so.
  const [linkStyle, setLinkStyle] = useState<ResumeDetail['layout']['links']>()
  const [choosingTemplate, setChoosingTemplate] = useState(false)

  const isTexFile = file ? /\.tex$/i.test(file.name) : false
  const customTemplate =
    source === 'blank' && blankStart.startsWith('custom:')
      ? customTemplates?.find((t) => `custom:${t.id}` === blankStart)
      : undefined
  const makesCodeResume =
    source === 'tex' ||
    (source === 'upload' && isTexFile && texChoice === 'code')

  const previewInput =
    (source === 'upload' || source === 'ai') && imported
      ? {
          content: imported,
          templateId,
          ...(linkStyle && {
            layout: { spacing: 'normal' as const, links: linkStyle },
          }),
        }
      : source === 'upload' && makesCodeResume && fileTex
        ? { texSource: fileTex }
        : source === 'tex' && texSource.trim()
          ? { texSource }
          : null
  const preview = usePdfPreview(previewInput)
  const templateName =
    templateCatalog.find((t) => t.id === templateId)?.name ?? 'Developer'

  async function importContent(): Promise<{
    content: ResumeContent
    missed: Missed
    linkStyle?: ResumeDetail['layout']['links']
  }> {
    if (file) {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(`${apiUrl}/v1/uploads`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      // A proxy in front of the API can answer 413 with an HTML page, so the body may not be JSON.
      if (!response.ok)
        throw toApiError(
          response,
          await response.json().catch(() => undefined),
          'Upload failed. Try again.',
        )
      const body = await response.json()
      return unwrap(
        api.POST('/v1/imports', { body: { uploadId: body.data.id } }),
      )
    }
    if (source === 'ai') {
      const draft = await unwrap(
        api.POST('/v1/resume-drafts', {
          body: { role: role.trim(), notes: notes.trim() },
        }),
      )
      return { content: draft.content, missed: [] }
    }
    return unwrap(api.POST('/v1/imports', { body: { text: pastedText } }))
  }

  const read = useMutation({
    mutationFn: importContent,
    onSuccess: ({ content, missed: skipped, linkStyle: style }) => {
      setImported(content)
      // A template picked before arriving here (from the templates page) is kept.
      if (!search.template) {
        const recommended = recommendTemplate(content)
        setTemplateId(recommended.templateId)
        setRecommendation(recommended)
      }
      setMissed(skipped)
      setLinkStyle(style)
      setChoosingTemplate(false)
      if (!title && content.basics.name) setTitle(content.basics.name)
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.code === 'AI_NOT_CONFIGURED'
          ? 'Importing needs AI, which is not set up yet. Start blank or paste LaTeX instead.'
          : errorMessage(error),
      )
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const name = title.trim() || 'Untitled resume'
      let body: CreateResumeBody

      if (makesCodeResume) {
        const tex = source === 'tex' ? texSource : fileTex
        body = {
          title: name,
          mode: 'code',
          source: { type: 'tex', texSource: tex },
        }
      } else if (source === 'upload' || source === 'ai') {
        const content = imported ?? (await importContent()).content
        if (saveToProfile && canSaveProfile) {
          await unwrap(api.PUT('/v1/profile', { body: { content } }))
          queryClient.invalidateQueries({ queryKey: ['profile'] })
        }
        body = {
          title: name,
          mode: 'structured',
          templateId,
          ...(linkStyle && { layout: { spacing: 'normal', links: linkStyle } }),
          source: { type: 'content', content },
        }
      } else if (source === 'blank' && blankStart === 'blank-page') {
        body = {
          title: name,
          mode: 'code',
          source: { type: 'tex', texSource: blankLatex },
        }
      } else if (customTemplate) {
        body = {
          title: name,
          mode: customTemplate.mode,
          ...(customTemplate.templateId && {
            templateId: customTemplate.templateId,
          }),
          source: {
            type: 'customTemplate',
            customTemplateId: customTemplate.id,
          },
        }
      } else {
        body = {
          title: name,
          mode: 'structured',
          templateId: source === 'blank' ? blankStart : templateId,
          source: { type: source },
        }
      }
      return unwrap(api.POST('/v1/resumes', { body }))
    },
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      navigate({
        to: '/resumes/$resumeId',
        params: { resumeId: resume.id },
        search: { created: true },
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'AI_NOT_CONFIGURED') {
        toast.error(
          'Importing needs AI, which is not set up yet. Start blank or paste LaTeX instead.',
        )
      } else {
        toast.error(errorMessage(error))
      }
    },
  })

  const canSubmit =
    source === 'tex'
      ? texSource.trim().length > 0
      : source === 'upload'
        ? Boolean(file) || pastedText.trim().length >= 20
        : source === 'ai'
          ? role.trim().length >= 2 &&
            notes.trim().length >= 40 &&
            draftsLeft > 0
          : source === 'profile'
            ? hasProfile
            : !blankStart.startsWith('custom:') || Boolean(customTemplate)

  // A PDF or text resume is read by the AI first, then reviewed with a live preview.
  const readsFirst =
    (source === 'upload' && !makesCodeResume) || source === 'ai'
  const busy = create.isPending || read.isPending

  function pickFile(next: File | undefined) {
    if (!next) return
    if (next.size > 5 * 1024 * 1024) {
      toast.error(
        'That file is over 5 MB. Export a smaller PDF or paste the text instead.',
      )
      return
    }
    setFile(next)
    setImported(null)
    setFileTex('')
    if (/\.tex$/i.test(next.name)) void next.text().then(setFileTex)
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-8 px-5 py-8 sm:px-8',
        previewInput ? 'max-w-7xl' : 'max-w-4xl',
      )}
    >
      <PageHeader
        title="New resume"
        description="Start from what you have. You can tailor it to a job next."
      />

      <div
        className={cn(
          previewInput &&
            'grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]',
        )}
      >
        {(source === 'upload' || source === 'ai') && imported ? (
          <section
            aria-labelledby="review"
            className="@container flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <h2 id="review" className="text-2xl font-semibold tracking-tight">
                {source === 'ai'
                  ? "Here's your first draft"
                  : 'We read your resume'}
              </h2>
              <p className="text-muted-foreground">
                {source === 'ai'
                  ? 'Written only from your notes. Check it in the preview, then create it and add anything missing in the editor.'
                  : 'Check it in the preview, then create the resume below. It opens in the editor, where you can fix anything and tailor it to a job with Improve with AI.'}
              </p>
            </div>
            <dl className="grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {imported.basics.name || 'Not found'}
              </dd>
              <dt className="text-muted-foreground">Sections</dt>
              <dd>
                {imported.sections.map((section) => section.title).join(', ') ||
                  'None found'}
              </dd>
              <dt className="text-muted-foreground">Template</dt>
              <dd>
                <span className="font-medium">{templateName}</span>
                {recommendation?.templateId === templateId && (
                  <span className="text-muted-foreground">
                    {' '}
                    (recommended). {recommendation.reason}
                  </span>
                )}
              </dd>
            </dl>
            <MissedLines missed={missed} />
            <Field className="max-w-md">
              <FieldLabel htmlFor="review-title">Resume name</FieldLabel>
              <Input
                id="review-title"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            {canSaveProfile && (
              <Field orientation="horizontal">
                <Checkbox
                  id="review-save-profile"
                  checked={saveToProfile}
                  onCheckedChange={(checked) =>
                    setSaveToProfile(checked === true)
                  }
                />
                <FieldLabel
                  htmlFor="review-save-profile"
                  className="font-normal"
                >
                  Also save it as my profile, so future resumes can start from
                  it
                </FieldLabel>
              </Field>
            )}

            {choosingTemplate && (
              <TemplatePicker
                value={templateId}
                onChange={(value) => setTemplateId(value as TemplateId)}
                description="The preview updates as you pick. You can switch again anytime in the editor."
                options={layoutOptions()}
              />
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-6">
              <Button
                size="lg"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending && <Spinner data-icon="inline-start" />}
                Create resume with {templateName}
              </Button>
              {!choosingTemplate && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setChoosingTemplate(true)}
                >
                  Choose a different template
                </Button>
              )}
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setImported(null)}
              >
                Start over
              </Button>
            </div>
          </section>
        ) : (
          <form
            className="@container"
            onSubmit={(event) => {
              event.preventDefault()
              if (!canSubmit) return
              if (readsFirst) read.mutate()
              else create.mutate()
            }}
          >
            <FieldGroup className="gap-8">
              <Field className="max-w-md">
                <FieldLabel htmlFor="title">Name</FieldLabel>
                <Input
                  id="title"
                  name="title"
                  autoComplete="off"
                  placeholder="Backend roles, 2026"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <FieldDescription>
                  Only you see this. Name it after the role or company you are
                  applying to.
                </FieldDescription>
              </Field>

              <FieldSet>
                <FieldLegend>Start from</FieldLegend>
                <ToggleGroup
                  type="single"
                  value={source}
                  onValueChange={(value) => value && setSource(value as Source)}
                  className="grid w-full auto-rows-fr grid-cols-2 gap-3 @xl:grid-cols-3 @2xl:grid-cols-5"
                  aria-label="Start from"
                >
                  {sources.map((option) => (
                    <ToggleGroupItem
                      key={option.id}
                      value={option.id}
                      disabled={option.id === 'profile' && !hasProfile}
                      className="flex h-full flex-col items-start justify-start gap-1.5 rounded-lg border bg-card p-4 text-left whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <option.icon className="text-primary" />
                      <span className="font-medium">{option.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.id === 'profile' && !hasProfile
                          ? 'Your profile is empty'
                          : option.body}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>

              {source === 'ai' && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="draft-role">
                      Role you're applying for
                    </FieldLabel>
                    <Input
                      id="draft-role"
                      autoComplete="off"
                      placeholder="Backend Engineer"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="draft-notes">
                      About you, in your own words
                    </FieldLabel>
                    <Textarea
                      id="draft-notes"
                      rows={9}
                      placeholder={`Final year B.Tech CSE at NIT Trichy, CGPA 8.4, graduating 2026\nIntern at Swiggy, summer 2025: made order tracking faster with Redis, p95 800ms to 200ms\nCollege fest app in React Native, 3,000 students registered with it\nWon Smart India Hackathon 2024\nJava, Python, React, Node, SQL, Docker`}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                    <FieldDescription>
                      Write it the way you'd tell a friend: where you study,
                      internships, projects, numbers and skills. Rough notes are
                      fine. The AI turns them into a resume and only uses what
                      you write.
                    </FieldDescription>
                  </Field>
                  {draftsLeft === 0 ? (
                    <Alert>
                      <SparklesIcon />
                      <AlertTitle>
                        You've used your free AI-written resume
                      </AlertTitle>
                      <AlertDescription>
                        Season Pass and Pro include more, or add your own AI key
                        in Settings for unlimited.{' '}
                        <Link
                          to="/billing"
                          className="underline underline-offset-4"
                        >
                          See plans
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    usage &&
                    !usage.ownAiKey &&
                    usage.plan === 'free' && (
                      <p className="text-sm text-muted-foreground">
                        Your account includes one free AI-written resume.
                      </p>
                    )
                  )}
                </FieldGroup>
              )}

              {source === 'upload' && (
                <div className="flex flex-col gap-4">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      setDragging(false)
                      pickFile(event.dataTransfer.files[0])
                    }}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors',
                      dragging && 'border-primary bg-primary/5',
                    )}
                  >
                    <UploadCloudIcon className="size-8 text-muted-foreground" />
                    {file ? (
                      <p>
                        <span className="font-medium break-all">
                          {file.name}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          ({Math.ceil(file.size / 1024)} KB)
                        </span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Drop your resume here, or choose a file
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInput.current?.click()}
                    >
                      {file ? 'Choose a different file' : 'Choose file'}
                    </Button>
                    <input
                      ref={fileInput}
                      type="file"
                      aria-label="Choose a resume file"
                      accept=".pdf,.tex,.txt,application/pdf,text/plain"
                      className="sr-only"
                      onChange={(event) => pickFile(event.target.files?.[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      PDF, .tex or .txt, up to 5 MB
                    </p>
                  </div>

                  {isTexFile ? (
                    <FieldSet>
                      <FieldLegend variant="label">
                        This is a LaTeX file. How do you want to edit it?
                      </FieldLegend>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={texChoice}
                        onValueChange={(value) =>
                          value && setTexChoice(value as typeof texChoice)
                        }
                      >
                        <ToggleGroupItem value="code">
                          Keep as LaTeX
                        </ToggleGroupItem>
                        <ToggleGroupItem value="form">
                          Convert to form
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </FieldSet>
                  ) : (
                    !file && (
                      <Field>
                        <FieldLabel htmlFor="pasted">
                          Or paste your resume as text
                        </FieldLabel>
                        <Textarea
                          id="pasted"
                          rows={6}
                          placeholder="Copy everything from your current resume and paste it here"
                          value={pastedText}
                          onChange={(event) => {
                            setPastedText(event.target.value)
                            setImported(null)
                          }}
                        />
                      </Field>
                    )
                  )}

                  {!makesCodeResume && canSaveProfile && (
                    <Field orientation="horizontal">
                      <Checkbox
                        id="save-profile"
                        checked={saveToProfile}
                        onCheckedChange={(checked) =>
                          setSaveToProfile(checked === true)
                        }
                      />
                      <FieldLabel
                        htmlFor="save-profile"
                        className="font-normal"
                      >
                        Also save it as my profile, so future resumes can start
                        from it
                      </FieldLabel>
                    </Field>
                  )}
                </div>
              )}

              {source === 'tex' && (
                <Field>
                  <FieldLabel htmlFor="tex">LaTeX source</FieldLabel>
                  <Textarea
                    id="tex"
                    rows={12}
                    spellCheck={false}
                    className="font-mono text-sm"
                    placeholder={
                      '\\documentclass[letterpaper,10pt]{article}\n...'
                    }
                    value={texSource}
                    onChange={(event) => setTexSource(event.target.value)}
                  />
                  <FieldDescription>
                    Paste the full main.tex from Overleaf. Single-file documents
                    work; images and extra files are not supported.
                  </FieldDescription>
                </Field>
              )}

              {source === 'profile' && hasProfile && (
                <Alert>
                  <UserRoundIcon />
                  <AlertTitle>Everything from your profile goes in</AlertTitle>
                  <AlertDescription>
                    Tailor it to a job afterwards to keep only what matters for
                    that role.
                  </AlertDescription>
                </Alert>
              )}

              {source === 'blank' ? (
                <TemplatePicker
                  value={blankStart}
                  onChange={setBlankStart}
                  description="Fill in a layout as a form, write LaTeX on a blank page, or reuse one of your templates."
                  options={[
                    {
                      value: 'blank-page',
                      name: 'Blank page',
                      note: 'LaTeX from scratch',
                      preview: <BlankPageSheet className="aspect-17/22" />,
                    },
                    ...layoutOptions(),
                    ...(customTemplates ?? []).map((template) => ({
                      value: `custom:${template.id}`,
                      name: template.name,
                      note: 'Your template',
                      preview:
                        template.mode === 'code' ? (
                          <LatexSheet className="aspect-17/22" />
                        ) : (
                          <ResumeSheet
                            title={template.name}
                            tailored={false}
                            className="aspect-17/22"
                          />
                        ),
                    })),
                  ]}
                  footer={
                    <p className="text-sm text-muted-foreground">
                      Want your own layout?{' '}
                      <Link
                        to="/my-templates/new"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Create a template
                      </Link>
                    </p>
                  }
                />
              ) : (
                !makesCodeResume &&
                source !== 'upload' &&
                source !== 'ai' && (
                  <TemplatePicker
                    value={templateId}
                    onChange={(value) => setTemplateId(value as TemplateId)}
                    description="You can switch templates anytime."
                    options={layoutOptions()}
                  />
                )
              )}

              <div className="flex flex-wrap items-center gap-3 border-t pt-6">
                <Button type="submit" size="lg" disabled={!canSubmit || busy}>
                  {busy && <Spinner data-icon="inline-start" />}
                  {readsFirst
                    ? read.isPending
                      ? source === 'ai'
                        ? 'Writing your resume…'
                        : 'Reading your resume…'
                      : source === 'ai'
                        ? 'Write my resume'
                        : 'Read my resume'
                    : 'Create resume'}
                </Button>
                {read.isPending && (
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    This takes about 10 seconds.
                  </p>
                )}
              </div>
            </FieldGroup>
          </form>
        )}
        {previewInput && (
          // Fits below the page heading (8rem) so the whole preview is on screen and scrolls inside itself.
          <aside
            aria-label="Preview"
            className="sticky top-4 mt-8 h-[75svh] overflow-hidden rounded-xl border bg-card lg:mt-0 lg:h-[calc(100svh-9rem)]"
          >
            <PdfPreview {...preview} pageLimit={1} />
          </aside>
        )}
      </div>
    </div>
  )
}

type Missed = { text: string; placed: boolean }[]

// After an import, the lines the AI skipped: placed ones are hidden bullets, the rest need adding by hand.
function MissedLines({ missed }: { missed: Missed }) {
  if (missed.length === 0) return null
  const placed = missed.filter((line) => line.placed)
  const unplaced = missed.filter((line) => !line.placed)
  const list = (lines: Missed) => (
    <ul className="mt-2 list-disc pl-4">
      {lines.slice(0, 5).map((line) => (
        <li key={line.text} className="line-clamp-2">
          {line.text}
        </li>
      ))}
      {lines.length > 5 && <li>And {lines.length - 5} more</li>}
    </ul>
  )
  return (
    <Alert>
      <EyeOffIcon />
      <AlertTitle>
        {missed.length === 1
          ? 'We found 1 line the AI skipped'
          : `We found ${missed.length} lines the AI skipped`}
      </AlertTitle>
      <AlertDescription>
        {placed.length > 0 && (
          <div>
            <p>
              Added as hidden bullets under the entry they came from, so they
              won't print until you turn them on with the eye icon in the
              editor:
            </p>
            {list(placed)}
          </div>
        )}
        {unplaced.length > 0 && (
          <div className={placed.length > 0 ? 'mt-3' : undefined}>
            <p>
              Not added, because there was no entry to put them under. Add them
              in the editor if you need them:
            </p>
            {list(unplaced)}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
