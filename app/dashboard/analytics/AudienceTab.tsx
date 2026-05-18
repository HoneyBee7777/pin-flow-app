'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import { generateAudienceInsights } from '@/lib/audience-insights'
import type { AudienceSnapshot } from '@/lib/audience-types'
import {
  effectiveZeitraum,
  type ProfilAnalyticsWithGrowth,
} from './utils'
import AudienceInsightSummary from './AudienceInsightSummary'
import AudienceInterestsTable from './AudienceInterestsTable'
import {
  AudienceDemographics,
  AudienceSizeBlock,
} from './AudienceOverview'
import AudienceSnapshotList from './AudienceSnapshotList'

// V3.0 — Hauptkomponente für den Audience-Analytics-Tab.
//
// Aufbau (Reihenfolge im UI):
//   A) Snapshot-Liste (oben, nur wenn mehrere)
//   B) Audience-Übersicht (Größe + Demografie)
//   C) Interessen-Tabelle (sortierbar, ausklappbar)
//   D) Insight-Summary (Heuristik)
//
// Datenfluss:
//   – snapshots kommen vom Server (page.tsx), DESC nach audienceDate sortiert
//   – selectedId: State, default = neuester Snapshot
//   – previous = Snapshot mit Index+1 (Vormonat bezogen auf den SELEKTIERTEN);
//     wenn man also einen älteren Snapshot inspiziert, wird sein eigener
//     Vormonat fürs Trend-Hint genutzt, nicht der allerneueste.
export default function AudienceTab({
  snapshots,
  nicheProfile,
  profilAnalytics,
}: {
  snapshots: AudienceSnapshot[]
  nicheProfile: AccountNicheProfile
  // DESC nach datum (withGrowth). [0] = neuester Performance-Datensatz.
  profilAnalytics: ProfilAnalyticsWithGrowth[]
}) {
  // Leerer State: kein Snapshot bisher importiert.
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-base font-medium text-gray-900">
          Noch keine Zielgruppe-Daten
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Importiere deine erste Zielgruppe-CSV im Tab &bdquo;Eingabe&ldquo;.
        </p>
      </div>
    )
  }

  return (
    <AudienceTabBody
      snapshots={snapshots}
      nicheProfile={nicheProfile}
      profilAnalytics={profilAnalytics}
    />
  )
}

// Eigener Body, damit der Empty-State-Fall keinen useState/useMemo aufruft
// und die Hooks-Reihenfolge stabil bleibt.
function AudienceTabBody({
  snapshots,
  nicheProfile,
  profilAnalytics,
}: {
  snapshots: AudienceSnapshot[]
  nicheProfile: AccountNicheProfile
  profilAnalytics: ProfilAnalyticsWithGrowth[]
}) {
  const [selectedId, setSelectedId] = useState<string>(snapshots[0].id)

  // V3.0.8 — die angezeigte Zielgruppen-Größe stammt jetzt aus den
  // Performance-Daten („Interagierende Zielgruppe"), NICHT mehr aus der
  // gerundeten CSV-Audience-Size. Immer der neueste Performance-Datensatz,
  // unabhängig vom selektierten Snapshot (andere Datenquelle).
  const profilLatest = profilAnalytics[0] ?? null
  const profilPrev = profilAnalytics[1] ?? null
  const engaged = profilLatest
    ? {
        value: profilLatest.interagierende_zielgruppe,
        dateIso: effectiveZeitraum(profilLatest).bis,
        growthPct: profilLatest.interagierend_growth,
        previousValue: profilPrev
          ? profilPrev.interagierende_zielgruppe
          : null,
      }
    : null

  const selected =
    snapshots.find((s) => s.id === selectedId) ?? snapshots[0]
  const selectedIndex = snapshots.findIndex((s) => s.id === selected.id)
  const previous = snapshots[selectedIndex + 1] ?? null

  const insight = useMemo(
    () =>
      generateAudienceInsights({
        snapshot: selected,
        previousSnapshot: previous,
        nicheId: nicheProfile.primaryNiche?.id ?? null,
        nicheLabel: nicheProfile.primaryNiche?.label ?? null,
        // V3.0.9 — Größen-Satz/Trend basieren auf der echten
        // interagierenden Zielgruppe aus den Performance-Daten.
        engagedSize: engaged?.value ?? null,
        engagedPreviousSize: engaged?.previousValue ?? null,
      }),
    [
      selected,
      previous,
      nicheProfile,
      engaged?.value,
      engaged?.previousValue,
    ]
  )

  // V3.0 Phase 2d: Pillen vom Dashboard-Widget linken auf
  // `?tab=audience#interest-<slug>`. Bei Mount des Tabs den Hash auslesen
  // und zur passenden Tabellenzeile scrollen. Kurzes Timeout, damit React
  // die Tabelle gerendert hat, bevor wir nach dem Element suchen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.slice(1)
    if (!hash.startsWith('interest-')) return
    const t = setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(t)
  }, [])

  // V3.0.4: Coaching-Block ganz oben — die Botschaft steht VOR den Daten.
  // Reihenfolge: SnapshotList (wenn ≥2) → Coaching → Audience-Größe →
  // Demografie → Interessen-Tabelle.
  return (
    <div className="space-y-6">
      {snapshots.length > 1 && (
        <AudienceSnapshotList
          snapshots={snapshots}
          selectedId={selected.id}
          onSelect={setSelectedId}
        />
      )}
      <AudienceInsightSummary insight={insight} />
      <AudienceSizeBlock engaged={engaged} />
      <AudienceDemographics snapshot={selected} />
      <AudienceInterestsTable interests={selected.data.interests} />
    </div>
  )
}
