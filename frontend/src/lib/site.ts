// Product name and domain; change them here only.
export const site = {
  name: 'Shortlist',
  description:
    'AI resume builder for every field: tailor your resume to each job description, keep only the changes you like, and download an ATS-friendly PDF.',
  url: import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000',
  // Shown in marketing copy for example share links.
  displayDomain: 'shortlist.co.in',
  // Routed to the team's inbox by Cloudflare Email Routing.
  contactEmail: 'support@shortlist.co.in',
  x: 'https://x.com/J_srv001',
}

// schema.org BreadcrumbList for a page under the home page, from [name, url] pairs.
export const breadcrumbs = (trail: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [[site.name, `${site.url}/`], ...trail].map(
    ([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item }),
  ),
})
