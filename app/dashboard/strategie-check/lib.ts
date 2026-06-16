// Phase B — Berechnungslogik für den neuen Strategie-Check (V2).
//
// Vergleicht die tatsächliche Pin-Arbeit gegen die im Wizard festgelegte
// Strategie. Drei Bereiche (siehe STRATEGIE-UMBAU-AUDIT.md, „Monatliches
// Tracking pro Baustein"):
//   1. Zielflächen-Verteilung (Soll/Ist über die verknüpften Ziel-URLs)
//   2. Pinning-Frequenz (Soll-Korridor vs. Ist im Zeitfenster)
//   3. Content-Säulen-Abdeckung (welche Säulen haben neue Pins bekommen)
//
// Reine, testbare Funktion ohne Seiteneffekte. Sämtliche DB-Auflösungen
// (pins.ziel_url_id → ziel_urls.zielflaeche, pins.board_id → boards.kategorie)
// macht der Aufrufer/Loader; hier kommen die bereits aufgelösten Werte an.

import {
  PINNING_FREQUENZ_OPTIONS,
  ZIELFLAECHEN,
  isZielflaeche,
  leereZielflaechen,
  type PinningFrequenz,
  type Zielflaeche,
  type ZielflaechenVerteilung,
} from '../strategie/lib'

export const STRATEGIE_CHECK_DEFAULT_GELB = 5
export const STRATEGIE_CHECK_DEFAULT_ROT = 15
export const STRATEGIE_CHECK_V2_FENSTER_TAGE = 30

// Nur diese Status zählen in die Strategie-Auswertung. Entwürfe sind
// Arbeitsstände und lenken noch keinen Traffic, daher ausgeklammert.
const STRATEGIE_CHECK_RELEVANTE_STATUS = ['veroeffentlicht', 'geplant'] as const

// Soll-Frequenz als grobe Monatsspanne (Pins pro Monat), abgeleitet aus den
// Tagesspannen der Wizard-Optionen (1-3 / 3-5 / 5-10 Pins pro Tag × 30).
const FREQUENZ_MONAT: Record<PinningFrequenz, { min: number; max: number }> = {
  einsteiger: { min: 30, max: 90 },
  wachstum: { min: 90, max: 150 },
  etabliert: { min: 150, max: 300 },
}

// =====================================================
// Eingaben
// =====================================================
export type StrategieCheckV2Settings = {
  // Soll-Verteilung der Zielflächen (7 Werte, in Summe idealerweise 100).
  zielSoll: ZielflaechenVerteilung
  pinningFrequenz: PinningFrequenz | null
  // Im Wizard bestätigte Content-Säulen (Board-Kategorien) oder leer.
  contentSaeulen: string[]
  onboardingAbgeschlossen: boolean
  schwelleGelb: number | null
  schwelleRot: number | null
}

export type StrategieCheckV2Pin = {
  // Status des Pins (pins.status). Nur 'veroeffentlicht' und 'geplant' fließen
  // in die Strategie-Auswertung ein; 'entwurf' wird ausgeklammert.
  status: string | null
  // Zielfläche der verknüpften Ziel-URL (ziel_urls.zielflaeche) oder null.
  zielflaeche: string | null
  // Kategorie des Boards des Pins (boards.kategorie) oder null.
  boardKategorie: string | null
  created_at: string | null
  geplante_veroeffentlichung: string | null
}

// =====================================================
// Ergebnis-Typen
// =====================================================
export type AbweichungStatus = 'im_plan' | 'leicht_daneben' | 'deutlich_daneben'

export type StrategieGesamtStatus =
  | 'auf_kurs'
  | 'leicht_daneben'
  | 'deutlich_daneben'
  | 'unbekannt'

export type FrequenzLage = 'unter' | 'im_korridor' | 'ueber' | 'unbekannt'

