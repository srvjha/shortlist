type RazorpayOptions = {
  key: string
  name: string
  description: string
  order_id?: string
  subscription_id?: string
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  handler: () => void
  modal?: { ondismiss?: () => void }
}

type RazorpayCheckout = {
  open: () => void
  on: (event: 'payment.failed', callback: () => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout
  }
}

let loading: Promise<void> | null = null

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(
        new Error(
          'Could not load the payment window. Check your connection and try again.',
        ),
      )
    }
    document.body.appendChild(script)
  })
  return loading
}

// Razorpay keeps its window open after a failed attempt so the user can retry there;
// `onFailed` only records it, and the window's ondismiss decides what to say.
export async function openRazorpayCheckout(
  options: RazorpayOptions,
  onFailed?: () => void,
) {
  await loadScript()
  if (!window.Razorpay)
    throw new Error('The payment window is unavailable. Try again.')
  const checkout = new window.Razorpay(options)
  if (onFailed) checkout.on('payment.failed', onFailed)
  checkout.open()
}
