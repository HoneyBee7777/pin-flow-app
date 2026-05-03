'use client'

import { useEffect, useState } from 'react'
import { addDays, formatDateDe, todayIso } from './utils'

// Lila Button "Datum kopieren" — kopiert das 180-Tage-zurück-Startdatum
// in die Zwischenablage. Wird auf Pins-Tab und Boards-Tab als Helfer für
// den "Benutzerdefiniert"-Zeitraum in Pinterest Analytics eingesetzt.
export default function CopyStartDateButton() {
  // startDe wird erst nach Mount gesetzt — sonst Hydration-Mismatch zwischen
  // Server (UTC) und Client (lokal) über Mitternacht hinweg.
  const [startDe, setStartDe] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setStartDe(formatDateDe(addDays(todayIso(), -180)))
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  async function onCopy() {
    if (!startDe) return
    try {
      await navigator.clipboard.writeText(startDe)
      setCopied(true)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = startDe
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        // ignorieren
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!startDe}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-purple-600 text-white hover:bg-purple-700'
      }`}
      aria-live="polite"
    >
      {copied
        ? `✓ Kopiert: ${startDe}`
        : `📋 Datum kopieren${startDe ? ` (${startDe})` : ''}`}
    </button>
  )
}
