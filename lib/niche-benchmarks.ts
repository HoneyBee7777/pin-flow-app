// Nischen-Benchmarks für die V2.1-Anzeige- und Coaching-Schicht.
//
// Das Klassifikations-System (diagnosePinAggregated) bleibt unverändert auf
// Account-Median-Basis. Diese Datei liefert nur zusätzliche Branchen-
// Vergleichswerte, damit Median CTR und Save-Rate gegen typische
// Nischen-Bandbreiten eingeordnet werden können.

export type PinterestStrength = 'sehr_hoch' | 'hoch' | 'mittel' | 'niedrig'

export type Range = {
  schwach: number
  durchschnitt: number
  stark: number
}

export type NicheBenchmark = {
  id: string
  label: string
  pinterest_strength: PinterestStrength
  save_rate: Range
  ctr: Range
  hinweis: string
}

export const NICHE_BENCHMARKS: readonly NicheBenchmark[] = [
  {
    id: 'essen-trinken',
    label: 'Essen & Trinken',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    ctr: { schwach: 0.8, durchschnitt: 1.5, stark: 3.0 },
    hinweis:
      'Eine der stärksten Pinterest-Nischen. Rich Pins für Rezepte aktivieren — sie zeigen Zutaten und Kochzeit direkt im Pin und steigern die CTR deutlich.',
  },
  {
    id: 'reisen',
    label: 'Reisen',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.8, stark: 1.8 },
    ctr: { schwach: 0.6, durchschnitt: 1.2, stark: 2.5 },
    hinweis:
      'Hohe Save-Raten, aber lange Conversion-Zyklen. Inhalte 8-12 Wochen vor Reisesaison veröffentlichen.',
  },
  {
    id: 'beauty-pflege',
    label: 'Beauty & Pflege',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.8, stark: 1.5 },
    ctr: { schwach: 0.7, durchschnitt: 1.3, stark: 2.5 },
    hinweis:
      'Visuell starke Nische mit hoher Wettbewerbsdichte. Differenzierung über Vor-Nachher-Vergleiche oder Nischen-Themen.',
  },
  {
    id: 'mode',
    label: 'Mode',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.9, stark: 1.8 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Saisonale Trends sind hier wichtiger als in jeder anderen Nische. Pins 4-6 Wochen vor Saison-Start veröffentlichen.',
  },
  {
    id: 'wohnen-einrichten',
    label: 'Wohnen & Einrichten',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    ctr: { schwach: 0.7, durchschnitt: 1.3, stark: 2.5 },
    hinweis:
      '79 % der Pinterest-Nutzer interessieren sich für diese Nische. Vor-Nachher-Bilder performen am besten. Lange Pin-Lebensdauer.',
  },
  {
    id: 'gesundheit-fitness',
    label: 'Gesundheit & Fitness',
    pinterest_strength: 'hoch',
    save_rate: { schwach: 0.3, durchschnitt: 0.6, stark: 1.2 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Pinterest schränkt manche Gesundheits-Themen algorithmisch ein. Auf inspirational und positiv formulierte Pins setzen.',
  },
  {
    id: 'yoga-wellness',
    label: 'Yoga & Wellness',
    pinterest_strength: 'hoch',
    save_rate: { schwach: 0.3, durchschnitt: 0.6, stark: 1.5 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Spirituelle Themen (Rituale, Meditation) performen besser als praktische Themen. Visuelle Ästhetik ist entscheidend.',
  },
  {
    id: 'garten',
    label: 'Garten',
    pinterest_strength: 'hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.8, stark: 1.5 },
    ctr: { schwach: 0.6, durchschnitt: 1.1, stark: 2.0 },
    hinweis:
      'Stark saisonal. Pins 6-8 Wochen vor Saison veröffentlichen. Kleinraumlösungen haben weniger Konkurrenz.',
  },
  {
    id: 'diy-basteln',
    label: 'DIY & Basteln',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    ctr: { schwach: 0.7, durchschnitt: 1.3, stark: 2.5 },
    hinweis:
      '76 % der Nutzer interessieren sich für DIY. Schritt-für-Schritt-Pins funktionieren besser als reine Inspiration.',
  },
  {
    id: 'hochzeit',
    label: 'Hochzeit',
    pinterest_strength: 'sehr_hoch',
    save_rate: { schwach: 0.5, durchschnitt: 1.2, stark: 2.5 },
    ctr: { schwach: 0.6, durchschnitt: 1.2, stark: 2.5 },
    hinweis:
      'Sehr hohe Save-Raten. Lange Conversion-Zyklen (12-18 Monate). Detail-Bilder performen oft besser als Gesamtbilder.',
  },
  {
    id: 'familie-erziehung',
    label: 'Familie & Erziehung',
    pinterest_strength: 'hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.8, stark: 1.5 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Praktisch-helfende Inhalte (Druckvorlagen, Routinen) performen besser als reine Inspiration.',
  },
  {
    id: 'finanzen',
    label: 'Finanzen',
    pinterest_strength: 'mittel',
    save_rate: { schwach: 0.2, durchschnitt: 0.4, stark: 1.0 },
    ctr: { schwach: 0.4, durchschnitt: 0.9, stark: 2.0 },
    hinweis:
      'Kleinere Pinterest-Audience, aber sehr hohe Klickbereitschaft. Infografiken und Druckvorlagen funktionieren am besten.',
  },
  {
    id: 'tiere',
    label: 'Tiere',
    pinterest_strength: 'hoch',
    save_rate: { schwach: 0.4, durchschnitt: 0.7, stark: 1.5 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Praktische Inhalte (Training, Pflege) konvertieren besser als reine Tier-Bilder.',
  },
  {
    id: 'kunst-design',
    label: 'Kunst & Design',
    pinterest_strength: 'mittel',
    save_rate: { schwach: 0.3, durchschnitt: 0.6, stark: 1.2 },
    ctr: { schwach: 0.4, durchschnitt: 0.8, stark: 1.5 },
    hinweis:
      'Hohe Save-Raten als Inspirations-Sammlung, aber niedrige Klickraten. Lead-Magneten helfen beim Conversion-Aufbau.',
  },
  {
    id: 'bildung',
    label: 'Bildung',
    pinterest_strength: 'mittel',
    save_rate: { schwach: 0.3, durchschnitt: 0.6, stark: 1.2 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Druckvorlagen und Lerntipps performen am besten. Hauptzielgruppe sind Eltern und Lehrkräfte.',
  },
  {
    id: 'business-marketing',
    label: 'Business & Marketing',
    pinterest_strength: 'mittel',
    save_rate: { schwach: 0.2, durchschnitt: 0.4, stark: 1.0 },
    ctr: { schwach: 0.5, durchschnitt: 1.0, stark: 2.0 },
    hinweis:
      'Vorlagen, Checklisten und Druckvorlagen performen besser als Text-lastige Konzept-Pins.',
  },
  {
    id: 'technologie',
    label: 'Technologie',
    pinterest_strength: 'niedrig',
    save_rate: { schwach: 0.1, durchschnitt: 0.3, stark: 0.8 },
    ctr: { schwach: 0.4, durchschnitt: 0.8, stark: 1.5 },
    hinweis:
      'Schwache Pinterest-Nische. Auf Tech-Crossover-Themen setzen (Smart Home, Productivity-Setups).',
  },
  {
    id: 'sonstiges',
    label: 'Sonstiges',
    pinterest_strength: 'mittel',
    save_rate: { schwach: 0.2, durchschnitt: 0.5, stark: 1.0 },
    ctr: { schwach: 0.4, durchschnitt: 0.9, stark: 1.8 },
    hinweis:
      'Ohne klare Nischen-Zuordnung schwer einschätzbar. Empfehlung: passende Nische wählen, auch wenn nicht 100 % passend.',
  },
] as const

// Klartext-Label → Slug. Deterministische Konvertierung:
//   1. lowercase + trim
//   2. Umlaute/ß ersetzen
//   3. " & " als ein Wort behandeln (zu einem Bindestrich)
//   4. Whitespace zu Bindestrichen
//   5. Mehrfach-Bindestriche kollabieren
//
// Wird auch von Phase 2/3 (Anzeige & Coaching) gebraucht — deshalb exportiert.
export function labelToSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s*&\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Liefert den NicheBenchmark zu einer Board-Kategorie (DB-Wert) oder null.
//
// Reihenfolge bewusst: erst direkter Slug-Match (Resilienz, falls irgendwo
// schon Slugs durchgereicht werden), dann Klartext-zu-Slug-Konvertierung
// (Hauptpfad — DB liefert Klartext-Labels wie "Essen & Trinken"). Bei null,
// leerem String oder unbekannten Werten wird null zurückgegeben — aufrufende
// Stellen ignorieren das Board dann einfach.
export function getNicheBenchmark(
  input: string | null | undefined
): NicheBenchmark | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Pfad 1: direktes Slug-Match
  const directMatch = NICHE_BENCHMARKS.find((n) => n.id === trimmed)
  if (directMatch) return directMatch

  // Pfad 2: Klartext-Konvertierung
  const slug = labelToSlug(trimmed)
  return NICHE_BENCHMARKS.find((n) => n.id === slug) ?? null
}
