import { createServerFn } from '@tanstack/react-start'
import {
  getCookie,
  getRequestHeader,
  setCookie,
} from '@tanstack/react-start/server'
import type { Pricing, PublicProfile, PublicResume } from '@/lib/api/types'
import { apiUrl } from '@/lib/env'

type Outcome<T> =
  | { status: 'ok'; data: T }
  | {
      status: 'password' | 'wrong_password' | 'expired' | 'not_found' | 'error'
    }

const VISITOR_COOKIE = 'kz_visitor'

// These pages call the API from this server, so it would see one IP and no session for everyone. The session cookie
// lets it skip the owner's own views; the visitor's IP, vouched for by the shared secret, gives each visitor their
// own rate limit.
function forwardedHeaders() {
  const headers: Record<string, string> = {}
  const cookie = getRequestHeader('cookie')
  if (cookie) headers.cookie = cookie
  const secret = process.env.PROXY_SECRET
  const ip =
    getRequestHeader('x-real-ip') ??
    getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim()
  if (secret && ip) {
    headers['x-shortlist-proxy'] = secret
    headers['x-shortlist-client-ip'] = ip
  }
  return headers
}

// Share pages render on our server, so pass the visitor's own details to the API for view stats.
function visitorHeaders() {
  let visitor = getCookie(VISITOR_COOKIE)
  if (!visitor) {
    visitor = crypto.randomUUID()
    setCookie(VISITOR_COOKIE, visitor, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }
  const headers: Record<string, string> = {
    ...forwardedHeaders(),
    'x-share-visitor': visitor,
  }
  const userAgent = getRequestHeader('user-agent')
  const referrer = getRequestHeader('referer')
  const country =
    getRequestHeader('cf-ipcountry') ?? getRequestHeader('x-vercel-ip-country')
  if (userAgent) headers['x-share-user-agent'] = userAgent
  if (referrer) headers['x-share-referrer'] = referrer
  if (country) headers['cf-ipcountry'] = country
  // Vercel's geo headers. The city stays URL-encoded: decoded names like "Farīdābād" make fetch throw.
  const region = getRequestHeader('x-vercel-ip-country-region')
  const city = getRequestHeader('x-vercel-ip-city')
  if (region) headers['x-share-region'] = region
  if (city) headers['x-share-city'] = city
  return headers
}

async function call<T>(
  path: string,
  headers: Record<string, string>,
  password?: string,
  contactPassword?: string,
): Promise<Outcome<T>> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: {
        ...headers,
        ...(password && { 'x-share-password': password }),
        ...(contactPassword && { 'x-share-contact-password': contactPassword }),
      },
    })
    const body = (await response.json()) as {
      data?: T
      error?: { code?: string }
    }
    if (response.ok && body.data) return { status: 'ok', data: body.data }
    if (body.error?.code === 'PASSWORD_REQUIRED')
      return { status: password ? 'wrong_password' : 'password' }
    if (body.error?.code === 'LINK_EXPIRED') return { status: 'expired' }
    if (response.status === 404) return { status: 'not_found' }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

export const fetchPublicResume = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      username: string
      slug: string
      password?: string
      contactPassword?: string
    }) => input,
  )
  .handler(({ data }) =>
    call<PublicResume>(
      `/v1/public/users/${encodeURIComponent(data.username)}/resumes/${encodeURIComponent(data.slug)}`,
      visitorHeaders(),
      data.password,
      data.contactPassword,
    ),
  )

export const fetchPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator((input: { username: string }) => input)
  .handler(({ data }) =>
    call<PublicProfile>(
      `/v1/public/users/${encodeURIComponent(data.username)}`,
      forwardedHeaders(),
    ),
  )

// Prices for the visitor's country. Pages render on this server, so the API is told the visitor's IP.
export const fetchPricing = createServerFn({ method: 'GET' }).handler(
  async () => {
    const outcome = await call<Pricing>('/v1/pricing', forwardedHeaders())
    return outcome.status === 'ok' ? outcome.data : null
  },
)
