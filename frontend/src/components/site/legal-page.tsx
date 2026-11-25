import { formatDate } from '@/lib/format'

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: Date
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto max-w-2xl px-5 pt-14 lg:pt-20">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {formatDate(updated)}
      </p>
      <div className="mt-10 flex flex-col gap-6 leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary [&_h2]:mt-4 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </article>
  )
}
