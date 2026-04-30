// Briefing-Logik für die Hero-Section "Heute aktuell".
// Reine Funktionen — kein React, kein Supabase. Wird serverseitig in
// page.tsx aufgerufen, das Ergebnis (serialisierbar) wird an die
// Client-Komponente <BriefingSection /> übergeben.

export type BriefingPrio = 'sehr_hoch' | 'hoch' | 'mittel' | 'niedrig'

export type BriefingPart = { kind: 'text' | 'bold'; value: string }

export type BriefingItem = {
  icon: string
  parts: BriefingPart[]
  sectionLabel: string
  sectionId: string // Anchor-ID der Ziel-Sektion
  prio: BriefingPrio
}

// Anchor-IDs für Smooth-Scroll. Müssen mit den id-Attributen der
// Sektionen im Dashboard übereinstimmen.
export const BRIEFING_ANCHORS = {
  saison: 'saison-kalender',
  pinHandlung: 'pin-handlungsbedarf',
  pipeline: 'content-pipeline',
  board: 'board-gesundheit',
  strategie: 'strategie-check',
} as const

const PRIO_ORDER: Record<BriefingPrio, number> = {
  sehr_hoch: 0,
  hoch: 1,
  mittel: 2,
  niedrig: 3,
}

const MAX_ITEMS = 5

// Helfer: Briefing-Item bauen mit Text-Parts (Schlüsselwerte fett)
function txt(value: string): BriefingPart {
  return { kind: 'text', value }
}
function bold(value: string): BriefingPart {
  return { kind: 'bold', value }
}

// =====================================================
// Eingabe-Schema (alle vorberechneten Werte aus dem Dashboard)
// =====================================================
export type StrategieAreaKey = 'mix' | 'ziel' | 'format'

const AREA_LABEL: Record<StrategieAreaKey, string> = {
  mix: 'Strategie-Mix',
  ziel: 'Conversion-Ziel',
  format: 'Pin-Format',
}

export type BuildBriefingInput = {
  // Saisonkalender
  saisonJetztProduzierenCount: number
  saisonMinDaysToPinStart: number | null
  saisonEventNames: string[] // Namen der „jetzt produzieren"-Events

  // Board-Gesundheit
  hasAnyBoardAnalytics: boolean
  schlafendeTopCount: number
  aktivitaetsratePct: number
  schwacheCount: number

  // Strategie-Check
  strategieOnboardingDone: boolean
  strategieSchwelleRot: number
  strategieTopCoaching:
    | {
        area: StrategieAreaKey
        label: string
        diff: number
        recommendation: string
      }
    | null

  // Pin-Handlungsbedarf
  hasAnyAnalytics: boolean
  hiddenGemCount: number
  optimierungCount: number
  aktivTopPerformerCount: number
  eingeschlafenerGewinnerCount: number

  // Content Pipeline
  inhalteOhneAktuellCount: number
  inhalteMitWenigPinsCount: number
  urlsPotenzialCount: number
}

