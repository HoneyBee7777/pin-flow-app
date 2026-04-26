export type ProfilAnalytics = {
  id: string
  datum: string
  impressionen: number
  ausgehende_klicks: number
  saves: number
  gesamte_zielgruppe: number
  interagierende_zielgruppe: number
  created_at: string
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
}

export type PinAnalyticsEntry = {
  id: string
  pin_id: string
  datum: string
  impressionen: number
  klicks: number
  saves: number
  created_at: string
}

export const PIN_DIAGNOSEN = [
  'evergreen',
  'aktiver_top_performer',
  'eingeschlafener_gewinner',
  'hidden_gem',
  'hohe_impressionen_niedrige_ctr',
  'noch_zu_frueh',
  'kein_signal_thema_pruefen',
  'beobachten',
  'kein_signal_default',
] as const
export type PinDiagnose = (typeof PIN_DIAGNOSEN)[number]

export const PIN_DIAGNOSE_LABEL: Record<PinDiagnose, string> = {
  evergreen: 'Evergreen',
  aktiver_top_performer: 'Aktiver Top Performer',
  eingeschlafener_gewinner: 'Eingeschlafener Gewinner',
  hidden_gem: 'Hidden Gem',
  hohe_impressionen_niedrige_ctr: 'Optimierungspotenzial',
  noch_zu_frueh: 'Noch zu früh',
  kein_signal_thema_pruefen: 'Kein Signal',
  beobachten: 'Beobachten',
  kein_signal_default: 'Kein relevantes Signal',
}

export const PIN_DIAGNOSE_BADGE: Record<PinDiagnose, string> = {
  evergreen: 'bg-teal-100 text-teal-700',
  aktiver_top_performer: 'bg-green-100 text-green-700',
  eingeschlafener_gewinner: 'bg-amber-100 text-amber-800',
  hidden_gem: 'bg-purple-100 text-purple-700',
  hohe_impressionen_niedrige_ctr: 'bg-orange-100 text-orange-800',
  noch_zu_frueh: 'bg-blue-100 text-blue-700',
  kein_signal_thema_pruefen: 'bg-gray-100 text-gray-700',
  beobachten: 'bg-cyan-100 text-cyan-700',
  kein_signal_default: 'bg-gray-100 text-gray-700',
}

export const PIN_HANDLUNG: Record<PinDiagnose, string> = {
  evergreen: '🌿 Zeitlos — keine Aktion nötig',
  aktiver_top_performer: '🚀 Variante produzieren',
  eingeschlafener_gewinner: '♻️ Neu aufsetzen',
  hidden_gem: '🔎 SEO pushen',
  hohe_impressionen_niedrige_ctr: '🎨 Hook optimieren',
  noch_zu_frueh: '⏸ Abwarten',
  kein_signal_thema_pruefen: '💤 Thema prüfen',
  beobachten: '⭐ Noch abwarten',
  kein_signal_default: '❌ Kein Recycling',
}

// Schwellwerte — Defaults; tatsächliche Werte kommen aus den Einstellungen
export type PinAnalyticsThresholds = {
  beobachtungszeitraum: number
  mindestKlicks: number
  mindestAlter: number
  mindestCtr: number
  mindestImpressionen: number
}

export const PIN_ANALYTICS_THRESHOLDS: PinAnalyticsThresholds = {
  beobachtungszeitraum: 60,
  mindestKlicks: 15,
  mindestAlter: 70,
  mindestCtr: 1.5,
  mindestImpressionen: 1000,
}

export type EinstellungenSchwellwerte = {
  schwellwert_beobachtung: number | null
  schwellwert_min_klicks: number | null
  schwellwert_alter_recycling: number | null
  schwellwert_ctr: number | string | null
  schwellwert_impressionen: number | null
}

export function thresholdsFromSettings(
  settings: Partial<EinstellungenSchwellwerte> | null | undefined
): PinAnalyticsThresholds {
  const ctrRaw = settings?.schwellwert_ctr
  const ctrNum =
    ctrRaw === null || ctrRaw === undefined
      ? PIN_ANALYTICS_THRESHOLDS.mindestCtr
      : Number(ctrRaw)
  return {
    beobachtungszeitraum:
      settings?.schwellwert_beobachtung ??
      PIN_ANALYTICS_THRESHOLDS.beobachtungszeitraum,
    mindestKlicks:
      settings?.schwellwert_min_klicks ??
      PIN_ANALYTICS_THRESHOLDS.mindestKlicks,
    mindestAlter:
      settings?.schwellwert_alter_recycling ??
      PIN_ANALYTICS_THRESHOLDS.mindestAlter,
    mindestCtr: Number.isFinite(ctrNum)
      ? ctrNum
      : PIN_ANALYTICS_THRESHOLDS.mindestCtr,
    mindestImpressionen:
      settings?.schwellwert_impressionen ??
      PIN_ANALYTICS_THRESHOLDS.mindestImpressionen,
  }
}

export function diagnosePin(args: {
  alterTage: number
  klicks: number
  impressionen: number
  ctr: number | null
  hatDatum: boolean
  thresholds?: PinAnalyticsThresholds
}): PinDiagnose {
  const t = args.thresholds ?? PIN_ANALYTICS_THRESHOLDS
  const { alterTage, klicks, impressionen, hatDatum } = args
  const ctrValue = args.ctr ?? 0

  if (!hatDatum) return 'evergreen'

  if (klicks >= t.mindestKlicks && alterTage < t.mindestAlter)
    return 'aktiver_top_performer'

  if (klicks >= t.mindestKlicks && alterTage >= t.mindestAlter)
    return 'eingeschlafener_gewinner'

  if (ctrValue >= t.mindestCtr && impressionen < t.mindestImpressionen)
    return 'hidden_gem'

  if (impressionen >= t.mindestImpressionen && ctrValue < t.mindestCtr)
    return 'hohe_impressionen_niedrige_ctr'

  if (alterTage < t.beobachtungszeitraum) return 'noch_zu_frueh'

  if (alterTage >= t.beobachtungszeitraum && klicks === 0 && impressionen < 50)
    return 'kein_signal_thema_pruefen'

  if (klicks > 0 && ctrValue > 0) return 'beobachten'

  return 'kein_signal_default'
}

export type PinAnalyticsRow = PinAnalyticsEntry & {
  pin: PinOption | null
  ctr: number | null
  alter_tage: number
  diagnose: PinDiagnose
  handlung: string
}
