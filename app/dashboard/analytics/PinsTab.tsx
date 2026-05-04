'use client'

import Link from 'next/link'
import {
  Fragment,
  useMemo,
  useState,
  useTransition,
} from 'react'
import {
  deletePinAnalytics,
  type UnmatchedPin,
} from './actions'
import SharedSortableTh from '@/components/SortableTh'
import UnmatchedPinsSection from './UnmatchedPinsSection'
import {
  calcCtr,
  diffDays,
  effectiveZeitraum,
  formatNumber,
  formatPercent,
  formatZahl,
  formatZeitraumKurz,
  PIN_DIAGNOSE_BADGE,
  PIN_DIAGNOSE_LABEL,
  PIN_HANDLUNG,
  type PinAnalyticsRow,
  type PinAnalyticsThresholds,
  type PinDiagnose,
  type PinOption,
} from './utils'

// Aggregate-Diagnose über alle Perioden eines Pins. Anders als die
// row-basierte diagnosePin() schaut diese Funktion auf die kumulierten
// Werte und die Anzahl der erfassten Perioden — so bekommen junge Pins
// mit nur einer Periode nicht voreilig „Kein Signal" verpasst.
function aggregateDiagnose(opts: {
  perioden: number
  cumKlicks: number
  cumImpressionen: number
  avgCtr: number | null
  pinAlterTage: number
  hatDatum: boolean
  fallback: PinDiagnose
  thresholds: PinAnalyticsThresholds
}): PinDiagnose {
  if (!opts.hatDatum) return 'evergreen'

  const ctr = opts.avgCtr ?? 0

  // Starkes positives Signal — schlägt alles andere.
  if (ctr > 3 && opts.cumKlicks > 10) return 'aktiver_top_performer'

  // Hidden Gem: gute CTR bei niedrigen Impressionen.
  if (ctr > 2 && opts.cumImpressionen < opts.thresholds.mindestImpressionen)
    return 'hidden_gem'

  // „Kein Signal → Thema prüfen" nur wenn echte Datengrundlage vorhanden:
  // mindestens 2 Perioden UND in keiner gab es Klicks.
  if (opts.perioden >= 2 && opts.cumKlicks === 0)
    return 'kein_signal_thema_pruefen'

  // Frühe Phase — nur 1 Periode UND Pin jünger als 60 Tage. Daten sind
  // zu dünn für ein finales Urteil → erstmal beobachten.
  if (opts.perioden <= 1 && opts.pinAlterTage < 60) return 'beobachten'

  // Sonst: bisherige row-basierte Diagnose des neuesten Eintrags.
  return opts.fallback
}

