import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queries'

export function SaveTemplateDialog({
  open,
  onOpenChange,
  resumeId,
  defaultName,
  title = 'Save as template',
  description = 'Start new resumes from a copy of this one. Changes you make to the resume later don’t affect the template.',
  cancelLabel = 'Cancel',
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumeId: string
  defaultName: string
  title?: string
  description?: string
  cancelLabel?: string
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState(defaultName)

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/custom-templates', {
          body: { type: 'resume', resumeId, name: name.trim() || defaultName },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customTemplates })
      onOpenChange(false)
      toast.success('Saved as a template', {
        action: {
          label: 'View',
          onClick: () => navigate({ to: '/my-templates' }),
        },
      })
      onDone?.()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="template-name">Template name</FieldLabel>
            <Input
              id="template-name"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldDescription>
              It shows up under Your templates when you create a resume.
            </FieldDescription>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onDone?.()
              }}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner data-icon="inline-start" />}
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
