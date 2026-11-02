import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from '@tanstack/react-router'
import { FileTextIcon, LockIcon } from 'lucide-react'
import { PublicMessage, PublicShell } from '@/components/public/public-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchPublicProfile } from '@/lib/public-api'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'

export const Route = createFileRoute('/$username/')({
  loader: async ({ params }) => {
    const outcome = await fetchPublicProfile({
      data: { username: params.username },
    })
    if (outcome.status === 'not_found') throw notFound()
    // Old usernames still work; move the visitor to the current address.
    if (
      outcome.status === 'ok' &&
      outcome.data.username !== params.username.toLowerCase()
    )
      throw redirect({
        to: '/$username',
        params: { username: outcome.data.username },
        statusCode: 301,
      })
    return outcome
  },
  head: ({ loaderData }) => {
    const ok = loaderData?.status === 'ok'
    const name = ok
      ? loaderData.data.name || loaderData.data.username
      : 'Profile'
    // Thin profiles, error pages and missing profiles stay out of search results.
    const indexable = ok && loaderData.data.resumes.length > 0
    return {
      meta: [
        // No loader data means the loader threw notFound.
        {
          title: loaderData
            ? `${name} | Resumes`
            : `Page not found | ${site.name}`,
        },
        { name: 'description', content: `Resumes shared by ${name}.` },
        ...(indexable
          ? []
          : [{ name: 'robots', content: 'noindex, nofollow' }]),
      ],
      links: ok
        ? [
            {
              rel: 'canonical',
              href: `${site.url}/${loaderData.data.username}`,
            },
          ]
        : [],
    }
  },
  component: ProfilePage,
  notFoundComponent: () => (
    <PublicMessage
      title="No one here yet"
      body="There's no profile at this address. Check the spelling of the username."
    />
  ),
})

function ProfilePage() {
  const outcome = Route.useLoaderData()
  if (outcome.status !== 'ok') {
    return (
      <PublicMessage
        title="Something went wrong"
        body="We could not load this profile. Try again in a moment."
      />
    )
  }
  const profile = outcome.data
  const displayName = profile.name || profile.username
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-14">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {profile.image && <AvatarImage src={profile.image} alt="" />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight break-words">
              {displayName}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {profile.resumes.length === 0 ? (
          <p className="text-muted-foreground">
            {displayName} hasn't shared any resumes publicly yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {profile.resumes.map((resume) => (
              <li key={resume.slug}>
                <Link
                  to="/$username/$slug"
                  params={{ username: profile.username, slug: resume.slug }}
                  // Loading a share page counts a view, so a hover must not load it.
                  preload={false}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-accent/50"
                >
                  <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{resume.title}</span>
                    <span className="text-sm text-muted-foreground">
                      Updated {formatDate(resume.updatedAt)}
                    </span>
                  </span>
                  {resume.hasPassword && (
                    <LockIcon
                      className="size-4 text-muted-foreground"
                      role="img"
                      aria-label="Password protected"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  )
}
