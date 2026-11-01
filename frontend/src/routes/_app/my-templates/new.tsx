import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import { TemplateEditor } from '@/components/templates/template-editor'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queries'
import { site } from '@/lib/site'
import { blankLatex } from '@/lib/templates'

export const Route = createFileRoute('/_app/my-templates/new')({
  head: () => ({ meta: [{ title: `New template | ${site.name}` }] }),
  component: NewTemplatePage,
})

function NewTemplatePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const create = useMutation({
    mutationFn: (body: { name: string; texSource: string }) =>
      unwrap(
        api.POST('/v1/custom-templates', { body: { type: 'tex', ...body } }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customTemplates })
      toast.success('Template saved')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <TemplateEditor
      isNew
      initialName=""
      initialTex={blankLatex}
      saving={create.isPending}
      saveLabel="Save template"
      onSave={create.mutateAsync}
      onSaved={(template) =>
        navigate({
          to: '/my-templates/$customTemplateId',
          params: { customTemplateId: template.id },
          replace: true,
        })
      }
    />
  )
}
