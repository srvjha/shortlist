// Shared by the pricing page and the landing page.
// Keep these numbers in step with planLimits in backend/src/modules/usage/quotas.ts.
export const plans = [
  {
    id: 'free',
    name: 'Free',
    forWhom: 'Try the AI on your resume before you pay anything.',
    price: '₹0',
    period: null,
    note: 'Free, forever. No card needed.',
    cta: 'Start free',
    listTitle: 'Includes:',
    // The basics (downloads, history, link privacy) are in the comparison table; this list sells the plan.
    features: [
      '1 resume tailored to a job description each month',
      '50 AI edits each month',
      '1 resume written by AI from your notes, to try it',
      'Import your old resume from a PDF or LaTeX file',
      'Every template, the ATS checker and PDF download',
    ],
  },
  {
    id: 'season_pass',
    name: 'Season Pass',
    forWhom: 'For placement season, when you apply to new roles every week.',
    price: '₹499',
    period: '/ 6 months',
    note: 'One payment, about ₹83 a month.',
    cta: 'Get the Season Pass',
    featured: true,
    badge: 'Made for placement season',
    listTitle: 'Everything in Free, plus:',
    features: [
      '40 resumes tailored to a job description each month',
      'Unlimited AI edits (fair use)',
      '30 resumes a month written by AI from your notes',
      'Phone and email on share links, unlocked with a password',
      'Detailed link analytics with CSV export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    forWhom: 'For a longer job search, paid month by month.',
    price: '₹129',
    period: '/ month',
    note: 'Billed monthly. Cancel anytime.',
    cta: 'Choose Pro',
    listTitle: 'Everything in Free, plus:',
    features: [
      '60 resumes tailored to a job description each month',
      'Unlimited AI edits (fair use)',
      '30 resumes a month written by AI from your notes',
      'Phone and email on share links, unlocked with a password',
      'Detailed link analytics with CSV export',
    ],
  },
] as const
