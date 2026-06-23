'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import SortableTh from '@/components/SortableTh'
import InfoTooltip from '@/components/InfoTooltip'
import {
  addKeyword,
  deleteKeyword,
  importKeywords,
  matchKeywordsAction,
  updateKeyword,
} from './actions'

export type KeywordTyp = 'haupt' | 'mid_tail' | 'longtail'

export type ContentOption = {
  id: string
  titel: string
}

export type KeywordStats = {
  pinsCount: number
  avgCtr: number | null
  avgKlicks: number | null
}

export type Keyword = {
  id: string
  keyword: string
  typ: KeywordTyp
  notizen: string | null
  created_at: string
  contents: Array<{ id: string; titel: string }>
  stats: KeywordStats
}

type SortKey = 'keyword' | 'pins' | 'ctr' | 'klicks'

// Tooltip an der Ø-CTR-Spaltenüberschrift.
const CTR_COLUMN_TOOLTIP =
  'Durchschnittliche Klickrate aller Pins zu diesem Keyword, seit Beginn der Aufzeichnung. Berechnet aus allen ausgehenden Klicks geteilt durch alle Impressionen dieser Pins.'

function formatPercent(v: number | null): string {
  if (v === null) return '—'
  return `${v.toFixed(1).replace('.', ',')} %`
}

function formatNumber(v: number | null): string {
  if (v === null) return '—'
  return v >= 10
    ? Math.round(v).toLocaleString('de-DE')
    : v.toFixed(1).replace('.', ',')
}

const TYP_LABEL: Record<KeywordTyp, string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
}

