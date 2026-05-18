// Pinterest Audience-Insights Datenmodell (V3.0).
//
// Ein „Audience-Snapshot" ist ein Monats-Stand der „Interagierenden
// Zielgruppe" für einen User. Die CSV von Pinterest enthält sieben
// Sektionen — Audience-Header, Interests, Countries, Metros, Gender,
// Devices, Ages — die hier in eine geschachtelte Struktur überführt
// werden. Persistiert in `public.audience_snapshots` als JSONB im
// `data`-Feld; Top-Level-Metadaten (Datum, Größe, Typ) bekommen eigene
// Spalten für effiziente Listen/Sortierung.

// Eine Top-Level-Interessen-Kategorie (z. B. „Home Decor") mit ihren
// Sub-Interessen (z. B. „Room Decor", „Wall Decor"). Jeder Eintrag enthält
// Anteil an der Audience (0..1) und Affinitäts-Index (1.0 = Pinterest-
// Durchschnitt, ≥ 1.5 = stark überdurchschnittlich, < 0.8 = schwach).
export type AudienceInterest = {
  category: string
  percent: number
  affinity: number
  subInterests: AudienceSubInterest[]
}

export type AudienceSubInterest = {
  name: string
  percent: number
  affinity: number
}

// Für Countries / Metros / Gender / Devices identisches Schema:
// Name + Anteil an der Audience.
export type AudienceBreakdown = {
  name: string
  percent: number
}

// Altersgruppen kommen von Pinterest als feste Buckets („18-24", „25-34" …).
// `range` ist der String wie in der CSV; UI darf das direkt anzeigen.
export type AudienceAgeBucket = {
  range: string
  percent: number
}

export type AudienceSnapshotData = {
  interests: AudienceInterest[]
  countries: AudienceBreakdown[]
  metros: AudienceBreakdown[]
  gender: AudienceBreakdown[]
  devices: AudienceBreakdown[]
  ages: AudienceAgeBucket[]
}

// Engaged-Audience ist der V3.0-Default. `total` ist als Erweiterungspfad
// reserviert (V3.1+), damit das Schema keine Migration bei Total-Import braucht.
export type AudienceType = 'engaged' | 'total'

export type AudienceSnapshot = {
  id: string
  userId: string
  audienceDate: string // ISO YYYY-MM-DD (das Datum aus der CSV)
  audienceType: AudienceType
  audienceSize: number
  importedAt: string // ISO timestamp
  data: AudienceSnapshotData
}

// V3.0.9 — strukturierter 3-Absatz-Coaching-Text. Wird an beiden Orten
// (Dashboard-Performance-Block + Analytics-Tab) identisch ausgespielt.
//   observation  — was zeigen die Daten
//   explanation  — warum es strategisch wichtig ist (Algorithmus-Logik)
//   reflection   — Reflexions-Impuls (Selbst-Aktivierung)
// Absätze können sparsame **fett**-Marker enthalten, die der gemeinsame
// Renderer (components/CoachingParagraphs) in <strong> umwandelt.
export type CoachingBlock = {
  observation: string
  explanation: string
  reflection: string
  variant: 'A' | 'B' | 'C'
}

// Ergebnis der Heuristik. UI rendert daraus den „Auf einen Blick"-Block.
// Einzelne Felder sind optional, damit das UI gezielt einzelne Bausteine
// einblenden kann (z. B. trendHint nur wenn ≥ 2 Snapshots vorhanden sind).
export type AudienceInsight = {
  summary: string
  topAffinities: AudienceInterest[]
  weakAffinities: AudienceInterest[]
  demographicHighlight: string
  nicheGapHint: string | null
  trendHint: string | null
  // null, wenn keine Top-Affinität vorliegt (dann gibt es keinen
  // sinnvollen 3-Absatz-Coaching-Text — UI fällt auf `summary` zurück).
  coachingBlock: CoachingBlock | null
}
