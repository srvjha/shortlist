import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'

export const queryKeys = {
  me: ['me'] as const,
  aiKeys: ['me', 'ai-keys'] as const,
  usage: ['usage'] as const,
  profile: ['profile'] as const,
  templates: ['templates'] as const,
  customTemplates: ['custom-templates'] as const,
  customTemplate: (id: string) => ['custom-templates', id] as const,
  resumes: (archived = false) => ['resumes', { archived }] as const,
  resume: (id: string) => ['resume', id] as const,
  versions: (id: string) => ['resume', id, 'versions'] as const,
  suggestions: (id: string) => ['resume', id, 'suggestions'] as const,
  shareLinks: (id: string) => ['resume', id, 'share-links'] as const,
  shareLinkStats: (id: string) => ['share-link', id, 'stats'] as const,
  jobs: ['jobs'] as const,
  job: (id: string) => ['job', id] as const,
  subscription: ['subscription'] as const,
  refundQuote: ['subscription', 'refund-quote'] as const,
  analytics: (days: number) => ['analytics', days] as const,
  admin: ['admin'] as const,
  adminReport: (report: string, days?: number) =>
    ['admin', report, days] as const,
  adminUsers: (search: AdminUsersSearch) => ['admin', 'users', search] as const,
  adminUser: (id: string) => ['admin', 'user', id] as const,
}

export const meQuery = queryOptions({
  queryKey: queryKeys.me,
  queryFn: () => unwrap(api.GET('/v1/me')),
})

export const aiKeysQuery = queryOptions({
  queryKey: queryKeys.aiKeys,
  queryFn: () => unwrap(api.GET('/v1/me/ai-keys')),
})

export const usageQuery = queryOptions({
  queryKey: queryKeys.usage,
  queryFn: () => unwrap(api.GET('/v1/usage')),
})

export const profileQuery = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: () => unwrap(api.GET('/v1/profile')),
})

export const templatesQuery = queryOptions({
  queryKey: queryKeys.templates,
  queryFn: () => unwrap(api.GET('/v1/templates')),
  staleTime: Infinity,
})

export const customTemplatesQuery = queryOptions({
  queryKey: queryKeys.customTemplates,
  queryFn: () => unwrap(api.GET('/v1/custom-templates')),
})

export const customTemplateQuery = (customTemplateId: string) =>
  queryOptions({
    queryKey: queryKeys.customTemplate(customTemplateId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/custom-templates/{customTemplateId}', {
          params: { path: { customTemplateId } },
        }),
      ),
  })

export const resumesQuery = (archived = false) =>
  queryOptions({
    queryKey: queryKeys.resumes(archived),
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes', {
          params: { query: { archived: String(archived) as never } },
        }),
      ),
  })

export const resumeQuery = (resumeId: string) =>
  queryOptions({
    queryKey: queryKeys.resume(resumeId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}', { params: { path: { resumeId } } }),
      ),
  })

export const versionsQuery = (resumeId: string) =>
  queryOptions({
    queryKey: queryKeys.versions(resumeId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}/versions', {
          params: { path: { resumeId }, query: { limit: 100 as never } },
        }),
      ),
  })

// Versions never change content, so one fetch is enough.
export const versionQuery = (resumeId: string, versionId: string) =>
  queryOptions({
    queryKey: [...queryKeys.versions(resumeId), versionId],
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}/versions/{versionId}', {
          params: { path: { resumeId, versionId } },
        }),
      ),
    staleTime: Infinity,
  })

export const jobsQuery = queryOptions({
  queryKey: queryKeys.jobs,
  queryFn: () => unwrap(api.GET('/v1/jobs')),
})

export const jobQuery = (jobId: string) =>
  queryOptions({
    queryKey: queryKeys.job(jobId),
    queryFn: () =>
      unwrap(api.GET('/v1/jobs/{jobId}', { params: { path: { jobId } } })),
  })

export const shareLinksQuery = (resumeId: string) =>
  queryOptions({
    queryKey: queryKeys.shareLinks(resumeId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}/share-links', {
          params: { path: { resumeId } },
        }),
      ),
  })