export type ZielflaecheCheckItem = {
  flaeche: Zielflaeche
  label: string
  soll: number // Prozent 0..100
  ist: number // Prozent 0..100 (eine Nachkommastelle)
  diff: number // ist - soll
  status: AbweichungStatus
}

export type ZielflaechenCheck = {
  items: ZielflaecheCheckItem[]
  pinsGesamt: number // Pins im Fenster gesamt
  pinsZugeordnet: number // davon mit gültiger Zielfläche
  pinsOhneZuordnung: number // ohne Ziel-URL oder ohne Zielfläche
  hatDaten: boolean // pinsZugeordnet > 0
  hatSoll: boolean // mindestens eine Soll-Fläche > 0
}

export type FrequenzCheck = {
  sollFrequenz: PinningFrequenz | null
  sollLabel: string | null
  sollMinProMonat: number | null
  sollMaxProMonat: number | null
  istPins: number // Pins im Fenster
  istProMonat: number // auf 30 Tage normiert
  lage: FrequenzLage
}

export type SaeuleCheckItem = {
  saeule: string
  pins: number
  aktiv: boolean
}

export type SaeulenCheck = {
  items: SaeuleCheckItem[]
  aktiveAnzahl: number
  vernachlaessigtAnzahl: number
  hatSaeulen: boolean
}

export type StrategieCheckV2 = {
  fensterTage: number
  pinsImFenster: number
  onboardingAbgeschlossen: boolean
  schwelleGelb: number
  schwelleRot: number
  zielflaechen: ZielflaechenCheck
  frequenz: FrequenzCheck
  saeulen: SaeulenCheck
  gesamtStatus: StrategieGesamtStatus
  // Über ALLE Pins des Nutzers (nicht nur das Fenster): wie viele es gesamt
  // gibt und wie viele davon kein gültiges Pin-Ziel haben. Für den Hinweis,
  // dass das Strategie-Bild noch unvollständig ist.
  pinsGesamtAlle: number
  pinsGesamtOhneZuordnung: number
}

// =====================================================
// Helfer
// =====================================================
function pct(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count * 1000) / total) / 10
}

function abweichungStatus(
  diff: number,
  schwelleGelb: number,
  schwelleRot: number
): AbweichungStatus {
  const abs = Math.abs(diff)
  if (abs <= schwelleGelb) return 'im_plan'
  if (abs <= schwelleRot) return 'leicht_daneben'
  return 'deutlich_daneben'
}

// Leitet aus den drei Bereichen einen einfachen Gesamt-Status ab. Nutzt die
// bereits pro Item gesetzten Abweichungs-Stufen (die wiederum auf den
// Schwellen gelb/rot beruhen). Ohne belastbare Daten: „unbekannt".
export function ableitenGesamtStatus(
  zielflaechen: ZielflaechenCheck,
  frequenz: FrequenzCheck,
  saeulen: SaeulenCheck
): StrategieGesamtStatus {
  const keineDaten =
    !zielflaechen.hatDaten &&
    frequenz.lage === 'unbekannt' &&
    !saeulen.hatSaeulen
  if (keineDaten) return 'unbekannt'

  let deutlich = 0
  let leicht = 0

  // Zielflächen nur werten, wenn es überhaupt zugeordnete Pins gibt. Ohne
  // Daten ist ein Ist von 0% keine echte Abweichung, sondern „unbekannt".
  if (zielflaechen.hatDaten) {
    for (const item of zielflaechen.items) {
      if (item.status === 'deutlich_daneben') deutlich += 1
      else if (item.status === 'leicht_daneben') leicht += 1
    }
  }

  if (frequenz.lage === 'unter' || frequenz.lage === 'ueber') {
    // Deutlich daneben, wenn weit außerhalb des Korridors, sonst leicht.
    const weitDaneben =
      (frequenz.sollMinProMonat !== null &&
        frequenz.istProMonat < frequenz.sollMinProMonat / 2) ||
      (frequenz.sollMaxProMonat !== null &&
        frequenz.istProMonat > frequenz.sollMaxProMonat * 1.5)
    if (weitDaneben) deutlich += 1
    else leicht += 1
  }

  if (saeulen.hatSaeulen && saeulen.vernachlaessigtAnzahl > 0) {
    if (saeulen.aktiveAnzahl === 0) deutlich += 1
    else leicht += 1
  }

  if (deutlich > 0) return 'deutlich_daneben'
  if (leicht > 0) return 'leicht_daneben'
  return 'auf_kurs'
}

