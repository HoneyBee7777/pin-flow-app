'use client'

// „Befunde"-Liste (Account-Diagnosen). Rein präsentational; die Coaching-Logik
// liegt in lib/account-coaching.ts. Die Block-Überschrift liegt im Aufrufer
// (Dashboard-Sektion „Was dein Profil dir zeigt") — hier nur Liste + Karten.

import Link from 'next/link'
import {
  type CoachingDiagnosis,
  type CoachingSeverity,
} from '@/lib/account-coaching'
import { StatusDot, type StatusTone } from '@/components/StatusDot'

// Schweregrad → einheitlicher Status-Ton (StatusDot/status-Tokens):
// kritisch = schlecht, wichtig = achtung, hinweis = neutral.
const SEVERITY_TONE: Record<CoachingSeverity, StatusTone> = {
  kritisch: 'schlecht',
  wichtig: 'achtung',
  hinweis: 'neutral',
}

const SEVERITY_LABEL: Record<CoachingSeverity, string> = {
  kritisch: 'Kritisch',
  wichtig: 'Wichtig',
  hinweis: 'Hinweis',
}

// Coaching-Fließtext. Zeilen, die mit „• " beginnen, werden zu einer echten
// semantischen <ul>-Liste zusammengefasst (das Bullet-Zeichen aus den Daten
// wird entfernt und durch list-disc ersetzt). Vorangehende Zeilen bleiben ein
// Absatz. Texte ohne Bullet-Marker rendern wie bisher als <p>.
function CoachingText({ text }: { text: string }) {
  const lines = text.split('\n')
  const firstBullet = lines.findIndex((l) => l.trimStart().startsWith('• '))
  if (firstBullet === -1) {
    return <p className="mt-1 whitespace-pre-line">{text}</p>
  }
  const lead = lines.slice(0, firstBullet).join('\n').trim()
  const items = lines
    .slice(firstBullet)
    .filter((l) => l.trimStart().startsWith('• '))
    .map((l) => l.trimStart().slice(2).trim())
  return (
    <div className="mt-1 space-y-1.5">
      {lead && <p className="whitespace-pre-line">{lead}</p>}
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

// Liste der Befund-Karten. Ohne eigene Überschrift — die kommt vom Aufrufer.
export function BefundeListe({
  diagnoses,
}: {
  diagnoses: ReadonlyArray<CoachingDiagnosis>
}) {
  if (diagnoses.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
        Keine kritischen Probleme erkannt. Dein Profil zeigt eine solide
        Grundstruktur. Fokussiere dich auf die individuellen Pin-Empfehlungen
        weiter unten.
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {diagnoses.map((d) => (
        <DiagnoseCard key={d.id} diagnose={d} />
      ))}
    </ul>
  )
}

// Ruhige Befund-Karte im neutralen Karten-Stil (heller Hintergrund, dezenter
// Rahmen) wie die Profil-Performance-Kacheln. Schweregrad nur über einen
// farbigen Punkt + kleines Label, kein farbiger Vollrahmen. Natives
// <details>/<summary>, ganze Zeile klickbar.
export function DiagnoseCard({
  diagnose: d,
}: {
  diagnose: CoachingDiagnosis
}) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="text-base leading-none text-gray-400">
            <span className="inline group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </span>
          <StatusDot tone={SEVERITY_TONE[d.severity]} />
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {SEVERITY_LABEL[d.severity]}
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
            {d.titel}
          </span>
        </summary>
        {/* Coaching-Bereich: nur Camel-Streifen links (kein zweiter weißer
            Kasten, da die Befund-Karte selbst schon weiß ist). */}
        <div className="space-y-3 border-t border-l-[3px] border-gray-100 border-l-marke-ocker px-4 py-3 text-sm text-marke-tanne">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-500">
              Problem
            </p>
            <CoachingText text={d.problem} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-500">
              Ursache
            </p>
            <CoachingText text={d.ursache} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-500">
              Handlung
            </p>
            <CoachingText text={d.handlung} />
          </div>
          {d.weiterführend && (
            // Pfeil → bleibt außerhalb des verlinkten Bereichs, nur das Label
            // ist klickbar (App-Konvention).
            <p className="text-xs text-gray-500">
              Mehr dazu: →{' '}
              <Link
                href={d.weiterführend.href}
                className="font-medium text-link underline"
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
