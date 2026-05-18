'use client'

// Profil-Status für die Dashboard-Sektion „Wo stehst du?".
// Status leitet sich aus den aktiven (nicht-dismissed) Coaching-Diagnosen
// ab — die alte Aggregat-CTR/ER-Logik mit fixen Pinterest-Branchen-Schnitten
// ist bewusst entfernt, weil sie account-spezifische Bewertungen mit
// allgemeinen Werten vermischt hat.
//
// V3.2 — Layout-Umbau: Begriff „Profil-Status", horizontale Verlaufs-
// Skala oben, Werte mit Branchen-Benchmarks darunter, methodischer
// Hinweis als ⓘ-Tooltip statt Banner. Code-Variablen bleiben technisch.
//
// V3.2.2 — Befunde sind rein datengetrieben: kein Dismiss/localStorage
// mehr. Status und Liste leiten sich direkt aus den server-berechneten
// Coaching-Diagnosen ab; ein Befund verschwindet nur, wenn sich die
// echten Werte beim nächsten Analytics-Import bessern.

import InfoTooltip from '@/components/InfoTooltip'
import type { CoachingDiagnosis } from '@/lib/account-coaching'
import { BefundeListe } from './AccountDiagnoseSection'
import {
  computeProfilGesundheit,
  PROFIL_GESUNDHEIT_STUFEN,
  type ProfilGesundheitStatus,
} from '@/lib/profil-gesundheit'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import { getBenchmark } from '@/lib/industry-benchmarks'

