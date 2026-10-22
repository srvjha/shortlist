import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  DownloadIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AiReview } from '@/components/ats/ai-review'
import { AtsReport } from '@/components/ats/ats-report'
import { ScanProgress, scanSteps, stepMs } from '@/components/ats/scan-progress'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api, errorMessage, unwrap } from '@/lib/api/client'
import type { RequestBody } from '@/lib/api/types'
import { useSession } from '@/lib/auth-client'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

const minChars = 200
const maxChars = 50_000
const maxJobChars = 20_000

type TextItem = NonNullable<
  RequestBody<'/v1/ats-reports', 'post'>['items']
>[number]

const maxParsedPages = 4
const boldFont = /bold|black|heavy|semibold|demi/i
const iconFont =
  /awesome|icon|glyph|material|dingbat|marvosym|wasy|academicons/i

// Same as withoutReplacedIcons in backend parser/extract.ts: an icon inside a marked-content Span with no MCID
// carries replacement text (ActualText) that extractors like pdftotext use instead, so its glyph is skipped.
function withoutReplacedIcons<T>(items: T[], fontOf: (item: T) => string) {
  const spans: boolean[] = []
  return items.filter((item) => {
    const mark = item as { type?: string; tag?: string; id?: string | null }
    if (
      mark.type === 'beginMarkedContent' ||
      mark.type === 'beginMarkedContentProps'
    ) {
      spans.push(mark.tag === 'Span' && !mark.id)
      return false
    }
    if (mark.type === 'endMarkedContent') {
      spans.pop()
      return false
    }
    return !(spans.includes(true) && iconFont.test(fontOf(item)))
  })
}

// Profile links (LinkedIn, a GitHub profile, an email, a portfolio's home page) are what a recruiter needs
// to read. A project's "Live" or "Code" link behind its label is normal, so deeper links aren't checked.
function isProfileLink(url: string) {
  if (/^mailto:/i.test(url)) return true
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const segments = parsed.pathname.split('/').filter(Boolean).length
  if (/(^|\.)linkedin\.com$/i.test(parsed.hostname)) return true
  if (
    /(^|\.)(github|gitlab|behance|dribbble|kaggle|leetcode|medium)\.com$/i.test(
      parsed.hostname,
    )
  )
    return segments <= 1
  return segments === 0
}

// A link counts as visible when its address, without the protocol or "www.", is written in the text.
// Wrapped lines and spaces are ignored, so a URL split across two lines still counts.
function linkVisible(text: string, url: string) {
  const core = url
    .replace(/^mailto:/i, '')
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .toLowerCase()
  return text.replace(/\s+/g, '').toLowerCase().includes(core)
}

// Same loading as PdfPages: pdf.js and its worker only load when someone picks a file.
// The text runs of the first pages go to the server's parser, built exactly like backend parser/extract.ts.
async function readPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  try {
    const doc = await task.promise
    const pages: string[] = []
    const items: TextItem[] = []
    const links = new Set<string>()
    let size = { width: 0, height: 0 }
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number)
      const { width, height } = page.getViewport({ scale: 1 })
      if (number === 1) size = { width, height }
      if (number <= maxParsedPages) await page.getOperatorList()
      const content = await page.getTextContent({ includeMarkedContent: true })
      const fontOf = (run: (typeof content.items)[number]) => {
        try {
          return 'fontName' in run
            ? ((page.commonObjs.get(run.fontName) as { name?: string }).name ??
                '')
            : ''
        } catch {
          return ''
        }
      }
      const runs = withoutReplacedIcons(content.items, fontOf)
      pages.push(
        runs
          .map((item) =>
            'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '',
          )
          .join(''),
      )
      for (const annotation of await page.getAnnotations()) {
        const url = (annotation as { url?: string }).url
        if (url && /^(https?:|mailto:)/i.test(url)) links.add(url)
      }
      if (number > maxParsedPages) continue
      const fontNames = new Map<string, string>()
      for (const run of runs) {
        if (!('str' in run) || !run.str.trim()) continue
        if (!fontNames.has(run.fontName)) {
          let real = ''
          try {
            real =
              (page.commonObjs.get(run.fontName) as { name?: string }).name ??
              ''
          } catch {
            // A font pdf.js never loaded has no name; it just isn't marked bold.
          }
          fontNames.set(run.fontName, real)
        }
        const fontName = fontNames.get(run.fontName)!
        const runHeight =
          run.height || Math.hypot(run.transform[2], run.transform[3])
        items.push({
          text: run.str.slice(0, 500),
          x: run.transform[4],
          y: height - run.transform[5] - runHeight,
          width: run.width,
          height: runHeight,
          page: number,
          fontName: fontName.slice(0, 200),
          bold: boldFont.test(fontName),
        })
      }
    }
    const text = pages.join('\n\n').trim()
    return {
      text,
      items: items.slice(0, 6000),
      page: size,
      pages: doc.numPages,
      hiddenLinks: [...links]
        .filter((url) => isProfileLink(url) && !linkVisible(text, url))
        .slice(0, 50),
    }
  } finally {
    await task.destroy()
  }
}

