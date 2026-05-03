'use client'

import Link from 'next/link'
import {
  useMemo,
  useState,
  useTransition,
  type ClipboardEvent,
  type FormEvent,
} from 'react'
import {
  deleteBoardAnalytics,
  saveBoardAnalytics,
  saveBoardAnalyticsBulk,
  type BoardAnalyticsBulkRow,
} from './actions'
import CopyStartDateButton from './CopyStartDateButton'
import {
  BOARD_SCORE_BADGE,
  BOARD_SCORE_LABEL,
  BOARD_STATUS_BADGE,
  BOARD_STATUS_LABEL,
  boardScoreTooltip,
  diffDays,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  todayIso,
  type BoardAnalyticsRow,
  type BoardOption,
  type BoardThresholds,
} from './utils'
import InfoTooltip, { LabelWithTooltip } from '@/components/InfoTooltip'
import SharedSortableTh from '@/components/SortableTh'

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

const cellInputCls =
  'block w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

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

type SingleFormState = {
  boardId: string
  datum: string
  impressionen: string
  klicks_auf_pins: string
  ausgehende_klicks: string
  saves: string
  engagement: string
  anzahl_pins: string
}

const EMPTY_FORM: SingleFormState = {
  boardId: '',
  datum: '',
  impressionen: '',
  klicks_auf_pins: '',
  ausgehende_klicks: '',
  saves: '',
  engagement: '',
  anzahl_pins: '',
}

export type BoardWithoutAnalytics = {
  id: string
  name: string
}

export default function BoardsTab({
  boards,
  boardAnalytics,
  thresholds,
  publicBoardsWithoutAnalytics = [],
}: {
  boards: BoardOption[]
  boardAnalytics: BoardAnalyticsRow[]
  thresholds: BoardThresholds
  publicBoardsWithoutAnalytics?: BoardWithoutAnalytics[]
}) {
  const [showBulk, setShowBulk] = useState(false)
  const [singleForm, setSingleForm] = useState<SingleFormState>({
    ...EMPTY_FORM,
    datum: todayIso(),
  })
  const [singlePending, startSingleTransition] = useTransition()
  const [singleFeedback, setSingleFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})
  const [deletePending, startDeleteTransition] = useTransition()

  function startEdit(row: BoardAnalyticsRow) {
    setSingleForm({
      boardId: row.board.id,
      datum: row.latest.datum,
      impressionen: String(row.latest.impressionen),
      klicks_auf_pins: String(row.latest.klicks_auf_pins),
      ausgehende_klicks: String(row.latest.ausgehende_klicks),
      saves: String(row.latest.saves),
      engagement: String(row.latest.engagement),
      anzahl_pins: String(row.latest.anzahl_pins ?? 0),
    })
    setSingleFeedback({})
    if (typeof window !== 'undefined') {
      const el = document.getElementById('board-analytics-single-form')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function onSingleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSingleFeedback({})
    const formData = new FormData(e.currentTarget)
    startSingleTransition(async () => {
      const result = await saveBoardAnalytics(formData)
      if (result.error) setSingleFeedback({ error: result.error })
      else setSingleFeedback({ saved: true })
    })
  }

  function onDelete(id: string) {
    startDeleteTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteBoardAnalytics(fd)
    })
  }

  return (
    <div className="space-y-6">
      <p style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
        Boards sind entscheidend für deine Reichweite auf Pinterest —
        korrekte Keywords im Board-Namen und der Board-Beschreibung helfen
        Pinterest zu verstehen worum es auf deinem Account geht und wem deine
        Pins gezeigt werden sollen.
      </p>

      {publicBoardsWithoutAnalytics.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">
            Diese Boards sind in deiner Boards-Datenbank angelegt und öffentlich
            aber haben noch keine Analytics-Einträge:
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

      <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-900">
          So findest du deine Zahlen
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600">
          <li>Pinterest öffnen → Analytics → Übersicht</li>
          <li>
            Zeitraum: „Benutzerdefiniert" → Startdatum 180 Tage zurück (sollte
            noch von der Pin-Eingabe eingestellt sein)
          </li>
          <li>
            Ans Ende der Seite scrollen → dort sind deine besten Pinnwände zu
            finden
          </li>
          <li>
            Über ein Board hovern → Statistiken erscheinen → Werte übertragen
          </li>
        </ol>
        <div className="mt-2">
          <CopyStartDateButton />
        </div>
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ Hinweis: Pinterest zeigt nur die erfolgreichsten 30 Boards der
          letzten 6 Monate an. Boards ohne Aktivität in diesem Zeitraum
          erscheinen möglicherweise nicht.
        </p>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowBulk((s) => !s)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {showBulk ? 'Bulk-Eingabe schließen' : 'Alle Boards aktualisieren'}
        </button>
        {boards.length === 0 && (
          <span className="text-sm text-gray-500">
            Du hast noch keine Boards angelegt.
          </span>
        )}
      </div>

      {showBulk && (
        <BulkBoardForm
          boards={boards}
          boardAnalytics={boardAnalytics}
          onClose={() => setShowBulk(false)}
        />
      )}

      <SingleBoardForm
        id="board-analytics-single-form"
        boards={boards}
        form={singleForm}
        setForm={setSingleForm}
        onSubmit={onSingleSubmit}
        isPending={singlePending}
        feedback={singleFeedback}
      />

      <BoardAnalyticsTable
        rows={boardAnalytics}
        thresholds={thresholds}
        onEdit={startEdit}
        onDelete={onDelete}
        deleteDisabled={deletePending}
      />

      <ThresholdInfo thresholds={thresholds} />
    </div>
  )
}

