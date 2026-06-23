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
  'save_magnet',
  'reichweite_ohne_wirkung',
  'stiller_pin',
  'keine_vergleichsdaten',
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
    'Für diesen Pin fehlt das Veröffentlichungsdatum. Ohne dieses Datum lässt sich nicht berechnen, wie lange der Pin schon läuft.\n\nWas tun: Trage das Datum in der Pin-Produktion nach, dann erscheint die vollständige Diagnose.',
  noch_zu_frueh:
    'Für eine verlässliche Bewertung liegen noch zu wenige Daten vor. Entweder ist der Pin noch jung, oder Pinterest hat ihn noch nicht oft genug ausgespielt.\n\nWas tun: Abwarten, nicht voreilig optimieren. Beim nächsten Daten-Import erfolgt die Prüfung automatisch erneut.\n\nWie wir das erkennen: Pin jünger als 90 Tage und unter 500 Impressionen — oder weniger als 300 Impressionen, unabhängig vom Alter. Bei so kleinen Datenmengen ist eine Klickrate noch reiner Zufall, kein belastbares Muster.',
  aktiver_top_performer:
    'Pinterest spielt diesen Pin gut aus, und viele Menschen klicken durch zu deiner Website. Beides stimmt — das ist die ideale Kombination.\n\nWas tun: Nutze den Schwung. Erstelle in den nächsten 1-2 Wochen 2-3 Varianten, solange Pinterest den Pin aktiv ausspielt.\n\nWie wir das erkennen: Saves und Klicks liegen über deinem persönlichen Durchschnitt, und Pinterest spielt den Pin weiter stabil oder zunehmend aus — seine Reichweite bricht nicht ein.',
  eingeschlafener_gewinner:
    'Dieser Pin lief früher stark, aber Pinterest spielt ihn jetzt deutlich weniger aus. Das passiert mit der Zeit — Pinterest bevorzugt frische Inhalte, und die Reichweite älterer Pins lässt nach.\n\nWas tun: Bring den Pin zurück ins Spiel. Erstelle einen neuen Pin zum selben Inhalt mit frischem Design (anderes Bild, neuer Hook), aber gleichem Link und Board — so startet Pinterest die Ausspielung neu.\n\nWie wir das erkennen: Der Pin war früher stark (gute Klicks und Saves), aber Pinterest spielt ihn immer weniger aus — seine Impressionen sind über die letzten Monate auf unter die Hälfte seines besten Monats gefallen.',
  hidden_gem:
    'Wer diesen Pin sieht, klickt überdurchschnittlich oft durch — aber Pinterest spielt ihn kaum aus. Das Cover überzeugt, nur findet ihn fast niemand.\n\nWas tun: Erstelle einen neuen Pin zum selben Inhalt. Der Hebel sind die Keywords: stärkere Begriffe in Pin-Titel und Pin-Beschreibung, damit Pinterest den Pin der richtigen Zielgruppe zeigt. Gestalte das Bild dabei als echte Variante im bewährten Stil — kein identisches Cover, da Pinterest Duplikate nicht mag.\n\nWie wir das erkennen: Die Klickrate liegt deutlich über deinem Durchschnitt, aber die Reichweite bleibt klein.',
  save_magnet:
    'Dieser Pin wird oft gespeichert, aber selten geklickt. Das Thema und das Cover ziehen — aber kaum jemand geht weiter auf deine Website.\n\nWas tun: Wenn du Klicks willst, erstelle einen neuen Pin mit klarem Call-to-Action (etwa „Jetzt lesen", „Komplette Anleitung"), der neugierig macht, ohne schon alles zu verraten. Manche Pins wie Infografiken werden naturgemäß mehr gespeichert als geklickt — das ist auch in Ordnung, denn Saves stärken dein Board.\n\nWie wir das erkennen: Der Pin wird gut ausgespielt und überdurchschnittlich oft gespeichert, aber die Klickrate liegt unter deinem Durchschnitt.',
  reichweite_ohne_wirkung:
    'Pinterest spielt diesen Pin gut aus, viele Menschen sehen ihn — aber kaum jemand klickt durch. Cover oder Hook überzeugen noch nicht.\n\nWas tun: Erstelle einen neuen Pin zum selben Inhalt mit stärkerem Cover: klarerer Hook, größere Schrift, deutlicheres Versprechen. Titel, Beschreibung und Keywords kannst du übernehmen.\n\nWie wir das erkennen: Pinterest gibt dem Pin viel Reichweite (mindestens 500 Impressionen) und Menschen speichern ihn — aber die Klickrate liegt unter deinem Durchschnitt.',
  stiller_pin:
    'Weder Pinterest noch die Nutzer reagieren auf diesen Pin. Er hatte genug Zeit, aber er ist nicht angekommen.\n\nWas tun: Dieser Pin ist gefloppt. Lösche ihn nicht — er schadet nicht, er bringt nur nichts mehr. Steck deine Energie lieber in neue Pins zu Themen, die bei deiner Zielgruppe funktionieren.\n\nWie wir das erkennen: Der Pin ist mindestens 90 Tage alt und zeigt weder bei Saves noch bei Klicks ein Signal über deinem Durchschnitt — entweder trotz ausreichender Reichweite, oder weil Pinterest ihn auch nach Monaten kaum ausspielt.',
  keine_vergleichsdaten:
    'Für eine verlässliche Bewertung vergleicht Pin-Flow jeden Pin mit deinem persönlichen Durchschnitt. Dafür braucht es genug ausgewertete Pins — die hast du noch nicht.\n\nWas tun: Pflege weiter regelmäßig deine Pinterest-Analytics ein. Sobald genug Daten zusammenkommen, zeigt Pin-Flow dir hier deine persönlichen Stärken und Schwächen.\n\nWie wir das erkennen: Es liegen noch keine Vergleichswerte (dein persönlicher Median) für dein Konto vor.',
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
    handlungText: 'Neuer Pin mit stärkeren Keywords',
    emoji: '💎',
    badge: 'bg-blue-100 text-blue-700',
  },
  save_magnet: {
    label: 'Save-Magnet',
    handlungText: 'Neuer Pin mit klarem Call-to-Action',
    emoji: '🧲',
    badge: 'bg-purple-100 text-purple-700',
  },
  reichweite_ohne_wirkung: {
    label: 'Reichweite ohne Wirkung',
    handlungText: 'Neuer Pin mit stärkerem Cover',
    emoji: '🔧',
    badge: 'bg-orange-100 text-orange-700',
  },
  stiller_pin: {
    label: 'Stiller Pin',
    handlungText: 'Kein Handlungsbedarf',
    emoji: '💤',
    badge: 'bg-gray-100 text-gray-700',
  },
  keine_vergleichsdaten: {
    label: 'Noch keine Vergleichsdaten',
    handlungText: 'Sammle weiter Daten',
    emoji: '📊',
    badge: 'bg-slate-100 text-slate-600',
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
  // Impressionen je Periode, chronologisch DESC (Index 0 = jüngste Periode),
  // so wie die Aufrufer ihre Perioden-Zeilen liefern. Optional: fehlt er (oder
  // < 4 Perioden), wird kein fallender-Trend-Urteil gefällt — der Pin bleibt
  // dann aktiver_top_performer statt eingeschlafener_gewinner.
  impressionenVerlauf?: number[]
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

// Trend-Achse „eingeschlafener Gewinner": die jüngsten Perioden müssen auf
// höchstens diesen Anteil des Impressionen-Peaks gefallen sein.
const EINGESCHLAFEN_PEAK_ANTEIL = 0.5

// Obergrenze für „noch zu früh": 6 Monate. Ab hier ist „noch zu früh" nicht
// mehr ehrlich — ein datenarmer Pin gilt dann als stiller_pin.
const NOCH_ZU_FRUEH_MAX_ALTER = 180

export function diagnosePinAggregated(input: DiagnoseInput): DiagnoseResult {
  const {
    cumKlicks,
    cumImpressionen,
    cumSaves,
    pinAlter,
    hatDatum,
    thresholds: t,
    impressionenVerlauf,
  } = input

  // 0. Kein Datum
  if (!hatDatum) return asResult('kein_datum')

  const alter = Math.max(0, pinAlter ?? 0)
  const ctr =
    cumImpressionen > 0 ? (cumKlicks / cumImpressionen) * 100 : 0
  const saveRate =
    cumImpressionen > 0 ? (cumSaves / cumImpressionen) * 100 : 0

  // 1. Keine Impressionen
  if (cumImpressionen === 0) return asResult('noch_zu_frueh')

  // 2. Noch zu früh — ODER-Logik:
  //    A) Pin ist jung UND hat noch nicht genug Reichweite, ODER
  //    B) Impressionen unterschreiten den CTR-Urteil-Floor (egal wie alt).
  //    Damit landen alte Pins mit sehr wenig Reichweite nicht fälschlich
  //    als "stiller_pin", obwohl die Datenbasis für ein CTR-Urteil fehlt.
  const istNochZuFrueh =
    alter < NOCH_ZU_FRUEH_MAX_ALTER &&
    ((alter < t.beobachtungszeitraum &&
      cumImpressionen < t.minImpReichweiteStark) ||
      cumImpressionen < t.minImpCtrUrteil)
  if (istNochZuFrueh) return asResult('noch_zu_frueh')

  // Ohne Eigendaten-Median kann nicht fair bewertet werden → ehrlicher Zustand
  // statt Bewertung gegen feste Werte. Die drei Mediane werden gemeinsam gesetzt
  // (alle null oder alle vorhanden); alle drei prüfen, damit TS unten narrowt.
  if (
    t.medianCtr === null ||
    t.medianSaveRate === null ||
    t.medianImpressionen === null
  ) {
    return asResult('keine_vergleichsdaten')
  }

  const vergleichsCtr = t.medianCtr
  const vergleichsSaveRate = t.medianSaveRate

  // Reichweite (Achse 1): Impressionen über dem Eigendaten-Median UND über dem
  // absoluten Floor (500).
  const reichweiteStark =
    cumImpressionen >= t.medianImpressionen &&
    cumImpressionen >= t.minImpReichweiteStark

  // Wirkung (Achse 2): zwei getrennte Signale, NICHT an die Reichweite gekoppelt.
  const ctrStark =
    ctr >= vergleichsCtr * t.ctrBoostFaktor &&
    cumKlicks >= t.minKlicksNutzerSignal &&
    cumImpressionen >= t.minImpCtrUrteil

  const saveRateStark = saveRate >= vergleichsSaveRate

  // Trend-Achse: ist der Impressionen-Verlauf fallend? Verlauf ist DESC
  // (Index 0 = jüngste Periode). Nur ab 4 Perioden aussagekräftig — sonst
  // bleibt impressionenTrendFallend false und es gibt kein Schläfer-Urteil.
  const verlauf = impressionenVerlauf ?? []
  let impressionenTrendFallend = false
  if (verlauf.length >= 4) {
    const peak = Math.max(...verlauf)
    impressionenTrendFallend =
      verlauf[0] <= peak * EINGESCHLAFEN_PEAK_ANTEIL &&
      verlauf[1] <= peak * EINGESCHLAFEN_PEAK_ANTEIL
  }

  // A) Starke Reichweite — die Wirkung entscheidet.
  if (reichweiteStark) {
    if (ctrStark) {
      // CTR ist das Hauptsignal → Top Performer; der Trend entscheidet, ob
      // aktiv oder eingeschlafen.
      if (impressionenTrendFallend && cumKlicks >= t.minKlicksTopPerformer) {
        return asResult('eingeschlafener_gewinner')
      }
      return asResult('aktiver_top_performer')
    }
    if (saveRateStark) {
      // Wird gespeichert, aber nicht geklickt.
      return asResult('save_magnet')
    }
    // Viel Reichweite, aber keine Reaktion.
    return asResult('reichweite_ohne_wirkung')
  }

  // B) Schwache Reichweite, aber ein Wirkungs-Signal stark → Hidden Gem.
  if (ctrStark || saveRateStark) {
    return asResult('hidden_gem')
  }

  // C) Kein Signal, aber reif → stiller Pin.
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
