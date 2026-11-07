import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'

// The prompt at the end of a public letter page: what an account adds.
export function LetterSignup({ text }: { text: string }) {
  const { data: session } = useSession()
  return (
    <aside className="mt-12 flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-lg font-semibold">
          Keep it with your resume
        </h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <Button asChild className="min-h-11 shrink-0">
        {session ? (
          <Link to="/letters">
            Open my letters
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        ) : (
          <Link to="/login" search={{ mode: 'signup' }}>
            Sign up free
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        )}
      </Button>
    </aside>
  )
}
