'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCategoryLabel } from '@/lib/audience-translations'
import type { AudienceSnapshot } from '@/lib/audience-types'
import {
  effectiveZeitraum,
  type ProfilAnalyticsWithGrowth,
} from './utils'
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
  profilAnalytics,
  onEditInteragierende,
}: {
  snapshots: AudienceSnapshot[]
  // DESC nach datum (withGrowth). [0] = neuester Performance-Datensatz.
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  // Wechselt zum Eingabe-Tab + scrollt zum Feld „Interagierende Zielgruppe".
  onEditInteragierende?: () => void
}) {
  // Leerer State: kein Snapshot bisher importiert.
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-base font-medium text-gray-900">
          Noch keine interagierende Zielgruppe-Daten
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
      profilAnalytics={profilAnalytics}
      onEditInteragierende={onEditInteragierende}
    />
  )
}

// Einleitungssatz + einklappbarer „So funktioniert diese Seite"-Block, im
// selben Toggle-Muster wie die „So funktioniert …"-Toggles der anderen Tabs.
// `example` = oberste Tabellenzeile (höchste Affinität), für das dynamische
// Beispiel im zweiten Block. null = leerer Snapshot → Beispiel entfällt.
function AudienceSeiteInfo({
  example,
}: {
  example: { label: string; anteil: string; affinity: string } | null
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        Hier siehst du, wer deine interagierende Zielgruppe auf Pinterest ist
        und wofür sie sich interessiert, also die Menschen, die mit deinen Pins
        interagiert haben.{' '}
        <strong className="font-semibold">
          Je genauer du deine Zielgruppe kennst, desto gezielter kannst du
          pinnen
        </strong>
        , denn du pinnst dann für echte Interessen statt ins Blaue. Mehr dazu
        unter{' '}
        <Link
          href="/dashboard/strategie?tab=audience"
          className="font-medium text-link underline underline-offset-2"
        >
          Zielgruppe verstehen
        </Link>
        . Die Daten stammen aus deinem importierten Zielgruppe-CSV.
      </p>
      <details className="group overflow-hidden max-w-3xl rounded-lg border border-gray-200 bg-white shadow-sm">
        <summary className="group/sum flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-marke-blaugrau [&::-webkit-details-marker]:hidden">
          <span
            className="text-lg leading-none text-gray-400 transition-transform group-hover/sum:text-white"
            aria-hidden
          >
            <span className="inline group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </span>
          <span className="flex-1 group-hover/sum:text-white">So funktioniert diese Seite</span>
        </summary>
        <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
          <p>
            Diese Auswertung bezieht sich auf deine interagierende Zielgruppe.
            Das sind die eindeutigen Personen, die in den letzten 30 Tagen aktiv
            mit deinen Pins interagiert haben, nicht nur gesehen. Als
            Interaktion zählt Pinterest, wenn jemand deinen Pin öffnet, auf
            deine verlinkte Seite klickt oder ihn auf einem eigenen Board
            speichert.
          </p>
          <p>
            Gezählt werden Personen, nicht Aktionen. Wer fünf Pins speichert,
            zählt einmal. Das Fenster ist rollierend über 30 Tage, nicht der
            Kalendermonat, das verzerrt Monatsvergleiche etwas, wenn du an
            festen Stichtagen abliest.
          </p>
          <p>
            Wer deine Pins nur gesehen hat, landet in der Gesamtzielgruppe. Das
            Verhältnis von interagierender zu gesamter Zielgruppe ist
            aussagekräftig: Wächst die gesamte Zielgruppe, aber die
            interagierende stagniert, sehen viele deine Pins, ohne zu reagieren.
            Dann liegt es eher am Pin-Motiv oder daran, dass das Thema nicht zur
            Suche passt, nicht an der Reichweite.
          </p>
          <p>
            Die Tabelle zeigt dir zwei Zahlen pro Thema, und sie beantworten
            verschiedene Fragen.
          </p>
          <p>
            <strong className="font-semibold">Der Anteil der Zielgruppe</strong>{' '}
            sagt, wie groß der Teil deiner interagierenden Zielgruppe ist, der
            dieses Interesse hat.{' '}
            {example && (
              <>
                <strong className="font-semibold">
                  Bei dir steht {example.label} ganz oben mit {example.anteil}
                </strong>
                : von hundert Personen deiner interagierenden Zielgruppe
                interessieren sich so viele dafür.{' '}
              </>
            )}
            Eine Person hat meist mehrere Interessen gleichzeitig, deshalb
            summieren sich die Anteile über alle Themen auf weit mehr als
            hundert Prozent. Das ist kein Fehler, jedes Thema wird einzeln
            gezählt.
          </p>
          <p>
            Die <strong className="font-semibold">Affinität</strong> sagt, wie
            viel stärker dieses Interesse bei deiner Zielgruppe ist als beim
            Pinterest-Durchschnitt. Sie ist ein Faktor, kein Prozentwert:{' '}
            <strong className="font-semibold">
              1,0 ist Durchschnitt, 2,0 doppelt so stark
            </strong>
            .
            {example && (
              <>
                {' '}
                {example.label} hat bei dir eine Affinität von{' '}
                <strong className="font-semibold">{example.affinity}</strong>.
              </>
            )}
          </p>
          <p>
            Wenn du eine Kategorie aufklappst, siehst du die Unterthemen,
            jeweils mit eigenem Anteil und eigener Affinität. So erkennst du,
            welches Unterthema innerhalb einer starken Kategorie wirklich zieht
            und welches nur mitläuft.
          </p>
          <p>
            Das{' '}
            <strong className="font-semibold">
              Spannende für deine Strategie ist die Affinität, nicht der Anteil
            </strong>
            . Themen mit hoher Affinität zeigen, womit sich deine Zielgruppe von
            der breiten Masse abhebt. Dort lohnt sich dein Content am meisten.
            Deshalb ist die Tabelle nach Affinität sortiert, die stärksten
            Themen stehen oben.
          </p>
          <p>
            Die konkrete Handlung dazu, wie du aus diesen Themen Content-Ideen
            machst, findest du unter{' '}
            <Link
              href="/dashboard/ressourcen#bruecken-themen"
              className="font-medium text-link underline underline-offset-2"
            >
              Prompts und Vorlagen
            </Link>
            .
          </p>
        </div>
      </details>
    </div>
  )
}

