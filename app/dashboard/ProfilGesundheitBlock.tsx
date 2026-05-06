'use client'

// Profil-Gesundheit für die Dashboard-Sektion „Wo stehst du?".
// Status leitet sich aus den aktiven (nicht-dismissed) Coaching-Diagnosen
// ab — die alte Aggregat-CTR/ER-Logik mit fixen Pinterest-Branchen-Schnitten
// (0,15–0,25 %) ist bewusst entfernt, weil sie account-spezifische
// Bewertungen mit allgemeinen Werten vermischt hat.

import { useEffect, useMemo, useState } from 'react'
import InfoTooltip from '@/components/InfoTooltip'
import {
  shouldShowDespiteDismissal,
  type CoachingDiagnosis,
  type DismissedMap,
} from '@/lib/account-coaching'
import {
  computeProfilGesundheit,
  PROFIL_GESUNDHEIT_STUFEN,
  type ProfilGesundheitStatus,
} from '@/lib/profil-gesundheit'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'

const COACHING_STORAGE_KEY = 'pin_flow_diagnosis_dismissed'
const SNAPSHOT_EXPLAINER_KEY = 'profil_snapshot_erklaerung_gesehen'

function readDismissedMap(): DismissedMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(COACHING_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') return parsed as DismissedMap
  } catch {
    // ignore
  }
  return {}
}

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
  // Hauptnischen-Profil aus V2.1 — wird im Snapshot angezeigt.
  nicheProfile: AccountNicheProfile
  // Komplette Coaching-Diagnose-Liste (server-side berechnet). Filterung
  // nach localStorage-Dismiss passiert hier im Client.
  coachingDiagnoses: ReadonlyArray<CoachingDiagnosis>
  // Gesamtzahl Pins im Account — Auslöser für den < 30-Pins-Sonderfall.
  totalPins: number
}) {
  const [dismissedMap, setDismissedMap] = useState<DismissedMap>({})
  const [snapshotExplainerVisible, setSnapshotExplainerVisible] =
    useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDismissedMap(readDismissedMap())
    if (typeof window !== 'undefined') {
      try {
        const seen = window.localStorage.getItem(SNAPSHOT_EXPLAINER_KEY)
        if (!seen) setSnapshotExplainerVisible(true)
      } catch {
        setSnapshotExplainerVisible(true)
      }
    }
    setHydrated(true)
  }, [])

  // Aktive Diagnosen = alle, die nicht (gültig) dismissed sind. Identische
  // Filter-Funktion wie in AccountDiagnoseSection — beide Stellen bleiben
  // synchron, weil sie aus derselben localStorage-Quelle lesen.
  const activeDiagnoses = useMemo(() => {
    if (!hydrated) {
      // Bis Hydration abgeschlossen ist, ist die Filterung nicht
      // verlässlich — wir nutzen den unfiltered Set, damit kein Flackern
      // entsteht. Sobald hydrated, wird der gefilterte Status berechnet.
      return coachingDiagnoses
    }
    return coachingDiagnoses.filter((d) =>
      shouldShowDespiteDismissal(d, dismissedMap[d.id])
    )
  }, [coachingDiagnoses, dismissedMap, hydrated])

  const ergebnis = useMemo(
    () => computeProfilGesundheit(activeDiagnoses, totalPins),
    [activeDiagnoses, totalPins]
  )

  function dismissSnapshotExplainer() {
    setSnapshotExplainerVisible(false)
    try {
      window.localStorage.setItem(SNAPSHOT_EXPLAINER_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[7fr_3fr]">
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold text-gray-900">
              Profil-Gesundheit: {ergebnis.label}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {ergebnis.beschreibung}
            </p>
          </div>

          <AccountSnapshot
            profilEr={profilEr}
            profilCtr={profilCtr}
            nicheProfile={nicheProfile}
          />

          {snapshotExplainerVisible && (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900">
              <div className="flex items-start gap-3">
                <span aria-hidden>ⓘ</span>
                <div className="flex-1">
                  Diese Werte zeigen die Gesamtleistung. Die Diagnose unten
                  basiert auf der typischen Pin-Leistung (Median) — sie kann
                  abweichen, wenn wenige starke Pins den Schnitt prägen.
                </div>
                <button
                  type="button"
                  onClick={dismissSnapshotExplainer}
                  className="shrink-0 rounded-md border border-cyan-300 bg-white px-2 py-0.5 text-xs font-medium text-cyan-900 hover:bg-cyan-100"
                >
                  Verstanden
                </button>
              </div>
            </div>
          )}
        </div>

        <ProfilGesundheitAmpel currentStatus={ergebnis.status} />
      </div>
    </section>
  )
}

// 5-stufige Skala — aktive Stufe wird farblich hervorgehoben, alle anderen
// auf 50 % Opacity gesetzt. Reihenfolge: schwach → ausbaufaehig →
// solide-mit-optimierung → solide → stark.
function ProfilGesundheitAmpel({
  currentStatus,
}: {
  currentStatus: ProfilGesundheitStatus
}) {
  return (
    <div className="space-y-1.5">
      {PROFIL_GESUNDHEIT_STUFEN.map((s) => {
        const isActive = s.key === currentStatus
        return (
          <div
            key={s.key}
            className={
              isActive
                ? `flex items-start gap-2 rounded-r-md border-l-[3px] ${s.activeBorder} ${s.activeBg} px-2 py-1.5`
                : 'flex items-start gap-2 px-2 py-1.5 opacity-50'
            }
          >
            <span aria-hidden className="leading-tight">
              {s.emoji}
            </span>
            <span
              className={
                isActive
                  ? `text-xs font-semibold leading-snug ${s.activeText}`
                  : 'text-xs font-medium leading-snug text-gray-500'
              }
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Account-Snapshot — kompakte Liste mit Profil-ER, Profil-CTR und
// Hauptnische. Werte stammen aus profil_analytics (letzter Eintrag) und
// dem AccountNicheProfile aus V2.1.
function AccountSnapshot({
  profilEr,
  profilCtr,
  nicheProfile,
}: {
  profilEr: number | null
  profilCtr: number | null
  nicheProfile: AccountNicheProfile
}) {
  const nischeLabel = (() => {
    if (
      !nicheProfile.primaryNiche ||
      nicheProfile.isMixed ||
      nicheProfile.unzureichendKategorisiert
    ) {
      return 'Keine klare Hauptnische erkannt'
    }
    const sharePct = Math.round(nicheProfile.primaryShare * 100)
    return `${nicheProfile.primaryNiche.label} (${sharePct} %)`
  })()

  return (
    <div className="text-[13px] text-gray-600">
      <p className="font-medium text-gray-700">Account-Snapshot:</p>
      <ul className="mt-1 space-y-0.5">
        <li className="flex items-center gap-1">
          <span>
            Profil-Engagement-Rate:{' '}
            <strong className="text-gray-800">{fmtPct(profilEr)}</strong>
          </span>
          <InfoTooltip text="Gesamtleistung aller Pins zusammen — aus deinen manuell eingetragenen Profil-Daten." />
        </li>
        <li className="flex items-center gap-1">
          <span>
            Profil-CTR:{' '}
            <strong className="text-gray-800">{fmtPct(profilCtr)}</strong>
          </span>
          <InfoTooltip text="Gesamtleistung aller Pins zusammen. Pinterest-Branchenschnitte: 0,3-0,8 %." />
        </li>
        <li>
          Hauptnische:{' '}
          <strong className="text-gray-800">{nischeLabel}</strong>
        </li>
      </ul>
    </div>
  )
}
