import { LockIcon, LockOpenIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Sensitive values are replaced with placeholders before anything is sent to an AI model.
export function SensitiveToggle({
  label,
  pressed,
  onPressedChange,
  className,
}: {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          aria-label={`Hide ${label} from AI`}
          pressed={pressed}
          onPressedChange={onPressedChange}
          className={cn(
            'text-muted-foreground aria-pressed:text-foreground',
            className,
          )}
        >
          {pressed ? <LockIcon /> : <LockOpenIcon />}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {pressed ? 'Hidden from AI' : 'Hide from AI'}
      </TooltipContent>
    </Tooltip>
  )
}

type InputPassthrough = Pick<
  React.ComponentProps<typeof Input>,
  'autoComplete' | 'inputMode' | 'spellCheck' | 'name' | 'autoCapitalize'
>

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  sensitive,
  onSensitiveChange,
  ...inputProps
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder?: string
  type?: string
  className?: string
  sensitive?: boolean
  onSensitiveChange?: (sensitive: boolean) => void
} & InputPassthrough) {
  return (
    <Field className={className}>
      {onSensitiveChange ? (
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <SensitiveToggle
            label={label.toLowerCase()}
            pressed={sensitive ?? false}
            onPressedChange={onSensitiveChange}
            className="-my-1"
          />
        </div>
      ) : (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}
      <Input
        id={id}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        {...inputProps}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : event.target.value)
        }
      />
    </Field>
  )
}

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// Stored as "YYYY" or "YYYY-MM". The month is optional, which a native month input can't express: it gives no
// value until both are filled in, so a year typed alone was lost.
function MonthYearInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string | undefined
  disabled?: boolean
  onChange: (value: string | undefined) => void
}) {
  const [year = '', month = 'none'] = (value ?? '').split('-')
  // The year is typed digit by digit; only a full year (or an empty box) is saved.
  const [yearText, setYearText] = useState(year)
  useEffect(() => setYearText(year), [year])
  const save = (nextYear: string, nextMonth: string | undefined) =>
    onChange(
      nextYear
        ? nextMonth
          ? `${nextYear}-${nextMonth}`
          : nextYear
        : undefined,
    )
  return (
    <div className="flex gap-2">
      <Select
        value={month}
        disabled={disabled || !/^\d{4}$/.test(yearText)}
        onValueChange={(next) =>
          save(yearText, next === 'none' ? undefined : next)
        }
      >
        <SelectTrigger aria-label={`${label} month`} className="min-w-0 flex-1">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No month</SelectItem>
          {monthNames.map((name, index) => (
            <SelectItem key={name} value={String(index + 1).padStart(2, '0')}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="Year"
        maxLength={4}
        disabled={disabled}
        className="w-20"
        value={disabled ? '' : yearText}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '')
          setYearText(next)
          if (next === '' || /^\d{4}$/.test(next))
            save(next, month === 'none' ? undefined : month)
        }}
      />
    </div>
  )
}

export function MonthField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <MonthYearInput id={id} label={label} value={value} onChange={onChange} />
    </Field>
  )
}

export function EndDateField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const present = value === 'present'
  // Unticking Present brings back the date it replaced.
  const [lastDate, setLastDate] = useState(present ? undefined : value)
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>End</FieldLabel>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={present}
            onCheckedChange={(checked) => {
              if (checked === true) {
                setLastDate(value)
                onChange('present')
              } else onChange(lastDate)
            }}
          />
          Present
        </label>
      </div>
      <MonthYearInput
        id={id}
        label="End"
        value={present ? undefined : value}
        disabled={present}
        onChange={onChange}
      />
    </Field>
  )
}

export function ListField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hideLabel = false,
}: {
  id: string
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  hideLabel?: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        defaultValue={value.join(', ')}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  )
}
