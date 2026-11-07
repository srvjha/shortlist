import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import {
  EmptyNote,
  PlanBadge,
  PlanEnds,
  QueryView,
  providerLabel,
  CopyEmail,
  displayName,
} from '@/components/admin/admin-ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebouncedEffect } from '@/hooks/use-debounced-effect'
import { adminUsersQuery } from '@/lib/api/queries'
import type { AdminUserList } from '@/lib/api/types'
import { formatDate, formatNumber, initials, timeAgo } from '@/lib/format'
import { site } from '@/lib/site'

const search = z.object({
  q: z.string().optional(),
  plan: z.enum(['free', 'season_pass', 'pro', 'lifetime']).optional(),
  status: z.enum(['active', 'suspended', 'guest']).optional(),
  page: z.number().int().min(1).optional(),
})

export const Route = createFileRoute('/_app/admin/users/')({
  validateSearch: search,
  head: () => ({ meta: [{ title: `Users · Admin | ${site.name}` }] }),
  loaderDeps: ({ search: { q, plan, status, page } }) => ({
    q,
    plan,
    status,
    page,
  }),
  // Not awaited, so switching tabs or ranges shows the loading state at once instead of holding the old page.
  loader: ({ context, deps, cause }) =>
    cause === 'stay'
      ? undefined
      : void context.queryClient.prefetchQuery(adminUsersQuery(deps)),
  component: UsersPage,
})

const ALL = 'all'

function UsersPage() {
  const { q, plan, status, page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [text, setText] = useState(q ?? '')
  const users = useQuery(adminUsersQuery({ q, plan, status, page }))

  const update = (changes: Partial<z.infer<typeof search>>) =>
    navigate({
      search: (prev) => ({ ...prev, page: undefined, ...changes }),
      replace: true,
    })

  useDebouncedEffect(
    () => {
      const next = text.trim() || undefined
      if (next !== q) update({ q: next })
    },
    [text],
    300,
  )

  const filtered = Boolean(q || plan || status)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <InputGroup className="min-w-0 flex-1 basis-64">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Name, email or username"
            aria-label="Search users"
          />
        </InputGroup>
        <Select
          value={plan ?? ALL}
          onValueChange={(value) =>
            update({ plan: value === ALL ? undefined : (value as typeof plan) })
          }
        >
          <SelectTrigger className="w-40" aria-label="Plan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="season_pass">Season Pass</SelectItem>
            <SelectItem value="pro">Basic</SelectItem>
            <SelectItem value="lifetime">Pro</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status ?? ALL}
          onValueChange={(value) =>
            update({
              status: value === ALL ? undefined : (value as typeof status),
            })
          }
        >
          <SelectTrigger className="w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Signed-up users</SelectItem>
            <SelectItem value="active">Not suspended</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="guest">Guests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <QueryView query={users}>
        {(data) =>
          data.users.length === 0 ? (
            <EmptyNote>
              {filtered ? (
                <>
                  No users match these filters.{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => {
                      setText('')
                      update({
                        q: undefined,
                        plan: undefined,
                        status: undefined,
                      })
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                'Nobody has signed up yet.'
              )}
            </EmptyNote>
          ) : (
            <UsersTable
              data={data}
              onPage={(next) =>
                navigate({ search: (prev) => ({ ...prev, page: next }) })
              }
            />
          )
        }
      </QueryView>
    </div>
  )
}

function UsersTable({
  data,
  onPage,
}: {
  data: AdminUserList
  onPage: (page: number) => void
}) {
  const from = (data.page - 1) * data.pageSize + 1
  const to = from + data.users.length - 1
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Signs in with</TableHead>
              <TableHead className="text-right">Resumes</TableHead>
              <TableHead className="text-right">AI runs</TableHead>
              <TableHead className="text-right">Last active</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((user) => (
              <TableRow key={user.id} className="relative">
                <TableCell className="max-w-72">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {user.image && <AvatarImage src={user.image} alt="" />}
                      <AvatarFallback>
                        {initials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col">
                      {/* The link's overlay makes the whole row clickable. */}
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: user.id }}
                        className="truncate font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {displayName(user)}
                      </Link>
                      <CopyEmail
                        email={user.email}
                        className="text-xs text-muted-foreground"
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1.5">
                    <PlanBadge plan={user.plan} />
                    {user.suspendedAt && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                    {user.isAnonymous && <Badge variant="outline">Guest</Badge>}
                  </span>
                  <PlanEnds endsAt={user.planEndsAt} paid={user.planPaid} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.providers.map(providerLabel).join(', ') || 'None'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(user.resumes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(user.aiRuns)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {user.lastActiveAt ? timeAgo(user.lastActiveAt) : 'Never'}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground tabular-nums">
          {formatNumber(from)} to {formatNumber(to)} of{' '}
          {formatNumber(data.total)}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Page {data.page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= pages}
            onClick={() => onPage(data.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
