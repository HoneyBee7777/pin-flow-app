// Vereinheitlichte Pin-Diagnose über kumulierte Werte aller Perioden eines
// Pins. Wird sowohl auf dem Dashboard (Handlungsbedarf) als auch im
// Analytics-Pins-Tab benutzt — eine einzige Wahrheitsquelle.

// Schwellwerte werden über `thresholdsFromSettings(settings)` aus den
// Einstellungen geladen — Dashboard und Analytics-Tab nutzen denselben Aufruf.
import type { PinAnalyticsThresholds } from './utils'

export const PIN_DIAGNOSE_KEYS = [
  'kein_datum',
  'noch_zu_frueh',
  'aktiver_top_performer',
  'eingeschlafener_gewinner',
  'hidden_gem',
  'optimierungspotenzial',
  'stiller_pin',
] as const

export type PinDiagnose = (typeof PIN_DIAGNOSE_KEYS)[number]

type DiagnoseMeta = {
  label: string
  handlungText: string
  emoji: string
  badge: string
}

export const PIN_DIAGNOSE_META: Record<PinDiagnose, DiagnoseMeta> = {
  kein_datum: {
    label: 'Kein Datum',
    handlungText:
      'Veröffentlichungsdatum fehlt — bitte in der Pin-Datenbank ergänzen',
    emoji: '⚠️',
    badge: 'bg-red-100 text-red-700',
  },
  noch_zu_frueh: {
    label: 'Noch zu früh',
    handlungText: 'Abwarten und beobachten',
    emoji: '⏳',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  aktiver_top_performer: {
    label: 'Aktiver Top Performer',
    handlungText: 'Variante produzieren',
    emoji: '⭐',
    badge: 'bg-green-100 text-green-700',
  },
  eingeschlafener_gewinner: {
    label: 'Eingeschlafener Gewinner',
    handlungText: 'Neu aufsetzen',
    emoji: '♻️',
    badge: 'bg-amber-100 text-amber-800',
  },
  hidden_gem: {
    label: 'Hidden Gem',
    handlungText: 'SEO pushen',
    emoji: '💎',
    badge: 'bg-purple-100 text-purple-700',
  },
  optimierungspotenzial: {
    label: 'Optimierungspotenzial',
    handlungText: 'Hook optimieren',
    emoji: '🔧',
    badge: 'bg-orange-100 text-orange-800',
  },
  stiller_pin: {
    label: 'Stiller Pin',
    handlungText: 'Kein Handlungsbedarf',
    emoji: '💤',
    badge: 'bg-gray-100 text-gray-700',
  },
}

export type DiagnoseInput = {
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  perioden: number
  // Tage seit Veröffentlichung; null wenn kein Datum gesetzt (dann greift
  // sofort die kein_datum-Regel).
  pinAlter: number | null
  hatDatum: boolean
  // Schwellwerte aus den Einstellungen (thresholdsFromSettings). Dashboard
  // und Analytics-Tab müssen dieselbe Quelle benutzen.
  thresholds: PinAnalyticsThresholds
}

export type DiagnoseResult = {
  diagnose: PinDiagnose
  label: string
  handlung: string
  emoji: string
  badge: string
}

function asResult(diagnose: PinDiagnose): DiagnoseResult {
  const meta = PIN_DIAGNOSE_META[diagnose]
  return {
    diagnose,
    label: meta.label,
    handlung: meta.handlungText,
    emoji: meta.emoji,
    badge: meta.badge,
  }
}

export function diagnosePinAggregated(input: DiagnoseInput): DiagnoseResult {
  const {
    cumKlicks,
    cumImpressionen,
    perioden: _perioden,
    pinAlter,
    hatDatum,
    thresholds: t,
  } = input

  // 1) Kein Datum → Fehler-Diagnose mit Bearbeiten-Aufforderung.
  if (!hatDatum) return asResult('kein_datum')

  // hatDatum=true ⇒ pinAlter ist gesetzt; defensive Default für Compiler.
  const alter = pinAlter ?? 0
  const avgCtr =
    cumImpressionen > 0 ? (cumKlicks / cumImpressionen) * 100 : 0

  // Klare Signale werden ZUERST geprüft — sie überschreiben „Noch zu früh".
  // Ein junger Pin mit 21 Klicks und 10 % CTR ist eindeutig Top Performer,
  // auch wenn er noch unter dem Beobachtungszeitraum liegt.

  // 2) Aktiver Top Performer
  if (
    cumKlicks >= t.mindestKlicks &&
    avgCtr >= t.mindestCtr &&
    alter < t.mindestAlter
  )
    return asResult('aktiver_top_performer')

  // 3) Eingeschlafener Gewinner
  if (cumKlicks >= t.mindestKlicks && alter >= t.mindestAlter)
    return asResult('eingeschlafener_gewinner')

  // 4) Hidden Gem
  if (avgCtr >= t.mindestCtr && cumImpressionen < t.mindestImpressionen)
    return asResult('hidden_gem')

  // 5) Optimierungspotenzial
  if (cumImpressionen >= t.mindestImpressionen && avgCtr < t.mindestCtr)
    return asResult('optimierungspotenzial')

  // 6) Noch zu früh — Fallback nur wenn keines der klaren Signale zutrifft.
  if (alter < t.beobachtungszeitraum) return asResult('noch_zu_frueh')

  // 7) else — Alter ≥ Beobachtungszeitraum, aber kein klares Signal.
  return asResult('stiller_pin')
}

// Helfer: kumulierte Werte aus einer Pin-Periode-Liste zusammenrechnen.
export function aggregatePinPeriods(
  periods: ReadonlyArray<{
    klicks: number
    impressionen: number
    saves: number
  }>
): {
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  perioden: number
  avgCtr: number
} {
  let cumKlicks = 0
  let cumImpressionen = 0
  let cumSaves = 0
  for (const p of periods) {
    cumKlicks += p.klicks
    cumImpressionen += p.impressionen
    cumSaves += p.saves
  }
  const avgCtr =
    cumImpressionen > 0 ? (cumKlicks / cumImpressionen) * 100 : 0
  return {
    cumKlicks,
    cumImpressionen,
    cumSaves,
    perioden: periods.length,
    avgCtr,
  }
}

// Pin-Alter formatiert: immer in Tagen. Null wenn kein Datum.
export function formatPinAge(alterTage: number | null): string {
  if (alterTage === null) return '—'
  return `${alterTage} ${alterTage === 1 ? 'Tag' : 'Tage'}`
}
