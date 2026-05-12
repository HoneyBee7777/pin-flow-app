'use client'

import type { AudienceSnapshot } from '@/lib/audience-types'

// V3.0 — Snapshot-Wechsler oben im Audience-Tab.
// Wird nur gerendert, wenn mehrere Snapshots existieren — bei einem einzigen
// Snapshot bringt der Wechsler nichts.

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function formatCount(n: number): string {
  return n.toLocaleString('de-DE')
}

export default function AudienceSnapshotList({
  snapshots,
  selectedId,
  onSelect,
}: {
  snapshots: AudienceSnapshot[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <section
      aria-label="Zielgruppe-Snapshots"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        Zielgruppe-Snapshots
      </h3>
      <ul className="space-y-1">
        {snapshots.map((s, i) => {
          const isLatest = i === 0
          const isSelected = s.id === selectedId
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-red-50 font-medium text-red-700'
                    : 'text-gray-700 hover:bg-white hover:text-gray-900'
                }`}
              >
                {formatDateDe(s.audienceDate)}
                {isLatest && (
                  <span className="ml-2 text-xs text-gray-500">(aktuell)</span>
                )}
                <span className="mx-2 text-gray-400">·</span>
                <span className="text-gray-600">
                  {formatCount(s.audienceSize)} Personen
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
