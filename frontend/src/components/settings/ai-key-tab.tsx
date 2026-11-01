import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { AiRunsCard } from '@/components/settings/ai-runs-card'
import { AiModelInput } from '@/components/settings/ai-model-input'
import type { AiProvider } from '@/components/settings/ai-model-input'
import { api, errorMessage, expectOk, unwrap } from '@/lib/api/client'
import { aiKeysQuery, queryKeys } from '@/lib/api/queries'
import { formatDate } from '@/lib/format'

type SavedKey = NonNullable<ReturnType<typeof useAiKeys>['data']>[number]

const providers: Record<
  AiProvider,
  {
    name: string
    keysUrl: string
    keyPlaceholder: string
    modelExample: string
  }
> = {
  openai: {
    name: 'OpenAI',
    keysUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
    modelExample: 'gpt-5.4-mini',
  },
  anthropic: {
    name: 'Anthropic',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
    modelExample: 'claude-sonnet-5',
  },
  openrouter: {
    name: 'OpenRouter',
    keysUrl: 'https://openrouter.ai/settings/keys',
    keyPlaceholder: 'sk-or-...',
    modelExample: 'anthropic/claude-sonnet-5',
  },
}

const useAiKeys = () => useQuery(aiKeysQuery)

export function AiKeyTab() {
  const { data: keys, isPending } = useAiKeys()

  if (isPending) return <Skeleton className="h-64" />

  const active = keys?.find((key) => key.enabled)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Use your own AI key</CardTitle>
          <CardDescription>
            {active
              ? `Tailoring, imports and edits run on your ${providers[active.provider].name} key. You pay the provider directly, and your plan's AI limits no longer apply.`
              : "Add an OpenAI, Anthropic or OpenRouter key to run tailoring, imports and edits on your own account, without your plan's AI limits. You can save all three; only one is used at a time."}
          </CardDescription>
        </CardHeader>
      </Card>

      {(Object.keys(providers) as AiProvider[]).map((provider) => (
        <ProviderKeyCard
          key={provider}
          provider={provider}
          saved={keys?.find((key) => key.provider === provider)}
          hasOtherKeys={Boolean(keys?.some((key) => key.provider !== provider))}
        />
      ))}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
        Your keys are encrypted before they're stored. After saving we only ever
        show their last four characters, and they're never included in exports
        or logs. Remove them anytime.
      </p>

      <AiRunsCard />
    </div>
  )
}

