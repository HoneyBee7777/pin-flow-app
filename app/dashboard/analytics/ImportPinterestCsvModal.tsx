'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import {
  importPinterestCsv,
  type ImportPinterestCsvResult,
} from './actions'
import { parseFilenamePeriod } from './csvImport'
import { formatDateDe } from './utils'
import { HinweisBox } from '@/components/HinweisBox'

type Props = {
  open: boolean
  onClose: () => void
  // Wenn ein Import erfolgreich war, leitet das Modal die Unmatched-Listen
  // an den Parent weiter (AnalyticsClient hält sie und reicht sie an die
  // Pins-/Boards-Tabs durch).
  onImported: (result: ImportPinterestCsvResult) => void
  // Erwartete Periode (gleiche Werte wie im türkisen NextZeitraumHint).
  // Wird beim Öffnen des Modals als Snapshot eingefroren — so kann der
  // Nutzer 3 CSVs für denselben Zeitraum hintereinander hochladen, ohne
  // dass die „erwartete Periode" nach dem ersten Import vorrückt.
  expectedZeitraumVon: string | null
  expectedZeitraumBis: string | null
}

type SlotKey = 'csv_klicks' | 'csv_impressionen' | 'csv_saves'

const SLOT_ORDER: SlotKey[] = [
  'csv_klicks',
  'csv_impressionen',
  'csv_saves',
]

const SLOT_LABELS: Record<SlotKey, string> = {
  csv_klicks: 'CSV: Sortiert nach Ausgehenden Klicks',
  csv_impressionen: 'CSV: Sortiert nach Impressionen',
  csv_saves: 'CSV: Sortiert nach Saves',
}

// Kompaktes Periodenformat: gleicher Jahres-Anteil → "01.02. – 28.02.2026",
// unterschiedliches Jahr → "30.12.2025 – 05.01.2026".
function formatPeriodCompact(von: string, bis: string): string {
  const [vy, vm, vd] = von.split('-')
  const [by, bm, bd] = bis.split('-')
  const sameYear = vy === by
  const left = sameYear ? `${vd}.${vm}.` : `${vd}.${vm}.${vy}`
  const right = `${bd}.${bm}.${by}`
  return `${left} – ${right}`
}

