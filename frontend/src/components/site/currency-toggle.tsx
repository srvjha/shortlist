import { setCurrency, useCurrency } from '@/lib/currency'
import type { Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'

const options: { id: Currency; label: string }[] = [
  { id: 'inr', label: '₹ INR' },
  { id: 'usd', label: '$ USD' },
]

export function CurrencyToggle({ className }: { className?: string }) {
  const currency = useCurrency()
  return (
    <div
      role="group"
      aria-label="Show prices in"
      className={cn(
        'inline-flex gap-1 rounded-full bg-secondary p-1 text-sm',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={currency === option.id}
          onClick={() => setCurrency(option.id)}
          className="min-h-9 rounded-full px-4 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:bg-foreground aria-pressed:text-background"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
