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
  CoachingBlock,
} from './audience-types'
import { getExpectedAudienceCategories } from './audience-niche-mapping'
import { germanCategoryName } from './audience-translations'

// Schwellen aus der Spec (V3.0).
const STRONG_AFFINITY_THRESHOLD = 1.5
// Vereinheitlicht mit Tabelle + Wissensseite: schwach < 0,8 (vorher 0,5).
const WEAK_AFFINITY_THRESHOLD = 0.8
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

// Verbindet Kategorienamen zu einer deutschen Aufzählung
// („A, B und C"). Wird vom Summary und vom Dashboard-Widget genutzt.
function joinGermanList(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} und ${names[1]}`
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`
}

// V3.0.9 — strukturierter 3-Absatz-Coaching-Text (Beobachtung → Warum →
// Reflexion). Nutzt dieselbe Match/Mismatch/Fallback-Heuristik wie
// `buildNicheGapHint` (Hauptnische × Top-Affinitäten). Liefert null, wenn
// keine Top-Affinität vorliegt (dann fällt das UI auf `summary` zurück).
//
// Drei Varianten:
//   A Match    — Hauptnische passt zu einer Top-Affinität
//   B Mismatch — Hauptnische gemappt, aber nicht unter Top-Affinitäten
//   C Fallback — keine/ungemappte Hauptnische
//
// Sparsame **fett**-Marker (1 pro Variante) werden vom gemeinsamen
// Renderer (components/CoachingParagraphs) zu <strong> aufgelöst.
export function buildCoachingBlock(
  nicheId: string | null,
  nicheLabel: string | null,
  topAffinities: AudienceInterest[]
): CoachingBlock | null {
  if (topAffinities.length === 0) return null

  const list = joinGermanList(
    topAffinities.map((c) => germanCategoryName(c.category))
  )
  const expected = getExpectedAudienceCategories(nicheId)
  const topCategoryNames = new Set(topAffinities.map((c) => c.category))

  const explanationBase =
    'Pinterest spielt deine Pins primär an Menschen aus, deren Interessen zu deinen Pin-Themen passen.'

  // Variante A — Match
  if (
    nicheId &&
    nicheLabel &&
    expected.length > 0 &&
    expected.some((cat) => topCategoryNames.has(cat))
  ) {
    return {
      variant: 'A',
      observation: `Deine Zielgruppe interessiert sich besonders stark für ${list} — Themen, die direkt zu deiner Hauptnische ${nicheLabel} passen. Du bist also richtig positioniert.`,
      explanation: `${explanationBase} Da deine Zielgruppe genau für deine Kernthemen brennt, hast du **maximale Algorithmus-Unterstützung** — jeder zusätzliche Pin in diesen Themen verstärkt deine Sichtbarkeit überproportional.`,
      reflection:
        'Überlege: In welchem dieser Themen kannst du dein Profil noch tiefer ausbauen, um deinen Vorteil zu festigen?',
    }
  }

  // Variante B — Mismatch (Hauptnische gemappt, aber nicht unter Top)
  if (nicheId && nicheLabel && expected.length > 0) {
    return {
      variant: 'B',
      observation: `Deine Zielgruppe interessiert sich besonders stark für ${list} — Themen, die du noch wenig bedienst. Deine Hauptnische ist ${nicheLabel}.`,
      explanation: `${explanationBase} Wenn du Brücken-Themen bedienst — also Inhalte, die deine Nische mit den Interessen deiner Zielgruppe verbinden — erreichst du mehrere Zielgruppen gleichzeitig: **mehr Reichweite, mehr Saves, weniger Konkurrenz** in der Pinterest-Suche.`,
      reflection:
        'Überlege: Welche zwei oder drei Brücken-Themen passen authentisch zu deiner Marke?',
    }
  }

  // Variante C — keine Nische oder Nische nicht im Mapping
  return {
    variant: 'C',
    observation: `Deine Zielgruppe interessiert sich besonders stark für ${list} — überdurchschnittlich im Vergleich zum Pinterest-Schnitt.`,
    explanation: `${explanationBase} Themen mit hoher Affinität sind dein **Algorithmus-Hebel** — sie werden bevorzugt verteilt und haben in der Pinterest-Suche weniger Konkurrenz.`,
    reflection:
      'Überlege: Bedient deine aktuelle Pin-Strategie diese drei Themen schon ausreichend? Wo könntest du nachschärfen?',
  }
}

