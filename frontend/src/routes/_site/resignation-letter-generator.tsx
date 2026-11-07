import { createFileRoute } from '@tanstack/react-router'
import { LetterSignup } from '@/components/letters/letter-signup'
import { ResignationForm } from '@/components/letters/resignation-form'
import { FaqList } from '@/components/site/faq-list'
import { breadcrumbs, site } from '@/lib/site'

const title = `Free Resignation Letter Generator with Notice Period | ${site.name}`
const description =
  'Write a resignation letter in a minute. Works out your last working day from your notice period, with versions for India and elsewhere. Free, no sign up.'
const url = `${site.url}/resignation-letter-generator`

const faqs = [
  {
    q: 'How is my last working day worked out?',
    a: 'It adds your notice period, in calendar days, to the date of your letter, starting from the next day. If you buy out part of your notice, those days come off first. Contracts differ: some count the day you resign, and some end on a working day, so check yours and edit the date if needed.',
  },
  {
    q: 'What is a notice period buyout?',
    a: 'In India, many employment contracts let you pay your employer for the notice days you do not serve, so you can leave sooner. It usually needs your employer to agree, so the letter asks rather than assumes.',
  },
  {
    q: 'What is a relieving letter?',
    a: 'A document from your employer saying you have left and your duties are complete. Many employers in India ask for it when you join them, so it is worth requesting in writing, along with your experience letter and full and final settlement.',
  },
  {
    q: 'Do I need to give a reason for leaving?',
    a: 'Usually not. A short letter with the dates and a thank you is enough, so the reason is optional here.',
  },
  {
    q: 'Is what I type saved?',
    a: 'No. The letter is put together in your browser and nothing you type is sent to us. If you sign in and save it, it is kept in your account until you delete it.',
  },
]

export const Route = createFileRoute('/_site/resignation-letter-generator')({
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
          breadcrumbs([['Resignation letter generator', url]]),
        ),
      },
    ],
  }),
  component: ResignationLetterPage,
})

function ResignationLetterPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 lg:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Free resignation letter generator
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Fill in a few details and get a clear letter, with your last working
          day worked out from your notice period. No sign up needed.
        </p>
      </div>
      <div className="mt-12">
        <ResignationForm />
      </div>
      <LetterSignup text="Sign up to save this letter and download it as a PDF that matches your resume." />
      <section
        aria-labelledby="resign-faq"
        className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]"
      >
        <h2 id="resign-faq" className="text-3xl font-semibold tracking-tight">
          Questions about resigning
        </h2>
        <FaqList faqs={faqs} />
      </section>
    </div>
  )
}
