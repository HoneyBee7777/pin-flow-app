// Phase B — Domain-Logik für das neue Strategie-Setup (4 Bausteine).
// Reine Funktionen: kein React, kein Supabase. Wird von der Save-Action
// (actions.ts), dem Page-Loader und später dem Wizard (Teil 2) genutzt.
//
// Die vier Bausteine (siehe STRATEGIE-UMBAU-AUDIT.md):
//   1. Business-Modell (Mehrfachauswahl) + Hauptnische
//   2. Zielflächen-Verteilung (Summe 100)
//   3. Content-Säulen (bestätigte thematische Schwerpunkte)
//   4. Pinning-Rhythmus (Phase je nach Anzahl Ziel-URLs)

import { NICHE_BENCHMARKS } from '@/lib/niche-benchmarks'

// =====================================================
// Baustein 1: Business-Modell
// =====================================================
export type BusinessModell = 'blog' | 'shop' | 'dienstleistung' | 'affiliate'

export const BUSINESS_MODELL_OPTIONS: ReadonlyArray<{
  value: BusinessModell
  label: string
}> = [
  { value: 'blog', label: 'Blog oder Content-Website' },
  { value: 'shop', label: 'Eigener Shop' },
  { value: 'dienstleistung', label: 'Dienstleistung oder Beratung' },
  { value: 'affiliate', label: 'Affiliate-Marketing' },
]

export function isBusinessModell(value: string): value is BusinessModell {
  return BUSINESS_MODELL_OPTIONS.some((o) => o.value === value)
}

// =====================================================
// Baustein 1: Hauptnische (aus den Benchmark-Nischen oder „sonstige")
// =====================================================
// Sentinel für „Meine Nische ist nicht dabei". Bewusst getrennt vom
// Benchmark-Wert 'sonstiges', damit die Wizard-Auswahl eindeutig bleibt.
export const HAUPTNISCHE_SONSTIGE = 'sonstige'

export const HAUPTNISCHE_OPTIONS: ReadonlyArray<{
  value: string
  label: string
}> = NICHE_BENCHMARKS.map((n) => ({ value: n.id, label: n.label }))

export function isHauptnische(value: string): boolean {
  return (
    value === HAUPTNISCHE_SONSTIGE ||
    NICHE_BENCHMARKS.some((n) => n.id === value)
  )
}

// =====================================================
// Baustein 2: Zielflächen-Verteilung
// =====================================================
export type Zielflaeche =
  | 'blog'
  | 'shop'
  | 'etsy'
  | 'affiliate'
  | 'landingpage'
  | 'newsletter'
  | 'buchung'

export const ZIELFLAECHEN: ReadonlyArray<{
  value: Zielflaeche
  label: string
}> = [
  { value: 'blog', label: 'Blog' },
  { value: 'shop', label: 'Shop auf eigener Website' },
  { value: 'etsy', label: 'Etsy-Shop' },
  { value: 'affiliate', label: 'Affiliate-Seite' },
  { value: 'landingpage', label: 'Landingpage' },
  { value: 'newsletter', label: 'Newsletter oder Lead-Magnet' },
  { value: 'buchung', label: 'Buchungs- oder Angebotsseite' },
]

export type ZielflaechenVerteilung = Record<Zielflaeche, number>

export const ZIELFLAECHEN_SUMME = 100

export function isZielflaeche(value: string): value is Zielflaeche {
  return ZIELFLAECHEN.some((o) => o.value === value)
}

export function leereZielflaechen(): ZielflaechenVerteilung {
  return {
    blog: 0,
    shop: 0,
    etsy: 0,
    affiliate: 0,
    landingpage: 0,
    newsletter: 0,
    buchung: 0,
  }
}

// =====================================================
// Baustein 4: Pinning-Rhythmus
// =====================================================
export type PinningFrequenz = 'einsteiger' | 'wachstum' | 'etabliert'

export const PINNING_FREQUENZ_OPTIONS: ReadonlyArray<{
  value: PinningFrequenz
  label: string
  beschreibung: string
  minUrls: number
  maxUrls: number | null
}> = [
  {
    value: 'einsteiger',
    label: 'Einsteiger',
    beschreibung: '1 bis 3 Pins pro Tag',
    minUrls: 0,
    maxUrls: 19,
  },
  {
    value: 'wachstum',
    label: 'Wachstum',
    beschreibung: '3 bis 5 Pins pro Tag',
    minUrls: 20,
    maxUrls: 100,
  },
  {
    value: 'etabliert',
    label: 'Etabliert',
    beschreibung: '5 bis 10 Pins pro Tag',
    minUrls: 101,
    maxUrls: null,
  },
]

