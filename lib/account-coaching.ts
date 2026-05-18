// Account-Diagnose / Coaching-Logik für die Dashboard-Sektion.
//
// Pure Funktion — kein React, kein Supabase. Wird im Dashboard server-seitig
// aus bereits geladenen Daten berechnet, das Ergebnis (serialisierbar) geht
// an die Client-Komponente AccountDiagnoseSection.
//
// Die 6 Diagnose-Regeln kommen aus der V2.1-Spec; die Sortierung ist eine
// flache Prio-Liste (Diagnose 5 vor Diagnose 3 vor 1 vor 2 vor 6 vor 4),
// nicht streng nach Severity — Begründung: Diagnose 5 (Boards
// kategorisieren) ist Daten-Voraussetzung für andere Diagnosen und
// muss daher immer zuerst kommen, auch wenn ihre Severity nur "hinweis" ist.
//
// Klassifikations- und Median-Logik wird von dieser Datei NICHT verändert —
// nur Anzeige- und Coaching-Layer.

import type { AccountNicheProfile } from './account-niche-profile'
import type { NicheBenchmark } from './niche-benchmarks'

export type CoachingSeverity = 'kritisch' | 'wichtig' | 'hinweis'

export const COACHING_DIAGNOSIS_IDS = [
  'save-rate-unter-schnitt',
  'ctr-niedrig-trotz-reichweite',
  'reichweite-zu-niedrig',
  'account-gemischt',
  'boards-nicht-kategorisiert',
  'alte-pins-ohne-strategie',
] as const

export type CoachingDiagnosisId = (typeof COACHING_DIAGNOSIS_IDS)[number]

// Snapshot der Trigger-Werte beim Dismiss. Wird in localStorage gespeichert
// und beim nächsten Render geprüft: wenn sich der Wert um > 20 % verändert
// hat (oder die Nische gewechselt hat), erscheint die Diagnose wieder.
export type CoachingSnapshot = {
  // Entscheidende Trigger-Werte je Diagnose. Felder sind optional, weil
  // nicht alle Diagnosen alle Werte tracken.
  saveRate?: number
  ctr?: number
  medianImpressionen?: number
  reichweiteOhneWirkungCount?: number
  pinsAeltAls60Tage?: number
  alteSchlechtePin?: number
  nichesCount?: number
  primaryShare?: number
  kategorisierungQuote?: number
  primaryNicheId?: string | null
}

// V3.2.2 — strukturierter Link zu einer ausführlicheren Erklärung in der
// App (statt reinem Text-Pfad). UI rendert: „Mehr dazu: → {label}
// (in {parent})" mit {label} als klickbarem Link auf {href}.
export type WeiterführendLink = {
  label: string
  parent: string
  href: string
}

export type CoachingDiagnosis = {
  id: CoachingDiagnosisId
  severity: CoachingSeverity
  titel: string
  problem: string
  ursache: string
  handlung: string
  // Klickbarer Verweis auf eine ausführlichere Erklärung; null wenn
  // keiner sinnvoll ist.
  weiterführend: WeiterführendLink | null
  // Snapshot zum Persistieren beim Dismiss — siehe shouldShowDespiteDismissal.
  snapshot: CoachingSnapshot
}

