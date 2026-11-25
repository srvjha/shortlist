import { Link, createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/site/legal-page'
import { site } from '@/lib/site'

const title = `About ${site.name}: AI Resume Builder Made in India`
const definition = `${site.name} is a free AI resume builder, made in India, that tailors your resume to each job description using only what is already in your resume.`
const github = 'https://github.com/srvjha/shortlist'

export const Route = createFileRoute('/_site/about')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: definition },
      { property: 'og:title', content: title },
      { property: 'og:description', content: definition },
      { property: 'og:url', content: `${site.url}/about` },
    ],
    links: [{ rel: 'canonical', href: `${site.url}/about` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: site.name,
          url: site.url,
          description: definition,
          email: site.contactEmail,
          foundingDate: '2026-10',
          founder: { '@type': 'Person', name: 'Saurav Jha', url: site.x },
          sameAs: [site.x, github],
        }),
      },
    ],
  }),
  component: About,
})

function About() {
  return (
    <LegalPage
      title={`About ${site.name}`}
      updated={new Date('2026-11-25T00:00:00+05:30')}
    >
      <p className="text-lg">{definition}</p>
      <p>
        It is for students, freshers and early-career people in every field:
        marketing, finance, HR, sales, operations, consulting, design, data and
        software.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>
          Make your resume with a simple form, or import the one you have from a
          PDF, a .tex file or plain text.
        </li>
        <li>
          Add the job you are applying for: paste the job description, a link to
          the posting, or just the role.
        </li>
        <li>
          The AI suggests changes that bring your resume closer to that job.
          Every change is highlighted, and you keep only the ones you like.
        </li>
        <li>
          Anything the job asks for that is not in your resume is flagged and
          left out, never made up.
        </li>
        <li>
          Download an ATS-friendly PDF in one of 14 LaTeX templates, or the
          LaTeX source itself.
        </li>
      </ul>

      <h2>What else is free</h2>
      <ul>
        <li>
          An <Link to="/ats-checker">ATS resume checker</Link> that needs no
          sign-up
        </li>
        <li>
          A <Link to="/cover-letter-generator">cover letter generator</Link> and
          a{' '}
          <Link to="/resignation-letter-generator">
            resignation letter generator
          </Link>
        </li>
        <li>
          <Link to="/resume-format">Resume formats by role</Link> with filled-in
          samples, and <Link to="/templates">14 resume templates</Link>
        </li>
      </ul>

      <h2>Who builds it</h2>
      <p>
        {site.name} is built by Saurav Jha, a software engineer in India, and
        went public in October 2026. The code is open source under the MIT
        license on <a href={github}>GitHub</a>.
      </p>

      <h2>Your data</h2>
      <p>
        Your resume is yours. It is used only to run the features you ask for,
        and you can download or delete everything at any time. The details are
        in the <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Write to <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>{' '}
        or reach out on <a href={site.x}>X</a>.
      </p>
    </LegalPage>
  )
}
