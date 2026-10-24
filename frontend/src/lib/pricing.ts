import type { Pricing } from '@/lib/api/types'
import { formatInr } from '@/lib/format'

// Shown while prices load or if the API can't be reached: India's prices, which never overcharge anyone.
export const fallbackPricing: Pricing = {
  tier: 'india',
  country: null,
  currency: 'INR',
  season_pass: { label: '₹499', paise: 49_900 },
  pro: { label: '₹129', paise: 12_900 },
}

// Every payment is in rupees; outside India the card shows a converted amount, so say what is charged.
export function priceNote(plan: 'season_pass' | 'pro', pricing: Pricing) {
  const charged = formatInr(pricing[plan].paise)
  if (pricing.currency === 'INR')
    return plan === 'pro'
      ? 'Billed monthly. Cancel anytime.'
      : `One payment, about ${formatInr(pricing.season_pass.paise / 6)} a month.`
  return plan === 'pro'
    ? `Charged ${charged} a month. Cancel anytime.`
    : `One payment for 6 months, charged as ${charged}.`
}