export function isPinningFrequenz(value: string): value is PinningFrequenz {
  return PINNING_FREQUENZ_OPTIONS.some((o) => o.value === value)
}

// Leitet aus der Anzahl der Ziel-URLs die empfohlene Frequenz-Phase ab:
//   unter 20 → einsteiger, 20 bis 100 → wachstum, über 100 → etabliert.
export function empfohleneFrequenz(urlCount: number): PinningFrequenz {
  if (urlCount < 20) return 'einsteiger'
  if (urlCount <= 100) return 'wachstum'
  return 'etabliert'
}

// =====================================================
// Abschluss-Anzeige: empfohlener Angebotsart-Mix
// =====================================================
// Angebotsart = der Content-Typ am Pin (pins.strategie_typ). Für die
// Abschluss-Zusammenfassung leiten wir aus den Zielflächen einen Vorschlag
// ab, mit dem die spätere IST-Verteilung der Pins verglichen werden kann.
export type Angebotsart = 'blog_content' | 'affiliate' | 'produkt' | 'dienstleistung'

export type AngebotsartMix = Record<Angebotsart, number>

export const ANGEBOTSART_LABEL: Record<Angebotsart, string> = {
  blog_content: 'Blog-Content',
  affiliate: 'Affiliate',
  produkt: 'Produkt',
  dienstleistung: 'Dienstleistung',
}

// Rundet einen Roh-Mix auf ganze Prozente, deren Summe genau 100 ergibt
// (größter-Rest-Verfahren). Bei leerem Roh-Mix neutral auf Blog-Content.
function normalizeAngebotsMix(raw: AngebotsartMix): AngebotsartMix {
  const keys: Angebotsart[] = [
    'blog_content',
    'affiliate',
    'produkt',
    'dienstleistung',
  ]
  const total = keys.reduce((s, k) => s + raw[k], 0)
  if (total <= 0) {
    return { blog_content: 100, affiliate: 0, produkt: 0, dienstleistung: 0 }
  }
  const parts = keys.map((k) => {
    const exact = (raw[k] / total) * 100
    const floor = Math.floor(exact)
    return { k, floor, rest: exact - floor }
  })
  const used = parts.reduce((s, p) => s + p.floor, 0)
  let remainder = 100 - used
  // Rest an die größten Nachkommastellen verteilen.
  const order = [...parts].sort((a, b) => b.rest - a.rest)
  const extra = new Set<Angebotsart>()
  for (const p of order) {
    if (remainder <= 0) break
    extra.add(p.k)
    remainder -= 1
  }
  const out: AngebotsartMix = {
    blog_content: 0,
    affiliate: 0,
    produkt: 0,
    dienstleistung: 0,
  }
  for (const p of parts) out[p.k] = p.floor + (extra.has(p.k) ? 1 : 0)
  return out
}

// Einfache Heuristik: Zielflächen → Angebotsart.
//   blog + newsletter        → Blog-Content
//   shop + etsy + landingpage → Produkt
//   affiliate                → Affiliate
//   buchung                  → Dienstleistung
// Sind noch keine Zielflächen verteilt, wird aus dem Business-Modell
// abgeleitet (shop-lastig → mehr Produkt, blog-lastig → mehr Blog-Content).
export function empfohlenerAngebotsMix(
  businessModell: BusinessModell[],
  zielflaechen: ZielflaechenVerteilung
): AngebotsartMix {
  const raw: AngebotsartMix = {
    blog_content: zielflaechen.blog + zielflaechen.newsletter,
    affiliate: zielflaechen.affiliate,
    produkt: zielflaechen.shop + zielflaechen.etsy + zielflaechen.landingpage,
    dienstleistung: zielflaechen.buchung,
  }
  const total =
    raw.blog_content + raw.affiliate + raw.produkt + raw.dienstleistung
  if (total > 0) return normalizeAngebotsMix(raw)

  // Fallback aus dem Business-Modell (gleichgewichtet über die Auswahl).
  const fromModell: AngebotsartMix = {
    blog_content: 0,
    affiliate: 0,
    produkt: 0,
    dienstleistung: 0,
  }
  for (const m of businessModell) {
    if (m === 'blog') fromModell.blog_content += 1
    else if (m === 'shop') fromModell.produkt += 1
    else if (m === 'dienstleistung') fromModell.dienstleistung += 1
    else if (m === 'affiliate') fromModell.affiliate += 1
  }
  return normalizeAngebotsMix(fromModell)
}

// =====================================================
// Slider-Helfer (generisch, weiter genutzt von Einstellungen + Wizard)
// =====================================================
export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function roundTo5(n: number): number {
  return Math.round(n / 5) * 5
}

