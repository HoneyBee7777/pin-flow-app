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
  type UnmatchedPin,
  type UnmatchedBoard,
} from './actions'
import UnmatchedPinsSection from './UnmatchedPinsSection'
import UnmatchedBoardsSection from './UnmatchedBoardsSection'
import {
  detectPinsCsvMetric,
  parseFilenamePeriod,
  type PinMetric,
} from './csvImport'
import {
  addDays,
  effectiveZeitraum,
  formatDateDe,
  formatMonthDe,
  PIN_STATUS_BADGE,
  PIN_STATUS_LABEL,
  naechsterMonatZeitraum,
  todayIso,
  type BoardOption,
  type PinAnalyticsRow,
  type PinOption,
  type ProfilAnalyticsWithGrowth,
} from './utils'
import type { AudienceSnapshot } from '@/lib/audience-types'
import AudienceCsvUpload from './AudienceCsvUpload'
import { HinweisBox } from '@/components/HinweisBox'
import { PinKategorieIcon } from '@/components/PinKategorieIcon'

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

// Invertiert parseTsdInput für die Vorbefüllung beim Bearbeiten: absoluter
// DB-Wert (5500) → Tsd.-Eingabetext ("5,5"). round() beim Speichern fängt
// Float-Reste wieder ab, daher verlustfrei hin und zurück.
function toTsdInput(absolute: number): string {
  return String(absolute / 1000).replace('.', ',')
}

// Bearbeiten-Anforderung aus der Profil-Verlaufstabelle: der zu ladende
// Eintrag + ein nonce, das bei jedem Klick steigt (erzwingt erneutes
// Vorbefüllen, auch bei wiederholtem Klick auf dieselbe Zeile).
export type ProfilEditRequest = {
  entry: ProfilAnalyticsWithGrowth
  nonce: number
}

const TSD_FIELDS = [
  'impressionen',
  'gesamte_zielgruppe',
] as const

// Grünes Häkchen für „erledigt" — funktionales Icon im App-Stil (kein Deko-Emoji).
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className="h-4 w-4 shrink-0 text-status-gut-text"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// Offener, gedämpfter Kreis für „noch offen".
function OpenCircleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className="h-4 w-4 shrink-0 text-gray-400"
    >
      <circle cx="10" cy="10" r="7.25" />
    </svg>
  )
}

