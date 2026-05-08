// Erklär-Daten für das Pin-Lebenszyklus-Diagramm.
// Reines Inhalts-Modul — keine Berechnung, keine Logik. Wird von der
// Strategie-Seite (Vollversion) und vom Analytics-Top-Pins-Tab (Compact-
// Variante) gelesen.
//
// Schwellenwerte (65 Tage, 300 Impressionen, 500 Impressionen, 180 Tage…)
// sind Settings-gesteuert. Die Konstanten unten enthalten Platzhalter-Texte
// nur für statische Bestandteile; die zahlenhaltigen Texte werden über
// `getLifecycleDetails(thresholds)` und `getArrowLabels(thresholds)` zur
// Laufzeit gerendert.

import type { PinAnalyticsThresholds } from '@/app/dashboard/analytics/utils'

export type LifecycleSlug =
  | 'noch-zu-frueh'
  | 'hidden-gem'
  | 'top-performer'
  | 'reichweite-ohne-wirkung'
  | 'eingeschlafener-gewinner'
  | 'stiller-pin'

export type LifecycleCategory = {
  slug: LifecycleSlug
  emoji: string
  name: string
  // Box-Titel mehrzeilig (für engen Platz im SVG, V2.3.6). Render rendert
  // das Array Zeile für Zeile; einzeilige Namen sind 1-Element-Arrays.
  nameLines: string[]
  // Kurze Handlung unter dem Titel.
  shortAction: string
  // SVG-Position (in viewBox-Koordinaten). Boxen sind 110×60.
  x: number
  y: number
  width: number
  height: number
  // Tailwind-Klassen für Detail-Block / Mobile-Liste / Mini-Pillen.
  bgClass: string
  borderClass: string
  // SVG-Füllfarbe (hex, weil <rect fill="..."> kein Tailwind versteht).
  svgFill: string
  svgStroke: string
}

// Layout: 3 Spalten × 3 Zeilen-Cluster (V2.3.6 — Boxen ein Drittel kleiner).
//   Spalte 1 (links):  x=20…130 — „Noch zu früh"
//   Spalte 2 (mitte):  x=210…320 — Hidden Gem / Top Performer / Reichweite o.W.
//   Spalte 3 (rechts): x=400…510 — Eingeschlafener Gewinner / Stiller Pin
//   Zeilen: y=20…80 (oben), y=140…200 (mitte), y=260…320 (unten)
//   Korridore zwischen Spalten: 80px (Platz für Pfeil-Beschriftungen).
export const LIFECYCLE_CATEGORIES: LifecycleCategory[] = [
  {
    slug: 'noch-zu-frueh',
    emoji: '⏳',
    name: 'Noch zu früh',
    nameLines: ['Noch zu früh'],
    shortAction: 'Abwarten',
    x: 20,
    y: 20,
    width: 110,
    height: 60,
    bgClass: 'bg-gray-100',
    borderClass: 'border-gray-300',
    svgFill: '#f3f4f6',
    svgStroke: '#9ca3af',
  },
  {
    slug: 'hidden-gem',
    emoji: '💎',
    name: 'Hidden Gem',
    nameLines: ['Hidden Gem'],
    shortAction: 'SEO schärfen',
    x: 210,
    y: 20,
    width: 110,
    height: 60,
    bgClass: 'bg-purple-100',
    borderClass: 'border-purple-400',
    svgFill: '#f3e8ff',
    svgStroke: '#a855f7',
  },
  {
    slug: 'top-performer',
    emoji: '⭐',
    name: 'Aktiver Top Performer',
    nameLines: ['Aktiver Top', 'Performer'],
    shortAction: 'Varianten bauen',
    x: 210,
    y: 140,
    width: 110,
    height: 60,
    bgClass: 'bg-green-100',
    borderClass: 'border-green-500',
    svgFill: '#dcfce7',
    svgStroke: '#22c55e',
  },
  {
    slug: 'reichweite-ohne-wirkung',
    emoji: '🔧',
    name: 'Reichweite ohne Wirkung',
    nameLines: ['Reichweite ohne', 'Wirkung'],
    shortAction: 'Cover & Hook optimieren',
    x: 210,
    y: 260,
    width: 110,
    height: 60,
    bgClass: 'bg-amber-100',
    borderClass: 'border-amber-400',
    svgFill: '#fef3c7',
    svgStroke: '#f59e0b',
  },
  {
    slug: 'eingeschlafener-gewinner',
    emoji: '♻️',
    name: 'Eingeschlafener Gewinner',
    nameLines: ['Eingeschlafener', 'Gewinner'],
    shortAction: 'Recyceln',
    x: 400,
    y: 140,
    width: 110,
    height: 60,
    bgClass: 'bg-teal-100',
    borderClass: 'border-teal-400',
    svgFill: '#ccfbf1',
    svgStroke: '#14b8a6',
  },
  {
    slug: 'stiller-pin',
    emoji: '💤',
    name: 'Stiller Pin',
    nameLines: ['Stiller Pin'],
    shortAction: 'Archivieren',
    x: 400,
    y: 260,
    width: 110,
    height: 60,
    bgClass: 'bg-gray-200',
    borderClass: 'border-gray-400',
    svgFill: '#e5e7eb',
    svgStroke: '#6b7280',
  },
]

