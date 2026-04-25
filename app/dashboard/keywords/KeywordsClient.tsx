'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { addKeyword, deleteKeyword, importKeywords } from './actions'

export type KeywordTyp = 'haupt' | 'mid_tail' | 'longtail'

export type Keyword = {
  id: string
  keyword: string
  typ: KeywordTyp
  saison_peak: string | null
  notizen: string | null
  created_at: string
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

export default function KeywordsClient({
  keywords,
}: {
  keywords: Keyword[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await addKeyword(formData)
    if (result.error) {
      setAddError(result.error)
      return
    }
    form.reset()
    setShowAddForm(false)
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
          onClick={() => {
            setShowAddForm((v) => !v)
            setShowImport(false)
          }}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {showAddForm ? 'Abbrechen' : 'Keyword hinzufügen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImport((v) => !v)
            setShowAddForm(false)
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

      {showAddForm && (
        <form
          onSubmit={onAdd}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Neues Keyword
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {addError && (
            <p className="text-sm text-red-700">{addError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
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
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Keywords. Füge eines hinzu oder importiere mehrere.
                </td>
              </tr>
            ) : (
              keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-gray-50">
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
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {kw.notizen ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onDelete(kw.id)}
                      disabled={isPending}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
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
