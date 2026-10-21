import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/site/legal-page'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_site/privacy')({
  head: () => ({
    meta: [{ title: `Privacy | ${site.name}` }],
    links: [{ rel: 'canonical', href: `${site.url}/privacy` }],
  }),
  component: () => (
    <LegalPage
      title="Privacy policy"
      updated={new Date('2026-10-05T00:00:00+05:30')}
    >
      <p>
        A resume holds a lot of personal information. This page explains what{' '}
        {site.name} stores, why, and how you stay in control of it.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Your account: name, email, profile picture and username.</li>
        <li>
          Your resumes, their version history, and job descriptions you add.
        </li>
        <li>
          Files you upload to import a resume. These are deleted after 30 days.
        </li>
        <li>
          Views of your share links: date, approximate location (city, region
          and country, as our hosting provider estimates it), device type and
          referring site. We never store IP addresses.
        </li>
        <li>
          Payment records from Razorpay. We never see or store your card or UPI
          details.
        </li>
      </ul>
      <h2>How AI features use your data</h2>
      <p>
        When you tailor, edit or import a resume, or check it against a job
        description while signed in, the relevant resume text and job details
        are sent to our AI provider (such as OpenAI or Anthropic), with your
        email and phone number masked. They are used only to answer that request
        and are not used by us to train models.
      </p>
      <h2>Who can see your resume</h2>
      <p>
        Only you, until you create a share link. Share links hide your phone
        number and email unless you turn them on, and can be protected with a
        password or an expiry date. Unlisted links are hidden from search
        engines.
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>
          Download everything we hold about you from Settings, as a JSON file.
        </li>
        <li>
          Delete your account from Settings. Your resumes, links and files are
          removed permanently.
        </li>
        <li>
          Deleted resumes are kept for 30 days in case you deleted one by
          mistake: email us within that time and we can restore it. After 30
          days they are removed for good.
        </li>
      </ul>
      <h2>Security</h2>
      <p>
        Data is stored on servers in India and encrypted in transit. Backups are
        encrypted before they leave the server.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about your data, or a request to see or delete it: email{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. You can
        also export or delete everything yourself from Settings.
      </p>
    </LegalPage>
  ),
})
