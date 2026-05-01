// Reine Berechnungslogik für die Dashboard-Sektion „Strategie-Check".
// Vergleicht die IST-Verteilung der Pins (letzte 180 Tage) mit der
// SOLL-Strategie aus den Einstellungen.

export const STRATEGIE_CHECK_FENSTER_TAGE = 180
export const STRATEGIE_CHECK_DEFAULT_GELB = 5
export const STRATEGIE_CHECK_DEFAULT_ROT = 15

export type StrategiePinRow = {
  strategie_typ: string | null
  conversion_ziel: string | null
  pin_format: string | null
  created_at: string | null
}

export type StrategieSettings = {
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
  strategie_onboarding_abgeschlossen: boolean | null
  strategie_check_schwelle_gelb: number | null
  strategie_check_schwelle_rot: number | null
}

export type DiffColor = 'green' | 'yellow' | 'red'

export type CheckItem = {
  key: string
  label: string
  ist: number // 0..100
  soll: number // 0..100
  diff: number // ist - soll
  color: DiffColor
  message: string
  recommendation: string | null // null wenn im Plan
}

export type CheckArea = {
  key: 'mix' | 'ziel' | 'format'
  header: string
  items: CheckItem[]
  pinsMitDaten: number
  hasData: boolean
}

export type CoachingItem = {
  area: CheckArea['key']
  label: string
  diff: number
  recommendation: string
}

export type StrategieCheckResult = {
  fensterTage: number
  totalPinsImFenster: number
  // Drei separate Zähler — pro Feld: NULL / '' / undefined zählen als fehlend.
  pinsOhneStrategie: number
  pinsOhneConversion: number
  pinsOhneFormat: number
  onboardingAbgeschlossen: boolean
  schwelleGelb: number
  schwelleRot: number
  areas: CheckArea[]
  coachingTop3: CoachingItem[] // sortiert nach |diff| desc, max 3
  allInPlan: boolean // true wenn coachingTop3 leer und Daten vorhanden
}

// =====================================================
// Filter: nur Pins der letzten 180 Tage
// =====================================================
export function filterPinsLetzte180Tage<T extends { created_at: string | null }>(
  pins: T[],
  todayIso: string
): T[] {
  const cutoff = new Date(todayIso + 'T00:00:00Z')
  cutoff.setUTCDate(cutoff.getUTCDate() - STRATEGIE_CHECK_FENSTER_TAGE)
  const cutoffMs = cutoff.getTime()
  return pins.filter((p) => {
    if (!p.created_at) return false
    const created = new Date(p.created_at).getTime()
    if (Number.isNaN(created)) return false
    return created >= cutoffMs
  })
}

// =====================================================
// Diff-Bewertung
// =====================================================
function evaluateDiff(
  diff: number,
  schwelleGelb: number,
  schwelleRot: number
): { color: DiffColor; message: string } {
  const abs = Math.abs(diff)
  if (abs <= schwelleGelb) {
    return { color: 'green', message: 'im Plan ✓' }
  }
  const richtung = diff > 0 ? 'über Plan' : 'unter Plan'
  const sign = diff > 0 ? '+' : '−'
  const rounded = Math.round(abs)
  if (abs <= schwelleRot) {
    return { color: 'yellow', message: `${sign}${rounded}% ${richtung}` }
  }
  return {
    color: 'red',
    message: `${sign}${rounded}% deutlich ${richtung} ⚠️`,
  }
}

// =====================================================
// Empfehlungs-Templates pro Bereich/Kanal/Richtung
// =====================================================
const RECOMMENDATIONS: Record<
  string,
  { hoch: string; niedrig: string }
