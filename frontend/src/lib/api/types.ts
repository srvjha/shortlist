import type { paths } from './schema'

type JsonData<T> = T extends {
  content: { 'application/json': { data: infer D } }
}
  ? D
  : never

// Payload type of a successful JSON response, e.g. ResponseData<'/v1/me', 'get'>.
export type ResponseData<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath],
> = paths[TPath][TMethod] extends { responses: infer R }
  ? JsonData<
      R extends { 200: infer S } ? S : R extends { 201: infer S } ? S : never
    >
  : never

export type RequestBody<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath],
> = paths[TPath][TMethod] extends {
  requestBody?: { content: { 'application/json': infer B } }
}
  ? B
  : never

export type Me = ResponseData<'/v1/me', 'get'>
export type Usage = ResponseData<'/v1/usage', 'get'>
export type Pricing = ResponseData<'/v1/pricing', 'get'>
export type Profile = ResponseData<'/v1/profile', 'get'>
export type ResumeContent = Profile['content']
export type ResumeSection = ResumeContent['sections'][number]
export type Template = ResponseData<'/v1/templates', 'get'>[number]
export type CustomTemplateSummary = ResponseData<
  '/v1/custom-templates',
  'get'
>[number]
export type CustomTemplate = ResponseData<
  '/v1/custom-templates/{customTemplateId}',
  'get'
>
export type Analytics = ResponseData<'/v1/analytics', 'get'>
export type Insights = ResponseData<'/v1/analytics/insights', 'get'>
export type ResumeSummary = ResponseData<'/v1/resumes', 'get'>[number]
export type ResumeDetail = ResponseData<'/v1/resumes/{resumeId}', 'get'>
export type VersionSummary = ResponseData<
  '/v1/resumes/{resumeId}/versions',
  'get'
>[number]
export type VersionDetail = ResponseData<
  '/v1/resumes/{resumeId}/versions/{versionId}',
  'get'
>
export type Job = ResponseData<'/v1/jobs/{jobId}', 'get'>
export type JobSummary = ResponseData<'/v1/jobs', 'get'>[number]
export type Suggestion = ResponseData<
  '/v1/resumes/{resumeId}/suggestions/{suggestionId}',
  'get'
>
export type SuggestionOperation = Suggestion['operations'][number]
export type Coverage = ResponseData<'/v1/resumes/{resumeId}/coverage', 'get'>
export type ShareLink = ResponseData<'/v1/share-links/{shareLinkId}', 'get'>
export type ShareLinkStats = ResponseData<
  '/v1/share-links/{shareLinkId}/stats',
  'get'
>
export type Subscription = ResponseData<'/v1/subscription', 'get'>
export type PublicProfile = ResponseData<'/v1/public/users/{username}', 'get'>
export type PublicResume = ResponseData<
  '/v1/public/users/{username}/resumes/{slug}',
  'get'
>
export type CreateResumeBody = RequestBody<'/v1/resumes', 'post'>

export type AdminOverview = ResponseData<'/v1/admin/overview', 'get'>
export type AdminUserList = ResponseData<'/v1/admin/users', 'get'>
export type AdminUser = ResponseData<'/v1/admin/users/{userId}', 'get'>
export type AdminAi = ResponseData<'/v1/admin/ai', 'get'>
export type AdminRevenue = ResponseData<'/v1/admin/revenue', 'get'>
export type AdminPromoCodes = ResponseData<'/v1/admin/promo-codes', 'get'>
export type AdminContent = ResponseData<'/v1/admin/content', 'get'>
export type AdminTraffic = ResponseData<'/v1/admin/traffic', 'get'>
export type AdminApi = ResponseData<'/v1/admin/api', 'get'>
export type AdminSystem = ResponseData<'/v1/admin/system', 'get'>
export type AiRunList = ResponseData<'/v1/me/ai-runs', 'get'>

export type AtsReport = ResponseData<'/v1/ats-reports', 'post'>
export type AtsCheckStatus =
  AtsReport['categories'][number]['checks'][number]['status']