// =====================================================
// Hauptfunktion
// =====================================================
export function buildBriefingItems(
  input: BuildBriefingInput
): BriefingItem[] {
  const items: BriefingItem[] = []

  // ---- SAISONKALENDER (Prio: sehr_hoch) ----
  if (input.saisonJetztProduzierenCount > 0) {
    const days = input.saisonMinDaysToPinStart ?? 0
    const daysLabel =
      days <= 0 ? 'jetzt' : `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
    const eventCount = input.saisonJetztProduzierenCount
    const visibleNames = input.saisonEventNames.slice(0, 2)
    const restCount = Math.max(
      0,
      input.saisonEventNames.length - visibleNames.length
    )
    let nameList = visibleNames.join(', ')
    if (restCount > 0) {
      nameList += `, +${restCount} ${restCount === 1 ? 'weiteres' : 'weitere'}`
    }
    items.push({
      icon: '🎬',
      parts: [
        bold(String(eventCount)),
        txt(
          ` ${eventCount === 1 ? 'Event braucht' : 'Events brauchen'} `
        ),
        bold(daysLabel),
        txt(' Material'),
        ...(nameList
          ? [txt(' – '), bold(nameList), txt('. Jetzt mit der Produktion starten.')]
          : [txt(' – jetzt mit der Produktion starten.')]),
      ],
      sectionLabel: 'Saisonkalender',
      sectionId: BRIEFING_ANCHORS.saison,
      prio: 'sehr_hoch',
    })
  }

  // ---- BOARD-GESUNDHEIT (Prio: sehr_hoch) ----
  // Nur erste zutreffende Aussage. Skip wenn keine Board-Analytics.
  if (input.hasAnyBoardAnalytics) {
    if (input.schlafendeTopCount > 0) {
      items.push({
        icon: '💤',
        parts: [
          bold(String(input.schlafendeTopCount)),
          txt(
            ` schlafende Top-${input.schlafendeTopCount === 1 ? 'Board' : 'Boards'} – größtes ungenutztes Potenzial.`
          ),
        ],
        sectionLabel: 'Board-Gesundheit',
        sectionId: BRIEFING_ANCHORS.board,
        prio: 'sehr_hoch',
      })
    } else if (input.aktivitaetsratePct < 40) {
      const inaktivPct = Math.round(100 - input.aktivitaetsratePct)
      items.push({
        icon: '📊',
        parts: [
          bold(`${inaktivPct}%`),
          txt(
            ' deiner Boards sind nicht aktiv – Pinning-Frequenz erhöhen.'
          ),
        ],
        sectionLabel: 'Board-Gesundheit',
        sectionId: BRIEFING_ANCHORS.board,
        prio: 'sehr_hoch',
      })
    } else if (input.schwacheCount > 1) {
      items.push({
        icon: '📉',
        parts: [
          bold(String(input.schwacheCount)),
          txt(
            ' Schwache Boards – SEO und Keywords prüfen oder archivieren.'
          ),
        ],
        sectionLabel: 'Board-Gesundheit',
        sectionId: BRIEFING_ANCHORS.board,
        prio: 'sehr_hoch',
      })
    }
  }

  // ---- STRATEGIE-CHECK (Prio: sehr_hoch) ----
  // Nur bei deutlicher Abweichung (|Diff| > schwelleRot, default 15%).
  if (input.strategieOnboardingDone && input.strategieTopCoaching) {
    const c = input.strategieTopCoaching
    if (Math.abs(c.diff) > input.strategieSchwelleRot) {
      const richtung = c.diff > 0 ? 'über Plan' : 'unter Plan'
      const sign = c.diff > 0 ? '+' : '−'
      const rounded = Math.round(Math.abs(c.diff))
      items.push({
        icon: '🎯',
        parts: [
          txt(`${AREA_LABEL[c.area]} `),
          bold(c.label),
          txt(' '),
          bold(`${sign}${rounded}%`),
          txt(` ${richtung} – ${c.recommendation}`),
        ],
        sectionLabel: 'Strategie-Check',
        sectionId: BRIEFING_ANCHORS.strategie,
        prio: 'sehr_hoch',
      })
    }
  }

  // ---- PIN-HANDLUNGSBEDARF (Prio: hoch / mittel) ----
  // Nur erste zutreffende Aussage. Skip wenn keine Analytics.
  if (input.hasAnyAnalytics) {
    if (input.hiddenGemCount > 0) {
      items.push({
        icon: '💎',
        parts: [
          bold(String(input.hiddenGemCount)),
          txt(
            ` ${input.hiddenGemCount === 1 ? 'Hidden Gem erkannt' : 'Hidden Gems erkannt'} – Pins mit hoher CTR aber wenig Reichweite. Keywords und Boards optimieren.`
          ),
        ],
        sectionLabel: 'Pin-Handlungsbedarf',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'hoch',
      })
    } else if (input.optimierungCount > 0) {
      items.push({
        icon: '🎯',
        parts: [
          bold(String(input.optimierungCount)),
          txt(
            ` ${input.optimierungCount === 1 ? 'Pin' : 'Pins'} mit Optimierungspotenzial – Hooks und Designs überarbeiten.`
          ),
        ],
        sectionLabel: 'Pin-Handlungsbedarf',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'hoch',
      })
    } else if (input.aktivTopPerformerCount > 0) {
      items.push({
        icon: '🚀',
        parts: [
          bold(String(input.aktivTopPerformerCount)),
          txt(
            ` ${input.aktivTopPerformerCount === 1 ? 'Pin läuft' : 'Pins laufen'} aktiv – Varianten produzieren, solange der Algorithmus pusht.`
          ),
        ],
        sectionLabel: 'Pin-Handlungsbedarf',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'hoch',
      })
    } else if (input.eingeschlafenerGewinnerCount > 0) {
      items.push({
        icon: '♻️',
        parts: [
          bold(String(input.eingeschlafenerGewinnerCount)),
          txt(
            ` ${input.eingeschlafenerGewinnerCount === 1 ? 'eingeschlafener Pin' : 'eingeschlafene Pins'} – Recycling-Kandidaten mit frischem Design.`
          ),
        ],
        sectionLabel: 'Pin-Handlungsbedarf',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'mittel',
      })
    }
  }

  // ---- CONTENT PIPELINE (Prio: niedrig) ----
  // Nur erste zutreffende Aussage.
  if (input.inhalteOhneAktuellCount > 0) {
    items.push({
      icon: '💤',
      parts: [
        bold(String(input.inhalteOhneAktuellCount)),
        txt(
          ` ${input.inhalteOhneAktuellCount === 1 ? 'Inhalt ohne aktuellen Pin' : 'Inhalte ohne aktuellen Pin'} – kontinuierliche Pin-Produktion fehlt.`
        ),
      ],
      sectionLabel: 'Content Pipeline',
      sectionId: BRIEFING_ANCHORS.pipeline,
      prio: 'niedrig',
    })
  } else if (input.inhalteMitWenigPinsCount > 3) {
    items.push({
      icon: '🆕',
      parts: [
        bold(String(input.inhalteMitWenigPinsCount)),
        txt(' Inhalte brauchen mehr Pin-Material.'),
      ],
      sectionLabel: 'Content Pipeline',
      sectionId: BRIEFING_ANCHORS.pipeline,
      prio: 'niedrig',
    })
  } else if (input.urlsPotenzialCount > 0) {
    items.push({
      icon: '🔗',
      parts: [
        bold(String(input.urlsPotenzialCount)),
        txt(
          ` ${input.urlsPotenzialCount === 1 ? 'URL' : 'URLs'} mit hoher CTR und wenig Pins – ungenutzte Goldnuggets.`
        ),
      ],
      sectionLabel: 'Content Pipeline',
      sectionId: BRIEFING_ANCHORS.pipeline,
      prio: 'niedrig',
    })
  }

  // ---- Sortieren: Prio (sehr_hoch → niedrig), dann alphabetisch ----
  items.sort((a, b) => {
    const p = PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio]
    if (p !== 0) return p
    return a.sectionLabel.localeCompare(b.sectionLabel)
  })

  return items.slice(0, MAX_ITEMS)
}
