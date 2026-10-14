// Shared by the pricing page and the landing page.
// Keep these numbers in step with planLimits in backend/src/modules/usage/quotas.ts.
export const plans = [
  {
    id: 'free',
    name: 'Free',
    forWhom: 'Build your resume yourself, with a little AI help.',
    price: '₹0',
    period: null,
    note: 'Free, forever. No card needed.',
    cta: 'Build my resume',
    listTitle: 'Includes:',
    // The basics (downloads, history, link privacy) are in the comparison table below; this list sells the plan.
    features: [
      'Unlimited resumes, with every template',
      'Import your old resume from a PDF or LaTeX file',
      '1 resume tailored to a job description each month',
      '50 AI edits each month',
      'ATS checker with job match and fixes',
      'Share links that show how many people viewed and from where',
    ],
  },
  {
    id: 'season_pass',
    name: 'Season Pass',
    forWhom: 'For placement season, when you apply every week.',
    price: '₹499',
    period: '/ 6 months',
    note: 'One payment, about ₹83 a month.',
    cta: 'Get the Season Pass',
    featured: true,
    listTitle: 'Everything in Free, plus:',
    features: [
      '40 resumes tailored to a job description each month',
      'Unlimited AI edits (fair use)',
      'Write new resumes from your notes with AI',
      'Phone and email unlocked with a password on share links',
      'Detailed link analytics with CSV export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    forWhom: 'For a job search you would rather pay for monthly.',
    price: '₹129',
    period: '/ month',
    note: 'Billed monthly. Cancel anytime.',
    cta: 'Choose Pro',
    listTitle: 'Everything in Free, plus:',
    features: [
      '60 resumes tailored to a job description each month, the most of any plan',
      'Unlimited AI edits (fair use)',
      'Write new resumes from your notes with AI',
      'Phone and email unlocked with a password on share links',
      'Detailed link analytics with CSV export',
    ],
  },
] as const
