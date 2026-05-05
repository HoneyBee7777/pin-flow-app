'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import {
  importPinterestCsv,
  savePinAnalytics,
  saveProfilAnalytics,
  saveBoardAnalytics,
  type ImportPinterestCsvResult,
} from './actions'
import {
  detectPinsCsvMetric,
  parseFilenamePeriod,
  type PinMetric,
} from './csvImport'
import {
  addDays,
  formatDateDe,
  PIN_STATUS_BADGE,
  PIN_STATUS_LABEL,
  todayIso,
  type BoardOption,
  type PinOption,
  type ProfilAnalyticsWithGrowth,
} from './utils'

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

// ===========================================================
// Tsd.-Helpers (Profil-Form: Nutzer schreibt "5,5", gespeichert als 5500)
// ===========================================================
function parseTsdInput(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n * 1000))
}

const TSD_FIELDS = [
  'impressionen',
  'gesamte_zielgruppe',
  'interagierende_zielgruppe',
] as const

// Periodenformat für die CSV-Slot-Erkennung: gleiches Jahr → "01.02. – 28.02.2026".
function formatPeriodCompact(von: string, bis: string): string {
  const [vy, vm, vd] = von.split('-')
  const [by, bm, bd] = bis.split('-')
  const sameYear = vy === by
  const left = sameYear ? `${vd}.${vm}.` : `${vd}.${vm}.${vy}`
  const right = `${bd}.${bm}.${by}`
  return `${left} – ${right}`
}

// ===========================================================
// EingabeTab — alles, was Eingabe ist
// ===========================================================
export default function EingabeTab({
  profilAnalytics,
  pins,
  boards,
  latestZeitraumBis,
  pinterestAnalyticsUrl,
  expectedZeitraumVon,
  expectedZeitraumBis,
  onImported,
  onJumpToUnmatchedPins,
  onJumpToUnmatchedBoards,
  pendingNotice,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pins: PinOption[]
  boards: BoardOption[]
  latestZeitraumBis: string | null
  pinterestAnalyticsUrl: string | null
  expectedZeitraumVon: string | null
  expectedZeitraumBis: string | null
  onImported: (result: ImportPinterestCsvResult) => void
  // Wechsel zum Pins-/Boards-Tab + Scroll zur „Nicht zugeordnet"-Liste —
  // wird aus der Import-Erfolgsmeldung verlinkt.
  onJumpToUnmatchedPins: () => void
  onJumpToUnmatchedBoards: () => void
  // Türkiser Hinweis, sobald offene Pending-Zuordnungen aus dem letzten
  // CSV-Import existieren (initial aus DB, danach aus laufendem State).
  pendingNotice: {
    count: number
    zeitraum_von: string
    zeitraum_bis: string
  } | null
}) {
  return (
    <div className="space-y-8">
      <div>
        <a
          href={pinterestAnalyticsUrl ?? 'https://analytics.pinterest.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Pinterest Analytics öffnen ↗
        </a>
        <div className="mt-3">
          <ZeitraumHeader
            von={expectedZeitraumVon}
            bis={expectedZeitraumBis}
          />
        </div>
        <p className="mt-2 text-[13px] text-gray-500">
          💡 Du trägst deine Daten immer für einen einzelnen Zeitraum ein.
          Auf dem Dashboard, im Tab Profil-Entwicklung sowie in Top Pins und
          Boards werden alle Perioden kumuliert ausgewertet — so siehst du
          deine All-Time-Werte und die Entwicklung über die Zeit.
        </p>
      </div>

      {pendingNotice && (
        <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
          <span className="mr-1" aria-hidden>
            ⚠️
          </span>
          Du hast noch <strong>{pendingNotice.count}</strong> nicht
          zugeordnete{' '}
          {pendingNotice.count === 1 ? 'Eintrag' : 'Einträge'}
          {pendingNotice.zeitraum_von && pendingNotice.zeitraum_bis && (
            <>
              {' '}aus dem letzten Import (
              {formatDateDe(pendingNotice.zeitraum_von)} –{' '}
              {formatDateDe(pendingNotice.zeitraum_bis)})
            </>
          )}
          . Bitte Zuordnung abschließen oder überspringen — die Zuordnung
          erfolgt in den Tabs →{' '}
          <button
            type="button"
            onClick={onJumpToUnmatchedPins}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            Top Pins
          </button>{' '}
          und →{' '}
          <button
            type="button"
            onClick={onJumpToUnmatchedBoards}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            Boards
          </button>
          .
        </div>
      )}

      <CombinedHowToToggle
        von={expectedZeitraumVon}
        bis={expectedZeitraumBis}
      />

      <Schritt1ProfilForm
        profilAnalytics={profilAnalytics}
        latestZeitraumBis={latestZeitraumBis}
      />

      <Schritt2CsvUpload
        expectedZeitraumVon={expectedZeitraumVon}
        expectedZeitraumBis={expectedZeitraumBis}
        onImported={onImported}
        onJumpToUnmatchedPins={onJumpToUnmatchedPins}
        onJumpToUnmatchedBoards={onJumpToUnmatchedBoards}
      />

      <ManualEntryToggle
        pins={pins}
        boards={boards}
        latestZeitraumBis={latestZeitraumBis}
      />
    </div>
  )
}

// ===========================================================
// Türkise Zeitraum-Box
// ===========================================================
function ZeitraumHeader({
  von,
  bis,
}: {
  von: string | null
  bis: string | null
}) {
  const hasPrevious = !!von
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-3 text-sm leading-relaxed text-teal-900">
      <p className="min-w-0 flex-1">
        <span className="mr-1" aria-hidden>
          📅
        </span>
        {hasPrevious ? (
          <>
            <strong>Dein nächster Zeitraum:</strong> {formatDateDe(von)} bis{' '}
            {bis ? formatDateDe(bis) : '—'}
            <br />
            Stelle in Pinterest Analytics unter „Benutzerdefiniert" genau
            diesen Zeitraum ein.
          </>
        ) : (
          <>
            <strong>Erstes Update:</strong> Wähle einen beliebigen
            Startzeitpunkt für dein erstes Update.
          </>
        )}
      </p>
    </div>
  )
}

