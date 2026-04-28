'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { addVorlage, deleteVorlage, updateVorlage } from './actions'
import {
  VORLAGEN_TYPEN,
  VORLAGEN_TYP_BADGE,
  VORLAGEN_TYP_LABEL,
  type VorlageWithStats,
  type VorlagenTyp,
} from './utils'

const TYP_OPTIONS: Array<{ value: VorlagenTyp; label: string }> =
  VORLAGEN_TYPEN.map((t) => ({ value: t, label: VORLAGEN_TYP_LABEL[t] }))

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

export default function CanvaClient({
  vorlagen,
}: {
  vorlagen: VorlageWithStats[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState<VorlageWithStats | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const formOpen = showAddForm || editing !== null

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setFormError(null)
  }

  function openEdit(v: VorlageWithStats) {
    setEditing(v)
    setShowAddForm(false)
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setFormError(null)
  }

  async function onSubmitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const result = editing
      ? await (() => {
          formData.set('id', editing.id)
          return updateVorlage(formData)
        })()
      : await addVorlage(formData)

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
      await deleteVorlage(formData)
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
          {showAddForm ? 'Abbrechen' : 'Vorlage hinzufügen'}
        </button>
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
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
              placeholder="z.B. Vorlage 01 — Text Rosa"
              defaultValue={editing?.name ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="canva_link"
              className="block text-sm font-medium text-gray-700"
            >
              Canva-Link
            </label>
            <input
              id="canva_link"
              name="canva_link"
              type="url"
              placeholder="https://www.canva.com/design/..."
              defaultValue={editing?.canva_link ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Direktlink zu deiner Canva-Vorlage.
            </p>
          </div>

          <div>
            <label
              htmlFor="vorlagen_typ"
              className="block text-sm font-medium text-gray-700"
            >
              Vorlagen-Typ <span className="text-red-600">*</span>
            </label>
            <select
              id="vorlagen_typ"
              name="vorlagen_typ"
              required
              defaultValue={editing?.vorlagen_typ ?? ''}
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
              htmlFor="farbschema"
              className="block text-sm font-medium text-gray-700"
            >
              Farbschema
            </label>
            <input
              id="farbschema"
              name="farbschema"
              type="text"
              placeholder="z.B. Rosa/Weiß"
              defaultValue={editing?.farbschema ?? ''}
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

      <div className="max-h-[500px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Farbschema
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Canva
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pins
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vorlagen.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Vorlagen. Füge eine hinzu.
                </td>
              </tr>
            ) : (
              vorlagen.map((v) => (
                <tr key={v.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{v.name}</span>
                      {v.hasDuplicate && (
                        <span
                          className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                          title="Diese Vorlage wurde bereits mehr als 3-mal mit derselben Ziel-URL verwendet"
                        >
                          ⚠️ Kombination bereits häufig genutzt
                        </span>
                      )}
                    </div>
                    {v.notizen && (
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {v.notizen}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VORLAGEN_TYP_BADGE[v.vorlagen_typ]}`}
                    >
                      {VORLAGEN_TYP_LABEL[v.vorlagen_typ]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.farbschema ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {v.canva_link ? (
                      <a
                        href={v.canva_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                      >
                        Öffnen ↗
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.pinCount}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label="Bearbeiten"
                        title="Bearbeiten"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(v.id)}
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