> = {
  // Strategie-Mix
  'mix:blog': {
    hoch: 'Blog-Anteil reduzieren – mehr Affiliate- oder Produkt-Pins produzieren.',
    niedrig:
      'Blog-Anteil erhöhen – mehr Pins zu eigenen Blogbeiträgen erstellen.',
  },
  'mix:affiliate': {
    hoch: 'Affiliate-Anteil reduzieren – mehr Blog- oder Produkt-Pins für nachhaltigeren Aufbau.',
    niedrig:
      'Affiliate-Anteil erhöhen – mehr Pins mit Affiliate-Empfehlungen produzieren.',
  },
  'mix:produkt': {
    hoch: 'Produkt-Anteil reduzieren – mehr Blog-Pins für Vertrauensaufbau.',
    niedrig:
      'Produkt-Anteil erhöhen – mehr Pins zu eigenen Produkten und Angeboten.',
  },
  // Conversion-Ziele
  'ziel:traffic': {
    hoch: 'Mehr Pins mit konkretem Lead- oder Sales-Ziel produzieren, nicht nur Traffic-Pins.',
    niedrig:
      'Mehr Pins mit Traffic-Ziel – grundlegende Reichweite ist Voraussetzung für Leads und Sales.',
  },
  'ziel:lead': {
    hoch: 'Auch Sales- und Traffic-Pins produzieren, nicht nur auf Leads fokussieren.',
    niedrig:
      'Mehr Lead-orientierte Pins – z.B. mit Freebie oder Newsletter-Anmeldung als Conversion-Ziel.',
  },
  'ziel:sales': {
    hoch: 'Auch Traffic-Pins für Vertrauensaufbau – nicht nur Verkaufs-Pins.',
    niedrig:
      'Mehr Sales-fokussierte Pins – direkte Produkt- oder Affiliate-Links.',
  },
  // Format-Mix
  'format:standard': {
    hoch: 'Mehr Format-Abwechslung – Pinterest belohnt Video- und Collage-Pins.',
    niedrig:
      'Mehr Standard-Pins – sie sind das SEO-Fundament für nachhaltige Reichweite.',
  },
  'format:video': {
    hoch: 'Auch Standard-Pins produzieren – sie tragen die langfristige SEO-Performance.',
    niedrig:
      'Video-Pins erhöhen die Reichweite deutlich – mindestens 1-2 pro Monat produzieren.',
  },
  'format:collage': {
    hoch: 'Collage-Anteil reduzieren – Standard-Pins bieten verlässlichere SEO-Reichweite.',
    niedrig:
      'Collage-Pins für visuelle Abwechslung – ideal für Vergleiche oder Vorher/Nachher.',
  },
  'format:carousel': {
    hoch: 'Carousel-Anteil reduzieren – Standard- und Video-Pins haben breitere Reichweite.',
    niedrig:
      'Carousel-Pins haben hohe Interaktionsrate – ideal für Schritt-für-Schritt-Inhalte.',
  },
}

function recommendationFor(
  area: CheckArea['key'],
  channelKey: string,
  diff: number,
  schwelleGelb: number
): string | null {
  if (Math.abs(diff) <= schwelleGelb) return null
  const tpl = RECOMMENDATIONS[`${area}:${channelKey}`]
  if (!tpl) return null
  return diff > 0 ? tpl.hoch : tpl.niedrig
}

// =====================================================
// Bereich aus Counts + Soll-Werten bauen
// =====================================================
function buildArea(
  area: CheckArea['key'],
  header: string,
  channels: Array<{ key: string; label: string; ist: number; soll: number }>,
  pinsMitDaten: number,
  schwelleGelb: number,
  schwelleRot: number
): CheckArea {
  const items: CheckItem[] = channels.map((c) => {
    const diff = c.ist - c.soll
    const { color, message } = evaluateDiff(diff, schwelleGelb, schwelleRot)
    return {
      key: c.key,
      label: c.label,
      ist: c.ist,
      soll: c.soll,
      diff,
      color,
      message,
      recommendation: recommendationFor(area, c.key, diff, schwelleGelb),
    }
  })
  return {
    key: area,
    header,
    items,
    pinsMitDaten,
    hasData: pinsMitDaten > 0,
  }
}

// Prozent-Anteil berechnen, auf eine Nachkommastelle runden.
function pct(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count * 1000) / total) / 10
}

