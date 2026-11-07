import { ApiError } from './client'

// Friendly copy for errors people can act on; anything else falls back to the server message.
export function aiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'AI_NOT_CONFIGURED')
      return 'AI features are not set up on this server yet.'
    if (error.code === 'AI_FAILED')
      return 'The AI could not finish this request. Try again in a moment.'
    if (error.code === 'RATE_LIMITED')
      return 'Too many requests. Wait a minute and try again.'
    return error.message
  }
  return 'Something went wrong. Try again.'
}

// For an error toast: when the error is a plan limit, offers the way to more instead of the Report button.
export const upgradeAction = (error: unknown) =>
  error instanceof ApiError && error.code === 'QUOTA_EXCEEDED'
    ? {
        action: {
          label: 'See plans',
          onClick: () => window.location.assign('/pricing'),
        },
      }
    : undefined
