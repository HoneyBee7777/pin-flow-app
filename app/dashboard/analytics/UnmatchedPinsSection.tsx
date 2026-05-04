'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  assignPinAndImportMetrics,
  skipPendingImport,
  type UnmatchedPin,
} from './actions'
import { formatDateDe, type PinOption } from './utils'

type Props = {
  unmatchedPins: UnmatchedPin[]
  pins: PinOption[]
  zeitraumVon: string
  zeitraumBis: string
  // Wenn der Nutzer einen Pin entweder zugeordnet oder übersprungen hat,
  // wird der Eintrag aus der globalen Unmatched-Liste entfernt.
  onAssigned: (pinterestPinId: string) => void
  onSkipped: (pinterestPinId: string) => void
}

// Default-Schwellwerte beim ersten Öffnen — der Filter ist sofort aktiv,
// damit Rauschen (Pins mit 0/1 Klicks) gar nicht erst die Liste füllt.
const DEFAULT_KLICKS = '2'
const DEFAULT_IMPRESSIONEN = '100'
const DEFAULT_SAVES = '1'

function parseThreshold(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export default function UnmatchedPinsSection({
  unmatchedPins,
  pins,
  zeitraumVon,
  zeitraumBis,
  onAssigned,
  onSkipped,
}: Props) {
  // Eingabewerte und „angewendete" Werte getrennt — der Filter wirkt erst,
  // wenn der Nutzer auf „Filtern" klickt (sonst zappt die Liste bei jeder
  // Tastatureingabe).
  const [klicksInput, setKlicksInput] = useState(DEFAULT_KLICKS)
  const [impInput, setImpInput] = useState(DEFAULT_IMPRESSIONEN)
  const [savesInput, setSavesInput] = useState(DEFAULT_SAVES)
  const [appliedKlicks, setAppliedKlicks] = useState<number | null>(
    parseThreshold(DEFAULT_KLICKS)
  )
  const [appliedImp, setAppliedImp] = useState<number | null>(
    parseThreshold(DEFAULT_IMPRESSIONEN)
  )
  const [appliedSaves, setAppliedSaves] = useState<number | null>(
    parseThreshold(DEFAULT_SAVES)
  )

  // ODER-Verknüpfung: ein Pin passt, wenn er mindestens einen GESETZTEN
  // Schwellwert erfüllt. Sind alle drei Schwellen leer, gilt kein Filter
  // → alle anzeigen.
  const filtered = useMemo(() => {
    const allEmpty =
      appliedKlicks === null &&
      appliedImp === null &&
      appliedSaves === null
    if (allEmpty) return unmatchedPins
    return unmatchedPins.filter((u) => {
      if (appliedKlicks !== null && (u.klicks ?? 0) >= appliedKlicks)
        return true
      if (
        appliedImp !== null &&
        (u.impressionen ?? 0) >= appliedImp
      )
        return true
      if (appliedSaves !== null && (u.saves ?? 0) >= appliedSaves)
        return true
      return false
    })
  }, [unmatchedPins, appliedKlicks, appliedImp, appliedSaves])

  function applyFilter() {
    setAppliedKlicks(parseThreshold(klicksInput))
    setAppliedImp(parseThreshold(impInput))
    setAppliedSaves(parseThreshold(savesInput))
  }

  function showAll() {
    setKlicksInput('')
    setImpInput('')
    setSavesInput('')
    setAppliedKlicks(null)
    setAppliedImp(null)
    setAppliedSaves(null)
  }

  if (unmatchedPins.length === 0) return null

  const hiddenCount = unmatchedPins.length - filtered.length

  return (
    <section
      id="unmatched-pins"
      className="scroll-mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Nicht zugeordnete Pins aus dem letzten CSV-Import
        </h3>
        <p className="mt-0.5 text-xs text-gray-600">
          Zeitraum {formatDateDe(zeitraumVon)} – {formatDateDe(zeitraumBis)}
          {' · '}
          {unmatchedPins.length} Pin
          {unmatchedPins.length === 1 ? '' : 's'} ausstehend
        </p>
      </div>

      <div className="mb-3 rounded-md border border-gray-200 bg-white p-3">
        <p className="text-xs font-medium text-gray-700">
          Pins anzeigen die mindestens eines der folgenden Kriterien
          erfüllen:
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <ThresholdField
            label="Klicks ≥"
            value={klicksInput}
            onChange={setKlicksInput}
            placeholder="z.B. 2"
          />
          <ThresholdField
            label="Impressionen ≥"
            value={impInput}
            onChange={setImpInput}
            placeholder="z.B. 100"
          />
          <ThresholdField
            label="Saves ≥"
            value={savesInput}
            onChange={setSavesInput}
            placeholder="z.B. 1"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilter}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Filtern
            </button>
            <button
              type="button"
              onClick={showAll}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Alle anzeigen
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Es reicht wenn ein Kriterium zutrifft — Felder können auch leer
          gelassen werden.
        </p>
        <p className="mt-1 text-xs text-gray-600">
          <strong>{filtered.length}</strong> von{' '}
          <strong>{unmatchedPins.length}</strong> nicht zugeordneten Pins{' '}
          {filtered.length === 1 ? 'wird' : 'werden'} angezeigt
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-500">
          Keine Pins erfüllen die aktuellen Schwellenwerte.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((u) => (
            <UnmatchedPinRow
              key={u.pinterestPinId}
              unmatched={u}
              pins={pins}
              zeitraumVon={zeitraumVon}
              zeitraumBis={zeitraumBis}
              onAssigned={() => onAssigned(u.pinterestPinId)}
              onSkipped={() => onSkipped(u.pinterestPinId)}
            />
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {hiddenCount} Pin{hiddenCount === 1 ? '' : 's'} unter dem
          Schwellenwert{' '}
          {hiddenCount === 1 ? 'wird' : 'werden'} nicht angezeigt — diese
          können jederzeit über „Alle anzeigen" nachgepflegt werden.
        </p>
      )}
    </section>
  )
}

