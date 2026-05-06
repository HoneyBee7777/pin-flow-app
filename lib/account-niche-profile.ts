// Aggregiert Pinterest-Boards eines Accounts zu einem Nischen-Profil.
// Wird von der Benchmark-Anzeige (Phase 2) und vom Coaching-System (Phase 3)
// genutzt — beide brauchen die gleiche Sicht: welche Nische dominiert? Ist
// der Account ausreichend kategorisiert?
//
// Wichtig: Boards ohne Kategorie ODER mit unbekannter Kategorie werden bei
// der Aggregation ausgeklammert — nicht heimlich in „Sonstiges" einsortiert.
// Sonst würde Diagnose 5 (boards-nicht-kategorisiert) nie auslösen.

import {
  getNicheBenchmark,
  type NicheBenchmark,
} from './niche-benchmarks'

export type NicheBucket = {
  niche: NicheBenchmark
  boardCount: number
  pinCount: number
}

export type AccountNicheProfile = {
  // Häufigste Nische — null wenn kein Board einer bekannten Nische zugeordnet
  // ist oder der Account keine Pins hat.
  primaryNiche: NicheBenchmark | null
  // Anteil der Pins in der primären Nische am Gesamtbestand des Accounts
  // (totalPins inkl. Pins auf nicht kategorisierten Boards). 0..1, NaN-frei.
  primaryShare: number
  // Alle Nischen mit zugeordneten Pins, absteigend nach pinCount.
  niches: NicheBucket[]
  // true, wenn die primäre Nische < 60 % der Gesamt-Pins ausmacht. Bei
  // primaryNiche === null ebenfalls true (keine klare Nische erkennbar).
  isMixed: boolean
  // true, wenn weniger als 50 % aller Pins einer bekannten Nische zugeordnet
  // sind. Triggert Diagnose 5 — solange dieser Wert true ist, sind alle
  // anderen Nischen-Aussagen mit Vorsicht zu genießen.
  unzureichendKategorisiert: boolean
}

const PRIMARY_SHARE_THRESHOLD = 0.6
const KATEGORISIERUNG_THRESHOLD = 0.5

export function calculateAccountNicheProfile(
  boards: ReadonlyArray<{
    kategorie: string | null | undefined
    pinCount: number
  }>,
  totalPins: number
): AccountNicheProfile {
  // Aggregation pro Nischen-Slug. Boards ohne erkennbare Nische werden
  // bewusst übersprungen — sie zählen weder zur primären Nische noch zu
  // einer Sammel-Kategorie.
  const buckets = new Map<string, NicheBucket>()
  let kategorisiertePins = 0

  for (const board of boards) {
    const niche = getNicheBenchmark(board.kategorie)
    if (!niche) continue
    const pinCount = Math.max(0, board.pinCount ?? 0)
    const existing = buckets.get(niche.id)
    if (existing) {
      existing.boardCount += 1
      existing.pinCount += pinCount
    } else {
      buckets.set(niche.id, {
        niche,
        boardCount: 1,
        pinCount,
      })
    }
    kategorisiertePins += pinCount
  }

  const niches = Array.from(buckets.values()).sort(
    (a, b) => b.pinCount - a.pinCount
  )

  const safeTotal = Math.max(0, totalPins)
  const primaryBucket = niches[0] ?? null
  const primaryNiche = primaryBucket?.niche ?? null
  const primaryShare =
    safeTotal > 0 && primaryBucket
      ? primaryBucket.pinCount / safeTotal
      : 0

  // Account ohne Pins zählt als „gemischt" und „unzureichend kategorisiert" —
  // gibt dem Coaching-System einen klaren Onboarding-Anker.
  const isMixed = primaryShare < PRIMARY_SHARE_THRESHOLD
  const kategorisierungQuote =
    safeTotal > 0 ? kategorisiertePins / safeTotal : 0
  const unzureichendKategorisiert =
    kategorisierungQuote < KATEGORISIERUNG_THRESHOLD

  return {
    primaryNiche,
    primaryShare,
    niches,
    isMixed,
    unzureichendKategorisiert,
  }
}
