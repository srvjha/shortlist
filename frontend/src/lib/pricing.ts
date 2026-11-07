import { useQuery } from '@tanstack/react-query'
import { pricingQuery } from '@/lib/api/queries'
import type { Pricing } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

export type PaidPlan = 'pro' | 'lifetime'

// Shown while prices load or if the API can't be reached.
export const fallbackPricing: Pricing = {
  currency: 'USD',
  pro: 1_200,
  lifetime: 9_000,
}

// Pages rendered on the server pass the prices their loader fetched; elsewhere the browser asks.
export function usePricing(initial?: Pricing | null) {
  const { data } = useQuery({
    ...pricingQuery,
    initialData: initial ?? undefined,
  })
  return data ?? fallbackPricing
}

export const priceOf = (plan: PaidPlan, pricing: Pricing) =>
  formatMoney(pricing[plan], pricing.currency)

export const priceNote = (plan: PaidPlan) =>
  plan === 'pro'
    ? 'Billed monthly. Cancel anytime.'
    : 'One payment. Nothing renews.'

export const paymentLine =
  'Prices in US dollars. Payments go through Dodo Payments, which adds any sales tax or VAT where you live.'
