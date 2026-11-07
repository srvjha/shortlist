import { useMutation } from '@tanstack/react-query'
import { SparklesIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  LetterFlags,
  LetterTextActions,
} from '@/components/letters/letter-actions'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage, unwrap } from '@/lib/api/client'

const minResume = 200
const maxResume = 15_000
const minJob = 100
const maxJob = 12_000

export function CoverLetterTool() {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [body, setBody] = useState('')
  const result = useRef<HTMLHeadingElement>(null)

  const write = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/public/cover-letters', {
          body: {
            resumeText: resumeText.trim(),
            jobDescription: jobDescription.trim(),
          },
        }),
      ),
    onSuccess: (letter) => setBody(letter.body),
  })

  useEffect(() => {
    if (write.isSuccess) result.current?.focus()
  }, [write.isSuccess])

  const resumeLength = resumeText.trim().length
  const jobLength = jobDescription.trim().length
  const resumeShort = resumeLength > 0 && resumeLength < minResume
  const jobShort = jobLength > 0 && jobLength < minJob

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          write.mutate()
        }}
      >
        <FieldGroup className="gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field data-invalid={resumeShort}>
              <FieldLabel htmlFor="cover-resume">Your resume</FieldLabel>
              <Textarea
                id="cover-resume"
                rows={12}
                maxLength={maxResume}
                placeholder="Copy everything from your resume and paste it here"
                aria-invalid={resumeShort}
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
              />
              {resumeShort ? (
                <FieldError>
                  Paste the whole resume. This is {resumeLength} characters; it
                  needs at least {minResume}.
                </FieldError>
              ) : (
                <FieldDescription>
                  The letter uses only what's written here.
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={jobShort}>
              <FieldLabel htmlFor="cover-job">The job description</FieldLabel>
              <Textarea
                id="cover-job"
                rows={12}
                maxLength={maxJob}
                placeholder="Paste the full job description"
                aria-invalid={jobShort}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
              />
              {jobShort ? (
                <FieldError>
                  Paste the full description. This is {jobLength} characters; it
                  needs at least {minJob}.
                </FieldError>
              ) : (
                <FieldDescription>
                  Used to pick what to mention. Nothing you paste is saved.
                </FieldDescription>
              )}
            </Field>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Button
              type="submit"
              className="min-h-11"
              disabled={
                write.isPending ||
                resumeLength < minResume ||
                jobLength < minJob
              }
            >
              <SparklesIcon data-icon="inline-start" />
              {write.isPending
                ? 'Writing your letter…'
                : 'Write my cover letter'}
            </Button>
            {write.isError && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(write.error)}
              </p>
            )}
          </div>
        </FieldGroup>
      </form>

      {write.data && (
        <section className="flex flex-col gap-4" aria-labelledby="cover-result">
          <h2
            id="cover-result"
            ref={result}
            tabIndex={-1}
            className="font-sans text-xl font-semibold outline-none"
          >
            Your cover letter
          </h2>
          <LetterFlags flags={write.data.flags} body={body} />
          <Field>
            <FieldLabel htmlFor="cover-letter" className="sr-only">
              Your cover letter
            </FieldLabel>
            <Textarea
              id="cover-letter"
              rows={18}
              maxLength={10_000}
              className="bg-card font-serif text-base leading-relaxed"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <LetterTextActions title="cover letter" body={body} />
          </div>
        </section>
      )}
    </div>
  )
}
