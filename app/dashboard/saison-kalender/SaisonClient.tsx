'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { addEvent, deleteEvent, updateEvent } from './actions'
import {
  formatDateDe,
  SAISON_TYP_BADGE,
  SAISON_TYP_LABEL,
  type EventWithStatus,
  type SaisonTyp,
} from './utils'

const TYP_OPTIONS: Array<{ value: SaisonTyp; label: string }> = [
  { value: 'feiertag', label: 'Feiertag' },
  { value: 'jahreszeit', label: 'Jahreszeit' },
  { value: 'shopping_event', label: 'Shopping-Event' },
  { value: 'evergreen', label: 'Evergreen' },
]

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

export default function SaisonClient({
  events,
}: {
  events: EventWithStatus[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState<EventWithStatus | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saisonTyp, setSaisonTyp] = useState<SaisonTyp | ''>('')
  const [isPending, startTransition] = useTransition()

  const formOpen = showAddForm || editing !== null
  const isEvergreen = saisonTyp === 'evergreen'

  function openAdd() {
    setEditing(null)
    setShowAddForm(true)
    setSaisonTyp('')
    setFormError(null)
  }

  function openEdit(ev: EventWithStatus) {
    setEditing(ev)
    setShowAddForm(false)
    setSaisonTyp(ev.saison_typ)
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditing(null)
    setSaisonTyp('')
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
          return updateEvent(formData)
        })()
      : await addEvent(formData)

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
      await deleteEvent(formData)
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
          {showAddForm ? 'Abbrechen' : 'Event hinzufügen'}
        </button>
      </div>

      {formOpen && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={onSubmitForm}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Event bearbeiten' : 'Neues Event'}
          </h2>

          <div>
            <label
              htmlFor="event_name"
              className="block text-sm font-medium text-gray-700"
            >
              Event-Name <span className="text-red-600">*</span>
            </label>
            <input
              id="event_name"
              name="event_name"
              type="text"
              required
              defaultValue={editing?.event_name ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="saison_typ"
              className="block text-sm font-medium text-gray-700"
            >
              Saison-Typ <span className="text-red-600">*</span>
            </label>
            <select
              id="saison_typ"
              name="saison_typ"
              required
              value={saisonTyp}
              onChange={(e) => setSaisonTyp(e.target.value as SaisonTyp | '')}
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
              htmlFor="event_datum"
              className="block text-sm font-medium text-gray-700"
            >
              Datum {!isEvergreen && <span className="text-red-600">*</span>}
            </label>
            <input
              id="event_datum"
              name="event_datum"
              type="date"
              required={!isEvergreen}
              disabled={isEvergreen}
              defaultValue={editing?.event_datum ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {isEvergreen && (
              <p className="mt-1 text-xs text-gray-500">
                Evergreen-Events haben kein festes Datum.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="suchbeginn_tage"
              className="block text-sm font-medium text-gray-700"
            >
              Suchbeginn-Tage
            </label>
            <input
              id="suchbeginn_tage"
              name="suchbeginn_tage"
              type="number"
              min={1}
              step={1}
              disabled={isEvergreen}
              placeholder="60"
              defaultValue={editing?.suchbeginn_tage ?? ''}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Wie viele Tage vor dem Event sollen Pins live gehen? Standard: 60.
            </p>
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
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Datum
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pin-Fenster
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Countdown
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Events. Füge eines hinzu.
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const s = ev.statusInfo
                return (
                  <tr key={ev.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}
                        title={s.label}
                      >
                        <span aria-hidden>{s.emoji}</span>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {ev.event_name}
                      {ev.notizen && (
                        <p className="mt-1 text-xs font-normal text-gray-500">
                          {ev.notizen}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDateDe(ev.event_datum)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.pinFenster ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SAISON_TYP_BADGE[ev.saison_typ]}`}
                      >
                        {SAISON_TYP_LABEL[ev.saison_typ]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.countdown ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(ev)}
                          className="text-gray-500 hover:text-gray-900"
                          aria-label="Bearbeiten"
                          title="Bearbeiten"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(ev.id)}
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