// Automatische Monats-Checkliste: zeigt, ob für den letzten ABGESCHLOSSENEN
// Kalendermonat alle drei Importe erfasst sind. Referenzmonat stabil aus
// `today` über naechsterMonatZeitraum(null) (= voller Vormonat), NICHT aus dem
// geteilten latestZeitraumBis (das wandert nach dem ersten Import). Jede der
// drei Prüfungen vergleicht direkt gegen die jeweilige Quelle per YYYY-MM.
function MonatsCheckliste({
  profilAnalytics,
  pinAnalytics,
  audienceSnapshots,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pinAnalytics: PinAnalyticsRow[]
  audienceSnapshots: AudienceSnapshot[]
}) {
  // Letzter abgeschlossener Kalendermonat (von = 1. des Vormonats).
  const { von } = naechsterMonatZeitraum(null)
  const refMonth = von.slice(0, 7) // YYYY-MM
  const monatLabel = formatMonthDe(von) // z. B. „Mai 2026"

  // Punkt 1 — Profil-Daten: ∃ profil_analytics mit zeitraum_bis (Fallback datum)
  // im Referenzmonat.
  const profilDone = profilAnalytics.some(
    (r) => (r.zeitraum_bis ?? r.datum).slice(0, 7) === refMonth
  )
  // Punkt 2 — Pins + Boards: ∃ pin_analytics mit zeitraum_bis (Fallback datum)
  // im Referenzmonat. Boards stammen aus demselben Import.
  const pinsDone = pinAnalytics.some(
    (r) => (r.zeitraum_bis ?? r.datum).slice(0, 7) === refMonth
  )
  // Punkt 3 — Zielgruppe: ∃ audience_snapshot mit audienceDate im Referenzmonat
  // (Kalendermonat-Vergleich, das CSV-Datum kann mitten im Monat liegen).
  const audienceDone = audienceSnapshots.some(
    (s) => s.audienceDate.slice(0, 7) === refMonth
  )

  const items = [
    {
      key: 'profil',
      label: 'Profil-Daten eingetragen',
      done: profilDone,
      targetId: 'analytics-profil-form',
    },
    {
      key: 'pins',
      label: 'Pins und Boards importiert',
      done: pinsDone,
      targetId: 'analytics-csv-import',
    },
    {
      key: 'audience',
      label: 'Zielgruppe importiert',
      done: audienceDone,
      targetId: 'analytics-zielgruppe-import',
    },
  ]

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        Dein Stand für {monatLabel}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((it) =>
          it.done ? (
            <li
              key={it.key}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <CheckIcon />
              <span>{it.label}</span>
            </li>
          ) : (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => scrollTo(it.targetId)}
                className="flex w-full items-center gap-2 text-left text-sm text-gray-500 hover:text-gray-700"
              >
                <OpenCircleIcon />
                <span>{it.label}</span>
                <span className="text-xs text-gray-400">noch offen</span>
              </button>
            </li>
          )
        )}
      </ul>
    </div>
  )
}

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
  pinAnalytics,
  audienceSnapshots,
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
  unmatchedPins,
  unmatchedZeitraumVon,
  unmatchedZeitraumBis,
  onUnmatchedPinResolved,
  unmatchedBoards,
  onUnmatchedBoardResolved,
  editRequest,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  // Für die Monats-Checkliste (nur Lesezugriff, keine neue DB-Abfrage).
  pinAnalytics?: PinAnalyticsRow[]
  audienceSnapshots?: AudienceSnapshot[]
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
  // Nicht zugeordnete Pins aus dem letzten CSV-Import. Optional, weil die
  // Verdrahtung in AnalyticsClient erst in einem späteren Schritt erfolgt —
  // solange die Props fehlen, bleibt die Section inert (rendert nicht).
  unmatchedPins?: UnmatchedPin[]
  unmatchedZeitraumVon?: string
  unmatchedZeitraumBis?: string
  onUnmatchedPinResolved?: (pinterestPinId: string) => void
  // Nicht zugeordnete Boards aus dem letzten CSV-Import. Teilen sich den
  // Import-Zeitraum (unmatchedZeitraumVon/Bis) mit den Pins. Optional, bis
  // AnalyticsClient sie verdrahtet.
  unmatchedBoards?: UnmatchedBoard[]
  onUnmatchedBoardResolved?: (boardSlug: string) => void
  // Bearbeiten-Anforderung aus der Profil-Verlaufstabelle (Profil-Tab) —
  // befüllt das „1) Profil-Daten"-Formular mit den Werten dieses Zeitraums.
  editRequest?: ProfilEditRequest | null
}) {
  // Getrennte Pin-/Board-Zähler für die Hinweis-Box — aus den bereits
  // übergebenen Listen abgeleitet, ohne zusätzliche Durchreichung.
  const pendingPinCount = unmatchedPins?.length ?? 0
  const pendingBoardCount = unmatchedBoards?.length ?? 0
  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-700">
        Hier trägst du deine Pinterest-Zahlen ein, immer für einen einzelnen
        Zeitraum. Ausgewertet werden sie im Dashboard und in den Tabs
        Profil-Entwicklung, Top Pins, Boards und Zielgruppe, dort werden alle
        Zeiträume zusammengerechnet, sodass du deine Gesamtwerte und die
        Entwicklung über die Zeit siehst. Pins und Boards aus dem Import, die
        Pin-Flow noch nicht kennt, ordnest du weiter unten einmalig deinen
        angelegten Pins und Boards zu.
      </p>

      <MonatsCheckliste
        profilAnalytics={profilAnalytics}
        pinAnalytics={pinAnalytics ?? []}
        audienceSnapshots={audienceSnapshots ?? []}
      />

      {pendingNotice && (
        <HinweisBox variant="tipp">
          <div className="space-y-2">
            {pendingPinCount > 0 && (
              <p>
                Du hast noch <strong>{pendingPinCount}</strong> nicht
                zugeordnete {pendingPinCount === 1 ? 'Pin' : 'Pins'} aus dem
                letzten Import
                {pendingNotice.zeitraum_von && pendingNotice.zeitraum_bis && (
                  <>
                    {' '}(Zeitraum {formatDateDe(pendingNotice.zeitraum_von)} bis{' '}
                    {formatDateDe(pendingNotice.zeitraum_bis)})
                  </>
                )}
                . Du kannst sie{' '}
                <button
                  type="button"
                  onClick={onJumpToUnmatchedPins}
                  className="font-medium text-link underline underline-offset-2"
                >
                  weiter unten
                </button>{' '}
                zuordnen oder überspringen.
              </p>
            )}
            {pendingBoardCount > 0 && (
              <p>
                Du hast noch <strong>{pendingBoardCount}</strong> nicht
                zugeordnete {pendingBoardCount === 1 ? 'Board' : 'Boards'} aus
                dem letzten Import
                {pendingNotice.zeitraum_von && pendingNotice.zeitraum_bis && (
                  <>
                    {' '}(Zeitraum {formatDateDe(pendingNotice.zeitraum_von)} bis{' '}
                    {formatDateDe(pendingNotice.zeitraum_bis)})
                  </>
                )}
                . Du kannst sie{' '}
                <button
                  type="button"
                  onClick={onJumpToUnmatchedBoards}
                  className="font-medium text-link underline underline-offset-2"
                >
                  weiter unten
                </button>{' '}
                zuordnen oder überspringen.
              </p>
            )}
          </div>
        </HinweisBox>
      )}

      <ZeitraumHeader von={expectedZeitraumVon} bis={expectedZeitraumBis} />

      <div>
        <a
          href={pinterestAnalyticsUrl ?? 'https://analytics.pinterest.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          Pinterest Analytics öffnen ↗
        </a>
        <div className="mt-3">
          <CombinedHowToToggle
            von={expectedZeitraumVon}
            bis={expectedZeitraumBis}
          />
        </div>
      </div>

      {/* Karte 1 — Profil-Performance */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            1. Profil-Performance eintragen
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Trag die Gesamtzahlen deines Profils für den Zeitraum ein. Diese
            erfasst du von Hand, weil Pinterest dafür keinen Export anbietet.
          </p>
        </div>
        <Schritt1ProfilForm
          editRequest={editRequest}
          profilAnalytics={profilAnalytics}
          latestZeitraumBis={latestZeitraumBis}
        />
      </section>

      {/* Karte 2 — Top Pins und Boards */}
      <section
        id="analytics-csv-import"
        className="scroll-mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            2. Top Pins und Boards importieren
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Lade die drei Pinterest-Exporte hoch. Daraus entstehen deine
            Auswertungen für Top Pins und Boards. Falls kein Export möglich
            ist, kannst du sie weiter unten auch von Hand eintragen.
          </p>
        </div>
        <HinweisBox variant="tipp">
          Häufige Stolperstelle: Pinterest liefert für alle drei Uploads{' '}
          <strong>dieselbe Übersichts-CSV</strong> – ihr Inhalt ändert sich nur
          mit der Sortierung. Exportiere sie deshalb <strong>dreimal</strong>,
          je einmal nach Klicks, Impressionen und Saves sortiert. Reihenfolge
          und Dateiname sind egal, Pin-Flow erkennt die Metrik selbst. Die
          genaue Klick-für-Klick-Anleitung steht oben unter „So findest du alle
          Zahlen".
        </HinweisBox>
        <Schritt2CsvUpload
          expectedZeitraumVon={expectedZeitraumVon}
          expectedZeitraumBis={expectedZeitraumBis}
          onImported={onImported}
          onJumpToUnmatchedPins={onJumpToUnmatchedPins}
          onJumpToUnmatchedBoards={onJumpToUnmatchedBoards}
        />
      </section>

      {/* Nicht zugeordnete Pins — verschoben aus dem Top-Pins-Tab. Rendert
          nur, wenn die Props verdrahtet sind (Häppchen B); bis dahin inert. */}
      {unmatchedPins && unmatchedPins.length > 0 && onUnmatchedPinResolved && (
        <UnmatchedPinsSection
          unmatchedPins={unmatchedPins}
          pins={pins}
          zeitraumVon={unmatchedZeitraumVon ?? ''}
          zeitraumBis={unmatchedZeitraumBis ?? ''}
          onAssigned={onUnmatchedPinResolved}
          onSkipped={onUnmatchedPinResolved}
        />
      )}

      {/* Nicht zugeordnete Boards — verschoben aus dem Boards-Tab. Teilt den
          Import-Zeitraum mit den Pins; rendert nur bei verdrahteten Props. */}
      {unmatchedBoards && unmatchedBoards.length > 0 && onUnmatchedBoardResolved && (
        <UnmatchedBoardsSection
          unmatchedBoards={unmatchedBoards}
          boards={boards}
          zeitraumVon={unmatchedZeitraumVon ?? ''}
          zeitraumBis={unmatchedZeitraumBis ?? ''}
          onAssigned={onUnmatchedBoardResolved}
          onSkipped={onUnmatchedBoardResolved}
        />
      )}

      {/* Karte 3 — Zielgruppe */}
      <section
        id="analytics-zielgruppe-import"
        className="scroll-mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            3. Zielgruppe importieren
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Einmal im Monat: zeigt, wer deine Inhalte tatsächlich nutzt.
          </p>
        </div>
        <HinweisBox variant="tipp">
          „Audience Insights" hat keinen wählbaren Datumsbereich, sondern zeigt
          immer nur die rollierenden letzten 30 Tage. Exportiere die CSV daher
          am besten gleich zu Monatsbeginn – dann decken die letzten 30 Tage
          möglichst genau den gerade abgeschlossenen Kalendermonat ab.
        </HinweisBox>
        <AudienceCsvUpload />
      </section>

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
  // von/bis null → Nutzer ist auf dem aktuellen Stand. Diese Info trägt schon
  // der Status-Banner oben (UpdateStatusBanner) → hier nichts rendern, um die
  // Dopplung zu vermeiden. Nur bei empfohlenem Zeitraum die Box zeigen.
  if (!von || !bis) return null
  return (
    <HinweisBox variant="merke">
      <p>
        <strong>Empfohlener nächster Zeitraum:</strong>{' '}
        {formatDateDe(von)} bis {formatDateDe(bis)}. Pin-Flow schlägt dir
        immer den nächsten vollen Monat vor, damit du saubere Monatswerte
        sammelst und im Tab Profil-Entwicklung fair vergleichen kannst.
        Stelle in Pinterest Analytics unter {'„Benutzerdefiniert"'} genau
        diesen Zeitraum ein und trag ihn erst ein, wenn der Monat
        abgeschlossen ist.
      </p>
    </HinweisBox>
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
    <details
      id="so-findest-du-die-zahlen"
      className="group overflow-hidden max-w-3xl rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <summary className="group/sum flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-marke-blaugrau [&::-webkit-details-marker]:hidden">
        <span
          className="text-lg leading-none text-gray-400 transition-transform group-hover/sum:text-white"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1 group-hover/sum:text-white">So findest du alle Zahlen</span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
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
          <p className="mt-1">
            Wichtig: Es ist immer <strong>dieselbe Übersichts-CSV</strong> – ihr
            Inhalt richtet sich nach der aktuellen Sortierung. Du exportierst sie
            deshalb dreimal, je einmal pro Sortierung:
          </p>
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
          <p className="mt-2 text-gray-600">
            Die drei Dateien sehen fast gleich aus (oft mit ähnlichem
            Dateinamen) – das ist kein Problem: Reihenfolge und Name sind egal,
            Pin-Flow erkennt die Metrik selbst und warnt, falls eine CSV im
            falschen Feld landet.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Top Boards</p>
          <p className="mt-1">
            Werden automatisch aus denselben CSVs importiert, kein separater
            Export nötig.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            Zielgruppe (1× pro Monat empfohlen)
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>
              Pinterest öffnen → Analytics → links in der Seitenleiste auf
              „Audience Insights"
            </li>
            <li>
              Reiter „Interagierende Zielgruppe" auswählen (nicht „Gesamte
              Zielgruppe", die Interagierende ist strategisch wertvoller)
            </li>
            <li>
              Rechts oben auf das Export-Symbol klicken → CSV speichern
            </li>
            <li>
              CSV unter Schritt 2 (rechte Spalte „Zielgruppe importieren")
              hochladen
            </li>
          </ol>
          <p className="mt-2 text-gray-600">
            <strong>Hinweis:</strong> „Audience Insights" hat keinen wählbaren
            Datumsbereich, sondern zeigt immer nur die rollierenden letzten 30
            Tage. Exportiere die CSV daher am besten gleich zu Monatsbeginn –
            dann decken die letzten 30 Tage möglichst genau den gerade
            abgeschlossenen Kalendermonat ab.
          </p>
        </div>
        <p className="text-gray-600">
          <strong>Gut zu wissen:</strong> Bei noch kleinen Accounts verweigert
          Pinterest den Export einzelner Metriken (z. B. bei 0 Saves) oder der
          Zielgruppe manchmal selbst mit „nicht genügend Daten". Das ist normal
          und kein Fehler von Pin-Flow. Lade dann einfach die verfügbaren CSVs
          hoch – die Slots sind unabhängig, Teil-Importe funktionieren
          problemlos und der Rest ergänzt sich in späteren Monaten.
        </p>

        <HinweisBox variant="tipp">
          Pinterest zeigt deine Analytics nur begrenzt rückwirkend, ältere
          Werte sind irgendwann nicht mehr abrufbar. Dieses System speichert
          deine historischen Daten dauerhaft: trage monatlich ein damit keine
          Daten verloren gehen.
        </HinweisBox>
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
  editRequest,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  latestZeitraumBis: string | null
  editRequest?: ProfilEditRequest | null
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
    const { von, bis } = naechsterMonatZeitraum(latestZeitraumBis)
    // Immer der nächste volle Monat (auch der laufende) — der prev-Guard
    // überschreibt bereits getippte Werte nicht.
    if (von) setZeitraumVon((prev) => prev || von)
    if (bis) setZeitraumBis((prev) => prev || bis)
  }, [latestZeitraumBis])

  // Bearbeiten: Werte des gewählten Zeitraums vorbefüllen. Einheiten-
  // Rückrechnung passend zur Speicher-Logik — TSD-Felder (impressionen,
  // gesamte_zielgruppe) als „x,y"-Tsd. (÷1000), die übrigen 1:1. zeitraum_bis
  // (= datum) sorgt beim Speichern für UPSERT auf denselben Eintrag.
  useEffect(() => {
    if (!editRequest) return
    const e = editRequest.entry
    const { von, bis } = effectiveZeitraum(e)
    setZeitraumVon(von)
    setZeitraumBis(bis)
    setImpressionen(toTsdInput(e.impressionen))
    setKlicks(String(e.ausgehende_klicks))
    setSaves(String(e.saves))
    setZielgruppe(toTsdInput(e.gesamte_zielgruppe))
    setInteragierend(String(e.interagierende_zielgruppe))
  }, [editRequest])

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
    <form
      id="analytics-profil-form"
      onSubmit={onSubmit}
      className="space-y-4 scroll-mt-6"
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
              <p className="mt-1 text-xs text-status-achtung-text">
                Eintrag mit diesem End-Datum existiert bereits, wird
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
            label="Interagierende Zielgruppe (Personen)"
            htmlFor="profil_interagierende_zielgruppe"
          >
            <input
              id="profil_interagierende_zielgruppe"
              name="interagierende_zielgruppe"
              type="text"
              inputMode="numeric"
              required
              placeholder="113"
              value={interagierend}
              onChange={(e) => setInteragierend(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              Gib die echte Personenzahl ein, z.B. 113
            </p>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
    <div className="space-y-3">
      <HinweisBox variant="tipp">
        Lade die CSVs direkt von Pinterest herunter, nicht vorher in Excel
        öffnen.
      </HinweisBox>

      <form
        onSubmit={onSubmit}
        className="space-y-4"
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
            Dateiname „{slotWithBadFilename}" entspricht nicht dem
            Pinterest-Schema („Pinterest Analytics overview
            YYYYMMDD-YYYYMMDD.csv").
          </div>
        )}

        {!slotWithBadFilename && crossFileMismatch && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Die hochgeladenen Dateien haben unterschiedliche Zeiträume.
            Bitte nur CSVs desselben Zeitraums hochladen.
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

        {result && (
          <ImportSummary
            result={result}
            onReset={clearAllFiles}
            onJumpToUnmatchedPins={onJumpToUnmatchedPins}
            onJumpToUnmatchedBoards={onJumpToUnmatchedBoards}
          />
        )}

        {!snapshotMismatch && !result && (
          <div className="flex items-center">
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
            >
              {isPending ? 'Importiert…' : 'Import starten'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Nach dem Import erscheinen neue, noch nicht zugeordnete Pins und
          Boards weiter unten auf dieser Seite. Dort verknüpfst du sie einmalig
          mit deinen angelegten Pins und Boards.
        </p>
      </form>
    </div>
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
        <p className="mt-1 break-all text-xs text-status-achtung-text" title={file.name}>
          <PinKategorieIcon name="warnung" className="mr-1 inline-block h-3.5 w-3.5 shrink-0 align-text-bottom" />
          {file.name}
        </p>
      )}
      {file && metricMatches && (
        <p className="mt-1 text-xs font-medium text-status-gut-text">
          ✓ Erkannt: {METRIC_LABEL[detectedMetric as PinMetric]}
        </p>
      )}
      {file && metricMismatch && (
        <div className="mt-1">
          <HinweisBox variant="warnung" tone="achtung" compact>
            Diese Datei enthält{' '}
            <strong>{METRIC_LABEL[detectedMetric as PinMetric]}</strong>,
            dieses Feld erwartet <strong>{METRIC_LABEL[expectedMetric]}</strong>
            . Bitte die richtige CSV hochladen.
          </HinweisBox>
        </div>
      )}
      {file && detectedMetric === null && (
        <p className="mt-1 text-xs text-status-achtung-text">
          In dieser CSV wurde kein „Top Pins"-Block gefunden, bitte
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
    klicks: 'Ausgehende Klicks',
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
          {pinsImported} Pin{pinsImported === 1 ? '' : 's'} erfolgreich
          importiert
        </p>
        <p>
          {boardsImported} Board{boardsImported === 1 ? '' : 's'}{' '}
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
        <div className="rounded-md border border-hinweis-tipp-rand bg-hinweis-tipp-flaeche p-3 text-sm text-hinweis-tipp-text">
          <p>
            {pinsUnmatched} Pin{pinsUnmatched === 1 ? '' : 's'}{' '}
            {pinsUnmatched === 1 ? 'wurde' : 'wurden'} importiert, aber noch
            keinem deiner Pins zugeordnet. Verknüpfe sie einmalig, dann erkennt
            Pin-Flow sie bei jedem weiteren Import automatisch.
          </p>
          <p className="mt-1.5">
            <button
              type="button"
              onClick={onJumpToUnmatchedPins}
              className="font-medium text-link underline underline-offset-2"
            >
              Jetzt zuordnen
            </button>
          </p>
        </div>
      )}
      {boardsUnmatched > 0 && (
        <div className="rounded-md border border-hinweis-tipp-rand bg-hinweis-tipp-flaeche p-3 text-sm text-hinweis-tipp-text">
          <p>
            {boardsUnmatched} Board
            {boardsUnmatched === 1 ? '' : 's'}{' '}
            {boardsUnmatched === 1 ? 'wurde' : 'wurden'} importiert, aber noch
            keinem deiner Boards zugeordnet. Verknüpfe sie einmalig, dann
            erkennt Pin-Flow sie bei jedem weiteren Import automatisch.
          </p>
          <p className="mt-1.5">
            <button
              type="button"
              onClick={onJumpToUnmatchedBoards}
              className="font-medium text-link underline underline-offset-2"
            >
              Jetzt zuordnen
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
          Optional, nur wenn kein CSV-Export möglich
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
    const { von, bis } = naechsterMonatZeitraum(latestZeitraumBis)
    // Immer der nächste volle Monat (auch der laufende) — der prev-Guard
    // überschreibt bereits getippte Werte nicht.
    if (von) setZeitraumVon((prev) => prev || von)
    if (bis) setZeitraumBis((prev) => prev || bis)
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

            <Field label="Ausgehende Klicks" htmlFor="pin_klicks">
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
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
    return `Veröffentlichung: ${formatDateDe(pin.geplante_veroeffentlichung)}`
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
              className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
