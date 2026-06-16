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

// Empfohlener nächster Eingabe-Zeitraum als Monatsscheibe.
//   von = Tag nach dem letzten erfassten Ende (oder letzter abgeschlossener
//         Monat beim allerersten Update).
//   bis = Monatsende von "von", aber höchstens gestern (laufender Monat → gestern).
// Gibt {von:null, bis:null} wenn der Nutzer auf dem aktuellen Stand ist
// (von läge nach gestern → kein offener Zeitraum mehr, Edge-Case c).
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
  const bis = monatsEnde <= yesterday ? monatsEnde : yesterday
  return { von, bis }
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

export type UpdateStatus = {
  lastUpdate: string | null
  nextDue: string | null
  isOverdue: boolean
  daysSinceUpdate: number | null
}

export function calcUpdateStatus(lastUpdate: string | null): UpdateStatus {
  if (!lastUpdate) {
    return {
      lastUpdate: null,
      nextDue: null,
      isOverdue: true,
      daysSinceUpdate: null,
    }
  }
  const today = todayIso()
  const nextDue = addDays(lastUpdate, 30)
  return {
    lastUpdate,
    nextDue,
    isOverdue: today > nextDue,
    daysSinceUpdate: diffDays(lastUpdate, today),
  }
}

// =====================================================
// Tri-State Update-Status (Dashboard Hero)
// Drei Zonen mit konfigurierbaren Schwellwerten aus den Einstellungen.
// =====================================================
export type UpdateStatusState = 'gruen' | 'gelb' | 'rot' | 'leer'

export type UpdateStatusTri = {
  state: UpdateStatusState
  lastUpdate: string | null
  nextDue: string | null
  daysSinceUpdate: number | null
  // Positiv = Update ist in X Tagen fällig; negativ = Update ist seit X Tagen überfällig.
  daysUntilDue: number | null
  intervall: number
  vorwarnung: number
}

export const STATUS_DEFAULT_INTERVALL = 31
export const STATUS_DEFAULT_VORWARNUNG = 7

