// Profil-Gesundheits-Status für die Dashboard-Sektion „Wo stehst du?".
//
// Pure Funktion — kein React, kein Supabase. Bekommt nur die aktiven
// (nicht-dismissed) Coaching-Diagnosen plus die Gesamt-Pin-Anzahl und
// leitet daraus einen 5-stufigen Status ab. Klassifikations- und
// Median-Logik wird hier NICHT angerührt.
//
// Wichtig: Die Filterung "nicht-dismissed" passiert clientseitig in der
// Komponente, weil die Dismiss-Information nur in localStorage liegt.
// Dieser Helper bekommt die bereits gefilterte Liste übergeben.

import type { CoachingDiagnosis } from './account-coaching'

export type ProfilGesundheitStatus =
  | 'schwach'
  | 'ausbaufaehig'
  | 'solide-mit-optimierung'
  | 'solide'
  | 'stark'

export type ProfilGesundheitErgebnis = {
  status: ProfilGesundheitStatus
  label: string
  beschreibung: string
}

// Untergrenze, ab der die Diagnose als verlässlich genug gilt. Darunter
// fällt alles auf 'stark' mit Disclaimer zurück, weil bei wenigen Pins
// jede Aussage statistisch wackelig ist.
export const PROFIL_GESUNDHEIT_MIN_PINS = 30

// Deutsche Zahlwörter für die Befund-Anzahl (0–12 reichen — mehr Befunde
// kann das Coaching-System realistisch nicht gleichzeitig auslösen).
const ZAHLWORT = [
  'Null',
  'Ein',
  'Zwei',
  'Drei',
  'Vier',
  'Fünf',
  'Sechs',
  'Sieben',
  'Acht',
  'Neun',
  'Zehn',
  'Elf',
  'Zwölf',
] as const

function zahlwort(n: number): string {
  return ZAHLWORT[n] ?? String(n)
}

// V3.2 Fix 3 — dynamischer Beschreibungs-Satz aus der Befund-Anzahl.
// „Befund" (Singular) / „Befunde" (Plural); verweist auf den Sektions-
// Namen „Profil-Diagnose" statt auf ein Layout-Konzept („unten").
function buildBefundBeschreibung(kritisch: number, wichtig: number): string {
  const total = kritisch + wichtig
  if (total === 0) {
    return 'Keine kritischen Befunde — alles im grünen Bereich.'
  }

  const nachsatz =
    ' Im Bereich Befunde findest du die Schritte zur Verbesserung.'

  let kern: string
  if (kritisch === 0) {
    kern =
      wichtig === 1
        ? 'Ein Befund — wichtig.'
        : wichtig === 2
          ? 'Zwei Befunde — beide wichtig.'
          : `${zahlwort(wichtig)} Befunde — alle wichtig.`
  } else if (wichtig === 0) {
    kern =
      kritisch === 1
        ? 'Ein Befund — kritisch.'
        : `${zahlwort(kritisch)} Befunde — alle kritisch.`
  } else {
    const totalWort = zahlwort(total)
    kern =
      kritisch === 1
        ? `${totalWort} Befunde — einer kritisch.`
        : `${totalWort} Befunde — ${zahlwort(kritisch).toLowerCase()} kritisch.`
  }

  return kern + nachsatz
}

export function computeProfilGesundheit(
  diagnosen: ReadonlyArray<CoachingDiagnosis>,
  totalPins: number
): ProfilGesundheitErgebnis {
  // Sonderfall: zu wenig Daten für eine belastbare Bewertung. Account
  // bekommt 'stark' mit explizitem Hinweis, dass die Bewertung erst mit
  // mehr Pins greift — vermeidet, dass ein junger Account direkt einen
  // 'schwach'-Status sieht, obwohl die Stichprobe noch zu klein ist.
  if (totalPins < PROFIL_GESUNDHEIT_MIN_PINS) {
    return {
      status: 'stark',
      label: 'Stark',
      beschreibung:
        'Aktuell wurden keine Optimierungs-Hebel erkannt. Beachte: Bei wenigen Pins ist diese Bewertung noch nicht voll aussagekräftig. Mehr Pins → präzisere Diagnose.',
    }
  }

  let kritisch = 0
  let wichtig = 0
  for (const d of diagnosen) {
    if (d.severity === 'kritisch') kritisch += 1
    else if (d.severity === 'wichtig') wichtig += 1
  }

  // Beschreibung ist ab V3.2 rein datengetrieben (Anzahl + Schweregrad
  // der Befunde) und an allen Stufen identisch aufgebaut — nur Status
  // und Label hängen von den Schwellen unten ab.
  const beschreibung = buildBefundBeschreibung(kritisch, wichtig)

  // Reihenfolge ist bewusst: kritisch schlägt wichtig schlägt rest. Ein
  // Account mit 1 kritischen + 3 wichtigen ist 'ausbaufaehig', nicht
  // 'solide-mit-optimierung'.
  if (kritisch >= 2) {
    return { status: 'schwach', label: 'Schwach', beschreibung }
  }
  if (kritisch === 1) {
    return { status: 'ausbaufaehig', label: 'Ausbaufähig', beschreibung }
  }
  if (wichtig >= 2) {
    return {
      status: 'solide-mit-optimierung',
      label: 'Solide mit Optimierungsbedarf',
      beschreibung,
    }
  }
  if (wichtig === 1) {
    return { status: 'solide', label: 'Solide', beschreibung }
  }
  return { status: 'stark', label: 'Stark', beschreibung }
}

// Visuelle Klassen für die 5-stufige Ampel. Aktive Stufe nutzt activeBg/border,
// inaktive bekommen reduzierte Opacity.
export const PROFIL_GESUNDHEIT_STUFEN: ReadonlyArray<{
  key: ProfilGesundheitStatus
  emoji: string
  label: string
  activeText: string
  activeBg: string
  activeBorder: string
}> = [
  {
    key: 'schwach',
    emoji: '🔴',
    label: 'Schwach',
    activeText: 'text-red-700',
    activeBg: 'bg-red-100',
    activeBorder: 'border-red-500',
  },
  {
    key: 'ausbaufaehig',
    emoji: '🟠',
    label: 'Ausbaufähig',
    activeText: 'text-orange-700',
    activeBg: 'bg-orange-100',
    activeBorder: 'border-orange-500',
  },
  {
    key: 'solide-mit-optimierung',
    emoji: '🟡',
    label: 'Optimierbar',
    activeText: 'text-yellow-700',
    activeBg: 'bg-yellow-100',
    activeBorder: 'border-yellow-500',
  },
  {
    key: 'solide',
    emoji: '🟢',
    label: 'Solide',
    activeText: 'text-green-600',
    activeBg: 'bg-green-50',
    activeBorder: 'border-green-400',
  },
  {
    key: 'stark',
    emoji: '🟢',
    label: 'Stark',
    activeText: 'text-green-700',
    activeBg: 'bg-green-100',
    activeBorder: 'border-green-600',
  },
]
