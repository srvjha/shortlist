import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, FileDownIcon, SaveIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { PageHeader } from '@/components/app/page-header'
import { UnsavedChangesGuard } from '@/components/app/unsaved-changes-guard'
import {
  LetterFlags,
  LetterTextActions,
} from '@/components/letters/letter-actions'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import { letterQuery, queryKeys } from '@/lib/api/queries'
import { downloadFile } from '@/lib/download'
import { site } from '@/lib/site'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/_app/letters/$letterId')({
  head: () => ({ meta: [{ title: `Letter | ${site.name}` }] }),
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(letterQuery(params.letterId)),
  component: LetterPage,
})

function LetterPage() {
  const { letterId } = Route.useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: letter, isError } = useQuery(letterQuery(letterId))
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!letter) return
    setTitle(letter.title)
    setBody(letter.body)
    // Only when another letter opens: a refetch must not overwrite what's being typed.
  }, [letter?.id])

  const dirty = Boolean(
    letter && (title !== letter.title || body !== letter.body),
  )
  const canSave = title.trim().length > 0 && body.trim().length > 0

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/v1/letters/{letterId}', {
          params: { path: { letterId } },
          body: { title: title.trim(), body: body.trim() },
        }),
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.letter(letterId), saved)
      queryClient.invalidateQueries({
        queryKey: queryKeys.letters,
        exact: true,
      })
      setTitle(saved.title)
      setBody(saved.body)
    },
  })

  const remove = useMutation({
    mutationFn: () =>
      expectOk(
        api.DELETE('/v1/letters/{letterId}', {
          params: { path: { letterId } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters })
      toast.success('Letter deleted')
      void navigate({ to: '/letters' })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  async function downloadPdf() {
    setDownloading(true)
    try {
      if (dirty) await save.mutateAsync()
      await downloadFile(
        `/v1/letters/${letterId}/pdf?download=true`,
        `${title.trim() || 'letter'}.pdf`,
      )
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDownloading(false)
    }
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
        <p role="alert" className="text-muted-foreground">
          This letter couldn't be opened. It may have been deleted.
        </p>
        <Button variant="link" className="px-0" asChild>
          <Link to="/letters">Back to letters</Link>
        </Button>
      </div>
    )
  }
  if (!letter) return <Skeleton className="m-8 h-96" />

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
      <UnsavedChangesGuard when={dirty} />
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/letters">
          <ArrowLeftIcon data-icon="inline-start" />
          Letters
        </Link>
      </Button>
      <PageHeader
        title={letter.kind === 'cover' ? 'Cover letter' : 'Resignation letter'}
        description={
          letter.kind === 'cover'
            ? 'Read it through and make it sound like you before you send it.'
            : 'Check the dates against your contract before you send it.'
        }
      />

      {letter.kind === 'cover' && (
        <LetterFlags flags={letter.flags} body={body} />
      )}

      <Field>
        <FieldLabel htmlFor="letter-title">Name</FieldLabel>
        <Input
          id="letter-title"
          className="min-h-11"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="letter-body">Letter</FieldLabel>
        <Textarea
          id="letter-body"
          rows={20}
          maxLength={10_000}
          className="bg-card font-serif text-base leading-relaxed"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(save.error)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          disabled={!dirty || !canSave || save.isPending}
          onClick={() => save.mutate()}
        >
          <SaveIcon data-icon="inline-start" />
          {save.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={downloading || !canSave}
          onClick={downloadPdf}
        >
          <FileDownIcon data-icon="inline-start" />
          {downloading ? 'Preparing PDF…' : 'Download PDF'}
        </Button>
        <LetterTextActions title={title} body={body} />
        <Button
          variant="ghost"
          className="min-h-11 text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this letter?"
        description="This can't be undone."
        confirmLabel="Delete letter"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