export function calcUpdateStatusTri(
  lastUpdate: string | null,
  intervall: number = STATUS_DEFAULT_INTERVALL,
  vorwarnung: number = STATUS_DEFAULT_VORWARNUNG
): UpdateStatusTri {
  const safeIntervall = Number.isFinite(intervall) && intervall > 0
    ? intervall
    : STATUS_DEFAULT_INTERVALL
  const safeVorwarnung =
    Number.isFinite(vorwarnung) && vorwarnung >= 0 && vorwarnung < safeIntervall
      ? vorwarnung
      : STATUS_DEFAULT_VORWARNUNG

  if (!lastUpdate) {
    return {
      state: 'leer',
      lastUpdate: null,
      nextDue: null,
      daysSinceUpdate: null,
      daysUntilDue: null,
      intervall: safeIntervall,
      vorwarnung: safeVorwarnung,
    }
  }

  const today = todayIso()
  const nextDue = addDays(lastUpdate, safeIntervall)
  const daysSinceUpdate = diffDays(lastUpdate, today)
  const daysUntilDue = diffDays(today, nextDue)

  // Reihenfolge wichtig: rot vor gelb vor grün.
  let state: UpdateStatusState
  if (daysSinceUpdate >= safeIntervall) {
    state = 'rot'
  } else if (daysUntilDue <= safeVorwarnung) {
    state = 'gelb'
  } else {
    state = 'gruen'
  }

  return {
    state,
    lastUpdate,
    nextDue,
    daysSinceUpdate,
    daysUntilDue,
    intervall: safeIntervall,
    vorwarnung: safeVorwarnung,
  }
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
  beobachtungszeitraum: 65,
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

function numOrFallbackCtr(
  raw: number | string | null | undefined,
  fallback: number
): number {
  if (raw === null || raw === undefined) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function thresholdsFromSettings(
  settings: Partial<EinstellungenSchwellwerte> | null | undefined,
  benchmark: UserPinBenchmark | null = null
): PinAnalyticsThresholds {
  const D = PIN_ANALYTICS_THRESHOLD_DEFAULTS
  return {
    beobachtungszeitraum:
      settings?.schwellwert_beobachtung ?? D.beobachtungszeitraum,
    minImpCtrUrteil:
      settings?.schwellwert_min_imp_ctr_urteil ?? D.minImpCtrUrteil,
    minImpReichweiteStark:
      settings?.schwellwert_min_imp_reichweite_stark ??
      D.minImpReichweiteStark,
    minKlicksTopPerformer:
      settings?.schwellwert_min_klicks ?? D.minKlicksTopPerformer,
    minKlicksNutzerSignal:
      settings?.schwellwert_min_klicks_nutzer_signal ??
      D.minKlicksNutzerSignal,
    topPerformerMaxAlter:
      settings?.schwellwert_top_performer_max_alter ??
      D.topPerformerMaxAlter,
    schlafenderGewinnerAlter:
      settings?.schwellwert_schlafender_gewinner_alter ??
      D.schlafenderGewinnerAlter,
    ctrBoostFaktor: numOrFallbackCtr(
      settings?.schwellwert_ctr_boost_faktor,
      D.ctrBoostFaktor
    ),
    fallbackMindestCtr: numOrFallbackCtr(
      settings?.schwellwert_ctr,
      D.fallbackMindestCtr
    ),
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
  aktiv: 'bg-green-100 text-green-700',
  wenig_aktiv: 'bg-amber-100 text-amber-800',
  inaktiv: 'bg-red-100 text-red-700',
}

export const BOARD_SCORE = ['top', 'wachstum', 'solide', 'schwach'] as const
export type BoardScore = (typeof BOARD_SCORE)[number]

export const BOARD_SCORE_LABEL: Record<BoardScore, string> = {
  top: '🏆 Top Board',
  wachstum: '📈 Wachstum',
  solide: '👀 Solide',
  schwach: '💤 Schwach',
}

export const BOARD_SCORE_BADGE: Record<BoardScore, string> = {
  top: 'bg-emerald-100 text-emerald-700',
  wachstum: 'bg-blue-100 text-blue-700',
  solide: 'bg-slate-100 text-slate-700',
  schwach: 'bg-gray-100 text-gray-700',
}

export type BoardThresholds = {
  // Status-Schwellwerte (basierend auf letztem Pin-Datum)
  wenigAktiv: number
  inaktiv: number
  // Hybrid-Score-Schwellwerte
  topEr: number          // ER ab dem ein Board "Top" sein darf (z.B. 3.0)
  topProzent: number     // oberste X % des Profils zählen als "Top" (z.B. 30)
  schwachEr: number      // ER unter dem ein Board als "Schwach" gilt (z.B. 1.5)
  wachstumTrend: number  // %-Veränderung zum Vormonat für Wachstum/Trend-Schwach (z.B. 20)
}

export const BOARD_THRESHOLDS: BoardThresholds = {
  // Aktiv = letzter Pin <14 Tage; Wenig aktiv = 15–30; Inaktiv = >30.
  wenigAktiv: 14,
  inaktiv: 30,
  topEr: 3.0,
  topProzent: 30.0,
  schwachEr: 1.5,
  wachstumTrend: 20.0,
}

export type EinstellungenSchwellwerteBoard = {
  schwellwert_board_wenig_aktiv: number | null
  schwellwert_board_inaktiv: number | null
  schwellwert_board_top_er: number | string | null
  schwellwert_board_top_prozent: number | string | null
  schwellwert_board_schwach_er: number | string | null
  schwellwert_board_wachstum_trend: number | string | null
}

function numOrFallback(
  raw: number | string | null | undefined,
  fallback: number
): number {
  if (raw === null || raw === undefined) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function boardThresholdsFromSettings(
  settings: Partial<EinstellungenSchwellwerteBoard> | null | undefined
): BoardThresholds {
  return {
    wenigAktiv:
      settings?.schwellwert_board_wenig_aktiv ?? BOARD_THRESHOLDS.wenigAktiv,
    inaktiv: settings?.schwellwert_board_inaktiv ?? BOARD_THRESHOLDS.inaktiv,
    topEr: numOrFallback(
      settings?.schwellwert_board_top_er,
      BOARD_THRESHOLDS.topEr
    ),
    topProzent: numOrFallback(
      settings?.schwellwert_board_top_prozent,
      BOARD_THRESHOLDS.topProzent
    ),
    schwachEr: numOrFallback(
      settings?.schwellwert_board_schwach_er,
      BOARD_THRESHOLDS.schwachEr
    ),
    wachstumTrend: numOrFallback(
      settings?.schwellwert_board_wachstum_trend,
      BOARD_THRESHOLDS.wachstumTrend
    ),
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

export function calcBoardEngagementRate(
  interaktionen: number,
  impressionen: number
): number | null {
  if (impressionen <= 0) return null
  return (interaktionen / impressionen) * 100
}

// Cutoff-ER für die "Top X %" des Profils. Liefert die Untergrenze, ab der ein
// Board zu den oberen X % aller Boards zählt. Bei < 1 Board → null (kein Cutoff).
export function topPercentCutoff(
  allErs: number[],
  topProzent: number
): number | null {
  if (allErs.length === 0) return null
  const sorted = [...allErs].sort((a, b) => b - a) // DESC
  const cutIdx = Math.max(1, Math.ceil((sorted.length * topProzent) / 100))
  return sorted[cutIdx - 1]
}

// Hybrid-Score (Single Source of Truth für Dashboard + Analytics).
// Prüfreihenfolge — erstes Match gewinnt:
//   1. TOP      → er >= topEr UND er >= topPercentCutoff(allErs, topProzent)
//   2. WACHSTUM → trend (%) >= wachstumTrend  (nur wenn Vormonat verfügbar)
//   3. SCHWACH  → er < schwachEr ODER trend (%) <= -wachstumTrend
//   4. SOLIDE   → alles andere (Catch-All)
//
// `dataInsufficient` ist true, wenn kein Vormonat zum Trend-Vergleich
// vorhanden ist — UI kann das nutzen, um „Noch zu wenig Daten für Trend"
// als Tooltip neben dem „Solide"-Badge anzuzeigen.
export function scoreBoardHybrid(args: {
  er: number | null
  erVormonat: number | null
  topCutoffEr: number | null
  thresholds: BoardThresholds
}): { score: BoardScore; dataInsufficient: boolean; trendPct: number | null } {
  const { er, erVormonat, topCutoffEr, thresholds } = args
  const trendPct =
    er !== null && erVormonat !== null && erVormonat > 0
      ? ((er - erVormonat) / erVormonat) * 100
      : null
  const dataInsufficient = trendPct === null

  if (er === null) {
    return { score: 'schwach', dataInsufficient, trendPct }
  }

  // 1. Top
  if (
    er >= thresholds.topEr &&
    topCutoffEr !== null &&
    er >= topCutoffEr
  ) {
    return { score: 'top', dataInsufficient, trendPct }
  }

  // 2. Wachstum (nur mit Vormonat)
  if (trendPct !== null && trendPct >= thresholds.wachstumTrend) {
    return { score: 'wachstum', dataInsufficient, trendPct }
  }

  // 3. Schwach
  const schwachByEr = er < thresholds.schwachEr
  const schwachByTrend =
    trendPct !== null && trendPct <= -thresholds.wachstumTrend
  if (schwachByEr || schwachByTrend) {
    return { score: 'schwach', dataInsufficient, trendPct }
  }

  // 4. Solide (Catch-All)
  return { score: 'solide', dataInsufficient, trendPct }
}

export function boardHandlung(args: {
  score: BoardScore
  status: BoardStatus
  dataInsufficient?: boolean
}): string | null {
  if (args.score === 'top')
    return 'Skalieren — ähnliche Boards aufbauen & Keyword-Cluster erweitern'
  if (args.score === 'wachstum')
    return 'Momentum nutzen — Frequenz halten und mehr Pins zu diesem Thema produzieren'
  if (args.score === 'schwach')
    return 'Keywords in Board-Beschreibung optimieren. Board-Namen nur ändern wenn Board dauerhaft schwach bleibt.'
  if (args.score === 'solide') {
    if (args.dataInsufficient)
      return 'Noch zu wenig Daten für Trend-Berechnung — Board macht seinen Job.'
    return 'Weiter beobachten — Board macht seinen Job. Mit mehr Pins könnte es Top werden.'
  }
  return null
}

// Score-Tooltip pro Board — erklärt warum dieses Board in seinem Score landet,
// inklusive aktueller ER, Vormonats-ER, Trend, und Handlungsempfehlung.
// `short = true` lässt die Handlung weg (für Dashboard-Cards mit Action-Button).
export function boardScoreTooltip(args: {
  score: BoardScore
  er: number | null
  erVormonat: number | null
  trendPct: number | null
  dataInsufficient: boolean
  thresholds: BoardThresholds
  short?: boolean
}): string {
  const fmt = (v: number | null, digits = 1): string =>
    v === null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`
  const fmtSigned = (v: number | null): string =>
    v === null || !Number.isFinite(v)
      ? '—'
      : `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
  const er = args.er
  const erV = args.erVormonat
  const t = args.trendPct
  const th = args.thresholds

  switch (args.score) {
    case 'top': {
      const base = `Engagement Rate ${fmt(er)} — Schwellwert erreicht (≥ ${fmt(th.topEr, 1)}) UND in den oberen ${th.topProzent.toFixed(0)}% deines Profils. Dieses Board läuft im Vergleich zu deinen anderen stark.`
      if (args.short) return base
      return `${base} Handlung: Ähnliche Boards aufbauen und Keyword-Cluster erweitern.`
    }
    case 'wachstum': {
      const base = `Engagement Rate von ${fmt(erV)} auf ${fmt(er)} gestiegen (${fmtSigned(t)} zum Vormonat) — starkes Momentum-Signal.`
      if (args.short) return base
      return `${base} Handlung: Frequenz halten und mehr Pins zu diesem Thema produzieren.`
    }
    case 'solide': {
      if (args.dataInsufficient) {
        return 'Nur ein Analytics-Eintrag vorhanden — noch zu wenig Daten für Trend-Berechnung. Nächsten Monat erneut eintragen.'
      }
      const base = `Engagement Rate ${fmt(er)} — Board performt im normalen Bereich.`
      if (args.short) return base
      return `${base} Handlung: Weiter beobachten — mit mehr Pins oder optimierten Keywords könnte es Top werden.`
    }
    case 'schwach': {
      const byEr = er !== null && er < th.schwachEr
      if (byEr) {
        const base = `Engagement Rate ${fmt(er)} liegt unter dem Schwellwert (< ${fmt(th.schwachEr, 1)}).`
        if (args.short) return base
        return `${base} Handlung: Keywords in Board-Beschreibung optimieren.`
      }
      // Trend-getriebener Schwach-Fall
      const base = `Engagement Rate von ${fmt(erV)} auf ${fmt(er)} gefallen (${fmtSigned(t)} zum Vormonat).`
      if (args.short) return base
      return `${base} Handlung: Ursache prüfen — zu wenig neue Pins oder falsche Keywords?`
    }
  }
}

export type BoardAnalyticsRow = {
  board: BoardOption
  latest: BoardAnalyticsEntry
  lastPinDatum: string | null
  lastPinAlterTage: number | null
  status: BoardStatus
  score: BoardScore
  engagementRate: number | null
  engagementRateVormonat: number | null
  trendPct: number | null
  dataInsufficient: boolean
  handlung: string | null
}
