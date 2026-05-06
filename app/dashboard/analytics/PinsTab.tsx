'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Fragment,
  useMemo,
  useState,
  useTransition,
} from 'react'
import {
  deletePinAnalytics,
  hardDeleteAllDeletedPinAnalytics,
  restorePinAnalytics,
  type UnmatchedPin,
} from './actions'
import SharedSortableTh from '@/components/SortableTh'
import InfoTooltip from '@/components/InfoTooltip'
import UnmatchedPinsSection from './UnmatchedPinsSection'
import PinAnalyticsEditModal from './PinAnalyticsEditModal'
import type { DeletedPinEntry } from './AnalyticsClient'
import {
  calcCtr,
  calcEngagement,
  effectiveZeitraum,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  formatZeitraumKurz,
  PIN_DIAGNOSE_BADGE,
  PIN_DIAGNOSE_LABEL,
  type PinAnalyticsRow,
  type PinAnalyticsThresholds,
  type PinOption,
  type UserPinBenchmark,
} from './utils'
import {
  diagnosePinAggregated,
  formatPinAge,
  PIN_DIAGNOSE_META,
  PIN_DIAGNOSE_TOOLTIP,
  type PinDiagnose,
} from './diagnosePinAggregated'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import {
  getEinordnung,
  type Einordnung,
  type Range,
} from '@/lib/niche-benchmarks'

// Spalten-Tooltips für die Top-Pins-Tabelle — Klartext-Erklärung was die
// Kennzahl bedeutet und warum sie wichtig ist. Werden über InfoTooltip neben
// jedem Spaltenkopf angezeigt.
const COLUMN_TOOLTIPS = {
  klicks:
    'Wie oft Menschen vom Pin auf deine Website geklickt haben. Das ist die wichtigste Zahl — sie zeigt, ob dein Pin Besucher bringt. (Achtung: Das sind ausgehende Klicks zur Website — nicht das Vergrößern des Pins auf Pinterest.)',
  impressionen:
    'Wie oft dein Pin überhaupt angezeigt wurde — also wie viele Menschen ihn auf Pinterest gesehen haben. Sagt nichts darüber aus, ob jemand reagiert hat.',
  saves:
    'Wie oft Menschen deinen Pin auf eigene Boards gespeichert haben. Das ist Pinterests wichtigstes Signal: Viele Saves → Pinterest spielt deinen Pin mehr aus.',
  ctr:
    'Von 100 Menschen, die deinen Pin sehen — wie viele klicken auf deine Website? Beispiel: 1,5 % heißt: 1,5 von 100 klicken durch. Klingt wenig, ist aber bei Pinterest ein guter Wert.',
  saveRate:
    'Von 100 Menschen, die deinen Pin sehen — wie viele speichern ihn auf eigenen Boards? Beispiel: 0,5 % heißt: 1 von 200 speichert ihn. Pinterest belohnt hohe Save-Rates mit mehr Reichweite.',
  er:
    'Engagement-Rate. Zeigt die Gesamtwirkung eines Pins: von 100 Sehern, wie viele reagieren (durch Speichern oder Klicken)? Pinterest belohnt hohe Engagement-Werte mit mehr Reichweite. Beispiel: 1,5 % heißt: 1,5 von 100 Sehern reagieren irgendwie auf den Pin.',
  diagnose:
    'Welche Stärke und Schwäche hat dieser Pin? Die Diagnose entscheidet, was du als nächstes tun solltest.',
  handlung:
    'Was solltest du mit diesem Pin tun? Konkrete Empfehlung basierend auf der Diagnose.',
  perioden:
    'In wie vielen monatlichen Daten-Imports kommt dieser Pin schon vor? Mehr Perioden = stabilere Aussage.',
  alter:
    'Wie viele Tage seit der ersten Veröffentlichung. Pinterest braucht Zeit, um neue Pins voll auszuspielen — meist 60+ Tage.',
} as const

