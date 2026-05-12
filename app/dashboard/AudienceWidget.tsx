'use client'

import Link from 'next/link'
import {
  germanCategoryName,
  slugifyCategory,
} from '@/lib/audience-translations'
import type { AudienceSnapshot } from '@/lib/audience-types'

// V3.0 Phase 2d — Dashboard-Widget. Sitzt direkt unter der Account-Diagnose
// und zeigt eine prägnante Zusammenfassung des neuesten Audience-Snapshots:
//
//   – Audience-Größe + (wenn Vormonat verfügbar) Trend-Pille
//   – Top-3-Affinitäten als klickbare Pillen
//   – Link zum vollständigen Analytics-Tab „Audience"
//
// Drei Zustände:
//   – Leer (kein Snapshot)       → Empty-State mit Eingabe-Tab-Link
//   – Snapshot älter als 35 Tage → Warnhinweis + Daten trotzdem anzeigen
//   – Frischer Snapshot          → Daten + Trend
//
// Pillen-Klick führt zur Interessen-Tabelle und scrollt zum passenden
// Eintrag (Hash `#interest-<slug>` wird vom AudienceTab beim Mount
// behandelt).

const STRONG_AFFINITY_THRESHOLD = 1.5
const TREND_STABILITY = 0.005
const STALE_DAYS_THRESHOLD = 35

function formatCount(n: number): string {
  return n.toLocaleString('de-DE')
}

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1).replace('.', ',')} %`
}

function formatAffinity(a: number): string {
  return a.toFixed(2).replace('.', ',')
}

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// Tage zwischen zwei YYYY-MM-DD-Strings, ohne Zeitzonen-Drift.
function daysSinceIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const past = Date.UTC(y, (m ?? 1) - 1, d ?? 1)
  const now = new Date()
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return Math.max(0, Math.round((today - past) / 86_400_000))
}

export default function AudienceWidget({
  snapshots,
}: {
  // DESC nach Datum aus `getAudienceSnapshots()`. Leeres Array → Empty-State.
  snapshots: AudienceSnapshot[]
}) {
  if (snapshots.length === 0) {
    return <AudienceWidgetEmpty />
  }
  return <AudienceWidgetBody snapshots={snapshots} />
}

function AudienceWidgetEmpty() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">
        Deine Zielgruppe
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Noch keine Zielgruppe-Daten importiert.
      </p>
      <p className="mt-3 text-sm">
        →{' '}
        <Link
          href="/dashboard/analytics?tab=eingabe"
          className="font-medium text-red-600 hover:underline"
        >
          Importiere deine erste CSV im Eingabe-Tab
        </Link>
      </p>
    </section>
  )
}

function AudienceWidgetBody({
  snapshots,
}: {
  snapshots: AudienceSnapshot[]
}) {
  const latest = snapshots[0]
  const previous = snapshots[1] ?? null
  const stale = daysSinceIso(latest.audienceDate)

  const topAffinities = latest.data.interests
    .filter((c) => c.affinity >= STRONG_AFFINITY_THRESHOLD)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 3)

  const trend = computeTrend(latest, previous)

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">
          Deine Zielgruppe
        </h3>
        <span className="text-xs text-gray-500">
          Stand: {formatDateDe(latest.audienceDate)}
        </span>
      </header>

      {stale > STALE_DAYS_THRESHOLD && (
        <p className="mt-3 rounded-md border border-amber-200 border-l-[3px] border-l-amber-400 bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ Dein Zielgruppe-Snapshot ist {stale} Tage alt. Empfohlen: 1× pro
          Monat neu importieren.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-bold text-gray-900">
          {formatCount(latest.audienceSize)}{' '}
          <span className="text-sm font-medium text-gray-500">Personen</span>
        </p>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.kind === 'up'
                ? 'text-green-700'
                : trend.kind === 'down'
                  ? 'text-red-700'
                  : 'text-gray-600'
            }`}
          >
            {trend.text}
          </span>
        )}
      </div>

      {topAffinities.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">
            Top-Affinitäten (überdurchschnittliches Interesse):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topAffinities.map((c) => (
              <Link
                key={c.category}
                href={`/dashboard/analytics?tab=audience#interest-${slugifyCategory(c.category)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-900 hover:bg-green-100"
                title={`Affinitäts-Index ${formatAffinity(c.affinity)}`}
              >
                <span aria-hidden>🟢</span>
                {germanCategoryName(c.category)}
                <span className="tabular-nums text-green-700">
                  {formatAffinity(c.affinity)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          Keine Kategorie mit stark überdurchschnittlicher Affinität — deine
          Zielgruppen-Interessen verteilen sich breit.
        </p>
      )}

      <p className="mt-4 text-sm">
        →{' '}
        <Link
          href="/dashboard/analytics?tab=audience"
          className="font-medium text-red-600 hover:underline"
        >
          Vollständige Analyse
        </Link>
      </p>
    </section>
  )
}

type TrendInfo = { kind: 'up' | 'down' | 'flat'; text: string }

function computeTrend(
  current: AudienceSnapshot,
  previous: AudienceSnapshot | null
): TrendInfo | null {
  if (!previous || previous.audienceSize <= 0) return null
  const delta = current.audienceSize - previous.audienceSize
  const relative = delta / previous.audienceSize
  if (Math.abs(relative) < TREND_STABILITY) {
    return { kind: 'flat', text: '· stabil zum Vormonat' }
  }
  const sign = delta > 0 ? '+' : '−'
  const absPct = formatPercent(Math.abs(relative))
  return {
    kind: delta > 0 ? 'up' : 'down',
    text:
      delta > 0
        ? `↑ ${sign}${absPct} zum Vormonat`
        : `↓ ${sign}${absPct} zum Vormonat`,
  }
}
