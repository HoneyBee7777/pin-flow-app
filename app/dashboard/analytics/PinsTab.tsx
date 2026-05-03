'use client'

import Link from 'next/link'
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { deletePinAnalytics, savePinAnalytics } from './actions'
import SharedSortableTh from '@/components/SortableTh'
import InfoTooltip from '@/components/InfoTooltip'
import CopyStartDateButton from './CopyStartDateButton'
import NextZeitraumHint from './NextZeitraumHint'
import {
  addDays,
  calcCtr,
  diffDays,
  effectiveZeitraum,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  formatZeitraumKurz,
  PIN_DIAGNOSE_BADGE,
  PIN_DIAGNOSE_LABEL,
  PIN_STATUS_BADGE,
  PIN_STATUS_LABEL,
  todayIso,
  type PinAnalyticsRow,
  type PinAnalyticsThresholds,
  type PinOption,
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

export default function PinsTab({
  pins,
  pinAnalytics,
  thresholds,
  latestZeitraumBis,
}: {
  pins: PinOption[]
  pinAnalytics: PinAnalyticsRow[]
  thresholds: PinAnalyticsThresholds
  // Einheitliche Datumsquelle aus AnalyticsClient (MAX über profil_analytics
  // + pins_analytics) — Pins-Tab und Profil-Tab zeigen denselben „nächster
  // Zeitraum"-Vorschlag.
  latestZeitraumBis: string | null
}) {
  const [pinId, setPinId] = useState('')
  const [selectedPin, setSelectedPin] = useState<PinOption | null>(null)
  const [pinSearch, setPinSearch] = useState('')
  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  const filteredPins = useMemo(() => {
    if (selectedPin) return [] as PinOption[]
    const q = pinSearch.trim().toLowerCase()
    if (!q) return [] as PinOption[]
    return pins
      .filter((p) => (p.titel ?? '').toLowerCase().includes(q))
      .slice(0, 12)
  }, [pinSearch, pins, selectedPin])

  // pinAnalytics ist DESC nach datum sortiert. Daraus zwei Strukturen:
  //  - dedupedAnalytics: jeweils neueste Zeile pro pin_id (Übersichtstabelle)
  //  - historyByPin:     ALLE Zeilen pro pin_id (für aufklappbare Zeitreihe)
  const { dedupedAnalytics, historyByPin } = useMemo(() => {
    const seen = new Set<string>()
    const dedup: PinAnalyticsRow[] = []
    const history = new Map<string, PinAnalyticsRow[]>()
    for (const row of pinAnalytics) {
      if (!seen.has(row.pin_id)) {
        seen.add(row.pin_id)
        dedup.push(row)
      }
      const arr = history.get(row.pin_id) ?? []
      arr.push(row)
      history.set(row.pin_id, arr)
    }
    return { dedupedAnalytics: dedup, historyByPin: history }
  }, [pinAnalytics])

  useEffect(() => {
    // zeitraum_von = letztes zeitraum_bis + 1 Tag (sonst Überlappung).
    // latestZeitraumBis kommt aus AnalyticsClient und vereint Profil- +
    // Pin-Analytics, damit beide Tabs konsistent denselben Vorschlag zeigen.
    const yesterday = addDays(todayIso(), -1)
    setZeitraumBis((prev) => prev || yesterday)
    setZeitraumVon(
      (prev) =>
        prev || (latestZeitraumBis ? addDays(latestZeitraumBis, 1) : '')
    )
  }, [latestZeitraumBis])

  function selectPin(pin: PinOption) {
    setSelectedPin(pin)
    setPinId(pin.id)
    setPinSearch('')
  }

  function clearPin() {
    setSelectedPin(null)
    setPinId('')
    setPinSearch('')
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await savePinAnalytics(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  function startEdit(row: PinAnalyticsRow) {
    const eff = effectiveZeitraum(row)
    setPinId(row.pin_id)
    setSelectedPin(row.pin)
    setPinSearch('')
    setZeitraumVon(eff.von)
    setZeitraumBis(eff.bis)
    setImpressionen(String(row.impressionen))
    setKlicks(String(row.klicks))
    setSaves(String(row.saves))
    setFeedback({})
    if (typeof window !== 'undefined') {
      const el = document.getElementById('pin-analytics-form')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

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
        Tracke deine wichtigsten Pins einzeln — nicht alle, nur die
        strategisch relevanten Top 15–20. So siehst du welche Pins wirklich
        performen und welche optimiert werden sollten.
      </p>

      <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-900">
          So findest du deine Zahlen
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600">
          <li>Pinterest öffnen → Analytics → Übersicht</li>
          <li>
            Zeitraum: „Benutzerdefiniert" → Startdatum 180 Tage zurück eingeben
            (Datums-Helper oben nutzen)
          </li>
          <li>Zur Sektion „Top Pins" nach unten scrollen</li>
          <li>
            Nach <strong>Ausgehende Klicks</strong> sortieren → deine Top
            15–20 Pins eintragen
          </li>
          <li>
            Dann nach <strong>Impressionen</strong> sortieren → weitere
            relevante Pins eintragen
          </li>
          <li>
            Dann nach <strong>Saves</strong> sortieren → weitere relevante
            Pins eintragen
          </li>
        </ol>
        <p className="mt-2 text-xs text-gray-500">
          Pins die in mehreren Listen auftauchen einfach mit aktualisierten
          Werten eintragen — die App erkennt und aktualisiert sie
          automatisch.
        </p>
      </details>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <NextZeitraumHint
            von={zeitraumVon || null}
            bis={zeitraumBis || null}
          />
        </div>
        <div className="shrink-0 pt-0.5">
          <CopyStartDateButton />
        </div>
      </div>

      <form
        id="pin-analytics-form"
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm scroll-mt-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Pin-Analytics eintragen
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Wähle einen Pin und den Zeitraum, dann trage Impressionen, Klicks
            und Saves aus Pinterest Analytics ein.
          </p>
        </div>

        {pins.length === 0 ? (
          <p className="text-sm text-gray-500">
            Du hast noch keine Pins angelegt. Lege zuerst einen Pin in der
            Pin-Produktion an.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="md:col-span-2 lg:col-span-3">
                <PinSearchField
                  selectedPin={selectedPin}
                  search={pinSearch}
                  onSearchChange={setPinSearch}
                  filteredPins={filteredPins}
                  onSelect={selectPin}
                  onClear={clearPin}
                />
                <input type="hidden" name="pin_id" value={pinId} />
              </div>

              <Field label="Von" htmlFor="zeitraum_von">
                <input
                  id="zeitraum_von"
                  name="zeitraum_von"
                  type="date"
                  required
                  value={zeitraumVon}
                  onChange={(e) => setZeitraumVon(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Bis" htmlFor="zeitraum_bis">
                <input
                  id="zeitraum_bis"
                  name="zeitraum_bis"
                  type="date"
                  required
                  value={zeitraumBis}
                  onChange={(e) => setZeitraumBis(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="md:col-span-2 lg:col-span-1 md:flex md:items-end">
                <p className="text-xs text-gray-500">
                  Zeitraum wird automatisch berechnet: vom letzten Update bis
                  gestern. Passe die Daten in Pinterest Analytics entsprechend
                  an.
                </p>
              </div>

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

              <Field label="Klicks" htmlFor="klicks">
                <input
                  id="klicks"
                  name="klicks"
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
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending || !pinId}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                title={!pinId ? 'Bitte zuerst einen Pin auswählen' : ''}
              >
                {isPending ? 'Speichert…' : 'Speichern'}
              </button>
              {feedback.saved && (
                <span className="text-sm text-green-700">✓ Gespeichert</span>
              )}
              {feedback.error && (
                <span className="text-sm text-red-700">{feedback.error}</span>
              )}
            </div>
          </>
        )}
      </form>

      <PinAnalyticsTable
        rows={dedupedAnalytics}
        historyByPin={historyByPin}
        onEdit={startEdit}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />

      <ThresholdInfo thresholds={thresholds} />
    </div>
  )
}

// ===========================================================
// Pin-Suche
// ===========================================================
function PinSearchField({
  selectedPin,
  search,
  onSearchChange,
  filteredPins,
  onSelect,
  onClear,
}: {
  selectedPin: PinOption | null
  search: string
  onSearchChange: (v: string) => void
  filteredPins: PinOption[]
  onSelect: (pin: PinOption) => void
  onClear: () => void
}) {
  return (
    <div>
      <label
        htmlFor="pin_search"
        className="block text-sm font-medium text-gray-700"
      >
        Pin auswählen <span className="text-red-600">*</span>
      </label>

      {selectedPin ? (
        <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium text-gray-900">
                {selectedPin.titel ?? (
                  <span className="text-gray-500">(ohne Titel)</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PIN_STATUS_BADGE[selectedPin.status] ??
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {PIN_STATUS_LABEL[selectedPin.status] ?? selectedPin.status}
                </span>
                <span>{formatPinDate(selectedPin)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              × ändern
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            id="pin_search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pin-Titel suchen…"
            autoComplete="off"
            className={inputCls}
          />
          {search.trim() && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {filteredPins.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">
                  Keine passenden Pins gefunden.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredPins.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(p)}
                        className="block w-full p-3 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">
                          {p.titel ?? (
                            <span className="text-gray-500">
                              (ohne Titel)
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              PIN_STATUS_BADGE[p.status] ??
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {PIN_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                          <span>{formatPinDate(p)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatPinDate(pin: PinOption): string {
  if (pin.geplante_veroeffentlichung) {
    return `📅 Veröffentlichung: ${formatDateDe(pin.geplante_veroeffentlichung)}`
  }
  return `Erstellt: ${formatDateDe(pin.created_at.slice(0, 10))}`
}

// ===========================================================
// Tabelle
// ===========================================================
type SortKey =
  | 'titel'
  | 'impressionen'
  | 'klicks'
  | 'saves'
  | 'ctr'
  | 'diagnose'
  | 'handlung'
  | 'alter'
  | 'zuletzt'
type SortDir = 'asc' | 'desc'

function compareRows(
  a: PinAnalyticsRow,
  b: PinAnalyticsRow,
  key: SortKey,
  dir: SortDir
): number {
  const sign = dir === 'asc' ? 1 : -1
  let res = 0
  switch (key) {
    case 'titel':
      res = (a.pin?.titel ?? '').localeCompare(b.pin?.titel ?? '', 'de')
      break
    case 'impressionen':
      res = a.impressionen - b.impressionen
      break
    case 'klicks':
      res = a.klicks - b.klicks
      break
    case 'saves':
      res = a.saves - b.saves
      break
    case 'ctr':
      res = (a.ctr ?? -Infinity) - (b.ctr ?? -Infinity)
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
    case 'alter':
      res = a.alter_tage - b.alter_tage
      break
    case 'zuletzt':
      res = a.datum.localeCompare(b.datum)
      break
  }
  return res * sign
}

function PinAnalyticsTable({
  rows,
  historyByPin,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  rows: PinAnalyticsRow[]
  historyByPin: Map<string, PinAnalyticsRow[]>
  onEdit: (row: PinAnalyticsRow) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('klicks')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const today = useMemo(() => todayIso(), [])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
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
        Noch keine Pin-Analytics gespeichert. Trage oben deinen ersten Pin
        ein.
      </div>
    )
  }

  return (
    <div className="max-h-[800px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            <SortableTh
              sortKey="titel"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Pin
            </SortableTh>
            <SortableTh
              sortKey="impressionen"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Impressionen
            </SortableTh>
            <SortableTh
              sortKey="klicks"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Klicks
            </SortableTh>
            <SortableTh
              sortKey="saves"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Saves
            </SortableTh>
            <SortableTh
              sortKey="ctr"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              CTR
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
              sortKey="alter"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Alter
            </SortableTh>
            <SortableTh
              sortKey="zuletzt"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              Zuletzt aktualisiert
            </SortableTh>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedRows.map((row) => {
            const history = historyByPin.get(row.pin_id) ?? [row]
            const hasHistory = history.length > 1
            const prev = hasHistory ? history[1] : null
            const isOpen = expanded.has(row.pin_id)
            return (
              <Fragment key={row.id}>
                <tr className="align-top hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-start gap-2">
                      {hasHistory ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.pin_id)}
                          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs text-gray-500 hover:text-gray-900"
                          aria-label={isOpen ? 'Zeitreihe einklappen' : 'Zeitreihe ausklappen'}
                          title={isOpen ? 'Einklappen' : 'Zeitreihe anzeigen'}
                        >
                          {isOpen ? '▼' : '▶'}
                        </button>
                      ) : (
                        <span
                          className="mt-0.5 inline-block h-4 w-4 shrink-0"
                          aria-hidden
                        />
                      )}
                      <span>
                        {row.pin ? (
                          row.pin.titel ?? (
                            <span className="text-gray-500">(ohne Titel)</span>
                          )
                        ) : (
                          <span className="text-gray-400">— gelöschter Pin —</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <MetricWithDelta
                    value={row.impressionen}
                    prev={prev?.impressionen}
                  />
                  <MetricWithDelta value={row.klicks} prev={prev?.klicks} />
                  <MetricWithDelta value={row.saves} prev={prev?.saves} />
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {formatPercent(row.ctr)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PIN_DIAGNOSE_BADGE[row.diagnose]}`}
                    >
                      {PIN_DIAGNOSE_LABEL[row.diagnose]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">
                    {row.handlung}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    title={`Datum: ${formatDateDe(row.datum)}`}
                  >
                    {row.alter_tage} {row.alter_tage === 1 ? 'Tag' : 'Tage'}
                  </td>
                  <ZuletztAktualisiertCell datum={row.datum} today={today} />
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
                {hasHistory && isOpen && (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="px-4 py-3">
                      <PinTimeline history={history} />
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

// Kompakte Zeitreihe pro Pin — alle Einträge DESC, Vergleich zur jeweils
// älteren Periode in derselben Zeile.
function PinTimeline({ history }: { history: PinAnalyticsRow[] }) {
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
              Vs. vorher
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((row, i) => {
            const eff = effectiveZeitraum(row)
            const prev = history[i + 1]
            const isCurrent = i === 0
            return (
              <tr key={row.id} className="text-gray-700">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                  {formatZeitraumKurz(eff.von, eff.bis)}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2"
                  title={formatNumber(row.impressionen)}
                >
                  {formatZahl(row.impressionen)}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2"
                  title={formatNumber(row.klicks)}
                >
                  {formatZahl(row.klicks)}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2"
                  title={formatNumber(row.saves)}
                >
                  {formatZahl(row.saves)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatPercent(calcCtr(row.klicks, row.impressionen))}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {!prev ? (
                    <span className="text-gray-400">— erster Eintrag</span>
                  ) : isCurrent ? (
                    <BestDelta row={row} prev={prev} />
                  ) : (
                    <BestDelta row={row} prev={prev} />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Zelle mit Wert + kleinem ↑/↓ Indikator wenn ein Vorperioden-Wert existiert.
function MetricWithDelta({
  value,
  prev,
}: {
  value: number
  prev: number | undefined
}) {
  const delta =
    prev === undefined ? null : value > prev ? 'up' : value < prev ? 'down' : 'flat'
  return (
    <td
      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
      title={formatNumber(value)}
    >
      <span className="inline-flex items-center gap-1">
        {formatZahl(value)}
        {delta === 'up' && (
          <span
            className="text-xs font-medium text-green-700"
            aria-hidden
            title={`Vorher: ${formatNumber(prev ?? 0)}`}
          >
            ↑
          </span>
        )}
        {delta === 'down' && (
          <span
            className="text-xs font-medium text-red-700"
            aria-hidden
            title={`Vorher: ${formatNumber(prev ?? 0)}`}
          >
            ↓
          </span>
        )}
      </span>
    </td>
  )
}

// Berechnet die größte relative Veränderung zwischen row und prev und
// zeigt sie als „↑ +20% Klicks". Tooltip listet alle Veränderungen.
function BestDelta({
  row,
  prev,
}: {
  row: PinAnalyticsRow
  prev: PinAnalyticsRow
}) {
  type Item = { label: string; current: number; previous: number }
  const items: Item[] = [
    { label: 'Klicks', current: row.klicks, previous: prev.klicks },
    { label: 'Impressionen', current: row.impressionen, previous: prev.impressionen },
    { label: 'Saves', current: row.saves, previous: prev.saves },
  ]
  const withGrowth = items.map((it) => {
    const g =
      it.previous === 0
        ? it.current === 0
          ? 0
          : it.current > 0
            ? Number.POSITIVE_INFINITY
            : Number.NEGATIVE_INFINITY
        : ((it.current - it.previous) / it.previous) * 100
    return { ...it, growth: g }
  })

  function magnitude(g: number): number {
    if (!Number.isFinite(g)) return 9999
    return Math.abs(g)
  }
  const sorted = [...withGrowth].sort((a, b) => magnitude(b.growth) - magnitude(a.growth))
  const top = sorted[0]
  if (!top) return <span className="text-gray-400">—</span>

  const tooltip = withGrowth
    .map((it) => {
      if (it.growth === Number.POSITIVE_INFINITY) return `${it.label}: ↑ neu`
      if (it.growth === Number.NEGATIVE_INFINITY) return `${it.label}: ↓ —`
      const sign = it.growth > 0 ? '+' : ''
      return `${it.label}: ${sign}${it.growth.toFixed(1)}%`
    })
    .join('\n')

  if (top.growth === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-medium text-green-700"
        title={tooltip}
      >
        ↑ neu {top.label}
      </span>
    )
  }
  if (top.growth === Number.NEGATIVE_INFINITY) {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-medium text-red-700"
        title={tooltip}
      >
        ↓ {top.label}
      </span>
    )
  }
  if (top.growth === 0) {
    return (
      <span className="text-gray-500" title={tooltip}>
        ± 0% {top.label}
      </span>
    )
  }
  const positive = top.growth > 0
  const sign = positive ? '+' : ''
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}
      title={tooltip}
    >
      {positive ? '↑' : '↓'} {sign}
      {top.growth.toFixed(1)}% {top.label}
    </span>
  )
}

function ZuletztAktualisiertCell({
  datum,
  today,
}: {
  datum: string
  today: string
}) {
  const daysSince = Math.max(0, diffDays(datum, today))
  const isStale = daysSince >= 90
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-sm ${
        isStale ? 'font-medium text-orange-600' : 'text-gray-700'
      }`}
      title={
        isStale
          ? `Letzter Eintrag vor ${daysSince} Tagen — Zeit, diesen Pin neu zu checken.`
          : `Letzter Eintrag vor ${daysSince} Tagen`
      }
    >
      {formatDateDe(datum)}
    </td>
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

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
function Field({
  label,
  htmlFor,
  tooltip,
  children,
}: {
  label: string
  htmlFor: string
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} <span className="text-red-600">*</span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      {children}
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