export const shareLinkStatsQuery = (shareLinkId: string) =>
  queryOptions({
    queryKey: queryKeys.shareLinkStats(shareLinkId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/share-links/{shareLinkId}/stats', {
          params: { path: { shareLinkId } },
        }),
      ),
  })

export const suggestionsQuery = (resumeId: string) =>
  queryOptions({
    queryKey: queryKeys.suggestions(resumeId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/resumes/{resumeId}/suggestions', {
          params: { path: { resumeId } },
        }),
      ),
  })

export const subscriptionQuery = queryOptions({
  queryKey: queryKeys.subscription,
  queryFn: () => unwrap(api.GET('/v1/subscription')),
})

export const refundQuoteQuery = queryOptions({
  queryKey: queryKeys.refundQuote,
  queryFn: () => unwrap(api.GET('/v1/refunds/quote')),
  retry: false,
})

export const analyticsQuery = (days: 7 | 30 | 90) =>
  queryOptions({
    queryKey: queryKeys.analytics(days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/analytics', {
          params: {
            query: {
              days: String(days) as '7' | '30' | '90',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        }),
      ),
  })

// Season Pass and Pro only; the API answers 402 on the free plan.
export const insightsQuery = (days: 7 | 30 | 90) =>
  queryOptions({
    queryKey: [...queryKeys.analytics(days), 'insights'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/analytics/insights', {
          params: {
            query: {
              days: String(days) as '7' | '30' | '90',
              timeZone: timeZone(),
            },
          },
        }),
      ),
  })

// Days are bucketed in the viewer's own time zone.
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

type AdminRange = 7 | 30 | 90

export const adminOverviewQuery = (days: AdminRange) =>
  queryOptions({
    queryKey: queryKeys.adminReport('overview', days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/overview', {
          params: {
            query: { days: String(days) as never, timeZone: timeZone() },
          },
        }),
      ),
  })

export const adminAiQuery = (days: AdminRange) =>
  queryOptions({
    queryKey: queryKeys.adminReport('ai', days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/ai', {
          params: {
            query: { days: String(days) as never, timeZone: timeZone() },
          },
        }),
      ),
  })

export const adminPromoCodesQuery = queryOptions({
  queryKey: queryKeys.adminReport('promo-codes'),
  queryFn: () => unwrap(api.GET('/v1/admin/promo-codes')),
})

export const adminRevenueQuery = (days: AdminRange) =>
  queryOptions({
    queryKey: queryKeys.adminReport('revenue', days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/revenue', {
          params: {
            query: { days: String(days) as never, timeZone: timeZone() },
          },
        }),
      ),
  })

export const adminContentQuery = (days: AdminRange) =>
  queryOptions({
    queryKey: queryKeys.adminReport('content', days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/content', {
          params: { query: { days: String(days) as never } },
        }),
      ),
  })

export const adminTrafficQuery = (days: AdminRange) =>
  queryOptions({
    queryKey: queryKeys.adminReport('traffic', days),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/traffic', {
          params: {
            query: { days: String(days) as never, timeZone: timeZone() },
          },
        }),
      ),
    // The API caches PostHog results for five minutes.
    staleTime: 5 * 60_000,
  })

export const adminSystemQuery = queryOptions({
  queryKey: queryKeys.adminReport('system'),
  queryFn: () => unwrap(api.GET('/v1/admin/system')),
  refetchInterval: 30_000,
})

export type AdminUsersSearch = {
  q?: string
  plan?: 'free' | 'season_pass' | 'pro'
  status?: 'active' | 'suspended' | 'guest'
  page?: number
}

export const adminUsersQuery = (search: AdminUsersSearch) =>
  queryOptions({
    queryKey: queryKeys.adminUsers(search),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/users', {
          params: {
            query: { ...search, page: String(search.page ?? 1) as never },
          },
        }),
      ),
    placeholderData: (previous) => previous,
  })

export const adminUserQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.adminUser(userId),
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/users/{userId}', {
          params: { path: { userId } },
        }),
      ),
  })

export const aiRunsQuery = queryOptions({
  queryKey: ['me', 'ai-runs'] as const,
  queryFn: () => unwrap(api.GET('/v1/me/ai-runs')),
})
