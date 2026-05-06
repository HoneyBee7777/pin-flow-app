// Pin-Klassifikation V2.
//
// Zwei-Achsen-Logik:
//   - Algorithmus-Signal stark = Save-Rate ≥ Median UND Impressionen ≥ Hard-Floor
//   - Nutzer-Signal stark      = CTR ≥ Median × Boost UND Klicks ≥ Hard-Floor
//                                UND Impressionen ≥ CTR-Urteil-Floor
//
// Daraus ergeben sich:
//   - Beide Signale stark + jung   → Aktiver Top Performer ⭐
//   - Beide Signale stark + alt    → Eingeschlafener Gewinner ♻️
//   - Nur Nutzer-Signal stark      → Hidden Gem 💎
//   - Nur Algorithmus-Signal stark → Reichweite ohne Wirkung 🔧
//   - Kein Signal + reif           → Stiller Pin 💤
//   - Zu jung / zu wenig Daten     → Noch zu früh ⏳

import type { PinAnalyticsThresholds } from './utils'

export const PIN_DIAGNOSE_KEYS = [
  'kein_datum',
  'noch_zu_frueh',
  'aktiver_top_performer',
  'eingeschlafener_gewinner',
  'hidden_gem',
  'reichweite_ohne_wirkung',
  'stiller_pin',
] as const

export type PinDiagnose = (typeof PIN_DIAGNOSE_KEYS)[number]

type DiagnoseMeta = {
  label: string
  handlungText: string
  emoji: string
  badge: string
}

// Lange Tooltip-Texte pro Diagnose-Kategorie — Struktur: Klartext-Erklärung,
// "Was tun", "Wie wir das erkennen". Werden im Dashboard und auf dem
// Analytics-Tab als ⓘ-Tooltip neben dem Kategorie-Namen angezeigt.
export const PIN_DIAGNOSE_TOOLTIP: Record<PinDiagnose, string> = {
  kein_datum:
    'Für diesen Pin fehlt das Veröffentlichungsdatum in der Datenbank. Wir können nicht berechnen, wie alt er ist.\n\nWas tun: Den Pin in der Pin-Produktion bearbeiten und das Datum nachtragen.',
  noch_zu_frueh:
    'Wir haben zu wenig Daten für eine ehrliche Bewertung. Entweder ist der Pin noch jung oder Pinterest hat ihn noch nicht oft genug ausgespielt.\n\nWas tun: Abwarten. Nicht voreilig optimieren — beim nächsten Daten-Import prüfen wir automatisch neu.\n\nWie wir das erkennen: Pin jünger als 65 Tage und unter 500 Impressionen — ODER weniger als 300 Impressionen, egal wie alt. Bei kleinen Stichproben sind Klickraten Glückssache, kein Muster.',
  aktiver_top_performer:
    'Pinterest spielt diesen Pin gut aus UND viele Menschen klicken durch zu deiner Website. Beides funktioniert — das ist die Idealkombination.\n\nWas tun: Mehr davon! Erstelle 2–3 Varianten dieses Pins in den nächsten 1–2 Wochen, solange Pinterest ihn pusht.\n\nWie wir das erkennen: Saves und Klicks liegen über deinem persönlichen Durchschnitt. Mindestens 5 Klicks insgesamt. Pin jünger als 90 Tage.',
  eingeschlafener_gewinner:
    'Dieser Pin lief früher stark, kommt aber jetzt aus dem Tritt. Pinterest priorisiert frische Inhalte — alte Pins verlieren irgendwann an Reichweite.\n\nWas tun: Recyceln. Erstelle einen neuen Pin mit überarbeitetem Design (anderer Bildhintergrund, neuer Hook), aber gleichem Link und Board.\n\nWie wir das erkennen: Der Pin ist älter als 180 Tage und hatte historisch gute Klickzahlen.',
  hidden_gem:
    'Wer diesen Pin sieht, klickt überdurchschnittlich oft durch. Aber Pinterest zeigt ihn fast niemandem. Verschenktes Potenzial.\n\nWas tun: Erstelle einen neuen Pin mit demselben Cover, aber überarbeite Titel, Beschreibung und Keywords. Prüfe auch ob ein anderes Board besser passt.\n\nWie wir das erkennen: Die Klickrate ist deutlich überdurchschnittlich, aber Pinterest spielt den Pin nur wenig aus.',
  reichweite_ohne_wirkung:
    'Pinterest spielt diesen Pin gut aus, viele Menschen sehen ihn — aber kaum jemand klickt durch. Das Cover oder der Hook funktioniert nicht.\n\nWas tun: Erstelle einen neuen Pin mit anderem Cover-Design: stärkerer Hook-Text, größere Schrift, klareres Versprechen. Link und Keywords kannst du gleich lassen.\n\nWie wir das erkennen: Pinterest gibt dem Pin viel Reichweite (mind. 500 Impressionen) und Menschen speichern ihn — aber die Klickrate liegt unter deinem Durchschnitt.',
  stiller_pin:
    'Weder Pinterest noch Nutzer reagieren auf diesen Pin. Er hatte genug Zeit zu performen, aber er hat nicht funktioniert.\n\nWas tun: Zwei Optionen: Archivieren und Energie auf andere Pins legen — oder komplett neuer Versuch mit anderem Cover, Hook und Keywords zum gleichen Inhalt.\n\nWie wir das erkennen: Pin mindestens 65 Tage alt, mindestens 300 Impressionen, aber weder Saves noch Klicks über deinem Durchschnitt.',
}

