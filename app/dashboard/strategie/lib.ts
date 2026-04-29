// Domain-Logik für Tab 1 „Meine Strategie": Optionen für Wizard,
// regelbasierte Empfehlung, Slider-Helfer und (De-)Serialisierung.
// Reine Funktionen — kein React, kein Supabase. Wird sowohl von der
// Strategie-Seite als auch von der Einstellungen-Sektion genutzt.

export type BusinessModell =
  | 'blog_werbung'
  | 'kurs_anbieter'
  | 'affiliate'
  | 'shop'
  | 'coaching'
  | 'mix'
  | 'anderes'

export type Hauptziel =
  | 'traffic'
  | 'leads'
  | 'eigene_sales'
  | 'affiliate_sales'
  | 'bekanntheit'

export type VorhandenItem =
  | 'blog'
  | 'digitale_produkte'
  | 'physische_produkte'
  | 'affiliate'
  | 'newsletter'
  | 'coaching'
  | 'nichts'

export const BUSINESS_MODELL_OPTIONS: ReadonlyArray<{
  value: BusinessModell
  label: string
  kurz: string
  mix: { blog: number; affiliate: number; produkt: number }
}> = [
  {
    value: 'blog_werbung',
    label: 'Blog mit Werbung und/oder Affiliate-Einnahmen',
    kurz: 'Blog-Betreiber',
    mix: { blog: 80, affiliate: 20, produkt: 0 },
  },
  {
    value: 'kurs_anbieter',
    label: 'Online-Kurs- oder digitales Produkt-Anbieter',
    kurz: 'Kurs-Anbieter',
    mix: { blog: 40, affiliate: 0, produkt: 60 },
  },
  {
    value: 'affiliate',
    label: 'Reines Affiliate-Marketing (über Pinterest oder Blog)',
    kurz: 'Affiliate-Marketer',
    mix: { blog: 30, affiliate: 70, produkt: 0 },
  },
  {
    value: 'shop',
    label: 'Physischer Online-Shop',
    kurz: 'Shop-Betreiber',
    mix: { blog: 20, affiliate: 0, produkt: 80 },
  },
  {
    value: 'coaching',
    label: 'Coaching, Beratung oder Dienstleistungen',
    kurz: 'Coach/Berater',
    mix: { blog: 50, affiliate: 0, produkt: 50 },
  },
  {
    value: 'mix',
    label: 'Mix aus mehreren Bereichen (Content-Creator)',
    kurz: 'Content-Creator',
    mix: { blog: 50, affiliate: 30, produkt: 20 },
  },
  {
    value: 'anderes',
    label: 'Anderes',
    kurz: 'Pinterest-Nutzer',
    mix: { blog: 50, affiliate: 30, produkt: 20 },
  },
]

export const HAUPTZIEL_OPTIONS: ReadonlyArray<{
  value: Hauptziel
  label: string
  kurz: string
  ziele: { traffic: number; lead: number; sales: number }
}> = [
  {
    value: 'traffic',
    label: 'Mehr Website-Traffic generieren',
    kurz: 'mehr Website-Traffic',
    ziele: { traffic: 70, lead: 20, sales: 10 },
  },
  {
    value: 'leads',
    label: 'Mehr E-Mail-Abonnenten / Leads gewinnen',
    kurz: 'mehr Leads/Abonnenten',
    ziele: { traffic: 30, lead: 60, sales: 10 },
  },
  {
    value: 'eigene_sales',
    label: 'Mehr Verkäufe meiner eigenen Produkte',
    kurz: 'mehr eigene Verkäufe',
    ziele: { traffic: 30, lead: 20, sales: 50 },
  },
  {
    value: 'affiliate_sales',
    label: 'Mehr Affiliate-Provisionen verdienen',
    kurz: 'mehr Affiliate-Provisionen',
    ziele: { traffic: 40, lead: 10, sales: 50 },
  },
  {
    value: 'bekanntheit',
    label: 'Markenbekanntheit aufbauen',
    kurz: 'mehr Markenbekanntheit',
    ziele: { traffic: 60, lead: 30, sales: 10 },
  },
]

export const VORHANDEN_OPTIONS: ReadonlyArray<{
  value: VorhandenItem
  label: string
}> = [
  { value: 'blog', label: 'Blog/Website mit Inhalten' },
  {
    value: 'digitale_produkte',
    label: 'Eigene digitale Produkte (E-Book, Kurs, etc.)',
  },
  { value: 'physische_produkte', label: 'Eigene physische Produkte' },
  { value: 'affiliate', label: 'Affiliate-Partnerschaften (Provisionen)' },
  { value: 'newsletter', label: 'E-Mail-Liste / Newsletter' },
  { value: 'coaching', label: 'Coaching- oder Beratungs-Angebote' },
  { value: 'nichts', label: 'Noch nichts davon – ich starte gerade' },
]

export const STRATEGIE_DEFAULT_FORMAT_MIX = {
  standard: 60,
  video: 20,
  collage: 10,
  carousel: 10,
} as const

// =====================================================
// Slider-Helfer
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

  // Rundungs-Fix: Differenz auf den ersten passenden anderen Slider
  // anwenden, sonst zurück auf den geänderten.
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
// Empfehlungs-Logik (regelbasiert)
// =====================================================

export type RecommendationResult = {
  mix: { blog: number; affiliate: number; produkt: number }
  ziele: { traffic: number; lead: number; sales: number }
  begruendung: string
}