// Verschiebt `changedIndex` auf `newValue`, verteilt die Differenz
// proportional auf die übrigen Werte. Snappt alle auf 5er-Schritte und
// korrigiert Rundungsfehler, sodass die Summe immer 100 ergibt.
export function adjustProportional(
  values: number[],
  changedIndex: number,
  newValue: number
): number[] {
  const snapped = clampInt(roundTo5(newValue), 0, 100)
  const others = values
    .map((_, i) => i)
    .filter((i) => i !== changedIndex)
  const otherSum = others.reduce((s, i) => s + values[i], 0)
  const target = 100 - snapped

  const result = [...values]
  result[changedIndex] = snapped

  if (target <= 0) {
    others.forEach((i) => (result[i] = 0))
  } else if (otherSum === 0) {
    const equal = target / others.length
    others.forEach((i) => (result[i] = roundTo5(equal)))
  } else {
    others.forEach(
      (i) => (result[i] = roundTo5((values[i] / otherSum) * target))
    )
  }

  let sum = result.reduce((a, b) => a + b, 0)
  let diff = 100 - sum
  if (diff !== 0) {
    for (const i of others) {
      const next = result[i] + diff
      if (next >= 0 && next <= 100) {
        result[i] = next
        diff = 0
        break
      }
    }
    if (diff !== 0) {
      result[changedIndex] = clampInt(result[changedIndex] + diff, 0, 100)
    }
  }
  return result
}

// =====================================================
// (De-)Serialisierung der Text-Spalten
// =====================================================
export function serializeBusinessModelle(items: BusinessModell[]): string {
  return items.join(',')
}

export function parseBusinessModelle(s: string | null): BusinessModell[] {
  if (!s) return []
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is BusinessModell => isBusinessModell(v))
}

export function serializeContentSaeulen(items: string[]): string {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',')
}

export function parseContentSaeulen(s: string | null): string[] {
  if (!s) return []
  return s
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

// =====================================================
// Datenbank-Zeilenformat (geteilt zwischen Page-Loader & Action)
// =====================================================
export type StrategieRow = {
  strategie_business_modell: string | null
  strategie_hauptnische: string | null
  ziel_soll_blog: number | null
  ziel_soll_shop: number | null
  ziel_soll_etsy: number | null
  ziel_soll_affiliate: number | null
  ziel_soll_landingpage: number | null
  ziel_soll_newsletter: number | null
  ziel_soll_buchung: number | null
  strategie_content_saeulen: string | null
  strategie_pinning_frequenz: string | null
  strategie_onboarding_abgeschlossen: boolean | null
  strategie_letzte_aenderung: string | null
}

export const STRATEGIE_SELECT = `strategie_business_modell, strategie_hauptnische,
       ziel_soll_blog, ziel_soll_shop, ziel_soll_etsy, ziel_soll_affiliate,
       ziel_soll_landingpage, ziel_soll_newsletter, ziel_soll_buchung,
       strategie_content_saeulen, strategie_pinning_frequenz,
       strategie_onboarding_abgeschlossen, strategie_letzte_aenderung`

// Geparste, UI-freundliche Form der gespeicherten Strategie.
export type NeueStrategie = {
  businessModell: BusinessModell[]
  hauptnische: string | null
  zielflaechen: ZielflaechenVerteilung
  contentSaeulen: string[]
  pinningFrequenz: PinningFrequenz | null
  onboardingAbgeschlossen: boolean
  letzteAenderung: string | null
}

export function parseStrategieRow(row: StrategieRow | null): NeueStrategie {
  const frequenzRaw = row?.strategie_pinning_frequenz ?? ''
  return {
    businessModell: parseBusinessModelle(row?.strategie_business_modell ?? null),
    hauptnische: row?.strategie_hauptnische ?? null,
    zielflaechen: {
      blog: row?.ziel_soll_blog ?? 0,
      shop: row?.ziel_soll_shop ?? 0,
      etsy: row?.ziel_soll_etsy ?? 0,
      affiliate: row?.ziel_soll_affiliate ?? 0,
      landingpage: row?.ziel_soll_landingpage ?? 0,
      newsletter: row?.ziel_soll_newsletter ?? 0,
      buchung: row?.ziel_soll_buchung ?? 0,
    },
    contentSaeulen: parseContentSaeulen(row?.strategie_content_saeulen ?? null),
    pinningFrequenz: isPinningFrequenz(frequenzRaw) ? frequenzRaw : null,
    onboardingAbgeschlossen: row?.strategie_onboarding_abgeschlossen === true,
    letzteAenderung: row?.strategie_letzte_aenderung ?? null,
  }
}
