import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/site/legal-page'
import { site } from '@/lib/site'

export const Route = createFileRoute('/_site/terms')({
  head: () => ({
    meta: [{ title: `Terms | ${site.name}` }],
    links: [{ rel: 'canonical', href: `${site.url}/terms` }],
  }),
  component: () => (
    <LegalPage
      title="Terms of use"
      updated={new Date('2026-10-21T00:00:00+05:30')}
    >
      <p>
        By using {site.name} you agree to these terms. They are written to be
        read, so please do.
      </p>
      <h2>Your content</h2>
      <p>
        You own your resumes. You give us permission to store, process and
        display them only to provide the service, including sending text to AI
        providers when you use AI features.
      </p>
      <h2>Honest resumes</h2>
      <p>
        You are responsible for what your resume says. Our AI suggests rewrites
        and flags anything that isn't in your profile, but you decide what to
        accept. Don't use {site.name} to misrepresent yourself.
      </p>
      <h2>Fair use</h2>
      <ul>
        <li>Don't try to break, overload or reverse-engineer the service.</li>
        <li>
          Don't upload content that isn't yours or that you don't have the right
          to share.
        </li>
        <li>
          Plan limits apply per account. Sharing accounts to get around them
          isn't allowed.
        </li>
      </ul>
      <h2>Payments</h2>
      <p>
        Paid plans are processed by Razorpay. The Season Pass is a one-time
        payment for six months. Pro renews monthly until you cancel, and stays
        active until the end of the paid month.
      </p>
      <h2>Refunds</h2>
      <p>
        You can ask for a refund within 6 hours of a payment, from Plans and
        billing, as long as you have made no more than 3 tailored and 3
        AI-written resumes since paying. Each account can get one refund. It is
        automatic: you get back what you paid minus the fee Razorpay charged us
        for that payment, including GST, and we show the exact amount before you
        confirm. We make no profit on refunds. A refunded Season Pass ends
        straight away; a refunded Pro subscription is cancelled and ends
        straight away. After 6 hours, payments can't be refunded. Refunds reach
        your original payment method in 5 to 7 working days.
      </p>
      <h2>Changes and ending your account</h2>
      <p>
        We may update these terms and will say so in the app. You can delete
        your account at any time from Settings. We may suspend accounts that
        break these terms.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms, billing or your account:{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  ),
})