// Eingabe für den Coaching-Solver. Wird aus bereits geladenen Dashboard-
// Daten zusammengestellt (kein eigenes DB-Query).
export type CoachingInput = {
  // Persönliche Benchmark — kann null sein wenn noch keine Pins qualifiziert
  // sind. medianCtr/medianSaveRate werden direkt aus benchmark genommen.
  benchmark: {
    medianCtr: number | null
    medianSaveRate: number | null
    medianImpressionen: number | null
    qualifiziertePins: number | null
  } | null
  nicheProfile: AccountNicheProfile
  // Anzahl Pins mit echten Daten, die älter als 60 Tage sind — Stichprobe
  // groß genug für eine Reichweiten-Aussage.
  pinsAeltAls60Tage: number
  // Reine Statistik (aktuell ungenutzt, aber für künftige Diagnosen
  // praktisch). Bleibt im Type damit Aufrufer alle Daten an einer Stelle
  // füllen können.
  pinsOhneImpressionen: number
  // Pins mit hohem Algorithmus-Push (≥500 Imp + Save-Rate ≥ Median) aber
  // niedriger CTR — entspricht der diagnosePinAggregated-Kategorie
  // 'reichweite_ohne_wirkung'.
  reichweiteOhneWirkungCount: number
  // Account-Alter in Monaten — Schätzwert aus dem ältesten Pin oder dem
  // User-Account-Erstelldatum. Trigger Diagnose 6.
  accountAlterMonate: number
  // Pins älter als 365 Tage mit Save-Rate < 0,1 %.
  alteSchlechtePin: number
  // Anzahl Boards insgesamt + ohne Kategorie. Aktuell nicht alle aktiv
  // genutzt, bleiben aber im Type für künftige Diagnosen.
  totalBoards: number
  boardsOhneKategorie: number
}

// 5 % Toleranz für die Nischen-Vergleichs-Triggers — vermeidet, dass
// Accounts knapp unter der Schwelle eine "kritische" Diagnose bekommen.
const NICHE_TOLERANCE = 0.95

// Schwellen für „> 20 % Drift" und „> 30 Tage seit Dismiss" beim
// Re-Triggern dismissed Diagnosen.
export const COACHING_DRIFT_THRESHOLD = 0.2
export const COACHING_DISMISS_TTL_DAYS = 30

// Flache Prio-Reihenfolge — überschreibt Severity-basierte Sortierung.
// Niedrigere Zahl = höhere Priorität.
const DIAGNOSIS_PRIORITY: Record<CoachingDiagnosisId, number> = {
  'boards-nicht-kategorisiert': 0,
  'reichweite-zu-niedrig': 1,
  'save-rate-unter-schnitt': 2,
  'ctr-niedrig-trotz-reichweite': 3,
  'alte-pins-ohne-strategie': 4,
  'account-gemischt': 5,
}

const MAX_DIAGNOSES = 3

// Kürzen auf 1 Nachkomma + Komma-Format für die Anzeige in den Texten.
function fmtPct(v: number, digits = 2): string {
  return v.toFixed(digits).replace('.', ',')
}

// Wenn true, schreibt der Solver für jede Diagnose einen Trigger-Trace nach
// stdout — sichtbar im Next.js-Dev-Terminal. Hilft beim Debuggen, warum eine
// Diagnose nicht (oder doch) auslöst. Standardmäßig nur in Development aktiv.
const COACHING_DEBUG =
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV !== 'production'

type TraceStep = {
  id: CoachingDiagnosisId
  triggered: boolean
  reason: string
  values?: Record<string, unknown>
}