export default function PinsTab({
  pinAnalytics,
  deletedPinAnalytics,
  pins,
  thresholds,
  benchmark,
  nicheProfile,
  unmatchedPins,
  unmatchedZeitraumVon,
  unmatchedZeitraumBis,
  onUnmatchedPinResolved,
}: {
  pinAnalytics: PinAnalyticsRow[]
  deletedPinAnalytics: DeletedPinEntry[]
  // Wird nur an UnmatchedPinsSection durchgereicht (Pin-Auswahl beim
  // Zuordnen) — die Pin-Tabelle selbst nutzt pinAnalytics.pin.
  pins: PinOption[]
  thresholds: PinAnalyticsThresholds
  benchmark: UserPinBenchmark | null
  nicheProfile: AccountNicheProfile
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
      const saveRate =
        cumImpressionen > 0
          ? (cumSaves / cumImpressionen) * 100
          : null
      const engagementRate = calcEngagement(cumKlicks, cumSaves, cumImpressionen)
      const perioden = rows.length
      const hatDatum = !!latest.pin?.geplante_veroeffentlichung
      const result = diagnosePinAggregated({
        cumKlicks,
        cumImpressionen,
        cumSaves,
        perioden,
        pinAlter: hatDatum ? latest.alter_tage : null,
        hatDatum,
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
        saveRate,
        engagementRate,
        perioden,
        pinAlter: hatDatum ? latest.alter_tage : null,
        diagnose: result.diagnose,
        handlung: result.handlung,
      }
    })
  }, [pinAnalytics, thresholds])

  const router = useRouter()

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deletePinAnalytics(fd)
      router.refresh()
    })
  }

  // Bearbeiten-Modal: hält den aktuell editierten Eintrag (latest-Periode
  // des aufgeklappten Pins). Null = geschlossen.
  type EditEntry = {
    id: string
    pin_id: string
    pinTitel: string | null
    zeitraum_von: string
    zeitraum_bis: string
    impressionen: number
    klicks: number
    saves: number
    pinterestPinUrl: string | null
  }
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null)

  function onEdit(agg: AggregatedPin) {
    const r = agg.latest
    // pinterest_pin_url aus dem dedizierten pins-Array nachschlagen. Falls
    // bestehende Zuordnungen nur pinterest_pin_id gespeichert haben (Altdaten
    // vor dem URL-Persistenz-Fix), URL daraus rekonstruieren.
    const pinFromArray = pins.find((p) => p.id === r.pin_id) ?? null
    const storedUrl = pinFromArray?.pinterest_pin_url ?? null
    const storedId = pinFromArray?.pinterest_pin_id ?? null
    const derivedUrl =
      storedUrl ||
      (storedId ? `https://www.pinterest.com/pin/${storedId}/` : null)
    setEditEntry({
      id: r.id,
      pin_id: r.pin_id,
      pinTitel: r.pin?.titel ?? pinFromArray?.titel ?? null,
      // Falls zeitraum_von/bis fehlen (Altdaten), auf datum zurückfallen.
      zeitraum_von: r.zeitraum_von ?? r.datum,
      zeitraum_bis: r.zeitraum_bis ?? r.datum,
      impressionen: r.impressionen,
      klicks: r.klicks,
      saves: r.saves,
      pinterestPinUrl: derivedUrl,
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700">
        Hier siehst du die Performance deiner Top Pins über alle erfassten
        Zeiträume.
        <br />
        <Link
          href="/dashboard/strategie?tab=analytics"
          className="font-medium text-red-600 hover:underline"
        >
          → Mehr zur Analyse und was die Kategorien bedeuten in Strategie
          &amp; Ausrichtung
        </Link>
      </p>

      <UnmatchedPinsSection
        unmatchedPins={unmatchedPins}
        pins={pins}
        zeitraumVon={unmatchedZeitraumVon}
        zeitraumBis={unmatchedZeitraumBis}
        onAssigned={onUnmatchedPinResolved}
        onSkipped={onUnmatchedPinResolved}
      />

      <TableLegend />

      <PinAnalyticsTable
        rows={aggregatedPins}
        onDelete={onDelete}
        onEdit={onEdit}
        deleteDisabled={isPending}
      />

      <DeletedPinsSection deletedEntries={deletedPinAnalytics} />

      <ThresholdInfo
        thresholds={thresholds}
        benchmark={benchmark}
        nicheProfile={nicheProfile}
      />

      <PinAnalyticsEditModal
        open={editEntry !== null}
        onClose={() => setEditEntry(null)}
        onSaved={() => router.refresh()}
        entry={editEntry}
        pins={pins}
      />
    </div>
  )
}

// ===========================================================
// Info-Block oberhalb der Tabelle — kompakte Spalten-Legende, damit
// Erstnutzer ohne Tooltip-Hover die wichtigsten Spalten verstehen.
// ===========================================================
function TableLegend() {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-[13px] text-gray-600">
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 text-gray-400">
          ⓘ
        </span>
        <div className="space-y-1">
          <p className="font-medium text-gray-700">So liest du die Tabelle:</p>
          <ul className="space-y-0.5">
            <li>
              <strong>Klicks</strong> — wie oft auf deine Website geklickt wurde
              (das wichtigste Ziel)
            </li>
            <li>
              <strong>CTR</strong> — Klickrate: von 100 Sehern, wie viele
              klicken? (Pinterest-Schnitt: 0,3–0,8 %)
            </li>
            <li>
              <strong>Save-Rate</strong> — Speicherrate: von 100 Sehern, wie
              viele speichern? (Schnitt: 0,2–0,5 %)
            </li>
            <li>
              <strong>Diagnose</strong> — was ist los mit dem Pin?
            </li>
            <li>
              <strong>Handlung</strong> — was solltest du jetzt damit tun?
            </li>
            <li>
              Klick auf <span className="font-mono">▶</span> neben einem
              Pin-Titel für Details und Verlauf.
            </li>
          </ul>
        </div>
      </div>
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
  saveRate: number | null
  engagementRate: number | null
  perioden: number
  pinAlter: number | null
  diagnose: PinDiagnose
  handlung: string
}

type SortKey =
  | 'titel'
  | 'cumKlicks'
  | 'cumImpressionen'
  | 'cumSaves'
  | 'avgCtr'
  | 'saveRate'
  | 'engagementRate'
  | 'diagnose'
  | 'handlung'
  | 'perioden'
  | 'pinAlter'
type SortDir = 'asc' | 'desc'

// Sekundäre Sortierung pro Kategorie — wenn nach 'diagnose' gruppiert wird,
// soll die spec-gemäße Default-Reihenfolge greifen:
//   Aktiver Top Performer / Eingeschlafener Gewinner: Klicks DESC
//   Hidden Gem: CTR DESC
//   Reichweite ohne Wirkung: Impressionen DESC
//   Stiller Pin / Noch zu früh: Alter DESC
function categorySecondaryOrder(
  a: AggregatedPin,
  b: AggregatedPin
): number {
  if (a.diagnose !== b.diagnose) return 0
  switch (a.diagnose) {
    case 'aktiver_top_performer':
    case 'eingeschlafener_gewinner':
      return b.cumKlicks - a.cumKlicks
    case 'hidden_gem':
      return (b.avgCtr ?? -Infinity) - (a.avgCtr ?? -Infinity)
    case 'reichweite_ohne_wirkung':
      return b.cumImpressionen - a.cumImpressionen
    case 'stiller_pin':
    case 'noch_zu_frueh':
      return (b.pinAlter ?? -Infinity) - (a.pinAlter ?? -Infinity)
    default:
      return 0
  }
}

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
    case 'saveRate':
      res = (a.saveRate ?? -Infinity) - (b.saveRate ?? -Infinity)
      break
    case 'engagementRate':
      res =
        (a.engagementRate ?? -Infinity) - (b.engagementRate ?? -Infinity)
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
    case 'pinAlter':
      res = (a.pinAlter ?? Infinity) - (b.pinAlter ?? Infinity)
      break
  }
  if (res === 0 && key === 'diagnose') {
    return categorySecondaryOrder(a, b)
  }
  return res * sign
}

