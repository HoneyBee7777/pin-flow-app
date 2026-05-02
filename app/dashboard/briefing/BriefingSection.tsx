'use client'

// Client-Komponente: rendert das "Heute aktuell"-Briefing in der Hero-Section.
// Erwartet bereits berechnete BriefingItems (serialisierbar) als Prop.
// Zuständig für: Klick-Handling (Smooth-Scroll), Auto-Öffnen kollabierter
// <details>-Toggles im Ziel und Highlight-Pulse auf der Ziel-Sektion.

import { useCallback } from 'react'
import type { BriefingItem, BriefingPrio } from './lib'

// 3px Border-Left wie .coaching-box / .hinweis-box / .warn-box.
// Prio-Farbtokens:
//   sehr_hoch → orange (warn-Akzent)
//   hoch / mittel → blau (hinweis-Akzent, beides Pin-Handlungsbedarf)
//   niedrig → grau
const BORDER_STYLE: Record<BriefingPrio, string> = {
  sehr_hoch: '#ef4444', // red-500 / warn
  hoch: '#60a5fa', // blue-400 / hinweis
  mittel: '#60a5fa',
  niedrig: '#9ca3af', // gray-400
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
  nextSteps = [],
}: {
  items: BriefingItem[]
  nextSteps?: BriefingItem[]
}) {
  const onJump = useCallback((sectionId: string) => {
    jumpTo(sectionId)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Deine Prioritäten
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
                className="rounded-r bg-white/60 py-1 pl-3 pr-2 text-sm leading-snug text-gray-800"
                style={{ borderLeft: `3px solid ${BORDER_STYLE[item.prio]}` }}
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

      {nextSteps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Deine nächsten Schritte
          </h3>
          <ul className="mt-2 space-y-1.5">
            {nextSteps.map((item, i) => (
              <li
                key={`next-${i}`}
                className="rounded-r bg-white/60 py-1 pl-3 pr-2 text-sm leading-snug text-gray-800"
                style={{ borderLeft: `3px solid ${BORDER_STYLE[item.prio]}` }}
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
                )}
                {item.sectionId && item.sectionLabel && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => onJump(item.sectionId)}
                      className="ml-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      → {item.sectionLabel}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
