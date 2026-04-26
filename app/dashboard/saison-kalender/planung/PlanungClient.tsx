'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { saveJahresdaten } from './actions'
import { formatDateDe } from '../utils'

export type PlanungEvent = {
  id: string
  event_name: string
  event_datum: string | null
  datum_jahr_plus_1: string | null
  datum_jahr_plus_2: string | null
}

export default function PlanungClient({
  events,
  aktuellesJahr,
  jahrPlus1,
  jahrPlus2,
}: {
  events: PlanungEvent[]
  aktuellesJahr: number
  jahrPlus1: number
  jahrPlus2: number
}) {
  return (
    <div className="space-y-4">
      {events.map((ev) => (
        <PlanungRow
          key={ev.id}
          event={ev}
          aktuellesJahr={aktuellesJahr}
          jahrPlus1={jahrPlus1}
          jahrPlus2={jahrPlus2}
        />
      ))}
    </div>
  )
}

function PlanungRow({
  event,
  aktuellesJahr,
  jahrPlus1,
  jahrPlus2,
}: {
  event: PlanungEvent
  aktuellesJahr: number
  jahrPlus1: number
  jahrPlus2: number
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    error?: string
    saved?: boolean
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveJahresdaten(formData)
      if (result.error) {
        setFeedback({ error: result.error })
      } else {
        setFeedback({ saved: true })
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="jahr_plus_1" value={jahrPlus1} />
      <input type="hidden" name="jahr_plus_2" value={jahrPlus2} />

      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {event.event_name}
        </h3>
        <p className="text-xs text-gray-500">
          {aktuellesJahr}: {formatDateDe(event.event_datum)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`datum_plus_1_${event.id}`}
            className="block text-sm font-medium text-gray-700"
          >
            Datum {jahrPlus1}
          </label>
          <input
            id={`datum_plus_1_${event.id}`}
            name="datum_plus_1"
            type="date"
            min={`${jahrPlus1}-01-01`}
            max={`${jahrPlus1}-12-31`}
            defaultValue={event.datum_jahr_plus_1 ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label
            htmlFor={`datum_plus_2_${event.id}`}
            className="block text-sm font-medium text-gray-700"
          >
            Datum {jahrPlus2}
          </label>
          <input
            id={`datum_plus_2_${event.id}`}
            name="datum_plus_2"
            type="date"
            min={`${jahrPlus2}-01-01`}
            max={`${jahrPlus2}-12-31`}
            defaultValue={event.datum_jahr_plus_2 ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Leer lassen, um eine bereits gespeicherte Planung wieder zu entfernen.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
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
