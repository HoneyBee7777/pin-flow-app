'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { addContent, deleteContent, updateContent } from './actions'

export type ContentTyp =
  | 'blogpost'
  | 'produkt'
  | 'affiliate'
  | 'landingpage'
  | 'leadmagnet'

export type StrategieTyp = 'traffic' | 'lead' | 'sales'

export type KeywordOption = {
  id: string
  keyword: string
  typ: 'haupt' | 'mid_tail' | 'longtail'
}

export type UrlOption = {
  id: string
  titel: string
  url: string
}

export type ContentItem = {
  id: string
  titel: string
  typ: ContentTyp
  strategie_typ: StrategieTyp
  notizen: string | null
  created_at: string
  keywords: Array<{ id: string; keyword: string }>
  urls: Array<{ id: string; titel: string; url: string }>
}

const TYP_OPTIONS: Array<{ value: ContentTyp; label: string }> = [
  { value: 'blogpost', label: 'Blogpost' },
  { value: 'produkt', label: 'Produkt' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'landingpage', label: 'Landingpage' },
  { value: 'leadmagnet', label: 'Lead-Magnet' },
]

const TYP_LABEL: Record<ContentTyp, string> = Object.fromEntries(
  TYP_OPTIONS.map((o) => [o.value, o.label])
) as Record<ContentTyp, string>

const TYP_BADGE: Record<ContentTyp, string> = {
  blogpost: 'bg-blue-100 text-blue-700',
  produkt: 'bg-purple-100 text-purple-700',
  affiliate: 'bg-pink-100 text-pink-700',
  landingpage: 'bg-indigo-100 text-indigo-700',
  leadmagnet: 'bg-amber-100 text-amber-800',
}

const STRATEGIE_OPTIONS: Array<{ value: StrategieTyp; label: string }> = [
  { value: 'traffic', label: 'Traffic' },
  { value: 'lead', label: 'Lead' },
  { value: 'sales', label: 'Sales' },
]

const STRATEGIE_LABEL: Record<StrategieTyp, string> = {
  traffic: 'Traffic',
  lead: 'Lead',
  sales: 'Sales',
}

const STRATEGIE_BADGE: Record<StrategieTyp, string> = {
  traffic: 'bg-sky-100 text-sky-700',
  lead: 'bg-amber-100 text-amber-800',
  sales: 'bg-emerald-100 text-emerald-700',
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

export default function ContentClient({
  items,
  availableKeywords,
  availableUrls,
}: {
  items: ContentItem[]
  availableKeywords: KeywordOption[]
  availableUrls: UrlOption[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState('')
  const [urlFilter, setUrlFilter] = useState('')
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedUrlIds, setSelectedUrlIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const formOpen = showAddForm || editing !== null

  const filteredKeywords = useMemo(() => {
    const q = keywordFilter.trim().toLowerCase()
    if (!q) return availableKeywords
    return availableKeywords.filter((k) =>
      k.keyword.toLowerCase().includes(q)
    )
  }, [keywordFilter, availableKeywords])

  const filteredUrls = useMemo(() => {
    const q = urlFilter.trim().toLowerCase()
    if (!q) return availableUrls
    return availableUrls.filter(
      (u) =>
        u.titel.toLowerCase().includes(q) || u.url.toLowerCase().includes(q)
    )
  }, [urlFilter, availableUrls])

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setSelectedKeywordIds(new Set())
    setSelectedUrlIds(new Set())
    setKeywordFilter('')
    setUrlFilter('')
    setFormError(null)
  }

  function openEdit(item: ContentItem) {
    setEditing(item)
    setShowAddForm(false)
    setSelectedKeywordIds(new Set(item.keywords.map((k) => k.id)))
    setSelectedUrlIds(new Set(item.urls.map((u) => u.id)))
    setKeywordFilter('')
    setUrlFilter('')
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setSelectedKeywordIds(new Set())
    setSelectedUrlIds(new Set())
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

  function toggleUrl(id: string) {
    setSelectedUrlIds((prev) => {
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
    formData.delete('url_ids')
    selectedKeywordIds.forEach((id) => formData.append('keyword_ids', id))
    selectedUrlIds.forEach((id) => formData.append('url_ids', id))

    const result = editing
      ? await (() => {
          formData.set('id', editing.id)
          return updateContent(formData)
        })()
      : await addContent(formData)

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
      await deleteContent(formData)
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
          {showAddForm ? 'Abbrechen' : 'Inhalt hinzufügen'}
        </button>
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Inhalt bearbeiten' : 'Neuer Inhalt'}
          </h2>

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
              defaultValue={editing?.titel ?? ''}
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
                defaultValue={editing?.typ ?? ''}
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
                htmlFor="strategie_typ"
                className="block text-sm font-medium text-gray-700"
              >
                Strategie-Typ <span className="text-red-600">*</span>
              </label>
              <select
                id="strategie_typ"
                name="strategie_typ"
                required
                defaultValue={editing?.strategie_typ ?? ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {STRATEGIE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
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
                Ziel-URLs zuordnen
              </label>
              {availableUrls.length > 0 && (
                <input
                  type="text"
                  value={urlFilter}
                  onChange={(e) => setUrlFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-3">
              {availableUrls.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Noch keine Ziel-URLs vorhanden — lege erst welche unter
                  „Ziel-URLs“ an.
                </p>
              ) : filteredUrls.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Keine Treffer für „{urlFilter}“.
                </p>
              ) : (
                filteredUrls.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrlIds.has(u.id)}
                      onChange={() => toggleUrl(u.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1">
                      <span className="block text-gray-900">{u.titel}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {u.url}
                      </span>
                    </span>
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Titel
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Strategie
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Keywords
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ziel-URLs
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Inhalte. Lege deinen ersten an.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.titel}
                    {item.notizen && (
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {item.notizen}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYP_BADGE[item.typ]}`}
                    >
                      {TYP_LABEL[item.typ]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGIE_BADGE[item.strategie_typ]}`}
                    >
                      {STRATEGIE_LABEL[item.strategie_typ]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.keywords.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map((k) => (
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
                    {item.urls.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {item.urls.map((u) => (
                          <li key={u.id}>
                            <a
                              href={u.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 hover:text-red-700 hover:underline"
                              title={u.url}
                            >
                              {u.titel}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label="Bearbeiten"
                        title="Bearbeiten"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
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
