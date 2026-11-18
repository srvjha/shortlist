import type { ResumeContent } from './api/types'

const hasScheme = /^[a-z][a-z0-9+.-]*:/i

function withScheme(url: string) {
  if (hasScheme.test(url)) return url
  return /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(url)
    ? `mailto:${url}`
    : `https://${url.replace(/^\/+/, '')}`
}

const isEmptyLink = (item: unknown) =>
  typeof item === 'object' &&
  item !== null &&
  'label' in item &&
  !('url' in item)

// What the editor holds mid-edit (a link row not filled in yet, "linkedin.com/in/you" without https://, a cleared
// email) made every autosave fail. This fills in or leaves out those values in the copy that is saved.
export function savable(content: ResumeContent): ResumeContent {
  return JSON.parse(JSON.stringify(content), (key, value: unknown) => {
    if (Array.isArray(value)) return value.filter((item) => !isEmptyLink(item))
    if ((key === 'url' || key === 'email') && typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      return key === 'url' ? withScheme(trimmed) : trimmed
    }
    return value
  }) as ResumeContent
}

// The part of a failed save the user can fix, in words, for "Couldn't save: …". Null when it isn't theirs to fix.
export function saveProblem(error: unknown) {
  const { code, details } = (error ?? {}) as {
    code?: string
    details?: unknown
  }
  if (code !== 'VALIDATION_ERROR' || !Array.isArray(details)) return null
  const path = String(
    (details[0] as { path?: unknown } | undefined)?.path ?? '',
  )
  if (/email$/.test(path)) return 'finish your email address'
  if (/url$/.test(path)) return 'one of your links is not a full web address'
  if (/title$/.test(path)) return 'a section needs a title'
  if (/(start|end)$/.test(path)) return 'check your dates'
  return 'something you just typed is too long or incomplete'
}
