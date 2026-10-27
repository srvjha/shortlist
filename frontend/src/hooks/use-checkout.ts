import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, errorMessage, unwrap } from '@/lib/api/client'
import { meQuery, queryKeys } from '@/lib/api/queries'
import { openRazorpayCheckout } from '@/lib/razorpay'
import { site } from '@/lib/site'

export type PaidPlan = 'season_pass' | 'pro'

// Opens the payment provider's checkout for a plan from any page. `waiting` is true while the webhook activates the plan.
export function useCheckout({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  const { data: me } = useQuery({ ...meQuery, enabled })
  const [waiting, setWaiting] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription })
    queryClient.invalidateQueries({ queryKey: queryKeys.usage })
    queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }

  // The plan switches when the provider's webhook reaches us, usually within seconds.
  const waitForPlan = () => {
    setWaiting(true)
    toast.success('Payment received. Activating your plan…')
    let tries = 0
    const timer = setInterval(() => {
      refresh()
      if (++tries >= 10) {
        clearInterval(timer)
        setWaiting(false)
      }
    }, 2000)
  }

  const checkout = useMutation({
    mutationFn: async (plan: PaidPlan) => {
      const session = await unwrap(
        api.POST('/v1/checkouts', { body: { plan } }),
      )
      // Polar takes the payment on its own page, then sends the buyer back to /billing.
      if (session.provider === 'polar') {
        window.location.assign(session.url)
        return
      }
      let failed = false
      const tryAgain = {
        label: 'Try again',
        onClick: () => checkout.mutate(plan),
      }
      await openRazorpayCheckout(
        {
          key: session.keyId,
          name: site.name,
          description:
            plan === 'pro' ? 'Pro, monthly' : 'Season Pass, 6 months',
          ...(session.orderId && { order_id: session.orderId }),
          ...(session.razorpaySubscriptionId && {
            subscription_id: session.razorpaySubscriptionId,
          }),
          prefill: { name: me?.name, email: me?.email },
          theme: { color: '#0b6e65' },
          handler: waitForPlan,
          modal: {
            ondismiss: () =>
              failed
                ? toast.error(
                    "Your payment didn't go through. If money left your account, your bank returns it in 5 to 7 working days. With UPI, approve the request in your app within a few minutes.",
                    { action: tryAgain, duration: 15000 },
                  )
                : toast("Checkout closed. You weren't charged.", {
                    action: tryAgain,
                  }),
          },
        },
        () => {
          failed = true
        },
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return { checkout, waiting, refresh, waitForPlan, me }
}
