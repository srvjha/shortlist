import { cn } from '@/lib/utils'

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export function formatDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`))
}

// Round the axis top up to 1, 2 or 5 times a power of ten so ticks are clean numbers.
export function niceMax(value: number) {
  if (value <= 4) return 4
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10
  return step * power
}

export function ViewsChart({
  data,
  unit = ['view', 'views'],
  format = (value) => value.toLocaleString('en-IN'),
}: {
  data: { day: string; views: number }[]
  // Singular and plural name of what is counted, for the tooltip and screen readers.
  unit?: [string, string]
  format?: (value: number) => string
}) {
  const top = niceMax(Math.max(...data.map((d) => d.views)))
  const ticks = [top, top / 2, 0]
  // First day, today, and two evenly spaced days between them.
  const labelIndexes = [
    ...new Set(
      [0, 1, 2, 3].map((i) => Math.round((i * (data.length - 1)) / 3)),
    ),
  ]

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex h-48 flex-col justify-between py-0 text-right text-xs text-muted-foreground tabular-nums"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 leading-4">
              {format(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          <div
            aria-hidden
            className="absolute inset-0 flex flex-col justify-between"
          >
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>
          <div
            role="img"
            aria-label={`${unit[1]} per day, ${data.length} days, ${format(data.reduce((sum, d) => sum + d.views, 0))} in total`}
            className="relative flex h-full items-end gap-[2px]"
          >
            {data.map((point) => (
              <div
                key={point.day}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                {point.views > 0 && (
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                    style={{ height: `${(point.views / top) * 100}%` }}
                  />
                )}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block">
                  <span className="font-medium">{formatDay(point.day)}</span>
                  <span className="text-muted-foreground">
                    , {format(point.views)}{' '}
                    {point.views === 1 ? unit[0] : unit[1]}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="flex gap-3 text-xs text-muted-foreground">
        <span className="invisible tabular-nums">{format(top)}</span>
        <div className="relative h-4 flex-1">
          {labelIndexes.map((index) => (
            <span
              key={index}
              className={cn(
                'absolute whitespace-nowrap',
                index === 0
                  ? 'left-0'
                  : index === data.length - 1
                    ? 'right-0'
                    : '-translate-x-1/2',
              )}
              style={
                index === 0 || index === data.length - 1
                  ? undefined
                  : { left: `${((index + 0.5) / data.length) * 100}%` }
              }
            >
              {formatDay(data[index].day)}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{unit[1]} per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{formatDay(point.day)}</td>
              <td>{format(point.views)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
