'use client'

import { useState } from 'react'
import Link from 'next/link'

// V3.1 — Prompt-Karte „Brücken-Themen-Ideen". Der personalisierte
// Prompt-Text wird server-seitig befüllt und als `promptText` übergeben;
// hier liegt nur die Interaktion (Copy-to-Clipboard mit Feedback).

export default function BridgeTopicsPrompt({
  promptText,
  lowAffinityNotice,
}: {
  promptText: string
  // Nur gesetzt, wenn keine Affinität ≥ 1,5 vorliegt (Info-Hinweis).
  lowAffinityNotice?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard-API nicht verfügbar (z. B. unsicherer Kontext) —
      // Textfeld bleibt manuell markierbar als Fallback.
      setCopied(false)
    }
  }

  return (
    <section
      id="bruecken-themen"
      className="scroll-mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Brücken-Themen-Ideen für deine Zielgruppe
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Dieser Prompt liefert dir 10 konkrete Ideen für Brücken-Themen —
        Inhalte, die deine Nische mit den Top-Interessen deiner Zielgruppe
        verbinden. So erschließt du mehrere Zielgruppen gleichzeitig.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Empfohlene KI: ChatGPT (GPT-4) oder Claude. Kostet dich nichts, wenn
        du die kostenlosen Versionen nutzt.
      </p>

      {lowAffinityNotice && (
        <p className="mt-3 rounded-md border border-hinweis-tipp-rand border-l-[3px] border-l-hinweis-tipp-stripe bg-hinweis-tipp-flaeche p-3 text-sm text-hinweis-tipp-text">
          ℹ️ Deine Zielgruppe zeigt aktuell keine besonders hohen Affinitäten
          (alle Werte unter 1,5). Der Prompt wird mit deinen drei höchsten
          Affinitäten gefüllt — die Ergebnisse sind weniger zugespitzt, aber
          trotzdem nützlich für deine Strategie.
        </p>
      )}

      <textarea
        readOnly
        value={promptText}
        rows={14}
        className="mt-4 w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800"
        onFocus={(e) => e.currentTarget.select()}
      />

      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
      >
        {copied ? '✓ Kopiert!' : '📋 Prompt kopieren'}
      </button>

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-900">
          So nutzt du den Prompt:
        </p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Klick auf &bdquo;Prompt kopieren&ldquo;</li>
          <li>Öffne ChatGPT oder Claude in einem neuen Tab</li>
          <li>Füge den Prompt ein und sende ihn ab</li>
          <li>Du bekommst 10 Brücken-Themen-Ideen</li>
        </ol>
      </div>

      {/* Pfeil → bleibt außerhalb des verlinkten Bereichs — nur das Wort
          ist klickbar. */}
      <p className="mt-5 text-sm">
        →{' '}
        <Link
          href="/dashboard/pin-produktion"
          className="font-medium text-link underline underline-offset-2"
        >
          Ideen direkt umsetzen und Pins erstellen
        </Link>
      </p>
    </section>
  )
}
