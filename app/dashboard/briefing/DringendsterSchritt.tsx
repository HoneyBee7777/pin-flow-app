'use client'

// Schlanke „Dein dringendster Schritt"-Zeile für den dunklen Dashboard-Banner.
// Zeigt NUR das eine dringendste Briefing-Item (echte Empfehlung mit sectionId)
// als heller Text + dezenter Sprung-Link. Kein Merken-Button (den gibt es an
// den Originalstellen). Scroll-/Highlight-Mechanik per Anker-ID + briefing-pulse.

import { useCallback } from 'react'
import type { BriefingItem } from './lib'

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

export default function DringendsterSchritt({ item }: { item: BriefingItem }) {
  const onJump = useCallback(() => jumpTo(item.sectionId), [item.sectionId])

  return (
    // Dezente Camel-Trennlinie als oberer Rand: erscheint automatisch nur mit
    // dieser Zeile. marke-ocker (#b89066) als RGBA @25% — das Token hat keinen
    // Alpha-Kanal, daher arbiträrer Wert statt /25-Kurzform.
    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[rgba(184,144,102,0.25)] pt-3 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-marke-ocker">
        Jetzt wichtig
      </span>
      <span className="text-white/85">
        {item.parts.map((part, idx) =>
          part.kind === 'bold' ? (
            <span key={idx} className="font-semibold text-white">
              {part.value}
            </span>
          ) : (
            <span key={idx}>{part.value}</span>
          )
        )}
      </span>
      {item.sectionId && item.sectionLabel && (
        <button
          type="button"
          onClick={onJump}
          className="whitespace-nowrap font-medium text-marke-ocker underline underline-offset-2 hover:opacity-80"
        >
          → {item.sectionLabel}
        </button>
      )}
    </div>
  )
}
