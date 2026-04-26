'use client'

import { useState, useTransition } from 'react'
import { toggleDashboardErledigt } from './actions/dashboard-erledigt'
import {
  diffDays,
  formatDateDe,
  PIN_DIAGNOSE_BADGE,
  PIN_DIAGNOSE_LABEL,
  type PinDiagnose,
} from './analytics/utils'

export type BearbeitetRowData = {
  pin_id: string
  titel: string | null
  kategorie: PinDiagnose
  created_at: string
}

function formatRelativeDays(iso: string, today: string): string {
  const date = iso.slice(0, 10)
  const days = diffDays(date, today)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return formatDateDe(date)
}

export default function BearbeitetRow({
  row,
  today,
}: {
  row: BearbeitetRowData
  today: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  function onUncheck(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setError(null)
    if (!checked) {
      // User entfernt den Haken → Pin geht zurück in den aktiven Bereich
      setHidden(true)
      startTransition(async () => {
        const r = await toggleDashboardErledigt(
          row.pin_id,
          row.kategorie,
          false
        )
        if (r.error) {
          setError(r.error)
          setHidden(false)
        }
      })
    }
  }

  if (hidden) return null

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={true}
        onChange={onUncheck}
        disabled={isPending}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
        aria-label="Erledigt-Markierung entfernen"
        title="Haken entfernen — Pin erscheint wieder im aktiven Handlungsbedarf"
      />
      <span className="flex-1 text-gray-700 line-through">
        {row.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
      </span>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PIN_DIAGNOSE_BADGE[row.kategorie]}`}
      >
        {PIN_DIAGNOSE_LABEL[row.kategorie]}
      </span>
      <span className="text-xs text-gray-500">
        abgehakt {formatRelativeDays(row.created_at, today)}
      </span>
      {error && (
        <span className="basis-full text-xs text-red-700">{error}</span>
      )}
    </li>
  )
}
