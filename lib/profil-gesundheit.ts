// Richtungs-Ampel für die Dashboard-Sektion „Wo stehst du?" (Profil-Status).
//
// Pure Funktion — kein React, kein Supabase. Bewertet die Entwicklungs-
// richtung der drei Kernsignale (ausgehende Klicks, Saves, Save-Rate) gegen
// den Vormonat und leitet daraus eine 3-stufige Ampel ab. Ohne Vormonat
// (erster erfasster Monat) gibt es bewusst keine Bewertung, sondern den
// Leer-Hinweis.

export type RichtungsAmpelStatus = 'gruen' | 'gelb' | 'rot' | 'leer'

export type RichtungsAmpelErgebnis = {
  status: RichtungsAmpelStatus
  begleitsatz: string
}

// Ab dieser prozentualen Veränderung gilt ein Signal als steigend bzw.
// fallend; dazwischen ist es stabil.
const RICHTUNG_SCHWELLE = 5

type SignalTrend = 'steigend' | 'stabil' | 'fallend'

// Einordnung eines einzelnen Wachstumswerts. null = kein Vergleich möglich
// (zählt als stabil). +Infinity/-Infinity entstehen, wenn die Vorperiode 0
// war (calcGrowth) — als steigend bzw. fallend gewertet.
function trendFor(growth: number | null): SignalTrend {
  if (growth === null) return 'stabil'
  if (growth === Number.POSITIVE_INFINITY) return 'steigend'
  if (growth === Number.NEGATIVE_INFINITY) return 'fallend'
  if (!Number.isFinite(growth)) return 'stabil'
  if (growth > RICHTUNG_SCHWELLE) return 'steigend'
  if (growth < -RICHTUNG_SCHWELLE) return 'fallend'
  return 'stabil'
}

const BEGLEITSATZ: Record<RichtungsAmpelStatus, string> = {
  gruen:
    'Deine Kernzahlen zeigen nach oben. Du bist auf Kurs, mach weiter so.',
  gelb: 'Gemischtes Bild. Schau dir unten an, wo es hakt, und setz dort an.',
  rot: 'Mehrere Kernzahlen gehen zurück. Zeit, gezielt gegenzusteuern, die Hinweise unten zeigen wo.',
  leer: 'Noch keine Richtung erkennbar. Ab dem zweiten Monat siehst du hier, wohin sich deine Zahlen entwickeln.',
}

export function computeRichtungsAmpel(args: {
  // false, wenn es noch keinen Vormonat gibt (nur ein erfasster Monat).
  hasPrevious: boolean
  // Wachstum gegen den Vormonat (Prozent), je null wenn nicht berechenbar.
  klicksGrowth: number | null
  savesGrowth: number | null
  saveRateGrowth: number | null
}): RichtungsAmpelErgebnis {
  if (!args.hasPrevious) {
    return { status: 'leer', begleitsatz: BEGLEITSATZ.leer }
  }

  const klicksTrend = trendFor(args.klicksGrowth)
  const fallend = [
    klicksTrend,
    trendFor(args.savesGrowth),
    trendFor(args.saveRateGrowth),
  ].filter((t) => t === 'fallend').length

  // Rot: zwei oder drei Signale fallen.
  if (fallend >= 2) return { status: 'rot', begleitsatz: BEGLEITSATZ.rot }
  // Gelb: genau ein Signal fällt ODER die ausgehenden Klicks fallen
  // (Klick-Vorrang: fallende Klicks sind nie grün). Da fallende Klicks immer
  // mindestens ein fallendes Signal bedeuten, ist die Klick-Bedingung bereits
  // durch `fallend === 1` abgedeckt — sie steht nur zur Klarheit der Regel.
  if (fallend === 1 || klicksTrend === 'fallend') {
    return { status: 'gelb', begleitsatz: BEGLEITSATZ.gelb }
  }
  // Grün: kein Signal fällt.
  return { status: 'gruen', begleitsatz: BEGLEITSATZ.gruen }
}

// Anzeige-Stufen der Ampel, Reihenfolge schlecht → gut. Nur Schlüssel + Label;
// die Punkt-Darstellung übernimmt projektweit die StatusDot-Komponente (über
// status-Tokens), das Label steht einheitlich in Blaugrau (text-haupt).
export const RICHTUNG_AMPEL_STUFEN: ReadonlyArray<{
  key: Exclude<RichtungsAmpelStatus, 'leer'>
  label: string
}> = [
  { key: 'rot', label: 'Rückläufig' },
  { key: 'gelb', label: 'Stabil' },
  { key: 'gruen', label: 'Wachsend' },
]
