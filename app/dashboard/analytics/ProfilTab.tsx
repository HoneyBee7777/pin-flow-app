'use client'

import { useMemo, useTransition } from 'react'
import { deleteProfilAnalytics } from './actions'
import {
  calcCtr,
  calcGrowth,
  calcSaveRate,
  diffDays,
  effectiveZeitraum,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  formatZeitraumKurz,
  type ProfilAnalyticsWithGrowth,
} from './utils'

export default function ProfilTab({
  profilAnalytics,
  onEditEntry,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  // Wechselt zum Eingabe-Tab und befüllt das Profil-Formular mit diesem Eintrag.
  onEditEntry?: (entry: ProfilAnalyticsWithGrowth) => void
}) {
  const [isPending, startTransition] = useTransition()

  // „Seit Pin-Start": Summe ALLER Zeiträume (kein Jahresfilter).
  // CTR/ER als gewichteter Durchschnitt — sauberer als arithmetisches
  // Mittel über unterschiedlich große Zeiträume.
  const gesamtAggregate = useMemo(() => {
    if (profilAnalytics.length === 0) return null
    let imp = 0
    let kl = 0
    let sv = 0
    for (const r of profilAnalytics) {
      imp += r.impressionen
      kl += r.ausgehende_klicks
      sv += r.saves
    }
    const aeltester = profilAnalytics[profilAnalytics.length - 1]
    const startDatum = effectiveZeitraum(aeltester).von
    return {
      impressionen: imp,
      klicks: kl,
      saves: sv,
      ctr: calcCtr(kl, imp),
      saveRate: calcSaveRate(sv, imp),
      anzahlZeitraeume: profilAnalytics.length,
      startDatum,
    }
  }, [profilAnalytics])

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteProfilAnalytics(fd)
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700">
        Hier siehst du die Gesamt-Performance aller deiner Pins zusammen,
        aufsummiert über alle importierten Zeiträume.
        <br />
        Impressionen, ausgehende Klicks und Saves kommen direkt aus deinen
        Pinterest-Importen, die Klickrate und die Save-Rate berechnet Pin-Flow
        daraus.
        <br />
        Wie sich diese Werte über die Zeit entwickeln, siehst du in der Tabelle
        darunter, mit dem Vergleich zum jeweils vorigen Zeitraum.
      </p>

      <KpiSection
        compact
        title="Seit Pin-Start"
        zeitraum={
          gesamtAggregate
            ? `Alle Zeiträume seit ${formatDateDe(gesamtAggregate.startDatum)} (${gesamtAggregate.anzahlZeitraeume} Eintrag${gesamtAggregate.anzahlZeitraeume === 1 ? '' : 'e'})`
            : null
        }
        kpis={
          gesamtAggregate
            ? [
                {
                  label: 'Impressionen',
                  value: formatZahl(gesamtAggregate.impressionen),
                  title: formatNumber(gesamtAggregate.impressionen),
                },
                {
                  label: 'Ausgehende Klicks',
                  value: formatZahl(gesamtAggregate.klicks),
                  title: formatNumber(gesamtAggregate.klicks),
                },
                {
                  label: 'Saves',
                  value: formatZahl(gesamtAggregate.saves),
                  title: formatNumber(gesamtAggregate.saves),
                },
                { label: 'Ø CTR', value: formatPercent(gesamtAggregate.ctr) },
                {
                  label: 'Ø Save-Rate',
                  value: formatPercent(gesamtAggregate.saveRate),
                },
              ]
            : null
        }
        emptyText="Noch keine Einträge erfasst."
      />

      <HistoryTable
        rows={profilAnalytics}
        onDelete={onDelete}
        onEditEntry={onEditEntry}
        deleteDisabled={isPending}
      />
    </div>
  )
}

// ===========================================================
// KPI-Sektion
// ===========================================================
type Kpi = {
  label: string
  value: string
  title?: string
  growth?: number | null
}

