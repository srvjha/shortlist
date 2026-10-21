import { createFileRoute } from '@tanstack/react-router'
import { AtsChecker } from '@/components/ats/ats-checker'
import { FaqList } from '@/components/site/faq-list'
import { site } from '@/lib/site'

const title = `Free ATS Resume Checker: Score Your Resume Online | ${site.name}`
const description =
  'Check how well a typical applicant tracking system and a recruiter will read your resume. Free score out of 100 with concrete fixes. Nothing is stored.'

const faqs = [
  {
    q: 'What is an ATS?',
    a: 'An applicant tracking system is the software companies use to collect applications. It reads your resume into fields like name, experience and skills so recruiters can search and filter candidates. If it cannot read part of your resume, that part may never reach a person.',
  },
  {
    q: 'Is this the score employers see?',
    a: 'No. There is no universal ATS score. Every company uses different software, set up in its own way. This score estimates how cleanly a typical ATS can read your resume and how easy it is for a recruiter to scan, so you know what to fix.',
  },
  {
    q: 'Will an ATS reject my resume automatically?',
    a: "Rarely. Real ATS software ranks applicants for each job instead of rejecting them. What filters candidates out is knockout questions on the application form (like location, work authorization or years of experience), recruiters searching for keywords, and per-job match tiers. So the useful goal is a resume that parses cleanly, matches the job's must-have skills, and answers its knockout requirements. This checker looks at all three.",
  },
  {
    q: 'Will you keep my resume?',
    a: 'No. A PDF is read in your browser and only its text, with where each piece sits on the page, is sent to be checked. It is scored and then discarded, and nothing is saved to an account.',
  },
  {
    q: 'Why does my PDF show no text?',
    a: 'It was probably scanned or exported as an image. Most ATS software cannot read those either. Export the PDF again from Word, Google Docs or LaTeX so the text can be selected, or paste the text instead.',
  },
  {
    q: 'How is the score worked out?',
    a: 'With fixed rules, not AI, so the same resume always gets the same score. It looks at things like contact details, standard section headings, bullet length, numbers in your bullets and overall length. A PDF is also read the way an ATS parser reads it, to catch columns, contact details in the page header and icon fonts. Add a job description to see which of its must-have and other skills you are missing, how your title compares, and which requirements a recruiter will check. Skills are matched using data from O*NET and ESCO. When you are signed in and add a job description, AI also checks the skills your resume implies (PostgreSQL for SQL, say) and requirements the rules could not settle, quoting your resume as evidence. It never changes the score.',
  },
]

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
}

export const Route = createFileRoute('/_site/ats-checker')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: `${site.url}/ats-checker` },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/ats-checker` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
    ],
  }),
  component: AtsCheckerPage,
})

function AtsCheckerPage() {
  return (
    <div className="px-5 pt-14 lg:pt-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Free ATS resume checker
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            See how well a typical applicant tracking system and a recruiter's
            quick scan will read your resume, with a list of concrete fixes. No
            sign up needed.
          </p>
        </div>
      </div>
      <AtsChecker />

      <div className="mx-auto max-w-3xl">
        <section
          aria-labelledby="ats-faq"
          className="mt-24 grid gap-10 lg:-mx-24 lg:grid-cols-[1fr_1.4fr]"
        >
          <h2 id="ats-faq" className="text-3xl font-semibold tracking-tight">
            Questions about ATS checks
          </h2>
          <FaqList faqs={faqs} />
        </section>
        <footer className="mt-16 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground lg:-mx-24">
          <p>
            This product includes information from the O*NET 30.2 Database
            (Technology Skills) by the U.S. Department of Labor, Employment and
            Training Administration (USDOL/ETA). Used under the{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline underline-offset-2 hover:text-foreground"
            >
              CC BY 4.0
            </a>{' '}
            license. O*NET® is a trademark of USDOL/ETA. {site.name} has
            modified all or some of this information. USDOL/ETA has not
            approved, endorsed, or tested these modifications.
          </p>
          <p>
            This service uses the ESCO classification of the European
            Commission.
          </p>
        </footer>
      </div>
    </div>
  )
}