const TYP_BADGE: Record<KeywordTyp, string> = {
  haupt: 'bg-gray-100 text-gray-700',
  mid_tail: 'bg-gray-100 text-gray-700',
  longtail: 'bg-gray-100 text-gray-700',
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

export default function KeywordsClient({
  keywords,
  availableContents,
}: {
  keywords: Keyword[]
  availableContents: ContentOption[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Keyword | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [contentFilter, setContentFilter] = useState('')
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(
    new Set()
  )
  const [isPending, startTransition] = useTransition()
  const [matching, setMatching] = useState(false)
  const [matchMessage, setMatchMessage] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(
    null
  )

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

  // Ohne aktive Spaltensortierung gilt die Default-Sortierung: Ø CTR
  // absteigend, Keywords ohne CTR (null) ans Ende. Mit aktivem Sort wird
  // nach der geklickten Spalte sortiert.
  const sortedKeywords = useMemo(() => {
    const arr = [...keywords]
    if (!sort) {
      return arr.sort((a, b) => {
        const ctrA = a.stats.avgCtr ?? -1
        const ctrB = b.stats.avgCtr ?? -1
        return ctrB - ctrA
      })
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return arr.sort((a, b) => {
      switch (sort.key) {
        case 'keyword':
          return a.keyword.localeCompare(b.keyword, 'de') * dir
        case 'pins':
          return (a.stats.pinsCount - b.stats.pinsCount) * dir
        case 'ctr':
          return ((a.stats.avgCtr ?? -1) - (b.stats.avgCtr ?? -1)) * dir
        case 'klicks':
          return ((a.stats.avgKlicks ?? -1) - (b.stats.avgKlicks ?? -1)) * dir
        default:
          return 0
      }
    })
  }, [keywords, sort])

  async function onMatchKeywords() {
    setMatching(true)
    setMatchError(null)
    setMatchMessage(null)
    try {
      const result = await matchKeywordsAction()
      if (result.error) {
        setMatchError(result.error)
      } else {
        setMatchMessage(
          `${result.matched ?? 0} Keyword-Verknüpfungen gefunden.`
        )
      }
    } finally {
      setMatching(false)
    }
  }

  const formOpen = showAddForm || editing !== null

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
    setShowImport(false)
    setSelectedContentIds(new Set())
    setContentFilter('')
    setFormError(null)
  }

  function openEdit(kw: Keyword) {
    setEditing(kw)
    setShowAddForm(false)
    setShowImport(false)
    setSelectedContentIds(new Set(kw.contents.map((c) => c.id)))
    setContentFilter('')
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setSelectedContentIds(new Set())
    setFormError(null)
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
    formData.delete('content_ids')
    selectedContentIds.forEach((id) => formData.append('content_ids', id))
    const result = editing
      ? await (() => {
          formData.set('id', editing.id)
          return updateKeyword(formData)
        })()
      : await addKeyword(formData)
    if (result.error) {
      setFormError(result.error)
      return
    }
    form.reset()
    closeForm()
  }

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setImportError(null)
    setImportMessage(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await importKeywords(formData)
    if (result.error) {
      setImportError(result.error)
      return
    }
    form.reset()
    setImportMessage(`${result.imported} Keyword(s) importiert.`)
    setShowImport(false)
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', id)
      await deleteKeyword(formData)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (showAddForm ? closeForm() : openAdd())}
          className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          {showAddForm ? 'Abbrechen' : 'Keyword hinzufügen'}
        </button>
        <button
          type="button"
          onClick={onMatchKeywords}
          disabled={matching}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Gleicht alle Pins erneut mit der Keyword-Datenbank ab, anhand von Pin-Titel und Pin-Beschreibung."
        >
          {matching ? 'Gleiche ab…' : 'Keywords neu abgleichen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImport((v) => !v)
            setShowAddForm(false)
            setEditing(null)
          }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showImport ? 'Abbrechen' : 'Keywords importieren'}
        </button>
        {importMessage && !showImport && (
          <span className="self-center text-sm text-green-700">
            {importMessage}
          </span>
        )}
        {matchMessage && (
          <span className="self-center text-sm text-green-700">
            {matchMessage}
          </span>
        )}
        {matchError && (
          <span className="self-center text-sm text-red-700">
            {matchError}
          </span>
        )}
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Keyword bearbeiten' : 'Neues Keyword'}
          </h2>

          <div>
            <label
              htmlFor="keyword"
              className="block text-sm font-medium text-gray-700"
            >
              Keyword <span className="text-red-600">*</span>
            </label>
            <input
              id="keyword"
              name="keyword"
              type="text"
              required
              defaultValue={editing?.keyword ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="typ"
              className="block text-sm font-medium text-gray-700"
            >
              Typ <span className="text-red-600">*</span>
            </label>
            <select
              id="typ"
              name="typ"
              required
              defaultValue={editing?.typ ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              <option value="haupt">Haupt</option>
              <option value="mid_tail">Mid-Tail</option>
              <option value="longtail">Longtail</option>
            </select>
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
                  Noch keine Content-Inhalte vorhanden. Lege erst welche unter
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

          <div>
            <label
              htmlFor="notizen"
              className="block text-sm font-medium text-gray-700"
            >
              Notizen
            </label>
            <textarea
              id="notizen"
              name="notizen"
              rows={3}
              defaultValue={editing?.notizen ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {formError && <p className="text-sm text-red-700">{formError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
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

      {showImport && (
        <form
          onSubmit={onImport}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Keywords importieren
          </h2>
          <p className="text-sm text-gray-600">
            Pro Zeile ein Keyword. Leerzeilen und Duplikate werden ignoriert.
          </p>

          <div>
            <label
              htmlFor="import-typ"
              className="block text-sm font-medium text-gray-700"
            >
              Typ für alle <span className="text-red-600">*</span>
            </label>
            <select
              id="import-typ"
              name="typ"
              required
              defaultValue=""
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              <option value="haupt">Haupt</option>
              <option value="mid_tail">Mid-Tail</option>
              <option value="longtail">Longtail</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="text"
              className="block text-sm font-medium text-gray-700"
            >
              Keywords <span className="text-red-600">*</span>
            </label>
            <textarea
              id="text"
              name="text"
              rows={10}
              required
              placeholder={'keyword 1\nkeyword 2\nkeyword 3'}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {importError && (
            <p className="text-sm text-red-700">{importError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
            >
              Importieren
            </button>
            <button
              type="button"
              onClick={() => setShowImport(false)}
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
              <SortableTh
                dir={dirOf('keyword')}
                onClick={() => toggleSort('keyword')}
                className="min-w-[180px]"
              >
                Keyword
              </SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <SortableTh
                dir={dirOf('pins')}
                onClick={() => toggleSort('pins')}
                align="right"
              >
                Pins
              </SortableTh>
              <SortableTh
                dir={dirOf('ctr')}
                onClick={() => toggleSort('ctr')}
                align="right"
                className="whitespace-nowrap"
              >
                <span className="whitespace-nowrap">
                  Ø CTR<InfoTooltip text={CTR_COLUMN_TOOLTIP} />
                </span>
              </SortableTh>
              <SortableTh
                dir={dirOf('klicks')}
                onClick={() => toggleSort('klicks')}
                align="right"
                className="whitespace-nowrap"
              >
                Ø Ausg. Klicks
              </SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Inhalte
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notizen
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedKeywords.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Keywords. Füge eines hinzu oder importiere mehrere.
                </td>
              </tr>
            ) : (
              sortedKeywords.map((kw) => {
                return (
                  <tr key={kw.id} className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {kw.keyword}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYP_BADGE[kw.typ]}`}
                      >
                        {TYP_LABEL[kw.typ]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {kw.stats.pinsCount === 0 ? (
                        '—'
                      ) : (
                        <Link
                          href={`/dashboard/pin-produktion?keyword=${encodeURIComponent(kw.keyword)}`}
                          className="font-medium text-link underline underline-offset-2"
                          title={`Pins anzeigen, in denen „${kw.keyword}" automatisch gefunden wurde`}
                        >
                          {kw.stats.pinsCount}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatPercent(kw.stats.avgCtr)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatNumber(kw.stats.avgKlicks)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {kw.contents.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {kw.contents.map((c) => (
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
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {kw.notizen ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(kw)}
                          className="text-gray-500 hover:text-gray-900"
                          aria-label="Bearbeiten"
                          title="Bearbeiten"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(kw.id)}
                          disabled={isPending}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
