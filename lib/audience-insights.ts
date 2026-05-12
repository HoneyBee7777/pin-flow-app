// Deterministische Insight-Generierung aus einem Audience-Snapshot.
//
// V3.0-Variante: regelbasierte Heuristik (keine KI). Der Output ist
// strukturiert (`AudienceInsight`), sodass die UI einzelne Bausteine
// separat anzeigen kann. Die Funktion komponiert zusätzlich einen
// flüssigen `summary`-Text in 5–8 Sätzen — Stil: anfänger-tauglich,
// „Du"-Ansprache, nische-agnostisch.
//
// V3.1+ kann diese Funktion durch einen KI-Call ersetzen oder die
// strukturierten Felder als Prompt-Kontext nutzen.

import type {
  AudienceInsight,
  AudienceInterest,
  AudienceSnapshot,
} from './audience-types'
import { getExpectedAudienceCategories } from './audience-niche-mapping'
import { germanCategoryName } from './audience-translations'

// Schwellen aus der Spec (V3.0).
const STRONG_AFFINITY_THRESHOLD = 1.5
const WEAK_AFFINITY_THRESHOLD = 0.5
// Trend-Schwelle: weniger als ±0.5 % gilt als „stabil" (kein nennenswerter Trend).
const TREND_STABILITY_THRESHOLD = 0.005

// Zwei-Stellige Prozentanzeige mit Komma als Trennzeichen — passt zum
// restlichen deutschen Zahlenstil in der App.
function formatPercent(value0to1: number): string {
  const pct = value0to1 * 100
  // Bei sehr kleinen Werten zwei Nachkommastellen, sonst eine.
  const decimals = pct < 1 ? 2 : 1
  return `${pct.toFixed(decimals).replace('.', ',')} %`
}

function formatAffinity(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

// Zählerwert wie „10.000" — Tausenderpunkt, keine Nachkommastellen.
function formatCount(value: number): string {
  return value.toLocaleString('de-DE')
}

// Liefert die n stärksten Kategorien mit Affinität ≥ Schwelle, absteigend
// nach Affinität sortiert.
function pickTopAffinities(
  interests: AudienceInterest[],
  threshold: number,
  limit: number
): AudienceInterest[] {
  return interests
    .filter((c) => c.affinity >= threshold)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, limit)
}

function pickWeakAffinities(
  interests: AudienceInterest[],
  threshold: number,
  limit: number
): AudienceInterest[] {
  return interests
    .filter((c) => c.affinity < threshold && c.affinity > 0)
    .sort((a, b) => a.affinity - b.affinity)
    .slice(0, limit)
}

// Formuliert eine kompakte Demografie-Aussage. Drei Bausteine, die je nach
// Daten-Dichte zugeschaltet werden:
//   – Gender > 80 %  → „überwiegend …"
//   – stärkste Altersgruppe → „hauptsächlich …"
//   – Top-Land > 60 %      → „… aus …"
function buildDemographicHighlight(snapshot: AudienceSnapshot): string {
  const parts: string[] = []
  const dominantGender = snapshot.data.gender
    .slice()
    .sort((a, b) => b.percent - a.percent)[0]
  if (dominantGender && dominantGender.percent >= 0.8) {
    const genderName =
      dominantGender.name.toLowerCase() === 'female'
        ? 'weiblich'
        : dominantGender.name.toLowerCase() === 'male'
          ? 'männlich'
          : dominantGender.name
    parts.push(
      `überwiegend ${genderName} (${formatPercent(dominantGender.percent)})`
    )
  }

  const dominantAge = snapshot.data.ages
    .slice()
    .sort((a, b) => b.percent - a.percent)[0]
  if (dominantAge && dominantAge.percent >= 0.15) {
    parts.push(
      `hauptsächlich ${dominantAge.range} Jahre alt (${formatPercent(dominantAge.percent)})`
    )
  }

  const topCountry = snapshot.data.countries
    .slice()
    .sort((a, b) => b.percent - a.percent)[0]
  if (topCountry && topCountry.percent >= 0.6) {
    parts.push(
      `${formatPercent(topCountry.percent)} aus ${topCountry.name}`
    )
  }

  return parts.join(', ')
}

// Generiert den Lücken-Hinweis basierend auf Hauptnische × Top-Affinitäten.
// Drei Varianten gemäß Spec:
//   1. Match — Hauptnische passt zur Top-Affinität
//   2. Mismatch — Hauptnische gemappt, aber keine erwartete Kategorie unter Top
//   3. Fallback — Hauptnische unbekannt oder nicht gemappt
function buildNicheGapHint(
  nicheId: string | null,
  nicheLabel: string | null,
  topAffinities: AudienceInterest[]
): string | null {
  if (topAffinities.length === 0) return null

  const expected = getExpectedAudienceCategories(nicheId)
  const topCategoryNames = new Set(topAffinities.map((c) => c.category))

  // Variante 3: Keine Nische oder Nische nicht im Mapping
  if (!nicheId || !nicheLabel || expected.length === 0) {
    const list = topAffinities
      .map((c) => germanCategoryName(c.category))
      .join(', ')
    return `Deine Top-Affinitäten sind ${list}. Prüfe, ob deine aktuelle Pin-Strategie diese Themen ausreichend bedient.`
  }

  // Variante 1: Match — eine der erwarteten Kategorien ist Top
  const matchedCategory = expected.find((cat) => topCategoryNames.has(cat))
  if (matchedCategory) {
    return `Deine Hauptnische ${nicheLabel} passt gut zur Top-Affinität ${germanCategoryName(matchedCategory)} — du bist auf dem richtigen Weg.`
  }

  // Variante 2: Mismatch — Top-Affinität liegt woanders als erwartet
  const topCategory = topAffinities[0]
  return `Deine Hauptnische ist ${nicheLabel}, aber deine Zielgruppe zeigt die höchste Affinität zu ${germanCategoryName(topCategory.category)}. Schau, ob du Brücken zwischen den Themen bauen kannst.`
}

