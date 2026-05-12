'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import {
  deleteBoardAnalytics,
  type UnmatchedBoard,
} from './actions'
import UnmatchedBoardsSection from './UnmatchedBoardsSection'
import BoardAnalyticsEditModal from './BoardAnalyticsEditModal'
import {
  BOARD_SCORE_BADGE,
  BOARD_SCORE_LABEL,
  BOARD_STATUS_BADGE,
  BOARD_STATUS_LABEL,
  boardScoreTooltip,
  calcBoardEngagementRate,
  diffDays,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  todayIso,
  type BoardAnalyticsEntry,
  type BoardAnalyticsRow,
  type BoardOption,
  type BoardThresholds,
} from './utils'
import InfoTooltip, { LabelWithTooltip } from '@/components/InfoTooltip'
import SharedSortableTh from '@/components/SortableTh'

export type BoardWithoutAnalytics = {
  id: string
  name: string
}

export default function BoardsTab({
  boards,
  boardAnalytics,
  boardHistory,
  thresholds,
  publicBoardsWithoutAnalytics = [],
  unmatchedBoards,
  unmatchedZeitraumVon,
  unmatchedZeitraumBis,
  onUnmatchedBoardResolved,
}: {
  boards: BoardOption[]
  boardAnalytics: BoardAnalyticsRow[]
  boardHistory: Record<string, BoardAnalyticsEntry[]>
  thresholds: BoardThresholds
  publicBoardsWithoutAnalytics?: BoardWithoutAnalytics[]
  unmatchedBoards: UnmatchedBoard[]
  unmatchedZeitraumVon: string
  unmatchedZeitraumBis: string
  onUnmatchedBoardResolved: (boardSlug: string) => void
}) {
  const [deletePending, startDeleteTransition] = useTransition()
  const router = useRouter()

  function onDelete(id: string) {
    startDeleteTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteBoardAnalytics(fd)
      router.refresh()
    })
  }

  // Bearbeiten-Modal: hält den aktuell editierten Eintrag (latest-Periode
  // des Boards). Null = geschlossen.
  type EditEntry = {
    id: string
    board_id: string
    boardName: string | null
    datum: string
    impressionen: number
    engagement: number
    klicks_auf_pins: number
    ausgehende_klicks: number
    saves: number
    pinterestUrl: string | null
  }
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null)

  function onEdit(row: BoardAnalyticsRow) {
    const r = row.latest
    setEditEntry({
      id: r.id,
      board_id: r.board_id,
      boardName: row.board.name,
      datum: r.datum,
      impressionen: r.impressionen,
      engagement: r.engagement,
      klicks_auf_pins: r.klicks_auf_pins,
      ausgehende_klicks: r.ausgehende_klicks,
      saves: r.saves,
      pinterestUrl: row.board.pinterest_url ?? null,
    })
  }

  return (
    <div className="space-y-6">
      <p style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
        Boards sind entscheidend für deine Reichweite auf Pinterest — korrekte
        Keywords im Board-Namen helfen Pinterest zu verstehen, worum es auf
        deinem Profil geht.
      </p>

      {publicBoardsWithoutAnalytics.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">
            Diese Boards sind angelegt und öffentlich, haben aber noch keine
            Analytics-Einträge:
          </p>
          <ul className="mt-2 space-y-1">
            {publicBoardsWithoutAnalytics.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="font-medium text-gray-900">{b.name}</span>
                <Link
                  href={`/dashboard/boards?edit=${b.id}`}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Board bearbeiten ↗
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <UnmatchedBoardsSection
        unmatchedBoards={unmatchedBoards}
        boards={boards}
        zeitraumVon={unmatchedZeitraumVon}
        zeitraumBis={unmatchedZeitraumBis}
        onAssigned={onUnmatchedBoardResolved}
        onSkipped={onUnmatchedBoardResolved}
      />

      <BoardAnalyticsTable
        rows={boardAnalytics}
        boardHistory={boardHistory}
        thresholds={thresholds}
        onDelete={onDelete}
        onEdit={onEdit}
        deleteDisabled={deletePending}
      />

      <ThresholdInfo thresholds={thresholds} />

      <BoardAnalyticsEditModal
        open={editEntry !== null}
        onClose={() => setEditEntry(null)}
        onSaved={() => router.refresh()}
        entry={editEntry}
        boards={boards}
      />
    </div>
  )
}

// ===========================================================
// Tabelle
// ===========================================================
type SortKey =
  | 'name'
  | 'impressionen'
  | 'klicks_auf_pins'
  | 'ausgehende_klicks'
  | 'saves'
  | 'interaktionen'
  | 'anzahl_pins'
  | 'engagement_rate'
  | 'score'
  | 'status'
  | 'zuletzt'
type SortDir = 'asc' | 'desc'

function compareRows(
  a: BoardAnalyticsRow,
  b: BoardAnalyticsRow,
  key: SortKey,
  dir: SortDir
): number {
  const sign = dir === 'asc' ? 1 : -1
  let res = 0
  switch (key) {
    case 'name':
      res = a.board.name.localeCompare(b.board.name, 'de')
      break
    case 'impressionen':
      res = a.latest.impressionen - b.latest.impressionen
      break
    case 'klicks_auf_pins':
      res = a.latest.klicks_auf_pins - b.latest.klicks_auf_pins
      break
    case 'ausgehende_klicks':
      res = a.latest.ausgehende_klicks - b.latest.ausgehende_klicks
      break
    case 'saves':
      res = a.latest.saves - b.latest.saves
      break
    case 'interaktionen':
      res = a.latest.engagement - b.latest.engagement
      break
    case 'anzahl_pins':
      res = (a.latest.anzahl_pins ?? -1) - (b.latest.anzahl_pins ?? -1)
      break
    case 'engagement_rate':
      res = (a.engagementRate ?? -Infinity) - (b.engagementRate ?? -Infinity)
      break
    case 'score':
      res = BOARD_SCORE_LABEL[a.score].localeCompare(
        BOARD_SCORE_LABEL[b.score],
        'de'
      )
      break
    case 'status':
      res = BOARD_STATUS_LABEL[a.status].localeCompare(
        BOARD_STATUS_LABEL[b.status],
        'de'
      )
      break
    case 'zuletzt':
      res = a.latest.datum.localeCompare(b.latest.datum)
      break
  }
  return res * sign
}

function BoardAnalyticsTable({
  rows,
  boardHistory,
  thresholds,
  onDelete,
  onEdit,
  deleteDisabled,
}: {
  rows: BoardAnalyticsRow[]
  boardHistory: Record<string, BoardAnalyticsEntry[]>
  thresholds: BoardThresholds
  onDelete: (id: string) => void
  onEdit: (row: BoardAnalyticsRow) => void
  deleteDisabled: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('impressionen')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const today = useMemo(() => todayIso(), [])

  // Scrollbar-Mirror oben: ein zweiter, dünner Container über der Tabelle,
  // dessen scrollLeft mit dem unteren Container synchronisiert wird. So sieht
  // der Nutzer die horizontale Scrollbar direkt unter den Spaltenüberschriften
  // statt erst am unteren Tabellenende.
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [tableWidth, setTableWidth] = useState(0)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const measure = () => setTableWidth(el.scrollWidth)
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [rows.length, expanded])

  function syncFromTop(e: React.UIEvent<HTMLDivElement>) {
    const body = bodyScrollRef.current
    const left = e.currentTarget.scrollLeft
    if (body && body.scrollLeft !== left) body.scrollLeft = left
  }
  function syncFromBody(e: React.UIEvent<HTMLDivElement>) {
    const top = topScrollRef.current
    const left = e.currentTarget.scrollLeft
    if (top && top.scrollLeft !== left) top.scrollLeft = left
  }

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

  function toggleExpand(boardId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(boardId)) next.delete(boardId)
      else next.add(boardId)
      return next
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Board-Analytics gespeichert. Lade deine ersten CSVs im
        Eingabe-Tab hoch.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        ref={topScrollRef}
        onScroll={syncFromTop}
        className="overflow-x-auto overflow-y-hidden"
      >
        <div style={{ width: tableWidth, height: 1 }} />
      </div>
      <div
        ref={bodyScrollRef}
        onScroll={syncFromBody}
        className="max-h-[600px] overflow-auto"
      >
        <table
          ref={tableRef}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>
                <span className="sr-only">Aufklappen</span>
              </Th>
              <SortableTh
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              >
                Board
              </SortableTh>
              <SortableTh
                sortKey="impressionen"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              >
                IMP
              </SortableTh>
              <SortableTh
                sortKey="klicks_auf_pins"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                info="Wie oft Nutzer auf einen Pin geklickt haben um ihn zu vergrößern — zählt NICHT als Website-Besucher. Für Traffic zählen nur Ausgehende Klicks."
              >
                PIN KLICKS
              </SortableTh>
              <SortableTh
                sortKey="ausgehende_klicks"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                info="Wie oft Nutzer von Pinterest auf deine Website weitergeleitet wurden — das ist die wichtigste Metrik für deinen Website-Traffic."
              >
                AUSG. KLICKS
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
                sortKey="interaktionen"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                info="Alle aktiven Handlungen mit Pins auf diesem Board: Klicks, Saves, Kommentare, Carousel-Swipes. Entspricht Interaktionen in den deutschen Pinterest Analytics."
              >
                Interaktionen
              </SortableTh>
              <SortableTh
                sortKey="anzahl_pins"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                info="Anzahl der Pins wie sie in deinen Pinterest-Analytics erscheint – nicht aus der internen Pin-Datenbank berechnet."
              >
                Anzahl Pins
              </SortableTh>
              <SortableTh
                sortKey="engagement_rate"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                info="Engagement Rate = Interaktionen / Impressionen."
              >
                ER
              </SortableTh>
              <SortableTh
                sortKey="score"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              >
                Board-Score
              </SortableTh>
              <SortableTh
                sortKey="status"
                current={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              >
                Board-Status
              </SortableTh>
              <Th>Handlung</Th>
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
              const daysSince = Math.max(0, diffDays(row.latest.datum, today))
              const isStale = daysSince >= 90
              const history = boardHistory[row.board.id] ?? []
              const hasHistory = history.length > 0
              const isOpen = expanded.has(row.board.id)
              return (
                <Fragment key={row.latest.id}>
                  <tr className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-2 py-3 text-sm">
                      {hasHistory ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.board.id)}
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
                      {row.board.pinterest_url ? (
                        <a
                          href={row.board.pinterest_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:underline"
                        >
                          {row.board.name}
                        </a>
                      ) : (
                        row.board.name
                      )}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      title={formatNumber(row.latest.impressionen)}
                    >
                      {formatZahl(row.latest.impressionen)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      title={formatNumber(row.latest.klicks_auf_pins)}
                    >
                      {formatZahl(row.latest.klicks_auf_pins)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      title={formatNumber(row.latest.ausgehende_klicks)}
                    >
                      {formatZahl(row.latest.ausgehende_klicks)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      title={formatNumber(row.latest.saves)}
                    >
                      {formatZahl(row.latest.saves)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      title={formatNumber(row.latest.engagement)}
                    >
                      {formatZahl(row.latest.engagement)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {row.latest.anzahl_pins === null ||
                      row.latest.anzahl_pins === undefined ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        formatZahl(row.latest.anzahl_pins)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatPercent(row.engagementRate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BOARD_SCORE_BADGE[row.score]}`}
                        >
                          {BOARD_SCORE_LABEL[row.score]}
                        </span>
                        <InfoTooltip
                          text={boardScoreTooltip({
                            score: row.score,
                            er: row.engagementRate,
                            erVormonat: row.engagementRateVormonat,
                            trendPct: row.trendPct,
                            dataInsufficient: row.dataInsufficient,
                            thresholds,
                          })}
                          className="text-gray-400"
                        />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BOARD_STATUS_BADGE[row.status]}`}
                        title={
                          row.lastPinDatum
                            ? `Letzter Pin: ${formatDateDe(row.lastPinDatum)} (${row.lastPinAlterTage} Tage)`
                            : 'Noch kein Pin auf diesem Board'
                        }
                      >
                        {BOARD_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-sm font-medium text-gray-800">
                      {row.handlung ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-sm ${
                        isStale ? 'font-medium text-orange-600' : 'text-gray-700'
                      }`}
                      title={
                        isStale
                          ? `Letzter Eintrag vor ${daysSince} Tagen — Zeit, dieses Board neu zu checken.`
                          : `Letzter Eintrag vor ${daysSince} Tagen`
                      }
                    >
                      {formatDateDe(row.latest.datum)}
                    </td>
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
                          onClick={() => onDelete(row.latest.id)}
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
                      <td colSpan={14} className="px-4 py-3">
                        <BoardTimeline history={history} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Aufklappbare Zeitreihe pro Board — neueste Periode oben.
function BoardTimeline({ history }: { history: BoardAnalyticsEntry[] }) {
  return (
    <div className="ml-6 overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Zeitraum
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              IMP
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Pin Klicks
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Ausg. Klicks
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Saves
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              ER
            </th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
              Vs. Vorher
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((row, i) => {
            const prev = history[i + 1]
            const er = calcBoardEngagementRate(
              row.engagement,
              row.impressionen
            )
            const prevEr = prev
              ? calcBoardEngagementRate(prev.engagement, prev.impressionen)
              : null
            return (
              <tr key={row.id} className="text-gray-700">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                  {formatDateDe(row.datum)}
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
                    value={row.klicks_auf_pins}
                    prev={prev?.klicks_auf_pins}
                    format="zahl"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InlineMetricDelta
                    value={row.ausgehende_klicks}
                    prev={prev?.ausgehende_klicks}
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
                  <InlineMetricDelta value={er} prev={prevEr} format="percent" />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {prev ? formatDateDe(prev.datum) : '—'}
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
  const title =
    format === 'zahl' && value !== null ? formatNumber(value) : undefined
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
  info,
  children,
}: {
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  info?: string
  children: string
}) {
  const activeDir = current === key ? dir : null
  return (
    <SharedSortableTh dir={activeDir} onClick={() => onSort(key)}>
      <LabelWithTooltip label={children} tooltip={info} />
    </SharedSortableTh>
  )
}

// ===========================================================
// Schwellwert-Info
// ===========================================================
function ThresholdInfo({ thresholds }: { thresholds: BoardThresholds }) {
  return (
    <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
      <summary className="cursor-pointer text-sm font-medium text-gray-900">
        Aktuelle Diagnose-Schwellwerte
      </summary>
      <div className="mt-2 space-y-3">
        <div>
          <p className="font-medium text-gray-900">Board-Status (Aktivität)</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              ✅ Aktiv: letzter Pin &lt;{' '}
              <strong>{thresholds.wenigAktiv}</strong> Tage
            </li>
            <li>
              ⚠️ Wenig aktiv: zwischen <strong>{thresholds.wenigAktiv}</strong>{' '}
              und <strong>{thresholds.inaktiv}</strong> Tagen
            </li>
            <li>
              ❌ Inaktiv: letzter Pin &gt;{' '}
              <strong>{thresholds.inaktiv}</strong> Tage
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-900">
            Board-Score (Daten-Performance)
          </p>
          <ul className="mt-1 space-y-0.5">
            <li>
              🏆 Top: ER &ge; <strong>{thresholds.topEr}%</strong> UND in den
              oberen <strong>{thresholds.topProzent}%</strong> des Profils
            </li>
            <li>
              📈 Wachstum: ER-Verbesserung zum Vormonat &ge;{' '}
              <strong>{thresholds.wachstumTrend}%</strong>
            </li>
            <li>
              💤 Schwach: ER &lt; <strong>{thresholds.schwachEr}%</strong> ODER
              ER-Verschlechterung &ge; <strong>{thresholds.wachstumTrend}%</strong>
            </li>
            <li>👀 Solide: alles andere</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
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