// Eigener Body, damit der Empty-State-Fall keinen useState/useMemo aufruft
// und die Hooks-Reihenfolge stabil bleibt.
function AudienceTabBody({
  snapshots,
  profilAnalytics,
  onEditInteragierende,
}: {
  snapshots: AudienceSnapshot[]
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  onEditInteragierende?: () => void
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

  // Oberste Tabellenzeile = höchste Affinität (gleiche Sortierung wie die
  // Tabelle, Default Affinität DESC). Werte exakt wie in der Tabelle formatiert,
  // damit Beispiel und Tabelle übereinstimmen. Leerer Snapshot → null.
  const topExample = useMemo(() => {
    const arr = selected.data.interests
    if (arr.length === 0) return null
    const top = arr.slice().sort((a, b) => b.affinity - a.affinity)[0]
    return {
      label: formatCategoryLabel(top.category),
      anteil: `${(top.percent * 100).toFixed(1).replace('.', ',')} %`,
      affinity: top.affinity.toFixed(2).replace('.', ','),
    }
  }, [selected])

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

  // Reihenfolge: SnapshotList (wenn ≥2) → Kernzahl + Demografie (eine Reihe) →
  // Interessen/Affinity (Herzstück) → Brücken-Link (Handlung). Coaching-Text +
  // Pills sind raus (Coaching steht identisch im Dashboard, Pills doppelten die
  // Tabelle). Kernzahl links (1/3), Demografie rechts (2/3); auf Mobil gestapelt.
  return (
    <div className="space-y-6">
      <AudienceSeiteInfo example={topExample} />
      {snapshots.length > 1 && (
        <AudienceSnapshotList
          snapshots={snapshots}
          selectedId={selected.id}
          onSelect={setSelectedId}
        />
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AudienceSizeBlock
          engaged={engaged}
          onEditInteragierende={onEditInteragierende}
        />
        <div className="h-full lg:col-span-2">
          <AudienceDemographics snapshot={selected} />
        </div>
      </div>
      <AudienceInterestsTable interests={selected.data.interests} />
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">
          Mach aus diesen Themen Content-Ideen
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Die Themen mit hoher Affinität zeigen, wofür deine interagierende
          Zielgruppe brennt. Lass dir daraus Brücken-Themen vorschlagen,
          Inhalte, die deine Nische mit diesen Interessen verbinden.
        </p>
        <p className="mt-2 text-sm">
          →{' '}
          <Link
            href="/dashboard/ressourcen#bruecken-themen"
            className="font-medium text-link underline underline-offset-2"
          >
            Brücken-Themen-Ideen generieren
          </Link>
        </p>
      </div>
    </div>
  )
}
