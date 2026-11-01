import { useQuery } from '@tanstack/react-query'
import { pricingQuery } from '@/lib/api/queries'
import type { Pricing } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

type PaidPlan = 'season_pass' | 'pro'

// Shown while prices load or if the API can't be reached: India's prices, which never overcharge anyone.
export const fallbackPricing: Pricing = {
  region: 'india',
  country: null,
  provider: 'razorpay',
  currency: 'INR',
  season_pass: 49_900,
  pro: 12_900,
}

// Pages rendered on the server pass the prices their loader fetched for the visitor; elsewhere the browser asks.
export function usePricing(initial?: Pricing | null) {
  const { data } = useQuery({
    ...pricingQuery,
    initialData: initial ?? undefined,
  })
  return data ?? fallbackPricing
}

export const priceOf = (plan: PaidPlan, pricing: Pricing) =>
  formatMoney(pricing[plan], pricing.currency)

// Through Razorpay, Pro renews every month; through Polar, both plans are a single payment.
export function priceNote(plan: PaidPlan, pricing: Pricing) {
  if (plan === 'season_pass')
    return `One payment, about ${formatMoney(Math.round(pricing.season_pass / 6), pricing.currency)} a month.`
  return pricing.provider === 'razorpay'
    ? 'Billed monthly. Cancel anytime.'
    : 'One payment for a month. Nothing renews.'
}

export function paymentLine(pricing: Pricing) {
  return pricing.provider === 'razorpay'
    ? 'Pay with UPI, cards or net banking through Razorpay.'
    : 'Prices for your country, in US dollars. Cards from any country work. Payments go through Polar, which adds any sales tax or VAT where you live.'
}
