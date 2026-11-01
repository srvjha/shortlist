import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import { TemplateEditor } from '@/components/templates/template-editor'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { customTemplateQuery, queryKeys } from '@/lib/api/queries'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/my-templates/$customTemplateId')({
  head: () => ({ meta: [{ title: `Edit template | ${site.name}` }] }),
  component: EditTemplatePage,
})

function EditTemplatePage() {
  const { customTemplateId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: template, error } = useQuery(
    customTemplateQuery(customTemplateId),
  )
  const update = useMutation({
    mutationFn: (body: { name: string; texSource: string }) =>
      unwrap(
        api.PATCH('/v1/custom-templates/{customTemplateId}', {
          params: { path: { customTemplateId } },
          body,
        }),
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        queryKeys.customTemplate(customTemplateId),
        saved,
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.customTemplates,
        exact: true,
      })
      toast.success('Template saved')
    },
    onError: (saveError) => toast.error(errorMessage(saveError)),
  })

  if (error) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">{errorMessage(error)}</p>
        <Button variant="outline" asChild>
          <Link to="/my-templates">Back to templates</Link>
        </Button>
      </div>
    )
  }
  if (!template) {
    return (
      <div className="grid h-svh gap-4 p-6 lg:grid-cols-2">
        <Skeleton className="h-full" />
        <Skeleton className="h-full" />
      </div>
    )
  }
  if (template.mode !== 'code') {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">
          This template was saved from a form resume
        </p>
        <p className="max-w-md text-muted-foreground">
          Create a resume from it and edit it there. To change the template
          itself, save that resume as a new template.
        </p>
        <Button asChild>
          <Link
            to="/resumes/new"
            search={{ source: 'blank', customTemplate: template.id }}
          >
            Create a resume from it
          </Link>
        </Button>
      </div>
    )
  }
  return (
    <TemplateEditor
      initialName={template.name}
      initialTex={template.texSource ?? ''}
      saving={update.isPending}
      saveLabel="Save changes"
      onSave={update.mutateAsync}
    />
  )
}
