'use client'

// V3.2.1 — „Befunde" als Sub-Sektion innerhalb des Profil-Status-Blocks
// (früher eigenständige Sektion „Profil-Diagnose"). Dieses Modul ist jetzt
// rein präsentational: Hydration, Dismiss-State und Filterung liegen im
// ProfilGesundheitBlock (eine Quelle für Status + Liste), hier nur das
// Rendering der Liste und der einzelnen Befund-Toggles.
//
// Coaching-Logik: lib/account-coaching.ts.

import Link from 'next/link'
import {
  type CoachingDiagnosis,
  type CoachingSeverity,
} from '@/lib/account-coaching'

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

// Befund-Liste inkl. Sub-Überschrift. `diagnoses` ist die server-seitig
// berechnete Liste — V3.2.2: keine Dismiss-Filterung mehr, Befunde sind
// rein datengetrieben und verschwinden nur, wenn sich die Werte bessern.
export function BefundeListe({
  diagnoses,
}: {
  diagnoses: ReadonlyArray<CoachingDiagnosis>
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Befunde</h3>
      <p className="text-sm text-gray-600">
        Automatisch erkannte Muster in deinem Profil.
      </p>

      <div className="mt-3">
        {diagnoses.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            ✓ Keine kritischen Probleme erkannt. Dein Profil zeigt eine
            solide Grundstruktur — fokussiere dich auf die individuellen
            Pin-Empfehlungen unten.
          </div>
        ) : (
          <ul className="space-y-3">
            {diagnoses.map((d) => (
              <DiagnoseCard key={d.id} diagnose={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// V3.2.1 Fix 3 — Toggle-Layout konsistent zu den anderen App-Toggles
// (vgl. „Zielgruppe verstehen", AudienceWissen.tsx): natives
// <details>/<summary>, ▸/▾-Pfeil ganz links, ganze Zeile klickbar,
// Hover-Highlight. Aufgeklappter Inhalt (Problem/Ursache/Handlung)
// unverändert.
export function DiagnoseCard({
  diagnose: d,
}: {
  diagnose: CoachingDiagnosis
}) {
  return (
    <li
      className={`rounded-lg border-2 bg-white shadow-sm ${SEVERITY_BORDER[d.severity]}`}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="mt-0.5 text-lg leading-none text-gray-400 transition-transform"
          >
            <span className="inline group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </span>
          <span
            className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[d.severity]}`}
          >
            {SEVERITY_LABEL[d.severity]}
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
            {d.titel}
          </span>
        </summary>
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
            // Pfeil → bleibt außerhalb des verlinkten Bereichs — nur das
            // Label ist klickbar (App-Konvention).
            <p className="text-xs text-gray-500">
              Mehr dazu: →{' '}
              <Link
                href={d.weiterführend.href}
                className="font-medium text-red-600 hover:underline"
              >
                {d.weiterführend.label}
              </Link>{' '}
              <span className="text-gray-400">
                (in {d.weiterführend.parent})
              </span>
            </p>
          )}
        </div>
      </details>
    </li>
  )
}