// Trend-Hint: vergleicht den aktuellen Snapshot mit dem nächstälteren
// (Index 1 in einer absteigend nach Datum sortierten Liste). Liefert
// null, wenn nur ein Snapshot existiert oder die Differenz im Toleranz-
// Bereich liegt.
function buildTrendHint(
  current: AudienceSnapshot,
  previous: AudienceSnapshot | null
): string | null {
  if (!previous) return null
  if (previous.audienceSize <= 0) return null

  const diff = current.audienceSize - previous.audienceSize
  const relative = diff / previous.audienceSize
  if (Math.abs(relative) < TREND_STABILITY_THRESHOLD) {
    return 'Größe der Zielgruppe ist zum Vormonat stabil.'
  }
  const direction = diff > 0 ? 'gewachsen' : 'geschrumpft'
  const absPercent = formatPercent(Math.abs(relative))
  const absCount = formatCount(Math.abs(diff))
  return `Zielgruppe ist zum Vormonat um ${absPercent} ${direction} (${diff > 0 ? '+' : '−'}${absCount} Personen).`
}

// Setzt den Summary-Volltext zusammen. Drei Sätze sind Pflicht
// (Größe + Demografie, Top-Affinitäten, Nische-Hinweis); Schwach-Affinitäten
// und Trend werden nur eingeflochten, wenn vorhanden.
function buildSummary(
  snapshot: AudienceSnapshot,
  topAffinities: AudienceInterest[],
  weakAffinities: AudienceInterest[],
  demographicHighlight: string,
  nicheGapHint: string | null,
  trendHint: string | null
): string {
  const sentences: string[] = []

  // Satz 1: Größe + Demografie
  const sizeText = `Deine Zielgruppe hat ${formatCount(snapshot.audienceSize)} Personen`
  sentences.push(
    demographicHighlight
      ? `${sizeText}, ${demographicHighlight}.`
      : `${sizeText}.`
  )

  // Satz 2: Top-Affinitäten
  if (topAffinities.length > 0) {
    const parts = topAffinities.map(
      (c) =>
        `${germanCategoryName(c.category)} (${formatAffinity(c.affinity)})`
    )
    const list =
      parts.length === 1
        ? parts[0]
        : parts.length === 2
          ? `${parts[0]} und ${parts[1]}`
          : `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`
    sentences.push(`Sie zeigt starkes Interesse an ${list}.`)
  } else {
    sentences.push(
      'Keine Kategorie hat eine besonders hohe Affinität — die Interessen verteilen sich breit.'
    )
  }

  // Satz 3 (optional): Schwach-Affinitäten
  if (weakAffinities.length > 0) {
    const names = weakAffinities
      .slice(0, 3)
      .map((c) => germanCategoryName(c.category))
    const list =
      names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} und ${names[1]}`
          : `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`
    sentences.push(`Themen wie ${list} interessieren sie kaum.`)
  }

  // Satz 4: Lücken-Hinweis (immer, wenn topAffinities vorhanden)
  if (nicheGapHint) {
    sentences.push(nicheGapHint)
  }

  // Satz 5 (optional): Trend
  if (trendHint) {
    sentences.push(trendHint)
  }

  return sentences.join(' ')
}

// Hauptfunktion. `previousSnapshot` ist optional und wird für den
// Trend-Hint genutzt; `nicheId` + `nicheLabel` stammen aus dem V2.1-
// AccountNicheProfile (calculateAccountNicheProfile).
export function generateAudienceInsights({
  snapshot,
  previousSnapshot = null,
  nicheId = null,
  nicheLabel = null,
}: {
  snapshot: AudienceSnapshot
  previousSnapshot?: AudienceSnapshot | null
  nicheId?: string | null
  nicheLabel?: string | null
}): AudienceInsight {
  const topAffinities = pickTopAffinities(
    snapshot.data.interests,
    STRONG_AFFINITY_THRESHOLD,
    3
  )
  const weakAffinities = pickWeakAffinities(
    snapshot.data.interests,
    WEAK_AFFINITY_THRESHOLD,
    5
  )
  const demographicHighlight = buildDemographicHighlight(snapshot)
  const nicheGapHint = buildNicheGapHint(nicheId, nicheLabel, topAffinities)
  const trendHint = buildTrendHint(snapshot, previousSnapshot)
  const summary = buildSummary(
    snapshot,
    topAffinities,
    weakAffinities,
    demographicHighlight,
    nicheGapHint,
    trendHint
  )

  return {
    summary,
    topAffinities,
    weakAffinities,
    demographicHighlight,
    nicheGapHint,
    trendHint,
  }
}