export type LifecycleDetail = {
  slug: LifecycleSlug
  was: string
  wieKommtEr: string[]
  wasPassiert: string[]
  handlung: string
}

// Detail-Texte mit eingesetzten Schwellwerten. Nimmt die aktuellen Settings
// (Schwellen aus der Einstellungen-Seite) entgegen, damit das Diagramm immer
// das wiedergibt, was die Diagnose-Logik wirklich nutzt.
export function getLifecycleDetails(
  t: PinAnalyticsThresholds
): Record<LifecycleSlug, LifecycleDetail> {
  return {
    'top-performer': {
      slug: 'top-performer',
      was: 'Pinterest spielt diesen Pin gut aus UND viele Menschen klicken durch. Beides funktioniert.',
      wieKommtEr: [
        'Aus „Hidden Gem", sobald Save-Rate ebenfalls stark wird',
        'Direkt aus „Noch zu früh" bei sehr starken Pins',
      ],
      wasPassiert: [
        `Bleibt aktiv solange Pin-Alter unter ${t.topPerformerMaxAlter} Tagen`,
        `Wandert zu „Eingeschlafener Gewinner" wenn Pin älter als ${t.schlafenderGewinnerAlter} Tage`,
        'Kann zu „Reichweite ohne Wirkung" werden wenn Saves einbrechen',
      ],
      handlung:
        'Erstelle 2–3 Varianten in den nächsten 1–2 Wochen, solange Pinterest ihn pusht.',
    },
    'hidden-gem': {
      slug: 'hidden-gem',
      was: 'Wer diesen Pin sieht, klickt überdurchschnittlich oft durch. Aber Pinterest zeigt ihn fast niemandem.',
      wieKommtEr: [
        `Aus „Noch zu früh", sobald ${t.minImpCtrUrteil}+ Impressionen und CTR überdurchschnittlich`,
        'Direkt nach Veröffentlichung bei schnell starker CTR',
      ],
      wasPassiert: [
        'Idealfall: wandert zu „Aktiver Top Performer" nach Keyword-Optimierung',
        'Stagnation: bleibt Hidden Gem wenn SEO-Hebel nicht genutzt',
        `${t.beobachtungszeitraum}+ Tage ohne Verbesserung: kann zu „Stiller Pin" werden`,
      ],
      handlung:
        'Neuen Pin mit demselben Cover, aber überarbeiteten Keywords erstellen. Board-Zuordnung prüfen.',
    },
    'reichweite-ohne-wirkung': {
      slug: 'reichweite-ohne-wirkung',
      was: 'Pinterest spielt diesen Pin gut aus, viele sehen ihn — aber kaum jemand klickt durch.',
      wieKommtEr: [
        `Aus „Noch zu früh", sobald ${t.minImpReichweiteStark}+ Impressionen und CTR unter Median`,
        'Aus „Aktiver Top Performer" wenn CTR einbricht aber Saves bleiben',
      ],
      wasPassiert: [
        'Mit Aktion: wandert zu „Aktiver Top Performer" wenn neues Cover Klicks bringt',
        'Ohne Aktion: wandert zu „Stiller Pin" wenn Saves auch einbrechen',
      ],
      handlung:
        'Neuen Pin mit anderem Cover: stärkerer Hook, größere Schrift, klareres Versprechen.',
    },
    'eingeschlafener-gewinner': {
      slug: 'eingeschlafener-gewinner',
      was: 'Dieser Pin lief früher stark, aber Pinterest priorisiert frische Inhalte.',
      wieKommtEr: [
        `Aus „Aktiver Top Performer", sobald Pin älter als ${t.schlafenderGewinnerAlter} Tage`,
        'Pin muss historisch Mindest-Klicks erfüllt haben',
      ],
      wasPassiert: [
        'Mit Aktion: neuer Pin startet als „Noch zu früh" und kann neuer Top Performer werden',
        'Ohne Aktion: bleibt in dieser Kategorie, Reichweite sinkt weiter',
      ],
      handlung:
        'Recyceln. Neue Variante mit frischem Design und aktualisierten Keywords erstellen.',
    },
    'stiller-pin': {
      slug: 'stiller-pin',
      was: 'Weder Pinterest noch Nutzer reagieren. Der Pin hatte genug Zeit, hat aber nicht funktioniert.',
      wieKommtEr: [
        `Aus „Noch zu früh", ${t.beobachtungszeitraum}+ Tage und ${t.minImpCtrUrteil}+ Imp ohne Signal`,
        'Aus „Reichweite ohne Wirkung" wenn Saves langfristig einbrechen',
      ],
      wasPassiert: [
        'Keine Veränderung ohne Re-Design',
        'System klassifiziert ihn weiterhin als Stiller Pin',
      ],
      handlung:
        'Archivieren oder komplett neuer Pin mit anderem Cover, Winkel und Keywords.',
    },
    'noch-zu-frueh': {
      slug: 'noch-zu-frueh',
      was: 'Zu wenig Daten für eine ehrliche Bewertung. Pin noch jung oder nicht oft genug ausgespielt.',
      wieKommtEr: [
        'Direkt nach Veröffentlichung — alle neuen Pins starten hier',
        'Bei jedem Import wird neu geprüft ob genug Daten vorhanden',
      ],
      wasPassiert: [
        'Starke CTR + wenig Reichweite → Hidden Gem',
        'Starke Saves + Klicks → Aktiver Top Performer',
        'Reichweite ohne Klicks → Reichweite ohne Wirkung',
        `Kein Signal nach ${t.beobachtungszeitraum} Tagen → Stiller Pin`,
      ],
      handlung:
        'Abwarten. Nicht voreilig optimieren. Beim nächsten Import wird automatisch neu geprüft.',
    },
  }
}