export default function PinsTab({
  pinAnalytics,
  pins,
  thresholds,
  unmatchedPins,
  unmatchedZeitraumVon,
  unmatchedZeitraumBis,
  onUnmatchedPinResolved,
}: {
  pinAnalytics: PinAnalyticsRow[]
  // Wird nur an UnmatchedPinsSection durchgereicht (Pin-Auswahl beim
  // Zuordnen) — die Pin-Tabelle selbst nutzt pinAnalytics.pin.
  pins: PinOption[]
  thresholds: PinAnalyticsThresholds
  unmatchedPins: UnmatchedPin[]
  unmatchedZeitraumVon: string
  unmatchedZeitraumBis: string
  onUnmatchedPinResolved: (pinterestPinId: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  // pinAnalytics ist DESC nach datum sortiert. Pro pin_id alle Zeiträume
  // sammeln und kumulierte Kennzahlen berechnen — die Hauptzeile zeigt
  // Summen, die aufgeklappte Zeitreihe die einzelnen Einträge.
  const aggregatedPins = useMemo<AggregatedPin[]>(() => {
    const seen = new Set<string>()
    const order: string[] = []
    const historyMap = new Map<string, PinAnalyticsRow[]>()
    for (const row of pinAnalytics) {
      if (!seen.has(row.pin_id)) {
        seen.add(row.pin_id)
        order.push(row.pin_id)
      }
      const arr = historyMap.get(row.pin_id) ?? []
      arr.push(row)
      historyMap.set(row.pin_id, arr)
    }
    return order.map((pinId) => {
      const rows = historyMap.get(pinId) ?? []
      let cumKlicks = 0
      let cumImpressionen = 0
      let cumSaves = 0
      for (const r of rows) {
        cumKlicks += r.klicks
        cumImpressionen += r.impressionen
        cumSaves += r.saves
      }
      const latest = rows[0]
      const avgCtr = calcCtr(cumKlicks, cumImpressionen)
      const perioden = rows.length
      const diagnose = aggregateDiagnose({
        perioden,
        cumKlicks,
        cumImpressionen,
        avgCtr,
        pinAlterTage: latest.alter_tage,
        hatDatum: !!latest.pin?.geplante_veroeffentlichung,
        fallback: latest.diagnose,
        thresholds,
      })
      return {
        pinId,
        latest,
        history: rows,
        cumKlicks,
        cumImpressionen,
        cumSaves,
        avgCtr,
        perioden,
        diagnose,
        handlung: PIN_HANDLUNG[diagnose],
      }
    })
  }, [pinAnalytics, thresholds])

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deletePinAnalytics(fd)
    })
  }

  return (
    <div className="space-y-6">
      <p style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
        Tracke deine wichtigsten Pins einzeln — nicht alle, nur die strategisch
        relevanten Top 15–20.
      </p>

      <UnmatchedPinsSection
        unmatchedPins={unmatchedPins}
        pins={pins}
        zeitraumVon={unmatchedZeitraumVon}
        zeitraumBis={unmatchedZeitraumBis}
        onAssigned={onUnmatchedPinResolved}
        onSkipped={onUnmatchedPinResolved}
      />

      <PinAnalyticsTable
        rows={aggregatedPins}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />

      <ThresholdInfo thresholds={thresholds} />
    </div>
  )
}

// ===========================================================
// Tabelle
// ===========================================================
type AggregatedPin = {
  pinId: string
  latest: PinAnalyticsRow
  history: PinAnalyticsRow[]
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  avgCtr: number | null
  perioden: number
  diagnose: PinDiagnose
  handlung: string
}

type SortKey =
  | 'titel'
  | 'cumKlicks'
  | 'cumImpressionen'
  | 'cumSaves'
  | 'avgCtr'
  | 'diagnose'
  | 'handlung'
  | 'perioden'
type SortDir = 'asc' | 'desc'

function compareAggregated(
  a: AggregatedPin,
  b: AggregatedPin,
  key: SortKey,
  dir: SortDir
): number {
  const sign = dir === 'asc' ? 1 : -1
  let res = 0
  switch (key) {
    case 'titel':
      res = (a.latest.pin?.titel ?? '').localeCompare(
        b.latest.pin?.titel ?? '',
        'de'
      )
      break
    case 'cumKlicks':
      res = a.cumKlicks - b.cumKlicks
      break
    case 'cumImpressionen':
      res = a.cumImpressionen - b.cumImpressionen
      break
    case 'cumSaves':
      res = a.cumSaves - b.cumSaves
      break
    case 'avgCtr':
      res = (a.avgCtr ?? -Infinity) - (b.avgCtr ?? -Infinity)
      break
    case 'diagnose':
      res = PIN_DIAGNOSE_LABEL[a.diagnose].localeCompare(
        PIN_DIAGNOSE_LABEL[b.diagnose],
        'de'
      )
      break
    case 'handlung':
      res = a.handlung.localeCompare(b.handlung, 'de')
      break
    case 'perioden':
      res = a.perioden - b.perioden
      break
  }
  return res * sign
}

