import { useSyncExternalStore } from 'react'

// Which price list a visitor sees: rupees, or the global price in US dollars (still charged in rupees).
// The choice is shared by every price on the page and kept in this browser; without one, Indian time zones
// get rupees and everyone else dollars.
export type Currency = 'inr' | 'usd'

const key = 'shortlist-currency'
const listeners = new Set<() => void>()

function read(): Currency {
  try {
    const saved = localStorage.getItem(key)
    if (saved === 'inr' || saved === 'usd') return saved
  } catch {
    // Storage can be blocked; fall back to the time zone.
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta' ? 'inr' : 'usd'
}

export function setCurrency(currency: Currency) {
  try {
    localStorage.setItem(key, currency)
  } catch {
    // Still switches for this page view.
  }
  listeners.forEach((listener) => listener())
}

export function useCurrency(): Currency {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    // The server can't know the visitor, so it renders rupees and the browser corrects it.
    () => 'inr',
  )
}