function KpiSection({
  title,
  zeitraum,
  kpis,
  emptyText,
  compact = false,
}: {
  title: string
  zeitraum: string | null
  kpis: Kpi[] | null
  emptyText: string
  compact?: boolean
}) {
  const sectionPad = compact ? 'px-6 py-3' : 'p-6'
  const gridMt = compact ? 'mt-2' : 'mt-4'
  const labelStyle = compact ? { fontSize: '10px' } : undefined
  const valueStyle = compact ? { fontSize: '20px' } : undefined
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${sectionPad}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {zeitraum && (
          <span className="text-xs font-normal text-gray-500">{zeitraum}</span>
        )}
      </div>
      {kpis ? (
        <div className={`${gridMt} grid grid-cols-2 gap-4 md:grid-cols-5`}>
          {kpis.map((k) => (
            <div key={k.label}>
              <p
                className="text-xs font-medium uppercase tracking-wide text-gray-500"
                style={labelStyle}
              >
                {k.label}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <p
                  className="text-xl font-semibold text-gray-900"
                  style={valueStyle}
                  title={k.title}
                >
                  {k.value}
                </p>
                {k.growth !== undefined && k.growth !== null && (
                  <GrowthInline value={k.growth} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
      )}
    </section>
  )
}

function GrowthInline({ value }: { value: number }) {
  if (value === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="text-xs font-medium text-green-700"
        title="Aus Null heraus gestiegen"
      >
        ↑ neu
      </span>
    )
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return (
      <span className="text-xs font-medium text-red-700" title="Rückgang">
        ↓
      </span>
    )
  }
  if (!Number.isFinite(value) || value === 0) {
    return <span className="text-xs text-gray-500">± 0%</span>
  }
  const positive = value > 0
  const sign = positive ? '+' : ''
  const rounded = Math.round(value)
  return (
    <span
      className={`text-xs font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}
    >
      {positive ? '↑' : '↓'} {sign}
      {rounded}%
    </span>
  )
}

// ===========================================================
// Verlaufs-Tabelle (read-only — Bearbeiten/Eintragen lebt im Eingabe-Tab)
// ===========================================================
function HistoryTable({
  rows,
  onDelete,
  onEditEntry,
  deleteDisabled,
}: {
  rows: ProfilAnalyticsWithGrowth[]
  onDelete: (id: string) => void
  onEditEntry?: (entry: ProfilAnalyticsWithGrowth) => void
  deleteDisabled: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Profil-Analytics gespeichert. Trage deinen ersten Zeitraum
        im Eingabe-Tab ein.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th className="px-2">Zeitraum</Th>
            <Th className="px-2">Tage</Th>
            <Th>Impressionen</Th>
            <Th>Ausg. Klicks</Th>
            <Th>Saves</Th>
            <Th>CTR</Th>
            <Th>Save-Rate</Th>
            <Th>Gesamte Zielgruppe</Th>
            <Th>Interagierende Zielgruppe</Th>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => {
            const eff = effectiveZeitraum(row)
            const tage = diffDays(eff.von, eff.bis) + 1
            const prev = rows[i + 1]
            const prevEff = prev ? effectiveZeitraum(prev) : null
            const prevTage = prevEff
              ? diffDays(prevEff.von, prevEff.bis) + 1
              : 0
            const perDay =
              tage > 0
                ? {
                    imp: row.impressionen / tage,
                    klicks: row.ausgehende_klicks / tage,
                    saves: row.saves / tage,
                  }
                : null
            const prevPerDay =
              prev && prevTage > 0
                ? {
                    imp: prev.impressionen / prevTage,
                    klicks: prev.ausgehende_klicks / prevTage,
                    saves: prev.saves / prevTage,
                  }
                : null
            const impGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.imp, prevPerDay.imp)
                : null
            const klicksGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.klicks, prevPerDay.klicks)
                : null
            const savesGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.saves, prevPerDay.saves)
                : null
            // Save-Rate + Delta auf der Roh-Rate (analog CTR), inline berechnet
            // — es gibt kein save_rate_growth in withGrowth (shared util bleibt).
            const saveRate = calcSaveRate(row.saves, row.impressionen)
            const prevSaveRate = prev
              ? calcSaveRate(prev.saves, prev.impressionen)
              : null
            const saveRateGrowth =
              saveRate !== null && prevSaveRate !== null
                ? calcGrowth(saveRate, prevSaveRate)
                : null
            return (
              <tr key={row.id} className="align-top hover:bg-gray-50">
                <td className="whitespace-nowrap px-2 py-3 text-sm font-medium text-gray-900">
                  {formatZeitraumKurz(eff.von, eff.bis)}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700">
                  {tage} T
                </td>
                <ValueCell
                  value={formatZahl(row.impressionen)}
                  title={formatNumber(row.impressionen)}
                  perDay={perDay ? formatPerDay(perDay.imp) : undefined}
                  growth={impGrowth}
                />
                <ValueCell
                  value={formatZahl(row.ausgehende_klicks)}
                  title={formatNumber(row.ausgehende_klicks)}
                  perDay={perDay ? formatPerDay(perDay.klicks) : undefined}
                  growth={klicksGrowth}
                />
                <ValueCell
                  value={formatZahl(row.saves)}
                  title={formatNumber(row.saves)}
                  perDay={perDay ? formatPerDay(perDay.saves) : undefined}
                  growth={savesGrowth}
                />
                <ValueCell
                  value={formatPercent(row.ctr)}
                  growth={row.ctr_growth}
                />
                <ValueCell
                  value={formatPercent(saveRate)}
                  growth={saveRateGrowth}
                />
                <ValueCell
                  value={
                    row.gesamte_zielgruppe > 0
                      ? formatZahl(row.gesamte_zielgruppe)
                      : '—'
                  }
                  title={
                    row.gesamte_zielgruppe > 0
                      ? formatNumber(row.gesamte_zielgruppe)
                      : undefined
                  }
                  growth={
                    row.gesamte_zielgruppe > 0 ? row.zielgruppe_growth : null
                  }
                />
                <ValueCell
                  value={
                    row.interagierende_zielgruppe > 0
                      ? formatZahl(row.interagierende_zielgruppe)
                      : '—'
                  }
                  title={
                    row.interagierende_zielgruppe > 0
                      ? formatNumber(row.interagierende_zielgruppe)
                      : undefined
                  }
                  growth={
                    row.interagierende_zielgruppe > 0
                      ? row.interagierend_growth
                      : null
                  }
                />
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    {onEditEntry && (
                      <button
                        type="button"
                        onClick={() => onEditEntry(row)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label="Bearbeiten"
                        title="Bearbeiten"
                      >
                        <PencilIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      disabled={deleteDisabled}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Identisch zum Bearbeiten-Icon der Pins-Datenbank
// (PinProduktionClient.tsx) — bewusst dasselbe SVG für App-Konsistenz.
function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path
        fillRule="evenodd"
        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Th({
  children,
  align = 'left',
  className = 'px-4',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  // Horizontal-Padding/Breite je Spalte überschreibbar (Default px-4).
  className?: string
}) {
  return (
    <th
      className={`${className} py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}
    >
      {children}
    </th>
  )
}

function ValueCell({
  value,
  title,
  perDay,
  growth,
}: {
  value: string
  title?: string
  perDay?: string
  growth?: number | null
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm">
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-medium text-gray-900" title={title}>
          {value}
        </span>
        {perDay && (
          <span className="text-[11px] text-gray-500">· {perDay}</span>
        )}
        {growth !== null && growth !== undefined && (
          <DeltaInCell value={growth} />
        )}
      </span>
    </td>
  )
}

function formatPerDay(perDay: number): string {
  if (!Number.isFinite(perDay)) return '—'
  const rounded = Math.round(perDay * 10) / 10
  const display = rounded.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
  return `${display}/T`
}

function DeltaInCell({ value }: { value: number }) {
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
