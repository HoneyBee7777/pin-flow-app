'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  assignBoardAndImportMetrics,
  skipPendingImport,
  type UnmatchedBoard,
} from './actions'
import { formatDateDe, type BoardOption } from './utils'

type Props = {
  unmatchedBoards: UnmatchedBoard[]
  boards: BoardOption[]
  zeitraumVon: string
  zeitraumBis: string
  onAssigned: (slug: string) => void
  onSkipped: (slug: string) => void
}

// Username aus irgendeiner Board-URL des Nutzers ableiten — alle Boards
// liegen unter demselben Pinterest-Profil, also reicht der erste Treffer.
// "pin" als zweites Segment ist eine Pin-URL und wird übersprungen.
function extractPinterestUsername(url: string): string | null {
  const m = url.match(/pinterest\.[a-z.]+\/([^/?#]+)/i)
  if (!m) return null
  if (m[1].toLowerCase() === 'pin') return null
  return m[1]
}

export default function UnmatchedBoardsSection({
  unmatchedBoards,
  boards,
  zeitraumVon,
  zeitraumBis,
  onAssigned,
  onSkipped,
}: Props) {
  // Pinterest-Username aus dem ersten Board mit pinterest_url. Wird unten
  // genutzt um aus dem Slug einen klickbaren Direktlink zu bauen.
  const pinterestUsername = useMemo(() => {
    for (const b of boards) {
      if (!b.pinterest_url) continue
      const u = extractPinterestUsername(b.pinterest_url)
      if (u) return u
    }
    return null
  }, [boards])

  if (unmatchedBoards.length === 0) return null

  return (
    // Hinweis-Tipp-Farbe (zentrale Token --hinweis-tipp-*) — zieht mit, wenn die
    // Hinweis-Farbe geändert wird. Volle Fläche wie die Tipp-Box, kein Stripe
    // (ganze Sektion mit Liste, kein kompakter Hinweistext).
    <section
      id="unmatched-boards"
      className="scroll-mt-6 rounded-lg border border-hinweis-tipp-rand bg-hinweis-tipp-flaeche p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Nicht zugeordnete Boards aus dem letzten CSV-Import
        </h3>
        <p className="mt-0.5 text-xs text-gray-600">
          Zeitraum {formatDateDe(zeitraumVon)} – {formatDateDe(zeitraumBis)}
          {' · '}
          {unmatchedBoards.length} Board
          {unmatchedBoards.length === 1 ? '' : 's'} ausstehend
        </p>
      </div>
      <ul className="space-y-3">
        {unmatchedBoards.map((u) => (
          <UnmatchedBoardRow
            key={u.boardSlug}
            unmatched={u}
            boards={boards}
            datum={zeitraumBis}
            pinterestUsername={pinterestUsername}
            onAssigned={() => onAssigned(u.boardSlug)}
            onSkipped={() => onSkipped(u.boardSlug)}
          />
        ))}
      </ul>
    </section>
  )
}

function UnmatchedBoardRow({
  unmatched,
  boards,
  datum,
  pinterestUsername,
  onAssigned,
  onSkipped,
}: {
  unmatched: UnmatchedBoard
  boards: BoardOption[]
  datum: string
  pinterestUsername: string | null
  onAssigned: () => void
  onSkipped: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return [] as BoardOption[]
    return boards.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8)
  }, [boards, search])

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedId) ?? null,
    [boards, selectedId]
  )

  function onAssign() {
    if (!selectedId) {
      setError('Bitte ein Board auswählen.')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.set('board_id', selectedId)
    fd.set('pinterest_board_slug', unmatched.boardSlug)
    // Volle Pinterest-URL mitschicken, damit der Server pinterest_url in der
    // boards-Tabelle setzt — Voraussetzung für URL-basiertes Matching beim
    // nächsten Import.
    fd.set('pinterest_url', unmatched.boardUrl)
    fd.set('datum', datum)
    fd.set('impressionen', String(unmatched.impressionen))
    fd.set('engagement', String(unmatched.engagement))
    fd.set('klicks_auf_pins', String(unmatched.klicks_auf_pins))
    fd.set('ausgehende_klicks', String(unmatched.ausgehende_klicks))
    fd.set('saves', String(unmatched.saves))
    startTransition(async () => {
      const r = await assignBoardAndImportMetrics(fd)
      if (r.error) {
        setError(r.error)
        return
      }
      onAssigned()
    })
  }

  function onSkip() {
    setError(null)
    const fd = new FormData()
    fd.set('type', 'board')
    fd.set('identifier', unmatched.boardSlug)
    startTransition(async () => {
      // Best-Effort wie bei Pins — Server-Delete-Fehler blockiert nicht das
      // lokale State-Update.
      await skipPendingImport(fd)
      onSkipped()
    })
  }

  // Bevorzugt die echte URL aus dem CSV-Import. Fallback: aus Username +
  // Slug konstruieren (für Legacy-Pending-Zeilen ohne URL). Letzter Fallback:
  // reiner Slug-Text — Nutzer kann den Slug dann manuell suchen.
  const boardUrl =
    unmatched.boardUrl ||
    (pinterestUsername
      ? `https://www.pinterest.com/${pinterestUsername}/${unmatched.boardSlug}/`
      : null)

  return (
    <li className="rounded-md border border-gray-200 bg-white p-3">
      <div className="min-w-0 space-y-1">
        {boardUrl ? (
          <a
            href={boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-sm font-medium text-link underline underline-offset-2"
          >
            {unmatched.boardSlug} ↗
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900 break-all">
            Board-Slug:{' '}
            <span className="font-mono">{unmatched.boardSlug}</span>
          </p>
        )}
        <p className="text-xs text-gray-500">
          Klicks: {unmatched.ausgehende_klicks ?? '—'} · Impressionen:{' '}
          {unmatched.impressionen ?? '—'} · Saves:{' '}
          {unmatched.saves ?? '—'}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Welchem Board gehört dieser Slug?
        </label>
        {selectedBoard ? (
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
            <span className="truncate text-gray-900">{selectedBoard.name}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedId('')
                setSearch('')
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              × ändern
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Board-Name suchen…"
              autoComplete="off"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {search.trim() && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
                {filtered.length === 0 ? (
                  <p className="p-2 text-xs text-gray-500">
                    Keine passenden Boards gefunden.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(b.id)
                            setSearch('')
                          }}
                          className="block w-full p-2 text-left text-sm hover:bg-gray-50"
                        >
                          {b.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Datensatz verwerfen, Analytics-Daten dieses Boards werden NICHT importiert."
          >
            Überspringen
          </button>
          <button
            type="button"
            onClick={onAssign}
            disabled={!selectedId || isPending}
            className="rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
          >
            {isPending ? 'Zuordnet…' : 'Zuordnen & importieren'}
          </button>
        </div>
      </div>
    </li>
  )
}
