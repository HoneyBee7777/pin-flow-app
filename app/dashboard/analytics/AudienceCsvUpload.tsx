'use client'

import { useState, useTransition } from 'react'
import {
  importAudienceCsv,
  type ImportAudienceCsvResult,
} from './audience-actions'

// V3.0 Phase 2a — rechte Spalte im „Schritt 2"-Block der Eingabe-Tab.
// Sitzt visuell parallel zum Top-Pins-Import, aber bewusst eigenständig:
// kein gemeinsamer Submit, eigene Result-/Error-Anzeige. Bewusst klein
// gehalten — Audience-Imports sind ein Single-File-Flow, keine Drei-CSV-Choreografie.

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function formatCount(n: number): string {
  return n.toLocaleString('de-DE')
}

export default function AudienceCsvUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportAudienceCsvResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!file) return
    const fd = new FormData()
    fd.append('csv_audience', file)
    startTransition(async () => {
      const r = await importAudienceCsv(fd)
      if ('error' in r) {
        setError(r.error)
        return
      }
      setResult(r)
    })
  }

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  const canSubmit = file !== null && !isPending

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          2b) Zielgruppe importieren
        </h2>
        <p className="mt-0.5 text-sm text-gray-600">
          Empfohlen: 1× pro Monat.
        </p>
      </div>

      <div className="rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-3 text-[13px] text-teal-900">
        Wähle in Pinterest &bdquo;Interagierende Zielgruppe&ldquo; (nicht
        &bdquo;Gesamte Zielgruppe&ldquo;) — diese Daten sind strategisch
        wertvoller.
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <label className="block text-sm font-medium text-gray-700">
            CSV: Audience-Insights (Interagierende Zielgruppe)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError(null)
                setResult(null)
              }}
              className="block flex-1 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
            />
            {file && (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                ✕ entfernen
              </button>
            )}
          </div>
          {file && (
            <p className="mt-1 break-all text-xs text-teal-700">
              ✓ {file.name}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && 'snapshot' in result && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">
              {result.replaced
                ? '↻ Snapshot überschrieben.'
                : '✓ Snapshot gespeichert.'}
            </p>
            <p className="mt-1 text-green-900">
              Stand: {formatDateDe(result.snapshot.audienceDate)} —{' '}
              {formatCount(result.snapshot.audienceSize)} Personen.
            </p>
          </div>
        )}

        {!result && (
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Importiert…' : '📥 Import starten'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          ℹ️ Das Stichdatum kommt aus der CSV. Bei wiederholtem Import für
          denselben Stichtag wird der vorhandene Snapshot ersetzt.
        </p>
      </form>
    </section>
  )
}
