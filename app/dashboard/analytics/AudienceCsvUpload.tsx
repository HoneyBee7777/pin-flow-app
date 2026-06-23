'use client'

import { useState, useTransition } from 'react'
import {
  importAudienceCsv,
  type ImportAudienceCsvResult,
} from './audience-actions'
import { HinweisBox } from '@/components/HinweisBox'

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
    <div className="space-y-3">
      <HinweisBox variant="tipp">
        Wähle in Pinterest &bdquo;Interagierende Zielgruppe&ldquo; (nicht
        &bdquo;Gesamte Zielgruppe&ldquo;), diese Daten sind strategisch
        wertvoller.
      </HinweisBox>

      <form
        onSubmit={onSubmit}
        className="space-y-4"
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
              className="block flex-1 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-marke-blaugrau file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-marke-blaugrau-dunkel"
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
            <p className="mt-1 break-all text-xs text-status-gut-text">
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
              Stand: {formatDateDe(result.snapshot.audienceDate)},{' '}
              {formatCount(result.snapshot.audienceSize)} Personen.
            </p>
          </div>
        )}

        {!result && (
          <div className="flex items-center">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
            >
              {isPending ? 'Importiert…' : 'Import starten'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Das Stichdatum kommt aus der CSV. Bei wiederholtem Import für
          denselben Stichtag wird der vorhandene Snapshot ersetzt.
        </p>
      </form>
    </div>
  )
}
