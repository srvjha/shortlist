import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CheckIcon, CopyIcon, DownloadIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/lib/toast'
import { z } from 'zod'
import { PageHeader } from '@/components/app/page-header'
import { AiKeyTab } from '@/components/settings/ai-key-tab'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedEffect } from '@/hooks/use-debounced-effect'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import { meQuery, queryKeys } from '@/lib/api/queries'
import type { Me } from '@/lib/api/types'
import { signOut } from '@/lib/auth-client'
import { downloadFile } from '@/lib/download'
import { site } from '@/lib/site'

const searchSchema = z.object({
  // 'billing' and 'plan' only exist so old links still land on the right page.
  tab: z.enum(['account', 'billing', 'ai', 'data']).optional(),
  plan: z.enum(['season_pass', 'pro']).optional(),
})

export const Route = createFileRoute('/_app/settings')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (search.tab === 'billing')
      throw redirect({ to: '/billing', search: { plan: search.plan } })
  },
  head: () => ({ meta: [{ title: `Settings | ${site.name}` }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.prefetchQuery(meQuery)]),
  component: SettingsPage,
})

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

function AccountTab({ me }: { me: Me }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(me.name)
  const [username, setUsername] = useState(me.username)
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle')
  const normalized = username.trim().toLowerCase()
  const validFormat = USERNAME_PATTERN.test(normalized)
  const changedUsername = normalized !== me.username

  // Every change to the name cancels the lookup for the previous one, so a slow reply never shows for the new name.
  const lookup = useRef<AbortController | null>(null)
  useEffect(() => {
    lookup.current?.abort()
    setAvailability(changedUsername && validFormat ? 'checking' : 'idle')
  }, [changedUsername, validFormat, normalized])
  useDebouncedEffect(
    () => {
      if (!changedUsername || !validFormat) return
      const abort = new AbortController()
      lookup.current = abort
      unwrap(
        api.GET('/v1/usernames/{username}', {
          params: { path: { username: normalized } },
          signal: abort.signal,
        }),
      )
        .then((result) => {
          if (!abort.signal.aborted)
            setAvailability(result.available ? 'available' : 'taken')
        })
        .catch(() => {
          if (!abort.signal.aborted) setAvailability('idle')
        })
    },
    [normalized],
    400,
  )

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/v1/me', {
          body: {
            ...(name.trim() !== me.name && { name: name.trim() }),
            ...(changedUsername && { username: normalized }),
          },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)
      toast.success('Account updated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const profileUrl = `${site.url}/${me.username}`
  const dirty = name.trim() !== me.name || changedUsername
  const canSave =
    dirty &&
    name.trim() !== '' &&
    (!changedUsername || availability === 'available')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Your username is part of every share link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            data-invalid={
              changedUsername && (!validFormat || availability === 'taken')
            }
          >
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <InputGroup>
              <InputGroupAddon>{site.displayDomain}/</InputGroupAddon>
              <InputGroupInput
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                aria-invalid={
                  changedUsername && (!validFormat || availability === 'taken')
                }
                onChange={(e) => setUsername(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                {availability === 'checking' && <Spinner />}
                {availability === 'available' && (
                  <CheckIcon className="text-success" />
                )}
                {availability === 'taken' && (
                  <XIcon className="text-destructive" />
                )}
              </InputGroupAddon>
            </InputGroup>
            {changedUsername && !validFormat ? (
              <FieldError>
                Use 3 to 30 lowercase letters, numbers or hyphens.
              </FieldError>
            ) : availability === 'taken' ? (
              <FieldError>That username is taken.</FieldError>
            ) : (
              <FieldDescription>
                {changedUsername
                  ? 'Links with your old username keep working and redirect here.'
                  : 'Lowercase letters, numbers and hyphens.'}
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" value={me.email} disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-url">Public profile</FieldLabel>
            <InputGroup>
              <InputGroupInput id="profile-url" readOnly value={profileUrl} />
              <InputGroupAddon align="inline-end">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copy profile link"
                  onClick={() =>
                    navigator.clipboard.writeText(profileUrl).then(
                      () => toast.success('Link copied'),
                      () =>
                        toast.error('Could not copy. Select the link instead.'),
                    )
                  }
                >
                  <CopyIcon />
                </Button>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Shows the resumes you choose to list.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending && <Spinner data-icon="inline-start" />}
          Save changes
        </Button>
      </CardFooter>
    </Card>
  )
}

function DataTab({ me }: { me: Me }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState('')
  const [exporting, setExporting] = useState(false)

  const remove = useMutation({
    mutationFn: () => expectOk(api.DELETE('/v1/me')),
    onSuccess: async () => {
      await signOut().catch(() => undefined)
      toast.success('Your account and data have been deleted.')
      navigate({ to: '/' })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  async function exportData() {
    setExporting(true)
    try {
      await downloadFile('/v1/me/data', 'my-data.json')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Download your data</CardTitle>
          <CardDescription>
            Your account, profile, every resume and version, jobs and share
            links, as one JSON file.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            Download my data
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Deletes your account, resumes, versions, uploaded files and share
            links. Share links stop working immediately. This can't be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog onOpenChange={() => setConfirm('')}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete my account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Type{' '}
                  <span className="font-medium text-foreground">
                    {me.username}
                  </span>{' '}
                  to confirm. Any active Pro subscription is cancelled too.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                aria-label="Your username"
                autoComplete="off"
                spellCheck={false}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my account</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={confirm !== me.username || remove.isPending}
                  onClick={(event) => {
                    event.preventDefault()
                    remove.mutate()
                  }}
                >
                  {remove.isPending && <Spinner data-icon="inline-start" />}
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}

function SettingsPage() {
  const { tab = 'account' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: me } = useQuery(meQuery)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
      <PageHeader title="Settings" />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          navigate({ search: { tab: value as typeof tab } })
        }
        className="gap-6"
      >
        <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden">
          {/* overflow-x alone makes overflow-y auto too, and the active tab's shadow then shows a scrollbar. */}
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="ai">AI provider</TabsTrigger>
          <TabsTrigger value="data">Your data</TabsTrigger>
        </TabsList>
        {!me ? (
          <Skeleton className="h-80" />
        ) : (
          <>
            <TabsContent value="account">
              <AccountTab key={me.username} me={me} />
            </TabsContent>
            <TabsContent value="ai">
              <AiKeyTab />
            </TabsContent>
            <TabsContent value="data">
              <DataTab me={me} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