export const PIN_DIAGNOSE_META: Record<PinDiagnose, DiagnoseMeta> = {
  kein_datum: {
    label: 'Kein Datum',
    handlungText:
      'Veröffentlichungsdatum fehlt — bitte in der Pin-Datenbank ergänzen',
    emoji: '⚠️',
    badge: 'bg-red-100 text-red-700',
  },
  noch_zu_frueh: {
    label: 'Noch zu früh',
    handlungText: 'Abwarten und beobachten',
    emoji: '⏳',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  aktiver_top_performer: {
    label: 'Aktiver Top Performer',
    handlungText: 'Variante erstellen',
    emoji: '⭐',
    badge: 'bg-green-100 text-green-700',
  },
  eingeschlafener_gewinner: {
    label: 'Eingeschlafener Gewinner',
    handlungText: 'Neu aufsetzen mit frischem Design',
    emoji: '♻️',
    badge: 'bg-amber-100 text-amber-800',
  },
  hidden_gem: {
    label: 'Hidden Gem',
    handlungText: 'Keywords und Board optimieren',
    emoji: '💎',
    badge: 'bg-blue-100 text-blue-700',
  },
  reichweite_ohne_wirkung: {
    label: 'Reichweite ohne Wirkung',
    handlungText: 'Hook und Design optimieren',
    emoji: '🔧',
    badge: 'bg-orange-100 text-orange-700',
  },
  stiller_pin: {
    label: 'Stiller Pin',
    handlungText: 'Kein Handlungsbedarf',
    emoji: '💤',
    badge: 'bg-gray-100 text-gray-700',
  },
}

export type DiagnoseInput = {
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  perioden: number
  // Tage seit Veröffentlichung; null wenn kein Datum gesetzt (dann greift
  // sofort die kein_datum-Regel).
  pinAlter: number | null
  hatDatum: boolean
  thresholds: PinAnalyticsThresholds
}

export type DiagnoseResult = {
  diagnose: PinDiagnose
  label: string
  handlung: string
  emoji: string
  badge: string
}

function asResult(diagnose: PinDiagnose): DiagnoseResult {
  const meta = PIN_DIAGNOSE_META[diagnose]
  return {
    diagnose,
    label: meta.label,
    handlung: meta.handlungText,
    emoji: meta.emoji,
    badge: meta.badge,
  }
}

// Save-Rate Hard-Floor wenn keine Benchmark verfügbar — gewählt damit
// "Algorithmus-Signal stark" auch ohne Mediane sinnvoll auslöst.
const SAVE_RATE_FALLBACK_FLOOR = 0.3

export function diagnosePinAggregated(input: DiagnoseInput): DiagnoseResult {
  const {
    cumKlicks,
    cumImpressionen,
    cumSaves,
    pinAlter,
    hatDatum,
    thresholds: t,
  } = input

  // 0. Kein Datum
  if (!hatDatum) return asResult('kein_datum')

  const alter = Math.max(0, pinAlter ?? 0)
  const ctr =
    cumImpressionen > 0 ? (cumKlicks / cumImpressionen) * 100 : 0
  const saveRate =
    cumImpressionen > 0 ? (cumSaves / cumImpressionen) * 100 : 0

  const vergleichsCtr = t.medianCtr ?? t.fallbackMindestCtr
  const vergleichsSaveRate = t.medianSaveRate ?? SAVE_RATE_FALLBACK_FLOOR

  const algorithmusSignalStark =
    saveRate >= vergleichsSaveRate &&
    cumImpressionen >= t.minImpReichweiteStark

  const nutzerSignalStark =
    ctr >= vergleichsCtr * t.ctrBoostFaktor &&
    cumKlicks >= t.minKlicksNutzerSignal &&
    cumImpressionen >= t.minImpCtrUrteil

  // 1. Keine Impressionen
  if (cumImpressionen === 0) return asResult('noch_zu_frueh')

  // 2. Noch zu früh — ODER-Logik:
  //    A) Pin ist jung UND hat noch nicht genug Reichweite, ODER
  //    B) Impressionen unterschreiten den CTR-Urteil-Floor (egal wie alt).
  //    Damit landen alte Pins mit sehr wenig Reichweite nicht fälschlich
  //    als "stiller_pin", obwohl die Datenbasis für ein CTR-Urteil fehlt.
  const istNochZuFrueh =
    (alter < t.beobachtungszeitraum &&
      cumImpressionen < t.minImpReichweiteStark) ||
    cumImpressionen < t.minImpCtrUrteil
  if (istNochZuFrueh) return asResult('noch_zu_frueh')

  // 3+4. Beide Signale stark
  if (algorithmusSignalStark && nutzerSignalStark) {
    if (
      alter > t.schlafenderGewinnerAlter &&
      cumKlicks >= t.minKlicksTopPerformer
    ) {
      return asResult('eingeschlafener_gewinner')
    }
    return asResult('aktiver_top_performer')
  }

  // 5. Nur Nutzer-Signal stark
  if (nutzerSignalStark && !algorithmusSignalStark)
    return asResult('hidden_gem')

  // 6. Nur Algorithmus-Signal stark
  if (algorithmusSignalStark && !nutzerSignalStark)
    return asResult('reichweite_ohne_wirkung')

  // 7. Kein Signal, aber reif
  if (alter >= t.beobachtungszeitraum) return asResult('stiller_pin')

  // Fallback
  return asResult('noch_zu_frueh')
}

// Helfer: kumulierte Werte aus einer Pin-Periode-Liste zusammenrechnen.
export function aggregatePinPeriods(
  periods: ReadonlyArray<{
    klicks: number
    impressionen: number
    saves: number
  }>
): {
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  perioden: number
  avgCtr: number
  avgSaveRate: number
} {
  let cumKlicks = 0
  let cumImpressionen = 0
  let cumSaves = 0
  for (const p of periods) {
    cumKlicks += p.klicks
    cumImpressionen += p.impressionen
    cumSaves += p.saves
  }
  const avgCtr =
    cumImpressionen > 0 ? (cumKlicks / cumImpressionen) * 100 : 0
  const avgSaveRate =
    cumImpressionen > 0 ? (cumSaves / cumImpressionen) * 100 : 0
  return {
    cumKlicks,
    cumImpressionen,
    cumSaves,
    perioden: periods.length,
    avgCtr,
    avgSaveRate,
  }
}

// Pin-Alter formatiert: immer in Tagen. Null wenn kein Datum.
export function formatPinAge(alterTage: number | null): string {
  if (alterTage === null) return '—'
  return `${alterTage} ${alterTage === 1 ? 'Tag' : 'Tage'}`
}
