// Shared by the pricing page and the landing page.
// Keep these numbers in step with planLimits in backend/src/modules/usage/quotas.ts. Paid plan prices come from the API
// (see lib/pricing.ts).
export const plans = [
  {
    id: 'free',
    name: 'Free',
    forWhom: 'Try the AI on your resume before you pay anything.',
    period: null,
    note: 'Free, forever. No card needed.',
    cta: 'Start free',
    listTitle: 'Includes:',
    // The basics (history, link privacy) are in the comparison table; this list sells the plan.
    features: [
      '1 resume, with every template',
      '1 resume tailored to a job description',
      '1 AI edit',
      '1 resume written by AI from your notes',
      '3 PDF downloads',
      'The ATS checker, and importing your old resume',
      'Cover letters and resignation letters',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    forWhom: 'For an active job search, paid month by month.',
    period: '/ month',
    cta: 'Choose Pro',
    featured: true,
    listTitle: 'Everything in Free, plus:',
    features: [
      '60 resumes tailored to a job description each month',
      'Unlimited AI edits (fair use)',
      'Unlimited resumes and PDF downloads',
      '30 resumes a month written by AI from your notes',
      'AI review in the ATS checker, with your top fixes',
      'Phone and email on share links, unlocked with a password',
      'Detailed link analytics with CSV export',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    forWhom: 'For every job search from now on, with one payment.',
    period: 'once',
    cta: 'Get Lifetime',
    badge: 'Best value',
    listTitle: 'Everything in Pro, with the same monthly limits:',
    features: [
      'One payment, nothing renews',
      'Lasts as long as Shortlist runs',
      '60 tailored resumes and 30 AI-written resumes each month',
      'AI edits within the same fair-use limit as Pro',
      'Monthly limits reset on the 1st of every month',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    forWhom: 'For colleges, placement cells and teams.',
    period: null,
    note: 'Priced to fit your group.',
    cta: 'Contact us',
    listTitle: 'Talk to us about:',
    features: [
      'Paid plans for a whole group',
      'A code your students or team can redeem',
    ],
  },
] as const
