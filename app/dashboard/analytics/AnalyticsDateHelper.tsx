'use client'

import { useEffect, useState } from 'react'
import { addDays, formatDateDe, todayIso } from './utils'

type Dates = {
  todayDe: string
  startDe: string
}

export default function AnalyticsDateHelper() {
  // Datum erst nach Mount setzen, sonst Hydration-Mismatch (Server vs. Client
  // können in unterschiedlichen Zeitzonen / über Mitternacht hinweg
  // unterschiedliche „Heute"-Werte berechnen).
  const [dates, setDates] = useState<Dates | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const today = todayIso()
    setDates({
      todayDe: formatDateDe(today),
      startDe: formatDateDe(addDays(today, -180)),
    })
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  async function onCopy() {
    if (!dates) return
    try {
      await navigator.clipboard.writeText(dates.startDe)
      setCopied(true)
    } catch {
      // Fallback für Browser ohne Clipboard-API: textArea + execCommand.
      const ta = document.createElement('textarea')
      ta.value = dates.startDe
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        // ignorieren — kein Feedback besser als Crash.
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  return (
    <div className="rounded-md border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
      <p className="font-semibold">🗓️ Pinterest-Auswertungs-Datum</p>
      <p className="mt-1">
        Damit deine Pin-Auswertungen einen einheitlichen 180-Tage-Zeitraum
        abdecken, gib in Pinterest unter „Benutzerdefiniert" das passende
        Start-Datum ein:
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-purple-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Heute</p>
          <p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">
            {dates?.todayDe ?? '—'}
          </p>
        </div>
        <div className="rounded-md border border-purple-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Start-Datum für 180-Tage-Auswertung
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">
            {dates?.startDe ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCopy}
          disabled={!dates}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          aria-live="polite"
        >
          {copied ? '✓ Kopiert!' : '📋 Datum kopieren'}
        </button>
        {dates && (
          <span className="text-xs text-gray-600">
            Kopiert das Start-Datum ({dates.startDe}) in die Zwischenablage.
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-purple-800">
        ⓘ Pinterest speichert Analytics-Daten maximal 6 Monate zurück (180
        Tage). Über „Benutzerdefiniert" kannst du in Pinterest jeden beliebigen
        Zeitraum innerhalb dieser Grenze wählen.
      </p>
    </div>
  )
}
