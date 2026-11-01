import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FileUpIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/lib/toast'
import { ImportDialog } from '@/components/app/import-dialog'
import { UnsavedChangesGuard } from '@/components/app/unsaved-changes-guard'
import { PageHeader } from '@/components/app/page-header'
import { ContentEditor } from '@/components/editor/content-editor'
import type { SaveState } from '@/components/editor/save-status'
import { SaveStatus } from '@/components/editor/save-status'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedEffect } from '@/hooks/use-debounced-effect'
import { api, unwrap } from '@/lib/api/client'
import { profileQuery, queryKeys } from '@/lib/api/queries'
import type { ResumeContent } from '@/lib/api/types'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_app/profile')({
  head: () => ({ meta: [{ title: `Profile | ${site.name}` }] }),
  loader: ({ context }) => context.queryClient.prefetchQuery(profileQuery),
  component: ProfilePage,
})

function hasContent(content: ResumeContent) {
  return content.basics.name.trim() !== '' || content.sections.length > 0
}

function ProfilePage() {
  const { data: profile, isPending } = useQuery(profileQuery)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
      {isPending || !profile ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </>
      ) : (
        <ProfileEditor initial={profile.content} />
      )}
    </div>
  )
}

function ProfileEditor({ initial }: { initial: ResumeContent }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [importOpen, setImportOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<ResumeContent | null>(null)
  const lastSaved = useRef(JSON.stringify(initial))
  const draft = JSON.stringify(content)

  const save = useMutation({
    mutationFn: (payload: string) =>
      unwrap(
        api.PUT('/v1/profile', {
          body: { content: JSON.parse(payload) as ResumeContent },
        }),
      ),
    onMutate: () => setSaveState('saving'),
    onSuccess: (data, payload) => {
      lastSaved.current = payload
      queryClient.setQueryData(queryKeys.profile, data)
      setSaveState((state) => (state === 'saving' ? 'saved' : state))
    },
    onError: () => setSaveState('error'),
  })

  useEffect(() => {
    if (draft !== lastSaved.current) setSaveState('unsaved')
  }, [draft])
  // Re-armed when a save settles, so edits made while it was in flight still save; a draft that just failed waits for the next edit.
  useDebouncedEffect(
    () => {
      const failed = save.isError && save.variables === draft
      if (draft !== lastSaved.current && !save.isPending && !failed)
        save.mutate(draft)
    },
    [draft, save.isPending],
    1200,
  )

  function applyImport(imported: ResumeContent) {
    setContent(imported)
    setPendingImport(null)
    toast.success(
      'Profile filled in from your resume. Check the details below.',
    )
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="Everything you have done, in one place. Resumes and tailoring pick from here, and never add anything that isn't in it."
        actions={
          <>
            <SaveStatus state={saveState} />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUpIcon data-icon="inline-start" />
              Import
            </Button>
          </>
        }
      />
      <ContentEditor value={content} onChange={setContent} />
      <UnsavedChangesGuard when={saveState !== 'saved'} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        description="Your resume becomes your profile. You can review and edit everything afterwards."
        onImported={(imported) =>
          hasContent(content)
            ? setPendingImport(imported)
            : applyImport(imported)
        }
      />
      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current profile?</AlertDialogTitle>
            <AlertDialogDescription>
              The imported resume will replace what's in your profile now.
              Resumes you've already made aren't affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current profile</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingImport && applyImport(pendingImport)}
            >
              Replace profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