function ThresholdField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex flex-col text-xs font-medium text-gray-700">
      {label}
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-28 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
    </label>
  )
}

function UnmatchedPinRow({
  unmatched,
  pins,
  zeitraumVon,
  zeitraumBis,
  onAssigned,
  onSkipped,
}: {
  unmatched: UnmatchedPin
  pins: PinOption[]
  zeitraumVon: string
  zeitraumBis: string
  onAssigned: () => void
  onSkipped: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return [] as PinOption[]
    return pins
      .filter((p) => (p.titel ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [pins, search])

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedId) ?? null,
    [pins, selectedId]
  )

  function onAssign() {
    if (!selectedId) {
      setError('Bitte einen Pin auswählen.')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.set('pin_id', selectedId)
    fd.set('pinterest_pin_id', unmatched.pinterestPinId)
    fd.set('zeitraum_von', zeitraumVon)
    fd.set('zeitraum_bis', zeitraumBis)
    if (unmatched.impressionen !== null)
      fd.set('impressionen', String(unmatched.impressionen))
    if (unmatched.klicks !== null)
      fd.set('klicks', String(unmatched.klicks))
    if (unmatched.saves !== null) fd.set('saves', String(unmatched.saves))
    startTransition(async () => {
      const r = await assignPinAndImportMetrics(fd)
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
    fd.set('type', 'pin')
    fd.set('identifier', unmatched.pinterestPinId)
    startTransition(async () => {
      // Skip ist „Best-Effort" — wenn der Server-Delete fehlschlägt, lassen
      // wir trotzdem das lokale State-Update zu, damit der Nutzer in der UI
      // weiterkommt. Beim nächsten Reload taucht der Eintrag dann ggf.
      // wieder auf, was er erneut wegklicken kann.
      await skipPendingImport(fd)
      onSkipped()
    })
  }

  const pinUrl = `https://www.pinterest.com/pin/${unmatched.pinterestPinId}/`

  return (
    <li className="rounded-md border border-gray-200 bg-white p-3">
      <div className="min-w-0 space-y-1">
        <a
          href={pinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-sm font-medium text-red-600 hover:underline"
        >
          pinterest.com/pin/{unmatched.pinterestPinId}/ ↗
        </a>
        <p className="text-xs text-gray-500">
          Klicks: {unmatched.klicks ?? '—'} · Impressionen:{' '}
          {unmatched.impressionen ?? '—'} · Saves:{' '}
          {unmatched.saves ?? '—'}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Welchem Pin gehört diese URL?
        </label>
        {selectedPin ? (
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
            <span className="truncate text-gray-900">
              {selectedPin.titel ?? '(ohne Titel)'}
            </span>
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
              placeholder="Pin-Titel suchen…"
              autoComplete="off"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {search.trim() && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
                {filtered.length === 0 ? (
                  <p className="p-2 text-xs text-gray-500">
                    Keine passenden Pins gefunden.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(p.id)
                            setSearch('')
                          }}
                          className="block w-full p-2 text-left text-sm hover:bg-gray-50"
                        >
                          {p.titel ?? (
                            <span className="text-gray-500">(ohne Titel)</span>
                          )}
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
            title="Datensatz verwerfen — Analytics-Daten dieses Pins werden NICHT importiert."
          >
            ⚠️ Überspringen
          </button>
          <button
            type="button"
            onClick={onAssign}
            disabled={!selectedId || isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Zuordnet…' : 'Zuordnen & importieren'}
          </button>
        </div>
      </div>
    </li>
  )
}
