import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  LockIcon,
  PinIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { countryLabel } from '@/components/analytics/labels'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import {
  meQuery,
  queryKeys,
  shareLinkStatsQuery,
  shareLinksQuery,
  resumeQuery,
} from '@/lib/api/queries'
import type { ShareLink } from '@/lib/api/types'
import { formatDate, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

// Edge hyphens are trimmed on submit, not here, so "vibe-" can be typed.
const toSlugDraft = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 30)

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Copy link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Could not copy. Select the link and copy it instead.')
        }
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

function SwitchField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  )
}

type ContactMode = 'shown' | 'hidden' | 'password'

const listedHint = (listed: boolean) =>
  listed
    ? 'Anyone visiting your profile page can find and open it.'
    : 'Only people you send this link to can open it. It does not show on your profile page.'

function ContactField({
  id,
  resumeId,
  value,
  onChange,
  paid,
  description,
}: {
  id: string
  resumeId: string
  value: ContactMode
  onChange: (mode: ContactMode) => void
  paid: boolean
  description: string
}) {
  const { data: resume } = useQuery(resumeQuery(resumeId))
  // LaTeX resumes print whatever the source says, so there are no contact fields to hide.
  if (resume?.mode === 'code') {
    return (
      <Field>
        <FieldLabel>Phone and email</FieldLabel>
        <FieldDescription>
          This resume is written in LaTeX, so they show exactly as in your code.
          To hide them on this link, remove them from the code or switch to the
          form editor.
        </FieldDescription>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel id={`${id}-label`}>Phone and email</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        className="w-full"
        aria-labelledby={`${id}-label`}
        value={value}
        onValueChange={(mode) => mode && onChange(mode as ContactMode)}
      >
        <ToggleGroupItem value="shown" className="min-w-0 flex-1 shrink">
          Shown
        </ToggleGroupItem>
        <ToggleGroupItem value="hidden" className="min-w-0 flex-1 shrink">
          Hidden
        </ToggleGroupItem>
        <ToggleGroupItem
          value="password"
          // Locked on Free: dim the label only, so the button keeps its border.
          className="min-w-0 flex-1 shrink disabled:text-muted-foreground disabled:opacity-100"
          disabled={!paid}
        >
          <LockIcon data-icon="inline-start" />
          Password
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>{description}</FieldDescription>
      {!paid && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Badge variant="secondary">Paid plans</Badge>
          Let visitors unlock them with a password.
          <Link
            to="/billing"
            className="font-medium text-foreground underline underline-offset-4"
          >
            See plans
          </Link>
        </p>
      )}
    </Field>
  )
}

function LinkStats({ link }: { link: ShareLink }) {
  const { data } = useQuery(shareLinkStatsQuery(link.id))
  if (!data) return <Skeleton className="h-10" />
  if (data.viewCount === 0)
    return <p className="text-sm text-muted-foreground">No views yet.</p>
  return (
    <dl className="grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground">Views</dt>
        <dd className="text-lg font-semibold tabular-nums">{data.viewCount}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">People</dt>
        <dd className="text-lg font-semibold tabular-nums">
          {data.uniqueVisitors}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Last viewed</dt>
        <dd className="font-medium">
          {data.lastViewedAt ? timeAgo(data.lastViewedAt) : 'Never'}
        </dd>
      </div>
      {(data.places.length > 0 || data.countries.length > 0) && (
        <div className="col-span-3">
          <dt className="text-muted-foreground">Where</dt>
          <dd className="break-words">
            {data.places.length > 0
              ? data.places
                  .map(
                    (p) =>
                      `${[p.city, p.region, p.country && countryLabel(p.country)].filter(Boolean).join(', ')} (${p.views})`,
                  )
                  .join('; ')
              : data.countries
                  .map((c) => `${countryLabel(c.country)} (${c.views})`)
                  .join(', ')}
          </dd>
        </div>
      )}
      {data.topReferrers.length > 0 && (
        <div className="col-span-3">
          <dt className="text-muted-foreground">From</dt>
          <dd className="break-words">
            {data.topReferrers
              .map(
                (r) =>
                  `${r.referrer === 'direct' ? 'Direct' : r.referrer} (${r.views})`,
              )
              .join(', ')}
          </dd>
        </div>
      )}
    </dl>
  )
}