function PinAnalyticsTable({
  rows,
  onDelete,
  deleteDisabled,
}: {
  rows: AggregatedPin[]
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('cumKlicks')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareAggregated(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function toggleExpand(pinId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(pinId)) next.delete(pinId)
      else next.add(pinId)
      return next
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Pin-Analytics gespeichert. Lade deine ersten CSVs im
        Eingabe-Tab hoch.
      </div>
    )
  }

  return (
    <div className="max-h-[800px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            <Th>
              <span className="sr-only">Aufklappen</span>
            </Th>
            <SortableTh
              sortKey="titel"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Pin-Titel
            </SortableTh>
            <SortableTh
              sortKey="cumKlicks"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Klicks ∑
            </SortableTh>
            <SortableTh
              sortKey="cumImpressionen"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Imp ∑
            </SortableTh>
            <SortableTh
              sortKey="cumSaves"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Saves ∑
            </SortableTh>
            <SortableTh
              sortKey="avgCtr"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Ø CTR
            </SortableTh>
            <SortableTh
              sortKey="diagnose"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Diagnose
            </SortableTh>
            <SortableTh
              sortKey="handlung"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Handlung
            </SortableTh>
            <SortableTh
              sortKey="perioden"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Perioden
            </SortableTh>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedRows.map((agg) => {
            const row = agg.latest
            const isOpen = expanded.has(agg.pinId)
            const hasPeriods = agg.perioden > 0
            return (
              <Fragment key={agg.pinId}>
                <tr className="align-top hover:bg-gray-50">
                  <td className="whitespace-nowrap px-2 py-3 text-sm">
                    {hasPeriods ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(agg.pinId)}
                        className="inline-flex h-5 w-5 items-center justify-center text-xs text-gray-500 hover:text-gray-900"
                        aria-label={
                          isOpen
                            ? 'Zeitreihe einklappen'
                            : 'Zeitreihe ausklappen'
                        }
                        title={isOpen ? 'Einklappen' : 'Zeitreihe anzeigen'}
                      >
                        {isOpen ? '▼' : '▶'}
                      </button>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm font-medium text-gray-900">
                    {row.pin ? (
                      row.pin.titel ?? (
                        <span className="text-gray-500">(ohne Titel)</span>
                      )
                    ) : (
                      <span className="text-gray-400">— gelöschter Pin —</span>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    title={formatNumber(agg.cumKlicks)}
                  >
                    {hasPeriods ? formatZahl(agg.cumKlicks) : '—'}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    title={formatNumber(agg.cumImpressionen)}
                  >
                    {hasPeriods ? formatZahl(agg.cumImpressionen) : '—'}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    title={formatNumber(agg.cumSaves)}
                  >
                    {hasPeriods ? formatZahl(agg.cumSaves) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {hasPeriods ? formatPercent(agg.avgCtr) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PIN_DIAGNOSE_BADGE[agg.diagnose]}`}
                    >
                      {PIN_DIAGNOSE_LABEL[agg.diagnose]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">
                    {agg.handlung}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {hasPeriods ? agg.perioden : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      disabled={deleteDisabled}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
                {hasPeriods && isOpen && (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-4 py-3">
                      <PinTimeline history={agg.history} pin={row.pin} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Aufklappbare Zeitreihe pro Pin — neueste Periode oben. Pro Spalte ein
// inline-Delta vs. der älteren Periode in derselben Zeile (außer älteste
// Zeile, die hat keinen Vergleichspunkt).
function PinTimeline({
  history,
  pin,
}: {
  history: PinAnalyticsRow[]
  pin: PinOption | null
}) {
  if (history.length === 0) {
    return (
      <div className="ml-6 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
        Noch keine Daten — füge beim nächsten Update neue Werte hinzu.
      </div>
    )
  }
  const refDate =
    pin?.geplante_veroeffentlichung ??
    (pin?.created_at ? pin.created_at.slice(0, 10) : null)
  return (
    <div className="ml-6 overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Zeitraum
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Imp
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Klicks
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Saves
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              CTR
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Alter
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((row, i) => {
            const eff = effectiveZeitraum(row)
            const prev = history[i + 1]
            const ctr = calcCtr(row.klicks, row.impressionen)
            const prevCtr = prev ? calcCtr(prev.klicks, prev.impressionen) : null
            const alterAmEnde = refDate
              ? Math.max(0, diffDays(refDate, eff.bis))
              : null
            return (
              <tr key={row.id} className="text-gray-700">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                  {formatZeitraumKurz(eff.von, eff.bis)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta
                    value={row.impressionen}
                    prev={prev?.impressionen}
                    format="zahl"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta
                    value={row.klicks}
                    prev={prev?.klicks}
                    format="zahl"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta
                    value={row.saves}
                    prev={prev?.saves}
                    format="zahl"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta value={ctr} prev={prevCtr} format="percent" />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {alterAmEnde !== null
                    ? `${alterAmEnde} ${alterAmEnde === 1 ? 'Tag' : 'Tage'}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function InlineMetricDelta({
  value,
  prev,
  format,
}: {
  value: number | null
  prev: number | null | undefined
  format: 'zahl' | 'percent'
}) {
  const formatted =
    format === 'percent'
      ? formatPercent(value)
      : value === null
        ? '—'
        : formatZahl(value)
  const title = format === 'zahl' && value !== null ? formatNumber(value) : undefined
  let growth: number | null = null
  if (value !== null && prev !== null && prev !== undefined) {
    if (prev === 0) {
      growth = value > 0 ? Number.POSITIVE_INFINITY : 0
    } else {
      growth = ((value - prev) / prev) * 100
    }
  }
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-medium text-gray-900" title={title}>
        {formatted}
      </span>
      {growth !== null && <DeltaInline value={growth} />}
    </span>
  )
}

function DeltaInline({ value }: { value: number }) {
  if (value === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="text-[11px] font-medium text-green-600"
        title="Aus Null heraus gestiegen"
      >
        ↑ neu
      </span>
    )
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return (
      <span className="text-[11px] font-medium text-red-600" title="Rückgang">
        ↓
      </span>
    )
  }
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) {
    return <span className="text-[11px] font-medium text-gray-500">± 0%</span>
  }
  const positive = rounded > 0
  const sign = positive ? '+' : ''
  const display = rounded.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
  return (
    <span
      className={`text-[11px] font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}
    >
      {positive ? '↑' : '↓'}
      {sign}
      {display}%
    </span>
  )
}

function SortableTh({
  sortKey: key,
  current,
  dir,
  onSort,
  children,
}: {
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  children: React.ReactNode
}) {
  const activeDir = current === key ? dir : null
  return (
    <SharedSortableTh dir={activeDir} onClick={() => onSort(key)}>
      {children}
    </SharedSortableTh>
  )
}

// ===========================================================
// Schwellwert-Info
// ===========================================================
function ThresholdInfo({
  thresholds,
}: {
  thresholds: PinAnalyticsThresholds
}) {
  return (
    <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
      <summary className="cursor-pointer text-sm font-medium text-gray-900">
        Aktuelle Diagnose-Schwellwerte
      </summary>
      <ul className="mt-2 space-y-1">
        <li>
          Beobachtungszeitraum:{' '}
          <strong>{thresholds.beobachtungszeitraum} Tage</strong> — Pins jünger
          als das gelten als „Noch zu früh"
        </li>
        <li>
          Mindest-Klicks: <strong>{thresholds.mindestKlicks}</strong> —
          Top-Performer ab dieser Schwelle
        </li>
        <li>
          Mindest-Alter: <strong>{thresholds.mindestAlter} Tage</strong> — ab
          hier zählt ein Pin als „eingeschlafener Gewinner" oder „kein Signal"
        </li>
        <li>
          Mindest-CTR: <strong>{thresholds.mindestCtr}%</strong> — über dem
          Wert gilt die CTR als gut
        </li>
        <li>
          Mindest-Impressionen:{' '}
          <strong>{thresholds.mindestImpressionen}</strong> — ab hier zählt
          ein Pin als „groß genug" für Hook-Optimierung
        </li>
      </ul>
      <p className="mt-2 text-xs text-gray-500">
        Werte anpassen in den{' '}
        <Link
          href="/dashboard/einstellungen"
          className="font-medium text-red-600 hover:underline"
        >
          Einstellungen
        </Link>
        .
      </p>
    </details>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}
    >
      {children}
    </th>
  )
}
