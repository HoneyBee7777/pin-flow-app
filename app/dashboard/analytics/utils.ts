export type ProfilAnalytics = {
  id: string
  datum: string
  // zeitraum_von / zeitraum_bis seit dem Zeitraum-Umbau. Backfill via SQL
  // füllt sie für Altdaten (zeitraum_bis = datum, zeitraum_von = datum-30).
  // Trotzdem nullable typisieren, damit defensive Helper greifen können.
  zeitraum_von: string | null
  zeitraum_bis: string | null
  impressionen: number
  ausgehende_klicks: number
  saves: number
  gesamte_zielgruppe: number
  interagierende_zielgruppe: number
  created_at: string
}

// Liefert das effektive Zeitraum-Tupel für einen Datensatz. Falls Backfill
// fehlt, fallback auf (datum-30, datum), damit UI niemals leere Werte zeigt.
export function effectiveZeitraum(row: {
  datum: string
  zeitraum_von: string | null
  zeitraum_bis: string | null
}): { von: string; bis: string } {
  const bis = row.zeitraum_bis ?? row.datum
  const von = row.zeitraum_von ?? addDays(bis, -30)
  return { von, bis }
}

export function formatZeitraumKurz(von: string, bis: string): string {
  // 06.04. – 26.04.26 (zwei-stelliges Jahr)
  const [vy, vm, vd] = von.split('-')
  const [by, bm, bd] = bis.split('-')
  const sameYear = vy === by
  const yy = by.slice(2)
  const left = sameYear ? `${vd}.${vm}.` : `${vd}.${vm}.${vy.slice(2)}`
  const right = `${bd}.${bm}.${yy}`
  return `${left} – ${right}`
}

export type ProfilAnalyticsWithGrowth = ProfilAnalytics & {
  impressionen_growth: number | null
  klicks_growth: number | null
  saves_growth: number | null
  zielgruppe_growth: number | null
  interagierend_growth: number | null
  ctr: number | null
  engagement: number | null
  ctr_growth: number | null
  engagement_growth: number | null
}

const MONATE_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function firstOfCurrentMonthIso(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function firstOfMonthIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function lastOfMonthIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  return last.toISOString().slice(0, 10)
}

// Empfohlener nächster Eingabe-Zeitraum als VOLLER Monat.
//   von = Tag nach dem letzten erfassten Ende (oder letzter abgeschlossener
//         Monat beim allerersten Update).
//   bis = Monatsende von "von" — immer der volle Monat, nie gekappt.
// Gibt {von:null, bis:null}, wenn kein abgeschlossener Monat ansteht:
//   - von läge schon in der Zukunft (Nutzer ist auf dem aktuellen Stand), oder
//   - der Monat von "von" ist noch nicht abgeschlossen (Monatsende > gestern).
// So wird nie ein Teilmonat oder ein Zeitraum mit Zukunfts-Ende vorgeschlagen;
// der laufende Monat erscheint erst als Vorschlag, sobald er vorbei ist.
export function recommendedNextZeitraum(latestZeitraumBis: string | null): {
  von: string | null
  bis: string | null
} {
  const yesterday = addDays(todayIso(), -1)
  const von = latestZeitraumBis
    ? addDays(latestZeitraumBis, 1)
    : firstOfMonthIso(addDays(firstOfCurrentMonthIso(), -1)) // Erst-Update: Vormonat
  if (von > yesterday) {
    return { von: null, bis: null }
  }
  const monatsEnde = lastOfMonthIso(von)
  // Monat noch nicht abgeschlossen → kein Vorschlag (voller Monat erst danach).
  if (monatsEnde > yesterday) {
    return { von: null, bis: null }
  }
  return { von, bis: monatsEnde }
}

// Wie recommendedNextZeitraum, aber OHNE den „läuft noch"-Cap: liefert IMMER
// einen konkreten vollen Monat (nie null) — auch wenn dieser Monat noch läuft.
// Genutzt für die Feld-Vorbelegung im Eingabe-Tab, damit die Datumsfelder stets
// den nächsten vollen Monat zeigen. Der Banner-TEXT nutzt weiter
// recommendedNextZeitraum (mit Cap) und darf „aktueller Stand" sagen.
export function naechsterMonatZeitraum(latestZeitraumBis: string | null): {
  von: string
  bis: string
} {
  const von = latestZeitraumBis
    ? addDays(latestZeitraumBis, 1)
    : firstOfMonthIso(addDays(firstOfCurrentMonthIso(), -1)) // Erst-Update: Vormonat
  return { von, bis: lastOfMonthIso(von) } // immer voller Monat, auch wenn er noch läuft
}

