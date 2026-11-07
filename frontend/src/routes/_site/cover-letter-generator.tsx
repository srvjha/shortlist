import { createFileRoute } from '@tanstack/react-router'
import { CoverLetterTool } from '@/components/letters/cover-letter-tool'
import { LetterSignup } from '@/components/letters/letter-signup'
import { FaqList } from '@/components/site/faq-list'
import { breadcrumbs, site } from '@/lib/site'

const title = `Free AI Cover Letter Generator from Your Resume | ${site.name}`
const description =
  'Paste your resume and a job description to get a cover letter that uses only what is in your resume, and flags anything it can’t back up. Free, no sign up.'
const url = `${site.url}/cover-letter-generator`

const faqs = [
  {
    q: 'Will it make things up?',
    a: 'It is told to use only what your resume says, and the result is checked afterwards. Any number, tool or name in the letter that is not in your resume is shown to you, so you can keep it if it is true or remove it. The check looks for specific terms, so still read the whole letter before you send it.',
  },
  {
    q: 'Is what I paste saved?',
    a: 'No. Your resume and the job description are used to write this one letter and then discarded. Only the size and cost of the AI request are logged. Before anything goes to the AI model, email addresses and phone numbers are replaced with placeholders.',
  },
  {
    q: 'How many can I write?',
    a: 'Up to 3 an hour without an account. With a free account you get 30 a month, written from your saved resumes and jobs.',
  },
  {
    q: 'Do I still need a cover letter?',
    a: 'It depends on the role. If the application asks for one or lets you add one, a short letter is a good place to connect your experience to that job in your own words.',
  },
]

export const Route = createFileRoute('/_site/cover-letter-generator')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        }),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          breadcrumbs([['Cover letter generator', url]]),
        ),
      },
    ],
  }),
  component: CoverLetterPage,
})

function CoverLetterPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 lg:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Free AI cover letter generator
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Paste your resume and the job. You get a letter that uses only what
          your resume says, and anything it can't back up is flagged. No sign up
          needed.
        </p>
      </div>
      <div className="mt-12">
        <CoverLetterTool />
      </div>
      <LetterSignup text="Sign up to save your letters, write them in one click from a tailored resume, and download a PDF that matches it." />
      <section
        aria-labelledby="cover-faq"
        className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]"
      >
        <h2 id="cover-faq" className="text-3xl font-semibold tracking-tight">
          Questions about cover letters
        </h2>
        <FaqList faqs={faqs} />
      </section>
    </div>
  )
}
