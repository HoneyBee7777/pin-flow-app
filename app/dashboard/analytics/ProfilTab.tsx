'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { deleteProfilAnalytics, saveProfilAnalytics } from './actions'
import {
  calcCtr,
  calcEngagement,
  calcUpdateStatus,
  firstOfCurrentMonthIso,
  formatDateDe,
  formatGrowth,
  formatMonthDe,
  formatNumber,
  formatPercent,
  formatZahl,
  type ProfilAnalyticsWithGrowth,
  type UpdateStatus,
} from './utils'

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

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

export default function ProfilTab({
  profilAnalytics,
  pinterestAnalyticsUrl,
  analyticsUpdateDatum,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pinterestAnalyticsUrl: string | null
  analyticsUpdateDatum: string | null
}) {
  const [datum, setDatum] = useState(firstOfCurrentMonthIso())
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [zielgruppe, setZielgruppe] = useState('')
  const [interagierend, setInteragierend] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  const impN = Number(impressionen) || 0
  const klicksN = Number(klicks) || 0
  const savesN = Number(saves) || 0
  const ctr = calcCtr(klicksN, impN)
  const engagement = calcEngagement(klicksN, savesN, impN)

  const existingForDate = useMemo(
    () => profilAnalytics.find((r) => r.datum === datum) ?? null,
    [profilAnalytics, datum]
  )

  const status = useMemo(
    () => calcUpdateStatus(analyticsUpdateDatum),
    [analyticsUpdateDatum]
  )

  const aktuellerStand = profilAnalytics[0] ?? null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveProfilAnalytics(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteProfilAnalytics(fd)
    })
  }

  function startEdit(row: ProfilAnalyticsWithGrowth) {
    setDatum(row.datum)
    setImpressionen(String(row.impressionen))
    setKlicks(String(row.ausgehende_klicks))
    setSaves(String(row.saves))
    setZielgruppe(String(row.gesamte_zielgruppe))
    setInteragierend(String(row.interagierende_zielgruppe))
    setFeedback({})
    if (typeof window !== 'undefined') {
      const el = document.getElementById('analytics-form')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <span className="font-medium">ℹ️ Hinweis:</span> Die Gesamt-Performance
        zeigt Daten für ALLE deine Pins zusammen — so wie Pinterest sie
        ausweist. In der Pin-Analytics trackst du gezielt deine Top-Pins
        einzeln, um zu sehen, welche performen und welche optimiert werden
        sollten. Beide Ansichten ergänzen sich.
      </div>

      {/* Top: Banner + CTA + Anleitung links, Status-Widget rechts */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span className="font-medium">⚠️ Wichtig:</span> Pinterest speichert
            Analytics nur 90 Tage. Trage deine Zahlen monatlich ein, damit keine
            Daten verloren gehen.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {pinterestAnalyticsUrl ? (
              <a
                href={pinterestAnalyticsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                📊 Pinterest Analytics öffnen ↗
              </a>
            ) : (
              <p className="text-xs text-gray-500">
                💡 Hinterlege in den Einstellungen einen Pinterest-Analytics-Link,
                um direkt dorthin zu springen.
              </p>
            )}
          </div>

          <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <summary className="cursor-pointer font-medium text-gray-900">
              So findest du deine Zahlen
            </summary>
            <p className="mt-2 text-gray-600">
              Pinterest öffnen → Profilbild oben rechts → Analytics → Übersicht
              → Zeitraum auf „Letzter Monat" setzen.
            </p>
          </details>
        </div>

        <UpdateStatusWidget status={status} />
      </div>

      {/* Eingabe-Bereich */}
      <form
        id="analytics-form"
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm scroll-mt-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Gesamt-Performance
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Prozentuale Veränderungen werden mit dem vorherigen Monat
            verglichen. Trage deine Zahlen monatlich ein, damit keine Daten
            verloren gehen — Pinterest speichert Analytics nur 90 Tage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Monat (Datum)" htmlFor="datum">
            <input
              id="datum"
              name="datum"
              type="date"
              required
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className={inputCls}
            />
            {existingForDate && (
              <p className="mt-1 text-xs text-amber-700">
                ⚠️ Eintrag für diesen Monat existiert bereits — wird
                überschrieben.
              </p>
            )}
          </Field>

          <Field label="Impressionen" htmlFor="impressionen">
            <input
              id="impressionen"
              name="impressionen"
              type="number"
              min={0}
              step={1}
              required
              value={impressionen}
              onChange={(e) => setImpressionen(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Ausgehende Klicks" htmlFor="ausgehende_klicks">
            <input
              id="ausgehende_klicks"
              name="ausgehende_klicks"
              type="number"
              min={0}
              step={1}
              required
              value={klicks}
              onChange={(e) => setKlicks(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Saves" htmlFor="saves">
            <input
              id="saves"
              name="saves"
              type="number"
              min={0}
              step={1}
              required
              value={saves}
              onChange={(e) => setSaves(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Gesamte Zielgruppe" htmlFor="gesamte_zielgruppe">
            <input
              id="gesamte_zielgruppe"
              name="gesamte_zielgruppe"
              type="number"
              min={0}
              step={1}
              required
              value={zielgruppe}
              onChange={(e) => setZielgruppe(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field
            label="Interagierende Zielgruppe"
            htmlFor="interagierende_zielgruppe"
          >
            <input
              id="interagierende_zielgruppe"
              name="interagierende_zielgruppe"
              type="number"
              min={0}
              step={1}
              required
              value={interagierend}
              onChange={(e) => setInteragierend(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <ComputedValue
            label="CTR"
            value={formatPercent(ctr)}
            hint="Klicks ÷ Impressionen"
          />
          <ComputedValue
            label="Engagement Rate"
            value={formatPercent(engagement)}
            hint="(Klicks + Saves) ÷ Impressionen"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Analytics speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>

      {/* Verlaufs-Tabelle */}
      <HistoryTable
        rows={profilAnalytics}
        onEdit={startEdit}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />

      {/* Aktueller Stand — letzter Eintrag */}
      {aktuellerStand && <AktuellerStandSection row={aktuellerStand} />}
    </div>
  )
}

// ===========================================================
// Update-Status-Widget
// ===========================================================
function UpdateStatusWidget({ status }: { status: UpdateStatus }) {
  const { lastUpdate, nextDue, isOverdue, daysSinceUpdate } = status

  return (
    <div
      className={`w-full shrink-0 rounded-lg border p-4 lg:w-72 ${
        isOverdue
          ? 'border-red-200 bg-red-50'
          : 'border-green-200 bg-green-50'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Update-Status
      </p>
      <p
        className={`mt-2 text-sm font-semibold ${
          isOverdue ? 'text-red-800' : 'text-green-800'
        }`}
      >
        {isOverdue ? '🔴 Überfällig' : '🟢 Aktualisiert'}
        {daysSinceUpdate !== null && (
          <span className="ml-1 font-normal">
            ({daysSinceUpdate === 0
              ? 'heute'
              : daysSinceUpdate === 1
                ? 'vor 1 Tag'
                : `vor ${daysSinceUpdate} Tagen`})
          </span>
        )}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-gray-600">
        <p>
          Letztes Update:{' '}
          <span className="font-medium text-gray-900">
            {lastUpdate ? formatDateDe(lastUpdate) : 'noch nie'}
          </span>
        </p>
        <p>
          Nächstes Update fällig:{' '}
          <span className="font-medium text-gray-900">
            {nextDue ? formatDateDe(nextDue) : '—'}
          </span>
        </p>
      </div>
    </div>
  )
}

// ===========================================================
// Verlaufs-Tabelle
// ===========================================================
function HistoryTable({
  rows,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  rows: ProfilAnalyticsWithGrowth[]
  onEdit: (row: ProfilAnalyticsWithGrowth) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Profil-Analytics gespeichert. Trage oben deinen ersten Monat
        ein.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th>Monat</Th>
            <Th>Impressionen</Th>
            <Th>Klicks</Th>
            <Th>Saves</Th>
            <Th>Zielgruppe</Th>
            <Th>Interagierend</Th>
            <Th>CTR</Th>
            <Th>Engagement</Th>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="align-top hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                <div>{formatMonthDe(row.datum)}</div>
                <div className="mt-0.5 text-xs font-normal text-gray-500">
                  {formatDateDe(row.datum)}
                </div>
              </td>
              <MetricCell value={row.impressionen} growth={row.impressionen_growth} />
              <MetricCell value={row.ausgehende_klicks} growth={row.klicks_growth} />
              <MetricCell value={row.saves} growth={row.saves_growth} />
              <MetricCell value={row.gesamte_zielgruppe} growth={row.zielgruppe_growth} />
              <MetricCell value={row.interagierende_zielgruppe} growth={row.interagierend_growth} />
              <PercentCell value={row.ctr} growth={row.ctr_growth} />
              <PercentCell
                value={row.engagement}
                growth={row.engagement_growth}
              />
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="text-gray-500 hover:text-gray-900"
                    aria-label="Bearbeiten"
                    title="Bearbeiten"
                  >
                    <PencilIcon />
                  </button>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
    </div>
  )
}

function ComputedValue({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{hint}</p>
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

function MetricCell({
  value,
  growth,
}: {
  value: number
  growth: number | null
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm">
      <div
        className="font-medium text-gray-900"
        title={formatNumber(value)}
      >
        {formatZahl(value)}
      </div>
      <div className="mt-0.5">
        <GrowthIndicator growth={growth} />
      </div>
    </td>
  )
}

function PercentCell({
  value,
  growth,
}: {
  value: number | null
  growth: number | null
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm">
      <div className="font-medium text-gray-900">{formatPercent(value)}</div>
      <div className="mt-0.5">
        <GrowthIndicator growth={growth} />
      </div>
    </td>
  )
}

function AktuellerStandSection({
  row,
}: {
  row: ProfilAnalyticsWithGrowth
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Aktueller Stand (letztes Update)
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Pinterest zeigt immer einen rollierenden 30-Tage-Zeitraum. Mehrere
          Einträge pro Monat überschneiden sich — eine Summe wäre daher nicht
          aussagekräftig. Für den besten Überblick einmal pro Monat am
          Monatsanfang tracken.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StandStat
          label="Impressionen"
          value={formatZahl(row.impressionen)}
          title={formatNumber(row.impressionen)}
        />
        <StandStat
          label="Klicks"
          value={formatZahl(row.ausgehende_klicks)}
          title={formatNumber(row.ausgehende_klicks)}
        />
        <StandStat
          label="Saves"
          value={formatZahl(row.saves)}
          title={formatNumber(row.saves)}
        />
        <StandStat label="CTR" value={formatPercent(row.ctr)} />
        <StandStat
          label="Engagement"
          value={formatPercent(row.engagement)}
        />
      </div>
    </section>
  )
}

function StandStat({
  label,
  value,
  title,
}: {
  label: string
  value: string
  title?: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className="mt-1 text-xl font-semibold text-gray-900"
        title={title}
      >
        {value}
      </p>
    </div>
  )
}

function GrowthIndicator({ growth }: { growth: number | null }) {
  if (growth === null) {
    return <span className="text-xs text-gray-400">—</span>
  }
  if (growth === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700"
        title="Wachstum aus Null heraus — Vormonat hatte hier den Wert 0"
      >
        <span aria-hidden>↑</span>neu
      </span>
    )
  }
  if (growth === Number.NEGATIVE_INFINITY) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-red-700"
        title="Rückgang"
      >
        <span aria-hidden>↓</span>
      </span>
    )
  }
  if (growth > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700">
        <span aria-hidden>↑</span>
        {formatGrowth(growth)}
      </span>
    )
  }
  if (growth < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-700">
        <span aria-hidden>↓</span>
        {formatGrowth(growth)}
      </span>
    )
  }
  return <span className="text-xs text-gray-500">—</span>
}
