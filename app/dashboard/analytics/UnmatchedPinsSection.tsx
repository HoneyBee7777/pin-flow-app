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

// Standardansicht: Vereinigung der stärksten Pins je Metrik — Top N nach
// Impressionen ∪ Top N nach Klicks ∪ Top N nach Saves. Bewusst nicht über
// feste Schwellen, damit auch schwächere Accounts ihre relativ besten Pins
// sehen. Benannt, damit später leicht änderbar.
const TOP_N = 15

// Progressive Anzeige: im Standard-/Manual-Modus nur so viele Pins gleichzeitig
// rendern. Wird einer zugeordnet/übersprungen (fällt aus unmatchedPins), rückt
// der nächste automatisch nach. Hält die Liste kurz, Karte darunter sichtbar.
const STACK_SIZE = 2

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
  // Tastatureingabe). Felder starten LEER: die Standardansicht ist die
  // Top-N-Vereinigung, kein vorbefüllter Schwellen-Filter.
  const [klicksInput, setKlicksInput] = useState('')
  const [impInput, setImpInput] = useState('')
  const [savesInput, setSavesInput] = useState('')
  const [appliedKlicks, setAppliedKlicks] = useState<number | null>(null)
  const [appliedImp, setAppliedImp] = useState<number | null>(null)
  const [appliedSaves, setAppliedSaves] = useState<number | null>(null)

  // Drei Ansichts-Zustände:
  //   'standard' = Top-N-Vereinigung (Default beim Öffnen)
  //   'manual'   = benutzerdefinierte Schwellen (ODER-Logik)
  //   'all'      = wirklich alle Pins, ohne Begrenzung
  const [viewMode, setViewMode] = useState<'standard' | 'manual' | 'all'>(
    'standard'
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

  // Standardansicht: Vereinigung der Top-N je Metrik. Drei sortierte Kopien,
  // je slice(0, TOP_N), dedupliziert über pinterestPinId (Map). Null-Werte
  // als 0 (wie beim Schwellen-Filter).
  const topUnion = useMemo(() => {
    const topBy = (metric: (u: UnmatchedPin) => number) =>
      [...unmatchedPins].sort((a, b) => metric(b) - metric(a)).slice(0, TOP_N)
    const union = new Map<string, UnmatchedPin>()
    for (const list of [
      topBy((u) => u.impressionen ?? 0),
      topBy((u) => u.klicks ?? 0),
      topBy((u) => u.saves ?? 0),
    ]) {
      for (const u of list) union.set(u.pinterestPinId, u)
    }
    // Stabile Endsortierung: Impressionen desc, dann Klicks desc, dann Saves desc.
    return Array.from(union.values()).sort(
      (a, b) =>
        (b.impressionen ?? 0) - (a.impressionen ?? 0) ||
        (b.klicks ?? 0) - (a.klicks ?? 0) ||
        (b.saves ?? 0) - (a.saves ?? 0)
    )
  }, [unmatchedPins])

  // Sichtbare Liste je Ansichts-Zustand.
  const visible =
    viewMode === 'manual'
      ? filtered
      : viewMode === 'all'
        ? unmatchedPins
        : topUnion

  // Tatsächlich gerenderter Stapel: nur im Standard-Modus auf STACK_SIZE
  // begrenzt (progressives Nachrücken). Im manual-/all-Modus die volle Liste —
  // im manual hat der Nutzer bewusst gefiltert, da ist kein 2er-Stapel sinnvoll.
  // restCount = wie viele aus `visible` aktuell noch warten (nur im Standard > 0).
  const displayList =
    viewMode === 'standard' ? visible.slice(0, STACK_SIZE) : visible
  const restCount = visible.length - displayList.length

  function applyFilter() {
    const k = parseThreshold(klicksInput)
    const i = parseThreshold(impInput)
    const s = parseThreshold(savesInput)
    setAppliedKlicks(k)
    setAppliedImp(i)
    setAppliedSaves(s)
    setViewMode('manual')
    try {
      const stored: StoredFilter = { klicks: k, impressionen: i, saves: s }
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // localStorage nicht verfügbar — Filter wirkt nur in dieser Session.
    }
  }

  // „Alle anzeigen": zeigt wirklich ALLE Pins — Filter komplett geleert UND
  // Top-N-Begrenzung aufgehoben (Zustand 'all').
  function showAll() {
    setViewMode('all')
    setKlicksInput('')
    setImpInput('')
    setSavesInput('')
    setAppliedKlicks(null)
    setAppliedImp(null)
    setAppliedSaves(null)
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY)
    } catch {
      // localStorage nicht verfügbar — kein Eintrag zum Löschen.
    }
  }

  // Zurück zur Standardansicht (Top-N-Vereinigung).
  function showStandard() {
    setViewMode('standard')
  }

  if (unmatchedPins.length === 0) return null

  const hiddenCount = unmatchedPins.length - visible.length

  return (
    // Hinweis-Tipp-Farbe (zentrale Token --hinweis-tipp-*) — zieht mit, wenn die
    // Hinweis-Farbe geändert wird. Volle Fläche wie die Tipp-Box, kein Stripe
    // (ganze Sektion mit Liste, kein kompakter Hinweistext).
    <section
      id="unmatched-pins"
      className="scroll-mt-6 rounded-lg border border-hinweis-tipp-rand bg-hinweis-tipp-flaeche p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Nicht zugeordnete Pins aus dem letzten CSV-Import
        </h3>
        <p className="mt-0.5 text-xs text-gray-600">
          Zeitraum {formatDateDe(zeitraumVon)} bis {formatDateDe(zeitraumBis)}.{' '}
          {viewMode === 'standard' ? (
            visible.length === 1 ? (
              <>
                Hier siehst du deinen stärksten Pin aus diesem Import, der sich
                zuerst lohnt. Schwächere kannst du über {'„Alle anzeigen"'}{' '}
                einblenden.
              </>
            ) : (
              <>
                Hier siehst du deine stärksten{' '}
                <span className="font-bold text-base text-red-600">
                  {visible.length}
                </span>{' '}
                Pins aus diesem Import, die sich zuerst lohnen. Schwächere
                kannst du über {'„Alle anzeigen"'} einblenden.
              </>
            )
          ) : viewMode === 'all' ? (
            <>
              Alle {unmatchedPins.length} nicht{' '}
              {unmatchedPins.length === 1
                ? 'zugeordneter Pin'
                : 'zugeordneten Pins'}{' '}
              aus diesem Import.
            </>
          ) : (
            <>
              {visible.length} von {unmatchedPins.length}{' '}
              {unmatchedPins.length === 1 ? 'Pin' : 'Pins'} nach deinem Filter.
            </>
          )}
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
              className="rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
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
            {viewMode !== 'standard' && (
              <button
                type="button"
                onClick={showStandard}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Zurück zu Top-Pins
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Es reicht wenn ein Kriterium zutrifft, Felder können auch leer
          gelassen werden.
        </p>
        {viewMode !== 'standard' && (
          <p className="mt-1 text-xs text-gray-600">
            <strong>{displayList.length}</strong> von{' '}
            <strong>{unmatchedPins.length}</strong> nicht zugeordneten Pins{' '}
            {displayList.length === 1 ? 'wird' : 'werden'} angezeigt
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-500">
          Keine Pins erfüllen die aktuellen Schwellenwerte.
        </p>
      ) : (
        <ul className="space-y-3">
          {displayList.map((u) => (
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

      {viewMode === 'standard' && restCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Noch {restCount} {restCount === 1 ? 'weiterer Pin' : 'weitere Pins'}.
          Ordne die oben zuerst zu,{' '}
          {restCount === 1
            ? 'der nächste rückt'
            : 'die nächsten rücken'}{' '}
          automatisch nach. Über {'„Alle anzeigen"'} siehst du die ganze Liste.
        </p>
      )}

      {viewMode === 'manual' && hiddenCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {hiddenCount} {hiddenCount === 1 ? 'Pin' : 'Pins'} unter deinem
          Filter {hiddenCount === 1 ? 'wird' : 'werden'} nicht angezeigt.
          Über {'„Alle anzeigen"'} siehst du alle.
        </p>
      )}
    </section>
  )
}

// Erklär-Toggle zur Zuordnung — natives <details>, standardmäßig zugeklappt
// (kein open-Attribut). Wiederholt auf-/zuklappbar; kein localStorage, kein
// Dismiss. Muster wie CombinedHowToToggle (EingabeTab): ▸/▾ via group-open.
function UnmatchedPinsExplainer() {
  return (
    <details className="group mb-3 rounded-md border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span
          className="text-base leading-none text-gray-400 transition-transform"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1">Wie funktioniert die Zuordnung?</span>
      </summary>
      <div className="space-y-3 border-t border-gray-100 px-4 py-4 text-sm leading-relaxed text-gray-700">
        <p>
          Pinterest liefert dir die Zahlen deiner Top-Pins, aber nur über die
          Pin-ID, nicht über den Titel. Damit Pin-Flow die Zahlen einem deiner
          Pins zuordnen kann, verknüpfst du die ID einmalig über{' '}
          {'„Zuordnen & importieren"'}. Danach wird der Pin bei jedem weiteren
          Import automatisch erkannt.
        </p>
        <p>
          Konzentriere dich dabei auf deine starken Pins. Ein kleiner Teil
          deiner Pins bringt den Großteil der Ergebnisse, und genau die lohnen
          die Zuordnung. Ein Pin mit wenigen Impressionen und kaum Klicks sagt
          wenig aus, kostet aber Zeit beim Verknüpfen.
        </p>
        <p>
          Bei schwachen Pins hast du zwei Möglichkeiten: Du kannst sie einfach
          liegen lassen, dann bleiben sie in der Liste stehen. Oder du klickst{' '}
          {'„Überspringen"'}, dann verschwinden sie sofort und du arbeitest die
          Liste leerer. Beides ist in Ordnung.
        </p>
        <p>
          Wird ein liegengelassener Pin in einem der nächsten Monate stärker
          und sammelt mehr Impressionen, Klicks und Saves, ordnest du ihn dann
          zu. Ab da fließen seine Zahlen in deine Auswertungen ein. Pins, die
          du nicht zuordnest und die in einem späteren Import nicht mehr unter
          deinen Top-Pins sind, verschwinden hier von selbst, du musst also
          nichts aufräumen.
        </p>
        <p>
          Standardmäßig zeigt Pin-Flow dir deine stärksten Pins aus diesem
          Import, die, die sich zuerst lohnen. Über {'„Alle anzeigen"'} siehst
          du den Rest, und mit den Filterfeldern suchst du gezielt nach eigenen
          Schwellen. Wer mag, ordnet alle Pins zu, dann sind die Auswertungen
          komplett, ein Muss ist es nicht.
        </p>
      </div>
    </details>
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
          className="block break-all text-sm font-medium text-link underline underline-offset-2"
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
