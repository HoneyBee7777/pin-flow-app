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
import { PinKategorieIcon } from '@/components/PinKategorieIcon'
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
          Deine Setup-Checkliste
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          Hier liegt dein Fundament. Jeder Punkt auf dieser Liste bringt dich
          einen Schritt näher an einen Pinterest-Auftritt, der trägt. Geh sie in
          deinem Tempo durch, hake ab, was steht, und komm zurück, wann immer du
          etwas nachschärfen willst. Diese Liste wartet auf dich, nicht
          umgekehrt.
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
              allDone ? 'bg-status-gut' : 'bg-marke-blaugrau'
            }`}
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
                <span className="flex flex-1 items-center gap-2 text-base font-semibold text-gray-900">
                  {cat.icon && (
                    <PinKategorieIcon
                      name={cat.icon}
                      className="h-4 w-4 shrink-0 text-marke-blaugrau"
                    />
                  )}
                  {cat.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    doneInCat === total
                      ? 'bg-status-gut-flaeche text-status-gut-text'
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
        <div className="rounded-lg border border-status-gut border-l-[3px] border-l-status-gut bg-status-gut-flaeche p-6">
          <h2 className="text-lg font-bold text-status-gut-text">
            Glückwunsch — du bist bestens aufgestellt!
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-status-gut-text">
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
            className="mt-4 inline-flex items-center rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-semibold text-white hover:bg-marke-blaugrau-dunkel"
          >
            → Zum Dashboard
          </Link>
        </div>
      ) : (
        <p className="text-center text-sm text-marke-blaugrau-mittel">
          Hake alle Punkte ab, um die Setup-Reise abzuschließen.
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
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-marke-blaugrau"
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
        className="text-[13px] font-medium text-link underline underline-offset-2"
      >
        {label} ↗
      </a>
    )
  }
  return (
    <Link
      href={link.href}
      className="text-[13px] font-medium text-link underline underline-offset-2"
    >
      → {label}
    </Link>
  )
}
