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
            ` Top-${input.schlafendeTopCount === 1 ? 'Board' : 'Boards'} ohne neue Pins – größtes ungenutztes Potenzial.`
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
        icon: c.area === 'format' ? '🖼️' : '🎯',
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
        sectionLabel: 'Bestehende Pins optimieren',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'hoch',
      })
    } else if (input.optimierungCount > 0) {
      items.push({
        icon: '🔧',
        parts: [
          bold(String(input.optimierungCount)),
          txt(
            ` ${input.optimierungCount === 1 ? 'Pin' : 'Pins'} mit Optimierungspotenzial – Hooks und Designs überarbeiten.`
          ),
        ],
        sectionLabel: 'Bestehende Pins optimieren',
        sectionId: BRIEFING_ANCHORS.pinHandlung,
        prio: 'hoch',
      })
    } else if (input.aktivTopPerformerCount > 0) {
      items.push({
        icon: '⭐',
        parts: [
          bold(String(input.aktivTopPerformerCount)),
          txt(
            ` ${input.aktivTopPerformerCount === 1 ? 'Pin läuft' : 'Pins laufen'} aktiv – Varianten produzieren, solange der Algorithmus pusht.`
          ),
        ],
        sectionLabel: 'Bestehende Pins optimieren',
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
        sectionLabel: 'Bestehende Pins optimieren',
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
      sectionLabel: 'Neue Pins produzieren',
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
      sectionLabel: 'Neue Pins produzieren',
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
      sectionLabel: 'Neue Pins produzieren',
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

// =====================================================
// "Deine nächsten Schritte" — regelbasierte Handlungsempfehlung
// (max. 3 Punkte, priorisiert: zeitkritisch → größter Hebel → Boards)
// Liefert immer mindestens ein Item zurück (Empty-State = ✅-Hinweis).
// =====================================================
const NEXT_STEPS_MAX = 3
const NEXT_STEPS_EVENT_DAYS = 14

export type BuildNextStepsInput = {
  // Nächstes zeitkritisches Event (kleinste daysToStart unter den
  // „jetzt produzieren"-Events). null = keines aktiv.
  nextEvent: { name: string; daysToStart: number } | null
  // Top-Performer-Pin mit den meisten verbleibenden Push-Tagen.
  // null = kein aktiver Top-Performer.
  topPerformerPin: { titel: string; remainingPushDays: number } | null
  // Anzahl Hidden Gems im Pin-Handlungsbedarf.
  hiddenGemCount: number
  // Erstes Top-Board ohne neue Pins. null = keins.
  schlafendeTopBoardName: string | null
}

export function buildNextStepsItems(
  input: BuildNextStepsInput
): BriefingItem[] {
  const items: BriefingItem[] = []

  // Schritt 1 — Zeitkritisches zuerst (Event in <14 Tagen)
  if (
    input.nextEvent &&
    input.nextEvent.daysToStart < NEXT_STEPS_EVENT_DAYS
  ) {
    const days = Math.max(0, input.nextEvent.daysToStart)
    items.push({
      icon: '🗓️',
      parts: [
        bold(input.nextEvent.name),
        txt(' in '),
        bold(`${days} ${days === 1 ? 'Tag' : 'Tagen'}`),
        txt(' – Pins jetzt erstellen, das Pin-Fenster schließt sich.'),
      ],
      sectionLabel: 'Saisonkalender',
      sectionId: BRIEFING_ANCHORS.saison,
      prio: 'sehr_hoch',
    })
  }

  // Schritt 2 — Größter Hebel aus Analytics
  if (items.length < NEXT_STEPS_MAX && input.topPerformerPin) {
    const titel = input.topPerformerPin.titel.trim() || '(ohne Titel)'
    items.push({
      icon: '⭐',
      parts: [
        bold(titel),
        txt(
          ' läuft stark – Variante produzieren solange der Algorithmus pusht ('
        ),
        bold(
          `${input.topPerformerPin.remainingPushDays} ${input.topPerformerPin.remainingPushDays === 1 ? 'Tag' : 'Tage'}`
        ),
        txt(').'),
      ],
      sectionLabel: 'Bestehende Pins optimieren',
      sectionId: BRIEFING_ANCHORS.pinHandlung,
      prio: 'hoch',
    })
  } else if (items.length < NEXT_STEPS_MAX && input.hiddenGemCount > 0) {
    items.push({
      icon: '💎',
      parts: [
        bold(String(input.hiddenGemCount)),
        txt(
          ` ${input.hiddenGemCount === 1 ? 'Hidden Gem wartet' : 'Hidden Gems warten'} auf Keywords – kleine Änderung, große Wirkung.`
        ),
      ],
      sectionLabel: 'Bestehende Pins optimieren',
      sectionId: BRIEFING_ANCHORS.pinHandlung,
      prio: 'hoch',
    })
  }

  // Schritt 3 — Boards reaktivieren
  if (
    items.length < NEXT_STEPS_MAX &&
    input.schlafendeTopBoardName
  ) {
    items.push({
      icon: '🏆',
      parts: [
        bold(input.schlafendeTopBoardName),
        txt(
          ' ist ein Top-Board ohne neue Pins – 2-3 neue Pins reaktivieren es sofort.'
        ),
      ],
      sectionLabel: 'Board-Gesundheit',
      sectionId: BRIEFING_ANCHORS.board,
      prio: 'hoch',
    })
  }

  // Empty-State: alles im grünen Bereich
  if (items.length === 0) {
    items.push({
      icon: '✅',
      parts: [
        txt(
          'Alles im grünen Bereich – halte die Frequenz und prüfe beim nächsten Analytics-Update.'
        ),
      ],
      sectionLabel: '',
      sectionId: '',
      prio: 'niedrig',
    })
  }

  return items
}