function LinkCard({
  link,
  resumeId,
  headVersionId,
}: {
  link: ShareLink
  resumeId: string
  headVersionId: string | null
}) {
  const queryClient = useQueryClient()
  const { data: me } = useQuery(meQuery)
  const paid = me !== undefined && me.plan !== 'free'
  const [confirmOff, setConfirmOff] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  const [contactPassword, setContactPassword] = useState('')
  const contactMode: ContactMode = settingPassword
    ? 'password'
    : link.showContact
      ? 'shown'
      : link.hasContactPassword
        ? 'password'
        : 'hidden'
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.shareLinks(resumeId) })
  const update = useMutation({
    mutationFn: (body: {
      showContact?: boolean
      contactPassword?: string | null
      isListed?: boolean
      pinnedVersionId?: string | null
    }) =>
      unwrap(
        api.PATCH('/v1/share-links/{shareLinkId}', {
          params: { path: { shareLinkId: link.id } },
          body,
        }),
      ),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: () =>
      expectOk(
        api.DELETE('/v1/share-links/{shareLinkId}', {
          params: { path: { shareLinkId: link.id } },
        }),
      ),
    onSuccess: () => {
      refresh()
      toast.success(
        'Link turned off. Anyone with it now sees a not found page.',
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={link.url}
          aria-label="Share link"
          className="font-mono text-xs"
          onFocus={(e) => e.target.select()}
        />
        <CopyButton value={link.url} />
        <Button variant="outline" size="icon-sm" asChild>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open link in a new tab"
          >
            <ExternalLinkIcon />
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {link.hasPassword && (
          <Badge variant="secondary">
            <LockIcon data-icon="inline-start" />
            Password
          </Badge>
        )}
        {link.pinnedVersionId && (
          <Badge variant="secondary">
            <PinIcon data-icon="inline-start" />
            Pinned version
          </Badge>
        )}
        {link.expiresAt && (
          <Badge variant="secondary">
            Expires {formatDate(link.expiresAt)}
          </Badge>
        )}
        <Badge variant="outline">
          <EyeIcon data-icon="inline-start" />
          {link.viewCount} {link.viewCount === 1 ? 'view' : 'views'}
        </Badge>
      </div>
      <LinkStats link={link} />
      <Separator />
      <FieldGroup className="gap-4">
        <ContactField
          id={`${link.id}-contact`}
          resumeId={resumeId}
          value={contactMode}
          paid={paid}
          description={
            contactMode === 'shown'
              ? 'Anyone with the link sees them.'
              : contactMode === 'hidden'
                ? "Hidden so strangers can't scrape them."
                : !paid && link.hasContactPassword
                  ? 'Your plan no longer includes this, so they stay hidden.'
                  : 'Visitors see the resume and enter the password to see them.'
          }
          onChange={(mode) => {
            setSettingPassword(mode === 'password')
            if (mode !== 'password')
              update.mutate(
                mode === 'shown'
                  ? { showContact: true }
                  : { showContact: false, contactPassword: null },
              )
          }}
        />
        {paid && contactMode === 'password' && !settingPassword && (
          <Button
            variant="link"
            size="sm"
            className="-mt-2 h-auto self-start p-0"
            onClick={() => setSettingPassword(true)}
          >
            Change contact password
          </Button>
        )}
        {settingPassword && (
          <form
            className="-mt-1 flex items-start gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              update.mutate(
                { contactPassword },
                {
                  onSuccess: () => {
                    setSettingPassword(false)
                    setContactPassword('')
                    toast.success('Contact password saved')
                  },
                },
              )
            }}
          >
            <Input
              type="password"
              autoComplete="new-password"
              aria-label="Contact password"
              placeholder="Contact password"
              value={contactPassword}
              onChange={(e) => setContactPassword(e.target.value)}
            />
            <Button
              type="submit"
              disabled={contactPassword.length < 8 || update.isPending}
            >
              {update.isPending && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </form>
        )}
        <SwitchField
          id={`${link.id}-listed`}
          label={`List on my public profile (${link.isListed ? 'listed' : 'unlisted'})`}
          description={listedHint(link.isListed)}
          checked={link.isListed}
          onChange={(isListed) => update.mutate({ isListed })}
        />
        <SwitchField
          id={`${link.id}-pinned`}
          label="Pin this version"
          description={
            link.pinnedVersionId
              ? 'Visitors see the version you pinned. Turn off to always show your latest edits.'
              : 'Off: visitors always see your latest edits.'
          }
          checked={Boolean(link.pinnedVersionId)}
          onChange={(pinned) =>
            update.mutate({ pinnedVersionId: pinned ? headVersionId : null })
          }
        />
        {link.pinnedVersionId &&
          headVersionId &&
          link.pinnedVersionId !== headVersionId && (
            <p className="-mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              Your newer edits aren't on this link.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() =>
                  update.mutate({ pinnedVersionId: headVersionId })
                }
              >
                Pin the current version
              </Button>
            </p>
          )}
      </FieldGroup>
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-destructive"
        onClick={() => setConfirmOff(true)}
      >
        <Trash2Icon data-icon="inline-start" />
        Turn off this link
      </Button>
      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Turn off this link?"
        description="Anyone who opens it will see a not found page. You can create a new link anytime."
        confirmLabel="Turn off link"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </li>
  )
}

