import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, unwrap } from '@/lib/api/client'
import { aiErrorMessage } from '@/lib/api/errors'
import { queryKeys } from '@/lib/api/queries'
import type { ProjectEntry } from './content-helpers'
import { ListField } from './fields'

type Draft = Awaited<ReturnType<typeof requestDraft>>['project']

function requestDraft(body: { url: string } | { text: string }) {
  return unwrap(api.POST('/v1/project-drafts', { body }))
}

// Writes a projects entry from a repo, a page or pasted text, then lets the user check it and add it or swap it in.
export function ProjectFromLink({
  open,
  onOpenChange,
  entries,
  onPlace,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: ProjectEntry[]
  onPlace: (entries: ProjectEntry[], added: ProjectEntry) => void
}) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dropped, setDropped] = useState<string[]>([])
  const [target, setTarget] = useState('new')

  const reset = () => {
    setUrl('')
    setText('')
    setNotes('')
    setDraft(null)
    setDropped([])
    setTarget('new')
  }
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const write = useMutation({
    mutationFn: () =>
      requestDraft({
        ...(kind === 'url' ? { url: url.trim() } : { text: text.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      }),
    onSuccess: (result) => {
      // A project from a link counts as an AI edit.
      queryClient.invalidateQueries({ queryKey: queryKeys.usage })
      setDraft(result.project)
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  })

  const place = () => {
    if (!draft) return
    const replaced = entries.find((entry) => entry.id === target)
    const entry: ProjectEntry = {
      id: draft.id,
      hidden: false,
      name: draft.name,
      ...(draft.url && { url: draft.url }),
      links: [],
      technologies: draft.technologies,
      bullets: draft.bullets
        .filter((bullet) => !dropped.includes(bullet.id))
        .map((bullet) => ({ id: bullet.id, text: bullet.text, hidden: false })),
    }
    onPlace(
      replaced
        ? entries.map((e) => (e.id === replaced.id ? entry : e))
        : [...entries, entry],
      entry,
    )
    toast.success(
      replaced
        ? `Replaced ${replaced.name || 'the project'} with ${entry.name}`
        : `Added ${entry.name}`,
    )
    close(false)
  }

  const flagged = draft?.bullets.flatMap((bullet) => bullet.flags) ?? []
  const ready =
    kind === 'url'
      ? /^https?:\/\/\S+\.\S+/.test(url.trim())
      : text.trim().length >= 40

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {draft ? 'Check the project' : 'Add a project from a link'}
          </DialogTitle>
          <DialogDescription>
            {draft
              ? 'Edit anything, untick bullets you don’t want, then add it or swap it in.'
              : 'Paste a GitHub repo or the project’s website. AI writes the entry using only what the page and your notes say.'}
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <form
            id="project-from-link"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (ready && !write.isPending) write.mutate()
            }}
          >
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={kind}
              onValueChange={(value) => value && setKind(value as typeof kind)}
              aria-label="Source"
              className="self-start"
            >
              <ToggleGroupItem value="url">Link</ToggleGroupItem>
              <ToggleGroupItem value="text">Paste text</ToggleGroupItem>
            </ToggleGroup>
            {kind === 'url' ? (
              <Field>
                <FieldLabel htmlFor="project-url">
                  GitHub repo or website
                </FieldLabel>
                <Input
                  id="project-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://github.com/you/project"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
                <FieldDescription>
                  Private repo? Choose Paste text and paste its README instead.
                </FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="project-text">
                  About the project
                </FieldLabel>
                <Textarea
                  id="project-text"
                  rows={6}
                  placeholder="Paste the README or a few lines on what the project does and what it's built with."
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="project-notes">
                What did you do on it? (optional)
              </FieldLabel>
              <Textarea
                id="project-notes"
                rows={3}
                placeholder="Built the payments flow and the admin dashboard. 300 people signed up in the first month."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <FieldDescription>
                Your part and any results. Bullets read much better with this.
              </FieldDescription>
            </Field>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="draft-name">Project name</FieldLabel>
              <Input
                id="draft-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </Field>
            <ListField
              id="draft-tech"
              label="Technologies"
              value={draft.technologies}
              onChange={(technologies) => setDraft({ ...draft, technologies })}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Bullets</legend>
              {draft.bullets.map((bullet) => (
                <div key={bullet.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`keep-${bullet.id}`}
                    className="mt-2.5"
                    aria-label="Keep this bullet"
                    checked={!dropped.includes(bullet.id)}
                    onCheckedChange={(checked) =>
                      setDropped(
                        checked
                          ? dropped.filter((id) => id !== bullet.id)
                          : [...dropped, bullet.id],
                      )
                    }
                  />
                  <Textarea
                    aria-label="Bullet"
                    rows={2}
                    className="min-h-0 field-sizing-content resize-none"
                    value={bullet.text}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        bullets: draft.bullets.map((b) =>
                          b.id === bullet.id
                            ? { ...b, text: event.target.value }
                            : b,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </fieldset>
            {flagged.length > 0 && (
              <p className="rounded-md bg-highlight px-3 py-2 text-sm text-highlight-foreground">
                Check before adding: {[...new Set(flagged)].join(', ')}{' '}
                {flagged.length === 1 ? "isn't" : "aren't"} on the page or in
                your notes.
              </p>
            )}
            <Field>
              <FieldLabel htmlFor="draft-target">Where it goes</FieldLabel>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="draft-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Add as a new project</SelectItem>
                  {entries.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      Replace {entry.name || 'untitled project'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        <DialogFooter>
          {draft ? (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Back
              </Button>
              <Button onClick={place} disabled={!draft.name.trim()}>
                {target === 'new' ? 'Add project' : 'Replace project'}
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              form="project-from-link"
              disabled={!ready || write.isPending}
            >
              {write.isPending && <Spinner data-icon="inline-start" />}
              {write.isPending ? 'Reading the project…' : 'Write the entry'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
