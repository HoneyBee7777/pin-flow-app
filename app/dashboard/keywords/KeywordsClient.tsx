'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import {
  addKeyword,
  deleteKeyword,
  importKeywords,
  updateKeyword,
} from './actions'

export type KeywordTyp = 'haupt' | 'mid_tail' | 'longtail'

export type ContentOption = {
  id: string
  titel: string
}

export type Keyword = {
  id: string
  keyword: string
  typ: KeywordTyp
  saison_peak: string | null
  notizen: string | null
  created_at: string
  contents: Array<{ id: string; titel: string }>
}

const TYP_LABEL: Record<KeywordTyp, string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
}

const TYP_BADGE: Record<KeywordTyp, string> = {
  haupt: 'bg-red-100 text-red-700',
  mid_tail: 'bg-yellow-100 text-yellow-800',
  longtail: 'bg-green-100 text-green-700',
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
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => (showAddForm ? closeForm() : openAdd())}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {showAddForm ? 'Abbrechen' : 'Keyword hinzufügen'}
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
            <label
              htmlFor="saison_peak"
              className="block text-sm font-medium text-gray-700"
            >
              Saison-Peak
            </label>
            <input
              id="saison_peak"
              name="saison_peak"
              type="text"
              placeholder="z.B. November–Dezember"
              defaultValue={editing?.saison_peak ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
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
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Keyword
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Saison-Peak
              </th>
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
            {keywords.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Keywords. Füge eines hinzu oder importiere mehrere.
                </td>
              </tr>
            ) : (
              keywords.map((kw) => (
                <tr key={kw.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {kw.keyword}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYP_BADGE[kw.typ]}`}
                    >
                      {TYP_LABEL[kw.typ]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {kw.saison_peak ?? '—'}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