// =====================================================
// Hauptfunktion
// =====================================================
export function computeStrategieCheck(
  pins: StrategiePinRow[],
  settings: StrategieSettings | null,
  todayIso: string
): StrategieCheckResult {
  const fenster = filterPinsLetzte180Tage(pins, todayIso)
  const total = fenster.length

  const schwelleGelb =
    settings?.strategie_check_schwelle_gelb ?? STRATEGIE_CHECK_DEFAULT_GELB
  const schwelleRot =
    settings?.strategie_check_schwelle_rot ?? STRATEGIE_CHECK_DEFAULT_ROT
  const onboardingAbgeschlossen =
    settings?.strategie_onboarding_abgeschlossen === true

  // Drei separate Zähler — jeweils Pins, bei denen das jeweilige Feld
  // NULL, leerer String oder undefined ist.
  const pinsOhneStrategie = fenster.filter(
    (p) => !p.strategie_typ?.trim()
  ).length
  const pinsOhneConversion = fenster.filter(
    (p) => !p.conversion_ziel?.trim()
  ).length
  const pinsOhneFormat = fenster.filter((p) => !p.pin_format?.trim()).length

  // ----- Strategie-Mix -----
  const stratPins = fenster.filter((p) => !!p.strategie_typ?.trim())
  const stratTotal = stratPins.length
  const stratCounts = {
    blog_content: stratPins.filter((p) => p.strategie_typ === 'blog_content')
      .length,
    affiliate: stratPins.filter((p) => p.strategie_typ === 'affiliate').length,
    produkt: stratPins.filter((p) => p.strategie_typ === 'produkt').length,
  }
  const mixArea = buildArea(
    'mix',
    'Wie verteilen sich deine Pins auf die drei Hauptstrategien?',
    [
      {
        key: 'blog',
        label: 'Blog/Content',
        ist: pct(stratCounts.blog_content, stratTotal),
        soll: settings?.strategie_soll_blog ?? 0,
      },
      {
        key: 'affiliate',
        label: 'Affiliate',
        ist: pct(stratCounts.affiliate, stratTotal),
        soll: settings?.strategie_soll_affiliate ?? 0,
      },
      {
        key: 'produkt',
        label: 'Produkt',
        ist: pct(stratCounts.produkt, stratTotal),
        soll: settings?.strategie_soll_produkt ?? 0,
      },
    ],
    stratTotal,
    schwelleGelb,
    schwelleRot
  )

  // ----- Conversion-Ziele -----
  const zielPins = fenster.filter((p) => !!p.conversion_ziel?.trim())
  const zielTotal = zielPins.length
  const zielCounts = {
    traffic: zielPins.filter((p) => p.conversion_ziel === 'traffic').length,
    lead: zielPins.filter((p) => p.conversion_ziel === 'lead').length,
    sales: zielPins.filter((p) => p.conversion_ziel === 'sales').length,
  }
  const zielArea = buildArea(
    'ziel',
    'Welche Ziele verfolgen deine Pins?',
    [
      {
        key: 'traffic',
        label: 'Traffic',
        ist: pct(zielCounts.traffic, zielTotal),
        soll: settings?.ziel_soll_traffic ?? 0,
      },
      {
        key: 'lead',
        label: 'Lead',
        ist: pct(zielCounts.lead, zielTotal),
        soll: settings?.ziel_soll_lead ?? 0,
      },
      {
        key: 'sales',
        label: 'Sales',
        ist: pct(zielCounts.sales, zielTotal),
        soll: settings?.ziel_soll_sales ?? 0,
      },
    ],
    zielTotal,
    schwelleGelb,
    schwelleRot
  )

  // ----- Format-Mix (nur die 4 abgedeckten Formate) -----
  const FORMAT_KEYS = ['standard', 'video', 'collage', 'carousel'] as const
  const formatPins = fenster.filter(
    (p) =>
      !!p.pin_format?.trim() &&
      (FORMAT_KEYS as readonly string[]).includes(p.pin_format)
  )
  const formatTotal = formatPins.length
  const formatCounts = {
    standard: formatPins.filter((p) => p.pin_format === 'standard').length,
    video: formatPins.filter((p) => p.pin_format === 'video').length,
    collage: formatPins.filter((p) => p.pin_format === 'collage').length,
    carousel: formatPins.filter((p) => p.pin_format === 'carousel').length,
  }
  const formatArea = buildArea(
    'format',
    'Welche Pin-Formate nutzt du im Vergleich zur Pinterest-Empfehlung?',
    [
      {
        key: 'standard',
        label: 'Standard',
        ist: pct(formatCounts.standard, formatTotal),
        soll: settings?.format_soll_standard ?? 0,
      },
      {
        key: 'video',
        label: 'Video',
        ist: pct(formatCounts.video, formatTotal),
        soll: settings?.format_soll_video ?? 0,
      },
      {
        key: 'collage',
        label: 'Collage',
        ist: pct(formatCounts.collage, formatTotal),
        soll: settings?.format_soll_collage ?? 0,
      },
      {
        key: 'carousel',
        label: 'Carousel',
        ist: pct(formatCounts.carousel, formatTotal),
        soll: settings?.format_soll_carousel ?? 0,
      },
    ],
    formatTotal,
    schwelleGelb,
    schwelleRot
  )

  const areas: CheckArea[] = [mixArea, zielArea, formatArea]

  // ----- Coaching: Top 3 Abweichungen mit Empfehlung -----
  // Nur aus Bereichen mit hasData. Nur wenn Onboarding abgeschlossen — sonst
  // gibt es ja keine Soll-Werte zu vergleichen.
  const coachingCandidates: CoachingItem[] = []
  if (onboardingAbgeschlossen) {
    for (const area of areas) {
      if (!area.hasData) continue
      for (const item of area.items) {
        if (!item.recommendation) continue
        coachingCandidates.push({
          area: area.key,
          label: item.label,
          diff: item.diff,
          recommendation: item.recommendation,
        })
      }
    }
    coachingCandidates.sort(
      (a, b) => Math.abs(b.diff) - Math.abs(a.diff)
    )
  }
  const coachingTop3 = coachingCandidates.slice(0, 3)

  const hasAnyData =
    mixArea.hasData || zielArea.hasData || formatArea.hasData
  const allInPlan =
    onboardingAbgeschlossen && hasAnyData && coachingTop3.length === 0

  return {
    fensterTage: STRATEGIE_CHECK_FENSTER_TAGE,
    totalPinsImFenster: total,
    pinsOhneStrategie,
    pinsOhneConversion,
    pinsOhneFormat,
    onboardingAbgeschlossen,
    schwelleGelb,
    schwelleRot,
    areas,
    coachingTop3,
    allInPlan,
  }
}
