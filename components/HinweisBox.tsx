import type { ReactNode } from 'react'

export type HinweisVariant = 'tipp' | 'merke'

export function HinweisBox({
  children,
  variant = 'tipp',
}: {
  children: ReactNode
  variant?: HinweisVariant
}) {
  // Tipp = amber (Handlungsempfehlung), Merke = teal (Prinzip / Wissen).
  // Beide nutzen einen left-border als visueller Akzent.
  const cls =
    variant === 'merke'
      ? 'border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 text-teal-800'
      : 'border border-amber-200 border-l-[3px] border-l-amber-400 bg-amber-50 text-amber-900'
  return (
    <div className={`rounded-md p-4 text-sm leading-relaxed ${cls}`}>
      {children}
    </div>
  )
}
