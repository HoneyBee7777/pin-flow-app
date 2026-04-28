'use client'

import type { ReactNode } from 'react'

export type SortDir = 'asc' | 'desc' | null

// Wiederverwendbarer Sortier-Header für alle Tabellen.
//   - Inaktiv:  ↕ in hellem Grau
//   - Asc:     ↑ in dunklem Grau
//   - Desc:    ↓ in dunklem Grau
//
// `children` als Label damit auch InfoTooltip-Wrapper o.ä. übergeben werden
// können. Klick-Handler vom Aufrufer (toggelt selbst zwischen asc/desc/null).
export default function SortableTh({
  dir,
  onClick,
  align = 'left',
  className = '',
  children,
}: {
  dir: SortDir
  onClick: () => void
  align?: 'left' | 'right'
  className?: string
  children: ReactNode
}) {
  const arrow = dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'
  const arrowClass = dir ? 'text-gray-700' : 'text-gray-300'
  const ariaSort =
    dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'
  const alignCls = align === 'right' ? 'text-right' : 'text-left'
  const justifyCls = align === 'right' ? 'justify-end' : ''
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      onClick={onClick}
      className={`cursor-pointer select-none px-4 py-3 ${alignCls} text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${justifyCls}`}>
        {children}
        <span className={arrowClass} aria-hidden>
          {arrow}
        </span>
      </span>
    </th>
  )
}
