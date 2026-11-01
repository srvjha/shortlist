import createClient from 'openapi-fetch'
import { apiUrl } from '@/lib/env'
import { rememberApiError } from '@/lib/report'
import type { paths } from './schema'

export const api = createClient<paths>({
  baseUrl: apiUrl,
  credentials: 'include',
})

type ErrorBody = {
  error?: { code?: string; message?: string; details?: unknown }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const UNREACHABLE =
  "Couldn't reach Shortlist. Check your connection and try again."

// fetch rejects with a TypeError when no response arrives at all (offline, CORS, server restarting).
async function send<T>(request: Promise<T>) {
  try {
    return await request
  } catch (error) {
    if (error instanceof TypeError) {
      rememberApiError({ message: UNREACHABLE, code: 'UNREACHABLE', status: 0 })
      throw new ApiError(0, 'UNREACHABLE', UNREACHABLE)
    }
    throw error
  }
}

export function toApiError(
  response: Response,
  error: unknown,
  fallback: string,
) {
  const body = (error ?? {}) as ErrorBody
  // A gateway answers for the API while it's down, without our error body.
  const gateway = [502, 503, 504].includes(response.status)
  const apiError = new ApiError(
    response.status,
    body.error?.code ?? (gateway ? 'UNREACHABLE' : 'UNKNOWN'),
    body.error?.message ?? (gateway ? UNREACHABLE : fallback),
    body.error?.details,
  )
  rememberApiError({
    message: apiError.message,
    code: apiError.code,
    status: apiError.status,
    path: response.url ? new URL(response.url).pathname : undefined,
  })
  return apiError
}

// Turns openapi-fetch's { data, error } into the payload or a thrown ApiError.
export async function unwrap<T>(
  request: Promise<{ data?: { data: T }; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await send(request)
  if (error !== undefined || !data)
    throw toApiError(response, error, 'Something went wrong. Try again.')
  return data.data
}

// For endpoints that answer 204 No Content.
export async function expectOk(
  request: Promise<{ error?: unknown; response: Response }>,
) {
  const { error, response } = await send(request)
  if (!response.ok) throw toApiError(response, error, 'Something went wrong.')
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Try again.'
}
