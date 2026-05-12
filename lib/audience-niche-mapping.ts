// V2.1-Hauptnische → erwartete Pinterest-Audience-Kategorien.
//
// Die Heuristik nutzt diese Tabelle, um zu entscheiden:
//   – „Match"   : die Hauptnische des Users matched eine seiner Top-Affinitäten
//                 → bestätigender Hinweis
//   – „Mismatch": Hauptnische hinterlegt, aber die erwarteten Audience-
//                 Kategorien tauchen nicht in den Top-Affinitäten auf
//                 → Brücken-bauen-Hinweis
//   – „Unbekannt": Nische nicht im Mapping oder keine Hauptnische → generischer
//                  Hinweis (Fallback in audience-insights.ts)
//
// Die Schlüssel sind die `id`-Werte aus `lib/niche-benchmarks.ts` (V2.1).
// Werte sind die englischen Pinterest-Audience-Kategorien (übersetzt
// gibt's separat in audience-translations.ts).
//
// Mehrere Kategorien pro Nische sind absichtlich erlaubt — z. B. „Mode"
// matched sowohl „Women's Fashion" als auch „Beauty"; ein Match auf
// irgendeiner davon zählt schon als Match.
//
// Wartung: Wenn V2.1 weitere Nischen hinzufügt, hier ergänzen. Fehlende
// Nischen fallen auf die generische Variante zurück — kein Absturz.

export const NICHE_TO_AUDIENCE_CATEGORIES: Record<string, string[]> = {
  'essen-trinken': ['Food and Drinks'],
  'reisen': ['Travel'],
  'beauty-pflege': ['Beauty', "Women's Fashion"],
  'mode': ["Women's Fashion", 'Beauty', "Men's Fashion"],
  'wohnen-einrichten': ['Home Decor', 'Architecture', 'Design'],
  'gesundheit-fitness': ['Health', 'Sport'],
  'yoga-wellness': ['Health', 'Quotes', 'Beauty'],
  'garten': ['Gardening', 'Home Decor'],
  'diy-basteln': ['DIY and Crafts', 'Home Decor', 'Art'],
  'hochzeit': ['Wedding', 'Event Planning', "Women's Fashion"],
  'familie-erziehung': ['Parenting', "Children's Fashion"],
  'finanzen': ['Education', 'Quotes'],
  'tiere': ['Animals'],
  'kunst-design': ['Art', 'Design', 'Architecture'],
  'bildung': ['Education', 'Quotes'],
  'business-marketing': ['Education', 'Quotes'],
  'technologie': ['Electronics', 'Vehicles'],
  // 'sonstiges' ist absichtlich nicht gemappt — fällt automatisch auf
  // den generischen Hinweis in der Heuristik.
}

export function getExpectedAudienceCategories(
  nicheId: string | null | undefined
): string[] {
  if (!nicheId) return []
  return NICHE_TO_AUDIENCE_CATEGORIES[nicheId] ?? []
}
