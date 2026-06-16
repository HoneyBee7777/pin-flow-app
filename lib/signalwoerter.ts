export const SIGNALWOERTER: readonly string[] = [
  'einfach',
  'schnell',
  'clever',
  'genial',
  'ultimativ',
  'perfekt',
  'magisch',
  'kostenlos',
  'garantiert',
  'Geheimnis',
  'entdecke',
  'stopp',
  'vermeide',
  'endlich',
  'jetzt',
  'neu',
  'exklusiv',
  'bewiesen',
  'Schritt-für-Schritt',
  'in 5 Minuten',
  'ohne Aufwand',
  'wie Profis',
  'für Anfänger',
  'die beste',
  'unverzichtbar',
  'simpel',
  'effektiv',
  'lebensverändernd',
  'klappt immer',
  'nie wieder',
  'so gelingt',
  'blitzschnell',
  'ohne Vorkenntnisse',
  'garantiert erfolgreich',
  'getestet',
  'Experten-Tipp',
  'geheimer Trick',
  'sofort umsetzbar',
  'bewährte Methode',
  'einfach erklärt',
  'revolutionär',
  'erstaunlich',
  'unglaublich',
  'komplett',
  'alles was du brauchst',
  'das einzige',
  'endlich gelöst',
  'atemberaubend',
  'ausgewählte',
  'beliebte',
  'besonders',
  'beste',
  'darum lohnt sich',
  'das macht den Unterschied',
  'der beste Weg zu',
  'direkt',
  'effizient',
  'einzigartig',
  'empfehlenswert',
  'für Einsteiger',
  'für Fortgeschrittene',
  'für Profis',
  'für wenig Geld',
  'für Zuhause',
  'geeignet',
  'Geheimtipp',
  'handverlesen',
  'hilft gegen',
  'how to',
  'ideale',
  'idyllisch',
  'in nur 3 Schritten',
  'inspirierend',
  'must have',
  'noch heute',
  'optimieren',
  'organisieren',
  'praktisch',
  'Rettung',
  'Schluss mit',
  'sichtbar',
  'so vermeidest du',
  'stimmungsvoll',
  'transformierend',
  'traumhaft',
  'Tricks',
  'Tutorial',
  'ultimative',
  'meine Favoriten',
  'unvergesslich',
  'Upgrade',
  'verborgene Schätze',
  'Vergleich',
  'verschönern',
  'verwandeln',
  'vorher/nachher',
  'Vorteile von',
  'Wohlfühl-',
  'wusstest du dass',
  'Zeit sparen',
] as const

// Parst eine kommagetrennte Signalwort-Liste (eigene_signalwoerter oder
// signalwoerter_deaktiviert) in ein bereinigtes String-Array.
export function parseSignalwoerterListe(
  value: string | null | undefined
): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Serialisiert eine Signalwort-Liste zurück ins kommagetrennte DB-Format.
export function serializeSignalwoerterListe(list: readonly string[]): string {
  return list
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

// Baut den finalen, aktiven Signalwort-Pool für den Pin-Prompt:
//   1. Start mit den festen Standard-Signalwörtern.
//   2. Entfernt die vom Nutzer abgewählten Standardwörter (deaktiviert).
//   3. Hängt die eigenen Wörter des Nutzers hinten an.
// Der Abgleich der Abwahl ist case-insensitiv, damit die Schreibweise aus der
// gespeicherten Liste nicht exakt mit dem Standard übereinstimmen muss.
export function baueAktiveSignalwoerter(
  eigene: string | null | undefined,
  deaktiviert: string | null | undefined
): string[] {
  const abgewaehlt = new Set(
    parseSignalwoerterListe(deaktiviert).map((w) => w.toLowerCase())
  )
  const standard = SIGNALWOERTER.filter(
    (w) => !abgewaehlt.has(w.toLowerCase())
  )
  return [...standard, ...parseSignalwoerterListe(eigene)]
}

// Bestand: hängt eigene Wörter an den vollständigen Standard-Pool an (ohne
// Abwahl). Intern auf baueAktiveSignalwoerter umgestellt, damit der bestehende
// Aufruf unverändert weiterläuft.
export function mergeSignalwoerter(custom: string | null | undefined): string[] {
  return baueAktiveSignalwoerter(custom, null)
}
