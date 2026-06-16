'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { updatePinAnalyticsEntry } from './actions'
import type { PinOption } from './utils'

type Props = {
  open: boolean
  onClose: () => void
  // Wird nach erfolgreichem Speichern aufgerufen — Tabs nutzen das, um die
  // Analytics-Tabelle ohne kompletten Reload zu aktualisieren.
  onSaved: () => void
  entry: {
    id: string
    pin_id: string
    pinTitel: string | null
    zeitraum_von: string
    zeitraum_bis: string
    impressionen: number
    klicks: number
    saves: number
    pinterestPinUrl: string | null
  } | null
  // Alle Pins des Users — für das „Pin-Titel zuordnen"-Dropdown.
  pins: PinOption[]
}

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

export default function PinAnalyticsEditModal({
  open,
  onClose,
  onSaved,
  entry,
  pins,
}: Props) {
  const [pinterestUrl, setPinterestUrl] = useState('')
  // True wenn der Nutzer auf „Entfernen" geklickt hat — beim Speichern
  // wird dann die bestehende URL auf NULL gesetzt.
  const [removeCurrentUrl, setRemoveCurrentUrl] = useState(false)
  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  // Pin-Zuordnung: ausgewählte pin_id (initial = entry.pin_id, kann via
  // Dropdown geändert werden). Suche-Term steuert das Filterergebnis.
  const [selectedPinId, setSelectedPinId] = useState('')
  const [pinSearch, setPinSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Beim Öffnen das Formular mit den bestehenden Werten vorbefüllen. Das
  // Input-Feld bleibt leer — die aktuell zugeordnete URL wird oben separat
  // angezeigt; das Feld dient zum Neuzuordnen.
  useEffect(() => {
    if (open && entry) {
      setPinterestUrl('')
      setRemoveCurrentUrl(false)
      setZeitraumVon(entry.zeitraum_von)
      setZeitraumBis(entry.zeitraum_bis)
      setImpressionen(String(entry.impressionen))
      setKlicks(String(entry.klicks))
      setSaves(String(entry.saves))
      setSelectedPinId(entry.pin_id)
      setPinSearch('')
      setError(null)
    }
  }, [open, entry])

  const filteredPins = useMemo(() => {
    const q = pinSearch.trim().toLowerCase()
    if (!q) return [] as PinOption[]
    return pins
      .filter((p) => (p.titel ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [pins, pinSearch])

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedPinId) ?? null,
    [pins, selectedPinId]
  )

  if (!open || !entry) return null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!entry) return
    if (!selectedPinId) {
      setError('Bitte einen Pin-Titel auswählen.')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.set('id', entry.id)
    fd.set('pin_id', selectedPinId)
    fd.set('zeitraum_von', zeitraumVon)
    fd.set('zeitraum_bis', zeitraumBis)
    fd.set('impressionen', impressionen)
    fd.set('klicks', klicks)
    fd.set('saves', saves)
    fd.set('pinterest_pin_url', pinterestUrl.trim())
    if (removeCurrentUrl && !pinterestUrl.trim()) {
      fd.set('pinterest_pin_url_remove', '1')
    }
    startTransition(async () => {
      const r = await updatePinAnalyticsEntry(fd)
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
                Pin-Analytics bearbeiten
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {entry.pinTitel ?? '— ohne Titel —'}
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
              {entry.pinterestPinUrl && !removeCurrentUrl && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <span className="text-gray-600">Aktuell zugeordnet:</span>
                  <a
                    href={entry.pinterestPinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium text-red-600 hover:underline"
                  >
                    {entry.pinterestPinUrl} ↗
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
                htmlFor="edit_pin_pinterest_url"
                className="block text-sm font-medium text-gray-700"
              >
                Pinterest URL neu zuordnen
              </label>
              <input
                id="edit_pin_pinterest_url"
                type="url"
                value={pinterestUrl}
                onChange={(e) => setPinterestUrl(e.target.value)}
                placeholder="https://www.pinterest.com/pin/1091700765947216952/"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leer lassen, um die aktuelle Zuordnung zu behalten. Diese URL
                wird für den automatischen CSV-Import benötigt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pin-Titel zuordnen
              </label>
              {selectedPin ? (
                <div className="mt-1 flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate text-gray-900">
                    {selectedPin.titel ?? (
                      <span className="text-gray-500">— ohne Titel —</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPinId('')
                      setPinSearch('')
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
                    value={pinSearch}
                    onChange={(e) => setPinSearch(e.target.value)}
                    placeholder="Pin-Titel suchen..."
                    autoComplete="off"
                    className={inputCls}
                  />
                  {pinSearch.trim() && (
                    <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
                      {filteredPins.length === 0 ? (
                        <p className="p-2 text-xs text-gray-500">
                          Keine passenden Pins gefunden.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {filteredPins.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPinId(p.id)
                                  setPinSearch('')
                                }}
                                className="block w-full p-2 text-left text-sm hover:bg-gray-50"
                              >
                                {p.titel ?? '— ohne Titel —'}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit_pin_zv"
                  className="block text-sm font-medium text-gray-700"
                >
                  Zeitraum von
                </label>
                <input
                  id="edit_pin_zv"
                  type="date"
                  required
                  value={zeitraumVon}
                  onChange={(e) => setZeitraumVon(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_pin_zb"
                  className="block text-sm font-medium text-gray-700"
                >
                  Zeitraum bis
                </label>
                <input
                  id="edit_pin_zb"
                  type="date"
                  required
                  value={zeitraumBis}
                  onChange={(e) => setZeitraumBis(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="edit_pin_imp"
                  className="block text-sm font-medium text-gray-700"
                >
                  Impressionen
                </label>
                <input
                  id="edit_pin_imp"
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
                  htmlFor="edit_pin_klicks"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ausgehende Klicks
                </label>
                <input
                  id="edit_pin_klicks"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={klicks}
                  onChange={(e) => setKlicks(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit_pin_saves"
                  className="block text-sm font-medium text-gray-700"
                >
                  Saves
                </label>
                <input
                  id="edit_pin_saves"
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
