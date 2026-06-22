'use client'

import Link from 'next/link'
import type { AudienceSnapshot } from '@/lib/audience-types'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import {
  buildLueckenCoaching,
  generateAudienceInsights,
} from '@/lib/audience-insights'
import CoachingParagraphs, {
  renderWithBold,
} from '@/components/CoachingParagraphs'
import { KpiCard } from '@/components/KpiCard'
import {
  formatDateDe,
  formatZahl,
  type ProfilAnalyticsWithGrowth,
} from './analytics/utils'

// Zielgruppen-Block auf dem Dashboard (unter dem Strategie-Check).
//
// Aufbau: Überschrift + Einleitungssatz → zwei Überblicks-Kacheln (Gesamte /
// Interagierende Zielgruppe, Bestandsgrößen aus profil_analytics, neutraler
// Vormonatsvergleich ohne grün/rot-Wertung) → Coaching-Box bzw. CSV-Hinweis →
// zwei Links.
//
// Gestaffeltes Gate: erscheint, sobald Bestands-Zahlen (latest) ODER ein
// Snapshot da sind. Coaching-Box nur mit Snapshot + Coaching-Text; ohne
// Snapshot, aber mit Zahlen, ein kurzer CSV-Hinweis.
//
// Der Coaching-Text (3 Absätze: Beobachtung → Warum → Reflexion) kommt aus
// `generateAudienceInsights().coachingBlock` — identisch zum Analytics-Tab.

export default function ZielgruppeCoachingBlock({
  snapshots,
  nicheProfile,
  latest,
  previous,
}: {
  // DESC nach Datum. Liefert den Coaching-Text.
  snapshots: AudienceSnapshot[]
  nicheProfile: AccountNicheProfile
  // Letzter/vorheriger profil_analytics-Eintrag für die Zielgruppen-Zahlen.
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
}) {
  const snapshot = snapshots[0]
  const coachingBlock = snapshot
    ? generateAudienceInsights({
        snapshot,
        nicheId: nicheProfile.primaryNiche?.id ?? null,
        nicheLabel: nicheProfile.primaryNiche?.label ?? null,
      }).coachingBlock
    : null

  // Lücken-Coaching: Trend-Divergenz interagierende vs. gesamte Zielgruppe
  // (gegen Vormonat). null, wenn kein Vormonat / Werte fehlen / beide fallen.
  const lueckenText = buildLueckenCoaching({
    hasPrevious: previous !== null,
    zielgruppeGrowth: latest?.zielgruppe_growth ?? null,
    interagierendGrowth: latest?.interagierend_growth ?? null,
  })

  // Weder Bestands-Zahlen noch Snapshot → Block ganz weg.
  if (latest === null && snapshots.length === 0) return null

  const prevText = (val: number | null | undefined) =>
    previous && val !== null && val !== undefined
      ? `Vorperiode: ${formatZahl(val)} (${formatDateDe(previous.datum)})`
      : undefined

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          Deine Zielgruppe
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Wer für alle pinnt, erreicht niemanden. Hier siehst du, wie groß deine
          Zielgruppe ist, wer wirklich mit dir interagiert, und wie du daraus
          konkrete Themen machst.
        </p>
      </div>

      {latest && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <KpiCard
            label="Gesamte Zielgruppe"
            value={formatZahl(latest.gesamte_zielgruppe)}
            fullValue={latest.gesamte_zielgruppe}
            growth={latest.zielgruppe_growth}
            tooltip="Alle Menschen, die deinen Content gesehen haben, auf Pinterest und außerhalb."
            previousValue={prevText(previous?.gesamte_zielgruppe)}
          />
          <KpiCard
            label="Interagierende Zielgruppe"
            value={formatZahl(latest.interagierende_zielgruppe)}
            fullValue={latest.interagierende_zielgruppe}
            growth={latest.interagierend_growth}
            tooltip="Menschen, die aktiv reagiert haben: geklickt, gespeichert oder kommentiert. Qualitativ wertvoller als die Gesamtzielgruppe."
            previousValue={prevText(previous?.interagierende_zielgruppe)}
          />
        </div>
      )}

      {(lueckenText || coachingBlock) && (
        // Ein zusammenhängendes Coaching in EINER Box (.coaching-box in
        // globals.css): zuerst der Lücken-Baustein (wen erreiche ich, reagieren
        // sie), dann das Affinitäts-Coaching (welche Themen). Der Brücken-
        // Themen-Link rendert CoachingParagraphs am Ende. Nutzt jetzt die
        // zentrale .coaching-box (weiß + Camel-Streifen).
        <div className="coaching-box mt-3 space-y-4">
          {lueckenText && (
            <div>
              <p className="text-sm font-semibold">
                Was die Zahlen sagen
              </p>
              <p className="mt-1 leading-relaxed">
                {renderWithBold(lueckenText)}
              </p>
            </div>
          )}
          {coachingBlock && (
            <div>
              <p className="text-sm font-semibold">
                Worauf du setzen kannst
              </p>
              <div className="mt-1">
                <CoachingParagraphs block={coachingBlock} />
              </div>
            </div>
          )}
        </div>
      )}
      {!coachingBlock && snapshots.length === 0 && (
        <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
          Lade dein Zielgruppe-CSV unter Analytics hoch, dann bekommst du hier
          konkrete Themen-Empfehlungen.
        </p>
      )}

      {/* Links untereinander, außerhalb der Box. Pfeil → bleibt außerhalb des
          verlinkten Bereichs — nur das Wort ist klickbar. */}
      <p className="mt-2 flex flex-col gap-1 text-sm">
        <span>
          →{' '}
          <Link
            href="/dashboard/analytics?tab=audience"
            className="font-medium text-link underline underline-offset-2 hover:opacity-80"
          >
            Zu deinen Zielgruppen-Zahlen
          </Link>
        </span>
        <span>
          →{' '}
          <Link
            href="/dashboard/strategie?tab=audience"
            className="font-medium text-link underline underline-offset-2 hover:opacity-80"
          >
            Mehr über Zielgruppen lernen
          </Link>
        </span>
      </p>
    </section>
  )
}
