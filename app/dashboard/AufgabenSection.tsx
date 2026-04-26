'use client'

import {
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import {
  addAufgabe,
  deleteAufgabe,
  toggleAufgabe,
} from './actions/aufgaben'
import { formatDateDe } from './analytics/utils'

export type Aufgabe = {
  id: string
  titel: string
  faelligkeitsdatum: string | null
  erledigt: boolean
  created_at: string
}

export default function AufgabenSection({
  tasks,
  today,
}: {
  tasks: Aufgabe[]
  today: string
}) {
  const open = tasks.filter((t) => !t.erledigt)
  const done = tasks.filter((t) => t.erledigt)

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">
        Aufgaben & Erinnerungen
      </h2>
      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <OpenList tasks={open} today={today} />
        <DoneList tasks={done} />
        <AddForm />
      </div>
    </section>
  )
}

function OpenList({ tasks, today }: { tasks: Aufgabe[]; today: string }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Keine offenen Aufgaben 👍
      </p>
    )
  }
  return (
    <ul className="divide-y divide-gray-100">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} today={today} />
      ))}
    </ul>
  )
}

function DoneList({ tasks }: { tasks: Aufgabe[] }) {
  const [showAll, setShowAll] = useState(false)
  if (tasks.length === 0) return null

  const visible = showAll ? tasks : tasks.slice(0, 3)
  const hidden = tasks.length - visible.length

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Erledigt
      </p>
      <ul className="divide-y divide-gray-100">
        {visible.map((t) => (
          <TaskRow key={t.id} task={t} today="" />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          + {hidden} weitere erledigte einblenden
        </button>
      )}
      {showAll && tasks.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Erledigte ausblenden
        </button>
      )}
    </div>
  )
}

function TaskRow({ task, today }: { task: Aufgabe; today: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isOverdue =
    !task.erledigt &&
    !!task.faelligkeitsdatum &&
    task.faelligkeitsdatum < today
  const isToday =
    !task.erledigt &&
    !!task.faelligkeitsdatum &&
    task.faelligkeitsdatum === today

  function onToggle() {
    setError(null)
    startTransition(async () => {
      const r = await toggleAufgabe(task.id, !task.erledigt)
      if (r.error) setError(r.error)
    })
  }

  function onDelete() {
    setError(null)
    startTransition(async () => {
      const r = await deleteAufgabe(task.id)
      if (r.error) setError(r.error)
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={task.erledigt}
        onChange={onToggle}
        disabled={isPending}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
        aria-label={task.erledigt ? 'Wieder öffnen' : 'Als erledigt markieren'}
      />
      <span
        className={`flex-1 text-sm ${
          task.erledigt
            ? 'text-gray-400 line-through'
            : 'text-gray-900'
        }`}
      >
        {task.titel}
      </span>
      {task.faelligkeitsdatum && (
        <span
          className={`text-xs ${
            isOverdue ? 'font-medium text-red-600' : 'text-gray-500'
          }`}
        >
          {formatDateDe(task.faelligkeitsdatum)}
        </span>
      )}
      {isOverdue && (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          🔴 Überfällig
        </span>
      )}
      {isToday && (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          🟡 Heute fällig
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
        aria-label="Aufgabe löschen"
        title="Löschen"
      >
        ✕
      </button>
      {error && (
        <span className="basis-full text-xs text-red-700">{error}</span>
      )}
    </li>
  )
}

function AddForm() {
  const [titel, setTitel] = useState('')
  const [datum, setDatum] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!titel.trim()) return
    const fd = new FormData()
    fd.set('titel', titel.trim())
    if (datum) fd.set('faelligkeitsdatum', datum)
    startTransition(async () => {
      const r = await addAufgabe(fd)
      if (r.error) {
        setError(r.error)
        return
      }
      setTitel('')
      setDatum('')
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-200 pt-3"
    >
      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor="aufgabe_titel"
          className="block text-xs font-medium text-gray-500"
        >
          Aufgabe
        </label>
        <input
          id="aufgabe_titel"
          type="text"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z.B. Pinterest-Zahlen aktualisieren"
          maxLength={200}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <div>
        <label
          htmlFor="aufgabe_datum"
          className="block text-xs font-medium text-gray-500"
        >
          Fälligkeit (optional)
        </label>
        <input
          id="aufgabe_datum"
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !titel.trim()}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? 'Speichert…' : 'Hinzufügen'}
      </button>
      {error && (
        <span className="basis-full text-xs text-red-700">{error}</span>
      )}
    </form>
  )
}