function checkError(error: unknown) {
  if (error instanceof ApiError && error.status === 429)
    return 'You have run a lot of checks in a short time. Wait about 10 minutes and try again.'
  return errorMessage(error)
}

// The upload or paste form and the report it produces, shared by the public checker and the in-app page.
export function AtsChecker() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'pdf' | 'text'>('pdf')
  const [file, setFile] = useState<
    | ({ name: string; sizeBytes: number } & Awaited<
        ReturnType<typeof readPdf>
      >)
    | null
  >(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pasted, setPasted] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const reportHeading = useRef<HTMLHeadingElement>(null)

  const text = (tab === 'pdf' ? (file?.text ?? '') : pasted).trim()
  const pastedError =
    tab === 'text' && pasted.trim() && text.length < minChars
      ? `Paste the whole resume. This is ${text.length} characters; the check needs at least ${minChars}.`
      : text.length > maxChars
        ? `That is longer than ${maxChars.toLocaleString('en-IN')} characters. Paste only the resume.`
        : null

  const steps = scanSteps({
    pdf: tab === 'pdf' && Boolean(file),
    words: text ? text.split(/\s+/).length : 0,
    job: Boolean(jobDescription.trim()),
  })
  const check = useMutation({
    // The check itself takes well under a second; a short minimum lets each step be seen
    // instead of the report appearing before the button has visibly done anything.
    mutationFn: async () => {
      const [report] = await Promise.all([
        unwrap(
          api.POST('/v1/ats-reports', {
            body: {
              text,
              ...(tab === 'pdf' &&
                file && {
                  items: file.items,
                  page: file.page,
                  file: {
                    name: file.name.slice(0, 255),
                    sizeBytes: file.sizeBytes,
                    pages: file.pages,
                    hiddenLinks: file.hiddenLinks.map((url) =>
                      url.slice(0, 500),
                    ),
                  },
                }),
              ...(jobDescription.trim() && {
                jobDescription: jobDescription.trim(),
              }),
            },
          }),
        ),
        new Promise((resolve) => setTimeout(resolve, steps.length * stepMs)),
      ])
      return report
    },
  })

  useEffect(() => {
    if (check.data) reportHeading.current?.focus()
  }, [check.data])

  async function pickFile(next: File | undefined) {
    if (!next) return
    setFileError(null)
    setFile(null)
    if (next.type !== 'application/pdf' && !/\.pdf$/i.test(next.name)) {
      setFileError('Choose a PDF file, or paste your resume as text instead.')
      return
    }
    setReading(true)
    try {
      const extracted = await readPdf(next)
      if (extracted.text.length < minChars) {
        setFileError(
          'We could not find text in this PDF. It may be scanned or saved as an image, which most ATS software cannot read either. Export it again from Word, Google Docs or LaTeX, or paste the text instead.',
        )
        return
      }
      setFile({ name: next.name, sizeBytes: next.size, ...extracted })
    } catch {
      setFileError(
        'We could not open this PDF. It may be damaged or password protected. Try another file, or paste the text instead.',
      )
    } finally {
      setReading(false)
    }
  }

  const importRedirect = '/resumes/new?source=upload'

  // The browser's own print-to-PDF: real, selectable text and no PDF library. The page title names the
  // saved file, and dark mode would print light text on white paper, so both are switched for the print.
  function downloadReport() {
    const root = document.documentElement
    const dark = root.classList.contains('dark')
    const previousTitle = document.title
    document.title = `ATS report, ${site.name}`
    root.classList.remove('dark')
    window.addEventListener(
      'afterprint',
      () => {
        document.title = previousTitle
        root.classList.toggle('dark', dark)
      },
      { once: true },
    )
    window.print()
  }

  // The form, the scan and the report take turns in one place, so the result appears where the upload was.
  if (check.isPending) return <ScanProgress steps={steps} />
  if (check.data)
    return (
      <section
        aria-labelledby="ats-result"
        data-print-root
        className="mx-auto mt-10 max-w-6xl"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2
            id="ats-result"
            ref={reportHeading}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none"
          >
            Your ATS report
          </h2>
          <Button
            data-print-hide
            variant="outline"
            onClick={() => check.reset()}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Check another resume
          </Button>
          <p className="hidden text-sm text-muted-foreground print:block">
            Checked {formatDate(new Date())} at {site.displayDomain}
            /ats-checker
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-7 print:border-0 print:p-0">
          <AtsReport
            report={check.data}
            aside={
              <div data-print-hide className="flex flex-col gap-4">
                <Button variant="outline" onClick={downloadReport}>
                  <DownloadIcon data-icon="inline-start" />
                  Download PDF
                </Button>
                <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
                  <p className="font-sans font-semibold">
                    Fix these in Shortlist
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Import this resume and the AI fixes these issues using only
                    what is already in it. You approve every change. Free to
                    start.
                  </p>
                  <Button asChild>
                    {session ? (
                      <Link to="/resumes/new" search={{ source: 'upload' }}>
                        Import my resume
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        search={{ mode: 'signup', redirect: importRedirect }}
                      >
                        Fix these in Shortlist
                      </Link>
                    )}
                  </Button>
                </div>
              </div>
            }
          />
        </div>
        <AiReview text={text} jobDescription={jobDescription.trim()} />
      </section>
    )

  return (
    <div className="mx-auto max-w-3xl">
      <form
        className="mt-10 flex flex-col gap-6 rounded-2xl border bg-card p-5 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault()
          if (text.length >= minChars && !pastedError) check.mutate()
        }}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList aria-label="How to add your resume">
            <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
            <TabsTrigger value="text">Paste text</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf" className="mt-2 flex flex-col gap-2">
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
                'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging && 'border-primary bg-primary/5',
              )}
            >
              <UploadCloudIcon
                aria-hidden
                className="size-8 text-muted-foreground"
              />
              <p aria-live="polite">
                {reading ? (
                  <span className="text-muted-foreground">
                    Reading your PDF…
                  </span>
                ) : file ? (
                  <>
                    <span className="font-medium break-all">{file.name}</span>{' '}
                    <span className="text-muted-foreground">
                      ({file.text.split(/\s+/).length} words found)
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Drop your resume PDF here, or choose a file
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={reading}
                onClick={() => fileInput.current?.click()}
              >
                {reading && <Spinner data-icon="inline-start" />}
                {file ? 'Choose a different file' : 'Choose PDF'}
              </Button>
              <input
                ref={fileInput}
                type="file"
                aria-label="Choose a resume PDF"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  pickFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
            <FieldError>{fileError}</FieldError>
          </TabsContent>
          <TabsContent value="text" className="mt-2">
            <Field data-invalid={Boolean(pastedError)}>
              <FieldLabel htmlFor="resume-text">Resume text</FieldLabel>
              <Textarea
                id="resume-text"
                rows={10}
                placeholder="Copy everything from your resume and paste it here"
                value={pasted}
                aria-invalid={Boolean(pastedError)}
                onChange={(event) => setPasted(event.target.value)}
              />
              {pastedError ? (
                <FieldError>{pastedError}</FieldError>
              ) : (
                <FieldDescription>
                  Plain text is fine. Keep the section headings.
                </FieldDescription>
              )}
            </Field>
          </TabsContent>
        </Tabs>

        <Field>
          <FieldLabel htmlFor="job-description">
            Job description (optional)
          </FieldLabel>
          <Textarea
            id="job-description"
            rows={5}
            maxLength={maxJobChars}
            placeholder="Paste a job description to see which of its skills and requirements you are missing"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            size="lg"
            className="sm:self-start"
            disabled={reading || text.length < minChars || Boolean(pastedError)}
          >
            Check my resume
          </Button>
          <p className="flex gap-2 text-sm text-muted-foreground">
            <ShieldCheckIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            Your PDF is read in your browser. Only its text and layout are sent,
            checked and not stored.
          </p>
          {check.isError && (
            <p role="alert" className="text-sm text-destructive">
              {checkError(check.error)}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
