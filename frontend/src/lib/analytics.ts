import type { PostHog } from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined

let client: Promise<PostHog> | undefined

// Page views, web analytics and session replay. Recordings mask all text and inputs, because
// resumes appear as plain text in the editor and on share pages. Empty key: nothing is sent.
// The library is fetched on first use, not in the page's first bundle, and calls made before it
// arrives wait for it.
function posthog() {
  client ??= import('posthog-js').then(({ default: ph }) => {
    ph.init(key!, {
      api_host:
        (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
        'https://us.i.posthog.com',
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
      mask_all_text: true,
      session_recording: { maskAllInputs: true, maskTextSelector: '*' },
      // Load, interaction and layout-shift timings as real visitors experience them, not just server time.
      capture_performance: { web_vitals: true },
    })
    return ph
  })
  return client
}

const enabled = () => Boolean(key) && typeof window !== 'undefined'

// Starts analytics once the browser is idle, so it never competes with first paint and hydration.
export function initAnalytics() {
  if (!enabled()) return
  const start = () => void posthog()
  if ('requestIdleCallback' in window)
    requestIdleCallback(start, { timeout: 4000 })
  else setTimeout(start, 2000)
}

export function track(event: string, properties: Record<string, unknown>) {
  if (enabled()) void posthog().then((ph) => ph.capture(event, properties))
}

// The backend sends product events under the same user id, so they join this person's page views.
export function identifyUser(userId: string) {
  if (enabled()) void posthog().then((ph) => ph.identify(userId))
}

export function resetAnalytics() {
  if (enabled()) void posthog().then((ph) => ph.reset())
}
