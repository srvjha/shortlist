import { PlusIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ResumeContent } from '@/lib/api/types'
import { createSection, move, sectionPresets } from './content-helpers'
import { TextField } from './fields'
import { SectionEditor } from './section-editor'
import { LinksEditor } from './links-field'

export function ContentEditor({
  value,
  onChange,
}: {
  value: ResumeContent
  onChange: (content: ResumeContent) => void
}) {
  // Undo runs from a toast, so it reads the document as it is at click time.
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })
  const basics = value.basics
  const setBasics = (patch: Partial<ResumeContent['basics']>) =>
    onChange({ ...value, basics: { ...basics, ...patch } })
  const setSections = (sections: ResumeContent['sections']) =>
    onChange({ ...value, sections })
  type SensitiveField = NonNullable<typeof basics.sensitive>[number]
  const sensitiveProps = (field: SensitiveField) => ({
    sensitive: basics.sensitive?.includes(field),
    onSensitiveChange: (on: boolean) =>
      setBasics({
        sensitive: [
          ...(basics.sensitive ?? []).filter((f) => f !== field),
          ...(on ? [field] : []),
        ],
      }),
  })

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Your details"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Your details</h2>
          <p className="text-sm text-muted-foreground">
            Your email and phone are never sent to AI. Use the lock to hide
            other details too.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="basics-name"
            autoComplete="name"
            label="Full name"
            value={basics.name}
            {...sensitiveProps('name')}
            onChange={(v) => setBasics({ name: v ?? '' })}
          />
          <TextField
            id="basics-headline"
            label="Headline"
            value={basics.headline}
            placeholder="Backend Engineer"
            onChange={(v) => setBasics({ headline: v })}
          />
          <TextField
            id="basics-email"
            autoComplete="email"
            spellCheck={false}
            label="Email"
            type="email"
            value={basics.email}
            onChange={(v) => setBasics({ email: v })}
          />
          <TextField
            id="basics-phone"
            autoComplete="tel"
            inputMode="tel"
            label="Phone"
            type="tel"
            value={basics.phone}
            placeholder="+91 98765 43210"
            onChange={(v) => setBasics({ phone: v })}
          />
          <TextField
            id="basics-location"
            label="Location"
            value={basics.location}
            placeholder="Bengaluru"
            onChange={(v) => setBasics({ location: v })}
            {...sensitiveProps('location')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Links</p>
          <LinksEditor
            idPrefix="basics-link"
            labelPlaceholder="LinkedIn"
            urlPlaceholder="https://linkedin.com/in/you"
            links={basics.links}
            onChange={(links) => setBasics({ links })}
          />
        </div>
      </section>

      {value.sections.map((section, index) => (
        <SectionEditor
          key={section.id}
          section={section}
          isFirst={index === 0}
          isLast={index === value.sections.length - 1}
          onChange={(next) =>
            setSections(value.sections.map((s, i) => (i === index ? next : s)))
          }
          onRemove={() => {
            setSections(value.sections.filter((_, i) => i !== index))
            toast(`Removed ${section.title || 'section'}`, {
              action: {
                label: 'Undo',
                onClick: () => {
                  const { sections } = latest.current
                  onChange({
                    ...latest.current,
                    sections: [
                      ...sections.slice(0, index),
                      section,
                      ...sections.slice(index),
                    ],
                  })
                },
              },
            })
          }}
          onMove={(delta) => setSections(move(value.sections, index, delta))}
        />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="self-start">
            <PlusIcon data-icon="inline-start" />
            Add section
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {sectionPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.title}
                onSelect={() =>
                  setSections([
                    ...value.sections,
                    createSection(preset.type, preset.title),
                  ])
                }
              >
                {preset.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onSelect={() =>
                setSections([
                  ...value.sections,
                  createSection('list', 'Custom section'),
                ])
              }
            >
              Custom section
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