// ===========================================================
// Kombinierter How-To-Toggle (Profil + Pins + Boards)
// ===========================================================
function CombinedHowToToggle({
  von,
  bis,
}: {
  von: string | null
  bis: string | null
}) {
  const vonStr = von ? formatDateDe(von) : '—'
  const bisStr = bis ? formatDateDe(bis) : '—'
  return (
    <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
      <summary className="cursor-pointer font-medium text-gray-900">
        So findest du alle Zahlen
      </summary>
      <div className="mt-3 space-y-4 text-gray-600">
        <div>
          <p className="font-semibold text-gray-900">Profil-Performance</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Pinterest öffnen → Analytics → Übersicht</li>
            <li>
              Zeitraum „Benutzerdefiniert" → Zeitraum aus dem türkisen Feld
              oben eingeben (Von: <strong>{vonStr}</strong> bis Bis:{' '}
              <strong>{bisStr}</strong>)
            </li>
            <li>
              Direkt unter der Datumsauswahl erscheint die Gesamt-Performance
              → Werte eintragen
            </li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Top Pins</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Zeitraum ist noch voreingestellt von eben</li>
            <li>Nach unten scrollen zu „Top Pins"</li>
            <li>
              Nach <strong>Ausgehenden Klicks</strong> sortieren → rechts oben
              „Exportieren" klicken → CSV speichern
            </li>
            <li>
              Zurück → nach <strong>Impressionen</strong> sortieren → CSV
              exportieren
            </li>
            <li>
              Zurück → nach <strong>Saves</strong> sortieren → CSV exportieren
            </li>
            <li>Alle 3 CSVs unter Schritt 2 hochladen</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Top Boards</p>
          <p className="mt-1">
            Werden automatisch aus denselben CSVs importiert — kein separater
            Export nötig.
          </p>
        </div>
        <div className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          ⚠️ Pinterest speichert Analytics nur max. 6 Monate. Dieses System
          speichert deine historischen Daten dauerhaft — trage monatlich ein
          damit keine Daten verloren gehen.
        </div>
      </div>
    </details>
  )
}

