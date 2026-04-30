'use client'

// Client-Komponente: rendert das "Heute aktuell"-Briefing in der Hero-Section.
// Erwartet bereits berechnete BriefingItems (serialisierbar) als Prop.
// Zuständig für: Klick-Handling (Smooth-Scroll), Auto-Öffnen kollabierter
// <details>-Toggles im Ziel und Highlight-Pulse auf der Ziel-Sektion.

import { useCallback } from 'react'
import type { BriefingItem, BriefingPrio } from './lib'

const BORDER_CLASS: Record<BriefingPrio, string> = {
  sehr_hoch: 'border-l-4 border-orange-400',
  hoch: 'border-l-4 border-blue-400',
  mittel: 'border-l-4 border-slate-400',
  niedrig: 'border-l-4 border-gray-300',
}

function jumpTo(sectionId: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(sectionId)
  if (!el) return

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Highlight-Pulse via CSS-Klasse, danach wieder entfernen.
  el.classList.remove('briefing-pulse')
  // Reflow erzwingen, damit die Animation bei wiederholtem Klick neu startet.
  void el.offsetWidth
  el.classList.add('briefing-pulse')
  window.setTimeout(() => {
    el.classList.remove('briefing-pulse')
  }, 1800)
}

export default function BriefingSection({
  items,
}: {
  items: BriefingItem[]
}) {
  const onJump = useCallback((sectionId: string) => {
    jumpTo(sectionId)
  }, [])

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">
        📋 Heute aktuell
      </h3>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">
          ✓ Aktuell keine kritischen Punkte – weiter so.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <li
              key={`${item.sectionId}-${i}`}
              className={`rounded-r bg-white/60 py-1 pl-3 pr-2 text-sm leading-snug text-gray-800 ${BORDER_CLASS[item.prio]}`}
            >
              <span className="mr-1" aria-hidden="true">
                {item.icon}
              </span>
              {item.parts.map((part, idx) =>
                part.kind === 'bold' ? (
                  <span key={idx} className="font-semibold text-gray-900">
                    {part.value}
                  </span>
                ) : (
                  <span key={idx}>{part.value}</span>
                )
              )}{' '}
              <button
                type="button"
                onClick={() => onJump(item.sectionId)}
                className="ml-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-900 hover:underline"
              >
                → {item.sectionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
