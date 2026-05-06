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

  // Reihenfolge ist bewusst: kritisch schlägt wichtig schlägt rest. Ein
  // Account mit 1 kritischen + 3 wichtigen ist 'ausbaufaehig', nicht
  // 'solide-mit-optimierung'.
  if (kritisch >= 2) {
    return {
      status: 'schwach',
      label: 'Schwach',
      beschreibung:
        'Mehrere kritische Probleme erkannt. Schau dir die Diagnose unten an — dort steht, womit du anfangen solltest.',
    }
  }
  if (kritisch === 1) {
    return {
      status: 'ausbaufaehig',
      label: 'Ausbaufähig',
      beschreibung:
        'Ein kritisches Problem erkannt. Lies die Diagnose unten — die Lösung ist dort konkret beschrieben.',
    }
  }
  if (wichtig >= 2) {
    return {
      status: 'solide-mit-optimierung',
      label: 'Solide mit Optimierungsbedarf',
      beschreibung:
        'Dein Account funktioniert grundsätzlich, hat aber mehrere Hebel. Die Diagnose unten zeigt dir, wo du ansetzen kannst.',
    }
  }
  if (wichtig === 1) {
    return {
      status: 'solide',
      label: 'Solide',
      beschreibung:
        'Dein Account ist gut aufgestellt. Eine konkrete Optimierung kannst du in der Diagnose unten anschauen.',
    }
  }
  return {
    status: 'stark',
    label: 'Stark',
    beschreibung:
      'Dein Account zeigt eine sehr gesunde Pinterest-Performance. Halte die Frequenz und prüfe beim nächsten Daten-Import erneut.',
  }
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
    label: 'Solide + Opt.',
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
