import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { meQuery, queryKeys } from '@/lib/api/queries'
import type { PaidPlan } from '@/lib/pricing'

export type { PaidPlan }

// Sends the buyer to Dodo's checkout page for a plan from any page. Dodo brings them back to /billing.
export function useCheckout({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  const { data: me } = useQuery({ ...meQuery, enabled })
  const [waiting, setWaiting] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription })
    queryClient.invalidateQueries({ queryKey: queryKeys.usage })
    queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }

  // Back from Dodo: asks the API to read the payment, and keeps looking in case Dodo is still working on it. Compares
  // with the plan bought because someone upgrading from Pro to Lifetime is already on a paid plan.
  const confirmReturn = (checkoutId: string, plan?: PaidPlan) => {
    setWaiting(true)
    const confirm = () =>
      unwrap(
        api.POST('/v1/checkouts/{checkoutId}/confirmation', {
          params: { path: { checkoutId } },
        }),
      )
        .then((result) => {
          queryClient.setQueryData(queryKeys.subscription, result)
          refresh()
          return plan ? result.plan === plan : result.plan !== 'free'
        })
        .catch(() => false)
    let tries = 0
    const attempt = async () => {
      const active = await confirm()
      if (active) {
        setWaiting(false)
        toast.success('Payment received. Your plan is active.')
      } else if (++tries >= 10) {
        setWaiting(false)
        toast(
          "We haven't seen a payment yet. If you paid, your plan switches on within a few minutes.",
        )
      } else {
        setTimeout(attempt, 2000)
      }
    }
    void attempt()
  }

  const checkout = useMutation({
    mutationFn: async (plan: PaidPlan) => {
      const session = await unwrap(
        api.POST('/v1/checkouts', { body: { plan } }),
      )
      window.location.assign(session.url)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return { checkout, waiting, refresh, confirmReturn, me }
}
