import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  useLocation,
} from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '@/components/app/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { meQuery } from '@/lib/api/queries'
import { site } from '@/lib/site'

const ranges = [7, 30, 90] as const
export type AdminRange = (typeof ranges)[number]

const tabs = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/users', label: 'Users', exact: false },
  { to: '/admin/ai', label: 'AI', exact: false },
  { to: '/admin/revenue', label: 'Revenue', exact: false },
  { to: '/admin/promo-codes', label: 'Promo codes', exact: false },
  { to: '/admin/content', label: 'Content', exact: false },
  { to: '/admin/traffic', label: 'Traffic', exact: false },
  { to: '/admin/api', label: 'API', exact: false },
  { to: '/admin/system', label: 'System', exact: false },
] as const

// Pages that report over a time range; the others ignore it.
const ranged = [
  '/admin',
  '/admin/ai',
  '/admin/revenue',
  '/admin/content',
  '/admin/traffic',
  '/admin/api',
]

export const Route = createFileRoute('/_app/admin')({
  validateSearch: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional(),
  }),
  // The API enforces access on every request; this only keeps non-admins from seeing an empty shell.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!me.isAdmin) throw notFound()
  },
  head: () => ({ meta: [{ title: `Admin | ${site.name}` }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const { days = 30 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const showRange = ranged.includes(pathname.replace(/\/$/, '') || '/')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Admin"
          description="Everything happening in Shortlist, in one place."
          actions={
            showRange && (
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(days)}
                onValueChange={(value) =>
                  value &&
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      days: Number(value) as AdminRange,
                    }),
                    replace: true,
                  })
                }
                aria-label="Time range"
              >
                {ranges.map((range) => (
                  <ToggleGroupItem key={range} value={String(range)}>
                    {range} days
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )
          }
        />
        <nav
          aria-label="Admin sections"
          className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
        >
          <ul className="flex min-w-max gap-1 border-b">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  search={{ days: days === 30 ? undefined : days }}
                  activeOptions={{ exact: tab.exact, includeSearch: false }}
                  className="-mb-px flex h-11 items-center border-b-2 border-transparent px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[status=active]:border-primary data-[status=active]:font-medium data-[status=active]:text-foreground"
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
