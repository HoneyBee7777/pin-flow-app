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

// V3.0.8 — die angezeigte Zielgruppen-Größe kommt aus den Performance-Daten
// („Interagierende Zielgruppe"), nicht mehr aus der gerundeten CSV-Audience-
// Size (die war ein irreführender Platzhalter, z. B. „10.000" für < 10k).
export type EngagedAudience = {
  // Tatsächliche interagierende Personen aus der Performance-Übersicht.
  value: number
  // Ende des Performance-Zeitraums (letztes Analytics-Update).
  dateIso: string
  // Prozentuales Wachstum zur Vorperiode (bereits in %, z. B. 128.6).
  growthPct: number | null
  // Absolutwert der Vorperiode, für „(84 Personen)" im Trend-Text.
  previousValue: number | null
}

function formatGrowthPercent(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')} %`
}

export function AudienceSizeBlock({
  engaged,
}: {
  engaged: EngagedAudience | null
}) {
  if (!engaged) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm font-medium text-gray-500">
          Deine interagierende Zielgruppe
        </p>
        <p className="mt-1 text-3xl font-bold text-gray-400">—</p>
        <p className="mt-1 text-sm text-gray-500">
          Noch kein Analytics-Update mit Performance-Daten erfasst.
        </p>
      </div>
    )
  }

  const showTrend =
    engaged.growthPct !== null && Number.isFinite(engaged.growthPct)
  const up = showTrend && (engaged.growthPct as number) > 0
  const down = showTrend && (engaged.growthPct as number) < 0
  const sign = up ? '+' : down ? '−' : ''
  const arrow = up ? '↑' : down ? '↓' : '·'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">
        Deine interagierende Zielgruppe
      </p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {formatCount(engaged.value)} Personen
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Stand: {formatDateDe(engaged.dateIso)} (letztes Analytics-Update)
      </p>
      {showTrend && (
        <p
          className={`mt-2 text-sm font-medium ${
            up ? 'text-green-700' : down ? 'text-red-700' : 'text-gray-600'
          }`}
        >
          {arrow} {sign}
          {formatGrowthPercent(Math.abs(engaged.growthPct as number))} zur
          Vorperiode
          {engaged.previousValue !== null && (
            <> ({formatCount(engaged.previousValue)} Personen)</>
          )}
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
