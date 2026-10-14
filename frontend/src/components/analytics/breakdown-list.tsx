export function BreakdownList({
  title,
  rows,
  label = (value) => value,
  empty = 'No views yet',
  color = 'var(--primary)',
}: {
  title: string
  rows: { label: string; views: number }[]
  label?: (value: string) => string
  empty?: string
  color?: string
}) {
  const total = rows.reduce((sum, row) => sum + row.views, 0)
  const max = Math.max(1, ...rows.map((row) => row.views))

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-sans text-base font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{label(row.label)}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {row.views.toLocaleString('en-IN')}
                  <span className="ml-1.5 text-xs">
                    {Math.round((row.views / total) * 100)}%
                  </span>
                </span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(row.views / max) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
