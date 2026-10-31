import { useMutation } from '@tanstack/react-query'
import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import type { Suggestion } from '@/lib/api/types'

// Shown once a suggestion is applied. The rating is saved on the first click,
// so closing the card early still keeps it.
export function FeedbackCard({
  resumeId,
  suggestion,
  onDone,
}: {
  resumeId: string
  suggestion: Pick<Suggestion, 'id' | 'type'>
  onDone: () => void
}) {
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [contactOk, setContactOk] = useState(false)
  const save = useMutation({
    mutationFn: (body: {
      helpful: boolean
      comment?: string
      contactOk: boolean
    }) =>
      unwrap(
        api.PUT('/v1/resumes/{resumeId}/suggestions/{suggestionId}/feedback', {
          params: { path: { resumeId, suggestionId: suggestion.id } },
          body,
        }),
      ),
    onError: (error) => toast.error(errorMessage(error)),
  })

  const rate = (value: boolean) => {
    setHelpful(value)
    save.mutate({ helpful: value, contactOk: false })
  }
  const send = () =>
    helpful !== null &&
    save.mutate(
      { helpful, comment: comment.trim() || undefined, contactOk },
      {
        onSuccess: () => {
          toast.success('Thanks, that helps us improve it')
          onDone()
        },
      },
    )

  return (
    <section
      aria-labelledby="ai-feedback"
      className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <h3 id="ai-feedback" className="text-sm font-semibold">
        {suggestion.type === 'tailor'
          ? 'Did the tailoring help?'
          : 'Did that change help?'}
      </h3>
      <div className="flex gap-2">
        <Button
          variant={helpful === true ? 'default' : 'outline'}
          size="sm"
          aria-pressed={helpful === true}
          onClick={() => rate(true)}
        >
          <ThumbsUpIcon data-icon="inline-start" />
          Yes
        </Button>
        <Button
          variant={helpful === false ? 'default' : 'outline'}
          size="sm"
          aria-pressed={helpful === false}
          onClick={() => rate(false)}
        >
          <ThumbsDownIcon data-icon="inline-start" />
          Not really
        </Button>
        {helpful === null && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onDone}
          >
            Skip
          </Button>
        )}
      </div>
      {helpful !== null && (
        <>
          <Textarea
            aria-label="What could be better? (optional)"
            rows={3}
            maxLength={2000}
            placeholder={
              helpful
                ? 'What did you like? (optional)'
                : 'What went wrong or was missing? (optional)'
            }
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <Label className="font-normal">
            <Checkbox
              checked={contactOk}
              onCheckedChange={(value) => setContactOk(value === true)}
            />
            You can email me about this
          </Label>
          <div className="flex gap-2">
            <Button size="sm" disabled={save.isPending} onClick={send}>
              {save.isPending && <Spinner data-icon="inline-start" />}
              Send
            </Button>
            <Button variant="ghost" size="sm" onClick={onDone}>
              Close
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
