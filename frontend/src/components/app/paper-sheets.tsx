import { ArrowUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Small drawings of a page, so the workspace reads like a desk of resumes rather than a table.
export function Sheet({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative aspect-17/13 w-full overflow-hidden rounded-[3px] bg-sheet px-[9%] pt-[8%] text-sheet-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_16px_-8px_rgb(0_0_0/0.18)] ring-1 ring-black/5 transition-[translate,box-shadow] duration-200 motion-safe:group-hover:-translate-y-1 group-hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_14px_28px_-12px_rgb(0_0_0/0.28)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function Line({ width, strong }: { width: string; strong?: boolean }) {
  return (
    <span
      className={cn(
        'block h-[5px] rounded-full',
        strong ? 'bg-sheet-foreground/55' : 'bg-sheet-foreground/12',
      )}
      style={{ width }}
    />
  )
}

function Rule() {
  return <span className="my-[5%] block h-px bg-sheet-foreground/20" />
}

export function ResumeLines() {
  return (
    <div className="flex flex-col gap-[7px]">
      <Line width="42%" strong />
      <Rule />
      <Line width="30%" strong />
      <Line width="88%" />
      <Line width="76%" />
      <Line width="82%" />
      <span className="h-1" />
      <Line width="26%" strong />
      <Line width="84%" />
      <Line width="64%" />
    </div>
  )
}

export function ResumeSheet({
  title,
  tailored,
  className,
}: {
  title: string
  tailored: boolean
  className?: string
}) {
  return (
    <Sheet className={className}>
      <p className="mb-[6%] truncate text-center font-serif text-[15px] leading-tight font-semibold">
        {title}
      </p>
      <ResumeLines />
      {tailored && (
        <span className="absolute top-0 left-[9%] rounded-b-[3px] bg-highlight px-2 pt-0.5 pb-1 text-[11px] font-medium text-highlight-foreground">
          Tailored
        </span>
      )}
    </Sheet>
  )
}

export function ImportSheet() {
  return (
    <Sheet>
      <ResumeLines />
      <span className="absolute right-[9%] bottom-[10%] flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
        <ArrowUpIcon className="size-4" />
      </span>
    </Sheet>
  )
}

export function LatexSheet({ className }: { className?: string }) {
  return (
    <Sheet className={cn('font-mono text-[10.5px] leading-[1.7]', className)}>
      <p className="whitespace-nowrap">
        <span className="text-primary">\section</span>
        {'{Experience}'}
      </p>
      <p className="whitespace-nowrap">
        <span className="text-primary">\resumeSubheading</span>
      </p>
      <p className="whitespace-nowrap text-sheet-foreground/60">
        {'  {Acme Labs}{2025}'}
      </p>
      <p className="whitespace-nowrap">
        <span className="text-primary">\resumeItem</span>
        {'{Built the'}
      </p>
      <p className="whitespace-nowrap text-sheet-foreground/60">
        {'  payouts service in Go}'}
      </p>
      <p className="whitespace-nowrap">
        <span className="text-primary">\section</span>
        {'{Projects}'}
      </p>
    </Sheet>
  )
}

export function BlankSheet() {
  return (
    <Sheet>
      <div className="flex flex-col gap-[9px]">
        {['Full name', 'Headline', 'Email'].map((label) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[10px] text-sheet-foreground/55">
              {label}
            </span>
            <span className="flex h-[18px] items-center rounded-[3px] px-1.5 ring-1 ring-sheet-foreground/15">
              {label === 'Full name' && (
                <span className="h-3 w-px animate-pulse bg-primary motion-reduce:animate-none" />
              )}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

export function BlankPageSheet({ className }: { className?: string }) {
  return (
    <Sheet className={cn('font-mono text-[10.5px] leading-[1.7]', className)}>
      <p className="whitespace-nowrap">
        <span className="text-primary">\begin</span>
        {'{document}'}
      </p>
      <span className="mt-1 block h-3.5 w-px animate-pulse bg-primary motion-reduce:animate-none" />
    </Sheet>
  )
}
