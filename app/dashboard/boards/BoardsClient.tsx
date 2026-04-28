'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { addBoard, deleteBoard, updateBoard } from './actions'

export type StrategieFokus =
  | 'blog_content'
  | 'affiliate'
  | 'produkt'
  | 'gemischt'

export type KeywordOption = {
  id: string
  keyword: string
  typ: 'haupt' | 'mid_tail' | 'longtail'
}

export type ContentOption = {
  id: string
  titel: string
}

export type Board = {
  id: string
  name: string
  beschreibung: string | null
  kategorie: string | null
  pinterest_url: string | null
  geheim: boolean
  strategie_fokus: StrategieFokus | null
  impressionen: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
  created_at: string
  keywords: Array<{ id: string; keyword: string }>
  contents: Array<{ id: string; titel: string }>
}

export type BoardPin = {
  id: string
  titel: string | null
  status: 'entwurf' | 'geplant' | 'veroeffentlicht'
  geplante_veroeffentlichung: string | null
  ctr: number | null
}

const PIN_STATUS_LABEL: Record<BoardPin['status'], string> = {
  entwurf: 'Entwurf',
  geplant: 'Geplant',
  veroeffentlicht: 'Veröffentlicht',
}

const PIN_STATUS_BADGE: Record<BoardPin['status'], string> = {
  entwurf: 'bg-gray-100 text-gray-700',
  geplant: 'bg-blue-100 text-blue-700',
  veroeffentlicht: 'bg-green-100 text-green-700',
}

function formatBoardPinDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? `${d}T00:00:00Z` : d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const KATEGORIEN = [
  'Essen & Trinken',
  'Reisen',
  'Beauty & Pflege',
  'Mode',
  'Wohnen & Einrichten',
  'Gesundheit & Fitness',
  'Yoga & Wellness',
  'Garten',
  'DIY & Basteln',
  'Hochzeit',
  'Familie & Erziehung',
  'Finanzen',
  'Tiere',
  'Kunst & Design',
  'Bildung',
  'Business & Marketing',
  'Technologie',
  'Sonstiges',
] as const

const FOKUS_OPTIONS: Array<{ value: StrategieFokus; label: string }> = [
  { value: 'blog_content', label: 'Blog-Content' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'produkt', label: 'Produkt' },
  { value: 'gemischt', label: 'Gemischt' },
]

