import { Link } from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSession } from '@/lib/auth-client'

const nav = [
  { to: '/templates', label: 'Templates' },
  { to: '/ats-checker', label: 'ATS checker' },
  { to: '/guides', label: 'Guides' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
] as const

export function SiteHeader() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Button key={item.to} variant="ghost" asChild>
              <Link
                to={item.to}
                activeProps={{ className: 'text-foreground' }}
                className="text-muted-foreground"
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {session ? (
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/workspace">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/login" search={{ mode: 'signup' }}>
                  Build my resume
                </Link>
              </Button>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            {/* Tapping any link, the logo included, closes the menu. */}
            <SheetContent
              side="right"
              className="w-72"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a[href]'))
                  setOpen(false)
              }}
            >
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo />
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {nav.map((item) => (
                  <Button
                    key={item.to}
                    variant="ghost"
                    className="justify-start"
                    asChild
                  >
                    <Link to={item.to}>{item.label}</Link>
                  </Button>
                ))}
                <Button className="mt-4" asChild>
                  <Link to={session ? '/workspace' : '/login'}>
                    {session ? 'Open workspace' : 'Sign in'}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