// Monatsbasierter Analytics-Status (Ersatz für die intervallbasierte
// calcUpdateStatusTri auf der Analytics-Seite). Basis ist das Ende des letzten
// erfassten Zeitraums, NICHT das Speicherdatum.
//   - 'leer'  → noch nie erfasst (Willkommens-Hinweis greift).
//   - 'rot'   → der nächste volle Monat ist abgeschlossen und noch nicht erfasst.
//   - 'gruen' → der nächste Monat läuft noch (noch nichts fällig).
// ISO-Strings (YYYY-MM-DD) werden lexikografisch verglichen = chronologisch.
export type UpdateStatusMonat = {
  state: 'gruen' | 'rot' | 'leer'
  faelligerMonatVon: string | null // erster Tag des nächsten zu erfassenden Monats
  faelligerMonatBis: string | null // letzter Tag desselben Monats
  eintragbarAb: string | null // erster Tag NACH faelligerMonatBis
}

export function calcUpdateStatusMonat(
  latestZeitraumBis: string | null
): UpdateStatusMonat {
  if (!latestZeitraumBis) {
    return {
      state: 'leer',
      faelligerMonatVon: null,
      faelligerMonatBis: null,
      eintragbarAb: null,
    }
  }
  const { von, bis } = naechsterMonatZeitraum(latestZeitraumBis)
  const yesterday = addDays(todayIso(), -1)
  const eintragbarAb = addDays(bis, 1)
  // Monat abgeschlossen (bis in der Vergangenheit) und noch nicht erfasst → fällig.
  const state = bis <= yesterday ? 'rot' : 'gruen'
  return {
    state,
    faelligerMonatVon: von,
    faelligerMonatBis: bis,
    eintragbarAb,
  }
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime()
  const b = new Date(toIso + 'T00:00:00Z').getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function formatDateDe(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function formatMonthDe(iso: string | null): string {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  return `${MONATE_DE[parseInt(m, 10) - 1]} ${y}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('de-DE')
}

export function formatZahl(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const v = Math.round((abs / 1_000_000) * 10) / 10
    return `${sign}${String(v).replace('.', ',')} Mio.`
  }
  if (abs >= 1_000) {
    const v = Math.round((abs / 1_000) * 10) / 10
    return `${sign}${String(v).replace('.', ',')} Tsd.`
  }
  return n.toLocaleString('de-DE')
}

export function formatPercent(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(digits)}%`
}

export function formatGrowth(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function calcCtr(klicks: number, impressionen: number): number | null {
  if (impressionen <= 0) return null
  return (klicks / impressionen) * 100
}

export function calcSaveRate(
  saves: number,
  impressionen: number
): number | null {
  if (impressionen <= 0) return null
  return (saves / impressionen) * 100
}

export function calcEngagement(
  klicks: number,
  saves: number,
  impressionen: number
): number | null {
  if (impressionen <= 0) return null
  return ((klicks + saves) / impressionen) * 100
}

export function calcGrowth(
  current: number,
  previous: number | null | undefined
): number | null {
  if (previous === null || previous === undefined) return null
  if (previous === 0) {
    if (current === 0) return 0
    return current > 0
      ? Number.POSITIVE_INFINITY
      : Number.NEGATIVE_INFINITY
  }
  const result = ((current - previous) / previous) * 100
  return Number.isNaN(result) ? null : result
}

export function withGrowth(
  rows: ProfilAnalytics[]
): ProfilAnalyticsWithGrowth[] {
  // rows are sorted DESC by datum — for each row, "previous month" is the row at i+1 (older)
  return rows.map((row, i) => {
    const prev = rows[i + 1]
    const ctr = calcCtr(row.ausgehende_klicks, row.impressionen)
    const engagement = calcEngagement(
      row.ausgehende_klicks,
      row.saves,
      row.impressionen
    )
    const prevCtr = prev
      ? calcCtr(prev.ausgehende_klicks, prev.impressionen)
      : null
    const prevEngagement = prev
      ? calcEngagement(prev.ausgehende_klicks, prev.saves, prev.impressionen)
      : null
    return {
      ...row,
      impressionen_growth: calcGrowth(row.impressionen, prev?.impressionen),
      klicks_growth: calcGrowth(
        row.ausgehende_klicks,
        prev?.ausgehende_klicks
      ),
      saves_growth: calcGrowth(row.saves, prev?.saves),
      zielgruppe_growth: calcGrowth(
        row.gesamte_zielgruppe,
        prev?.gesamte_zielgruppe
      ),
      interagierend_growth: calcGrowth(
        row.interagierende_zielgruppe,
        prev?.interagierende_zielgruppe
      ),
      ctr,
      engagement,
      ctr_growth:
        ctr !== null && prevCtr !== null ? calcGrowth(ctr, prevCtr) : null,
      engagement_growth:
        engagement !== null && prevEngagement !== null
          ? calcGrowth(engagement, prevEngagement)
          : null,
    }
  })
}

// ===========================================================
// Pin-Analytics
// ===========================================================
export const PIN_STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  geplant: 'Geplant',
  veroeffentlicht: 'Veröffentlicht',
}

export const PIN_STATUS_BADGE: Record<string, string> = {
  entwurf: 'bg-gray-100 text-gray-700',
  geplant: 'bg-blue-100 text-blue-700',
  veroeffentlicht: 'bg-green-100 text-green-700',
}

export type PinOption = {
  id: string
  titel: string | null
  status: string
  created_at: string
  geplante_veroeffentlichung: string | null
  pinterest_pin_url?: string | null
  pinterest_pin_id?: string | null
  board_id?: string | null
}

export type PinAnalyticsEntry = {
  id: string
  pin_id: string
  datum: string
  zeitraum_von: string | null
  zeitraum_bis: string | null
  impressionen: number
  klicks: number
  saves: number
  created_at: string
}

// Diagnose-Schlüssel, Labels, Badges und Handlungstexte werden zentral
// in diagnosePinAggregated.ts gepflegt. Hier nur Re-Exports + abgeleitete
// Records, damit bestehende Import-Pfade weiter funktionieren.
import {
  PIN_DIAGNOSE_KEYS,
  PIN_DIAGNOSE_META,
  type PinDiagnose as AggregatedPinDiagnose,
} from './diagnosePinAggregated'

export const PIN_DIAGNOSEN = PIN_DIAGNOSE_KEYS
export type PinDiagnose = AggregatedPinDiagnose

export const PIN_DIAGNOSE_LABEL: Record<PinDiagnose, string> =
  Object.fromEntries(
    PIN_DIAGNOSE_KEYS.map((k) => [k, PIN_DIAGNOSE_META[k].label])
  ) as Record<PinDiagnose, string>

export const PIN_DIAGNOSE_BADGE: Record<PinDiagnose, string> =
  Object.fromEntries(
    PIN_DIAGNOSE_KEYS.map((k) => [k, PIN_DIAGNOSE_META[k].badge])
  ) as Record<PinDiagnose, string>

export const PIN_HANDLUNG: Record<PinDiagnose, string> = Object.fromEntries(
  PIN_DIAGNOSE_KEYS.map((k) => [
    k,
    `${PIN_DIAGNOSE_META[k].emoji} ${PIN_DIAGNOSE_META[k].handlungText}`,
  ])
) as Record<PinDiagnose, string>

// Pin-Klassifikation V2 — Schwellwerte werden aus den Einstellungen
// geladen, Mediane optional aus der user_pin_benchmark-Tabelle.
export type UserPinBenchmark = {
  medianCtr: number | null
  medianSaveRate: number | null
  medianImpressionen: number | null
  qualifiziertePins: number | null
}

export type PinAnalyticsThresholds = {
  // Beobachtung & Hard-Floors
  beobachtungszeitraum: number
  minImpCtrUrteil: number
  minImpReichweiteStark: number
  minKlicksTopPerformer: number
  minKlicksNutzerSignal: number
  // Alter
  topPerformerMaxAlter: number
  schlafenderGewinnerAlter: number
  // Multiplikator
  ctrBoostFaktor: number
  // Fallback wenn keine Benchmark vorhanden
  fallbackMindestCtr: number
  // Mediane (null wenn < 10 qualifizierte Pins)
  medianCtr: number | null
  medianSaveRate: number | null
  medianImpressionen: number | null
}

export const PIN_ANALYTICS_THRESHOLD_DEFAULTS = {
  beobachtungszeitraum: 90,
  minImpCtrUrteil: 300,
  minImpReichweiteStark: 500,
  minKlicksTopPerformer: 10,
  minKlicksNutzerSignal: 3,
  topPerformerMaxAlter: 90,
  schlafenderGewinnerAlter: 180,
  ctrBoostFaktor: 1.2,
  fallbackMindestCtr: 1.5,
} as const

export type EinstellungenSchwellwerte = {
  schwellwert_beobachtung: number | null
  schwellwert_ctr: number | string | null
  schwellwert_min_klicks: number | null
  schwellwert_min_imp_ctr_urteil: number | null
  schwellwert_min_imp_reichweite_stark: number | null
  schwellwert_min_klicks_nutzer_signal: number | null
  schwellwert_top_performer_max_alter: number | null
  schwellwert_schlafender_gewinner_alter: number | null
  schwellwert_ctr_boost_faktor: number | string | null
}

// Die 9 Pin-Schwellwerte sind fest im Code verdrahtet (PIN_ANALYTICS_THRESHOLD_
// DEFAULTS) und NICHT mehr aus den Einstellungen überschreibbar. Der `settings`-
// Parameter wird bewusst ignoriert (positional belassen, damit `benchmark` als
// zweites Argument nicht verrutscht); die DB-Spalten schwellwert_* liegen
// vorerst ungenutzt brach (späterer DB-Cleanup).
export function thresholdsFromSettings(
  settings: Partial<EinstellungenSchwellwerte> | null | undefined,
  benchmark: UserPinBenchmark | null = null
): PinAnalyticsThresholds {
  const D = PIN_ANALYTICS_THRESHOLD_DEFAULTS
  return {
    beobachtungszeitraum: D.beobachtungszeitraum,
    minImpCtrUrteil: D.minImpCtrUrteil,
    minImpReichweiteStark: D.minImpReichweiteStark,
    minKlicksTopPerformer: D.minKlicksTopPerformer,
    minKlicksNutzerSignal: D.minKlicksNutzerSignal,
    topPerformerMaxAlter: D.topPerformerMaxAlter,
    schlafenderGewinnerAlter: D.schlafenderGewinnerAlter,
    ctrBoostFaktor: D.ctrBoostFaktor,
    fallbackMindestCtr: D.fallbackMindestCtr,
    medianCtr: benchmark?.medianCtr ?? null,
    medianSaveRate: benchmark?.medianSaveRate ?? null,
    medianImpressionen: benchmark?.medianImpressionen ?? null,
  }
}

export type PinAnalyticsRow = PinAnalyticsEntry & {
  pin: PinOption | null
  ctr: number | null
  alter_tage: number
}

// ===========================================================
// Board-Analytics
// ===========================================================
export type BoardOption = {
  id: string
  name: string
  pinterest_url: string | null
}

export type BoardAnalyticsEntry = {
  id: string
  board_id: string
  datum: string
  impressionen: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
  engagement: number
  anzahl_pins: number | null
  created_at: string
}

export const BOARD_STATUS = ['aktiv', 'wenig_aktiv', 'inaktiv'] as const
export type BoardStatus = (typeof BOARD_STATUS)[number]

export const BOARD_STATUS_LABEL: Record<BoardStatus, string> = {
  aktiv: '✅ Aktiv',
  wenig_aktiv: '⚠️ Wenig aktiv',
  inaktiv: '❌ Inaktiv',
}

export const BOARD_STATUS_BADGE: Record<BoardStatus, string> = {
  aktiv: 'bg-green-200 text-green-700',
  wenig_aktiv: 'bg-amber-200 text-amber-800',
  inaktiv: 'bg-red-200 text-red-700',
}

export type BoardThresholds = {
  // Aktivitäts-Schwellwerte (basierend auf letztem Pin-Datum). Fest verdrahtet.
  wenigAktiv: number
  inaktiv: number
}

export const BOARD_THRESHOLDS: BoardThresholds = {
  // Aktiv = letzter Pin < 30 Tage; Wenig aktiv = 30–90; Eingeschlafen = > 90.
  wenigAktiv: 30,
  inaktiv: 90,
}

// Aktivitäts-Schwellen sind fest verdrahtet (30/90); aus den Einstellungen wird
// nichts mehr gelesen (die alte ER-Score-Logik ist entfallen).
export function boardThresholdsFromSettings(): BoardThresholds {
  return {
    wenigAktiv: BOARD_THRESHOLDS.wenigAktiv,
    inaktiv: BOARD_THRESHOLDS.inaktiv,
  }
}

export function diagnoseBoard(args: {
  lastPinAlterTage: number | null
  thresholds: BoardThresholds
}): BoardStatus {
  if (args.lastPinAlterTage === null) return 'inaktiv'
  if (args.lastPinAlterTage < args.thresholds.wenigAktiv) return 'aktiv'
  if (args.lastPinAlterTage <= args.thresholds.inaktiv) return 'wenig_aktiv'
  return 'inaktiv'
}

export type KeywordSignal =
  | 'stark'
  | 'gut'
  | 'beobachten'
  | 'kein_signal'
  | 'unused'

// Keyword-Signal aus kumulierten Keyword-Daten ableiten.
//
// Das Signal läuft gegen den Eigendaten-MEDIAN der CTR — dieselbe Median- und
// Boost-Logik wie die Pin-Diagnose in diagnosePinAggregated (CTR ≥ median ×
// ctrBoostFaktor = stark). Bewusst OHNE festen Fallback: ist kein Median
// vorhanden (Account hat < 10 qualifizierte Pins, thresholds.medianCtr === null)
// oder reichen die Impressionen nicht (< minImpCtrUrteil), gibt es 'kein_signal'
// statt eines Urteils — eine Bewertung würde sonst auf zu wenig Daten beruhen.
//
// Die CTR wird kumuliert-pooled gebildet: Summe Klicks / Summe Impressionen
// über alle Pins zum Keyword (calcCtr), NICHT als Mittel der Einzel-CTRs.
export function deriveKeywordSignal(args: {
  cumKlicks: number
  cumImpressionen: number
  pinsCount: number
  thresholds: PinAnalyticsThresholds
}): KeywordSignal {
  const { cumKlicks, cumImpressionen, pinsCount, thresholds } = args

  // 1. Keyword in keinem Pin verwendet.
  if (pinsCount === 0) return 'unused'

  // 2. Datengrundlage prüfen, bevor bewertet wird — kein Rückgriff auf
  //    fallbackMindestCtr: ohne Median oder bei zu wenig Impressionen kein Signal.
  if (thresholds.medianCtr === null) return 'kein_signal'
  if (cumImpressionen < thresholds.minImpCtrUrteil) return 'kein_signal'

  // 3. Median und genug Impressionen vorhanden — kumuliert-poolte CTR bewerten.
  const ctr = calcCtr(cumKlicks, cumImpressionen)
  if (ctr === null) return 'kein_signal'

  const median = thresholds.medianCtr // hier garantiert nicht null
  if (ctr >= median * thresholds.ctrBoostFaktor) return 'stark'
  if (ctr >= median) return 'gut'
  return 'beobachten'
}

export type BoardAnalyticsRow = {
  board: BoardOption
  latest: BoardAnalyticsEntry
  lastPinDatum: string | null
  lastPinAlterTage: number | null
  // Aktivität (unverändert via diagnoseBoard)
  status: BoardStatus
  // Neue Wirkungs-Logik (Häppchen 2) — ersetzt die alte ER-basierte Bewertung.
  wirkung: BoardWirkung
  outboundClickRate: number
  saveRate: number
  sammeltSaves: boolean
  handlungNeu: BoardHandlungNeu
  // true, wenn das Datenmengen-Gate (zu wenige qualifizierte Boards für einen
  // belastbaren Median) NICHT erfüllt ist → Tab zeigt Hinweis statt Handlung.
  // Global gleich für alle Rows (Gate gilt fürs ganze Profil).
  wirkungGated: boolean
  // Pflegestand: wie viele Pins der Nutzer in Pin-Flow diesem Board zugeordnet
  // hat (aus der internen pins-Tabelle, NICHT aus der CSV — die liefert es nicht).
  anzahlPinsIntern: number
}

// ===========================================================
// Board-Wirkungs-Logik V2 (NEU, parallel zur alten ER-basierten Bewertung)
//
// Wirkung wird über die Outbound-Click-Rate (Hauptanker) + Save-Rate (zweites
// Signal) bestimmt, beide gegen den EIGENEN Board-Median des Nutzers,
// größenneutral. Bewusst getrennt von der alten scoreBoardHybrid/diagnoseBoard-
// Logik, die unverändert weiterläuft. Noch NICHT in der UI angezeigt.
// ===========================================================

// Robuster Median. Leeres Array → 0. Bei gerader Anzahl: Mittel der zwei
// mittleren Werte. (Der vorhandene median-Helfer in benchmark.ts ist
// modul-privat und liefert null bei leer — hier brauchen wir 0 + Export.)
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// Outbound-Click-Rate eines Boards: ausgehende Klicks je 100 Impressionen.
// Bewusst 0 (nicht null) bei fehlenden Impressionen, damit Median-/Faktor-
// Rechnung sauber bleibt (calcCtr gäbe hier null zurück).
export function boardOutboundClickRate(entry: {
  ausgehende_klicks: number
  impressionen: number
}): number {
  return entry.impressionen > 0
    ? (entry.ausgehende_klicks / entry.impressionen) * 100
    : 0
}

// Save-Rate eines Boards: Saves je 100 Impressionen. Ebenfalls 0 bei 0 Imp.
export function boardSaveRate(entry: {
  saves: number
  impressionen: number
}): number {
  return entry.impressionen > 0 ? (entry.saves / entry.impressionen) * 100 : 0
}

// Schwellwerte der neuen Wirkungs-Logik. Fest verdrahtet (wie die Pin-
// Schwellwerte nach dem Umbau); Einstellungs-Anbindung folgt in Häppchen 4.
export type BoardWirkungSchwellen = {
  // Unter so vielen Impressionen ist die Klickrate statistisch nicht belastbar
  // → „zu wenig Daten". (Pin-Anzahl wird bewusst nicht genutzt: die Board-CSV
  // liefert sie nicht; die Verlässlichkeit hängt am Impressionen-Nenner.)
  mindestImpressionen: number
  // Unter so vielen qualifizierten Boards (>= mindestImpressionen) trägt der
  // Median nicht — die Wirkungs-Diagnose ruht dann (Gate, greift in der
  // Anzeige-Schicht, nicht in boardWirkung selbst).
  mindestQualifizierteBoards: number
  starkFaktor: number // ≥ starkFaktor × Median = stark
  schwachFaktor: number // ≤ schwachFaktor × Median = schwach
}

export const BOARD_WIRKUNG_DEFAULTS: BoardWirkungSchwellen = {
  mindestImpressionen: 750,
  mindestQualifizierteBoards: 5,
  starkFaktor: 1.2,
  schwachFaktor: 0.8,
}

export type BoardWirkung = 'stark' | 'solide' | 'schwach' | 'zu_wenig_daten'

export type BoardWirkungResult = {
  wirkung: BoardWirkung
  outboundClickRate: number
  saveRate: number
  // true, wenn der Traffic schwach ist, das Board aber überdurchschnittlich
  // viele Saves sammelt (Schutz-Hinweis). Ändert die `wirkung` NICHT.
  sammeltSaves: boolean
}

// Mindest-Felder, die die Wirkungs-Logik je Board braucht (Untermenge von
// BoardAnalyticsEntry — bewusst strukturell, damit auch Dashboard-Rows passen).
export type BoardWirkungEntry = {
  impressionen: number
  ausgehende_klicks: number
  saves: number
}

// Median-Pool: nur Boards mit genug Impressionen (>= mindestImpressionen)
// fließen in den Median ein, damit datenarme Boards ihn nicht verzerren. Wird
// EINMAL über alle Boards gebildet und dann pro Board an `boardWirkung`
// durchgereicht.
export function boardWirkungMediane(
  entries: ReadonlyArray<BoardWirkungEntry>,
  schwellen: BoardWirkungSchwellen = BOARD_WIRKUNG_DEFAULTS
): { medianOutbound: number; medianSave: number; anzahlQualifiziert: number } {
  const qualifiziert = entries.filter(
    (e) => e.impressionen >= schwellen.mindestImpressionen
  )
  return {
    anzahlQualifiziert: qualifiziert.length,
    medianOutbound: median(qualifiziert.map((e) => boardOutboundClickRate(e))),
    medianSave: median(qualifiziert.map((e) => boardSaveRate(e))),
  }
}

// Wirkungs-Einstufung EINES Boards gegen die (einmal gebildeten) Mediane.
export function boardWirkung(args: {
  entry: BoardWirkungEntry
  medianOutbound: number
  medianSave: number
  schwellen?: BoardWirkungSchwellen
}): BoardWirkungResult {
  const schwellen = args.schwellen ?? BOARD_WIRKUNG_DEFAULTS
  const outboundClickRate = boardOutboundClickRate(args.entry)
  const saveRate = boardSaveRate(args.entry)

  // Zu wenig Daten: zu wenige Impressionen → die Klickrate ist statistisch
  // nicht belastbar, daher keine Bewertung. (impressionen ist non-null typisiert,
  // 0 wird durch den Vergleich miterfasst.)
  if (args.entry.impressionen < schwellen.mindestImpressionen) {
    return {
      wirkung: 'zu_wenig_daten',
      outboundClickRate,
      saveRate,
      sammeltSaves: false,
    }
  }

  // Median = 0 → kein verlässlicher Vergleichsmaßstab (leerer Pool oder alle
  // qualifizierten Boards mit Outbound-Rate 0). Ehrlich „zu wenig Daten" statt
  // einer erfundenen Bewertung — sonst würde jede Rate ≥ 0 fälschlich „stark".
  if (args.medianOutbound <= 0) {
    return {
      wirkung: 'zu_wenig_daten',
      outboundClickRate,
      saveRate,
      sammeltSaves: false,
    }
  }

  let wirkung: BoardWirkung
  if (outboundClickRate >= schwellen.starkFaktor * args.medianOutbound) {
    wirkung = 'stark'
  } else if (
    outboundClickRate <=
    schwellen.schwachFaktor * args.medianOutbound
  ) {
    wirkung = 'schwach'
  } else {
    wirkung = 'solide'
  }

  // Schutz-Hinweis: schwacher Traffic, aber starke Save-Rate. Reiner Zusatz.
  // medianSave > 0 absichern, sonst dieselbe Null-Falle wie oben.
  const sammeltSaves =
    wirkung === 'schwach' &&
    args.medianSave > 0 &&
    saveRate >= schwellen.starkFaktor * args.medianSave

  return { wirkung, outboundClickRate, saveRate, sammeltSaves }
}

// Vier-Felder-Handlung: Aktivität (diagnoseBoard) × neue Wirkung.
export type BoardHandlungNeu =
  | 'reaktivieren'
  | 'weiter_so'
  | 'optimieren_oder_archivieren'
  | 'zu_wenig_daten'

export function boardHandlungNeu(args: {
  wirkung: BoardWirkung
  aktivitaet: BoardStatus
}): BoardHandlungNeu {
  if (args.wirkung === 'zu_wenig_daten') return 'zu_wenig_daten'
  if (args.wirkung === 'stark') {
    // Starke Wirkung, aber Board schläft → reaktivieren; sonst läuft es.
    return args.aktivitaet === 'aktiv' ? 'weiter_so' : 'reaktivieren'
  }
  if (args.wirkung === 'schwach') return 'optimieren_oder_archivieren'
  // 'solide' → 'weiter_so' (Mittelfeld braucht keine Handlung).
  return 'weiter_so'
}

// ===========================================================
// Keyword-Text-Match (geteilt: Pins-Seite + Board-Coaching)
// ===========================================================

// Atomares Prädikat: kommt das Keyword als Teilstring im Text vor?
// Case-insensitive (toLowerCase().includes) — gleiche Semantik wie bisher auf
// der Pins-Seite (checkKeywordPresence).
export function keywordInText(keyword: string, text: string | null): boolean {
  if (!text) return false
  return text.toLowerCase().includes(keyword.toLowerCase())
}

// Welche der gegebenen Keywords kommen im Text vor? Leerer/null-Text → [].
export function matchingKeywords(
  text: string | null,
  keywords: ReadonlyArray<{ id: string; keyword: string }>
): { id: string; keyword: string }[] {
  if (!text) return []
  return keywords.filter((k) => keywordInText(k.keyword, text))
}

// ===========================================================
// Board-Coaching: Hebel (Optimierungs-/Pflege-Hinweise) pro Board (NEU,
// noch ohne Anzeige — Verdrahtung folgt in Häppchen 2).
// ===========================================================

export type BoardHebelTyp =
  | 'eingeschlafen' // inaktiv (> 90 Tage) UND hatte früher Reichweite
  | 'beschreibung_fehlt' // keine Beschreibung
  | 'name_ohne_keyword' // kein Nutzer-Keyword im Board-Namen
  | 'beschreibung_zu_duenn' // Beschreibung vorhanden, aber < 200 Zeichen
  | 'beschreibung_ohne_keyword' // Beschreibung vorhanden, aber kein Keyword drin
  | 'wirkung_schwach' // boardWirkung === 'schwach' (Gate liegt außerhalb)
  | 'name_zu_lang' // Board-Name > 50 Zeichen

export type BoardHebel = {
  typ: BoardHebelTyp
  boardId: string
  boardName: string
  dringlichkeit: number // festes Gewicht je Typ, höher = dringender
}

// Feste Dringlichkeits-Gewichte (freigegeben; höher = weiter oben).
export const BOARD_HEBEL_DRINGLICHKEIT: Record<BoardHebelTyp, number> = {
  eingeschlafen: 100,
  beschreibung_fehlt: 90,
  name_ohne_keyword: 80,
  beschreibung_zu_duenn: 60,
  beschreibung_ohne_keyword: 55,
  wirkung_schwach: 50,
  name_zu_lang: 30,
}

// Schwellen für die Namens-/Beschreibungs-Bewertung (Pinterest-Limits/Praxis).
export const BOARD_NAME_MAX_LAENGE = 50
export const BOARD_BESCHREIBUNG_MIN_LAENGE = 200

// Berechnet alle zutreffenden Hebel für EIN Board. Reine Logik — Gate-
// Entscheidung (Wirkung nur bei genug Daten) und „hatteFruehereReichweite"
// werden vom Aufrufer bestimmt und hier nur durchgereicht.
export function boardHebelFuerBoard(args: {
  boardId: string
  name: string
  beschreibung: string | null
  keywords: ReadonlyArray<{ id: string; keyword: string }>
  aktivitaet: BoardStatus
  hatteFruehereReichweite: boolean
  wirkung: BoardWirkung
}): BoardHebel[] {
  const typen: BoardHebelTyp[] = []
  const beschreibungLeer =
    !args.beschreibung || args.beschreibung.trim() === ''
  // Keyword-Hebel nur, wenn der Nutzer überhaupt Keywords gepflegt hat —
  // sonst kein Fehlalarm „kein Keyword im Namen".
  const hatKeywords = args.keywords.length > 0

  // Aktivität / Wirkung
  if (args.aktivitaet === 'inaktiv' && args.hatteFruehereReichweite) {
    typen.push('eingeschlafen')
  }
  if (args.wirkung === 'schwach') typen.push('wirkung_schwach')

  // Name
  if (args.name.length > BOARD_NAME_MAX_LAENGE) typen.push('name_zu_lang')
  if (hatKeywords && matchingKeywords(args.name, args.keywords).length === 0) {
    typen.push('name_ohne_keyword')
  }

  // Beschreibung
  if (beschreibungLeer) {
    typen.push('beschreibung_fehlt')
  } else {
    if (args.beschreibung!.trim().length < BOARD_BESCHREIBUNG_MIN_LAENGE) {
      typen.push('beschreibung_zu_duenn')
    }
    if (
      hatKeywords &&
      matchingKeywords(args.beschreibung, args.keywords).length === 0
    ) {
      typen.push('beschreibung_ohne_keyword')
    }
  }

  return typen.map((typ) => ({
    typ,
    boardId: args.boardId,
    boardName: args.name,
    dringlichkeit: BOARD_HEBEL_DRINGLICHKEIT[typ],
  }))
}

// ===========================================================
// Board-Coaching: Account-weite Hinweise (nicht pro Board)
// ===========================================================

// Grenzen für die Board-Anzahl. Untergrenze 5 / Obergrenze 20 — deckt sich mit
// der Strategie-Empfehlung „nicht mehr als 15–20 Boards" und der FAQ-Untergrenze
// „5–15 fokussierte Boards".
export const BOARD_ANZAHL_MIN = 5
export const BOARD_ANZAHL_MAX = 20

export function boardAccountHinweise(args: {
  boardsTotal: number
  impressionenProBoard: ReadonlyArray<number>
}): {
  zuVieleBoards: boolean
  zuWenigeBoards: boolean
  staerkstesBoardAnteil: number
} {
  const summe = args.impressionenProBoard.reduce(
    (s, x) => s + Math.max(0, x),
    0
  )
  const max =
    args.impressionenProBoard.length > 0
      ? Math.max(...args.impressionenProBoard)
      : 0
  return {
    zuVieleBoards: args.boardsTotal > BOARD_ANZAHL_MAX,
    zuWenigeBoards: args.boardsTotal < BOARD_ANZAHL_MIN,
    // Anteil des stärksten Boards an den Gesamt-Impressionen (0..1), NaN-frei.
    staerkstesBoardAnteil: summe > 0 ? max / summe : 0,
  }
}
