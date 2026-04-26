export type SaisonTyp =
  | 'feiertag'
  | 'jahreszeit'
  | 'shopping_event'
  | 'evergreen'

export type SaisonEvent = {
  id: string
  event_name: string
  event_datum: string | null
  saison_typ: SaisonTyp
  suchbeginn_tage: number | null
  notizen: string | null
  datum_variabel: boolean
  created_at: string
}

export type EventStatus =
  | 'abgeschlossen'
  | 'hochphase'
  | 'jetzt_pinnen'
  | 'jetzt_produzieren'
  | 'noch_zeit'
  | 'evergreen'

export type StatusInfo = {
  status: EventStatus
  label: string
  emoji: string
  badge: string
  countdown: string | null
  pinStart: string | null
  pinEnd: string | null
  prodStart: string | null
  pinFenster: string | null
}

export type EventWithStatus = SaisonEvent & { statusInfo: StatusInfo }

export const SAISON_TYP_LABEL: Record<SaisonTyp, string> = {
  feiertag: 'Feiertag',
  jahreszeit: 'Jahreszeit',
  shopping_event: 'Shopping-Event',
  evergreen: 'Evergreen',
}

export const SAISON_TYP_BADGE: Record<SaisonTyp, string> = {
  feiertag: 'bg-red-100 text-red-700',
  jahreszeit: 'bg-blue-100 text-blue-700',
  shopping_event: 'bg-purple-100 text-purple-700',
  evergreen: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABEL: Record<EventStatus, string> = {
  abgeschlossen: 'Abgeschlossen',
  hochphase: 'Hochphase — nicht mehr pinnen!',
  jetzt_pinnen: 'Jetzt pinnen',
  jetzt_produzieren: 'Jetzt produzieren',
  noch_zeit: 'Noch Zeit',
  evergreen: 'Evergreen',
}

const STATUS_EMOJI: Record<EventStatus, string> = {
  abgeschlossen: '✅',
  hochphase: '🚀',
  jetzt_pinnen: '📌',
  jetzt_produzieren: '🎬',
  noch_zeit: '⏳',
  evergreen: '🌿',
}

const STATUS_BADGE: Record<EventStatus, string> = {
  abgeschlossen: 'bg-gray-100 text-gray-700',
  hochphase: 'bg-red-100 text-red-700',
  jetzt_pinnen: 'bg-green-100 text-green-700',
  jetzt_produzieren: 'bg-amber-100 text-amber-800',
  noch_zeit: 'bg-blue-100 text-blue-700',
  evergreen: 'bg-emerald-100 text-emerald-700',
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function shiftDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
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

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

function tageText(n: number): string {
  return n === 1 ? '1 Tag' : `${n} Tage`
}

export function computeStatus(
  eventDatum: string | null,
  saisonTyp: SaisonTyp,
  suchbeginnTage: number | null,
  today: string
): StatusInfo {
  if (saisonTyp === 'evergreen' || !eventDatum) {
    return {
      status: 'evergreen',
      label: STATUS_LABEL.evergreen,
      emoji: STATUS_EMOJI.evergreen,
      badge: STATUS_BADGE.evergreen,
      countdown: null,
      pinStart: null,
      pinEnd: null,
      prodStart: null,
      pinFenster: null,
    }
  }

  const tage = suchbeginnTage ?? 60
  const pinEnd = shiftDays(eventDatum, -tage)
  const pinStart = shiftDays(pinEnd, -60)
  const prodStart = shiftDays(pinStart, -31)
  const pinFenster = `${formatDateShort(pinStart)} - ${formatDateShort(pinEnd)}`

  let status: EventStatus
  let countdown: string

  if (today >= eventDatum) {
    status = 'abgeschlossen'
    const days = diffDays(eventDatum, today)
    countdown = days === 0 ? 'heute' : `vor ${tageText(days)}`
  } else if (today >= pinEnd) {
    status = 'hochphase'
    countdown = `noch ${tageText(diffDays(today, eventDatum))} bis Event`
  } else if (today >= pinStart) {
    status = 'jetzt_pinnen'
    countdown = `noch ${tageText(diffDays(today, pinEnd))} bis Pin-Ende`
  } else if (today >= prodStart) {
    status = 'jetzt_produzieren'
    countdown = `noch ${tageText(diffDays(today, pinStart))} bis Pin-Start`
  } else {
    status = 'noch_zeit'
    countdown = `noch ${tageText(diffDays(today, prodStart))} bis Produktions-Start`
  }

  return {
    status,
    label: STATUS_LABEL[status],
    emoji: STATUS_EMOJI[status],
    badge: STATUS_BADGE[status],
    countdown,
    pinStart,
    pinEnd,
    prodStart,
    pinFenster,
  }
}