export function calculateCoachingDiagnoses(
  input: CoachingInput
): CoachingDiagnosis[] {
  const {
    benchmark,
    nicheProfile,
    pinsAeltAls60Tage,
    reichweiteOhneWirkungCount,
    accountAlterMonate,
    alteSchlechtePin,
  } = input

  const diagnoses: CoachingDiagnosis[] = []
  const trace: TraceStep[] = []
  const niche: NicheBenchmark | null = nicheProfile.primaryNiche
  const qualifiziertePins = benchmark?.qualifiziertePins ?? 0
  const totalPins = nicheProfile.niches.reduce(
    (sum, b) => sum + b.pinCount,
    0
  )
  const kategorisiertePins = totalPins
  const totalAccountPins = (() => {
    // primaryShare = primary niche pinCount / totalPins(account). Wenn primaryShare > 0,
    // lässt sich totalAccountPins ableiten. Fallback: kategorisiertePins (worst case
    // identisch). Wird nur für die Quotenrechnung gebraucht.
    if (
      nicheProfile.primaryNiche &&
      nicheProfile.primaryShare > 0 &&
      nicheProfile.niches[0]
    ) {
      return Math.round(
        nicheProfile.niches[0].pinCount / nicheProfile.primaryShare
      )
    }
    return kategorisiertePins
  })()
  const kategorisierungQuote =
    totalAccountPins > 0 ? kategorisiertePins / totalAccountPins : 0

  // ---- DIAGNOSE 1 — save-rate-unter-schnitt ----
  // Nur wenn klare Hauptnische erkennbar ist (sonst kein Branchen-Vergleich
  // möglich) UND eigene Benchmark mindestens 10 qualifizierte Pins hat.
  {
    const id: CoachingDiagnosisId = 'save-rate-unter-schnitt'
    const sr = benchmark?.medianSaveRate ?? null
    const schwachThresholdRaw = niche?.save_rate.schwach ?? null
    const schwachThreshold =
      schwachThresholdRaw === null
        ? null
        : schwachThresholdRaw * NICHE_TOLERANCE
    const values = {
      hatNische: niche !== null,
      isMixed: nicheProfile.isMixed,
      medianSaveRate: sr,
      qualifiziertePins,
      schwachRaw: schwachThresholdRaw,
      schwachMitToleranz: schwachThreshold,
    }
    if (!niche) {
      trace.push({ id, triggered: false, reason: 'keine Hauptnische', values })
    } else if (nicheProfile.isMixed) {
      trace.push({ id, triggered: false, reason: 'isMixed = true', values })
    } else if (sr === null) {
      trace.push({
        id,
        triggered: false,
        reason: 'benchmark.medianSaveRate ist null',
        values,
      })
    } else if (qualifiziertePins < 10) {
      trace.push({
        id,
        triggered: false,
        reason: `nur ${qualifiziertePins} qualifizierte Pins (< 10)`,
        values,
      })
    } else if (schwachThreshold !== null && sr >= schwachThreshold) {
      trace.push({
        id,
        triggered: false,
        reason: `Save-Rate ${sr} >= Schwelle (${schwachThreshold})`,
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'wichtig',
        titel: 'Pinterest-Algorithmus traut deinen Pins nicht',
        problem: `Deine durchschnittliche Save-Rate von ${fmtPct(sr!)}% liegt deutlich unter dem Branchenschnitt für die Save-Rate (${fmtPct(niche.save_rate.schwach, 1)}–${fmtPct(niche.save_rate.durchschnitt, 1)}%). Pinterest bekommt zu wenig Bestätigung, dass deine Inhalte wertvoll sind, und spielt sie deshalb sparsam aus.`,
        ursache:
          'In den meisten Fällen drei mögliche Ursachen: (1) Themen treffen die Zielgruppe nicht, (2) Pin-Cover sind nicht emotional genug aufgeladen, oder (3) Keywords passen nicht zum Bild — Pinterest spielt den Pin falschen Nutzern aus.',
        handlung:
          'Identifiziere deine 3 Pins mit der höchsten Save-Rate (in der Pin-Tabelle nach Save-Rate sortieren). Was haben sie gemeinsam? Mehr von diesen Themen produzieren — und für die anderen Themen bewusst andere Bildkonzepte testen.',
        weiterführend: null,
        snapshot: { saveRate: sr!, primaryNicheId: niche.id },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // ---- DIAGNOSE 2 — ctr-niedrig-trotz-reichweite ----
  {
    const id: CoachingDiagnosisId = 'ctr-niedrig-trotz-reichweite'
    const values = { reichweiteOhneWirkungCount }
    if (reichweiteOhneWirkungCount < 2) {
      trace.push({
        id,
        triggered: false,
        reason: `nur ${reichweiteOhneWirkungCount} Pins (< 2)`,
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'wichtig',
        titel: 'Pinterest spielt aus, aber niemand klickt durch',
        problem: `${reichweiteOhneWirkungCount} deiner Pins haben gute Reichweite und werden gespeichert — aber kaum jemand klickt zur Website. Das ist ein Cover-/Hook-Problem, kein SEO-Problem.`,
        ursache:
          'Pinterest spielt den richtigen Nutzern den Pin aus, sie finden das Thema interessant — aber das Cover macht nicht genug Lust auf den Klick. Häufig: zu kleine Schrift, zu vager Hook, oder der Pin verspricht etwas anderes als die Landingpage.',
        handlung:
          'Diese Pins sind dein größter aktueller Hebel. Erstelle für jeden einen neuen Pin mit anderem Cover: stärkerer Hook (eine konkrete Zahl, ein klares Versprechen), größere Schrift, andere Bildkomposition. Link bleibt gleich.',
        weiterführend: null,
        snapshot: { reichweiteOhneWirkungCount },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // ---- DIAGNOSE 3 — reichweite-zu-niedrig ----
  {
    const id: CoachingDiagnosisId = 'reichweite-zu-niedrig'
    const medianImp = benchmark?.medianImpressionen ?? null
    const values = { pinsAeltAls60Tage, medianImpressionen: medianImp }
    if (pinsAeltAls60Tage < 20) {
      trace.push({
        id,
        triggered: false,
        reason: `nur ${pinsAeltAls60Tage} Pins ≥ 60 Tage (< 20)`,
        values,
      })
    } else if (medianImp === null) {
      trace.push({
        id,
        triggered: false,
        reason: 'benchmark.medianImpressionen ist null',
        values,
      })
    } else if (medianImp >= 200) {
      trace.push({
        id,
        triggered: false,
        reason: `medianImpressionen ${medianImp} >= 200`,
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'kritisch',
        titel: 'Deine Pins werden kaum ausgespielt',
        problem:
          'Mehr als 70 % deiner Pins haben weniger als 200 Impressionen. Pinterest gibt deinem Profil aktuell wenig Reichweite — das ist meist ein SEO- oder Board-Strukturproblem.',
        ursache:
          'Häufige Gründe: (1) Pins ohne klare Keywords in Titel und Beschreibung, (2) Boards mit schlechten Namen oder leerer Beschreibung, (3) zu breit gestreute Themen ohne klare Nischen-Konsistenz.',
        handlung:
          'Erste Schritte: Prüfe deine 5 wichtigsten Boards — haben sie aussagekräftige Namen mit Keywords ganz vorn? Beschreibungen mit 2-3 Sätzen? Wenn nicht: erst Boards optimieren, dann mit der Pin-Produktion fortfahren.',
        weiterführend: {
          label: 'Erfolg messen',
          parent: 'Strategie & Ausrichtung',
          href: '/dashboard/strategie?tab=analytics',
        },
        snapshot: { pinsAeltAls60Tage, medianImpressionen: medianImp },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // ---- DIAGNOSE 4 — account-gemischt ----
  // Wichtig: bei unzureichendKategorisiert === true wird unterdrückt — die
  // "Mischung" ist dann möglicherweise nur ein Kategorisierungs-Artefakt.
  {
    const id: CoachingDiagnosisId = 'account-gemischt'
    const values = {
      isMixed: nicheProfile.isMixed,
      unzureichendKategorisiert: nicheProfile.unzureichendKategorisiert,
      nichesCount: nicheProfile.niches.length,
      primaryShare: nicheProfile.primaryShare,
    }
    if (!nicheProfile.isMixed) {
      trace.push({ id, triggered: false, reason: 'isMixed = false', values })
    } else if (nicheProfile.unzureichendKategorisiert) {
      trace.push({
        id,
        triggered: false,
        reason: 'unterdrückt durch unzureichendKategorisiert',
        values,
      })
    } else if (nicheProfile.niches.length < 5) {
      trace.push({
        id,
        triggered: false,
        reason: `nur ${nicheProfile.niches.length} Nischen (< 5)`,
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'hinweis',
        titel: 'Dein Profil hat keine klare Nische',
        problem:
          'Pinterest erkennt aktuell nicht klar, wofür dein Profil steht. Du hast Pins in mehreren Nischen, ohne dass eine klar dominiert. Das macht es dem Algorithmus schwer, deine Inhalte den richtigen Menschen zu zeigen.',
        ursache:
          'Pinterest funktioniert nach Themen-Konsistenz. Ein Profil, das zu 60 %+ aus einer Nische besteht, wird vom Algorithmus klar zugeordnet.',
        handlung:
          'Definiere eine Hauptnische und 1-2 Nebennischen. Ziel: 60-70 % deiner Pins in der Hauptnische. Boards außerhalb entweder löschen oder geheim setzen.',
        weiterführend: null,
        snapshot: {
          nichesCount: nicheProfile.niches.length,
          primaryShare: nicheProfile.primaryShare,
        },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // ---- DIAGNOSE 5 — boards-nicht-kategorisiert ----
  // Triggert direkt aus dem nicheProfile — gleicher Schwellwert (50 %).
  {
    const id: CoachingDiagnosisId = 'boards-nicht-kategorisiert'
    const values = {
      unzureichendKategorisiert: nicheProfile.unzureichendKategorisiert,
      kategorisierungQuote,
      totalAccountPins,
    }
    if (!nicheProfile.unzureichendKategorisiert) {
      trace.push({
        id,
        triggered: false,
        reason: 'unzureichendKategorisiert = false',
        values,
      })
    } else if (totalAccountPins <= 0) {
      trace.push({
        id,
        triggered: false,
        reason: 'noch keine Pins im Account',
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'hinweis',
        titel: 'Boards ohne Nischen-Zuordnung',
        problem:
          'Wir können dein Profil aktuell nicht analysieren, weil weniger als die Hälfte deiner Boards einer Nische zugeordnet sind.',
        ursache:
          'Bei der Board-Anlage wurde das Kategorie-Feld nicht ausgefüllt.',
        handlung:
          'Geh in den Boards-Tab und ergänze die Kategorie für deine wichtigsten Boards. Das dauert pro Board ~30 Sekunden — und schaltet gezielte Branchen-Vergleiche frei.',
        weiterführend: null,
        snapshot: { kategorisierungQuote },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // ---- DIAGNOSE 6 — alte-pins-ohne-strategie ----
  {
    const id: CoachingDiagnosisId = 'alte-pins-ohne-strategie'
    const values = { accountAlterMonate, alteSchlechtePin }
    if (accountAlterMonate <= 12) {
      trace.push({
        id,
        triggered: false,
        reason: `Account erst ${accountAlterMonate.toFixed(1)} Monate alt (≤ 12)`,
        values,
      })
    } else if (alteSchlechtePin <= 20) {
      trace.push({
        id,
        triggered: false,
        reason: `nur ${alteSchlechtePin} alte schwache Pins (≤ 20)`,
        values,
      })
    } else {
      diagnoses.push({
        id,
        severity: 'hinweis',
        titel: 'Deine ältesten Pins ziehen den Schnitt nach unten',
        problem: `Du hast ${alteSchlechtePin} Pins, die älter als ein Jahr sind und kaum Performance zeigen. Diese Pins ziehen deinen Profil-Schnitt nach unten.`,
        ursache:
          'Typischer Verlauf bei Profilen, die ohne klare Strategie und Keyword-Recherche gestartet sind.',
        handlung:
          'Schwache alte Pins auf private Boards verschieben. Bei Pins zu strategisch wichtigen Themen: Recyceln mit neuem Cover und überarbeiteten Keywords. Nicht löschen — du verlierst eingehende Backlinks.',
        weiterführend: null,
        snapshot: { alteSchlechtePin },
      })
      trace.push({ id, triggered: true, reason: 'OK', values })
    }
  }

  // Sortieren nach flacher Prio-Liste (NICHT nach Severity), dann auf
  // MAX_DIAGNOSES kürzen.
  diagnoses.sort(
    (a, b) => DIAGNOSIS_PRIORITY[a.id] - DIAGNOSIS_PRIORITY[b.id]
  )
  const final = diagnoses.slice(0, MAX_DIAGNOSES)

  if (COACHING_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[coaching] === Account-Diagnose Trace ===')
    // eslint-disable-next-line no-console
    console.log('[coaching] Inputs:', {
      hasBenchmark: !!benchmark,
      medianCtr: benchmark?.medianCtr ?? null,
      medianSaveRate: benchmark?.medianSaveRate ?? null,
      medianImpressionen: benchmark?.medianImpressionen ?? null,
      qualifiziertePins,
      primaryNiche: niche?.id ?? null,
      isMixed: nicheProfile.isMixed,
      unzureichendKategorisiert: nicheProfile.unzureichendKategorisiert,
      primaryShare: nicheProfile.primaryShare,
      nichesCount: nicheProfile.niches.length,
      pinsAeltAls60Tage,
      reichweiteOhneWirkungCount,
      accountAlterMonate,
      alteSchlechtePin,
      totalAccountPins,
      kategorisierungQuote,
    })
    for (const t of trace) {
      // eslint-disable-next-line no-console
      console.log(
        `[coaching] ${t.triggered ? '✓ TRIGGERED' : '✗ skipped  '} ${t.id} — ${t.reason}`,
        t.values ?? {}
      )
    }
    // eslint-disable-next-line no-console
    console.log(
      `[coaching] Sort+Limit: ${diagnoses.length} getriggert, ${final.length} angezeigt (max ${MAX_DIAGNOSES}):`,
      final.map((d) => d.id)
    )
    // eslint-disable-next-line no-console
    console.log('[coaching] === Ende ===')
  }

  return final
}

// ===========================================================
// Dismissal-Logik (Client-seitig, aber pure Helfer hier)
// ===========================================================

export type DismissedRecord = {
  dismissedAt: string // ISO-Datum
  snapshot: CoachingSnapshot
}

export type DismissedMap = Partial<Record<CoachingDiagnosisId, DismissedRecord>>

// Liefert true, wenn die Diagnose trotz früherem Dismiss WIEDER angezeigt
// werden soll. Re-Trigger-Bedingungen:
//   1. Mehr als 30 Tage seit dem Dismiss verstrichen
//   2. Snapshot-Werte haben sich um > 20 % verändert
//   3. Hauptnische hat gewechselt (für nischen-abhängige Diagnosen)
export function shouldShowDespiteDismissal(
  current: CoachingDiagnosis,
  dismissed: DismissedRecord | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!dismissed) return true

  // 1. TTL abgelaufen
  const dismissedAt = new Date(dismissed.dismissedAt).getTime()
  if (Number.isFinite(dismissedAt)) {
    const ageDays = (nowMs - dismissedAt) / (1000 * 60 * 60 * 24)
    if (ageDays > COACHING_DISMISS_TTL_DAYS) return true
  } else {
    // Korrupter Timestamp → lieber wieder anzeigen
    return true
  }

  // 2. Nischen-Wechsel ist immer ein Re-Trigger (für nischen-abhängige
  // Diagnosen). Wenn vorher null und jetzt ein Wert (oder umgekehrt), zählt
  // das ebenfalls als Wechsel.
  if (
    'primaryNicheId' in current.snapshot &&
    'primaryNicheId' in dismissed.snapshot &&
    current.snapshot.primaryNicheId !== dismissed.snapshot.primaryNicheId
  ) {
    return true
  }

  // 3. Drift-Check über alle numerischen Snapshot-Felder.
  const numericKeys: Array<keyof CoachingSnapshot> = [
    'saveRate',
    'ctr',
    'medianImpressionen',
    'reichweiteOhneWirkungCount',
    'pinsAeltAls60Tage',
    'alteSchlechtePin',
    'nichesCount',
    'primaryShare',
    'kategorisierungQuote',
  ]
  for (const key of numericKeys) {
    const cur = current.snapshot[key]
    const old = dismissed.snapshot[key]
    if (typeof cur !== 'number' || typeof old !== 'number') continue
    if (old === 0) {
      // Aus Null heraus jede Veränderung > 0 ist Drift
      if (cur !== 0) return true
      continue
    }
    const drift = Math.abs(cur - old) / Math.abs(old)
    if (drift > COACHING_DRIFT_THRESHOLD) return true
  }

  return false
}