function PinAnalyticsTable({
  rows,
  onDelete,
  onEdit,
  deleteDisabled,
}: {
  rows: AggregatedPin[]
  onDelete: (id: string) => void
  onEdit: (agg: AggregatedPin) => void
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
              <span className="whitespace-nowrap">
                Klicks ∑<InfoTooltip text={COLUMN_TOOLTIPS.klicks} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="cumImpressionen"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Imp ∑<InfoTooltip text={COLUMN_TOOLTIPS.impressionen} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="cumSaves"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Saves ∑<InfoTooltip text={COLUMN_TOOLTIPS.saves} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="avgCtr"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Ø CTR<InfoTooltip text={COLUMN_TOOLTIPS.ctr} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="saveRate"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Save-Rate<InfoTooltip text={COLUMN_TOOLTIPS.saveRate} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="engagementRate"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                ER<InfoTooltip text={COLUMN_TOOLTIPS.er} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="diagnose"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Diagnose<InfoTooltip text={COLUMN_TOOLTIPS.diagnose} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="handlung"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Handlung<InfoTooltip text={COLUMN_TOOLTIPS.handlung} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="perioden"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Perioden<InfoTooltip text={COLUMN_TOOLTIPS.perioden} />
              </span>
            </SortableTh>
            <SortableTh
              sortKey="pinAlter"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            >
              <span className="whitespace-nowrap">
                Alter<InfoTooltip text={COLUMN_TOOLTIPS.alter} />
              </span>
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {hasPeriods ? formatPercent(agg.saveRate, 2) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {hasPeriods ? formatPercent(agg.engagementRate, 2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex cursor-help items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PIN_DIAGNOSE_BADGE[agg.diagnose]}`}
                      title={PIN_DIAGNOSE_TOOLTIP[agg.diagnose]}
                    >
                      {PIN_DIAGNOSE_META[agg.diagnose].emoji}{' '}
                      {PIN_DIAGNOSE_LABEL[agg.diagnose]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">
                    {agg.diagnose === 'kein_datum' ? (
                      <Link
                        href={`/dashboard/pin-produktion?edit=${row.pin_id}`}
                        className="font-medium text-red-600 hover:underline"
                      >
                        → Pin bearbeiten
                      </Link>
                    ) : (
                      agg.handlung
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {hasPeriods ? agg.perioden : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {formatPinAge(agg.pinAlter)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => onEdit(agg)}
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
                {hasPeriods && isOpen && (
                  <tr className="bg-gray-50">
                    <td colSpan={13} className="px-4 py-3">
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
              Save-Rate
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              ER
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((row, i) => {
            const eff = effectiveZeitraum(row)
            const prev = history[i + 1]
            const ctr = calcCtr(row.klicks, row.impressionen)
            const prevCtr = prev ? calcCtr(prev.klicks, prev.impressionen) : null
            const saveRate =
              row.impressionen > 0
                ? (row.saves / row.impressionen) * 100
                : null
            const prevSaveRate =
              prev && prev.impressionen > 0
                ? (prev.saves / prev.impressionen) * 100
                : null
            const er = calcEngagement(row.klicks, row.saves, row.impressionen)
            const prevEr = prev
              ? calcEngagement(prev.klicks, prev.saves, prev.impressionen)
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
                  <InlineMetricDelta
                    value={saveRate}
                    prev={prevSaveRate}
                    format="percent"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta
                    value={er}
                    prev={prevEr}
                    format="percent"
                  />
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
// Schwellwert-Info — erklärt das Diagnose-System in Klartext und zeigt
// die persönliche Benchmark sowie die aktuellen Sicherheits-Schwellen.
// ===========================================================
function ThresholdInfo({
  thresholds: t,
  benchmark,
  nicheProfile,
}: {
  thresholds: PinAnalyticsThresholds
  benchmark: UserPinBenchmark | null
  nicheProfile: AccountNicheProfile
}) {
  const fmt = (v: number | null, digits = 2): string =>
    v === null || !Number.isFinite(v) ? '—' : v.toFixed(digits)
  const fmtImp = (v: number | null): string =>
    v === null || !Number.isFinite(v)
      ? '—'
      : v.toLocaleString('de-DE')
  const ctrBoostProzent = Math.round((t.ctrBoostFaktor - 1) * 100)
  const ctrBoosted = (
    (t.medianCtr ?? t.fallbackMindestCtr) * t.ctrBoostFaktor
  )
    .toFixed(2)
    .replace('.', ',')
  // Nischen-Einordnung nur wenn klare Hauptnische erkennbar ist —
  // sonst vergleichen wir uns gegen Branchenwerte, die nichts mit dem
  // Account zu tun haben.
  const useNicheVergleich =
    nicheProfile.primaryNiche !== null && !nicheProfile.isMixed
  const nicheLabel = nicheProfile.primaryNiche?.label ?? null
  return (
    <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
      <summary className="cursor-pointer text-sm font-medium text-gray-900">
        So funktioniert die Diagnose
      </summary>

      <p className="mt-3">
        Wir vergleichen jeden Pin mit deinem eigenen Durchschnitt. Performt er
        besser oder schlechter? Plus ein paar Sicherheits-Schwellen, damit
        Zufalls-Klicks nicht überbewertet werden.
      </p>

      <ul className="mt-3 space-y-1">
        <li>
          ⭐ <strong>Aktiver Top Performer:</strong> Beide Signale stark —
          Pinterest und Nutzer reagieren positiv.
        </li>
        <li>
          💎 <strong>Hidden Gem:</strong> Hohe Klickrate, aber wenig Reichweite.
          Hook gut, SEO schwach.
        </li>
        <li>
          🔧 <strong>Reichweite ohne Wirkung:</strong> Viel Reichweite, wenig
          Klicks. SEO gut, Hook schwach.
        </li>
        <li>
          ♻️ <strong>Eingeschlafener Gewinner:</strong> Früher stark, jetzt zu
          alt — Zeit fürs Recycling.
        </li>
        <li>
          💤 <strong>Stiller Pin:</strong> Kein Signal — archivieren oder neu
          aufsetzen.
        </li>
        <li>
          ⏳ <strong>Noch zu früh:</strong> Zu wenig Daten — abwarten.
        </li>
      </ul>

      <div className="mt-3 border-t border-gray-200 pt-2">
        <p className="font-medium text-gray-900">
          Womit wir vergleichen — deine persönliche Benchmark
        </p>
        {useNicheVergleich && nicheLabel ? (
          <p className="mt-0.5 text-[11px] text-gray-500">
            Hauptnische: {nicheLabel} (
            {Math.round(nicheProfile.primaryShare * 100)} % deiner Pins) —
            Einordnung gegen Branchenschnitt.
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-gray-500">
            Keine klare Hauptnische erkannt — Branchenvergleich ist
            ausgeblendet, Account-Median bleibt aktiv.
          </p>
        )}
        {t.medianCtr === null &&
        t.medianSaveRate === null &&
        t.medianImpressionen === null ? (
          <p className="mt-1 text-gray-500">
            Noch keine Benchmark berechnet — solange weniger als 10
            qualifizierte Pins vorliegen, greift der Fallback-CTR{' '}
            {t.fallbackMindestCtr}%.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            <li>
              <strong>Median CTR:</strong> {fmt(t.medianCtr)}% — das ist deine
              durchschnittliche Klickrate. Pins müssen {ctrBoostProzent}%
              drüber liegen, um als klickstark zu gelten (also ab {ctrBoosted}
              %).
              <InlineNicheEinordnung
                value={t.medianCtr}
                range={
                  useNicheVergleich
                    ? nicheProfile.primaryNiche!.ctr
                    : null
                }
                nicheLabel={nicheLabel}
              />
            </li>
            <li>
              <strong>Median Save-Rate:</strong> {fmt(t.medianSaveRate)}% — das
              ist deine durchschnittliche Speicher-Rate. Liegt ein Pin drüber,
              mag Pinterest ihn.
              <InlineNicheEinordnung
                value={t.medianSaveRate}
                range={
                  useNicheVergleich
                    ? nicheProfile.primaryNiche!.save_rate
                    : null
                }
                nicheLabel={nicheLabel}
              />
            </li>
            <li>
              <strong>Median Impressionen:</strong> {fmtImp(t.medianImpressionen)}{' '}
              — Referenzwert (Reichweite ist account-spezifisch und wird nicht
              für Branchen-Vergleiche genutzt).
            </li>
            {benchmark?.qualifiziertePins != null && (
              <li className="text-gray-500">
                Berechnet aus {benchmark.qualifiziertePins} Pins, die jünger als
                90 Tage sind und mindestens 100 Impressionen haben.
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-2">
        <p className="font-medium text-gray-900">Sicherheits-Schwellen</p>
        <p className="mt-1">
          Damit kleine Stichproben nicht fehlinterpretiert werden, gelten diese
          Mindestwerte:
        </p>
        <ul className="mt-1 space-y-0.5">
          <li>
            – Mindestens {t.minImpCtrUrteil} Impressionen, bevor wir eine
            Klickrate bewerten
          </li>
          <li>
            – Mindestens {t.minImpReichweiteStark} Impressionen, bevor wir
            sagen „Pinterest pusht den Pin"
          </li>
          <li>
            – Mindestens {t.minKlicksNutzerSignal} Klicks, bevor wir sagen
            „Menschen klicken den Pin gerne"
          </li>
          <li>
            – Mindestens {t.minKlicksTopPerformer} Klicks für Top Performer-Status
          </li>
        </ul>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Schwellen ändern? →{' '}
        <Link
          href="/dashboard/einstellungen#pin-schwellwerte"
          className="font-medium text-red-600 hover:underline"
        >
          Einstellungen
        </Link>
      </p>
    </details>
  )
}

// Inline-Nischen-Einordnung neben einem Median-Wert. Zeigt nur etwas an,
// wenn eine Nischen-Range vorliegt UND der Wert auswertbar ist — sonst still.
const INLINE_EINORDNUNG_COLOR: Record<Einordnung['color'], string> = {
  green: 'text-green-700',
  gray: 'text-gray-500',
  orange: 'text-orange-700',
}
const INLINE_EINORDNUNG_LABEL: Record<Einordnung['label'], string> = {
  'top-performer': 'Top-Performer',
  überdurchschnittlich: 'überdurchschnittlich',
  durchschnittlich: 'durchschnittlich',
  'unter-durchschnitt': 'unter Branchenschnitt',
}

function InlineNicheEinordnung({
  value,
  range,
  nicheLabel,
}: {
  value: number | null
  range: Range | null
  nicheLabel: string | null
}) {
  if (
    !range ||
    !nicheLabel ||
    value === null ||
    !Number.isFinite(value)
  ) {
    return null
  }
  const e = getEinordnung(value, range)
  return (
    <span
      className={`ml-1 whitespace-nowrap text-[11px] font-medium ${INLINE_EINORDNUNG_COLOR[e.color]}`}
    >
      {' '}
      — {e.icon} {INLINE_EINORDNUNG_LABEL[e.label]} für {nicheLabel}
    </span>
  )
}

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

// ===========================================================
// „Zuletzt gelöscht" — Soft-Delete-Toggle
// ===========================================================
function DeletedPinsSection({
  deletedEntries,
}: {
  deletedEntries: DeletedPinEntry[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (deletedEntries.length === 0) return null

  function onRestore(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await restorePinAnalytics(fd)
      router.refresh()
    })
  }

  function onHardDeleteAll() {
    const ok = window.confirm(
      `Wirklich alle ${deletedEntries.length} gelöschten Einträge endgültig entfernen? Das kann nicht rückgängig gemacht werden.`
    )
    if (!ok) return
    startTransition(async () => {
      await hardDeleteAllDeletedPinAnalytics()
      router.refresh()
    })
  }

  return (
    <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-gray-900">
        🗑️ Zuletzt gelöscht ({deletedEntries.length} Eintr
        {deletedEntries.length === 1 ? 'ag' : 'äge'})
      </summary>
      <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {deletedEntries.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-medium text-gray-900">
                {d.pinTitel ?? <span className="text-gray-400">— ohne Titel —</span>}
              </p>
              <p className="text-gray-500">
                Zeitraum {formatDateDe(d.zeitraum_von)} –{' '}
                {formatDateDe(d.zeitraum_bis)}
                {' · '}
                Gelöscht: {formatDateTimeDe(d.deleted_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRestore(d.id)}
              disabled={isPending}
              className="shrink-0 rounded-md border border-green-600 bg-white px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Wiederherstellen
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={onHardDeleteAll}
          disabled={isPending}
          className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
        >
          Alle endgültig löschen
        </button>
      </div>
    </details>
  )
}

// Datum + Uhrzeit auf Deutsch — z.B. "05.05.2026, 14:32".
function formatDateTimeDe(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}`
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
