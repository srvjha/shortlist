import { animate, inView } from 'motion'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

export const ease = [0.22, 1, 0.36, 1] as const

// Staggers the [data-reveal] parts of a section up into place the first time it scrolls into view.
// The server renders everything visible, and only parts still below the fold are hidden after hydration,
// so the page reads fine without script.
export function Reveal({
  as: Tag = 'div',
  className,
  children,
  ...props
}: {
  as?: 'div' | 'section'
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const root = ref.current
    if (!root || reduceMotion) return
    const parts = [
      ...root.querySelectorAll<HTMLElement>('[data-reveal]'),
    ].filter((part) => part.getBoundingClientRect().top > window.innerHeight)
    if (parts.length === 0) return
    for (const part of parts) {
      part.style.opacity = '0'
      part.style.transform = 'translateY(24px)'
    }
    // Each part is watched on its own, so a section taller than the screen still shows every part.
    // Neighbours that arrive together are staggered by their order.
    const stops = parts.map((part, index) =>
      inView(
        part,
        () => {
          animate(
            part,
            { opacity: 1, transform: 'translateY(0px)' },
            { duration: 0.7, ease, delay: (index % 4) * 0.08 },
          )
        },
        { amount: 0.1 },
      ),
    )
    return () => stops.forEach((stop) => stop())
  }, [reduceMotion])

  return (
    <Tag ref={ref as React.Ref<never>} className={className} {...props}>
      {children}
    </Tag>
  )
}
