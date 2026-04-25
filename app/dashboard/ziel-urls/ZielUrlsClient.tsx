'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { addZielUrl, deleteZielUrl, importZielUrls } from './actions'

export type ZielUrlTyp =
  | 'blogpost'
  | 'produkt'
  | 'affiliate'
  | 'landingpage'
  | 'leadmagnet'
  | 'kategorie'
  | 'startseite'

export type Prioritaet = 'hoch' | 'mittel' | 'niedrig'

export type ZielUrl = {
  id: string
  url: string
  titel: string
  typ: ZielUrlTyp
  prioritaet: Prioritaet
  notizen: string | null
  created_at: string
}

const TYP_OPTIONS: Array<{ value: ZielUrlTyp; label: string }> = [
  { value: 'blogpost', label: 'Blogpost' },
  { value: 'produkt', label: 'Produkt' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'landingpage', label: 'Landingpage' },
  { value: 'leadmagnet', label: 'Lead-Magnet' },
  { value: 'kategorie', label: 'Kategorie' },
  { value: 'startseite', label: 'Startseite' },
]

const TYP_LABEL: Record<ZielUrlTyp, string> = Object.fromEntries(
  TYP_OPTIONS.map((o) => [o.value, o.label])
) as Record<ZielUrlTyp, string>

const TYP_BADGE: Record<ZielUrlTyp, string> = {
  blogpost: 'bg-blue-100 text-blue-700',
  produkt: 'bg-purple-100 text-purple-700',
  affiliate: 'bg-pink-100 text-pink-700',
  landingpage: 'bg-indigo-100 text-indigo-700',
  leadmagnet: 'bg-amber-100 text-amber-800',
  kategorie: 'bg-teal-100 text-teal-700',
  startseite: 'bg-gray-100 text-gray-700',
}

const PRIO_OPTIONS: Array<{ value: Prioritaet; label: string }> = [
  { value: 'hoch', label: 'Hoch' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'niedrig', label: 'Niedrig' },
]

const PRIO_LABEL: Record<Prioritaet, string> = {
  hoch: 'Hoch',
  mittel: 'Mittel',
  niedrig: 'Niedrig',
}

const PRIO_BADGE: Record<Prioritaet, string> = {
  hoch: 'bg-red-100 text-red-700',
  mittel: 'bg-yellow-100 text-yellow-800',
  niedrig: 'bg-green-100 text-green-700',
}

const PRIO_DOT: Record<Prioritaet, string> = {
  hoch: 'bg-red-500',
  mittel: 'bg-yellow-500',
  niedrig: 'bg-green-500',
}

export default function ZielUrlsClient({ urls }: { urls: ZielUrl[] }) {
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
    const result = await addZielUrl(formData)
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
    const result = await importZielUrls(formData)
    if (result.error) {
      setImportError(result.error)
      return
    }
    form.reset()
    setImportMessage(`${result.imported} URL(s) importiert.`)
    setShowImport(false)
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', id)
      await deleteZielUrl(formData)
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
          {showAddForm ? 'Abbrechen' : 'URL hinzufügen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImport((v) => !v)
            setShowAddForm(false)
          }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showImport ? 'Abbrechen' : 'URLs importieren'}
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
          <h2 className="text-lg font-semibold text-gray-900">Neue Ziel-URL</h2>

          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700"
            >
              URL <span className="text-red-600">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://www.meinewebsite.de"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bitte vollständige URL eingeben, z.B. https://www.meinewebsite.de
            </p>
          </div>

          <div>
            <label
              htmlFor="titel"
              className="block text-sm font-medium text-gray-700"
            >
              Titel <span className="text-red-600">*</span>
            </label>
            <input
              id="titel"
              name="titel"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                {TYP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="prioritaet"
                className="block text-sm font-medium text-gray-700"
              >
                Priorität <span className="text-red-600">*</span>
              </label>
              <select
                id="prioritaet"
                name="prioritaet"
                required
                defaultValue=""
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {PRIO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {addError && <p className="text-sm text-red-700">{addError}</p>}

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
            URLs importieren
          </h2>
          <p className="text-sm text-gray-600">
            Pro Zeile eine URL — optional gefolgt von <code>|</code> und einem
            Titel. Ohne Titel wird die URL selbst als Titel verwendet.
            Duplikate und Leerzeilen werden ignoriert.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
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
                {TYP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="import-prio"
                className="block text-sm font-medium text-gray-700"
              >
                Priorität für alle <span className="text-red-600">*</span>
              </label>
              <select
                id="import-prio"
                name="prioritaet"
                required
                defaultValue=""
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {PRIO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="text"
              className="block text-sm font-medium text-gray-700"
            >
              URLs <span className="text-red-600">*</span>
            </label>
            <textarea
              id="text"
              name="text"
              rows={10}
              required
              placeholder={
                'https://example.com/post-1\nhttps://example.com/post-2 | Mein Titel\nhttps://example.com/post-3'
              }
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
                Titel
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Priorität
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
            {urls.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine URLs. Füge eine hinzu oder importiere mehrere.
                </td>
              </tr>
            ) : (
              urls.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {u.titel}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm">
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-red-600 hover:text-red-700 hover:underline"
                      title={u.url}
                    >
                      {u.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYP_BADGE[u.typ]}`}
                    >
                      {TYP_LABEL[u.typ]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIO_BADGE[u.prioritaet]}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${PRIO_DOT[u.prioritaet]}`}
                        aria-hidden
                      />
                      {PRIO_LABEL[u.prioritaet]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {u.notizen ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onDelete(u.id)}
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
