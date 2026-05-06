'use client'

// Dashboard-Sektion „Account-Diagnose" — zeigt automatisch erkannte Muster
// im Account und konkrete Handlungsempfehlungen. Position: oberhalb von
// „Bestehende Pins optimieren", unterhalb von „Keywords & SEO".
//
// Coaching-Logik liegt in lib/account-coaching.ts. Hier nur Rendering +
// Dismissal-Verwaltung über localStorage.

import { useEffect, useMemo, useState } from 'react'
import {
  shouldShowDespiteDismissal,
  type CoachingDiagnosis,
  type CoachingSeverity,
  type DismissedMap,
  type DismissedRecord,
} from '@/lib/account-coaching'

const STORAGE_KEY = 'pin_flow_diagnosis_dismissed'

const SEVERITY_BORDER: Record<CoachingSeverity, string> = {
  kritisch: 'border-red-300',
  wichtig: 'border-blue-300',
  hinweis: 'border-gray-300',
}

const SEVERITY_BADGE: Record<CoachingSeverity, string> = {
  kritisch: 'bg-red-100 text-red-700',
  wichtig: 'bg-blue-100 text-blue-700',
  hinweis: 'bg-gray-100 text-gray-700',
}

const SEVERITY_LABEL: Record<CoachingSeverity, string> = {
  kritisch: 'Kritisch',
  wichtig: 'Wichtig',
  hinweis: 'Hinweis',
}

// Liest die gespeicherten Dismiss-Records. Korrupte JSON-Daten werden
// stillschweigend verworfen — das Coaching bleibt funktional, der User sieht
// die Diagnosen wieder.
function readDismissedMap(): DismissedMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') {
      return parsed as DismissedMap
    }
  } catch {
    // ignore
  }
  return {}
}

function writeDismissedMap(map: DismissedMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage voll oder Privacy-Mode — Dismiss greift dann nicht,
    // ist aber kein Crash-Grund.
  }
}

export default function AccountDiagnoseSection({
  diagnoses,
}: {
  diagnoses: CoachingDiagnosis[]
}) {
  // Hydration: erst auf dem Client lesen, sonst Mismatch zwischen SSR
  // (kein localStorage) und Client.
  const [dismissedMap, setDismissedMap] = useState<DismissedMap>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDismissedMap(readDismissedMap())
    setHydrated(true)
  }, [])

  // Filter: Diagnose anzeigen wenn entweder noch nicht dismissed, ODER
  // Dismiss ist abgelaufen / Werte haben sich signifikant geändert.
  const visibleDiagnoses = useMemo(() => {
    if (!hydrated) {
      // Vor Hydration nichts anzeigen — vermeidet Flackern, falls der User
      // in der Vergangenheit alle dismissed hat.
      return [] as CoachingDiagnosis[]
    }
    return diagnoses.filter((d) =>
      shouldShowDespiteDismissal(d, dismissedMap[d.id])
    )
  }, [diagnoses, dismissedMap, hydrated])

  function dismiss(d: CoachingDiagnosis) {
    const record: DismissedRecord = {
      dismissedAt: new Date().toISOString(),
      snapshot: d.snapshot,
    }
    const next: DismissedMap = { ...dismissedMap, [d.id]: record }
    setDismissedMap(next)
    writeDismissedMap(next)
  }

  return (
    <section className="scroll-mt-4">
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Account-Diagnose
        </h2>
        <p className="text-sm text-gray-600">
          Automatisch erkannte Muster in deinem Account.
        </p>
      </header>

      {!hydrated ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          Diagnose wird geladen…
        </div>
      ) : visibleDiagnoses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          ✓ Keine kritischen Probleme erkannt. Dein Account zeigt eine solide
          Grundstruktur — fokussiere dich auf die individuellen
          Pin-Empfehlungen unten.
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleDiagnoses.map((d) => (
            <DiagnoseCard
              key={d.id}
              diagnose={d}
              onDismiss={() => dismiss(d)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function DiagnoseCard({
  diagnose: d,
  onDismiss,
}: {
  diagnose: CoachingDiagnosis
  onDismiss: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li
      className={`rounded-lg border-2 bg-white shadow-sm ${SEVERITY_BORDER[d.severity]}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span
          className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[d.severity]}`}
        >
          {SEVERITY_LABEL[d.severity]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{d.titel}</p>
          {!expanded && (
            <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
              {d.problem}
            </p>
          )}
        </div>
        <span
          className="mt-0.5 shrink-0 text-gray-400"
          aria-hidden
        >
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Problem
            </p>
            <p className="mt-1 whitespace-pre-line">{d.problem}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ursache
            </p>
            <p className="mt-1 whitespace-pre-line">{d.ursache}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Handlung
            </p>
            <p className="mt-1 whitespace-pre-line">{d.handlung}</p>
          </div>
          {d.weiterführend && (
            <p className="text-xs italic text-gray-500">
              Mehr dazu: {d.weiterführend}
            </p>
          )}
          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Verstanden, nicht mehr anzeigen
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
