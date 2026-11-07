import { RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { LetterTextActions } from '@/components/letters/letter-actions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  defaultNoticeDays,
  formatDay,
  lastWorkingDay,
  resignationLetter,
  resignationTitle,
  todayLocal,
} from '@/lib/resignation'
import type { Region, ResignationInput, Tone } from '@/lib/resignation'

const toNumber = (value: string) => {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? 0 : Math.min(Math.max(number, 0), 365)
}

// The letter updates as the form changes. Once the user types in the letter, their text stays until they reset it.
export function ResignationForm({
  actions,
}: {
  // Extra buttons beside copy and download, such as saving to the account.
  actions?: (letter: { title: string; body: string }) => React.ReactNode
}) {
  const [input, setInput] = useState<ResignationInput>(() => ({
    region: 'india',
    tone: 'formal',
    name: '',
    role: '',
    company: '',
    manager: '',
    resignDate: todayLocal(),
    noticeDays: defaultNoticeDays.india,
    buyoutDays: 0,
    reason: '',
    handover: true,
    exitDocuments: true,
  }))
  const [edited, setEdited] = useState<string | null>(null)
  const set = <TKey extends keyof ResignationInput>(
    key: TKey,
    value: ResignationInput[TKey],
  ) => setInput((current) => ({ ...current, [key]: value }))

  const india = input.region === 'india'
  const body = edited ?? resignationLetter(input)
  const title = resignationTitle(input)
  const lastDay = lastWorkingDay(
    input.resignDate,
    input.noticeDays,
    india ? input.buyoutDays : 0,
  )

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="resign-region">Where you work</FieldLabel>
            <Select
              value={input.region}
              onValueChange={(value) => {
                const region = value as Region
                setInput((current) => ({
                  ...current,
                  region,
                  noticeDays: defaultNoticeDays[region],
                }))
              }}
            >
              <SelectTrigger id="resign-region" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="other">US and elsewhere</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-tone">Tone</FieldLabel>
            <Select
              value={input.tone}
              onValueChange={(value) => set('tone', value as Tone)}
            >
              <SelectTrigger id="resign-tone" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="brief">Short and direct</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-name">Your name</FieldLabel>
            <Input
              id="resign-name"
              className="min-h-11"
              autoComplete="name"
              maxLength={100}
              value={input.name}
              onChange={(event) => set('name', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-role">Your role</FieldLabel>
            <Input
              id="resign-role"
              className="min-h-11"
              autoComplete="organization-title"
              maxLength={100}
              value={input.role}
              onChange={(event) => set('role', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-company">Company</FieldLabel>
            <Input
              id="resign-company"
              className="min-h-11"
              autoComplete="organization"
              maxLength={100}
              value={input.company}
              onChange={(event) => set('company', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-manager">
              Manager's name (optional)
            </FieldLabel>
            <Input
              id="resign-manager"
              className="min-h-11"
              maxLength={100}
              value={input.manager}
              onChange={(event) => set('manager', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-date">Date of this letter</FieldLabel>
            <Input
              id="resign-date"
              type="date"
              className="min-h-11"
              value={input.resignDate}
              onChange={(event) => set('resignDate', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resign-notice">
              Notice period (days)
            </FieldLabel>
            <Input
              id="resign-notice"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              className="min-h-11"
              value={input.noticeDays}
              onChange={(event) =>
                set('noticeDays', toNumber(event.target.value))
              }
            />
          </Field>
          {india && (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="resign-buyout">
                Days to buy out (optional)
              </FieldLabel>
              <Input
                id="resign-buyout"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                className="min-h-11"
                value={input.buyoutDays}
                onChange={(event) =>
                  set('buyoutDays', toNumber(event.target.value))
                }
              />
              <FieldDescription>
                Notice days you would pay off instead of serving. Your employer
                has to agree.
              </FieldDescription>
            </Field>
          )}
        </div>

        <p
          className="rounded-lg border bg-card px-4 py-3 text-sm"
          aria-live="polite"
        >
          Last working day:{' '}
          <strong className="font-semibold">
            {formatDay(lastDay, input.region)}
          </strong>
          <span className="mt-1 block text-muted-foreground">
            Counted in calendar days from the day after the letter. Check your
            contract, as some count differently.
          </span>
        </p>

        <Field>
          <FieldLabel htmlFor="resign-reason">
            Reason for leaving (optional)
          </FieldLabel>
          <Input
            id="resign-reason"
            className="min-h-11"
            maxLength={200}
            placeholder="I have accepted a new role"
            value={input.reason}
            onChange={(event) => set('reason', event.target.value)}
          />
          <FieldDescription>
            You don't have to give one. Leaving it out is common.
          </FieldDescription>
        </Field>

        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={input.handover}
              onCheckedChange={(checked) => set('handover', checked === true)}
            />
            Offer to hand over my work
          </label>
          {india && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={input.exitDocuments}
                onCheckedChange={(checked) =>
                  set('exitDocuments', checked === true)
                }
              />
              Ask for my relieving letter, experience letter and final
              settlement
            </label>
          )}
        </div>
      </FieldGroup>

      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <Field>
          <FieldLabel htmlFor="resign-letter">Your letter</FieldLabel>
          <Textarea
            id="resign-letter"
            rows={20}
            maxLength={10_000}
            className="bg-card font-serif text-base leading-relaxed"
            value={body}
            onChange={(event) => setEdited(event.target.value)}
          />
          <FieldDescription>
            {edited === null
              ? 'Edit it here. It stays up to date with the form until you do.'
              : 'Your edits are kept. Changing the form won’t touch them.'}
          </FieldDescription>
        </Field>
        <div className="flex flex-wrap gap-2">
          {actions?.({ title, body })}
          <LetterTextActions title={title} body={body} />
          {edited !== null && (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => setEdited(null)}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Back to the form's version
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
