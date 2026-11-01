const relative = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(value: string | Date) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

// A fixed time zone keeps server-rendered dates identical to what the browser renders.
const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

export function formatDate(value: string | Date) {
  return dateFormat.format(new Date(value))
}

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export function formatDateTime(value: string | Date) {
  return dateTimeFormat.format(new Date(value))
}

export const planLabels = {
  free: 'Free',
  season_pass: 'Season Pass',
  pro: 'Pro',
} as const

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatInr = (paise: number) => inr.format(paise / 100)

// A payment amount in its currency's minor unit: paise for INR, cents for USD.
export const formatMoney = (amount: number, currency: string) =>
  currency === 'INR'
    ? formatInr(amount)
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        // $9, but $1.50
        minimumFractionDigits: amount % 100 ? 2 : 0,
      }).format(amount / 100)

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// AI cost is stored in millionths of a dollar.
export const formatUsd = (micros: number) => usd.format(micros / 1_000_000)

export const formatNumber = (value: number) => value.toLocaleString('en-IN')

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const byteUnits = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < byteUnits.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${byteUnits[unit]}`
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

export const percent = (part: number, whole: number) =>
  whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`
