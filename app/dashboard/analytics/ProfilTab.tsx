'use client'

import { useMemo, useTransition } from 'react'
import { deleteProfilAnalytics } from './actions'
import {
  calcCtr,
  calcEngagement,
  calcGrowth,
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
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
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
      engagement: calcEngagement(kl, sv, imp),
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
      <p style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
        Die Gesamt-Performance zeigt alle deine Pins zusammen, so wie
        Pinterest sie ausweist.
      </p>

      <KpiSection
        compact
        title="Seit Pin-Start"
        zeitraum={
          gesamtAggregate
            ? `Alle Zeiträume seit ${formatDateDe(gesamtAggregate.startDatum)} (${gesamtAggregate.anzahlZeitraeume} Eintrag${gesamtAggregate.anzahlZeitraeume === 1 ? '' : 'e'})`
            : null
        }
        zeitraumLabel=""
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
                  label: 'Ø Engagement Rate',
                  value: formatPercent(gesamtAggregate.engagement),
                },
              ]
            : null
        }
        emptyText="Noch keine Einträge erfasst."
      />

      <HistoryTable
        rows={profilAnalytics}
        onDelete={onDelete}
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
  zeitraumLabel,
  zeitraumExtra,
  kpis,
  emptyText,
  compact = false,
}: {
  title: string
  zeitraum: string | null
  zeitraumLabel: string
  zeitraumExtra?: string | null
  kpis: Kpi[] | null
  emptyText: string
  compact?: boolean
}) {
  const sectionPad = compact ? 'px-6 py-3' : 'p-6'
  const gridMt = compact ? 'mt-2' : 'mt-4'
  const labelStyle = compact ? { fontSize: '10px' } : undefined
  const valueStyle = compact ? { fontSize: '20px' } : undefined
  const footerMt = compact ? 'mt-2' : 'mt-4'
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${sectionPad}`}
    >
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {kpis ? (
        <>
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
          {zeitraum && (
            <div className={`${footerMt} space-y-0.5`}>
              <p className="text-xs text-gray-500">
                {zeitraumLabel ? `${zeitraumLabel}: ` : ''}
                {zeitraum}
              </p>
              {zeitraumExtra && (
                <p className="text-xs text-gray-500">{zeitraumExtra}</p>
              )}
            </div>
          )}
        </>
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
  deleteDisabled,
}: {
  rows: ProfilAnalyticsWithGrowth[]
  onDelete: (id: string) => void
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
            <Th>Zeitraum</Th>
            <Th>Tage</Th>
            <Th>Impressionen</Th>
            <Th>Ausg. Klicks</Th>
            <Th>Saves</Th>
            <Th>CTR</Th>
            <Th>Engagement</Th>
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
            return (
              <tr key={row.id} className="align-top hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {formatZeitraumKurz(eff.von, eff.bis)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
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
                  value={formatPercent(row.engagement)}
                  growth={row.engagement_growth}
                />
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
            )
          })}
        </tbody>
      </table>
    </div>
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
