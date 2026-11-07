import { useMutation } from '@tanstack/react-query'
import { UploadCloudIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api, unwrap } from '@/lib/api/client'
import { aiErrorMessage, upgradeAction } from '@/lib/api/errors'
import type { ResumeContent } from '@/lib/api/types'
import { apiUrl } from '@/lib/env'

// Turns an uploaded file or pasted text into structured resume content.
export function ImportDialog({
  open,
  onOpenChange,
  onImported,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (content: ResumeContent) => void
  description: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const run = useMutation({
    mutationFn: async () => {
      if (file) {
        const form = new FormData()
        form.append('file', file)
        const response = await fetch(`${apiUrl}/v1/uploads`, {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        const body = await response.json()
        if (!response.ok)
          throw new ApiError(
            response.status,
            body.error?.code,
            body.error?.message,
          )
        return unwrap(
          api.POST('/v1/imports', { body: { uploadId: body.data.id } }),
        )
      }
      return unwrap(api.POST('/v1/imports', { body: { text } }))
    },
    onSuccess: (result) => {
      onImported(result.content)
      setFile(null)
      setText('')
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(aiErrorMessage(error), upgradeAction(error)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import a resume</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center">
            <UploadCloudIcon className="size-6 text-muted-foreground" />
            <p className="text-sm break-all">
              {file ? file.name : 'PDF, .tex or .txt, up to 5 MB'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
            >
              {file ? 'Choose a different file' : 'Choose file'}
            </Button>
            <input
              ref={input}
              type="file"
              aria-label="Choose a resume file"
              accept=".pdf,.tex,.txt,application/pdf,text/plain"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {!file && (
            <Field>
              <FieldLabel htmlFor="import-text">
                Or paste your resume as text
              </FieldLabel>
              <Textarea
                id="import-text"
                rows={5}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <FieldDescription>
                Paste the whole resume. Import needs at least a few lines.
              </FieldDescription>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending || (!file && text.trim().length < 20)}
          >
            {run.isPending && <Spinner data-icon="inline-start" />}
            {run.isPending ? 'Reading your resume…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