// Pfeil-Labels — jeweils Bedeutung (main) und technische Bedingung
// (condition). Beide als String-Arrays, weil SVG kein Wrapping kann; jede
// Zeile wird einzeln als <text> gerendert.
//
// `main`-Zeilen sind anfänger-orientiert: was bedeutet dieser Übergang für
// den Pin? `condition` zeigt die exakte technische Bedingung — wo möglich
// mit echten Werten aus dem User-Median (`t.medianCtr × t.ctrBoostFaktor`
// bzw. `t.medianSaveRate`). Wenn kein Median vorhanden ist (zu wenig
// qualifizierte Pins), fällt die Condition auf den abstrakten
// „über Durchschnitt"-Text zurück.
export type ArrowLabel = {
  main: string[]
  condition: string[]
}

export type ArrowLabels = {
  zuHiddenGem: ArrowLabel
  zuTopPerformerVonHiddenGem: ArrowLabel
  zuTopPerformerDirekt: ArrowLabel
  zuReichweiteOhneWirkung: ArrowLabel
  langWegStillerPin: ArrowLabel
  zuEingeschlafenerGewinner: ArrowLabel
  coverFunktioniert: ArrowLabel
  savesEinbrechen: ArrowLabel
}

function formatProzent(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} %`
}

export function getArrowLabels(t: PinAnalyticsThresholds): ArrowLabels {
  const ctrSchwelle =
    t.medianCtr != null ? formatProzent(t.medianCtr * t.ctrBoostFaktor) : null
  const saveRateSchwelle =
    t.medianSaveRate != null ? formatProzent(t.medianSaveRate) : null

  return {
    zuHiddenGem: {
      main: ['Pin wird geklickt,', 'aber kaum ausgespielt'],
      condition: [
        ctrSchwelle
          ? `CTR über Ø (z. B. > ${ctrSchwelle})`
          : 'CTR über Durchschnitt',
      ],
    },
    // V2.3.6 Fix 5: Kausalität korrigiert. Pinterest reagiert auf gestiegene
    // Save-Rate, die durch Keyword-Optimierung (Nutzer-Aktion) entsteht.
    zuTopPerformerVonHiddenGem: {
      main: ['Mehr ausgespielt', 'und mehr Saves'],
      condition: saveRateSchwelle
        ? [`Save-Rate über ${saveRateSchwelle}`, 'nach Keyword-Optimierung']
        : ['Save-Rate über Durchschnitt', 'nach Keyword-Optimierung'],
    },
    // V2.3.6 Fix 4: Konkretisiert — die drei Erfolgs-Indikatoren benannt.
    zuTopPerformerDirekt: {
      main: ['Pin wird ausgespielt,', 'geklickt und gespeichert'],
      condition: ['CTR + Save-Rate über Durchschnitt'],
    },
    zuReichweiteOhneWirkung: {
      main: ['Wird gut ausgespielt,', 'aber kaum geklickt'],
      condition: [
        `${t.minImpReichweiteStark}+ Imp, CTR unter Durchschnitt`,
      ],
    },
    // V2.3.6 Fix 3: „Pin geht ein" → „Pin schläft ein" (passt zum 💤-Symbol
    // der Stiller-Pin-Box, weniger dramatisch).
    langWegStillerPin: {
      main: ['Pin schläft ein'],
      condition: [`${t.beobachtungszeitraum}+ Tage ohne Reaktion`],
    },
    zuEingeschlafenerGewinner: {
      main: ['Pinterest verliert', 'Interesse'],
      condition: [`nach ${t.schlafenderGewinnerAlter}+ Tagen`],
    },
    coverFunktioniert: {
      main: ['Cover funktioniert'],
      condition: ['nach Pin-Optimierung'],
    },
    savesEinbrechen: {
      main: ['Saves gehen', 'runter'],
      condition: [],
    },
  }
}

export type PinJourneyStep = {
  tag: string
  slug: LifecycleSlug
}

export type PinJourney = {
  titel: string
  steps: PinJourneyStep[]
  aktion: string
}

// Tag-Werte sind illustrativ hartcodiert — Beispiele zeigen typische
// Zeitpunkte, nicht systemische Regeln.
export const PIN_JOURNEYS: PinJourney[] = [
  {
    titel: 'Pin-Reise A — der erfolgreiche Pin',
    steps: [
      { tag: 'Tag 1–30', slug: 'noch-zu-frueh' },
      { tag: 'Tag 35', slug: 'hidden-gem' },
      { tag: 'Tag 50', slug: 'top-performer' },
      { tag: 'Tag 200', slug: 'eingeschlafener-gewinner' },
    ],
    aktion: 'Recyceln mit frischem Cover',
  },
  {
    titel: 'Pin-Reise B — Cover & Hook funktionieren nicht',
    steps: [
      { tag: 'Tag 1–40', slug: 'noch-zu-frueh' },
      { tag: 'Tag 60', slug: 'reichweite-ohne-wirkung' },
      { tag: 'Tag 90', slug: 'stiller-pin' },
    ],
    aktion:
      'Schon bei Tag 60 neuen Pin mit anderem Cover & Hook erstellen — bevor Pin „kalt“ wird',
  },
  {
    titel: 'Pin-Reise C — der Schläfer',
    steps: [
      { tag: 'Tag 1–65', slug: 'noch-zu-frueh' },
      { tag: 'Tag 70+', slug: 'stiller-pin' },
    ],
    aktion: 'Archivieren oder komplett neu konzipieren',
  },
  {
    titel: 'Pin-Reise D — der versteckte Schatz (SEO/Keyword-Problem)',
    // Zwei Hidden-Gem-Phasen sind Absicht: ohne Keyword-Korrektur bleibt
    // der Pin in dieser Kategorie stehen — Pinterest verbreitet ihn nicht.
    steps: [
      { tag: 'Tag 1–25', slug: 'noch-zu-frueh' },
      { tag: 'Tag 30', slug: 'hidden-gem' },
      { tag: 'Tag 60', slug: 'hidden-gem' },
    ],
    aktion:
      'Neuen Pin mit gleichem Cover erstellen, aber überarbeiteten Keywords im Titel und in der Beschreibung. Eventuell auf ein anderes Board pinnen, falls das aktuelle Board thematisch nicht ideal passt.',
  },
]

export function getCategory(slug: LifecycleSlug): LifecycleCategory {
  const c = LIFECYCLE_CATEGORIES.find((x) => x.slug === slug)
  if (!c) throw new Error(`Unknown lifecycle slug: ${slug}`)
  return c
}