// ===========================================================
// Schritt 1 — Profil-Performance Form
// ===========================================================
function Schritt1ProfilForm({
  profilAnalytics,
  latestZeitraumBis,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  latestZeitraumBis: string | null
}) {
  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [zielgruppe, setZielgruppe] = useState('')
  const [interagierend, setInteragierend] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  useEffect(() => {
    const yesterday = addDays(todayIso(), -1)
    setZeitraumBis((prev) => prev || yesterday)
    setZeitraumVon(
      (prev) =>
        prev || (latestZeitraumBis ? addDays(latestZeitraumBis, 1) : '')
    )
  }, [latestZeitraumBis])

  const existingForBis = useMemo(
    () => profilAnalytics.find((r) => r.datum === zeitraumBis) ?? null,
    [profilAnalytics, zeitraumBis]
  )

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    for (const key of TSD_FIELDS) {
      const raw = String(formData.get(key) ?? '')
      formData.set(key, String(parseTsdInput(raw)))
    }
    const submittedBis = String(formData.get('zeitraum_bis') ?? '')
    startTransition(async () => {
      const result = await saveProfilAnalytics(formData)
      if (result.error) {
        setFeedback({ error: result.error })
        return
      }
      setFeedback({ saved: true })
      setImpressionen('')
      setKlicks('')
      setSaves('')
      setZielgruppe('')
      setInteragierend('')
      setZeitraumVon(submittedBis ? addDays(submittedBis, 1) : todayIso())
      setZeitraumBis(addDays(todayIso(), -1))
    })
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          1) Profil-Performance eintragen
        </h2>
        <p className="mt-0.5 text-sm text-gray-600">
          Muss monatlich manuell eingetragen werden — Pinterest bietet hier
          keinen CSV-Export.
        </p>
      </div>

      <form
        id="analytics-profil-form"
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm scroll-mt-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Von" htmlFor="profil_zeitraum_von">
            <input
              id="profil_zeitraum_von"
              name="zeitraum_von"
              type="date"
              required
              value={zeitraumVon}
              onChange={(e) => setZeitraumVon(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Bis" htmlFor="profil_zeitraum_bis">
            <input
              id="profil_zeitraum_bis"
              name="zeitraum_bis"
              type="date"
              required
              value={zeitraumBis}
              onChange={(e) => setZeitraumBis(e.target.value)}
              className={inputCls}
            />
            {existingForBis && (
              <p className="mt-1 text-xs text-amber-700">
                ⚠️ Eintrag mit diesem End-Datum existiert bereits — wird
                überschrieben.
              </p>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Impressionen (Tsd.)" htmlFor="profil_impressionen">
            <input
              id="profil_impressionen"
              name="impressionen"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={impressionen}
              onChange={(e) => setImpressionen(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              z.B. 5,5 für 5.500
            </p>
          </Field>

          <Field
            label="Ausgehende Klicks"
            htmlFor="profil_ausgehende_klicks"
          >
            <input
              id="profil_ausgehende_klicks"
              name="ausgehende_klicks"
              type="number"
              min={0}
              step={1}
              required
              value={klicks}
              onChange={(e) => setKlicks(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Saves" htmlFor="profil_saves">
            <input
              id="profil_saves"
              name="saves"
              type="number"
              min={0}
              step={1}
              required
              value={saves}
              onChange={(e) => setSaves(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Gesamte Zielgruppe (Tsd.)"
            htmlFor="profil_gesamte_zielgruppe"
          >
            <input
              id="profil_gesamte_zielgruppe"
              name="gesamte_zielgruppe"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={zielgruppe}
              onChange={(e) => setZielgruppe(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              z.B. 5,5 für 5.500
            </p>
          </Field>

          <Field
            label="Interagierende Zielgruppe (Tsd.)"
            htmlFor="profil_interagierende_zielgruppe"
          >
            <input
              id="profil_interagierende_zielgruppe"
              name="interagierende_zielgruppe"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={interagierend}
              onChange={(e) => setInteragierend(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              z.B. 5,5 für 5.500
            </p>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Profil-Daten speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

// ===========================================================
// Schritt 2 — CSV-Upload (3 Slots, inline statt Modal)
// ===========================================================
type SlotKey = 'csv_klicks' | 'csv_impressionen' | 'csv_saves'
const SLOT_ORDER: SlotKey[] = ['csv_klicks', 'csv_impressionen', 'csv_saves']
const SLOT_LABELS: Record<SlotKey, string> = {
  csv_klicks: 'CSV: Sortiert nach Ausgehenden Klicks',
  csv_impressionen: 'CSV: Sortiert nach Impressionen',
  csv_saves: 'CSV: Sortiert nach Saves',
}

// Welche Metrik wird pro Slot erwartet — wird gegen den im CSV-Header
// erkannten Wert abgeglichen.
const SLOT_EXPECTED_METRIC: Record<SlotKey, PinMetric> = {
  csv_klicks: 'klicks',
  csv_impressionen: 'impressionen',
  csv_saves: 'saves',
}

// Anzeige-Label für die erkannte/erwartete Metrik in der Slot-Validierung.
const METRIC_LABEL: Record<PinMetric, string> = {
  klicks: 'Outbound clicks',
  impressionen: 'Impressions',
  saves: 'Saves',
}

function Schritt2CsvUpload({
  expectedZeitraumVon,
  expectedZeitraumBis,
  onImported,
  onJumpToUnmatchedPins,
  onJumpToUnmatchedBoards,
}: {
  expectedZeitraumVon: string | null
  expectedZeitraumBis: string | null
  onImported: (result: ImportPinterestCsvResult) => void
  onJumpToUnmatchedPins: () => void
  onJumpToUnmatchedBoards: () => void
}) {
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    csv_klicks: null,
    csv_impressionen: null,
    csv_saves: null,
  })
  // Pro Slot: aus dem CSV-Header erkannte Metrik.
  //   undefined = noch keine Datei (oder gerade am Lesen)
  //   null      = Datei gelesen, aber kein „Top Pins"-Block gefunden
  //   PinMetric = erkannt
  const [detected, setDetected] = useState<
    Record<SlotKey, PinMetric | null | undefined>
  >({
    csv_klicks: undefined,
    csv_impressionen: undefined,
    csv_saves: undefined,
  })
  // Version pro Slot — schützt gegen Race-Conditions, wenn der Nutzer
  // schnell hintereinander unterschiedliche Dateien in denselben Slot legt:
  // veraltete .text()-Promises überschreiben dann nicht das frische Ergebnis.
  const detectVersion = useRef<Record<SlotKey, number>>({
    csv_klicks: 0,
    csv_impressionen: 0,
    csv_saves: 0,
  })
  const [result, setResult] = useState<ImportPinterestCsvResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Snapshot der erwarteten Periode — beim ersten Datei-Drop einfrieren,
  // damit nach dem ersten Teil-Import nicht plötzlich der nächste Zeitraum
  // erwartet wird, während der Nutzer noch weitere CSVs für denselben
  // Zeitraum ergänzt.
  const [snapshotVon, setSnapshotVon] = useState<string | null>(null)
  const [snapshotBis, setSnapshotBis] = useState<string | null>(null)
  const anyFileLoaded = SLOT_ORDER.some((s) => files[s] !== null)
  useEffect(() => {
    if (anyFileLoaded && snapshotVon === null && snapshotBis === null) {
      setSnapshotVon(expectedZeitraumVon)
      setSnapshotBis(expectedZeitraumBis)
    }
    if (!anyFileLoaded && (snapshotVon !== null || snapshotBis !== null)) {
      setSnapshotVon(null)
      setSnapshotBis(null)
    }
  }, [anyFileLoaded, expectedZeitraumVon, expectedZeitraumBis, snapshotVon, snapshotBis])

  const slotPeriods = useMemo(() => {
    const map: Record<SlotKey, ReturnType<typeof parseFilenamePeriod>> = {
      csv_klicks: null,
      csv_impressionen: null,
      csv_saves: null,
    }
    for (const slot of SLOT_ORDER) {
      const f = files[slot]
      map[slot] = f ? parseFilenamePeriod(f.name) : null
    }
    return map
  }, [files])

  const uploadedFiles = SLOT_ORDER.map((s) => files[s]).filter(
    (f): f is File => f !== null
  )

  const crossFileMismatch = useMemo(() => {
    const periods = SLOT_ORDER.map((s) => slotPeriods[s]).filter(
      (p): p is { von: string; bis: string } => p !== null
    )
    if (periods.length < 2) return false
    const first = periods[0]
    return periods.some((p) => p.von !== first.von || p.bis !== first.bis)
  }, [slotPeriods])

  const snapshotMismatch = useMemo(() => {
    const refVon = snapshotVon ?? expectedZeitraumVon
    const refBis = snapshotBis ?? expectedZeitraumBis
    if (!refVon || !refBis) return null
    for (const slot of SLOT_ORDER) {
      const p = slotPeriods[slot]
      if (!p) continue
      if (p.von !== refVon || p.bis !== refBis) {
        return {
          csvVon: p.von,
          csvBis: p.bis,
          expectedVon: refVon,
          expectedBis: refBis,
        }
      }
    }
    return null
  }, [
    slotPeriods,
    snapshotVon,
    snapshotBis,
    expectedZeitraumVon,
    expectedZeitraumBis,
  ])

  const slotWithBadFilename = useMemo(() => {
    for (const slot of SLOT_ORDER) {
      const f = files[slot]
      if (f && !slotPeriods[slot]) return f.name
    }
    return null
  }, [files, slotPeriods])

  // Metric-Mismatch pro Slot: erkannte Metrik weicht vom erwarteten Slot ab.
  // null/undefined zählt nicht als Mismatch — dort ist die Datei entweder
  // noch nicht gelesen oder enthält keinen erkennbaren Top-Pins-Block.
  const hasMetricMismatch = SLOT_ORDER.some((slot) => {
    if (!files[slot]) return false
    const det = detected[slot]
    if (det === null || det === undefined) return false
    return det !== SLOT_EXPECTED_METRIC[slot]
  })

  const canSubmit =
    uploadedFiles.length > 0 &&
    !crossFileMismatch &&
    !slotWithBadFilename &&
    !hasMetricMismatch

  function setSlot(slot: SlotKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file }))
    setError(null)
    setResult(null)

    // Detection asynchron — Version erhöhen und nur das frischeste Ergebnis
    // für diesen Slot durchlassen.
    detectVersion.current[slot] += 1
    const myVersion = detectVersion.current[slot]
    setDetected((prev) => ({ ...prev, [slot]: undefined }))
    if (!file) return
    file
      .text()
      .then((text) => {
        if (detectVersion.current[slot] !== myVersion) return
        setDetected((prev) => ({
          ...prev,
          [slot]: detectPinsCsvMetric(text),
        }))
      })
      .catch(() => {
        if (detectVersion.current[slot] !== myVersion) return
        setDetected((prev) => ({ ...prev, [slot]: null }))
      })
  }

  function clearAllFiles() {
    setFiles({
      csv_klicks: null,
      csv_impressionen: null,
      csv_saves: null,
    })
    setDetected({
      csv_klicks: undefined,
      csv_impressionen: undefined,
      csv_saves: undefined,
    })
    detectVersion.current.csv_klicks += 1
    detectVersion.current.csv_impressionen += 1
    detectVersion.current.csv_saves += 1
    setError(null)
    setResult(null)
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    const fd = new FormData()
    for (const slot of SLOT_ORDER) {
      const f = files[slot]
      if (f) fd.append(slot, f)
    }
    startTransition(async () => {
      const r = await importPinterestCsv(fd)
      if (r.error) {
        setError(r.error)
        return
      }
      setResult(r)
      onImported(r)
    })
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          2) Top Pins & Boards importieren
        </h2>
        <p className="mt-0.5 text-sm text-gray-600">
          Empfohlen: CSV-Import. Optional: manuelle Eingabe weiter unten.
        </p>
      </div>

      <div className="rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-3 text-[13px] text-teal-900">
        Lade die CSVs direkt von Pinterest herunter — nicht vorher in Excel
        öffnen.
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-3">
          {SLOT_ORDER.map((slot) => (
            <FileSlotInput
              key={slot}
              label={SLOT_LABELS[slot]}
              file={files[slot]}
              detectedPeriod={slotPeriods[slot]}
              detectedMetric={detected[slot]}
              expectedMetric={SLOT_EXPECTED_METRIC[slot]}
              onChange={(f) => setSlot(slot, f)}
            />
          ))}
        </div>

        {slotWithBadFilename && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ⚠️ Dateiname „{slotWithBadFilename}" entspricht nicht dem
            Pinterest-Schema („Pinterest Analytics overview
            YYYYMMDD-YYYYMMDD.csv").
          </div>
        )}

        {!slotWithBadFilename && crossFileMismatch && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ⚠️ Die hochgeladenen Dateien haben unterschiedliche Zeiträume.
            Bitte nur CSVs desselben Zeitraums hochladen.
          </div>
        )}

        {!slotWithBadFilename &&
          !crossFileMismatch &&
          snapshotMismatch && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                ⚠️ Der Zeitraum dieser CSV (
                {formatDateDe(snapshotMismatch.csvVon)} –{' '}
                {formatDateDe(snapshotMismatch.csvBis)}) weicht vom
                erwarteten nächsten Zeitraum (
                {formatDateDe(snapshotMismatch.expectedVon)} –{' '}
                {formatDateDe(snapshotMismatch.expectedBis)}) ab.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!canSubmit || isPending}
                  className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {isPending
                    ? 'Importiert…'
                    : 'Abweichenden Zeitraum trotzdem importieren'}
                </button>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Datei entfernen
                </button>
              </div>
            </div>
          )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <ImportSummary
            result={result}
            onReset={clearAllFiles}
            onJumpToUnmatchedPins={onJumpToUnmatchedPins}
            onJumpToUnmatchedBoards={onJumpToUnmatchedBoards}
          />
        )}

        {!snapshotMismatch && !result && (
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Importiert…' : '📥 Import starten'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          ⚠️ Nach dem Import: Neue Pins und Boards müssen einmalig per URL
          zugeordnet werden — die Zuordnungs-Dialoge erscheinen dann auf den
          Tabs „Top Pins" und „Boards".
        </p>
      </form>
    </section>
  )
}

function FileSlotInput({
  label,
  file,
  detectedPeriod,
  detectedMetric,
  expectedMetric,
  onChange,
}: {
  label: string
  file: File | null
  detectedPeriod: ReturnType<typeof parseFilenamePeriod>
  // undefined = noch nicht gelesen, null = kein Top-Pins-Block, sonst Metrik.
  detectedMetric: PinMetric | null | undefined
  expectedMetric: PinMetric
  onChange: (file: File | null) => void
}) {
  const metricMatches =
    detectedMetric !== undefined &&
    detectedMetric !== null &&
    detectedMetric === expectedMetric
  const metricMismatch =
    detectedMetric !== undefined &&
    detectedMetric !== null &&
    detectedMetric !== expectedMetric
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block flex-1 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
        />
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            ✕ entfernen
          </button>
        )}
      </div>
      {file && detectedPeriod && (
        <p className="mt-1 break-all text-xs text-teal-700">
          ✓ {file.name} — Zeitraum:{' '}
          {formatPeriodCompact(detectedPeriod.von, detectedPeriod.bis)}
        </p>
      )}
      {file && !detectedPeriod && (
        <p className="mt-1 break-all text-xs text-red-700" title={file.name}>
          ⚠️ {file.name}
        </p>
      )}
      {file && metricMatches && (
        <p className="mt-1 text-xs font-medium text-green-700">
          ✓ Erkannt: {METRIC_LABEL[detectedMetric as PinMetric]}
        </p>
      )}
      {file && metricMismatch && (
        <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ Diese Datei enthält{' '}
          <strong>{METRIC_LABEL[detectedMetric as PinMetric]}</strong> —
          dieses Feld erwartet <strong>{METRIC_LABEL[expectedMetric]}</strong>
          . Bitte die richtige CSV hochladen.
        </div>
      )}
      {file && detectedMetric === null && (
        <p className="mt-1 text-xs text-amber-800">
          ⚠️ In dieser CSV wurde kein „Top Pins"-Block gefunden — bitte
          prüfen, ob das wirklich der Pinterest-Analytics-Overview-Export ist.
        </p>
      )}
    </div>
  )
}

function ImportSummary({
  result,
  onReset,
  onJumpToUnmatchedPins,
  onJumpToUnmatchedBoards,
}: {
  result: ImportPinterestCsvResult
  onReset: () => void
  onJumpToUnmatchedPins: () => void
  onJumpToUnmatchedBoards: () => void
}) {
  const pinsImported = result.pinsImported ?? 0
  const boardsImported = result.boardsImported ?? 0
  const pinsUnmatched = result.pinsUnmatched?.length ?? 0
  const boardsUnmatched = result.boardsUnmatched?.length ?? 0
  // Interne Metric-Keys → deutsche Labels für die Anzeige.
  const METRIC_DISPLAY: Record<PinMetric, string> = {
    klicks: 'Klicks',
    impressionen: 'Impressionen',
    saves: 'Saves',
  }
  const metricsLabel =
    result.metricsImported && result.metricsImported.length > 0
      ? result.metricsImported.map((m) => METRIC_DISPLAY[m]).join(', ')
      : null
  return (
    <div className="space-y-3">
      <div className="space-y-1 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <p>
          ✅ {pinsImported} Pin{pinsImported === 1 ? '' : 's'} erfolgreich
          importiert
        </p>
        <p>
          ✅ {boardsImported} Board{boardsImported === 1 ? '' : 's'}{' '}
          erfolgreich importiert
        </p>
        {result.zeitraum_von && result.zeitraum_bis && (
          <p className="text-xs text-green-700">
            Zeitraum: {formatDateDe(result.zeitraum_von)} –{' '}
            {formatDateDe(result.zeitraum_bis)}
            {metricsLabel && ` · Metriken: ${metricsLabel}`}
          </p>
        )}
      </div>
      {pinsUnmatched > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            ⚠️ {pinsUnmatched} Pin{pinsUnmatched === 1 ? '' : 's'}{' '}
            {pinsUnmatched === 1 ? 'wurde' : 'wurden'} importiert aber noch
            keinem Pin-Titel zugeordnet. Bitte einmalig verknüpfen — beim
            nächsten Import werden diese Pins automatisch erkannt.
          </p>
          <p className="mt-1.5">
            <button
              type="button"
              onClick={onJumpToUnmatchedPins}
              className="font-medium text-amber-900 underline hover:opacity-80"
            >
              → Jetzt zuordnen im Tab Top Pins
            </button>
          </p>
        </div>
      )}
      {boardsUnmatched > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            ⚠️ {boardsUnmatched} Board
            {boardsUnmatched === 1 ? '' : 's'}{' '}
            {boardsUnmatched === 1 ? 'wurde' : 'wurden'} importiert aber noch
            keinem Board zugeordnet.
          </p>
          <p className="mt-1.5">
            <button
              type="button"
              onClick={onJumpToUnmatchedBoards}
              className="font-medium text-amber-900 underline hover:opacity-80"
            >
              → Jetzt zuordnen im Tab Boards
            </button>
          </p>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Weitere CSV importieren
        </button>
      </div>
    </div>
  )
}

// ===========================================================
// Schritt 2b — Manuelle Eingabe (zugeklappt)
// ===========================================================
function ManualEntryToggle({
  pins,
  boards,
  latestZeitraumBis,
}: {
  pins: PinOption[]
  boards: BoardOption[]
  latestZeitraumBis: string | null
}) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer">
        <span className="text-sm font-semibold text-gray-900">
          Alternativ: Pins und Boards manuell eingeben
        </span>
        <span className="ml-2 text-xs text-gray-500">
          Optional — nur wenn kein CSV-Export möglich
        </span>
      </summary>
      <div className="mt-4 space-y-6">
        <PinManualForm pins={pins} latestZeitraumBis={latestZeitraumBis} />
        <BoardManualForm boards={boards} />
      </div>
    </details>
  )
}

// ===========================================================
// Pin-Manuelle-Eingabe (Pin auswählen + Zeitraum + Metriken)
// ===========================================================
function PinManualForm({
  pins,
  latestZeitraumBis,
}: {
  pins: PinOption[]
  latestZeitraumBis: string | null
}) {
  const [pinId, setPinId] = useState('')
  const [selectedPin, setSelectedPin] = useState<PinOption | null>(null)
  const [pinSearch, setPinSearch] = useState('')
  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  useEffect(() => {
    const yesterday = addDays(todayIso(), -1)
    setZeitraumBis((prev) => prev || yesterday)
    setZeitraumVon(
      (prev) =>
        prev || (latestZeitraumBis ? addDays(latestZeitraumBis, 1) : '')
    )
  }, [latestZeitraumBis])

  const filteredPins = useMemo(() => {
    if (selectedPin) return [] as PinOption[]
    const q = pinSearch.trim().toLowerCase()
    if (!q) return [] as PinOption[]
    return pins
      .filter((p) => (p.titel ?? '').toLowerCase().includes(q))
      .slice(0, 12)
  }, [pinSearch, pins, selectedPin])

  function selectPin(pin: PinOption) {
    setSelectedPin(pin)
    setPinId(pin.id)
    setPinSearch('')
  }

  function clearPin() {
    setSelectedPin(null)
    setPinId('')
    setPinSearch('')
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await savePinAnalytics(formData)
      if (result.error) {
        setFeedback({ error: result.error })
        return
      }
      setFeedback({ saved: true })
      setSelectedPin(null)
      setPinId('')
      setPinSearch('')
      setImpressionen('')
      setKlicks('')
      setSaves('')
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Top Pin manuell eintragen
      </h3>

      {pins.length === 0 ? (
        <p className="text-sm text-gray-500">
          Du hast noch keine Pins angelegt. Lege zuerst einen Pin in der
          Pin-Produktion an.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-3">
              <PinSearchField
                selectedPin={selectedPin}
                search={pinSearch}
                onSearchChange={setPinSearch}
                filteredPins={filteredPins}
                onSelect={selectPin}
                onClear={clearPin}
              />
              <input type="hidden" name="pin_id" value={pinId} />
            </div>

            <Field label="Von" htmlFor="pin_zeitraum_von">
              <input
                id="pin_zeitraum_von"
                name="zeitraum_von"
                type="date"
                required
                value={zeitraumVon}
                onChange={(e) => setZeitraumVon(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Bis" htmlFor="pin_zeitraum_bis">
              <input
                id="pin_zeitraum_bis"
                name="zeitraum_bis"
                type="date"
                required
                value={zeitraumBis}
                onChange={(e) => setZeitraumBis(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Impressionen" htmlFor="pin_impressionen">
              <input
                id="pin_impressionen"
                name="impressionen"
                type="number"
                min={0}
                step={1}
                required
                value={impressionen}
                onChange={(e) => setImpressionen(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Klicks" htmlFor="pin_klicks">
              <input
                id="pin_klicks"
                name="klicks"
                type="number"
                min={0}
                step={1}
                required
                value={klicks}
                onChange={(e) => setKlicks(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Saves" htmlFor="pin_saves">
              <input
                id="pin_saves"
                name="saves"
                type="number"
                min={0}
                step={1}
                required
                value={saves}
                onChange={(e) => setSaves(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !pinId}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              title={!pinId ? 'Bitte zuerst einen Pin auswählen' : ''}
            >
              {isPending ? 'Speichert…' : 'Pin speichern'}
            </button>
            {feedback.saved && (
              <span className="text-sm text-green-700">✓ Gespeichert</span>
            )}
            {feedback.error && (
              <span className="text-sm text-red-700">{feedback.error}</span>
            )}
          </div>
        </>
      )}
    </form>
  )
}

function PinSearchField({
  selectedPin,
  search,
  onSearchChange,
  filteredPins,
  onSelect,
  onClear,
}: {
  selectedPin: PinOption | null
  search: string
  onSearchChange: (v: string) => void
  filteredPins: PinOption[]
  onSelect: (pin: PinOption) => void
  onClear: () => void
}) {
  return (
    <div>
      <label
        htmlFor="pin_manual_search"
        className="block text-sm font-medium text-gray-700"
      >
        Pin auswählen <span className="text-red-600">*</span>
      </label>
      {selectedPin ? (
        <div className="mt-1 rounded-md border border-gray-300 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium text-gray-900">
                {selectedPin.titel ?? (
                  <span className="text-gray-500">(ohne Titel)</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PIN_STATUS_BADGE[selectedPin.status] ??
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {PIN_STATUS_LABEL[selectedPin.status] ?? selectedPin.status}
                </span>
                <span>{formatPinDate(selectedPin)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              × ändern
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            id="pin_manual_search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pin-Titel suchen…"
            autoComplete="off"
            className={inputCls}
          />
          {search.trim() && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {filteredPins.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">
                  Keine passenden Pins gefunden.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredPins.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(p)}
                        className="block w-full p-3 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">
                          {p.titel ?? (
                            <span className="text-gray-500">
                              (ohne Titel)
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              PIN_STATUS_BADGE[p.status] ??
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {PIN_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                          <span>{formatPinDate(p)}</span>
                        </div>
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
  )
}

function formatPinDate(pin: PinOption): string {
  if (pin.geplante_veroeffentlichung) {
    return `📅 Veröffentlichung: ${formatDateDe(pin.geplante_veroeffentlichung)}`
  }
  return `Erstellt: ${formatDateDe(pin.created_at.slice(0, 10))}`
}

// ===========================================================
// Board-Manuelle-Eingabe (Board auswählen + Datum + Metriken)
// ===========================================================
function BoardManualForm({ boards }: { boards: BoardOption[] }) {
  const [boardId, setBoardId] = useState('')
  const [datum, setDatum] = useState(todayIso())
  const [impressionen, setImpressionen] = useState('')
  const [klicksAufPins, setKlicksAufPins] = useState('')
  const [ausgehendeKlicks, setAusgehendeKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [engagement, setEngagement] = useState('')
  const [anzahlPins, setAnzahlPins] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveBoardAnalytics(formData)
      if (result.error) {
        setFeedback({ error: result.error })
        return
      }
      setFeedback({ saved: true })
      setImpressionen('')
      setKlicksAufPins('')
      setAusgehendeKlicks('')
      setSaves('')
      setEngagement('')
      setAnzahlPins('')
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Board manuell eintragen
      </h3>

      {boards.length === 0 ? (
        <p className="text-sm text-gray-500">
          Du hast noch keine Boards angelegt.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Board" htmlFor="board_manual_board_id">
              <select
                id="board_manual_board_id"
                name="board_id"
                required
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Analytics-Datum" htmlFor="board_manual_datum">
              <input
                id="board_manual_datum"
                name="datum"
                type="date"
                required
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <NumField
              label="Impressionen"
              name="impressionen"
              value={impressionen}
              onChange={setImpressionen}
            />
            <NumField
              label="Pin-Klicks"
              name="klicks_auf_pins"
              value={klicksAufPins}
              onChange={setKlicksAufPins}
            />
            <NumField
              label="Ausg. Klicks"
              name="ausgehende_klicks"
              value={ausgehendeKlicks}
              onChange={setAusgehendeKlicks}
            />
            <NumField
              label="Saves"
              name="saves"
              value={saves}
              onChange={setSaves}
            />
            <NumField
              label="Interaktionen"
              name="engagement"
              value={engagement}
              onChange={setEngagement}
            />
            <NumField
              label="Anzahl Pins"
              name="anzahl_pins"
              value={anzahlPins}
              onChange={setAnzahlPins}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !boardId}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Speichert…' : 'Board speichern'}
            </button>
            {feedback.saved && (
              <span className="text-sm text-green-700">✓ Gespeichert</span>
            )}
            {feedback.error && (
              <span className="text-sm text-red-700">{feedback.error}</span>
            )}
          </div>
        </>
      )}
    </form>
  )
}

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
    </div>
  )
}

function NumField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label
        htmlFor={`board_manual_${name}`}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={`board_manual_${name}`}
        name={name}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  )
}
