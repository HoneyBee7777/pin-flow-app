'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { updateBoardAnalyticsEntry } from './actions'
import type { BoardOption } from './utils'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  entry: {
    id: string
    board_id: string
    boardName: string | null
    datum: string
    impressionen: number
    engagement: number
    klicks_auf_pins: number
    ausgehende_klicks: number
    saves: number
    pinterestUrl: string | null
  } | null
  // Alle Boards des Users — für das „Board zuordnen"-Dropdown.
  boards: BoardOption[]
}

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

export default function BoardAnalyticsEditModal({
  open,
  onClose,
  onSaved,
  entry,
  boards,
}: Props) {
  const [pinterestUrl, setPinterestUrl] = useState('')
  // True wenn der Nutzer auf „Entfernen" geklickt hat — beim Speichern
  // wird dann die bestehende URL auf NULL gesetzt.
  const [removeCurrentUrl, setRemoveCurrentUrl] = useState(false)
  const [datum, setDatum] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [engagement, setEngagement] = useState('')
  const [klicksAufPins, setKlicksAufPins] = useState('')
  const [ausgehendeKlicks, setAusgehendeKlicks] = useState('')
  const [saves, setSaves] = useState('')
  // Board-Zuordnung: ausgewählte board_id (initial = entry.board_id, kann
  // via Dropdown geändert werden).
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [boardSearch, setBoardSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open && entry) {
      setPinterestUrl('')
      setRemoveCurrentUrl(false)
      setDatum(entry.datum)
      setImpressionen(String(entry.impressionen))
      setEngagement(String(entry.engagement))
      setKlicksAufPins(String(entry.klicks_auf_pins))
      setAusgehendeKlicks(String(entry.ausgehende_klicks))
      setSaves(String(entry.saves))
      setSelectedBoardId(entry.board_id)
      setBoardSearch('')
      setError(null)
    }
  }, [open, entry])

  const filteredBoards = useMemo(() => {
    const q = boardSearch.trim().toLowerCase()
    if (!q) return [] as BoardOption[]
    return boards
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [boards, boardSearch])

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId) ?? null,
    [boards, selectedBoardId]
  )

  if (!open || !entry) return null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!entry) return
    if (!selectedBoardId) {
      setError('Bitte ein Board auswählen.')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.set('id', entry.id)
    fd.set('board_id', selectedBoardId)
    fd.set('datum', datum)
    fd.set('impressionen', impressionen)
    fd.set('engagement', engagement)
    fd.set('klicks_auf_pins', klicksAufPins)
    fd.set('ausgehende_klicks', ausgehendeKlicks)
    fd.set('saves', saves)
    fd.set('pinterest_url', pinterestUrl.trim())
    if (removeCurrentUrl && !pinterestUrl.trim()) {
      fd.set('pinterest_url_remove', '1')
    }
    startTransition(async () => {
      const r = await updateBoardAnalyticsEntry(fd)
      if (r.error) {
        setError(r.error)
        return
      }
      onSaved()
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <form onSubmit={onSubmit}>
          <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Board-Analytics bearbeiten
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {entry.boardName ?? '— ohne Namen —'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              {entry.pinterestUrl && !removeCurrentUrl && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <span className="text-gray-600">Aktuell zugeordnet:</span>
                  <a
                    href={entry.pinterestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium text-red-600 hover:underline"
                  >
                    {entry.pinterestUrl} ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setRemoveCurrentUrl(true)}
                    className="ml-auto rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Entfernen
                  </button>
                </div>
              )}
              {removeCurrentUrl && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>
                    Bisherige URL wird beim Speichern entfernt.
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveCurrentUrl(false)}
                    className="ml-auto rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50"
                  >
                    Rückgängig
                  </button>
                </div>
              )}
              <label
                htmlFor="edit_board_pinterest_url"
                className="block text-sm font-medium text-gray-700"
              >
                Pinterest URL neu zuordnen
              </label>
              <input
                id="edit_board_pinterest_url"
                type="url"
                value={pinterestUrl}
                onChange={(e) => setPinterestUrl(e.target.value)}
                placeholder="https://www.pinterest.com/soulfulspaceyoga/yoga-zuhause/"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leer lassen, um die aktuelle Zuordnung zu behalten. Diese URL
                wird für den automatischen CSV-Import benötigt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Board zuordnen
              </label>
              {selectedBoard ? (
                <div className="mt-1 flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate text-gray-900">
                    {selectedBoard.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBoardId('')
                      setBoardSearch('')
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
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                    placeholder="Board suchen..."
                    autoComplete="off"
                    className={inputCls}
                  />
                  {boardSearch.trim() && (
                    <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
                      {filteredBoards.length === 0 ? (
                        <p className="p-2 text-xs text-gray-500">
                          Keine passenden Boards gefunden.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {filteredBoards.map((b) => (
                            <li key={b.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBoardId(b.id)
                                  setBoardSearch('')
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
            </div>

            <div>
              <label
                htmlFor="edit_board_datum"
                className="block text-sm font-medium text-gray-700"
              >
                Datum
              </label>
              <input
                id="edit_board_datum"
                type="date"
                required
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="edit_board_imp"
                  className="block text-sm font-medium text-gray-700"
                >
                  Impressionen
                </label>
                <input
                  id="edit_board_imp"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={impressionen}
                  onChange={(e) => setImpressionen(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_board_engagement"
                  className="block text-sm font-medium text-gray-700"
                >
                  Engagement
                </label>
                <input
                  id="edit_board_engagement"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={engagement}
                  onChange={(e) => setEngagement(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_board_pin_klicks"
                  className="block text-sm font-medium text-gray-700"
                >
                  Pin Klicks
                </label>
                <input
                  id="edit_board_pin_klicks"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={klicksAufPins}
                  onChange={(e) => setKlicksAufPins(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_board_ausgehend"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ausgehende Klicks
                </label>
                <input
                  id="edit_board_ausgehend"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={ausgehendeKlicks}
                  onChange={(e) => setAusgehendeKlicks(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_board_saves"
                  className="block text-sm font-medium text-gray-700"
                >
                  Saves
                </label>
                <input
                  id="edit_board_saves"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={saves}
                  onChange={(e) => setSaves(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
