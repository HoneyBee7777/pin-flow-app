// Briefing-Logik für die Dashboard-Sektion „Deine nächsten Schritte".
// Reine Funktionen — kein React, kein Supabase. Wird serverseitig in
// page.tsx aufgerufen, das Ergebnis (serialisierbar) wird an die
// Client-Komponente <BriefingSection /> übergeben.

export type BriefingPart = { kind: 'text' | 'bold'; value: string }

export type BriefingItem = {
  parts: BriefingPart[]
  sectionLabel: string
  // Anchor-ID der Ziel-Sektion für den Sprung-Button. Leer = kein
  // Sprungziel (Empty-State).
  sectionId: string
}

// Anchor-IDs für Smooth-Scroll. Müssen mit den id-Attributen der
// Sektionen im Dashboard übereinstimmen.
export const BRIEFING_ANCHORS = {
  saison: 'saison-kalender',
  pinHandlung: 'pin-handlungsbedarf',
} as const

// Helfer: Briefing-Item bauen mit Text-Parts (Schlüsselwerte fett)
function txt(value: string): BriefingPart {
  return { kind: 'text', value }
}
function bold(value: string): BriefingPart {
  return { kind: 'bold', value }
}

// =====================================================
// „Deine nächsten Schritte" — regelbasierte Handlungsempfehlung,
// priorisiert: zeitkritisch (Event) → größter Hebel (Top-Performer/
// Hidden-Gem). Liefert immer mindestens ein Item (Empty-State).
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
}

export function buildNextStepsItems(
  input: BuildNextStepsInput
): BriefingItem[] {
  const items: BriefingItem[] = []

  // Schritt 1 — Zeitkritisches zuerst (Event in < 14 Tagen)
  if (
    input.nextEvent &&
    input.nextEvent.daysToStart < NEXT_STEPS_EVENT_DAYS
  ) {
    const days = Math.max(0, input.nextEvent.daysToStart)
    items.push({
      parts: [
        bold(input.nextEvent.name),
        txt(' in '),
        bold(`${days} ${days === 1 ? 'Tag' : 'Tagen'}`),
        txt(' – Pins jetzt erstellen, das Pin-Fenster schließt sich.'),
      ],
      sectionLabel: 'Saisonkalender',
      sectionId: BRIEFING_ANCHORS.saison,
    })
  }

  // Schritt 2 — Größter Hebel aus Analytics
  if (items.length < NEXT_STEPS_MAX && input.topPerformerPin) {
    const titel = input.topPerformerPin.titel.trim() || '(ohne Titel)'
    items.push({
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
      sectionLabel: 'Pins recyceln',
      sectionId: BRIEFING_ANCHORS.pinHandlung,
    })
  } else if (items.length < NEXT_STEPS_MAX && input.hiddenGemCount > 0) {
    items.push({
      parts: [
        bold(String(input.hiddenGemCount)),
        txt(
          ` ${input.hiddenGemCount === 1 ? 'Hidden Gem wartet' : 'Hidden Gems warten'} auf Keywords – kleine Änderung, große Wirkung.`
        ),
      ],
      sectionLabel: 'Pins recyceln',
      sectionId: BRIEFING_ANCHORS.pinHandlung,
    })
  }

  // Empty-State: alles im grünen Bereich
  if (items.length === 0) {
    items.push({
      parts: [
        txt(
          'Alles im grünen Bereich – halte die Frequenz und prüfe beim nächsten Analytics-Update.'
        ),
      ],
      sectionLabel: '',
      sectionId: '',
    })
  }

  return items
}