function ProviderKeyCard({
  provider,
  saved,
  hasOtherKeys,
}: {
  provider: AiProvider
  saved: SavedKey | undefined
  hasOtherKeys: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [editingModel, setEditingModel] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const info = providers[provider]
  const path = { params: { path: { provider } } }

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKeys }),
      queryClient.invalidateQueries({ queryKey: queryKeys.usage }),
    ])

  const update = useMutation({
    mutationFn: (body: { enabled?: boolean; modelId?: string | null }) =>
      unwrap(api.PATCH('/v1/me/ai-keys/{provider}', { ...path, body })),
    onSuccess: async (_, body) => {
      await refresh()
      if (body.modelId !== undefined) {
        setEditingModel(false)
        toast.success('Model saved. Your API key stays the same.')
      } else {
        toast.success(
          body.enabled
            ? `AI requests now run on your ${info.name} key.`
            : 'AI requests now use your account plan and its limits.',
        )
      }
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PUT('/v1/me/ai-keys/{provider}', {
          ...path,
          body: { apiKey: apiKey.trim(), modelId: modelId.trim() || null },
        }),
      ),
    onSuccess: () => {
      refresh()
      setEditing(false)
      setApiKey('')
      toast.success(`Key saved. AI requests now run on your ${info.name} key.`)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () => expectOk(api.DELETE('/v1/me/ai-keys/{provider}', path)),
    onSuccess: () => {
      refresh()
      setEditingModel(false)
      toast.success(
        saved?.enabled
          ? 'Key removed. AI requests use your plan again.'
          : 'Key removed.',
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const busy = update.isPending || remove.isPending
  const switchId = `ai-key-${provider}-enabled`
  const modelInputId = `ai-key-${provider}-model`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{info.name}</CardTitle>
        <CardDescription>
          {saved
            ? saved.enabled
              ? 'In use for every AI request.'
              : 'Saved, not in use.'
            : 'No key added.'}
        </CardDescription>
        {saved?.enabled && (
          <CardAction>
            <Badge>Active</Badge>
          </CardAction>
        )}
      </CardHeader>

      {saved && !editing ? (
        <>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup>
              <Field orientation="horizontal" data-disabled={busy}>
                <FieldContent>
                  <FieldLabel htmlFor={switchId}>Use this key</FieldLabel>
                  <FieldDescription id={`${switchId}-description`}>
                    {hasOtherKeys
                      ? 'Turning it on turns your other keys off.'
                      : 'Turn off to use your account plan without removing your key.'}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={switchId}
                  aria-describedby={`${switchId}-description`}
                  checked={saved.enabled}
                  disabled={busy}
                  onCheckedChange={(enabled) => update.mutate({ enabled })}
                />
              </Field>
            </FieldGroup>
            <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-8">
              <dt className="text-muted-foreground">Key</dt>
              <dd className="flex items-center gap-2 font-mono">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                ••••{saved.keyHint}
              </dd>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {saved.modelId ?? 'Default models'}
                {!editingModel && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => {
                      setModelId(saved.modelId ?? '')
                      setEditingModel(true)
                    }}
                  >
                    Edit model
                  </Button>
                )}
              </dd>
              <dt className="text-muted-foreground">Checked</dt>
              <dd>{formatDate(saved.verifiedAt)}</dd>
            </dl>
            {editingModel && (
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  update.mutate({ modelId: modelId.trim() || null })
                }}
              >
                <FieldGroup>
                  <Field data-disabled={update.isPending}>
                    <FieldLabel htmlFor={modelInputId}>
                      Model (optional)
                    </FieldLabel>
                    <AiModelInput
                      provider={provider}
                      modelIds={saved.modelIds}
                      keySaved
                      id={modelInputId}
                      autoFocus
                      placeholder={info.modelExample}
                      value={modelId}
                      disabled={update.isPending}
                      aria-describedby={`${modelInputId}-description`}
                      onValueChange={setModelId}
                    />
                    <FieldDescription id={`${modelInputId}-description`}>
                      We test the model with your saved key. Leave empty to use
                      the provider's default models.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending && <Spinner data-icon="inline-start" />}
                    {update.isPending
                      ? 'Testing model…'
                      : 'Test and save model'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() => setEditingModel(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditingModel(false)
                setModelId(saved.modelId ?? '')
                setEditing(true)
              }}
            >
              Replace key
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
            >
              Remove key
            </Button>
          </CardFooter>
        </>
      ) : editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          <CardContent>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor={`ai-key-${provider}`}>API key</FieldLabel>
                <Input
                  id={`ai-key-${provider}`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  placeholder={info.keyPlaceholder}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <FieldDescription>
                  Create one in your{' '}
                  <a
                    href={info.keysUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {info.name} dashboard
                  </a>
                  . We test it before saving, then use it for every AI request.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${modelInputId}-new`}>
                  Model (optional)
                </FieldLabel>
                <AiModelInput
                  provider={provider}
                  modelIds={saved?.modelIds ?? []}
                  keySaved={Boolean(saved)}
                  id={`${modelInputId}-new`}
                  placeholder={info.modelExample}
                  value={modelId}
                  onValueChange={setModelId}
                  className="font-mono"
                />
                <FieldDescription>
                  Leave empty to use our recommended {info.name} models.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-6 flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={apiKey.trim().length < 10 || save.isPending}
            >
              {save.isPending && <Spinner data-icon="inline-start" />}
              {save.isPending ? 'Testing your key…' : 'Test and save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => {
                setEditing(false)
                setApiKey('')
              }}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      ) : (
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => {
              setModelId('')
              setEditing(true)
            }}
          >
            Add {info.name} key
          </Button>
        </CardFooter>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove your ${info.name} key?`}
        description={
          saved?.enabled
            ? 'AI requests go back to running on your plan, with its monthly limits.'
            : 'You can add it again anytime.'
        }
        confirmLabel="Remove key"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </Card>
  )
}
