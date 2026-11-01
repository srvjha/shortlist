import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BookOpenIcon,
  BriefcaseBusinessIcon,
  ChartColumnIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  FlagIcon,
  FileTextIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  UserRoundIcon,
} from 'lucide-react'
import { openReport } from '@/lib/report'
import { toast } from '@/lib/toast'
import { Logo } from '@/components/brand/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { meQuery, usageQuery } from '@/lib/api/queries'
import { signOut } from '@/lib/auth-client'
import { initials, planLabels } from '@/lib/format'
import { useTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

const nav = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    match: ['/dashboard'],
  },
  {
    to: '/workspace',
    label: 'Workspace',
    icon: FileTextIcon,
    match: ['/workspace', '/resumes'],
  },
  {
    to: '/ats',
    label: 'Check your ATS score',
    icon: GaugeIcon,
    match: ['/ats'],
  },
  {
    to: '/my-templates',
    label: 'Templates',
    icon: LayoutTemplateIcon,
    match: ['/my-templates'],
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: UserRoundIcon,
    match: ['/profile'],
  },
  { to: '/jobs', label: 'Jobs', icon: BriefcaseBusinessIcon, match: ['/jobs'] },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: ChartColumnIcon,
    match: ['/analytics'],
  },
  {
    to: '/guides',
    label: 'Resume guides',
    icon: BookOpenIcon,
    match: ['/guides'],
  },
  {
    to: '/billing',
    label: 'Plans and billing',
    icon: CreditCardIcon,
    match: ['/billing'],
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    match: ['/settings'],
  },
] as const

function UsageCard() {
  const { data: usage } = useQuery(usageQuery)
  if (!usage || usage.plan !== 'free' || usage.ownAiKey) return null
  const left = Math.max(0, usage.tailor.limit - usage.tailor.used)
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium tabular-nums">
        {left} of {usage.tailor.limit} AI-tailored resumes left this month
      </p>
      <Progress
        value={(left / usage.tailor.limit) * 100}
        aria-label="AI-tailored resumes left this month"
      />
      <p className="tabular-nums">
        {Math.max(0, usage.edit.limit - usage.edit.used)} of {usage.edit.limit}{' '}
        AI edits left
      </p>
      <p className="text-xs text-muted-foreground">
        Resumes you write yourself are always free and unlimited.
      </p>
      <Button size="sm" variant="outline" asChild>
        <Link to="/billing">Get 40 a month with Season Pass</Link>
      </Button>
    </div>
  )
}

export function AppSidebar() {
  const { data: me } = useQuery(meQuery)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })

  async function handleSignOut() {
    const { error } = await signOut()
    if (error) {
      toast.error('Could not sign out. Check your connection and try again.')
      return
    }
    navigate({ to: '/' })
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Logo to="/dashboard" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.match.some((prefix) =>
                      pathname.startsWith(prefix),
                    )}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => openReport()}>
                  <FlagIcon />
                  <span>Report a problem</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {me?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Team</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                  >
                    <Link to="/admin">
                      <ShieldIcon />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="gap-3 p-3">
        <UsageCard />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="h-auto py-2">
              <Avatar className="size-8">
                {me?.image && <AvatarImage src={me.image} alt="" />}
                <AvatarFallback>
                  {me ? initials(me.name || me.username) : ''}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate font-medium">
                  {me ? me.name || me.username : 'Loading…'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {me ? `@${me.username}` : ''}
                </span>
              </span>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span className="truncate">{me?.email}</span>
              {me && <Badge variant="secondary">{planLabels[me.plan]}</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as Theme)}
              >
                <DropdownMenuRadioItem value="light">
                  <SunIcon />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <MoonIcon />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <MonitorIcon />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={handleSignOut}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