export function computeRecommendation(
  modell: BusinessModell,
  hauptziel: Hauptziel,
  vorhanden: VorhandenItem[]
): RecommendationResult {
  const modellOpt = BUSINESS_MODELL_OPTIONS.find((o) => o.value === modell)
  const base = modellOpt?.mix ?? { blog: 50, affiliate: 30, produkt: 20 }
  const mix = { ...base }

  const hasBlog = vorhanden.includes('blog')
  const hasOwn =
    vorhanden.includes('digitale_produkte') ||
    vorhanden.includes('physische_produkte') ||
    vorhanden.includes('coaching')
  const hasAff = vorhanden.includes('affiliate')

  if (!hasBlog) mix.blog = 0
  if (!hasOwn) mix.produkt = 0
  if (!hasAff) mix.affiliate = 0

  const sum = mix.blog + mix.affiliate + mix.produkt
  if (sum === 0) {
    // Anwender hat noch nichts → konservativer Standard
    mix.blog = 50
    mix.affiliate = 30
    mix.produkt = 20
  } else {
    const scale = 100 / sum
    mix.blog = roundTo5(mix.blog * scale)
    mix.affiliate = roundTo5(mix.affiliate * scale)
    mix.produkt = roundTo5(mix.produkt * scale)
    const total = mix.blog + mix.affiliate + mix.produkt
    const diff = 100 - total
    if (diff !== 0) {
      const arr: Array<['blog' | 'affiliate' | 'produkt', number]> = [
        ['blog', mix.blog],
        ['affiliate', mix.affiliate],
        ['produkt', mix.produkt],
      ]
      arr.sort((a, b) => b[1] - a[1])
      const [largestKey] = arr[0]
      mix[largestKey] = clampInt(mix[largestKey] + diff, 0, 100)
    }
  }

  const zielOpt = HAUPTZIEL_OPTIONS.find((o) => o.value === hauptziel)
  const ziele = zielOpt?.ziele ?? { traffic: 50, lead: 30, sales: 20 }

  const dominant =
    mix.blog >= mix.affiliate && mix.blog >= mix.produkt
      ? 'Blog-Content'
      : mix.affiliate >= mix.produkt
        ? 'Affiliate-Empfehlungen'
        : 'eigene Produkte'

  let vorhandenText = 'noch keinen Content-Stack'
  const realItems = vorhanden.filter((v) => v !== 'nichts')
  if (realItems.length > 0) {
    const labels = realItems.map(
      (v) =>
        VORHANDEN_OPTIONS.find((o) => o.value === v)?.label ?? v
    )
    if (labels.length === 1) {
      vorhandenText = labels[0]
    } else if (labels.length === 2) {
      vorhandenText = labels.join(' und ')
    } else {
      vorhandenText =
        labels.slice(0, -1).join(', ') +
        ' und ' +
        labels[labels.length - 1]
    }
  }

  const modellKurz = modellOpt?.kurz ?? 'Pinterest-Nutzer'
  const zielKurz = zielOpt?.kurz ?? 'Reichweite'

  const begruendung =
    `Da du als ${modellKurz} hauptsächlich ${zielKurz} erreichen willst und ` +
    `bereits ${vorhandenText} hast, empfehlen wir den Schwerpunkt auf ` +
    `${dominant} zu legen.`

  return { mix, ziele, begruendung }
}

// Empfehlungs-Hinweis unterhalb der Zusammenfassung in Zustand C.
export function getEmpfehlungstext(
  blog: number,
  affiliate: number,
  produkt: number
): string | null {
  if (produkt > 50)
    return 'Empfehlung: Fokussiere deine Pins auf direkte Produkt-Seiten mit klaren Kaufimpulsen.'
  if (affiliate > 50)
    return 'Empfehlung: Nutze Blog-Beiträge als Brücke zu Affiliate-Links für mehr Vertrauen.'
  if (blog > 50)
    return 'Empfehlung: Produziere Evergreen-Content der langfristig Traffic bringt.'
  return null
}

// =====================================================
// Vorhanden-Serialisierung (TEXT-Spalte → Array)
// =====================================================

export function serializeVorhanden(items: VorhandenItem[]): string {
  return items.join(',')
}

export function parseVorhanden(s: string | null): VorhandenItem[] {
  if (!s) return []
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is VorhandenItem =>
      VORHANDEN_OPTIONS.some((o) => o.value === v)
    )
}

// =====================================================
// Datenbank-Zeilenformat (geteilt zwischen Page-Loader & Client)
// =====================================================

export type StrategieRow = {
  strategie_soll_blog: number | null
  strategie_soll_affiliate: number | null
  strategie_soll_produkt: number | null
  ziel_soll_traffic: number | null
  ziel_soll_lead: number | null
  ziel_soll_sales: number | null
  format_soll_standard: number | null
  format_soll_video: number | null
  format_soll_collage: number | null
  format_soll_carousel: number | null
  strategie_business_modell: string | null
  strategie_hauptziel: string | null
  strategie_vorhanden: string | null
  strategie_letzte_aenderung: string | null
  strategie_onboarding_abgeschlossen: boolean | null
}

export const STRATEGIE_SELECT = `strategie_soll_blog, strategie_soll_affiliate, strategie_soll_produkt,
       ziel_soll_traffic, ziel_soll_lead, ziel_soll_sales,
       format_soll_standard, format_soll_video, format_soll_collage, format_soll_carousel,
       strategie_business_modell, strategie_hauptziel, strategie_vorhanden,
       strategie_letzte_aenderung, strategie_onboarding_abgeschlossen`
