import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  BetweenHorizontalEndIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ResumeSection } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { BulletsEditor } from './bullets-editor'
import {
  createEntry,
  entryLabel,
  move,
  newId,
  toggleBold,
} from './content-helpers'
import type {
  EducationEntry,
  ExperienceEntry,
  ListEntry,
  ProjectEntry,
} from './content-helpers'
import { EndDateField, ListField, MonthField, TextField } from './fields'
import { LinksEditor } from './links-field'
import { ProjectFromLink } from './project-from-link'

// Space after an entry on the PDF, in points; Tighter pulls the next item closer than the template does.
const spaceOptions = [
  { label: 'Tighter', value: -6 },
  { label: 'None', value: 0 },
  { label: 'Small', value: 4 },
  { label: 'Medium', value: 8 },
  { label: 'Large', value: 14 },
] as const

// "Space below" for an entry or a whole section: Tighter, None, Small, Medium or Large.
function SpaceBelowMenu({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (spaceAfter: number | undefined) => void
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <BetweenHorizontalEndIcon />
        Space below
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={String(value ?? 0)}
          onValueChange={(next) => onChange(Number(next) || undefined)}
        >
          {spaceOptions.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={String(option.value)}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function EntryFields({
  section,
  entry,
  onChange,
}: {
  section: ResumeSection
  entry: unknown
  onChange: (entry: never) => void
}) {
  const id = (key: string) => `${(entry as { id: string }).id}-${key}`
  const set = <T,>(value: T) => onChange(value as never)

  if (section.type === 'experience') {
    const e = entry as ExperienceEntry
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={id('org')}
            label="Company"
            value={e.organization}
            onChange={(v) => set({ ...e, organization: v ?? '' })}
            sensitive={e.sensitive}
            onSensitiveChange={(sensitive) => set({ ...e, sensitive })}
          />
          <TextField
            id={id('role')}
            label="Role"
            value={e.role}
            onChange={(v) => set({ ...e, role: v ?? '' })}
          />
          <TextField
            id={id('loc')}
            label="Location"
            value={e.location}
            placeholder="Bengaluru or Remote"
            onChange={(v) => set({ ...e, location: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <MonthField
              id={id('start')}
              label="Start"
              value={e.start}
              onChange={(v) => set({ ...e, start: v })}
            />
            <EndDateField
              id={id('end')}
              value={e.end}
              onChange={(v) => set({ ...e, end: v })}
            />
          </div>
        </div>
        <BulletsEditor
          bullets={e.bullets}
          onChange={(bullets) => set({ ...e, bullets })}
        />
      </>
    )
  }
  if (section.type === 'education') {
    const e = entry as EducationEntry
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={id('inst')}
            label="College or school"
            value={e.institution}
            onChange={(v) => set({ ...e, institution: v ?? '' })}
            className="sm:col-span-2"
          />
          <TextField
            id={id('deg')}
            label="Degree"
            value={e.degree}
            placeholder="Bachelor of Technology"
            onChange={(v) => set({ ...e, degree: v })}
          />
          <TextField
            id={id('field')}
            label="Field of study"
            value={e.field}
            placeholder="Computer Science"
            onChange={(v) => set({ ...e, field: v })}
          />
          <TextField
            id={id('score')}
            label="CGPA or percentage"
            value={e.score}
            placeholder="CGPA: 8.7"
            onChange={(v) => set({ ...e, score: v })}
          />
          <TextField
            id={id('loc')}
            label="Location"
            value={e.location}
            onChange={(v) => set({ ...e, location: v })}
          />
          <MonthField
            id={id('start')}
            label="Start"
            value={e.start}
            onChange={(v) => set({ ...e, start: v })}
          />
          <EndDateField
            id={id('end')}
            value={e.end}
            onChange={(v) => set({ ...e, end: v })}
          />
        </div>
        <BulletsEditor
          bullets={e.bullets}
          onChange={(bullets) => set({ ...e, bullets })}
        />
      </>
    )
  }
  if (section.type === 'projects') {
    const e = entry as ProjectEntry
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={id('name')}
            label="Project name"
            value={e.name}
            onChange={(v) => set({ ...e, name: v ?? '' })}
          />
          <ListField
            id={id('tech')}
            label="Technologies"
            value={e.technologies}
            placeholder="Next.js, Postgres, Redis"
            onChange={(technologies) => set({ ...e, technologies })}
          />
          <MonthField
            id={id('start')}
            label="Start"
            value={e.start}
            onChange={(v) => set({ ...e, start: v })}
          />
          <EndDateField
            id={id('end')}
            value={e.end}
            onChange={(v) => set({ ...e, end: v })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Links shown next to the title</p>
          <LinksEditor
            idPrefix={id('links')}
            links={e.links}
            onChange={(links) => set({ ...e, links })}
          />
        </div>
        <BulletsEditor
          bullets={e.bullets}
          onChange={(bullets) => set({ ...e, bullets })}
        />
      </>
    )
  }
  const e = entry as ListEntry
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={id('title')}
          label="Title"
          value={e.title}
          placeholder="Smart India Hackathon"
          onChange={(v) => set({ ...e, title: v ?? '' })}
        />
        <TextField
          id={id('sub')}
          label="Detail"
          value={e.subtitle}
          placeholder="Winner"
          onChange={(v) => set({ ...e, subtitle: v })}
        />
        <TextField
          id={id('date')}
          label="Date"
          value={e.date}
          placeholder="2025"
          onChange={(v) => set({ ...e, date: v })}
        />
        <TextField
          id={id('url')}
          label="Link"
          type="url"
          value={e.url}
          onChange={(v) => set({ ...e, url: v })}
        />
      </div>
      <BulletsEditor
        bullets={e.bullets}
        onChange={(bullets) => set({ ...e, bullets })}
      />
    </>
  )
}

function EntriesEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { entries: unknown[] }>
  onChange: (section: ResumeSection) => void
}) {
  const entries = section.entries as {
    id: string
    hidden: boolean
    spaceAfter?: number
  }[]
  const [openId, setOpenId] = useState<string | null>(
    entries.length === 1 ? entries[0].id : null,
  )
  const [fromLink, setFromLink] = useState(false)
  const setEntries = (next: unknown[]) =>
    onChange({ ...section, entries: next } as ResumeSection)

  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {entries.map((entry, index) => {
        const open = openId === entry.id
        return (
          <div key={entry.id}>
            <div className="flex items-center gap-1 pr-1.5">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : entry.id)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRightIcon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-90',
                  )}
                />
                <span
                  className={cn(
                    'truncate font-medium',
                    entry.hidden && 'text-muted-foreground line-through',
                  )}
                >
                  {entryLabel(section, entry)}
                </span>
                {entry.hidden && <Badge variant="outline">Hidden</Badge>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${entryLabel(section, entry)}`}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={index === 0}
                      onSelect={() => setEntries(move(entries, index, -1))}
                    >
                      <ArrowUpIcon />
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={index === entries.length - 1}
                      onSelect={() => setEntries(move(entries, index, 1))}
                    >
                      <ArrowDownIcon />
                      Move down
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setEntries(
                          entries.map((e, i) =>
                            i === index ? { ...e, hidden: !e.hidden } : e,
                          ),
                        )
                      }
                    >
                      {entry.hidden ? <EyeIcon /> : <EyeOffIcon />}
                      {entry.hidden ? 'Show on resume' : 'Hide from resume'}
                    </DropdownMenuItem>
                    <SpaceBelowMenu
                      value={entry.spaceAfter}
                      onChange={(spaceAfter) =>
                        setEntries(
                          entries.map((e, i) =>
                            i === index ? { ...e, spaceAfter } : e,
                          ),
                        )
                      }
                    />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        const previous = entries
                        setEntries(entries.filter((_, i) => i !== index))
                        toast(`Removed ${entryLabel(section, entry)}`, {
                          action: {
                            label: 'Undo',
                            onClick: () => setEntries(previous),
                          },
                        })
                      }}
                    >
                      <Trash2Icon />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {open && (
              <div className="flex flex-col gap-5 px-4 pt-1 pb-5">
                <EntryFields
                  section={section}
                  entry={entry}
                  onChange={(next) =>
                    setEntries(entries.map((e, i) => (i === index ? next : e)))
                  }
                />
              </div>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-1 p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const entry = createEntry(section.type as never)
            setEntries([...entries, entry])
            setOpenId((entry as { id: string }).id)
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add{' '}
          {section.type === 'experience'
            ? 'role'
            : section.type === 'education'
              ? 'education'
              : section.type === 'projects'
                ? 'project'
                : 'item'}
        </Button>
        {section.type === 'projects' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFromLink(true)}
            >
              <LinkIcon data-icon="inline-start" />
              Add from a link
            </Button>
            <ProjectFromLink
              open={fromLink}
              onOpenChange={setFromLink}
              entries={section.entries}
              onPlace={(next, added) => {
                setEntries(next)
                setOpenId(added.id)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

const SUMMARY_MAX = 1000

function SummaryEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: 'summary' }>
  onChange: (section: ResumeSection) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`${section.id}-text`} className="sr-only">
        {section.title}
      </FieldLabel>
      <Textarea
        id={`${section.id}-text`}
        value={section.text}
        rows={4}
        maxLength={SUMMARY_MAX}
        placeholder="Two or three lines on who you are, what you are best at and what you want next."
        className="min-h-24 resize-none field-sizing-content"
        onChange={(event) => onChange({ ...section, text: event.target.value })}
        onKeyDown={(event) =>
          toggleBold(event, (text) => onChange({ ...section, text }))
        }
      />
      <FieldDescription className="flex justify-between gap-4">
        <span>
          Select words and press Ctrl+B (⌘B on Mac) to bold them. Write
          [words](https://…) to link them.
        </span>
        <span className="tabular-nums">
          {section.text.length}/{SUMMARY_MAX}
        </span>
      </FieldDescription>
    </Field>
  )
}

function SkillsEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: 'skills' }>
  onChange: (section: ResumeSection) => void
}) {
  const setGroups = (groups: typeof section.groups) =>
    onChange({ ...section, groups })
  return (
    <div className="flex flex-col gap-3">
      {section.groups.map((group, index) => (
        <div
          key={group.id}
          className="grid grid-cols-[minmax(8rem,1fr)_2.5fr_auto] items-end gap-2"
        >
          <Field>
            <FieldLabel
              htmlFor={`${group.id}-name`}
              className={cn(index > 0 && 'sr-only')}
            >
              Group
            </FieldLabel>
            <Input
              id={`${group.id}-name`}
              value={group.name}
              placeholder="Languages"
              onChange={(event) =>
                setGroups(
                  section.groups.map((g, i) =>
                    i === index ? { ...g, name: event.target.value } : g,
                  ),
                )
              }
            />
          </Field>
          <ListField
            id={`${group.id}-items`}
            label="Skills, separated by commas"
            hideLabel={index > 0}
            value={group.items}
            placeholder="TypeScript, Go, Python"
            onChange={(items) =>
              setGroups(
                section.groups.map((g, i) =>
                  i === index ? { ...g, items } : g,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove group"
            onClick={() =>
              setGroups(section.groups.filter((_, i) => i !== index))
            }
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() =>
          setGroups([...section.groups, { id: newId(), name: '', items: [] }])
        }
      >
        <PlusIcon data-icon="inline-start" />
        Add group
      </Button>
    </div>
  )
}

export function SectionEditor({
  section,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  section: ResumeSection
  onChange: (section: ResumeSection) => void
  onRemove: () => void
  onMove: (delta: number) => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <section
      aria-label={section.title || 'Untitled section'}
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5',
        section.hidden && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-2">
        <Input
          aria-label="Section title"
          value={section.title}
          onChange={(event) =>
            onChange({ ...section, title: event.target.value })
          }
          className="h-9 flex-1 border-transparent bg-transparent px-1.5 font-serif text-lg font-semibold shadow-none hover:border-input focus-visible:border-input"
        />
        {section.hidden && <Badge variant="outline">Hidden</Badge>}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move section up"
          disabled={isFirst}
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move section down"
          disabled={isLast}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Section actions"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() =>
                  onChange({ ...section, hidden: !section.hidden })
                }
              >
                {section.hidden ? <EyeIcon /> : <EyeOffIcon />}
                {section.hidden ? 'Show section' : 'Hide section'}
              </DropdownMenuItem>
              <SpaceBelowMenu
                value={section.spaceAfter}
                onChange={(spaceAfter) => onChange({ ...section, spaceAfter })}
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                <Trash2Icon />
                Remove section
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {section.type === 'skills' ? (
        <SkillsEditor section={section} onChange={onChange} />
      ) : section.type === 'summary' ? (
        <SummaryEditor section={section} onChange={onChange} />
      ) : section.type === 'links' ? (
        <LinksEditor
          idPrefix={section.id}
          links={section.links}
          onChange={(links) => onChange({ ...section, links })}
        />
      ) : (
        <EntriesEditor section={section} onChange={onChange} />
      )}
    </section>
  )
}