// ===========================================================
// Bulk-Eingabe
// ===========================================================
function BulkBoardForm({
  boards,
  boardAnalytics,
  onClose,
}: {
  boards: BoardOption[]
  boardAnalytics: BoardAnalyticsRow[]
  onClose: () => void
}) {
  const [datum, setDatum] = useState(todayIso())
  const [rows, setRows] = useState<Record<string, BulkRowState>>(() =>
    initialBulkRows(boards, boardAnalytics, todayIso())
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: number
    error?: string
  }>({})

  function onDatumChange(next: string) {
    setDatum(next)
    setRows(initialBulkRows(boards, boardAnalytics, next))
    setFeedback({})
  }

  function setCell(boardId: string, key: keyof BulkRowState, value: string) {
    setRows((prev) => ({
      ...prev,
      [boardId]: { ...prev[boardId], [key]: value },
    }))
  }

  // Paste-Distribution für Pinterest CSV (5 Werte): wenn der Nutzer in das
  // Impressionen-Feld einer Board-Zeile Tab-/Komma-/Whitespace-getrennte Zahlen
  // einfügt, werden diese auf Impressionen → Interaktionen → Pin-Klicks →
  // Ausgehende Klicks → Saves verteilt. Anzahl Pins bleibt leer (manuell).
  // Pinterest CSV-Reihenfolge: Impressions | Engagement | Pin clicks |
  //   Outbound clicks | Saves.
  function onImpressionsPaste(
    boardId: string,
    e: ClipboardEvent<HTMLInputElement>
  ) {
    const text = e.clipboardData.getData('text')
    if (!text) return
    // Tokens trennen an Tab, Komma, Semikolon oder mehrfachem Whitespace.
    const tokens = text
      .replace(/[\r\n]+/g, ' ')
      .split(/[\t,;\s]+/)
      .map((t) => t.replace(/[^\d-]/g, ''))
      .filter((t) => t.length > 0)
    if (tokens.length < 2) return // Einzelwert → normales Paste-Verhalten zulassen
    e.preventDefault()
    const [imp, eng, klicks, outbound, saves] = tokens
    setRows((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        impressionen: imp ?? prev[boardId].impressionen,
        engagement: eng ?? prev[boardId].engagement,
        klicks_auf_pins: klicks ?? prev[boardId].klicks_auf_pins,
        ausgehende_klicks: outbound ?? prev[boardId].ausgehende_klicks,
        saves: saves ?? prev[boardId].saves,
      },
    }))
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})

    const payload: BoardAnalyticsBulkRow[] = boards.map((b) => {
      const r = rows[b.id] ?? emptyBulkRow()
      return {
        board_id: b.id,
        impressionen: parseIntStr(r.impressionen),
        klicks_auf_pins: parseIntStr(r.klicks_auf_pins),
        ausgehende_klicks: parseIntStr(r.ausgehende_klicks),
        saves: parseIntStr(r.saves),
        engagement: parseIntStr(r.engagement),
        anzahl_pins: parseIntStr(r.anzahl_pins),
      }
    })

    startTransition(async () => {
      const result = await saveBoardAnalyticsBulk({ datum, rows: payload })
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: result.saved ?? 0 })
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Alle Boards aktualisieren
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Trage für jedes Board die Zahlen aus Pinterest Analytics ein.
            Boards ohne Eingabe werden übersprungen.
          </p>
        </div>
        <div>
          <label
            htmlFor="bulk_datum"
            className="block text-sm font-medium text-gray-700"
          >
            Analytics-Datum (heute, gilt für alle Boards){' '}
            <span className="text-red-600">*</span>
            <InfoTooltip text="Das Datum an dem du diese Analytics-Daten aus Pinterest exportiert hast — in der Regel das heutige Datum." />
          </label>
          <input
            id="bulk_datum"
            type="date"
            required
            value={datum}
            onChange={(e) => onDatumChange(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
        <span className="font-medium">Tipp:</span> Öffne die Pinterest CSV in
        OnlyOffice oder Excel. Kopiere die Zahlen einer Board-Zeile (ab Spalte
        Impressions bis Saves) und füge sie direkt in das Impressionen-Feld
        des entsprechenden Boards ein — die App verteilt die Werte automatisch.
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Board
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Impressionen
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Interaktionen
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pin-Klicks
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ausgehende Klicks
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Saves
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Anzahl Pins
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {boards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                  Noch keine Boards angelegt.
                </td>
              </tr>
            ) : (
              boards.map((b) => {
                const r = rows[b.id] ?? emptyBulkRow()
                return (
                  <tr key={b.id} className="align-top">
                    <td className="max-w-xs px-3 py-2 font-medium text-gray-900">
                      {b.name}
                    </td>
                    {(
                      [
                        'impressionen',
                        'engagement',
                        'klicks_auf_pins',
                        'ausgehende_klicks',
                        'saves',
                        'anzahl_pins',
                      ] as const
                    ).map((key) => (
                      <td key={key} className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={r[key]}
                          onChange={(e) => setCell(b.id, key, e.target.value)}
                          onPaste={
                            key === 'impressionen'
                              ? (e) => onImpressionsPaste(b.id, e)
                              : undefined
                          }
                          className={cellInputCls}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || boards.length === 0}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Speichert…' : 'Alle speichern'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Schließen
        </button>
        {feedback.saved !== undefined && (
          <span className="text-sm text-green-700">
            ✓ {feedback.saved} Boards gespeichert
          </span>
        )}
        {feedback.error && (
          <span className="text-sm text-red-700">{feedback.error}</span>
        )}
      </div>
    </form>
  )
}

type BulkRowState = {
  impressionen: string
  klicks_auf_pins: string
  ausgehende_klicks: string
  saves: string
  engagement: string
  anzahl_pins: string
}

function emptyBulkRow(): BulkRowState {
  return {
    impressionen: '',
    klicks_auf_pins: '',
    ausgehende_klicks: '',
    saves: '',
    engagement: '',
    anzahl_pins: '',
  }
}

function initialBulkRows(
  boards: BoardOption[],
  boardAnalytics: BoardAnalyticsRow[],
  datum: string
): Record<string, BulkRowState> {
  const out: Record<string, BulkRowState> = {}
  for (const b of boards) {
    const existing = boardAnalytics.find(
      (ba) => ba.board.id === b.id && ba.latest.datum === datum
    )
    if (existing) {
      out[b.id] = {
        impressionen: String(existing.latest.impressionen),
        klicks_auf_pins: String(existing.latest.klicks_auf_pins),
        ausgehende_klicks: String(existing.latest.ausgehende_klicks),
        saves: String(existing.latest.saves),
        engagement: String(existing.latest.engagement),
        anzahl_pins: String(existing.latest.anzahl_pins ?? 0),
      }
    } else {
      out[b.id] = emptyBulkRow()
    }
  }
  return out
}

function parseIntStr(s: string): number {
  const n = Number(s)
  if (!Number.isFinite(n)) return 0
  return Math.trunc(n)
}

// ===========================================================
// Einzeleingabe
// ===========================================================
function SingleBoardForm({
  id,
  boards,
  form,
  setForm,
  onSubmit,
  isPending,
  feedback,
}: {
  id: string
  boards: BoardOption[]
  form: SingleFormState
  setForm: (s: SingleFormState) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isPending: boolean
  feedback: { saved?: boolean; error?: string }
}) {
  function set<K extends keyof SingleFormState>(
    key: K,
    value: SingleFormState[K]
  ) {
    setForm({ ...form, [key]: value })
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm scroll-mt-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Einzelnes Board eintragen
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Für schnelle Updates eines einzelnen Boards. Ist für Datum + Board
          bereits ein Eintrag vorhanden, wird er aktualisiert.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Board" htmlFor="single_board_id" required>
          <select
            id="single_board_id"
            name="board_id"
            required
            value={form.boardId}
            onChange={(e) => set('boardId', e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Analytics-Datum (heute)"
          htmlFor="single_datum"
          required
          tooltip="Das Datum an dem du diese Analytics-Daten aus Pinterest exportiert hast — in der Regel das heutige Datum."
        >
          <input
            id="single_datum"
            name="datum"
            type="date"
            required
            value={form.datum}
            onChange={(e) => set('datum', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <NumField
          label="Impressionen"
          name="impressionen"
          value={form.impressionen}
          onChange={(v) => set('impressionen', v)}
        />
        <NumField
          label="Pin Klicks"
          name="klicks_auf_pins"
          value={form.klicks_auf_pins}
          onChange={(v) => set('klicks_auf_pins', v)}
        />
        <NumField
          label="Ausgehende Klicks"
          name="ausgehende_klicks"
          value={form.ausgehende_klicks}
          onChange={(v) => set('ausgehende_klicks', v)}
        />
        <NumField
          label="Saves"
          name="saves"
          value={form.saves}
          onChange={(v) => set('saves', v)}
        />
        <NumField
          label="Interaktionen"
          name="engagement"
          value={form.engagement}
          onChange={(v) => set('engagement', v)}
        />
        <NumField
          label="Anzahl Pins (Pinterest)"
          name="anzahl_pins"
          value={form.anzahl_pins}
          onChange={(v) => set('anzahl_pins', v)}
          info="Anzahl der Pins wie sie in deinen Pinterest-Analytics erscheint – nicht aus der internen Pin-Datenbank berechnet."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !form.boardId}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
    </form>
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
  thresholds,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  rows: BoardAnalyticsRow[]
  thresholds: BoardThresholds
  onEdit: (row: BoardAnalyticsRow) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('impressionen')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
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

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Board-Analytics gespeichert. Trage oben deine Zahlen ein.
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
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
              Impressionen
            </SortableTh>
            <SortableTh
              sortKey="klicks_auf_pins"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              info="Wie oft Nutzer auf einen Pin geklickt haben um ihn zu vergrößern — zählt NICHT als Website-Besucher. Für Traffic zählen nur Ausgehende Klicks."
            >
              Pin-Klicks
            </SortableTh>
            <SortableTh
              sortKey="ausgehende_klicks"
              current={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              info="Wie oft Nutzer von Pinterest auf deine Website weitergeleitet wurden — das ist die wichtigste Metrik für deinen Website-Traffic."
            >
              Ausgehende Klicks
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
            >
              Engagement Rate
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
            return (
              <tr key={row.latest.id} className="align-top hover:bg-gray-50">
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
            )
          })}
        </tbody>
      </table>
    </div>
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

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
function Field({
  label,
  htmlFor,
  required,
  tooltip,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      {children}
    </div>
  )
}

function NumField({
  label,
  name,
  value,
  onChange,
  info,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  info?: string
}) {
  return (
    <div>
      <label
        htmlFor={`single_${name}`}
        className="block text-sm font-medium text-gray-700"
      >
        <LabelWithTooltip label={label} tooltip={info} />
      </label>
      <input
        id={`single_${name}`}
        name={name}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  )
}
