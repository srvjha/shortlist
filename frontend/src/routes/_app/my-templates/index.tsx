import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CodeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { TemplatePreview } from '@/components/templates/template-preview'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { PageHeader } from '@/components/app/page-header'
import {
  BlankPageSheet,
  LatexSheet,
  ResumeSheet,
  Sheet,
} from '@/components/app/paper-sheets'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import { customTemplatesQuery, queryKeys } from '@/lib/api/queries'
import type { CustomTemplateSummary } from '@/lib/api/types'
import { timeAgo } from '@/lib/format'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'

export const Route = createFileRoute('/_app/my-templates/')({
  head: () => ({ meta: [{ title: `Templates | ${site.name}` }] }),
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(customTemplatesQuery),
  component: TemplatesPage,
})

const cardLink =
  'font-medium after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background'

const grid = 'grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4'

function TemplatesPage() {
  const templates = useQuery(customTemplatesQuery)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-8 sm:px-8">
      <PageHeader
        title="Templates"
        description="Starting points for new resumes. Use a built-in layout, a blank page, or one you made."
        actions={
          <Button asChild>
            <Link to="/my-templates/new">
              <PlusIcon data-icon="inline-start" />
              Create template
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="yours" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="yours" className="text-xl font-semibold tracking-tight">
            Your templates
          </h2>
          <p className="text-sm text-muted-foreground">
            Write one in LaTeX, or save any resume as a template from its menu.
          </p>
        </div>
        {templates.isPending ? (
          <div className={grid}>
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-17/13 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : templates.isError ? (
          <p className="text-destructive">
            {errorMessage(templates.error)}{' '}
            <button
              type="button"
              className="font-medium underline underline-offset-4"
              onClick={() => templates.refetch()}
            >
              Try again
            </button>
          </p>
        ) : (
          <ul className={grid}>
            {templates.data.map((template) => (
              <CustomTemplateCard key={template.id} template={template} />
            ))}
            <li className="group relative flex flex-col gap-3">
              <div className="flex aspect-17/13 w-full items-center justify-center rounded-[3px] border border-dashed border-foreground/20 text-muted-foreground transition-colors group-hover:border-primary/60 group-hover:text-primary">
                <CodeIcon className="size-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Link to="/my-templates/new" className={cardLink}>
                  Create template
                </Link>
                <p className="text-sm text-muted-foreground">
                  Write your own layout in LaTeX
                </p>
              </div>
            </li>
          </ul>
        )}
      </section>

      <section aria-labelledby="built-in" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="built-in" className="text-xl font-semibold tracking-tight">
            Built-in
          </h2>
          <p className="text-sm text-muted-foreground">
            Fill these in with a form. The blank page is for writing LaTeX from
            scratch.
          </p>
        </div>
        <ul className={grid}>
          <li className="group relative flex flex-col gap-3">
            <BlankPageSheet />
            <div className="flex flex-col gap-0.5">
              <Link
                to="/resumes/new"
                search={{ source: 'blank', template: 'blank' }}
                className={cardLink}
              >
                Blank page
              </Link>
              <p className="text-sm text-muted-foreground">
                Start from scratch in LaTeX
              </p>
            </div>
          </li>
          {templateCatalog.map((template) => (
            <li
              key={template.id}
              className="group group/card relative flex flex-col gap-3"
            >
              <Sheet className="p-0">
                <img
                  src={`/templates/${template.id}.png`}
                  alt=""
                  width={1020}
                  height={1320}
                  loading="lazy"
                  className="w-full"
                />
              </Sheet>
              {/* Above the card's full-size link, so it opens the preview instead of a new resume. */}
              <TemplatePreview
                templateId={template.id}
                className="absolute top-2 right-2 z-10"
              />
              <div className="flex flex-col gap-0.5">
                <Link
                  to="/resumes/new"
                  search={{ source: 'blank', template: template.id }}
                  className={cardLink}
                >
                  {template.name}
                </Link>
                <p className="text-sm text-muted-foreground">Form layout</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function CustomTemplateCard({ template }: { template: CustomTemplateSummary }) {
  const queryClient = useQueryClient()
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(template.name)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.customTemplates })

  const rename = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/v1/custom-templates/{customTemplateId}', {
          params: { path: { customTemplateId: template.id } },
          body: { name: name.trim() || template.name },
        }),
      ),
    onSuccess: () => {
      refresh()
      setRenaming(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () =>
      expectOk(
        api.DELETE('/v1/custom-templates/{customTemplateId}', {
          params: { path: { customTemplateId: template.id } },
        }),
      ),
    onSuccess: () => {
      refresh()
      toast.success('Template deleted')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <li className="group relative flex flex-col gap-3">
      {template.mode === 'code' ? (
        <LatexSheet />
      ) : (
        <ResumeSheet title={template.name} tailored={false} />
      )}
      <div className="flex items-start gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            to="/resumes/new"
            search={{ source: 'blank', customTemplate: template.id }}
            className={`truncate ${cardLink}`}
          >
            {template.name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {template.mode === 'code' ? 'LaTeX' : 'Form'}, edited{' '}
            {timeAgo(template.updatedAt)}
          </p>
        </div>
        <div className="relative z-10 -mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${template.name}`}
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {template.mode === 'code' && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/my-templates/$customTemplateId"
                      params={{ customTemplateId: template.id }}
                    >
                      <CodeIcon />
                      Edit LaTeX
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setRenaming(true)}>
                  <PencilIcon />
                  Rename
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
        </div>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-md">
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              rename.mutate()
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename template</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`rename-${template.id}`}>Name</FieldLabel>
              <Input
                id={`rename-${template.id}`}
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenaming(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={rename.isPending}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${template.name}”?`}
        description="Resumes you already made from it stay as they are."
        confirmLabel="Delete template"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </li>
  )
}
