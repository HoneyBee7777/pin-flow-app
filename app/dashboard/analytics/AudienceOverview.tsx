'use client'

import type {
  AudienceAgeBucket,
  AudienceSnapshot,
} from '@/lib/audience-types'

// V3.0 — Sektionen B und (verschoben) B' des Audience-Tabs.
// V3.0.1: in zwei eigenständige Komponenten zerlegt, damit der Coaching-Block
// dazwischen passt:
//   – `AudienceSizeBlock`     → Audience-Größe + Trend (prominenter Top-Block)
//   – `AudienceDemographics`  → Vier-Block-Grid (Gender / Alter / Länder / Devices)

function formatCount(n: number): string {
  return n.toLocaleString('de-DE')
}

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1).replace('.', ',')} %`
}

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// Trend-Schwelle ≙ V3.0-Heuristik-Schwelle: < 0,5 % gilt als „stabil".
const TREND_STABILITY = 0.005

// Englische Pinterest-Labels → deutscher Anzeigetext fürs Gender-Block.
// V3.0.3: „Unspecified & custom" und „Custom" zusätzlich gemappt — Pinterest
// liefert je nach Audience-Größe verschiedene Schreibweisen aus, die alle
// gleichbedeutend „nicht klar zugeordnete Personen" meinen.
function germanGenderLabel(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'female') return 'Weiblich'
  if (lower === 'male') return 'Männlich'
  if (lower === 'unspecified & custom') return 'Nicht angegeben & andere'
  if (lower === 'unspecified') return 'Nicht angegeben'
  if (lower === 'custom') return 'Andere'
  return name
}

// Helper: sortiere ein Breakdown- (oder Ages-) Array absteigend nach percent.
function sortByPercentDesc<T extends { percent: number }>(
  items: ReadonlyArray<T>,
  getPercent?: (t: T) => number
): T[] {
  const acc = getPercent ?? ((t: T) => t.percent)
  return items.slice().sort((a, b) => acc(b) - acc(a))
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
    return { kind: 'flat', text: 'Audience-Größe ist zum Vormonat stabil.' }
  }
  const sign = delta > 0 ? '+' : '−'
  const absCount = formatCount(Math.abs(delta))
  const absPct = formatPercent(Math.abs(relative))
  return {
    kind: delta > 0 ? 'up' : 'down',
    text:
      delta > 0
        ? `↑ ${sign}${absCount} Personen seit Vormonat (+${absPct})`
        : `↓ ${sign}${absCount} Personen seit Vormonat (−${absPct})`,
  }
}

export function AudienceSizeBlock({
  snapshot,
  previousSnapshot,
}: {
  snapshot: AudienceSnapshot
  previousSnapshot: AudienceSnapshot | null
}) {
  const trend = computeTrend(snapshot, previousSnapshot)
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">Deine Zielgruppe</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {formatCount(snapshot.audienceSize)} Personen
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Stand: {formatDateDe(snapshot.audienceDate)} (Monatswert)
      </p>
      {trend && (
        <p
          className={`mt-2 text-sm font-medium ${
            trend.kind === 'up'
              ? 'text-green-700'
              : trend.kind === 'down'
                ? 'text-red-700'
                : 'text-gray-600'
          }`}
        >
          {trend.text}
        </p>
      )}
    </div>
  )
}

export function AudienceDemographics({
  snapshot,
}: {
  snapshot: AudienceSnapshot
}) {
  const sortedGender = sortByPercentDesc(snapshot.data.gender)
  const sortedAges = sortByPercentDesc<AudienceAgeBucket>(
    snapshot.data.ages,
    (a) => a.percent
  )
  const topCountries = sortByPercentDesc(snapshot.data.countries).slice(0, 5)
  const topDevices = sortByPercentDesc(snapshot.data.devices).slice(0, 3)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DemoBlock
        title="Geschlecht"
        items={sortedGender.map((g) => ({
          label: germanGenderLabel(g.name),
          percent: g.percent,
        }))}
      />
      <DemoBlock
        title="Alter"
        items={sortedAges.map((a) => ({
          label: a.range,
          percent: a.percent,
        }))}
      />
      <DemoBlock
        title="Top-5-Länder"
        items={topCountries.map((c) => ({
          label: c.name,
          percent: c.percent,
        }))}
      />
      <DemoBlock
        title="Top-3-Geräte"
        items={topDevices.map((d) => ({
          label: d.name,
          percent: d.percent,
        }))}
      />
    </div>
  )
}

function DemoBlock({
  title,
  items,
}: {
  title: string
  items: { label: string; percent: number }[]
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">Keine Daten</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-gray-900">
                {formatPercent(item.percent)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
