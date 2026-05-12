// Deutsche Übersetzungen der Pinterest-Top-Level-Interessen-Kategorien.
// V3.0 nutzt englische Kategorienamen aus dem CSV-Export (Pinterest-Standard),
// liefert in der UI aber „<Englisch> (<Deutsch>)"-Anzeige.
//
// Quelle: Pinterest Audience-Insights-Taxonomie der „Top-Kategorien". Pinterest
// pflegt diese Liste relativ stabil — neue Kategorien werden hier ergänzt.
// Fehlende Kategorien fallen auf den englischen Originalnamen zurück.

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Home Decor': 'Wohnen & Einrichten',
  'Art': 'Kunst',
  'Health': 'Gesundheit',
  'DIY and Crafts': 'Selbermachen & Basteln',
  'Education': 'Bildung',
  'Entertainment': 'Unterhaltung',
  'Beauty': 'Schönheit',
  'Food and Drinks': 'Essen & Trinken',
  'Design': 'Design',
  "Women's Fashion": 'Damenmode',
  'Travel': 'Reisen',
  'Quotes': 'Zitate',
  'Event Planning': 'Eventplanung',
  'Sport': 'Sport',
  'Gardening': 'Gartenarbeit',
  'Parenting': 'Elternschaft',
  'Animals': 'Tiere',
  'Electronics': 'Elektronik',
  'Architecture': 'Architektur',
  'Vehicles': 'Fahrzeuge',
  'Wedding': 'Hochzeit',
  "Men's Fashion": 'Herrenmode',
  "Children's Fashion": 'Kindermode',
}

// Liefert „Englisch (Deutsch)" oder nur „Englisch", falls keine Übersetzung
// hinterlegt ist. UI nutzt das überall, wo eine Kategorie angezeigt wird.
export function formatCategoryLabel(englishName: string): string {
  const german = CATEGORY_TRANSLATIONS[englishName]
  return german ? `${englishName} (${german})` : englishName
}

// Nur die deutsche Übersetzung — fürs Heuristik-Summary, das in Volltext-
// Sätzen geschrieben ist und keine Klammer-Annotation will. Bei fehlender
// Übersetzung fällt sie auf das englische Original zurück.
export function germanCategoryName(englishName: string): string {
  return CATEGORY_TRANSLATIONS[englishName] ?? englishName
}

// URL/HTML-id-tauglicher Slug aus dem englischen Kategorienamen — wird
// gebraucht für die Deep-Links vom Dashboard-Widget in die Interessen-
// Tabelle des Audience-Tabs.
//   „Food and Drinks"   → "food-and-drinks"
//   „Women's Fashion"   → "women-s-fashion"
//   „DIY and Crafts"    → "diy-and-crafts"
export function slugifyCategory(englishName: string): string {
  return englishName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
