import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangleIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { queryKeys, usageQuery } from '@/lib/api/queries'
import type { ResumeContent, Suggestion } from '@/lib/api/types'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OperationBody, OperationTitle } from './describe-operation'

export function SuggestionReview({
  resumeId,
  suggestion,
  content,
  texSource,
  onApplied,
  onDiscard,
  hasUnsavedChanges,
}: {
  resumeId: string
  suggestion: Suggestion
  content: ResumeContent | null
  texSource: string | null
  onApplied: () => void
  onDiscard: () => void
  hasUnsavedChanges: boolean
}) {
  const queryClient = useQueryClient()
  const { data: usage } = useQuery(usageQuery)
  // Anything that might add facts the user never gave starts unchecked, and "Apply all" leaves it out.
  const safeIds = suggestion.operations
    .filter((op) => op.flags.length === 0)
    .map((op) => op.id)
  const flaggedCount = suggestion.operations.length - safeIds.length
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set(safeIds))
  const [reviewing, setReviewing] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.resume(resumeId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.versions(resumeId) })
  }

  // Runs after this component unmounts, so it can't be a mutation hook here.
  const undo = (fromVersionId: string) =>
    unwrap(
      api.POST('/v1/resumes/{resumeId}/versions', {
        params: { path: { resumeId } },
        body: { kind: 'restore', fromVersionId },
      }),
    ).then(
      () => {
        refresh()
        toast.success('Changes undone. They are still in history.')
      },
      (error) => toast.error(errorMessage(error)),
    )

  const apply = useMutation({
    mutationFn: (ids: string[]) =>
      unwrap(
        api.POST('/v1/resumes/{resumeId}/versions', {
          params: { path: { resumeId } },
          body: {
            kind: 'ai',
            suggestionId: suggestion.id,
            acceptedOperationIds: ids,
          },
        }),
      ),
    onSuccess: (version, ids) => {
      refresh()
      queryClient.invalidateQueries({
        queryKey: queryKeys.suggestions(resumeId),
      })
      const { parentId } = version
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'change' : 'changes'} applied`,
        parentId
          ? {
              duration: 8000,
              action: { label: 'Undo', onClick: () => undo(parentId) },
            }
          : undefined,
      )
      onApplied()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const { costUsdMicros, byok } = suggestion
  const cost = typeof costUsdMicros === 'number' && (
    <p className="text-xs text-muted-foreground">
      This run cost{' '}
      {costUsdMicros > 0 && costUsdMicros < 10_000
        ? `less than ${formatUsd(10_000)}`
        : formatUsd(costUsdMicros)}
      {byok && ' on your own key'}
    </p>
  )

  // Also what a weak model looks like: the server drops changes that point at items that don't exist.
  if (suggestion.operations.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Nothing to change</p>
          <p className="text-sm text-muted-foreground">
            {usage?.ownAiKey
              ? "The AI didn't suggest any changes for this request. If you expected some, try again or pick a stronger model in your AI provider settings."
              : "The AI didn't suggest any changes for this request, so it didn't use one of your AI edits. If you expected some, ask for something more specific."}
          </p>
        </div>
        {suggestion.summary && (
          <p className="text-sm break-words text-muted-foreground">
            The model said: {suggestion.summary}
          </p>
        )}
        {cost}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onDiscard}>
            Back
          </Button>
          {usage?.ownAiKey && (
            <Button variant="ghost" asChild>
              <Link to="/settings" search={{ tab: 'ai' }}>
                AI provider settings
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const toggle = (id: string, checked: boolean) =>
    setAccepted((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const header = (suggestion.summary || cost) && (
    <div className="flex flex-col gap-2 pb-4">
      {suggestion.summary && (
        <p className="flex items-start gap-2 text-sm">
          <SparklesIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          {suggestion.summary}
        </p>
      )}
      {cost}
    </div>
  )

  if (!reviewing) {
    const count = suggestion.operations.length
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <p className="text-sm font-medium">
          {count} {count === 1 ? 'change' : 'changes'} ready
        </p>
        <ul className="mt-2 flex min-h-0 flex-1 list-disc flex-col gap-1 overflow-y-auto pr-1 pl-5 text-sm text-muted-foreground">
          {suggestion.operations.map((op) => (
            <li key={op.id} className="break-words">
              <OperationTitle op={op} content={content} />
            </li>
          ))}
        </ul>
        {flaggedCount > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangleIcon
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0"
            />
            {safeIds.length > 0
              ? `Apply all leaves out ${flaggedCount} ${flaggedCount === 1 ? 'change that may add a fact' : 'changes that may add facts'} you never gave. Review to include ${flaggedCount === 1 ? 'it' : 'them'}.`
              : 'These changes may add facts you never gave. Review them before applying.'}
          </p>
        )}
        {hasUnsavedChanges && (
          <p className="mt-3 text-xs text-muted-foreground">
            Saving your edits... Apply is available once they're saved.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          {safeIds.length > 0 && (
            <Button
              onClick={() => apply.mutate(safeIds)}
              disabled={apply.isPending || hasUnsavedChanges}
            >
              {apply.isPending && <Spinner data-icon="inline-start" />}
              Apply all
            </Button>
          )}
          <Button
            variant={safeIds.length > 0 ? 'outline' : 'default'}
            onClick={() => setReviewing(true)}
            disabled={apply.isPending}
          >
            Review changes
          </Button>
          <Button variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}

      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {suggestion.operations.map((op) => {
          const checked = accepted.has(op.id)
          const flagged = op.flags.length > 0
          return (
            <li
              key={op.id}
              className={cn(
                'rounded-lg border bg-card p-3 transition-opacity',
                flagged && 'border-destructive/40',
                !checked && 'opacity-60',
              )}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggle(op.id, value === true)}
                  className="mt-0.5"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-sm font-medium">
                    <OperationTitle op={op} content={content} />
                  </span>
                  <OperationBody
                    op={op}
                    content={content}
                    texSource={texSource}
                  />
                  <span className="text-xs text-muted-foreground">
                    {op.reason}
                  </span>
                  {flagged && (
                    <span className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                      {op.flags.join('. ')}. Only accept this if it's true.
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {hasUnsavedChanges && (
        <p className="mb-3 text-xs text-muted-foreground">
          Saving your edits... Apply is available once they're saved.
        </p>
      )}
      <div className="flex items-center gap-2 border-t pt-4">
        <Button
          onClick={() => apply.mutate([...accepted])}
          disabled={accepted.size === 0 || apply.isPending || hasUnsavedChanges}
        >
          {apply.isPending && <Spinner data-icon="inline-start" />}
          Apply {accepted.size} {accepted.size === 1 ? 'change' : 'changes'}
        </Button>
        <Button variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}
