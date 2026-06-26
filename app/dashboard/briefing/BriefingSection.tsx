'use client'

// Client-Komponente: rendert die Liste „Deine nächsten Schritte".
// Erwartet bereits berechnete BriefingItems (serialisierbar) als Prop.
// Zuständig für: Klick-Handling (Smooth-Scroll), Auto-Öffnen kollabierter
// <details>-Toggles im Ziel und Highlight-Pulse auf der Ziel-Sektion.

import { useCallback } from 'react'
import type { BriefingItem } from './lib'
import { MerkenButton } from '../MerkenButton'

// 3px Border-Left als dezenter Akzent in Camel (Marke Ocker), konsistent zum
// Coaching-Streifen-Muster (Coaching = Camel-Streifen).
const ITEM_ACCENT = 'var(--marke-ocker)'

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
        Deine nächsten Schritte
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li
            key={`next-${i}`}
            className="rounded-r bg-white/60 py-1 pl-3 pr-2 text-sm leading-snug text-gray-800"
            style={{ borderLeft: `3px solid ${ITEM_ACCENT}` }}
          >
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
                  className="ml-1 whitespace-nowrap font-medium text-link underline"
                >
                  → {item.sectionLabel}
                </button>
              </>
            )}
            {item.todo && (
              <div className="mt-2">
                <MerkenButton
                  titel={item.todo.titel}
                  faelligkeitsdatum={item.todo.faelligkeitsdatum}
                  quelle={item.todo.quelle}
                  quelleId={item.todo.quelleId}
                  bereitsGemerkt={item.todo.bereitsGemerkt}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