// Trend-Hint: vergleicht den aktuellen Snapshot mit dem nächstälteren
// (Index 1 in einer absteigend nach Datum sortierten Liste). Liefert
// null, wenn nur ein Snapshot existiert oder die Differenz im Toleranz-
// Bereich liegt.
// `vergleichLabel` ist die komplette Präpositionalphrase, damit die
// Grammatik je nach Quelle stimmt: „zum Vormonat" (CSV-Snapshots) bzw.
// „zur Vorperiode" (Performance-Daten / interagierende Zielgruppe).
function buildTrendHint(
  currentSize: number,
  previousSize: number | null,
  vergleichLabel: string
): string | null {
  if (previousSize === null) return null
  if (previousSize <= 0) return null

  const diff = currentSize - previousSize
  const relative = diff / previousSize
  if (Math.abs(relative) < TREND_STABILITY_THRESHOLD) {
    return `Größe der Zielgruppe ist ${vergleichLabel} stabil.`
  }
  const direction = diff > 0 ? 'gewachsen' : 'geschrumpft'
  const absPercent = formatPercent(Math.abs(relative))
  const absCount = formatCount(Math.abs(diff))
  return `Zielgruppe ist ${vergleichLabel} um ${absPercent} ${direction} (${diff > 0 ? '+' : '−'}${absCount} Personen).`
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
  trendHint: string | null,
  // V3.0.9 — echte interagierende Zielgruppe aus den Performance-Daten.
  // Wenn gesetzt, ersetzt sie die gerundete CSV-Audience-Size (z. B. die
  // irreführende „10.000"-Größenklasse).
  engagedSize: number | null
): string {
  const sentences: string[] = []

  // Satz 1: Größe + Demografie
  const sizeText =
    engagedSize !== null
      ? `Deine interagierende Zielgruppe liegt bei ${formatCount(engagedSize)} Personen`
      : `Deine Zielgruppe hat ${formatCount(snapshot.audienceSize)} Personen`
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
  engagedSize = null,
  engagedPreviousSize = null,
}: {
  snapshot: AudienceSnapshot
  previousSnapshot?: AudienceSnapshot | null
  nicheId?: string | null
  nicheLabel?: string | null
  // V3.0.9 — interagierende Zielgruppe + Vorperioden-Wert aus den
  // Performance-Daten. Wenn gesetzt, basieren Größen-Satz UND Trend
  // darauf statt auf der gerundeten CSV-Audience-Size.
  engagedSize?: number | null
  engagedPreviousSize?: number | null
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
  const usingEngaged = engagedSize !== null
  const trendHint = usingEngaged
    ? buildTrendHint(engagedSize, engagedPreviousSize, 'zur Vorperiode')
    : buildTrendHint(
        snapshot.audienceSize,
        previousSnapshot ? previousSnapshot.audienceSize : null,
        'zum Vormonat'
      )
  const summary = buildSummary(
    snapshot,
    topAffinities,
    weakAffinities,
    demographicHighlight,
    nicheGapHint,
    trendHint,
    engagedSize
  )
  const coachingBlock = buildCoachingBlock(
    nicheId,
    nicheLabel,
    topAffinities
  )

  return {
    summary,
    topAffinities,
    weakAffinities,
    demographicHighlight,
    nicheGapHint,
    trendHint,
    coachingBlock,
  }
}