export default function ImportPinterestCsvModal({
  open,
  onClose,
  onImported,
  expectedZeitraumVon,
  expectedZeitraumBis,
}: Props) {
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    csv_klicks: null,
    csv_impressionen: null,
    csv_saves: null,
  })
  const [result, setResult] = useState<ImportPinterestCsvResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Snapshot der erwarteten Periode — wird nur beim Öffnen aktualisiert.
  const [snapshotVon, setSnapshotVon] = useState<string | null>(null)
  const [snapshotBis, setSnapshotBis] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // Beim Öffnen: aktuelle erwartete Periode einfrieren.
      setSnapshotVon(expectedZeitraumVon)
      setSnapshotBis(expectedZeitraumBis)
    } else {
      setFiles({
        csv_klicks: null,
        csv_impressionen: null,
        csv_saves: null,
      })
      setResult(null)
      setError(null)
    }
    // Absicht: expectedZeitraumVon/Bis NICHT in Deps — Snapshot bleibt
    // während der Modal-Session stabil, auch wenn nach einem Teil-Import
    // der Parent eine neue erwartete Periode liefert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Pro Slot: erkannter Zeitraum aus Dateinamen (oder null).
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

  // Cross-File: alle hochgeladenen Dateien müssen denselben Zeitraum haben.
  const crossFileMismatch = useMemo(() => {
    const periods = SLOT_ORDER.map((s) => slotPeriods[s]).filter(
      (p): p is { von: string; bis: string } => p !== null
    )
    if (periods.length < 2) return false
    const first = periods[0]
    return periods.some(
      (p) => p.von !== first.von || p.bis !== first.bis
    )
  }, [slotPeriods])

  // Snapshot-Vergleich: irgendeiner der Dateinamen weicht vom erwarteten
  // Zeitraum ab. Nur prüfen wenn Snapshot überhaupt gesetzt ist (sonst:
  // Erst-Import → keine Validierung).
  const snapshotMismatch = useMemo(() => {
    if (!snapshotVon || !snapshotBis) return null
    for (const slot of SLOT_ORDER) {
      const p = slotPeriods[slot]
      if (!p) continue
      if (p.von !== snapshotVon || p.bis !== snapshotBis) {
        return {
          csvVon: p.von,
          csvBis: p.bis,
          expectedVon: snapshotVon,
          expectedBis: snapshotBis,
        }
      }
    }
    return null
  }, [slotPeriods, snapshotVon, snapshotBis])

  // Eine Datei ohne erkannten Zeitraum (Dateiname passt nicht zum Schema).
  const slotWithBadFilename = useMemo(() => {
    for (const slot of SLOT_ORDER) {
      const f = files[slot]
      if (f && !slotPeriods[slot]) return f.name
    }
    return null
  }, [files, slotPeriods])

  // Snapshot-Mismatch ist nur eine Warnung — der Nutzer entscheidet selbst,
  // ob er trotzdem importiert. Echte Blocker bleiben: ungültiger Dateiname
  // (gar nicht parsbar) und Cross-File-Mismatch (Dateien aus verschiedenen
  // Pinterest-Exports — vermutlich Versehen).
  const canSubmit =
    uploadedFiles.length > 0 && !crossFileMismatch && !slotWithBadFilename

  function setSlot(slot: SlotKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file }))
    setError(null)
  }

  function clearAllFiles() {
    setFiles({
      csv_klicks: null,
      csv_impressionen: null,
      csv_saves: null,
    })
    setError(null)
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-5">
          <h2 className="text-xl font-semibold text-gray-900">
            Pinterest Analytics CSV importieren
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-md border-l-4 border-hinweis-merke-stripe bg-hinweis-merke-flaeche p-3 text-[13px] text-hinweis-merke-text">
            <p className="font-semibold">So lädst du die CSV optimal hoch:</p>
            <p className="mt-1">
              Exportiere in Pinterest 3× die Top Pins (je nach Klicks,
              Impressionen, Saves sortiert) und lade alle 3 Dateien hier
              hoch. Board-Daten werden automatisch mit importiert.
            </p>
            <p className="mt-1">
              ⚠️ Öffne die Dateien vorher NICHT in Excel oder anderen
              Programmen.
            </p>
          </div>

          {result ? (
            <ImportSummary
              result={result}
              onClose={onClose}
              onReset={() => {
                setResult(null)
                setFiles({
                  csv_klicks: null,
                  csv_impressionen: null,
                  csv_saves: null,
                })
              }}
            />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-3">
                {SLOT_ORDER.map((slot) => (
                  <FileSlotInput
                    key={slot}
                    label={SLOT_LABELS[slot]}
                    file={files[slot]}
                    detectedPeriod={slotPeriods[slot]}
                    onChange={(f) => setSlot(slot, f)}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-500">
                Alle drei Felder sind optional, du kannst auch nur 1 oder
                2 CSVs hochladen. Der Zeitraum wird automatisch aus dem
                Dateinamen ausgelesen.
              </p>

              {slotWithBadFilename && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  ⚠️ Dateiname „{slotWithBadFilename}" entspricht nicht dem
                  Pinterest-Schema („Pinterest Analytics overview
                  YYYYMMDD-YYYYMMDD.csv").
                </div>
              )}

              {!slotWithBadFilename && crossFileMismatch && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  ⚠️ Die hochgeladenen Dateien haben unterschiedliche
                  Zeiträume. Bitte nur CSVs desselben Zeitraums hochladen.
                </div>
              )}

              {!slotWithBadFilename &&
                !crossFileMismatch &&
                snapshotMismatch && (
                  <div className="rounded-md border border-status-achtung bg-status-achtung-flaeche p-3 text-sm text-status-achtung-text">
                    <p>
                      Der Zeitraum dieser CSV (
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
                        className="rounded-md border border-status-achtung bg-white px-3 py-1.5 text-sm font-medium text-status-achtung-text hover:bg-status-achtung-flaeche disabled:opacity-50"
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

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                {/*
                  Bei Snapshot-Mismatch übernimmt der Override-Button in der
                  amber Warnbox die Submit-Rolle — der reguläre Import-Button
                  wird nur gezeigt, wenn kein Mismatch vorliegt.
                */}
                {!snapshotMismatch && (
                  <button
                    type="submit"
                    disabled={!canSubmit || isPending}
                    className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
                  >
                    {isPending ? 'Importiert…' : 'Import starten'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function FileSlotInput({
  label,
  file,
  detectedPeriod,
  onChange,
}: {
  label: string
  file: File | null
  detectedPeriod: ReturnType<typeof parseFilenamePeriod>
  onChange: (file: File | null) => void
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block flex-1 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-marke-blaugrau file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-marke-blaugrau-dunkel"
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
        <p className="mt-1 break-all text-xs text-status-gut-text">
          ✓ {file.name}, Zeitraum:{' '}
          {formatPeriodCompact(detectedPeriod.von, detectedPeriod.bis)}
        </p>
      )}
      {file && !detectedPeriod && (
        <p
          className="mt-1 break-all text-xs text-red-700"
          title={file.name}
        >
          ⚠️ {file.name}
        </p>
      )}
    </div>
  )
}

function ImportSummary({
  result,
  onClose,
  onReset,
}: {
  result: ImportPinterestCsvResult
  onClose: () => void
  onReset: () => void
}) {
  const pinsImported = result.pinsImported ?? 0
  const boardsImported = result.boardsImported ?? 0
  const pinsUnmatched = result.pinsUnmatched?.length ?? 0
  const boardsUnmatched = result.boardsUnmatched?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
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
            {result.metricsImported &&
              result.metricsImported.length > 0 &&
              ` · Pin-Metriken: ${result.metricsImported.join(', ')}`}
          </p>
        )}
      </div>

      {(pinsUnmatched > 0 || boardsUnmatched > 0) && (
        <HinweisBox variant="warnung" tone="achtung">
          <div className="space-y-2">
            {pinsUnmatched > 0 && (
              <p>
                {pinsUnmatched} Pin{pinsUnmatched === 1 ? '' : 's'} konnten
                nicht zugeordnet werden, siehe weiter unten im Eingabe-Tab
              </p>
            )}
            {boardsUnmatched > 0 && (
              <p>
                {boardsUnmatched} Board
                {boardsUnmatched === 1 ? '' : 's'} konnten nicht zugeordnet
                werden, siehe weiter unten im Eingabe-Tab
              </p>
            )}
          </div>
        </HinweisBox>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Weitere CSV importieren
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
