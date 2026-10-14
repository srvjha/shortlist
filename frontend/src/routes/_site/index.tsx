import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '@/components/landing/hero-demo'
import {
  Faq,
  FinalCta,
  PlanPicker,
  Stages,
  TemplateFinder,
} from '@/components/landing/sections'
import { site } from '@/lib/site'

const title = `AI Resume Builder, Tailored to Every Job | ${site.name}`
const description =
  'Free AI resume builder: tailor your resume to each job description in one click, with LaTeX-quality templates and a free ATS checker. Built in India.'

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      logo: `${site.url}/favicon.svg`,
      email: site.contactEmail,
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
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Hero />
      <TemplateFinder />
      <Stages />
      <PlanPicker />
      <Faq />
      <FinalCta />
    </>
  )
}
