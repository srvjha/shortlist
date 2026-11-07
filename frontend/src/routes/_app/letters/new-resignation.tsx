import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SaveIcon } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { ResignationForm } from '@/components/letters/resignation-form'
import { Button } from '@/components/ui/button'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queries'
import { site } from '@/lib/site'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/_app/letters/new-resignation')({
  head: () => ({ meta: [{ title: `Resignation letter | ${site.name}` }] }),
  component: NewResignationPage,
})

function NewResignationPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const save = useMutation({
    mutationFn: (letter: { title: string; body: string }) =>
      unwrap(
        api.POST('/v1/letters', {
          body: { kind: 'resignation', ...letter },
        }),
      ),
    onSuccess: (letter) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters })
      void navigate({
        to: '/letters/$letterId',
        params: { letterId: letter.id },
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8">
      <PageHeader
        title="Resignation letter"
        description="Doesn't use any AI or count toward any limit. Save it to download a PDF."
      />
      <ResignationForm
        actions={(letter) => (
          <Button
            className="min-h-11"
            disabled={save.isPending}
            onClick={() => save.mutate(letter)}
          >
            <SaveIcon data-icon="inline-start" />
            {save.isPending ? 'Saving…' : 'Save letter'}
          </Button>
        )}
      />
    </div>
  )
}
