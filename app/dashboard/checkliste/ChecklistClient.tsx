'use client'

// V3.6 — Checklisten-UI: Fortschrittsbalken, 6 Kategorie-Accordions mit
// Mini-Fortschritt, abhakbare Punkte (optimistic + Supabase-Persistenz),
// Glückwunsch-Box bei 100 %.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_TOTAL,
  type ChecklistItem,
  type ChecklistLink,
} from '@/lib/checklist-content'
import { toggleChecklistItem } from './actions'

export default function ChecklistClient({
  initialCompleted,
}: {
  initialCompleted: string[]
}) {
  const [done, setDone] = useState<Set<string>>(
    () => new Set(initialCompleted)
  )
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const completedCount = done.size
  const pct = Math.round((completedCount / CHECKLIST_TOTAL) * 100)
  const allDone = completedCount === CHECKLIST_TOTAL

  function toggle(itemId: string) {
    const next = new Set(done)
    const willBeDone = !next.has(itemId)
    if (willBeDone) next.add(itemId)
    else next.delete(itemId)
    // Optimistic
    setDone(next)
    setError(null)
    startTransition(async () => {
      try {
        const res = await toggleChecklistItem(itemId, willBeDone)
        if (res.error) throw new Error(res.error)
      } catch {
        // Revert bei Fehler
        setDone((cur) => {
          const reverted = new Set(cur)
          if (willBeDone) reverted.delete(itemId)
          else reverted.add(itemId)
          return reverted
        })
        setError(
          'Konnte den Status nicht speichern. Prüfe deine Verbindung und versuche es erneut.'
        )
      }
    })
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          📋 Setup-Checkliste
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          Eine konkrete Schritt-für-Schritt-Anleitung, was du tun solltest,
          um Pin-Flow optimal einzurichten und mit Pinterest erfolgreich zu
          starten. Hak ab, was du erledigt hast — dein Fortschritt wird
          automatisch gespeichert.
        </p>
      </header>

      {/* Fortschrittsbalken — sticky am oberen Rand */}
      <div className="sticky top-0 z-10 -mx-6 border-b border-gray-200 bg-gray-50/95 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span>Dein Setup-Fortschritt</span>
          <span>
            {completedCount} von {CHECKLIST_TOTAL} erledigt — {pct}%
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? 'bg-emerald-500' : 'bg-red-500'
            } ${allDone ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Kategorien als Accordions */}
      <div className="space-y-3">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const total = cat.items.length
          const doneInCat = cat.items.filter((i) => done.has(i.id)).length
          return (
            <details
              key={cat.id}
              className="group rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="text-lg leading-none text-gray-400"
                >
                  <span className="inline group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                </span>
                <span className="flex-1 text-base font-semibold text-gray-900">
                  {cat.emoji ? `${cat.emoji} ` : ''}
                  {cat.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    doneInCat === total
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {doneInCat} / {total}
                </span>
              </summary>
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {cat.items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    checked={done.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </ul>
            </details>
          )
        })}
      </div>

      {allDone ? (
        <div className="rounded-lg border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-emerald-50 p-6">
          <h2 className="text-lg font-bold text-emerald-900">
            🎉 Glückwunsch — du bist bestens aufgestellt!
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-emerald-900">
            <p>
              Du hast alle Setup-Punkte abgehakt. Pin-Flow läuft jetzt mit
              der Datentiefe, die wirklich Erkenntnisse liefert.
            </p>
            <p>
              Ab jetzt wirkt der <strong>Pin-Flow-Effekt</strong>: Statt
              zwischen Excel-Tabellen, Notizen und Pinterest hin- und
              herzuwechseln, hast du alles an einem Ort. Strategie,
              Keywords, Inhalte, Boards und Analytics greifen ineinander —
              und sparen dir jeden Monat mehrere Stunden Pinterest-Arbeit.
            </p>
            <p>
              Pinterest ist ein Marathon, kein Sprint — und du hast den
              Startschuss perfekt gesetzt.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            → Zum Dashboard
          </Link>
        </div>
      ) : (
        <p className="text-center text-sm italic text-gray-500">
          Hak alle Punkte ab, um die Setup-Reise abzuschließen.
        </p>
      )}
    </div>
  )
}

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex gap-3 px-5 py-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={item.title}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-red-600"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggle}
          className="text-left"
        >
          <span
            className={`text-sm font-semibold ${
              checked
                ? 'text-gray-400 line-through'
                : 'text-gray-900'
            }`}
          >
            {item.title}
          </span>
        </button>
        <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">
          {item.description}
        </p>
        {item.links.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {item.links.map((l, i) => (
              <ChecklistLinkView key={i} link={l} />
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

function ChecklistLinkView({ link }: { link: ChecklistLink }) {
  const label =
    link.type === 'knowledge'
      ? `Mehr dazu: ${link.label}`
      : link.label
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-medium text-red-600 hover:underline"
      >
        → {label} ↗
      </a>
    )
  }
  return (
    <Link
      href={link.href}
      className="text-[13px] font-medium text-red-600 hover:underline"
    >
      → {label}
    </Link>
  )
}
