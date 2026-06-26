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
  // Optionale strukturierte To-do-Daten: nur bei Items, die sauber einen
  // Titel + ein Datum liefern (Saison-Event, Top-Performer). Speist den
  // „+ To-do"-Button; fehlt bei allen anderen Items. quelle/quelleId tragen die
  // Herkunft (Doppelungsschutz), bereitsGemerkt = es existiert schon eine
  // offene Aufgabe zu dieser Empfehlung.
  todo?: {
    titel: string
    faelligkeitsdatum: string | null
    quelle: string
    quelleId: string
    bereitsGemerkt: boolean
  }
}

// today + n Tage als ISO YYYY-MM-DD (UTC-stabil, keine Zeitzonen-Drift).
export function plusTageIso(todayIso: string, tage: number): string {
  const d = new Date(`${todayIso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
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
  nextEvent: { id: string; name: string; daysToStart: number } | null
  // Top-Performer-Pin mit den meisten verbleibenden Push-Tagen.
  // null = kein aktiver Top-Performer.
  topPerformerPin: {
    id: string
    titel: string
    remainingPushDays: number
  } | null
  // Anzahl Hidden Gems im Pin-Handlungsbedarf.
  hiddenGemCount: number
  // Heutiges Datum (ISO YYYY-MM-DD) als Basis für die To-do-Fälligkeit.
  todayIso: string
  // Offene Herkünfte (quelle_id offener Aufgaben) — für „Gemerkt ✓".
  offeneQuelleIds: string[]
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
      todo: {
        titel: `Pins für ${input.nextEvent.name} produzieren`,
        faelligkeitsdatum: plusTageIso(input.todayIso, days),
        quelle: 'empfehlung',
        quelleId: `saison:${input.nextEvent.id}:produzieren`,
        bereitsGemerkt: input.offeneQuelleIds.includes(
          `saison:${input.nextEvent.id}:produzieren`
        ),
      },
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
      todo: {
        titel: `Variante von „${titel}" erstellen`,
        faelligkeitsdatum: plusTageIso(
          input.todayIso,
          input.topPerformerPin.remainingPushDays
        ),
        quelle: 'empfehlung',
        quelleId: `pin:${input.topPerformerPin.id}:variante`,
        bereitsGemerkt: input.offeneQuelleIds.includes(
          `pin:${input.topPerformerPin.id}:variante`
        ),
      },
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
