import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SaveTemplateDialog } from '@/components/templates/save-template-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import type { ResumeSummary } from '@/lib/api/types'
import { downloadFile } from '@/lib/download'

export function ResumeActions({ resume }: { resume: ResumeSummary }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['resumes'] })

  const archive = useMutation({
    mutationFn: (archived: boolean) =>
      unwrap(
        api.PATCH('/v1/resumes/{resumeId}', {
          params: { path: { resumeId: resume.id } },
          body: { archived },
        }),
      ),
    onSuccess: (_data, archived) => {
      refresh()
      toast.success(archived ? 'Resume archived' : 'Resume restored', {
        action: archived
          ? { label: 'Undo', onClick: () => archive.mutate(false) }
          : undefined,
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  // A LaTeX copy of a form resume is the template's code; the form original stays as it is.
  const duplicate = useMutation({
    mutationFn: (mode: typeof resume.mode) =>
      unwrap(
        api.POST('/v1/resumes', {
          body: {
            title: `${resume.title} (${mode === resume.mode ? 'copy' : 'LaTeX'})`,
            mode,
            ...(resume.templateId && { templateId: resume.templateId }),
            source: { type: 'resume', resumeId: resume.id },
          },
        }),
      ),
    onSuccess: (copy) => {
      refresh()
      toast.success('Copy created', {
        action: {
          label: 'Open',
          onClick: () =>
            navigate({
              to: '/resumes/$resumeId',
              params: { resumeId: copy.id },
            }),
        },
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () =>
      expectOk(
        api.DELETE('/v1/resumes/{resumeId}', {
          params: { path: { resumeId: resume.id } },
        }),
      ),
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      toast.success('Resume deleted')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  async function download() {
    try {
      await downloadFile(
        `/v1/resumes/${resume.id}/pdf?download=true`,
        `${resume.title}.pdf`,
      )
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${resume.title}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={download}>
              <DownloadIcon />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicate.mutate(resume.mode)}>
              <CopyIcon />
              Make a copy
            </DropdownMenuItem>
            {resume.mode === 'structured' && (
              <DropdownMenuItem onSelect={() => duplicate.mutate('code')}>
                <CodeIcon />
                Copy as LaTeX
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setSavingTemplate(true)}>
              <LayoutTemplateIcon />
              Save as template
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => archive.mutate(!resume.archivedAt)}
            >
              {resume.archivedAt ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
              {resume.archivedAt ? 'Restore' : 'Archive'}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SaveTemplateDialog
        open={savingTemplate}
        onOpenChange={setSavingTemplate}
        resumeId={resume.id}
        defaultName={resume.title}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              Delete “{resume.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The resume, its versions and its share links stop working right
              away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => remove.mutate()}
            >
              Delete resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
