import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { useSession } from '@/lib/auth-client'
import { setReportOpener } from '@/lib/report'
import type { ReportedError } from '@/lib/report'
import { toast } from '@/lib/toast'

// Mounted once at the root. Opened from the sidebar, error toasts and the error page.
export function ReportDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<ReportedError | undefined>()
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const { data: session } = useSession()
  // Guests have a made-up account email, so they're asked for a real one.
  const needsEmail = !session || session.user.isAnonymous === true

  useEffect(
    () =>
      setReportOpener((next) => {
        setError(next)
        setOpen(true)
      }),
    [],
  )

  const send = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/reports', {
          body: {
            description: description.trim(),
            page: window.location.pathname,
            ...(needsEmail && email.trim() && { email: email.trim() }),
            ...(error && { error }),
          },
        }),
      ),
    onSuccess: () => {
      toast.success("Thanks, we got it. We'll look into it.")
      setOpen(false)
      setDescription('')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. We read every report and reply by email.
          </DialogDescription>
        </DialogHeader>
        <form
          id="report-form"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            send.mutate()
          }}
        >
          {error && (
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <p className="font-medium">The error you saw</p>
              <p className="break-words text-muted-foreground">
                {error.message}
                {error.code && error.code !== 'UNKNOWN' && ` (${error.code})`}
              </p>
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="report-description">What happened?</FieldLabel>
            <Textarea
              id="report-description"
              rows={5}
              required
              minLength={3}
              maxLength={4000}
              placeholder="What you were doing, and what you expected to happen"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FieldDescription>
              Don't paste passwords. We get the page you're on and your browser,
              never your resume.
            </FieldDescription>
          </Field>
          {needsEmail && (
            <Field>
              <FieldLabel htmlFor="report-email">Your email</FieldLabel>
              <Input
                id="report-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="report-form"
            disabled={send.isPending || description.trim().length < 3}
          >
            {send.isPending && <Spinner data-icon="inline-start" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
