import { CheckIcon, CloudOffIcon } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

export function SaveStatus({
  state,
  problem,
}: {
  state: SaveState
  problem?: string | null
}) {
  return (
    <span
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
      aria-live="polite"
    >
      {state === 'saving' && (
        <>
          <Spinner />
          Saving…
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckIcon className="size-4" />
          Saved
        </>
      )}
      {state === 'unsaved' && 'Unsaved changes'}
      {state === 'error' && (
        <span className="flex items-center gap-1.5 text-destructive">
          <CloudOffIcon className="size-4" />
          {problem ? `Couldn't save: ${problem}` : "Couldn't save"}
        </span>
      )}
    </span>
  )
}
