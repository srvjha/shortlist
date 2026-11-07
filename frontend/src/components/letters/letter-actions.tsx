import { CopyIcon, DownloadIcon, TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { saveBlob } from '@/lib/download'
import { toast } from '@/lib/toast'

// Copy and plain-text download, shared by the public pages and the app.
export function LetterTextActions({
  title,
  body,
}: {
  title: string
  body: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      toast.success('Letter copied')
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.")
    }
  }
  return (
    <>
      <Button variant="outline" className="min-h-11" onClick={copy}>
        <CopyIcon data-icon="inline-start" />
        Copy text
      </Button>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() =>
          saveBlob(
            new Blob([body], { type: 'text/plain;charset=utf-8' }),
            `${
              title
                .trim()
                .replace(/[^\p{L}\p{N}]+/gu, '-')
                .toLowerCase() || 'letter'
            }.txt`,
          )
        }
      >
        <DownloadIcon data-icon="inline-start" />
        Download .txt
      </Button>
    </>
  )
}

// A flagged term the user has since edited out stops being shown.
export function LetterFlags({
  flags,
  body,
}: {
  flags: string[]
  body: string
}) {
  const text = body.toLowerCase()
  const open = flags.filter((flag) => text.includes(flag.toLowerCase()))
  if (open.length === 0) return null
  return (
    <Alert>
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>Check before you send this</AlertTitle>
      <AlertDescription>
        <p>
          These aren't in your resume or profile. Keep them only if they're
          true:
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {open.map((flag) => (
            <li
              key={flag}
              className="rounded-sm bg-highlight px-1.5 py-0.5 text-sm font-medium text-highlight-foreground"
            >
              {flag}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
