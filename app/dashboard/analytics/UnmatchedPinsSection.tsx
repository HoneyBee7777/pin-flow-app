'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  assignPinAndImportMetrics,
  skipPendingImport,
  type UnmatchedPin,
} from './actions'
import { formatDateDe, type PinOption } from './utils'
import { HinweisBox } from '@/components/HinweisBox'

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

const FILTER_STORAGE_KEY = 'analytics_unmatched_filter'

type StoredFilter = {
  klicks: number | null
  impressionen: number | null
  saves: number | null
}

function parseThreshold(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function thresholdToInput(n: number | null): string {
  return n === null ? '' : String(n)
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

  // Persistenz: gespeicherte Filter-Werte nach dem Mount aus localStorage
  // laden (nach Mount, um SSR-Hydration-Mismatch zu vermeiden).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<StoredFilter>
      const k = typeof parsed.klicks === 'number' ? parsed.klicks : null
      const i =
        typeof parsed.impressionen === 'number' ? parsed.impressionen : null
      const s = typeof parsed.saves === 'number' ? parsed.saves : null
      setKlicksInput(thresholdToInput(k))
      setImpInput(thresholdToInput(i))
      setSavesInput(thresholdToInput(s))
      setAppliedKlicks(k)
      setAppliedImp(i)
      setAppliedSaves(s)
    } catch {
      // Defekte localStorage-Werte ignorieren — Defaults greifen.
    }
  }, [])

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
    const k = parseThreshold(klicksInput)
    const i = parseThreshold(impInput)
    const s = parseThreshold(savesInput)
    setAppliedKlicks(k)
    setAppliedImp(i)
    setAppliedSaves(s)
    try {
      const stored: StoredFilter = { klicks: k, impressionen: i, saves: s }
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // localStorage nicht verfügbar — Filter wirkt nur in dieser Session.
    }
  }

  function showAll() {
    setKlicksInput(DEFAULT_KLICKS)
    setImpInput(DEFAULT_IMPRESSIONEN)
    setSavesInput(DEFAULT_SAVES)
    setAppliedKlicks(parseThreshold(DEFAULT_KLICKS))
    setAppliedImp(parseThreshold(DEFAULT_IMPRESSIONEN))
    setAppliedSaves(parseThreshold(DEFAULT_SAVES))
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY)
    } catch {
      // localStorage nicht verfügbar — kein Eintrag zum Löschen.
    }
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

      <UnmatchedPinsExplainer />

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
          Es reicht wenn ein Kriterium zutrifft, Felder können auch leer
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
          {hiddenCount === 1 ? 'wird' : 'werden'} nicht angezeigt, diese
          können jederzeit über „Alle anzeigen" nachgepflegt werden.
        </p>
      )}
    </section>
  )
}

// Ausblendbarer Erklär-Baustein nach dem ClassificationExplainerBanner-Muster:
// startet versteckt (SSR-safe), blendet nach Mount ein, wenn das localStorage-
// Flag fehlt. „Verstanden"/X setzt das Flag und blendet dauerhaft aus. Sitzt
// innerhalb der Section, wird also mit ihr ausgeblendet, wenn keine unmatched
// Pins existieren (Section-Guard oben unberührt).
function UnmatchedPinsExplainer() {
  const STORAGE_KEY = 'unmatched_pins_explainer_seen'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {
      // localStorage nicht verfügbar — Hinweis einfach zeigen.
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div className="mb-3">
      <HinweisBox variant="merke">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <p className="font-semibold">
              Nicht jeder Pin muss zugeordnet werden
            </p>
            <p>
              Pinterest liefert dir die Zahlen deiner Top-Pins, aber nur über
              die Pin-ID, nicht über den Titel. Damit Pin-Flow die Zahlen einem
              deiner Pins zuordnen kann, verknüpfst du die ID einmalig über{' '}
              {'„Zuordnen & importieren"'}. Danach wird der Pin bei jedem
              weiteren Import automatisch erkannt.
            </p>
            <p>
              Konzentrier dich dabei auf deine starken Pins. Ein kleiner Teil
              deiner Pins bringt den Großteil der Ergebnisse, und genau die
              lohnen die Zuordnung. Ein Pin mit wenigen Impressionen und kaum
              Klicks sagt wenig aus, kostet aber Zeit beim Verknüpfen.
            </p>
            <p>
              Bei schwachen Pins hast du zwei Möglichkeiten: Du kannst sie
              einfach liegen lassen, dann bleiben sie in der Liste stehen. Oder
              du klickst {'„Überspringen"'}, dann verschwinden sie sofort und
              du arbeitest die Liste leerer. Beides ist in Ordnung.
            </p>
            <p>
              Wird ein liegengelassener Pin in einem der nächsten Monate stärker
              und sammelt mehr Impressionen, Klicks und Saves, ordnest du ihn
              dann zu. Ab da fließen seine Zahlen in deine Auswertungen ein.
              Pins, die du nicht zuordnest und die in einem späteren Import nicht
              mehr unter deinen Top-Pins sind, verschwinden hier von selbst, du
              musst also nichts aufräumen.
            </p>
            <p>
              Mit den Feldern oben blendest du dir gezielt die Pins ein, die
              sich lohnen. Jeder Account entwickelt sich anders, deshalb gibst du
              die Schwellen selbst vor. Wer mag, ordnet alle Pins zu, dann sind
              die Auswertungen komplett, ein Muss ist es nicht.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1 text-teal-700 hover:bg-teal-100"
            aria-label="Hinweis schließen"
            title="Schließen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </HinweisBox>
    </div>
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
    // Volle Pinterest-URL mitschicken, damit der Server pinterest_pin_url auf
    // der pins-Tabelle setzt — Voraussetzung für die Anzeige im Bearbeiten-Modal.
    fd.set(
      'pinterest_pin_url',
      `https://www.pinterest.com/pin/${unmatched.pinterestPinId}/`
    )
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
            title="Datensatz verwerfen, Analytics-Daten dieses Pins werden NICHT importiert."
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