const FOKUS_LABEL: Record<StrategieFokus, string> = Object.fromEntries(
  FOKUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<StrategieFokus, string>

const FOKUS_BADGE: Record<StrategieFokus, string> = {
  blog_content: 'bg-blue-100 text-blue-700',
  affiliate: 'bg-pink-100 text-pink-700',
  produkt: 'bg-purple-100 text-purple-700',
  gemischt: 'bg-gray-100 text-gray-700',
}

const KEYWORD_TYP_LABEL: Record<KeywordOption['typ'], string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
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

export default function BoardsClient({
  boards,
  availableKeywords,
  availableContents,
  pinsByBoardId = {},
}: {
  boards: Board[]
  availableKeywords: KeywordOption[]
  availableContents: ContentOption[]
  pinsByBoardId?: Record<string, BoardPin[]>
}) {
  const searchParams = useSearchParams()
  const [showAddForm, setShowAddForm] = useState(
    () => searchParams?.get('new') === '1'
  )
  const [editing, setEditing] = useState<Board | null>(() => {
    const editId = searchParams?.get('edit')
    if (!editId) return null
    return boards.find((b) => b.id === editId) ?? null
  })

  const editParam = searchParams?.get('edit') ?? null
  useEffect(() => {
    if (!editParam) return
    const target = boards.find((b) => b.id === editParam)
    if (target && target.id !== editing?.id) {
      setEditing(target)
      setShowAddForm(false)
    }
  }, [editParam, boards, editing?.id])
  const [formError, setFormError] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState('')
  const [contentFilter, setContentFilter] = useState('')
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(
    new Set()
  )
  const [isPending, startTransition] = useTransition()
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null)

  const formOpen = showAddForm || editing !== null

  const filteredKeywords = useMemo(() => {
    const q = keywordFilter.trim().toLowerCase()
    if (!q) return availableKeywords
    return availableKeywords.filter((k) =>
      k.keyword.toLowerCase().includes(q)
    )
  }, [keywordFilter, availableKeywords])

  const filteredContents = useMemo(() => {
    const q = contentFilter.trim().toLowerCase()
    if (!q) return availableContents
    return availableContents.filter((c) =>
      c.titel.toLowerCase().includes(q)
    )
  }, [contentFilter, availableContents])

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setSelectedKeywordIds(new Set())
    setSelectedContentIds(new Set())
    setKeywordFilter('')
    setContentFilter('')
    setFormError(null)
  }

  function openEdit(board: Board) {
    setEditing(board)
    setShowAddForm(false)
    setSelectedKeywordIds(new Set(board.keywords.map((k) => k.id)))
    setSelectedContentIds(new Set(board.contents.map((c) => c.id)))
    setKeywordFilter('')
    setContentFilter('')
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setSelectedKeywordIds(new Set())
    setSelectedContentIds(new Set())
    setFormError(null)
  }

  function toggleKeyword(id: string) {
    setSelectedKeywordIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleContent(id: string) {
    setSelectedContentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.delete('keyword_ids')
    formData.delete('content_ids')
    selectedKeywordIds.forEach((id) => formData.append('keyword_ids', id))
    selectedContentIds.forEach((id) => formData.append('content_ids', id))

    const result = editing
      ? await (() => {
          formData.set('id', editing.id)
          return updateBoard(formData)
        })()
      : await addBoard(formData)

    if (result.error) {
      setFormError(result.error)
      return
    }
    form.reset()
    closeForm()
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', id)
      await deleteBoard(formData)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => (showAddForm ? closeForm() : openAdd())}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {showAddForm ? 'Abbrechen' : 'Board erstellen'}
        </button>
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Board bearbeiten' : 'Neues Board'}
          </h2>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={editing?.name ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="beschreibung"
              className="block text-sm font-medium text-gray-700"
            >
              Beschreibung
            </label>
            <textarea
              id="beschreibung"
              name="beschreibung"
              rows={3}
              defaultValue={editing?.beschreibung ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="kategorie"
              className="block text-sm font-medium text-gray-700"
            >
              Kategorie
            </label>
            <select
              id="kategorie"
              name="kategorie"
              defaultValue={editing?.kategorie ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">— keine —</option>
              {KATEGORIEN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Das ist die Kategorie die du bei Pinterest für dieses Board
              ausgewählt hast — zu finden unter Board bearbeiten auf Pinterest.
            </p>
          </div>

          <div>
            <label
              htmlFor="pinterest_url"
              className="block text-sm font-medium text-gray-700"
            >
              Pinterest Board-URL
            </label>
            <input
              id="pinterest_url"
              name="pinterest_url"
              type="url"
              placeholder="https://pinterest.com/deinname/boardname"
              defaultValue={editing?.pinterest_url ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Direktlink zu diesem Board auf Pinterest — z.B.
              https://pinterest.com/deinname/boardname
            </p>
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="geheim"
                defaultChecked={editing?.geheim ?? false}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span>
                <span className="font-medium text-gray-700">Geheim</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Geheime Boards sind nur für dich sichtbar und beeinflussen
                  deinen Algorithmus nicht.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label
              htmlFor="strategie_fokus"
              className="block text-sm font-medium text-gray-700"
            >
              Strategie-Fokus
            </label>
            <select
              id="strategie_fokus"
              name="strategie_fokus"
              defaultValue={editing?.strategie_fokus ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">— keiner —</option>
              {FOKUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Keywords zuordnen
              </label>
              {availableKeywords.length > 0 && (
                <input
                  type="text"
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-3">
              {availableKeywords.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Keywords vorhanden — lege erst welche unter
                  „Keywords“ an.
                </p>
              ) : filteredKeywords.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine Treffer für „{keywordFilter}“.
                </p>
              ) : (
                filteredKeywords.map((k) => (
                  <label
                    key={k.id}
                    className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeywordIds.has(k.id)}
                      onChange={() => toggleKeyword(k.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1 text-gray-900">{k.keyword}</span>
                    <span className="text-xs text-gray-500">
                      {KEYWORD_TYP_LABEL[k.typ]}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Content-Inhalte zuordnen
              </label>
              {availableContents.length > 0 && (
                <input
                  type="text"
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-3">
              {availableContents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Content-Inhalte vorhanden — lege erst welche unter
                  „Content-Inhalte“ an.
                </p>
              ) : filteredContents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine Treffer für „{contentFilter}“.
                </p>
              ) : (
                filteredContents.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContentIds.has(c.id)}
                      onChange={() => toggleContent(c.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1 text-gray-900">{c.titel}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {formError && <p className="text-sm text-red-700">{formError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pins
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Kategorie
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Strategie
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Geheim
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pinterest-URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Keywords
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Inhalte
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {boards.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Boards. Erstelle dein erstes.
                </td>
              </tr>
            ) : (
              boards.flatMap((board) => {
                const isExpanded = expandedBoardId === board.id
                const boardPins = pinsByBoardId[board.id] ?? []
                const boardRow = (
                  <tr key={board.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {board.name}
                      {board.beschreibung && (
                        <p className="mt-1 text-xs font-normal text-gray-500">
                          {board.beschreibung}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBoardId(isExpanded ? null : board.id)
                        }
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded ? 'Pins ausblenden' : 'Pins anzeigen'
                        }
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span
                          className="text-2xl leading-none text-gray-400"
                          aria-hidden
                        >
                          {isExpanded ? '▾' : '▸'}
                        </span>
                        <span>
                          {boardPins.length}{' '}
                          {boardPins.length === 1 ? 'Pin' : 'Pins'}
                        </span>
                      </button>
                    </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {board.kategorie ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {board.strategie_fokus ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FOKUS_BADGE[board.strategie_fokus]}`}
                      >
                        {FOKUS_LABEL[board.strategie_fokus]}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {board.geheim ? (
                      <span title="Geheimes Board" aria-label="Geheim">
                        🔒
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm">
                    {board.pinterest_url ? (
                      <a
                        href={board.pinterest_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-red-600 hover:text-red-700 hover:underline"
                        title={board.pinterest_url}
                      >
                        {board.pinterest_url}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {board.keywords.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {board.keywords.map((k) => (
                          <span
                            key={k.id}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {board.contents.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {board.contents.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {c.titel}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(board)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label="Bearbeiten"
                        title="Bearbeiten"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(board.id)}
                        disabled={isPending}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
                )
                if (!isExpanded) return [boardRow]
                return [
                  boardRow,
                  <tr
                    key={`${board.id}-pins`}
                    className="bg-gray-50/60"
                  >
                    <td colSpan={9} className="px-4 py-3">
                      {boardPins.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Noch keine Pins für dieses Board
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Pin-Titel
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Status
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Veröffentlichungsdatum
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {boardPins.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-3 py-2 text-gray-900">
                                    {p.titel ?? (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PIN_STATUS_BADGE[p.status]}`}
                                    >
                                      {PIN_STATUS_LABEL[p.status]}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {formatBoardPinDate(
                                      p.geplante_veroeffentlichung
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>,
                ]
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
