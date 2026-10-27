import { createFileRoute } from '@tanstack/react-router'
import { Bento } from '@/components/landing/bento'
import { Hero } from '@/components/landing/hero-demo'
import { JobAndShare } from '@/components/landing/job-and-share'
import {
  Faq,
  FinalCta,
  PlanPicker,
  TemplateFinder,
} from '@/components/landing/sections'
import { fetchPricing } from '@/lib/public-api'
import { site } from '@/lib/site'

const title = `Free AI Resume Builder, Tailored to Every Job | ${site.name}`
const description =
  'Free AI resume builder for students and freshers in every field: tailor your resume to each job description, keep only the changes you like, and download an ATS-friendly PDF.'

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      logo: `${site.url}/favicon.svg`,
      email: site.contactEmail,
      sameAs: [site.x],
    },
    {
      '@type': 'WebApplication',
      name: site.name,
      url: site.url,
      description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    },
  ],
}

export const Route = createFileRoute('/_site/')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: `${site.url}/` },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
    ],
  }),
  loader: () => fetchPricing(),
  component: LandingPage,
})

function LandingPage() {
  const pricing = Route.useLoaderData()
  return (
    <>
      <Hero />
      <JobAndShare />
      <TemplateFinder />
      <Bento />
      <PlanPicker pricing={pricing} />
      <Faq />
      <FinalCta />
    </>
  )
}