// =====================================================
// Hauptfunktion
// =====================================================
export function computeStrategieCheckV2(
  settings: StrategieCheckV2Settings | null,
  pins: StrategieCheckV2Pin[],
  todayIso: string,
  fensterTage: number = STRATEGIE_CHECK_V2_FENSTER_TAGE
): StrategieCheckV2 {
  const zielSoll = settings?.zielSoll ?? leereZielflaechen()
  const schwelleGelb =
    settings?.schwelleGelb ?? STRATEGIE_CHECK_DEFAULT_GELB
  const schwelleRot = settings?.schwelleRot ?? STRATEGIE_CHECK_DEFAULT_ROT
  const onboardingAbgeschlossen = settings?.onboardingAbgeschlossen === true
  const contentSaeulen = settings?.contentSaeulen ?? []
  const pinningFrequenz = settings?.pinningFrequenz ?? null

  // ----- Grundmenge: nur veröffentlichte und geplante Pins -----
  // Entwürfe werden vor jeder Auswertung ausgeklammert, damit die Bezugsgröße
  // zur Status-Zählung oben im Dashboard passt (veröffentlicht + geplant).
  const relevanteStatus = STRATEGIE_CHECK_RELEVANTE_STATUS as readonly string[]
  const aktivePins = pins.filter(
    (p) => p.status !== null && relevanteStatus.includes(p.status)
  )

  // ----- Zeitfenster -----
  const today = new Date(todayIso + 'T00:00:00Z')
  const cutoff = new Date(today)
  cutoff.setUTCDate(cutoff.getUTCDate() - fensterTage)
  const obergrenze = new Date(today)
  obergrenze.setUTCDate(obergrenze.getUTCDate() + 1)
  const cutoffMs = cutoff.getTime()
  const obergrenzeMs = obergrenze.getTime()

  const fenster = aktivePins.filter((p) => {
    const d = p.geplante_veroeffentlichung ?? p.created_at
    if (!d) return false
    const t = new Date(d).getTime()
    if (Number.isNaN(t)) return false
    return t >= cutoffMs && t < obergrenzeMs
  })

  // ----- Gesamtbild über alle relevanten Pins (nicht nur das Fenster) -----
  // Zeigt, wie vollständig das Strategie-Bild ist: Wie viele veröffentlichte
  // und geplante Pins der Nutzer hat und wie viele davon noch kein gültiges
  // Pin-Ziel tragen. Entwürfe sind hier bereits ausgeklammert.
  let pinsGesamtZugeordnet = 0
  for (const p of aktivePins) {
    const zf = p.zielflaeche?.trim()
    if (zf && isZielflaeche(zf)) pinsGesamtZugeordnet += 1
  }
  const pinsGesamtAlle = aktivePins.length
  const pinsGesamtOhneZuordnung = pinsGesamtAlle - pinsGesamtZugeordnet

  // ===== Bereich 1: Zielflächen (Soll/Ist) =====
  const counts = leereZielflaechen()
  let pinsZugeordnet = 0
  for (const p of fenster) {
    const zf = p.zielflaeche?.trim()
    if (zf && isZielflaeche(zf)) {
      counts[zf] += 1
      pinsZugeordnet += 1
    }
  }
  const pinsOhneZuordnung = fenster.length - pinsZugeordnet
  const sollSumme = ZIELFLAECHEN.reduce((s, z) => s + (zielSoll[z.value] ?? 0), 0)

  const zielItems: ZielflaecheCheckItem[] = []
  for (const z of ZIELFLAECHEN) {
    const soll = zielSoll[z.value] ?? 0
    const istCount = counts[z.value]
    // Nur Flächen, die im Soll > 0 sind ODER im Ist vorkommen.
    if (soll <= 0 && istCount <= 0) continue
    const ist = pct(istCount, pinsZugeordnet)
    const diff = Math.round((ist - soll) * 10) / 10
    zielItems.push({
      flaeche: z.value,
      label: z.label,
      soll,
      ist,
      diff,
      status: abweichungStatus(diff, schwelleGelb, schwelleRot),
    })
  }

  const zielflaechenCheck: ZielflaechenCheck = {
    items: zielItems,
    pinsGesamt: fenster.length,
    pinsZugeordnet,
    pinsOhneZuordnung,
    hatDaten: pinsZugeordnet > 0,
    hatSoll: sollSumme > 0,
  }

  // ===== Bereich 2: Pinning-Frequenz (Soll/Ist) =====
  const istPins = fenster.length
  const istProMonat =
    fensterTage === 30
      ? istPins
      : Math.round((istPins * 30) / Math.max(1, fensterTage))
  const span = pinningFrequenz ? FREQUENZ_MONAT[pinningFrequenz] : null
  const lage: FrequenzLage = !span
    ? 'unbekannt'
    : istProMonat < span.min
      ? 'unter'
      : istProMonat > span.max
        ? 'ueber'
        : 'im_korridor'
  const frequenzCheck: FrequenzCheck = {
    sollFrequenz: pinningFrequenz,
    sollLabel: pinningFrequenz
      ? (PINNING_FREQUENZ_OPTIONS.find((o) => o.value === pinningFrequenz)
          ?.label ?? null)
      : null,
    sollMinProMonat: span?.min ?? null,
    sollMaxProMonat: span?.max ?? null,
    istPins,
    istProMonat,
    lage,
  }

  // ===== Bereich 3: Content-Säulen-Abdeckung =====
  const saeulenZaehler = new Map<string, number>()
  for (const s of contentSaeulen) saeulenZaehler.set(s, 0)
  for (const p of fenster) {
    const k = p.boardKategorie?.trim()
    if (k && saeulenZaehler.has(k)) {
      saeulenZaehler.set(k, (saeulenZaehler.get(k) ?? 0) + 1)
    }
  }
  const saeulenItems: SaeuleCheckItem[] = contentSaeulen.map((s) => {
    const n = saeulenZaehler.get(s) ?? 0
    return { saeule: s, pins: n, aktiv: n > 0 }
  })
  const aktiveAnzahl = saeulenItems.filter((i) => i.aktiv).length
  const saeulenCheck: SaeulenCheck = {
    items: saeulenItems,
    aktiveAnzahl,
    vernachlaessigtAnzahl: saeulenItems.length - aktiveAnzahl,
    hatSaeulen: contentSaeulen.length > 0,
  }

  return {
    fensterTage,
    pinsImFenster: fenster.length,
    onboardingAbgeschlossen,
    schwelleGelb,
    schwelleRot,
    zielflaechen: zielflaechenCheck,
    frequenz: frequenzCheck,
    saeulen: saeulenCheck,
    // Ohne Pins im Fenster gibt es nichts zu bewerten: Status „unbekannt",
    // nicht „deutlich daneben". Einzelbereiche ohne Daten werden in
    // ableitenGesamtStatus neutral behandelt.
    gesamtStatus:
      fenster.length === 0
        ? 'unbekannt'
        : ableitenGesamtStatus(zielflaechenCheck, frequenzCheck, saeulenCheck),
    pinsGesamtAlle,
    pinsGesamtOhneZuordnung,
  }
}