function CreateLinkForm({
  resumeId,
  headVersionId,
  onDone,
  onCancel,
}: {
  resumeId: string
  headVersionId: string | null
  onDone: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { data: me } = useQuery(meQuery)
  const [slug, setSlug] = useState('')
  const paid = me !== undefined && me.plan !== 'free'
  const [contactMode, setContactMode] = useState<ContactMode>('hidden')
  const [contactPassword, setContactPassword] = useState('')
  const contactPasswordShort =
    contactMode === 'password' && contactPassword.length < 8
  const [isListed, setIsListed] = useState(false)
  const [pin, setPin] = useState(false)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const cleanSlug = slug.replace(/^-+|-+$/g, '')
  const slugTooShort = slug.length > 0 && cleanSlug.length < 3

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/resumes/{resumeId}/share-links', {
          params: { path: { resumeId } },
          body: {
            ...(cleanSlug && { slug: cleanSlug }),
            showContact: contactMode === 'shown',
            ...(contactMode === 'password' && { contactPassword }),
            isListed,
            pinnedVersionId: pin ? headVersionId : null,
            ...(password && { password }),
            ...(expiresAt && {
              expiresAt: new Date(
                `${expiresAt}T23:59:59`,
              ).toISOString() as never,
            }),
          },
        }),
      ),
    onSuccess: async (link) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.shareLinks(resumeId),
      })
      try {
        await navigator.clipboard.writeText(link.url)
        toast.success('Link created and copied')
      } catch {
        toast.success('Link created')
      }
      onDone()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        create.mutate()
      }}
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={slugTooShort}>
          <FieldLabel htmlFor="slug">Link name (optional)</FieldLabel>
          <Input
            id="slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="acme-backend"
            value={slug}
            aria-invalid={slugTooShort}
            onChange={(e) => setSlug(toSlugDraft(e.target.value))}
          />
          {slugTooShort ? (
            <FieldError>Use at least 3 letters or numbers.</FieldError>
          ) : (
            <FieldDescription className="break-all">
              {cleanSlug
                ? `${site.displayDomain}/${me?.username ?? '…'}/${cleanSlug}`
                : 'Leave it empty to use the resume name.'}
            </FieldDescription>
          )}
        </Field>
        <ContactField
          id="new-contact"
          resumeId={resumeId}
          value={contactMode}
          onChange={setContactMode}
          paid={paid}
          description={
            contactMode === 'password'
              ? 'Visitors see the resume and enter this password to see them.'
              : 'Hidden by default.'
          }
        />
        {contactMode === 'password' && (
          <Field
            className="-mt-1"
            data-invalid={contactPassword.length > 0 && contactPasswordShort}
          >
            <FieldLabel htmlFor="contact-password">Contact password</FieldLabel>
            <Input
              id="contact-password"
              type="password"
              autoComplete="new-password"
              value={contactPassword}
              aria-invalid={contactPassword.length > 0 && contactPasswordShort}
              onChange={(e) => setContactPassword(e.target.value)}
            />
            {contactPassword.length > 0 && contactPasswordShort && (
              <FieldError>Use at least 8 characters.</FieldError>
            )}
          </Field>
        )}
        <SwitchField
          id="new-listed"
          label={`List on my public profile (${isListed ? 'listed' : 'unlisted'})`}
          description={listedHint(isListed)}
          checked={isListed}
          onChange={setIsListed}
        />
        <SwitchField
          id="new-pin"
          label="Pin to this exact version"
          description="Off means the link always shows your latest edits."
          checked={pin}
          onChange={setPin}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={password.length > 0 && password.length < 8}>
            <FieldLabel htmlFor="link-password">Password (optional)</FieldLabel>
            <Input
              id="link-password"
              type="password"
              autoComplete="new-password"
              value={password}
              aria-invalid={password.length > 0 && password.length < 8}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && password.length < 8 && (
              <FieldError>Use at least 8 characters.</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="link-expiry">Expires on (optional)</FieldLabel>
            <Input
              id="link-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={
            create.isPending ||
            slugTooShort ||
            contactPasswordShort ||
            (password.length > 0 && password.length < 8)
          }
        >
          {create.isPending && <Spinner data-icon="inline-start" />}
          Create link
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function SharePanel({
  open,
  onOpenChange,
  resumeId,
  headVersionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumeId: string
  headVersionId: string | null
}) {
  const { data: links, isPending } = useQuery({
    ...shareLinksQuery(resumeId),
    enabled: open,
  })
  const [creating, setCreating] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Share</SheetTitle>
          <SheetDescription>
            Send a link instead of an attachment. You'll see when it's opened.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
          {creating || (links && links.length === 0) ? (
            <CreateLinkForm
              resumeId={resumeId}
              headVersionId={headVersionId}
              onDone={() => setCreating(false)}
              onCancel={() =>
                links?.length ? setCreating(false) : onOpenChange(false)
              }
            />
          ) : (
            <Button
              variant="outline"
              className="self-start"
              onClick={() => setCreating(true)}
            >
              <PlusIcon data-icon="inline-start" />
              New link
            </Button>
          )}
          {isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="flex flex-col gap-4">
              {links?.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  resumeId={resumeId}
                  headVersionId={headVersionId}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
