'use client'

import { useSearchParams } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import SortableTh from '@/components/SortableTh'
import {
  addPin,
  deletePin,
  importPins,
  updatePin,
  type ImportPinRow,
} from './actions'
import {
  buildPrompt,
  CONVERSION_BADGE,
  CONVERSION_LABEL,
  CONVERSION_ZIELE,
  countWords,
  formatDateDe,
  HOOK_ART_LABEL,
  HOOK_ARTEN,
  KEYWORD_TYP_BADGE,
  KEYWORD_TYP_EMOJI,
  KEYWORD_TYP_LABEL,
  KEYWORD_TYPEN,
  PIN_FORMAT_BADGE,
  PIN_FORMAT_LABEL,
  PIN_FORMATE,
  STATUS,
  STATUS_BADGE,
  STATUS_LABEL,
  STRATEGIE_BADGE,
  STRATEGIE_LABEL,
  STRATEGIE_TYPEN,
  type BoardOption,
  type CanvaVorlageOption,
  type ContentOption,
  type ConversionZiel,
  type HookArt,
  type KeywordOption,
  type PinFormat,
  type PinWithRelations,
  type SaisonEventOption,
  type Status,
  type StrategieTyp,
  type ZielUrlOption,
} from './utils'

type Props = {
  pins: PinWithRelations[]
  contents: ContentOption[]
  keywords: KeywordOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  vorlagen: CanvaVorlageOption[]
  saisonEvents: SaisonEventOption[]
  comboCount: Record<string, number>
  customSignalwoerter: string | null
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

export default function PinProduktionClient(props: Props) {
  const searchParams = useSearchParams()
  const [editing, setEditing] = useState<PinWithRelations | null>(() => {
    const editId = searchParams?.get('edit')
    if (!editId) return null
    return props.pins.find((p) => p.id === editId) ?? null
  })
  const [showAddForm, setShowAddForm] = useState(
    () =>
      searchParams?.get('new') === '1' ||
      searchParams?.get('open') === 'new'
  )

  // Wenn sich der edit-Param ändert (z.B. nach Server-Action-Redirect),
  // den passenden Pin in den Edit-Modus setzen.
  const editParam = searchParams?.get('edit') ?? null
  useEffect(() => {
    if (!editParam) return
    const target = props.pins.find((p) => p.id === editParam)
    if (target && target.id !== editing?.id) {
      setEditing(target)
      setShowAddForm(false)
    }
  }, [editParam, props.pins, editing?.id])
  const [showManualForm, setShowManualForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Highlight-Pin aus ?highlight=<id> — temporäre Hervorhebung in der Tabelle.
  // Wird auf null gesetzt nach 4s oder bei Mausbewegung (mit 800ms Karenzzeit,
  // damit der Nutzer Zeit hat, den Pin überhaupt wahrzunehmen).
  const highlightParam = searchParams?.get('highlight') ?? null
  const [highlightId, setHighlightId] = useState<string | null>(highlightParam)
  useEffect(() => {
    if (highlightParam !== null) setHighlightId(highlightParam)
  }, [highlightParam])
  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`pin-row-${highlightId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    let mouseListener: ((e: MouseEvent) => void) | null = null
    const armMouse = setTimeout(() => {
      mouseListener = () => setHighlightId(null)
      window.addEventListener('mousemove', mouseListener, { once: true })
    }, 800)
    const fadeTimer = setTimeout(() => setHighlightId(null), 4000)
    return () => {
      clearTimeout(armMouse)
      clearTimeout(fadeTimer)
      if (mouseListener) window.removeEventListener('mousemove', mouseListener)
    }
  }, [highlightId])

  const formOpen = showAddForm || editing !== null

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setShowManualForm(false)
    setShowCsvImport(false)
  }

  function openManual() {
    setEditing(null)
    setShowManualForm(true)
    setShowAddForm(false)
    setShowCsvImport(false)
  }

  function openEdit(pin: PinWithRelations) {
    setEditing(pin)
    setShowAddForm(false)
    setShowManualForm(false)
    setShowCsvImport(false)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
  }

  function closeManual() {
    setShowManualForm(false)
  }

  function toggleCsvImport() {
    setShowCsvImport((s) => !s)
    setShowAddForm(false)
    setShowManualForm(false)
    setEditing(null)
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deletePin(fd)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (formOpen ? closeForm() : openAdd())}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {formOpen ? 'Abbrechen' : 'Neuen Pin erstellen'}
        </button>
        <button
          type="button"
          onClick={() =>
            showManualForm ? closeManual() : openManual()
          }
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showManualForm ? 'Abbrechen' : '✍️ Pin manuell eintragen'}
        </button>
        <button
          type="button"
          onClick={toggleCsvImport}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showCsvImport ? 'Import schließen' : '📥 Pins importieren'}
        </button>
      </div>

      {showCsvImport && (
        <CsvImport
          contents={props.contents}
          boards={props.boards}
          urls={props.urls}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {formOpen && (
        <PinForm
          key={editing?.id ?? 'new'}
          editing={editing}
          defaultBoardId={
            editing ? null : (searchParams?.get('board') ?? null)
          }
          defaultSaisonEventId={
            editing ? null : (searchParams?.get('saison_event_id') ?? null)
          }
          defaultContentId={
            editing ? null : (searchParams?.get('content_id') ?? null)
          }
          contents={props.contents}
          keywords={props.keywords}
          boards={props.boards}
          urls={props.urls}
          vorlagen={props.vorlagen}
          saisonEvents={props.saisonEvents}
          comboCount={props.comboCount}
          customSignalwoerter={props.customSignalwoerter}
          onClose={closeForm}
        />
      )}

      {showManualForm && (
        <ManualPinForm
          contents={props.contents}
          boards={props.boards}
          urls={props.urls}
          vorlagen={props.vorlagen}
          saisonEvents={props.saisonEvents}
          comboCount={props.comboCount}
          onClose={closeManual}
        />
      )}

      <PinTable
        pins={props.pins}
        boards={props.boards}
        contents={props.contents}
        vorlagen={props.vorlagen}
        urls={props.urls}
        highlightId={highlightId}
        onEdit={openEdit}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />
    </div>
  )
}

// ===========================================================
// Tabelle
// ===========================================================
type SortKey =
  | 'titel'
  | 'board'
  | 'status'
  | 'datum'
  | 'strategie'
  | 'format'

type DatumFilter =
  | ''
  | 'week'
  | 'month'
  | 'past'
  | 'future'
  | 'none'

// Sentinel-Wert für „Keine Angabe" — matched auf NULL / '' / undefined.
// Bewusst doppelte Unterstriche, damit es nie mit echten Enum-Werten oder
// UUIDs kollidiert.
const NONE = '__none__' as const
type NoneFilter = typeof NONE

type Filters = {
  search: string
  status: '' | Status
  datum: DatumFilter
  strategie: '' | StrategieTyp | NoneFilter
  conversion: '' | ConversionZiel | NoneFilter
  format: '' | PinFormat | NoneFilter
  boardId: string
  contentId: string
  vorlageId: string
  urlId: string
}

const EMPTY_FILTERS: Filters = {
  search: '',
  status: '',
  datum: '',
  strategie: '',
  conversion: '',
  format: '',
  boardId: '',
  contentId: '',
  vorlageId: '',
  urlId: '',
}

// Liest die unterstützten ?filter[…]=… Query-Parameter und liefert ein
// Filters-Objekt für die initiale Tabellen-Anzeige. Aktuell unterstützt:
// strategie, conversion_ziel, format, board, content, vorlage, url.
// Wert „keine-angabe" → NONE-Sentinel (deckt NULL / '' / undefined ab).
function filtersFromSearchParams(
  params: URLSearchParams | null
): Filters {
  if (!params) return EMPTY_FILTERS
  const next: Filters = { ...EMPTY_FILTERS }
  const isNone = (v: string | null) => v === 'keine-angabe'
  if (isNone(params.get('filter[strategie]'))) next.strategie = NONE
  if (isNone(params.get('filter[conversion_ziel]'))) next.conversion = NONE
  if (isNone(params.get('filter[format]'))) next.format = NONE
  if (isNone(params.get('filter[board]'))) next.boardId = NONE
  if (isNone(params.get('filter[content]'))) next.contentId = NONE
  if (isNone(params.get('filter[vorlage]'))) next.vorlageId = NONE
  if (isNone(params.get('filter[url]'))) next.urlId = NONE
  return next
}

const DATUM_LABEL: Record<Exclude<DatumFilter, ''>, string> = {
  week: 'Diese Woche',
  month: 'Diesen Monat',
  past: 'Vergangene',
  future: 'Zukünftige',
  none: 'Kein Datum',
}

// Liefert Montag (inkl.) und folgenden Montag (excl.) der laufenden Woche als
// ISO-Date-Strings, lokale Zeitzone. ISO 8601 / DE: Woche beginnt am Montag.
function currentWeekRange(): { start: string; endExcl: string } {
  const now = new Date()
  const day = now.getDay() // 0 = So, 1 = Mo, …
  const diffToMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - diffToMonday)
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(monday), endExcl: fmt(nextMonday) }
}

function currentMonthRange(): { start: string; endExcl: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const endExcl = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), endExcl: fmt(endExcl) }
}

function todayLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function PinTable({
  pins,
  boards,
  contents,
  vorlagen,
  urls,
  highlightId,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  pins: PinWithRelations[]
  boards: BoardOption[]
  contents: ContentOption[]
  vorlagen: CanvaVorlageOption[]
  urls: ZielUrlOption[]
  highlightId: string | null
  onEdit: (pin: PinWithRelations) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromSearchParams(searchParams)
  )
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(
    null
  )

  // Wenn ein Highlight-Sprung von außen kommt, Filter zurücksetzen — sonst
  // könnte der gesuchte Pin durch einen aktiven Filter ausgeblendet sein.
  useEffect(() => {
    if (highlightId) setFilters(EMPTY_FILTERS)
  }, [highlightId])

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
  }

  function toggleSort(key: SortKey) {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' }
      if (cur.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  function dirOf(key: SortKey): 'asc' | 'desc' | null {
    return sort && sort.key === key ? sort.dir : null
  }

  const activeFilterCount = useMemo(
    () =>
      (Object.keys(filters) as (keyof Filters)[]).filter((k) => filters[k] !== '')
        .length,
    [filters]
  )

  const filteredPins = useMemo(() => {
    const week = currentWeekRange()
    const month = currentMonthRange()
    const today = todayLocalIso()
    const searchTerm = filters.search.trim().toLowerCase()
    return pins.filter((p) => {
      if (searchTerm) {
        const haystack = [
          p.titel,
          p.hook,
          p.beschreibung,
          p.call_to_action,
          p.board?.name,
          p.content?.titel,
          p.url?.titel,
          p.url?.url,
          p.vorlage?.name,
          p.saison_event?.event_name,
          ...p.keywords.map((k) => k.keyword),
        ]
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(searchTerm)) return false
      }
      if (filters.status && p.status !== filters.status) return false
      if (filters.strategie) {
        if (filters.strategie === NONE) {
          if (p.strategie_typ && p.strategie_typ.trim() !== '') return false
        } else if (p.strategie_typ !== filters.strategie) {
          return false
        }
      }
      if (filters.conversion) {
        if (filters.conversion === NONE) {
          if (p.conversion_ziel && p.conversion_ziel.trim() !== '') return false
        } else if (p.conversion_ziel !== filters.conversion) {
          return false
        }
      }
      if (filters.format) {
        if (filters.format === NONE) {
          if (p.pin_format && p.pin_format.trim() !== '') return false
        } else if (p.pin_format !== filters.format) {
          return false
        }
      }
      if (filters.boardId) {
        if (filters.boardId === NONE) {
          if (p.board_id) return false
        } else if (p.board_id !== filters.boardId) {
          return false
        }
      }
      if (filters.contentId) {
        if (filters.contentId === NONE) {
          if (p.content_id) return false
        } else if (p.content_id !== filters.contentId) {
          return false
        }
      }
      if (filters.vorlageId) {
        if (filters.vorlageId === NONE) {
          if (p.canva_vorlage_id) return false
        } else if (p.canva_vorlage_id !== filters.vorlageId) {
          return false
        }
      }
      if (filters.urlId) {
        if (filters.urlId === NONE) {
          if (p.ziel_url_id) return false
        } else if (p.ziel_url_id !== filters.urlId) {
          return false
        }
      }
      if (filters.datum) {
        const d = p.geplante_veroeffentlichung
        if (filters.datum === 'none') {
          if (d) return false
        } else if (!d) {
          return false
        } else if (filters.datum === 'week') {
          if (d < week.start || d >= week.endExcl) return false
        } else if (filters.datum === 'month') {
          if (d < month.start || d >= month.endExcl) return false
        } else if (filters.datum === 'past') {
          if (d >= today) return false
        } else if (filters.datum === 'future') {
          if (d < today) return false
        }
      }
      return true
    })
  }, [pins, filters])

  const sortedPins = useMemo(() => {
    if (!sort) return filteredPins
    const dir = sort.dir === 'asc' ? 1 : -1
    const arr = [...filteredPins]
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'titel': {
          const aN = (a.titel ?? '').toLowerCase()
          const bN = (b.titel ?? '').toLowerCase()
          if (aN === '' && bN !== '') return 1
          if (bN === '' && aN !== '') return -1
          return aN.localeCompare(bN, 'de') * dir
        }
        case 'board': {
          const aN = a.board?.name?.toLowerCase() ?? ''
          const bN = b.board?.name?.toLowerCase() ?? ''
          if (aN === '' && bN !== '') return 1
          if (bN === '' && aN !== '') return -1
          return aN.localeCompare(bN, 'de') * dir
        }
        case 'status': {
          const ai = STATUS.indexOf(a.status)
          const bi = STATUS.indexOf(b.status)
          return (ai - bi) * dir
        }
        case 'datum': {
          const aD = a.geplante_veroeffentlichung ?? ''
          const bD = b.geplante_veroeffentlichung ?? ''
          if (aD === '' && bD !== '') return 1
          if (bD === '' && aD !== '') return -1
          return aD.localeCompare(bD) * dir
        }
        case 'strategie': {
          const ai = a.strategie_typ
            ? STRATEGIE_TYPEN.indexOf(a.strategie_typ)
            : Infinity
          const bi = b.strategie_typ
            ? STRATEGIE_TYPEN.indexOf(b.strategie_typ)
            : Infinity
          if (ai === Infinity && bi !== Infinity) return 1
          if (bi === Infinity && ai !== Infinity) return -1
          return (ai - bi) * dir
        }
        case 'format': {
          const ai = a.pin_format ? PIN_FORMATE.indexOf(a.pin_format) : Infinity
          const bi = b.pin_format ? PIN_FORMATE.indexOf(b.pin_format) : Infinity
          if (ai === Infinity && bi !== Infinity) return 1
          if (bi === Infinity && ai !== Infinity) return -1
          return (ai - bi) * dir
        }
      }
    })
    return arr
  }, [filteredPins, sort])

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSearch
            value={filters.search}
            onChange={(v) => setFilter('search', v)}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter('status', v as Filters['status'])}
            options={[
              { value: '', label: 'Alle' },
              ...STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            ]}
          />
          <FilterSelect
            label="Veröffentlichung"
            value={filters.datum}
            onChange={(v) => setFilter('datum', v as DatumFilter)}
            options={[
              { value: '', label: 'Alle' },
              { value: 'week', label: DATUM_LABEL.week },
              { value: 'month', label: DATUM_LABEL.month },
              { value: 'past', label: DATUM_LABEL.past },
              { value: 'future', label: DATUM_LABEL.future },
              { value: 'none', label: DATUM_LABEL.none },
            ]}
          />
          <FilterSelect
            label="Strategie"
            value={filters.strategie}
            onChange={(v) => setFilter('strategie', v as Filters['strategie'])}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...STRATEGIE_TYPEN.map((s) => ({
                value: s,
                label: STRATEGIE_LABEL[s],
              })),
            ]}
          />
          <FilterSelect
            label="Conversion Ziel"
            value={filters.conversion}
            onChange={(v) => setFilter('conversion', v as Filters['conversion'])}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...CONVERSION_ZIELE.map((c) => ({
                value: c,
                label: CONVERSION_LABEL[c],
              })),
            ]}
          />
          <FilterSelect
            label="Pin Format"
            value={filters.format}
            onChange={(v) => setFilter('format', v as Filters['format'])}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...PIN_FORMATE.map((f) => ({
                value: f,
                label: PIN_FORMAT_LABEL[f],
              })),
            ]}
          />
          <FilterSelect
            label="Board"
            value={filters.boardId}
            onChange={(v) => setFilter('boardId', v)}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...boards.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <FilterSelect
            label="Content"
            value={filters.contentId}
            onChange={(v) => setFilter('contentId', v)}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...contents.map((c) => ({ value: c.id, label: c.titel })),
            ]}
          />
          <FilterSelect
            label="Vorlage"
            value={filters.vorlageId}
            onChange={(v) => setFilter('vorlageId', v)}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...vorlagen.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
          <FilterSelect
            label="URL"
            value={filters.urlId}
            onChange={(v) => setFilter('urlId', v)}
            options={[
              { value: '', label: 'Alle' },
              { value: NONE, label: 'Keine Angabe' },
              ...urls.map((u) => ({ value: u.id, label: u.titel || u.url })),
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-600">
            <span className="font-medium text-gray-900">{sortedPins.length}</span>{' '}
            von {pins.length} Pins
          </span>
          {activeFilterCount > 0 && (
            <>
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {activeFilterCount} Filter aktiv
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="font-medium text-red-600 hover:underline"
              >
                Alle zurücksetzen
              </button>
            </>
          )}
        </div>
      </div>

      <TableWithTopScrollbar>
        <table className="min-w-max divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <SortableTh dir={dirOf('titel')} onClick={() => toggleSort('titel')}>
                Titel
              </SortableTh>
              <SortableTh dir={dirOf('board')} onClick={() => toggleSort('board')}>
                Board
              </SortableTh>
              <Th>Content</Th>
              <Th>Hook</Th>
              <Th>Beschreibung</Th>
              <SortableTh dir={dirOf('status')} onClick={() => toggleSort('status')}>
                Status
              </SortableTh>
              <SortableTh dir={dirOf('datum')} onClick={() => toggleSort('datum')}>
                Veröffentlichung
              </SortableTh>
              <SortableTh dir={dirOf('strategie')} onClick={() => toggleSort('strategie')}>
                Strategie
              </SortableTh>
              <Th>Conversion</Th>
              <SortableTh dir={dirOf('format')} onClick={() => toggleSort('format')}>
                Format
              </SortableTh>
              <Th>Vorlage</Th>
              <Th>URL</Th>
              <Th align="right">Aktion</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPins.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {pins.length === 0
                    ? 'Noch keine Pins. Lege einen über das Formular an.'
                    : 'Keine Pins entsprechen den aktiven Filtern.'}
                </td>
              </tr>
            ) : (
              sortedPins.map((pin) => (
              <tr
                key={pin.id}
                id={`pin-row-${pin.id}`}
                className={`align-top transition-colors duration-700 ${
                  pin.id === highlightId
                    ? 'bg-amber-100 ring-2 ring-amber-300 ring-inset'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="max-w-xs px-4 py-3 text-sm font-medium text-gray-900">
                  {pin.titel ?? <span className="text-gray-400">—</span>}
                  {pin.variante_typ && (
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        pin.variante_typ === 'recycling'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                      title={
                        pin.variante_von_titel
                          ? `${pin.variante_typ === 'recycling' ? 'Recycling' : 'Variante'} von „${pin.variante_von_titel}"`
                          : `${pin.variante_typ === 'recycling' ? 'Recycling' : 'Variante'} (Original-Pin gelöscht)`
                      }
                    >
                      {pin.variante_typ === 'recycling' ? '♻️' : '🔁'}{' '}
                      {pin.variante_typ === 'recycling' ? 'Recycling' : 'Variante'}
                      {pin.variante_von_titel && (
                        <span className="ml-1 max-w-[160px] truncate text-gray-700">
                          von „{pin.variante_von_titel}"
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.board?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.content?.titel ?? (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.hook ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.beschreibung ? (
                    <span
                      className="line-clamp-2 break-words"
                      title={pin.beschreibung}
                    >
                      {pin.beschreibung}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[pin.status]}`}
                  >
                    {STATUS_LABEL[pin.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDateDe(pin.geplante_veroeffentlichung)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.strategie_typ ? (
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGIE_BADGE[pin.strategie_typ]}`}
                    >
                      {STRATEGIE_LABEL[pin.strategie_typ]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.conversion_ziel ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONVERSION_BADGE[pin.conversion_ziel]}`}
                    >
                      {CONVERSION_LABEL[pin.conversion_ziel]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pin.pin_format ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PIN_FORMAT_BADGE[pin.pin_format]}`}
                    >
                      {PIN_FORMAT_LABEL[pin.pin_format]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {pin.vorlage?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="min-w-[200px] max-w-xs px-4 py-3 text-sm text-gray-700">
                  {pin.url ? (
                    <span className="block [word-break:break-all]" title={pin.url.titel}>
                      {pin.url.url}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(pin)}
                      className="text-gray-500 hover:text-gray-900"
                      aria-label="Bearbeiten"
                      title="Bearbeiten"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(pin.id)}
                      disabled={deleteDisabled}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWithTopScrollbar>
    </div>
  )
}

// Tabellen-Wrapper mit horizontalem Scrollbalken oben fixiert.
//
// Pattern: zwei separate Scroll-Container nebeneinander, deren scrollLeft
// synchronisiert wird. Oben ein dünner Spacer-Streifen mit derselben Breite
// wie die Tabelle, darunter der eigentliche Tabellen-Container.
//
// Warum nicht rotateX(180deg)? Der innere `overflow-y: auto`-Container
// promotet `overflow-x` automatisch zu `auto` (CSS-Spec), was horizontalen
// Overflow „fängt" bevor er den rotierten äußeren Container erreicht — der
// Top-Scrollbalken erschiene nie. Der Sync-Ansatz ist robust und arbeitet
// mit dem normalen Browser-Scrollbar-Verhalten.
function TableWithTopScrollbar({
  children,
}: {
  children: React.ReactNode
}) {
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const update = () => {
      const t = el.querySelector('table')
      if (t) setContentWidth(t.scrollWidth)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const t = el.querySelector('table')
    if (t) ro.observe(t)
    return () => ro.disconnect()
  }, [children])

  // scrollLeft-Sync ohne Flag-Race-Conditions: Idempotenter Vergleich.
  // Wenn beide Container schon dieselbe Position haben, no-op → kein
  // Feedback-Loop, auch bei schnellem Scrollen.
  function syncFrom(source: 'top' | 'table') {
    const top = topScrollRef.current
    const table = tableScrollRef.current
    if (!top || !table) return
    if (source === 'top') {
      if (table.scrollLeft !== top.scrollLeft) {
        table.scrollLeft = top.scrollLeft
      }
    } else {
      if (top.scrollLeft !== table.scrollLeft) {
        top.scrollLeft = table.scrollLeft
      }
    }
  }

  // Top-Scrollbar IMMER sichtbar erzwingen (auch auf macOS mit auto-
  // versteckten Overlay-Scrollbars). Inline-Styles machen sie zu „klassischen"
  // Scrollbalken mit fester Höhe — sonst wäre der Top-Bar nicht zu sehen,
  // bevor man scrollt.
  const forceVisibleScrollbar: React.CSSProperties = {
    overflowX: 'scroll',
    scrollbarWidth: 'thin',
    WebkitOverflowScrolling: 'touch',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        ref={topScrollRef}
        onScroll={() => syncFrom('top')}
        style={forceVisibleScrollbar}
        className="force-scrollbar border-b border-gray-200"
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div
        ref={tableScrollRef}
        onScroll={() => syncFrom('table')}
        className="max-h-[800px] overflow-auto"
      >
        {children}
      </div>
      {/*
        WebKit (Safari/Chrome auf macOS) zeigt Overlay-Scrollbars in
        leeren Containern manchmal gar nicht. Inline-CSS via <style>:
        Klassen-Ziel `force-scrollbar` bekommt explizit eine WebKit-
        Scrollbar mit 10px Höhe und sichtbarem Thumb. Greift nicht in
        andere Bereiche.
      */}
      <style>{`
        .force-scrollbar::-webkit-scrollbar {
          height: 10px;
          -webkit-appearance: none;
        }
        .force-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.04);
        }
        .force-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.35);
          border-radius: 5px;
        }
        .force-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.55);
        }
      `}</style>
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

function FilterSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const id = 'filter_suche'
  return (
    <div className="min-w-[220px] flex-1 sm:max-w-[320px]">
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        Suche
      </label>
      <div className="relative mt-1">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 104.472 10.03l3.249 3.25a1 1 0 001.414-1.415l-3.249-3.25A6 6 0 009 3zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Titel, Hook, Beschreibung, Keyword …"
          className="block w-full rounded-md border border-gray-300 bg-white pl-7 pr-7 py-1.5 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
            aria-label="Suche zurücksetzen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const id = `filter_${label.toLowerCase().replace(/\s+/g, '_')}`
  return (
    <div className="min-w-[140px]">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-600"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ===========================================================
// Formular (zwei-stufig)
// ===========================================================
function PinForm({
  editing,
  defaultBoardId,
  contents,
  keywords,
  boards,
  urls,
  vorlagen,
  saisonEvents,
  comboCount,
  customSignalwoerter,
  onClose,
  defaultSaisonEventId,
  defaultContentId,
}: {
  editing: PinWithRelations | null
  defaultBoardId?: string | null
  defaultSaisonEventId?: string | null
  defaultContentId?: string | null
  contents: ContentOption[]
  keywords: KeywordOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  vorlagen: CanvaVorlageOption[]
  saisonEvents: SaisonEventOption[]
  comboCount: Record<string, number>
  customSignalwoerter: string | null
  onClose: () => void
}) {
  const isEdit = editing !== null

  // Stage 1
  const [contentId, setContentId] = useState(
    editing?.content_id ?? defaultContentId ?? ''
  )
  const [themaKontext, setThemaKontext] = useState('')
  const [keywordIds, setKeywordIds] = useState<string[]>(
    editing?.keywords.map((k) => k.id) ?? []
  )
  const [boardId, setBoardId] = useState(
    editing?.board_id ?? defaultBoardId ?? ''
  )
  const [strategieTyp, setStrategieTyp] = useState<StrategieTyp | ''>(
    editing?.strategie_typ ?? ''
  )
  const [conversionZiel, setConversionZiel] = useState<ConversionZiel | ''>(
    editing?.conversion_ziel ?? ''
  )
  const [hookArt, setHookArt] = useState<HookArt | ''>(
    editing?.hook_art ?? ''
  )

  // Prompt
  const [promptText, setPromptText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showStage2, setShowStage2] = useState(isEdit)

  // Stage 2
  const [titel, setTitel] = useState(editing?.titel ?? '')
  const [hookField, setHookField] = useState(editing?.hook ?? '')
  const [beschreibung, setBeschreibung] = useState(editing?.beschreibung ?? '')
  const [callToAction, setCallToAction] = useState(
    editing?.call_to_action ?? ''
  )
  const [urlId, setUrlId] = useState(editing?.ziel_url_id ?? '')
  const [vorlageId, setVorlageId] = useState(editing?.canva_vorlage_id ?? '')
  const [saisonEventId, setSaisonEventId] = useState(
    editing?.saison_event_id ?? defaultSaisonEventId ?? ''
  )
  const [pinFormat, setPinFormat] = useState<PinFormat | ''>(
    editing?.pin_format ?? ''
  )
  const [geplanteVeroeffentlichung, setGeplanteVeroeffentlichung] = useState(
    editing?.geplante_veroeffentlichung ?? ''
  )

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Abgeleitete Werte
  const selectedContent = useMemo(
    () => contents.find((c) => c.id === contentId) ?? null,
    [contents, contentId]
  )

  const filteredKeywords = useMemo(() => {
    if (!selectedContent) return [] as KeywordOption[]
    const ids = new Set(selectedContent.keywordIds)
    return keywords.filter((k) => ids.has(k.id))
  }, [selectedContent, keywords])

  const groupedKeywords = useMemo(() => {
    const out: Record<KeywordOption['typ'], KeywordOption[]> = {
      haupt: [],
      mid_tail: [],
      longtail: [],
    }
    for (const kw of filteredKeywords) out[kw.typ].push(kw)
    return out
  }, [filteredKeywords])

  const dupCount =
    vorlageId && urlId
      ? (comboCount[`${vorlageId}|${urlId}`] ?? 0)
      : 0

  function toggleKeyword(id: string) {
    setKeywordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function generatePrompt() {
    if (!contentId) {
      setFormError('Bitte zuerst einen Content-Inhalt wählen.')
      return
    }
    if (!themaKontext.trim()) {
      setFormError('Bitte das Feld „Thema & Kontext" ausfüllen.')
      return
    }
    setFormError(null)

    const board = boards.find((b) => b.id === boardId)
    const selectedKeywords = filteredKeywords
      .filter((k) => keywordIds.includes(k.id))
      .map((k) => ({ keyword: k.keyword, typ: k.typ }))

    const text = buildPrompt({
      board: board?.name ?? '(kein Board gewählt)',
      thema: themaKontext.trim(),
      conversionZiel: conversionZiel
        ? CONVERSION_LABEL[conversionZiel]
        : '(noch nicht gewählt)',
      strategieTyp: strategieTyp
        ? STRATEGIE_LABEL[strategieTyp]
        : '(noch nicht gewählt)',
      hookArt: hookArt ? HOOK_ART_LABEL[hookArt] : '(noch nicht gewählt)',
      keywords: selectedKeywords,
      customSignalwoerter,
    })

    setPromptText(text)
    setShowStage2(true)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFormError('Kopieren fehlgeschlagen — bitte manuell markieren.')
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    if (isEdit && editing) {
      formData.set('id', editing.id)
    }

    const result = isEdit ? await updatePin(formData) : await addPin(formData)
    setSubmitting(false)

    if (result.error) {
      setFormError(result.error)
      return
    }
    onClose()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Pin bearbeiten' : 'Neuen Pin erstellen'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit
            ? 'Alle Felder sind vorausgefüllt. Du kannst beliebige Werte anpassen und neu speichern.'
            : 'Stufe 1 — wähle Inhalt, Keywords und Strategie. Dann „Prompt generieren" klicken.'}
        </p>
      </div>

      {/* ============= STUFE 1 ============= */}
      <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
        <legend className="px-2 text-sm font-semibold text-gray-700">
          Stufe 1 — Prompt-Vorbereitung
        </legend>

        <Field
          label="Content-Inhalt"
          htmlFor="content_id"
          required
        >
          <select
            id="content_id"
            name="content_id"
            required
            value={contentId}
            onChange={(e) => {
              setContentId(e.target.value)
              setKeywordIds([])
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titel}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Thema & Kontext"
          htmlFor="thema_kontext"
          required={!isEdit}
        >
          <textarea
            id="thema_kontext"
            name="thema_kontext"
            required={!isEdit}
            rows={4}
            value={themaKontext}
            onChange={(e) => setThemaKontext(e.target.value)}
            placeholder="Beschreibe das Thema dieses Pins, füge Stichpunkte ein oder kopiere einen Ausschnitt deines Blogbeitrags hier rein. Je mehr Kontext, desto besser wird die Pin-Beschreibung."
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Dieser Text fließt direkt in den KI-Prompt ein und sorgt dafür, dass
            Titel und Beschreibung zur Customer Journey passen.
          </p>
        </Field>

        {contentId && (
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">
              Keywords (Mehrfachauswahl)
            </p>
            {filteredKeywords.length === 0 ? (
              <p className="text-sm text-gray-500">
                Für diesen Inhalt sind noch keine Keywords verknüpft.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {KEYWORD_TYPEN.map((typ) => (
                  <div
                    key={typ}
                    className="rounded-md border border-gray-200 p-3"
                  >
                    <p
                      className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${KEYWORD_TYP_BADGE[typ]}`}
                    >
                      <span aria-hidden>{KEYWORD_TYP_EMOJI[typ]}</span>
                      {KEYWORD_TYP_LABEL[typ]}
                    </p>
                    {groupedKeywords[typ].length === 0 ? (
                      <p className="text-xs text-gray-400">—</p>
                    ) : (
                      <ul className="space-y-1">
                        {groupedKeywords[typ].map((kw) => (
                          <li key={kw.id}>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                name="keyword_ids"
                                value={kw.id}
                                checked={keywordIds.includes(kw.id)}
                                onChange={() => toggleKeyword(kw.id)}
                                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              {kw.keyword}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Board" htmlFor="board_id">
          <select
            id="board_id"
            name="board_id"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className={inputCls}
          >
            <option value="">— ohne Board —</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Strategie-Typ" htmlFor="strategie_typ">
            <select
              id="strategie_typ"
              name="strategie_typ"
              value={strategieTyp}
              onChange={(e) =>
                setStrategieTyp(e.target.value as StrategieTyp | '')
              }
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {STRATEGIE_TYPEN.map((s) => (
                <option key={s} value={s}>
                  {STRATEGIE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Conversion-Ziel" htmlFor="conversion_ziel">
            <select
              id="conversion_ziel"
              name="conversion_ziel"
              value={conversionZiel}
              onChange={(e) =>
                setConversionZiel(e.target.value as ConversionZiel | '')
              }
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {CONVERSION_ZIELE.map((c) => (
                <option key={c} value={c}>
                  {CONVERSION_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Hook-Art" htmlFor="hook_art">
            <select
              id="hook_art"
              name="hook_art"
              value={hookArt}
              onChange={(e) => setHookArt(e.target.value as HookArt | '')}
              className={inputCls}
            >
              <option value="">— wählen —</option>
              {HOOK_ARTEN.map((h) => (
                <option key={h} value={h}>
                  {HOOK_ART_LABEL[h]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generatePrompt}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            🪄 Prompt generieren
          </button>
          {!isEdit && !showStage2 && (
            <span className="text-xs text-gray-500">
              Pflichtfelder für Stufe 2 erscheinen nach Generierung.
            </span>
          )}
        </div>

        {promptText && (
          <div className="space-y-2">
            <label
              htmlFor="prompt_output"
              className="block text-sm font-medium text-gray-700"
            >
              Generierter Prompt
            </label>
            <textarea
              id="prompt_output"
              readOnly
              value={promptText}
              rows={16}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800"
            />
            <button
              type="button"
              onClick={copyPrompt}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? '✓ Kopiert' : '📋 Kopieren'}
            </button>
          </div>
        )}
      </fieldset>

      {/* ============= STUFE 2 ============= */}
      {showStage2 && (
        <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">
            Stufe 2 — Pin speichern
          </legend>

          <Field label="Titel" htmlFor="titel">
            <input
              id="titel"
              name="titel"
              type="text"
              maxLength={100}
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className={inputCls}
            />
            <Counter current={titel.length} max={100} unit="Zeichen" />
          </Field>

          <Field label="Hook" htmlFor="hook">
            <input
              id="hook"
              name="hook"
              type="text"
              value={hookField}
              onChange={(e) => setHookField(e.target.value)}
              className={inputCls}
            />
            <Counter
              current={countWords(hookField)}
              max={10}
              unit="Wörter"
            />
          </Field>

          <Field label="Beschreibung" htmlFor="beschreibung">
            <textarea
              id="beschreibung"
              name="beschreibung"
              rows={3}
              maxLength={500}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              className={inputCls}
            />
            <Counter current={beschreibung.length} max={500} unit="Zeichen" />
          </Field>

          <Field label="Call-to-Action" htmlFor="call_to_action">
            <input
              id="call_to_action"
              name="call_to_action"
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ZielUrlPicker
              urls={urls}
              selectedId={urlId}
              onSelectedIdChange={setUrlId}
              idPrefix="pinform"
            />

            <Field label="Canva-Vorlage" htmlFor="canva_vorlage_id">
              <select
                id="canva_vorlage_id"
                name="canva_vorlage_id"
                value={vorlageId}
                onChange={(e) => setVorlageId(e.target.value)}
                className={inputCls}
              >
                <option value="">— keine Vorlage —</option>
                {vorlagen.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {dupCount > 3 && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              ⚠️ Diese Kombination Vorlage + URL existiert bereits {dupCount}×
              — Pinterest wertet sehr ähnliche Pins als Spam. Erwäge eine
              andere Vorlage oder Ziel-URL.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Saison-Tag (optional)" htmlFor="saison_event_id">
              <select
                id="saison_event_id"
                name="saison_event_id"
                value={saisonEventId}
                onChange={(e) => setSaisonEventId(e.target.value)}
                className={inputCls}
              >
                <option value="">— keiner —</option>
                {saisonEvents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.event_name}
                    {s.event_datum ? ` (${formatDateDe(s.event_datum)})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pin-Format" htmlFor="pin_format">
              <select
                id="pin_format"
                name="pin_format"
                value={pinFormat}
                onChange={(e) =>
                  setPinFormat(e.target.value as PinFormat | '')
                }
                className={inputCls}
              >
                <option value="">— wählen —</option>
                {PIN_FORMATE.map((p) => (
                  <option key={p} value={p}>
                    {PIN_FORMAT_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Veröffentlichungsdatum (optional)"
              htmlFor="geplante_veroeffentlichung"
            >
              <input
                id="geplante_veroeffentlichung"
                name="geplante_veroeffentlichung"
                type="date"
                value={geplanteVeroeffentlichung}
                onChange={(e) => setGeplanteVeroeffentlichung(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

        </fieldset>
      )}

      {formError && (
        <p className="text-sm text-red-700">{formError}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || (!isEdit && !showStage2)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          title={
            !isEdit && !showStage2
              ? 'Erst Prompt generieren, um die Pin-Felder freizugeben'
              : ''
          }
        >
          {submitting ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

// ===========================================================
// Manuelles Formular (für bereits fertige Pins, ohne Prompt)
// ===========================================================
function ManualPinForm({
  contents,
  boards,
  urls,
  vorlagen,
  saisonEvents,
  comboCount,
  onClose,
}: {
  contents: ContentOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  vorlagen: CanvaVorlageOption[]
  saisonEvents: SaisonEventOption[]
  comboCount: Record<string, number>
  onClose: () => void
}) {
  const [contentId, setContentId] = useState('')
  const [titel, setTitel] = useState('')
  const [hookField, setHookField] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [callToAction, setCallToAction] = useState('')
  const [urlId, setUrlId] = useState('')
  const [boardId, setBoardId] = useState('')
  const [strategieTyp, setStrategieTyp] = useState<StrategieTyp | ''>('')
  const [conversionZiel, setConversionZiel] = useState<ConversionZiel | ''>('')
  const [pinFormat, setPinFormat] = useState<PinFormat | ''>('')
  const [vorlageId, setVorlageId] = useState('')
  const [saisonEventId, setSaisonEventId] = useState('')
  const [geplanteVeroeffentlichung, setGeplanteVeroeffentlichung] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const dupCount =
    vorlageId && urlId
      ? (comboCount[`${vorlageId}|${urlId}`] ?? 0)
      : 0

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await addPin(formData)
    setSubmitting(false)

    if (result.error) {
      setFormError(result.error)
      return
    }
    onClose()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Pin manuell eintragen
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Für bereits fertige Pins — trage Titel, Hook und Beschreibung direkt
          ein ohne den KI-Prompt zu nutzen.
        </p>
      </div>

      <Field label="Content-Inhalt" htmlFor="manual_content_id" required>
        <select
          id="manual_content_id"
          name="content_id"
          required
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          className={inputCls}
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titel}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Titel" htmlFor="manual_titel">
        <input
          id="manual_titel"
          name="titel"
          type="text"
          maxLength={100}
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className={inputCls}
        />
        <Counter current={titel.length} max={100} unit="Zeichen" />
      </Field>

      <Field label="Hook" htmlFor="manual_hook">
        <input
          id="manual_hook"
          name="hook"
          type="text"
          value={hookField}
          onChange={(e) => setHookField(e.target.value)}
          className={inputCls}
        />
        <Counter current={countWords(hookField)} max={10} unit="Wörter" />
      </Field>

      <Field label="Beschreibung" htmlFor="manual_beschreibung">
        <textarea
          id="manual_beschreibung"
          name="beschreibung"
          rows={3}
          maxLength={500}
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          className={inputCls}
        />
        <Counter current={beschreibung.length} max={500} unit="Zeichen" />
      </Field>

      <Field label="Call-to-Action" htmlFor="manual_call_to_action">
        <input
          id="manual_call_to_action"
          name="call_to_action"
          type="text"
          value={callToAction}
          onChange={(e) => setCallToAction(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ZielUrlPicker
          urls={urls}
          selectedId={urlId}
          onSelectedIdChange={setUrlId}
          idPrefix="manual"
        />

        <Field label="Board" htmlFor="manual_board_id">
          <select
            id="manual_board_id"
            name="board_id"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className={inputCls}
          >
            <option value="">— ohne Board —</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Strategie-Typ" htmlFor="manual_strategie_typ">
          <select
            id="manual_strategie_typ"
            name="strategie_typ"
            value={strategieTyp}
            onChange={(e) =>
              setStrategieTyp(e.target.value as StrategieTyp | '')
            }
            className={inputCls}
          >
            <option value="">— wählen —</option>
            {STRATEGIE_TYPEN.map((s) => (
              <option key={s} value={s}>
                {STRATEGIE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Conversion-Ziel" htmlFor="manual_conversion_ziel">
          <select
            id="manual_conversion_ziel"
            name="conversion_ziel"
            value={conversionZiel}
            onChange={(e) =>
              setConversionZiel(e.target.value as ConversionZiel | '')
            }
            className={inputCls}
          >
            <option value="">— wählen —</option>
            {CONVERSION_ZIELE.map((c) => (
              <option key={c} value={c}>
                {CONVERSION_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pin-Format" htmlFor="manual_pin_format">
          <select
            id="manual_pin_format"
            name="pin_format"
            value={pinFormat}
            onChange={(e) => setPinFormat(e.target.value as PinFormat | '')}
            className={inputCls}
          >
            <option value="">— wählen —</option>
            {PIN_FORMATE.map((p) => (
              <option key={p} value={p}>
                {PIN_FORMAT_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Canva-Vorlage" htmlFor="manual_canva_vorlage_id">
          <select
            id="manual_canva_vorlage_id"
            name="canva_vorlage_id"
            value={vorlageId}
            onChange={(e) => setVorlageId(e.target.value)}
            className={inputCls}
          >
            <option value="">— keine Vorlage —</option>
            {vorlagen.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Saison-Tag (optional)" htmlFor="manual_saison_event_id">
          <select
            id="manual_saison_event_id"
            name="saison_event_id"
            value={saisonEventId}
            onChange={(e) => setSaisonEventId(e.target.value)}
            className={inputCls}
          >
            <option value="">— keiner —</option>
            {saisonEvents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.event_name}
                {s.event_datum ? ` (${formatDateDe(s.event_datum)})` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Veröffentlichungsdatum (optional)"
          htmlFor="manual_geplante_veroeffentlichung"
        >
          <input
            id="manual_geplante_veroeffentlichung"
            name="geplante_veroeffentlichung"
            type="date"
            value={geplanteVeroeffentlichung}
            onChange={(e) => setGeplanteVeroeffentlichung(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {dupCount > 3 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          ⚠️ Diese Kombination Vorlage + URL existiert bereits {dupCount}× —
          Pinterest wertet sehr ähnliche Pins als Spam. Erwäge eine andere
          Vorlage oder Ziel-URL.
        </div>
      )}

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

// ===========================================================
// Ziel-URL Picker (Liste oder Direkteingabe)
// ===========================================================
function ZielUrlPicker({
  urls,
  selectedId,
  onSelectedIdChange,
  idPrefix,
}: {
  urls: ZielUrlOption[]
  selectedId: string
  onSelectedIdChange: (id: string) => void
  idPrefix: string
}) {
  const [mode, setMode] = useState<'list' | 'direct'>('list')
  const [direct, setDirect] = useState('')

  const listId = `${idPrefix}_ziel_url_id`
  const directId = `${idPrefix}_ziel_url_direct`

  function switchTo(next: 'list' | 'direct') {
    if (next === mode) return
    if (next === 'list') {
      setDirect('')
    } else {
      onSelectedIdChange('')
    }
    setMode(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={mode === 'list' ? listId : directId}
          className="block text-sm font-medium text-gray-700"
        >
          Ziel-URL
        </label>
        <div className="inline-flex rounded-md border border-gray-300 bg-white text-xs">
          <button
            type="button"
            onClick={() => switchTo('list')}
            className={`px-2.5 py-1 ${
              mode === 'list'
                ? 'bg-gray-100 font-medium text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Aus Liste wählen
          </button>
          <button
            type="button"
            onClick={() => switchTo('direct')}
            className={`border-l border-gray-300 px-2.5 py-1 ${
              mode === 'direct'
                ? 'bg-gray-100 font-medium text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            URL direkt eingeben
          </button>
        </div>
      </div>

      {mode === 'list' ? (
        <>
          <div className="flex items-stretch gap-2">
            <select
              id={listId}
              name="ziel_url_id"
              value={selectedId}
              onChange={(e) => onSelectedIdChange(e.target.value)}
              className={`${inputCls} flex-1`}
            >
              <option value="">— keine URL —</option>
              {urls.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.titel} — {u.url}
                </option>
              ))}
            </select>
            <CopyUrlButton
              value={urls.find((u) => u.id === selectedId)?.url ?? ''}
            />
          </div>
          <input type="hidden" name="ziel_url_direct" value="" />
        </>
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <input
              id={directId}
              name="ziel_url_direct"
              type="url"
              value={direct}
              onChange={(e) => setDirect(e.target.value)}
              placeholder="https://example.com/blog/artikel"
              className={`${inputCls} flex-1`}
            />
            <CopyUrlButton value={direct} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Wenn die URL bereits in deiner Sammlung existiert, wird sie
            automatisch verknüpft. Andernfalls wird sie als neue Ziel-URL
            angelegt.
          </p>
          <input type="hidden" name="ziel_url_id" value="" />
        </>
      )}
    </div>
  )
}

// Kopiert die übergebene URL in die Zwischenablage und zeigt für ~1,5s ein
// ✓-Feedback. Disabled wenn der Wert leer ist (z.B. „— keine URL —" gewählt).
function CopyUrlButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const trimmed = value.trim()
  const disabled = !trimmed

  async function onCopy() {
    if (!trimmed) return
    try {
      await navigator.clipboard.writeText(trimmed)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard-API nicht verfügbar (z.B. unsicherer Kontext) — silent.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      title={disabled ? 'Keine URL zum Kopieren' : 'URL in Zwischenablage kopieren'}
      aria-label="URL kopieren"
      className="mt-1 inline-flex shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? (
        <span className="text-green-600" aria-hidden>
          ✓
        </span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M7 3a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H7zm-2 12a4 4 0 01-2-3.732V5a4 4 0 014-4h6a4 4 0 014 4v6.268A4 4 0 0113 15H5z" />
          <path d="M3 7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-1H5a2 2 0 01-2-2V7z" />
        </svg>
      )}
    </button>
  )
}

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  )
}

function Counter({
  current,
  max,
  unit,
}: {
  current: number
  max: number
  unit: string
}) {
  const over = current > max
  return (
    <p
      className={`mt-1 text-xs ${over ? 'font-medium text-red-600' : 'text-gray-500'}`}
    >
      {current}/{max} {unit}
    </p>
  )
}

// ===========================================================
// CSV-Import
// ===========================================================
type CsvFieldKey =
  | 'titel'
  | 'hook'
  | 'beschreibung'
  | 'call_to_action'
  | 'pin_format'
  | 'geplante_veroeffentlichung'
  | 'board'
  | 'ziel_url'
  | 'strategie_typ'
  | 'conversion_ziel'

// In Vorlage und Hinweistext sichtbare Spalten-Namen (Reihenfolge wird so
// ausgegeben). Status taucht NICHT auf — wird beim Speichern automatisch aus
// dem Veröffentlichungsdatum berechnet.
const CSV_TEMPLATE_COLUMNS: Array<{ key: CsvFieldKey; display: string }> = [
  { key: 'titel', display: 'Titel' },
  { key: 'hook', display: 'Hook' },
  { key: 'beschreibung', display: 'Beschreibung' },
  { key: 'call_to_action', display: 'Call to Action' },
  { key: 'pin_format', display: 'Pin Format' },
  { key: 'geplante_veroeffentlichung', display: 'Geplantes Veröffentlichungsdatum' },
  { key: 'board', display: 'Board' },
  { key: 'ziel_url', display: 'Ziel URL' },
  { key: 'strategie_typ', display: 'Strategie Typ' },
  { key: 'conversion_ziel', display: 'Conversion Ziel' },
]

// Akzeptierte Header-Schreibweisen → CsvFieldKey. Vergleich erfolgt
// case-insensitive mit gestrichenen Bindestrichen/Leerzeichen.
function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\s_\-/]+/g, '')
}

const CSV_HEADER_ALIASES: Record<string, CsvFieldKey> = {
  titel: 'titel',
  title: 'titel',
  hook: 'hook',
  beschreibung: 'beschreibung',
  description: 'beschreibung',
  calltoaction: 'call_to_action',
  cta: 'call_to_action',
  pinformat: 'pin_format',
  format: 'pin_format',
  geplantesveroeffentlichungsdatum: 'geplante_veroeffentlichung',
  veroeffentlichungsdatum: 'geplante_veroeffentlichung',
  geplanteveroeffentlichung: 'geplante_veroeffentlichung',
  datum: 'geplante_veroeffentlichung',
  board: 'board',
  zielurl: 'ziel_url',
  url: 'ziel_url',
  strategietyp: 'strategie_typ',
  strategie: 'strategie_typ',
  conversionziel: 'conversion_ziel',
  conversion: 'conversion_ziel',
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  function commitField() {
    row.push(field)
    field = ''
  }
  function commitRow() {
    commitField()
    if (row.some((s) => s.length > 0)) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        commitField()
      } else if (c === '\n') {
        commitRow()
      } else if (c === '\r') {
        // Carriage return — ignore, '\n' commits row
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) commitRow()
  return rows
}

function normalizePinFormat(v: string): PinFormat | null {
  const lower = v.trim().toLowerCase()
  for (const k of PIN_FORMATE) if (lower === k) return k
  if (lower === 'karussell') return 'carousel'
  if (lower === 'infographic' || lower === 'info-grafik' || lower === 'infogr.')
    return 'infografik'
  return null
}

function normalizeStrategie(v: string): StrategieTyp | null {
  const lower = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (lower === 'blog_content' || lower === 'blogcontent') return 'blog_content'
  if (lower === 'affiliate') return 'affiliate'
  if (lower === 'produkt' || lower === 'product') return 'produkt'
  return null
}

function normalizeConversion(v: string): ConversionZiel | null {
  const lower = v.trim().toLowerCase()
  if (lower === 'traffic') return 'traffic'
  if (lower === 'lead' || lower === 'leads') return 'lead'
  if (lower === 'sales' || lower === 'sale' || lower === 'verkauf')
    return 'sales'
  return null
}

const GERMAN_MONTHS: Record<string, number> = {
  januar: 1,
  februar: 2,
  märz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
}

function pad2(n: number | string): string {
  return String(n).padStart(2, '0')
}

// Validiert (Y, M, D) als reales Datum (z.B. 31.02. → invalid).
function buildIso(
  y: number | string,
  m: number | string,
  d: number | string
): string | null {
  const yi = Number(y)
  const mi = Number(m)
  const di = Number(d)
  if (
    !Number.isInteger(yi) ||
    !Number.isInteger(mi) ||
    !Number.isInteger(di) ||
    yi < 1900 ||
    yi > 2100 ||
    mi < 1 ||
    mi > 12 ||
    di < 1 ||
    di > 31
  )
    return null
  const iso = `${yi}-${pad2(mi)}-${pad2(di)}`
  const dt = new Date(`${iso}T00:00:00Z`)
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== yi ||
    dt.getUTCMonth() + 1 !== mi ||
    dt.getUTCDate() !== di
  )
    return null
  return iso
}

// Erkennt mehrere übliche Datumsformate und liefert YYYY-MM-DD (oder null).
//   - YYYY-MM-DD (ISO)
//   - DD.MM.YYYY / DD-MM-YYYY (deutsch)
//   - YYYY/MM/DD und YYYY.MM.DD
//   - DD/MM/YYYY und MM/DD/YYYY (Heuristik: wenn ein Teil > 12, ist die
//     andere Position eindeutig der Tag; sonst Default DD/MM)
//   - D. MMMM YYYY und DD. MMMM YYYY (deutsch ausgeschrieben)
function normalizeDate(input: string): string | null {
  // Erst alle Whitespace-Varianten (inkl. NBSP  , Narrow NBSP  ,
  // Tabs, en-/em-spaces) auf ein einzelnes ASCII-Space kollabieren — Excel
  // und Word liefern oft NBSPs, die der Default `\s` nicht zuverlässig
  // matcht und die Format-Erkennung sonst still scheitern lässt.
  const v = input
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g, ' ')
    .trim()
  if (!v) return null

  // ISO
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  if (iso) return buildIso(iso[1], iso[2], iso[3])

  // DD.MM.YYYY
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v)
  if (de) return buildIso(de[3], de[2], de[1])

  // DD-MM-YYYY (deutsch mit Bindestrichen)
  const deDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v)
  if (deDash) return buildIso(deDash[3], deDash[2], deDash[1])

  // YYYY/MM/DD
  const isoSlash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v)
  if (isoSlash) return buildIso(isoSlash[1], isoSlash[2], isoSlash[3])

  // YYYY.MM.DD
  const isoDot = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(v)
  if (isoDot) return buildIso(isoDot[1], isoDot[2], isoDot[3])

  // Slash-Format (DD/MM/YYYY oder MM/DD/YYYY)
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (slash) {
    const a = Number(slash[1])
    const b = Number(slash[2])
    const y = slash[3]
    if (a > 12 && b <= 12) return buildIso(y, b, a) // a = Tag
    if (b > 12 && a <= 12) return buildIso(y, a, b) // a = Monat
    return buildIso(y, b, a) // mehrdeutig → DD/MM bevorzugt
  }

  // D. MMMM YYYY (Tag. Monatsname Jahr — deutsch ausgeschrieben).
  // Punkt nach dem Tag und Spaces drumherum sind beide optional, damit
  // sowohl "1. Februar 2026" als auch "1.Februar 2026" oder
  // "01. Februar 2026" zuverlässig matchen.
  const written = /^(\d{1,2})\.?\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})$/.exec(v)
  if (written) {
    const m = GERMAN_MONTHS[written[2].toLowerCase()]
    if (m) return buildIso(written[3], m, written[1])
  }

  // Notfall-Fallback: alle Tokens isolieren und nach (Tag, Monatsname,
  // Jahr) suchen — auch wenn das ursprüngliche Format komplett ungewöhnlich
  // ist (z.B. "1 Februar 2026" ohne Punkt, "1.Feb.2026" usw.).
  const tokens = v.split(/[\s.,/-]+/).filter(Boolean)
  if (tokens.length >= 3) {
    let day: number | null = null
    let month: number | null = null
    let year: number | null = null
    for (const t of tokens) {
      if (/^\d{4}$/.test(t)) year = Number(t)
      else if (/^\d{1,2}$/.test(t) && day === null) day = Number(t)
      else {
        const mn = GERMAN_MONTHS[t.toLowerCase()]
        if (mn) month = mn
      }
    }
    if (day !== null && month !== null && year !== null) {
      return buildIso(year, month, day)
    }
  }

  return null
}

function CsvImport({
  contents,
  boards,
  urls,
  onClose,
}: {
  contents: ContentOption[]
  boards: BoardOption[]
  urls: ZielUrlOption[]
  onClose: () => void
}) {
  const [contentId, setContentId] = useState('')
  const [parsed, setParsed] = useState<ImportPinRow[] | null>(null)
  const [rawDates, setRawDates] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [skippedRows, setSkippedRows] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [missingBoards, setMissingBoards] = useState<string[]>([])
  const [missingUrls, setMissingUrls] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    error?: string
    imported?: number
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    // Beispielzeile mit Datum im erwarteten Format. Ohne Titel landet die
    // Beispielzeile beim Import als „Kein Titel — Zeile übersprungen" — das
    // ist gewollt: der User soll die Zeile durch eigene Daten ersetzen.
    const exampleByKey: Partial<Record<CsvFieldKey, string>> = {
      geplante_veroeffentlichung: '26.04.2026',
    }
    const header = CSV_TEMPLATE_COLUMNS.map((c) => c.display).join(',')
    const example = CSV_TEMPLATE_COLUMNS.map(
      (c) => exampleByKey[c.key] ?? ''
    ).join(',')
    const csv = `${header}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pins-vorlage.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setParseError(null)
    setSkippedRows([])
    setWarnings([])
    setMissingBoards([])
    setMissingUrls([])
    setParsed(null)
    setRawDates([])
    setFeedback({})
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      // Excel/LibreOffice schreiben gerne ein BOM (﻿) an den Anfang.
      // parseCsv würde es sonst in die erste Header-Zelle aufnehmen.
      const raw = String(reader.result ?? '')
      const text = raw.replace(/^﻿/, '')
      const lines = parseCsv(text)
      if (lines.length === 0) {
        setParseError('CSV ist leer.')
        return
      }
      // Header → CsvFieldKey mapping (Position pro Schlüssel).
      const headerIdx: Partial<Record<CsvFieldKey, number>> = {}
      lines[0].forEach((cell, i) => {
        const key = CSV_HEADER_ALIASES[normHeader(cell)]
        if (key && headerIdx[key] === undefined) headerIdx[key] = i
      })
      // Diagnose-Log — hilft bei nicht erkannten Spalten / Datumsfeldern.
      console.log('[CSV-IMPORT] Header roh:', lines[0])
      console.log(
        '[CSV-IMPORT] Header normalisiert:',
        lines[0].map((c) => normHeader(c))
      )
      console.log('[CSV-IMPORT] Erkannte Spalten-Positionen:', headerIdx)
      // Pflicht: Titel (alle anderen Spalten dürfen fehlen).
      if (headerIdx.titel === undefined) {
        setParseError('Spalte „Titel" fehlt im Header.')
        return
      }

      // Lookup-Tabellen: Board-Name (case-insensitive) und URL (Substring-Match).
      const boardByName = new Map<string, BoardOption>()
      for (const b of boards) boardByName.set(b.name.trim().toLowerCase(), b)

      const rows: ImportPinRow[] = []
      const rowsRawDate: string[] = []
      const errors: string[] = []
      const warns: string[] = []
      const boardsNotFound = new Set<string>()
      const urlsNotFound = new Set<string>()

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const get = (k: CsvFieldKey): string => {
          const ix = headerIdx[k]
          return ix === undefined ? '' : (line[ix] ?? '').trim()
        }
        const lineNo = i + 1
        const titel = get('titel')
        const hook = get('hook')
        const beschreibung = get('beschreibung')
        const cta = get('call_to_action')
        const formatRaw = get('pin_format')
        const datumRaw = get('geplante_veroeffentlichung')
        const boardRaw = get('board')
        const urlRaw = get('ziel_url')
        const strategieRaw = get('strategie_typ')
        const conversionRaw = get('conversion_ziel')

        // Komplett leere Zeilen überspringen (kein Fehler).
        if (
          !titel &&
          !hook &&
          !beschreibung &&
          !cta &&
          !formatRaw &&
          !datumRaw &&
          !boardRaw &&
          !urlRaw &&
          !strategieRaw &&
          !conversionRaw
        )
          continue

        // KRITISCHER FEHLER (Zeile wird übersprungen): nur fehlender Titel.
        // Alle anderen Felder sind optional und werden bei Leerwert als NULL
        // gespeichert. Status wird beim Speichern aus dem Datum berechnet.
        if (!titel) {
          errors.push(`Zeile ${lineNo}: Kein Titel — Zeile übersprungen`)
          continue
        }

        // WARNUNGEN (Pin wird trotzdem importiert, ggf. mit Korrektur):
        let titelOut = titel
        if (titelOut.length > 100) {
          warns.push(
            `Zeile ${lineNo}: Titel auf 100 Zeichen gekürzt — bitte prüfen`
          )
          titelOut = titelOut.slice(0, 100)
        }

        let beschreibungOut = beschreibung
        if (beschreibungOut.length > 500) {
          warns.push(
            `Zeile ${lineNo}: Beschreibung auf 500 Zeichen gekürzt — bitte prüfen`
          )
          beschreibungOut = beschreibungOut.slice(0, 500)
        }

        if (hook && hook.split(/\s+/).filter(Boolean).length > 10) {
          warns.push(
            `Zeile ${lineNo}: Hook hat mehr als 10 Wörter — bitte nach dem Import kürzen`
          )
        }

        let pin_format: PinFormat | null = null
        if (formatRaw) {
          pin_format = normalizePinFormat(formatRaw)
          if (!pin_format) {
            warns.push(
              `Zeile ${lineNo}: Pin-Format „${formatRaw}" unbekannt — Feld leer gelassen`
            )
          }
        }

        let strategie_typ: StrategieTyp | null = null
        if (strategieRaw) {
          strategie_typ = normalizeStrategie(strategieRaw)
          if (!strategie_typ) {
            warns.push(
              `Zeile ${lineNo}: Strategie-Typ „${strategieRaw}" unbekannt — Feld leer gelassen (erwartet: Blog-Content / Affiliate / Produkt)`
            )
          }
        }

        let conversion_ziel: ConversionZiel | null = null
        if (conversionRaw) {
          conversion_ziel = normalizeConversion(conversionRaw)
          if (!conversion_ziel) {
            warns.push(
              `Zeile ${lineNo}: Conversion-Ziel „${conversionRaw}" unbekannt — Feld leer gelassen (erwartet: Traffic / Lead / Sales)`
            )
          }
        }

        let datum: string | null = null
        if (datumRaw) {
          const iso = normalizeDate(datumRaw)
          console.log(
            `[CSV-IMPORT] Zeile ${lineNo} Datum-Rohwert „${datumRaw}" → ${iso ?? 'nicht erkannt'}`
          )
          if (iso) {
            datum = iso
          } else {
            warns.push(
              `Zeile ${lineNo}: Datum „${datumRaw}" konnte nicht erkannt werden — bitte im Format DD.MM.YYYY angeben`
            )
          }
        }

        // Board-Lookup (kein Hard-Fail — fehlende Boards in Warnung sammeln).
        let board_id: string | null = null
        if (boardRaw) {
          const match = boardByName.get(boardRaw.toLowerCase())
          if (match) {
            board_id = match.id
          } else {
            boardsNotFound.add(boardRaw)
          }
        }

        // URL-Lookup: erste ZielUrl die den eingegebenen String enthält
        // ODER deren `url` im eingegebenen String enthalten ist.
        let ziel_url_id: string | null = null
        if (urlRaw) {
          const needle = urlRaw.toLowerCase()
          const match = urls.find((u) => {
            const u_url = (u.url ?? '').toLowerCase()
            if (!u_url) return false
            return u_url.includes(needle) || needle.includes(u_url)
          })
          if (match) {
            ziel_url_id = match.id
          } else {
            urlsNotFound.add(urlRaw)
          }
        }

        rows.push({
          titel: titelOut || null,
          hook: hook || null,
          beschreibung: beschreibungOut || null,
          call_to_action: cta || null,
          pin_format,
          geplante_veroeffentlichung: datum,
          board_id,
          ziel_url_id,
          strategie_typ,
          conversion_ziel,
        })
        rowsRawDate.push(datumRaw)
      }
      setSkippedRows(errors)
      setWarnings(warns)
      setMissingBoards(Array.from(boardsNotFound).sort())
      setMissingUrls(Array.from(urlsNotFound).sort())
      setParsed(rows)
      setRawDates(rowsRawDate)
    }
    reader.readAsText(file, 'utf-8')
  }

  function doImport() {
    if (!parsed || parsed.length === 0) return
    setFeedback({})
    startTransition(async () => {
      const result = await importPins({ contentId, rows: parsed })
      if (result.error) {
        setFeedback({ error: result.error })
      } else {
        setFeedback({ imported: result.imported })
        // Parsed/Skipped/Missing nicht leeren — die Zusammenfassung
        // soll nach dem Import sichtbar bleiben.
        setParsed(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Pins importieren
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Lade eine CSV-Datei hoch, um mehrere Pins gleichzeitig anzulegen. Alle
          importierten Pins werden dem ausgewählten Content-Inhalt zugeordnet.
        </p>
      </div>

      <div>
        <label
          htmlFor="import_content_id"
          className="block text-sm font-medium text-gray-700"
        >
          Content-Inhalt für alle importierten Pins{' '}
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <select
          id="import_content_id"
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          className={inputCls}
        >
          <option value="">— ohne Content-Inhalt —</option>
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titel}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <p className="font-medium">
          Erwartete Spalten (Reihenfolge egal, Überschrift muss passen):
        </p>
        <p className="mt-1">
          {CSV_TEMPLATE_COLUMNS.map((c) => c.display).join(', ')}
        </p>
        <p className="mt-2 text-gray-500">
          Hinweis: Status wird beim Import automatisch aus dem
          Veröffentlichungsdatum berechnet — keine eigene Spalte nötig
          (kein Datum → Entwurf, Datum in der Zukunft → Geplant, Datum heute
          oder in der Vergangenheit → Veröffentlicht).
        </p>
        <p className="mt-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="font-medium text-red-600 hover:underline"
          >
            📥 Leere CSV-Vorlage herunterladen
          </button>
        </p>
      </div>

      <div>
        <label
          htmlFor="csv_file"
          className="block text-sm font-medium text-gray-700"
        >
          CSV-Datei
        </label>
        <input
          id="csv_file"
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      {parseError && <p className="text-sm text-red-700">{parseError}</p>}

      {skippedRows.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-medium">
            {skippedRows.length} Zeile(n) übersprungen (Fehler):
          </p>
          <ul className="mt-1 list-disc pl-5">
            {skippedRows.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {skippedRows.length > 8 && (
              <li>… und {skippedRows.length - 8} weitere</li>
            )}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          <p className="font-medium">
            {warnings.length} Warnung(en) — Pins werden trotzdem importiert:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {warnings.length > 8 && (
              <li>… und {warnings.length - 8} weitere</li>
            )}
          </ul>
        </div>
      )}

      {missingBoards.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">
            {missingBoards.length} Board(s) nicht gefunden — Pins werden ohne
            Board-Zuordnung importiert:
          </p>
          <p className="mt-1 break-all">{missingBoards.join(', ')}</p>
        </div>
      )}

      {missingUrls.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">
            {missingUrls.length} URL(s) nicht gefunden — Pins werden ohne
            URL-Zuordnung importiert:
          </p>
          <p className="mt-1 break-all">{missingUrls.join(', ')}</p>
        </div>
      )}

      {parsed && parsed.length > 0 && (() => {
        const emptyCounts = {
          hook: parsed.filter((r) => !r.hook).length,
          beschreibung: parsed.filter((r) => !r.beschreibung).length,
          board: parsed.filter((r) => !r.board_id).length,
          ziel_url: parsed.filter((r) => !r.ziel_url_id).length,
          strategie: parsed.filter((r) => !r.strategie_typ).length,
          conversion: parsed.filter((r) => !r.conversion_ziel).length,
          datum: parsed.filter((r) => !r.geplante_veroeffentlichung).length,
        }
        const emptyEntries: { label: string; count: number; suffix: string }[] = [
          { label: 'Hook', count: emptyCounts.hook, suffix: 'leer' },
          { label: 'Beschreibung', count: emptyCounts.beschreibung, suffix: 'leer' },
          { label: 'Board', count: emptyCounts.board, suffix: 'nicht zugeordnet' },
          { label: 'Ziel URL', count: emptyCounts.ziel_url, suffix: 'nicht zugeordnet' },
          { label: 'Strategie Typ', count: emptyCounts.strategie, suffix: 'leer' },
          { label: 'Conversion Ziel', count: emptyCounts.conversion, suffix: 'leer' },
          { label: 'Veröffentlichungsdatum', count: emptyCounts.datum, suffix: 'leer' },
        ].filter((e) => e.count > 0)
        return (
        <div>
          {emptyEntries.length > 0 && (
            <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
              <p className="font-medium">
                Hinweis: Folgende Felder sind bei einigen Pins leer und können
                nach dem Import nachgepflegt werden:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {emptyEntries.map((e) => (
                  <li key={e.label}>
                    {e.label}: bei {e.count} Pin{e.count === 1 ? '' : 's'} {e.suffix}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm font-medium text-gray-700">
            Vorschau: {parsed.length} Pin(s) — so werden sie importiert
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left">Titel</th>
                  <th className="px-2 py-1.5 text-left">Hook</th>
                  <th className="px-2 py-1.5 text-left">Beschreibung</th>
                  <th className="px-2 py-1.5 text-left">Call to Action</th>
                  <th className="px-2 py-1.5 text-left">Pin Format</th>
                  <th className="px-2 py-1.5 text-left">
                    Geplantes Veröffentlichungsdatum
                  </th>
                  <th className="px-2 py-1.5 text-left">Board</th>
                  <th className="px-2 py-1.5 text-left">Ziel URL</th>
                  <th className="px-2 py-1.5 text-left">Strategie Typ</th>
                  <th className="px-2 py-1.5 text-left">Conversion Ziel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsed.slice(0, 20).map((r, i) => {
                  const boardName = r.board_id
                    ? (boards.find((b) => b.id === r.board_id)?.name ?? '—')
                    : '—'
                  const urlValue = r.ziel_url_id
                    ? (() => {
                        const u = urls.find((x) => x.id === r.ziel_url_id)
                        return u ? (u.titel ?? u.url) : '—'
                      })()
                    : '—'
                  const rawDate = rawDates[i] ?? ''
                  const datePretty = r.geplante_veroeffentlichung
                    ? formatDateDe(r.geplante_veroeffentlichung)
                    : rawDate
                      ? '—'
                      : '—'
                  const dateMismatch =
                    !!rawDate &&
                    !!r.geplante_veroeffentlichung &&
                    rawDate !== datePretty
                  return (
                    <tr key={i}>
                      <td className="max-w-[180px] truncate px-2 py-1.5">
                        {r.titel ?? '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-1.5">
                        {r.hook ?? '—'}
                      </td>
                      <td className="max-w-[260px] truncate px-2 py-1.5">
                        {r.beschreibung ?? '—'}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-1.5">
                        {r.call_to_action ?? '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.pin_format ? PIN_FORMAT_LABEL[r.pin_format] : '—'}
                      </td>
                      <td
                        className="whitespace-nowrap px-2 py-1.5"
                        title={
                          rawDate
                            ? `Original aus CSV: „${rawDate}"`
                            : undefined
                        }
                      >
                        <div>{datePretty}</div>
                        {dateMismatch && (
                          <div className="text-[10px] text-gray-500">
                            aus „{rawDate}"
                          </div>
                        )}
                        {rawDate && !r.geplante_veroeffentlichung && (
                          <div className="text-[10px] text-amber-700">
                            „{rawDate}" nicht erkannt
                          </div>
                        )}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-1.5">
                        {boardName}
                      </td>
                      <td className="max-w-[200px] truncate px-2 py-1.5">
                        {urlValue}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.strategie_typ
                          ? STRATEGIE_LABEL[r.strategie_typ]
                          : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.conversion_ziel
                          ? CONVERSION_LABEL[r.conversion_ziel]
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {parsed.length > 20 && (
            <p className="mt-1 text-xs text-gray-500">
              … und {parsed.length - 20} weitere
            </p>
          )}
        </div>
        )
      })()}

      {feedback.error && (
        <p className="text-sm text-red-700">{feedback.error}</p>
      )}
      {feedback.imported !== undefined && !feedback.error && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Import-Zusammenfassung</p>
          <ul className="mt-1 space-y-0.5">
            <li>✓ {feedback.imported} Pin(s) erfolgreich importiert</li>
            <li>
              {missingBoards.length} Board(s) nicht gefunden
              {missingBoards.length > 0 && (
                <>: {missingBoards.join(', ')}</>
              )}
            </li>
            <li>
              {missingUrls.length} URL(s) nicht gefunden
              {missingUrls.length > 0 && <>: {missingUrls.join(', ')}</>}
            </li>
            <li>
              {warnings.length} Warnung(en)
              {warnings.length > 0 && (
                <>
                  : {warnings.slice(0, 5).join(' · ')}
                  {warnings.length > 5
                    ? ` · … und ${warnings.length - 5} weitere`
                    : ''}
                </>
              )}
            </li>
            <li>
              {skippedRows.length} Zeile(n) übersprungen (Fehler)
              {skippedRows.length > 0 && (
                <>
                  : {skippedRows.slice(0, 5).join(' · ')}
                  {skippedRows.length > 5
                    ? ` · … und ${skippedRows.length - 5} weitere`
                    : ''}
                </>
              )}
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={doImport}
          disabled={!parsed || parsed.length === 0 || isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending
            ? 'Importiert…'
            : `Importieren${parsed && parsed.length > 0 ? ` (${parsed.length})` : ''}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
