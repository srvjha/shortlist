import { useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { z } from 'zod'
import { Logo } from '@/components/brand/logo'
import {
  ChatGPTIcon,
  GitHubIcon,
  GoogleIcon,
} from '@/components/auth/provider-icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { guestLoginEnabled, signIn, useSession } from '@/lib/auth-client'
import { site } from '@/lib/site'

const searchSchema = z.object({
  mode: z.enum(['signin', 'signup']).optional(),
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: `Sign in | ${site.name}` }] }),
  component: LoginPage,
})

// Only same-site paths, so a crafted link can't bounce users to another domain after sign-in.
function safeRedirect(path: string | undefined) {
  return path && path.startsWith('/') && !path.startsWith('//')
    ? path
    : '/workspace'
}

const providers = [
  { id: 'google', name: 'Google', icon: GoogleIcon },
  { id: 'github', name: 'GitHub', icon: GitHubIcon },
  { id: 'chatgpt', name: 'ChatGPT', icon: ChatGPTIcon },
] as const

type Provider = (typeof providers)[number]['id']

// Sign in with ChatGPT is partner-only for now; it shows as coming soon until OpenAI issues this app a client.
const comingSoon = (provider: Provider) =>
  provider === 'chatgpt' && import.meta.env.VITE_ENABLE_CHATGPT_LOGIN !== 'true'

function LoginPage() {
  const { mode, redirect } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [pending, setPending] = useState<Provider | 'guest' | null>(null)
  const isSignup = mode === 'signup'
  const target = safeRedirect(redirect)
  // Read at click time; window doesn't exist while this page renders on the server.
  const callbackURL = () => `${window.location.origin}${target}`

  useEffect(() => {
    if (session) navigate({ to: target })
  }, [session, navigate, target])

  async function withProvider(provider: Provider) {
    setPending(provider)
    const { error } = await signIn.social({
      provider,
      callbackURL: callbackURL(),
    })
    if (error) {
      setPending(null)
      toast.error(
        error.status === 404 || error.code === 'PROVIDER_NOT_FOUND'
          ? `${providers.find((p) => p.id === provider)?.name} sign-in isn't set up yet. Try another option.`
          : (error.message ?? 'Could not start sign-in. Try again.'),
      )
    }
  }

  async function asGuest() {
    setPending('guest')
    const { error } = await signIn.anonymous()
    if (error) {
      setPending(null)
      toast.error(
        error.message ?? 'Could not start a guest session. Try again.',
      )
      return
    }
    // Guest sign-in stays in the app without a reload, so drop anything cached for whoever used this tab before.
    queryClient.clear()
    navigate({ to: target })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 outline-none"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isSignup ? 'Create your account' : 'Sign in to ' + site.name}
              </h1>
              <p className="text-muted-foreground">
                {isSignup
                  ? 'Start free. Use an account you already have, no password needed.'
                  : 'Welcome back. Use the same account you signed up with.'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {providers.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  size="lg"
                  onClick={() => withProvider(provider.id)}
                  disabled={pending !== null || comingSoon(provider.id)}
                >
                  {pending === provider.id ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <provider.icon data-icon="inline-start" />
                  )}
                  Continue with {provider.name}
                  {comingSoon(provider.id) && (
                    <Badge variant="secondary">Coming soon</Badge>
                  )}
                </Button>
              ))}
            </div>

            {guestLoginEnabled && (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
                <Button
                  variant="ghost"
                  onClick={asGuest}
                  disabled={pending !== null}
                >
                  {pending === 'guest' && <Spinner data-icon="inline-start" />}
                  Continue as guest
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Try everything without an account. Guest accounts are deleted
                  after 7 days.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              By continuing you agree to our{' '}
              <Link to="/terms" className="underline underline-offset-2">
                terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </main>
      </div>

      <aside
        className="relative hidden overflow-hidden bg-muted lg:block"
        aria-hidden="true"
      >
        <img
          src="/templates/developer.png"
          alt=""
          width={1020}
          height={1320}
          className="absolute top-16 left-16 w-[125%] max-w-none rotate-[-4deg] rounded-sm shadow-2xl ring-1 ring-black/5"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-muted via-muted/90 to-transparent px-16 pt-32 pb-14">
          <p className="max-w-md font-serif text-2xl leading-snug">
            Paste the job. Review the changes. Send the link.
          </p>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            One master profile, a tailored version for every application, and
            every change waiting for your approval.
          </p>
        </div>
      </aside>
    </div>
  )
}
