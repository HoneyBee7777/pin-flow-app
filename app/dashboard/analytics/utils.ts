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