// Fix 4 — der ehemalige hellblaue Banner-Text, jetzt als Hover-Tooltip.
const METHODIK_HINWEIS =
  'Diese Werte zeigen die Gesamtleistung deines Profils. Die Befunde unten basieren auf der typischen Pin-Leistung (Median) und können abweichen, wenn wenige starke Pins den Durchschnitt prägen.'

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${v.toFixed(digits).replace('.', ',')} %`
}

export default function ProfilGesundheitBlock({
  profilEr,
  profilCtr,
  nicheProfile,
  coachingDiagnoses,
  totalPins,
}: {
  // Profil-Engagement-Rate aus dem letzten profil_analytics-Eintrag
  // (= (saves + ausgehende_klicks) / impressionen × 100).
  profilEr: number | null
  // Profil-CTR aus dem letzten profil_analytics-Eintrag
  // (= ausgehende_klicks / impressionen × 100).
  profilCtr: number | null
  // Hauptnischen-Profil aus V2.1 — Anzeige + Benchmark-Lookup.
  nicheProfile: AccountNicheProfile
  // Komplette Coaching-Diagnose-Liste (server-side berechnet). V3.2.2:
  // wird unverändert für Status UND Befund-Liste verwendet.
  coachingDiagnoses: ReadonlyArray<CoachingDiagnosis>
  // Gesamtzahl Pins im Account — Auslöser für den < 30-Pins-Sonderfall.
  totalPins: number
}) {
  const ergebnis = computeProfilGesundheit(coachingDiagnoses, totalPins)

  // Klare Hauptnische? Sonst Fallback auf Pinterest-Allgemein-Benchmarks.
  const hasClearNiche =
    !!nicheProfile.primaryNiche &&
    !nicheProfile.isMixed &&
    !nicheProfile.unzureichendKategorisiert
  const benchmark = getBenchmark(
    hasClearNiche ? nicheProfile.primaryNiche!.label : null
  )
  const benchmarkPrefix =
    benchmark.source === 'industry' ? 'Branchenschnitt' : 'Pinterest-Schnitt'

  const nischeLabel = hasClearNiche
    ? `${nicheProfile.primaryNiche!.label} (${Math.round(
        nicheProfile.primaryShare * 100
      )} %)`
    : 'Keine klare Hauptnische erkannt'

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-semibold text-gray-900">
          Profil-Status: {ergebnis.label}
        </p>
        <p className="mt-1 text-sm text-gray-700">{ergebnis.beschreibung}</p>
      </div>

      <ProfilStatusSkala currentStatus={ergebnis.status} />

      <div className="text-[13px] text-gray-600">
        <ul className="space-y-1">
          <li className="flex flex-wrap items-center gap-x-1">
            <span>
              Engagement-Rate:{' '}
              <strong className="text-gray-800">{fmtPct(profilEr)}</strong>
            </span>
            <span aria-hidden className="text-gray-300">
              ·
            </span>
            <span className="text-gray-400">
              {benchmarkPrefix}: {benchmark.engagementRate.label}
            </span>
            <InfoTooltip text="(Saves + Ausgehende Klicks) ÷ Impressionen, über alle Pins. Gesamtleistung aller Pins zusammen — aus deinen manuell eingetragenen Profil-Daten." />
          </li>
          <li className="flex flex-wrap items-center gap-x-1">
            <span>
              CTR:{' '}
              <strong className="text-gray-800">{fmtPct(profilCtr)}</strong>
            </span>
            <span aria-hidden className="text-gray-300">
              ·
            </span>
            <span className="text-gray-400">
              {benchmarkPrefix}: {benchmark.ctr.label}
            </span>
            <InfoTooltip text="Ausgehende Klicks ÷ Impressionen, über alle Pins. Zeigt, wie gut deine Pins zum Klick auf die Website motivieren." />
          </li>
          <li>
            Hauptnische:{' '}
            <strong className="text-gray-800">{nischeLabel}</strong>
          </li>
        </ul>

        <p className="mt-2 flex items-center gap-1 text-[12px] text-gray-400">
          Wie diese Werte zu lesen sind
          <InfoTooltip text={METHODIK_HINWEIS} />
        </p>
      </div>

      {/* V3.2.1 Fix 2 — „Befunde" als Sub-Sektion derselben Box,
          getrennt durch eine Trennlinie. */}
      <hr className="border-gray-200" />

      <BefundeListe diagnoses={coachingDiagnoses} />
    </section>
  )
}

// V3.2 — horizontale 5-Stufen-Verlaufs-Skala. Farbverlauf Rot → Grün über
// die volle Breite, fünf Anker-Punkte (an den Label-Mitten ausgerichtet),
// die aktuelle Stufe mit Pfeil-Marker + „Du bist hier". Reihenfolge:
// schwach → ausbaufaehig → solide-mit-optimierung → solide → stark.
function ProfilStatusSkala({
  currentStatus,
}: {
  currentStatus: ProfilGesundheitStatus
}) {
  const activeIndex = PROFIL_GESUNDHEIT_STUFEN.findIndex(
    (s) => s.key === currentStatus
  )

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      {/* Beschriftungen — fünf gleich breite Spalten, zentriert. */}
      <div className="grid grid-cols-5 gap-1 text-center">
        {PROFIL_GESUNDHEIT_STUFEN.map((s, i) => (
          <span
            key={s.key}
            className={
              i === activeIndex
                ? `text-[11px] font-semibold leading-tight ${s.activeText}`
                : 'text-[11px] font-medium leading-tight text-gray-500'
            }
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Verlaufs-Balken + Anker-Punkte. Der Balken verbindet die Mitten
          des ersten und letzten Punkts (jeweils bei 10 % / 90 %). */}
      <div className="relative mt-2 h-3">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-600" />
        <div className="relative grid grid-cols-5">
          {PROFIL_GESUNDHEIT_STUFEN.map((s, i) => (
            <div key={s.key} className="flex justify-center">
              <span
                className={
                  i === activeIndex
                    ? 'h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-900 ring-2 ring-gray-900/25'
                    : 'h-3 w-3 rounded-full border-2 border-white bg-gray-400'
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pfeil-Marker unter der aktiven Stufe. */}
      <div className="mt-1 grid grid-cols-5 text-center">
        {PROFIL_GESUNDHEIT_STUFEN.map((s, i) => (
          <div
            key={s.key}
            className="text-[11px] font-medium text-gray-700"
          >
            {i === activeIndex && (
              <>
                <span aria-hidden className="block leading-none">
                  ▲
                </span>
                <span>Du bist hier</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
