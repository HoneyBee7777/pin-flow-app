// V3.3 — Heuristik für die Dashboard-Sektion „Was hat funktioniert?".
//
// Pure Funktion — kein React, kein Supabase. Wird im Dashboard server-
// seitig aus den bereits geladenen Performance-Daten berechnet, das
// Ergebnis (serialisierbar) geht an die Komponente WinsBlock.
//
// Zweck: Erfolge im Vergleich zum letzten Monat sichtbar machen und strategisch
// einordnen — das erste Dashboard-Element, das den Käufer für Fortschritt
// belohnt statt nur Probleme zu zeigen. Die Sektion erscheint NUR, wenn
// echte Erfolge vorliegen (siehe hasShowableWins) — kein Leer-State.
//
// Die Wachstums-Prozente kommen aus denselben Werten wie die Gesamt-
// Profil-Performance-Sektion (calcGrowth → % zur Vorperiode). Die
// Branchenwerte werden aus lib/industry-benchmarks.ts (V3.2) mitgenutzt.

import { getBenchmark } from './industry-benchmarks'

// Eingabe für die Heuristik. Wird aus ProfilAnalyticsWithGrowth +
// nicheProfile zusammengestellt (siehe WinsBlock.tsx). Wachstumswerte
// sind Prozent-Zahlen zur Vorperiode (z. B. 272.7 = +272,7 %) oder null
// (kein Vergleich möglich). ctrPct ist ein absoluter Wert in Prozent
// (z. B. 0.8 = 0,8 %).
export type WinsInput = {
  klicksGrowth: number | null
  savesGrowth: number | null
  ctrGrowth: number | null
  impressionenGrowth: number | null
  interagierendGrowth: number | null
  ctrPct: number | null
  // false → nur 1 Snapshot, kein Vorperioden-Vergleich. Dann wird die
  // Sektion komplett ausgeblendet (Test-Vorgabe V3.3).
  hasPrevious: boolean
  // Hauptnischen-Label (z. B. „Yoga & Wellness") oder null.
  nicheLabel: string | null
  // Höchste kumulierte Impressionen eines einzelnen Pins. Kriterium B.
  maxPinImpressionen: number
}

export type WinsBlock = {
  observation: string // Absatz 1 — was zeigen die Daten
  hypothesis: string // Absatz 2 — strategische Einordnung
  reflection: string // Absatz 3 — Reflexions-Impuls
  variant: 'A' | 'B' | 'C'
}

// Kriterium A — Mindest-Wachstum (in %) je KPI für einen „echten" Win.
const GROWTH_THRESHOLD = {
  klicks: 30,
  saves: 30,
  ctr: 20,
  impressionen: 25,
  interagierend: 30,
} as const

type DriverKey = keyof typeof GROWTH_THRESHOLD

const DRIVER_LABEL: Record<DriverKey, string> = {
  klicks: 'Klicks',
  saves: 'Saves',
  ctr: 'CTR',
  impressionen: 'Impressionen',
  interagierend: 'interagierende Zielgruppe',
}

// Reihenfolge, in der KPIs im Beobachtungs-Satz GENANNT werden — bewusst
// NICHT nach Wachstums-Höhe, sondern nach kommunikativer Kernrelevanz:
// Saves (stärkstes Qualitäts-Signal), Klicks (echter Traffic), CTR (Hook),
// dann Reichweite/Zielgruppe.
const NAMING_PRIORITY: DriverKey[] = [
  'saves',
  'klicks',
  'ctr',
  'impressionen',
  'interagierend',
]

type Driver = { key: DriverKey; label: string; growth: number }

// Alle KPIs mit endlichem Wachstumswert (Infinity = von 0 hochgesprungen
// → als Zahl nicht sauber darstellbar, daher ausgeklammert).
function collectFiniteGrowth(input: WinsInput): Driver[] {
  const raw: Array<[DriverKey, number | null]> = [
    ['klicks', input.klicksGrowth],
    ['saves', input.savesGrowth],
    ['ctr', input.ctrGrowth],
    ['impressionen', input.impressionenGrowth],
    ['interagierend', input.interagierendGrowth],
  ]
  return raw
    .filter(
      (e): e is [DriverKey, number] =>
        e[1] !== null && Number.isFinite(e[1])
    )
    .map(([key, growth]) => ({ key, label: DRIVER_LABEL[key], growth }))
}

// KPIs, die Kriterium A erfüllen (Wachstum ≥ Schwelle), absteigend nach
// Wachstum sortiert.
function qualifyingDrivers(input: WinsInput): Driver[] {
  return collectFiniteGrowth(input)
    .filter((d) => d.growth >= GROWTH_THRESHOLD[d.key])
    .sort((a, b) => b.growth - a.growth)
}

// Kriterium B — absolute Stärke. ctrPct ist in %, die Benchmark-Grenze in
// industry-benchmarks.ts als Anteil 0..1.
function absoluteStrength(input: WinsInput): {
  ctrOverBench: boolean
  strongPin: boolean
} {
  const bench = getBenchmark(input.nicheLabel)
  return {
    ctrOverBench:
      input.ctrPct !== null && input.ctrPct >= bench.ctr.max * 100,
    strongPin: input.maxPinImpressionen > 1000,
  }
}

// Ab wie vielen fallenden Kern-Mengen-KPIs der Block komplett schweigt.
// Leicht justierbar.
const NEGATIVE_KERN_KPIS_SCHWELLE = 2

// Zentrale MENGEN-KPIs (keine Quoten). Fallen genügend von ihnen, ist der
// Gesamtmonat klar rückläufig und ein einzelner gestiegener Quotenwert
// (z. B. CTR) darf nicht als Erfolg gefeiert werden.
function fallingKernKpis(input: WinsInput): number {
  const mengen: Array<number | null> = [
    input.klicksGrowth,
    input.savesGrowth,
    input.impressionenGrowth,
    input.interagierendGrowth,
  ]
  return mengen.filter((v) => v !== null && v < 0).length
}

export function hasShowableWins(input: WinsInput): boolean {
  // Ohne Vorperiode kein belastbarer Erfolgs-Vergleich → ausblenden.
  if (!input.hasPrevious) return false
  // Klar negativer Gesamtmonat → schweigen, auch wenn ein Einzelwert steigt.
  if (fallingKernKpis(input) >= NEGATIVE_KERN_KPIS_SCHWELLE) return false
  if (qualifyingDrivers(input).length > 0) return true
  const b = absoluteStrength(input)
  return b.ctrOverBench || b.strongPin
}

// Ganzzahliges Prozent für den Fließtext (z. B. 272.7 → „273 %").
function pct(v: number): string {
  return `${Math.round(v)} %`
}

// Absolute Rate (CTR) mit Komma-Dezimaltrennung, z. B. „0,9 %".
function ratePct(v: number): string {
  return `${v.toFixed(1).replace('.', ',')} %`
}

const COUNT_WORD: Record<number, string> = { 2: 'Zwei', 3: 'Drei' }

// Nische für den Hypothese-Satz: mit Label „für deine Nische X", ohne
// Label neutral „für deine Inhalte".
function nicheClause(nicheLabel: string | null): string {
  return nicheLabel ? `deine Nische ${nicheLabel}` : 'deine Inhalte'
}

function buildVariantA(input: WinsInput, drivers: Driver[]): WinsBlock {
  // Genannt werden bis zu 3 KPIs — ausgewählt nach kommunikativer
  // Kernrelevanz (NAMING_PRIORITY), nicht nach Wachstums-Höhe.
  const named = [...drivers]
    .sort(
      (a, b) =>
        NAMING_PRIORITY.indexOf(a.key) - NAMING_PRIORITY.indexOf(b.key)
    )
    .slice(0, 3)
  const countWord = COUNT_WORD[named.length] ?? 'Mehrere'
  const [d1, d2, d3] = named

  let observation =
    `Deine ${d1.label} sind um ${pct(d1.growth)} gestiegen` +
    `, deine ${d2.label} um ${pct(d2.growth)}`
  if (d3) {
    observation += ` und deine ${d3.label} um ${pct(d3.growth)}`
  }
  observation +=
    `. ${countWord} zentrale KPIs entwickeln sich gleichzeitig stark ` +
    `nach oben — das passiert nicht zufällig.`

  const hypothesis =
    `Wenn mehrere Treiber gleichzeitig wachsen, signalisiert das, dass ` +
    `Pinterest deine Pins als hochwertig einstuft und sie aktiv ausspielt. ` +
    `**Wahrscheinliche Ursachen**: bessere Pin-Qualität (Cover, Hook, ` +
    `Keywords), ein viraler Pin als Türöffner oder ein Algorithmus-Schub ` +
    `für ${nicheClause(input.nicheLabel)}.`

  const reflection =
    `Welche deiner Pins im letzten Monat haben gemeinsam, was sich von ` +
    `deinen früheren Pins unterscheidet? Diese Muster sind **der Schlüssel, ` +
    `um den Erfolg zu wiederholen**.`

  return { observation, hypothesis, reflection, variant: 'A' }
}

function buildVariantB(input: WinsInput, dominant: Driver): WinsBlock {
  const observation =
    `Deine ${dominant.label} sind um ${pct(dominant.growth)} gestiegen — ` +
    `der mit Abstand größte Wachstumssprung deiner aktuellen Phase.`

  let hypothesis: string
  let reflection: string

  if (dominant.key === 'saves') {
    // Klicks hinken oft hinterher bei Save-getriebenem Wachstum — nur
    // erwähnen, wenn die Klicks tatsächlich flach/negativ sind.
    const klicksFlach =
      input.klicksGrowth === null ||
      !Number.isFinite(input.klicksGrowth) ||
      input.klicksGrowth < 10
    hypothesis =
      `Ein massiver Saves-Anstieg ist **Pinterests stärkstes ` +
      `Qualitäts-Signal** — Nutzer:innen wollen deine Inhalte für später ` +
      `aufheben. Das passiert oft durch: emotional starke Pin-Cover, klare ` +
      `Mehrwert-Versprechen oder saisonale Treffer.` +
      (klicksFlach
        ? ` Klicks hinken etwas hinterher — das ist normal bei ` +
          `Save-getriebenem Wachstum und entwickelt sich meist mit ` +
          `Verzögerung.`
        : '')
    reflection =
      `Welche deiner aktuellen Pins werden besonders oft gespeichert? ` +
      `Wenn du das Muster verstehst, kannst du es bewusst nachbauen.`
  } else {
    hypothesis =
      `Ein einzelner, klar dominanter Wachstumstreiber zeigt, dass ein ` +
      `bestimmter Hebel bei dir gerade besonders gut funktioniert. ` +
      `Wahrscheinliche Ursachen: ein viraler Pin als Türöffner, ein gut ` +
      `getroffenes Thema oder ein Algorithmus-Schub für ` +
      `${nicheClause(input.nicheLabel)}.`
    reflection =
      `Welche deiner aktuellen Pins treiben diesen Anstieg? Wenn du das ` +
      `Muster verstehst, kannst du es **bewusst nachbauen**.`
  }

  return { observation, hypothesis, reflection, variant: 'B' }
}

function buildVariantC(input: WinsInput): WinsBlock {
  const bench = getBenchmark(input.nicheLabel)
  const b = absoluteStrength(input)

  // Benchmark-Quelle für die Formulierung: konkrete Nische vs. Pinterest-
  // Allgemein.
  const benchPhrase =
    bench.source === 'industry' && input.nicheLabel
      ? `dem Branchenschnitt für ${input.nicheLabel}`
      : 'dem Pinterest-Schnitt'

  let observation: string
  let hypothesis: string
  let reflection: string

  if (b.ctrOverBench && input.ctrPct !== null) {
    observation =
      `Deine CTR liegt mit ${ratePct(input.ctrPct)} deutlich über ` +
      `${benchPhrase} (${bench.ctr.label}). Die Menschen, die deine Pins ` +
      `sehen, klicken überdurchschnittlich oft zur Website durch.`
    hypothesis =
      `Eine starke CTR trotz vielleicht noch kleiner Reichweite bedeutet: ` +
      `**deine Pin-Hooks funktionieren** — Cover und Versprechen machen ` +
      `Lust auf den Klick. Pinterest hat nur noch nicht genug Vertrauen ` +
      `aufgebaut, um dich breit auszuspielen. Das ändert sich mit Konstanz.`
    reflection =
      `Wenn deine Pins schon jetzt überdurchschnittlich klicken, was ` +
      `passiert, wenn du die Pin-Frequenz verdoppelst?`
  } else {
    // strongPin
    observation =
      `Mindestens einer deiner Pins hat über 1.000 Impressionen erreicht ` +
      `— Pinterest spielt einzelne Inhalte von dir bereits spürbar aus.`
    hypothesis =
      `Ein einzelner Pin mit hoher Reichweite zeigt: **du kannst Inhalte ` +
      `treffen, die der Algorithmus mag**. Jetzt geht es darum, dieses ` +
      `Muster bewusst zu wiederholen statt es dem Zufall zu überlassen.`
    reflection =
      `Was unterscheidet diesen Pin von deinen anderen? Wenn du das ` +
      `Muster verstehst, kannst du es gezielt nachbauen.`
  }

  return { observation, hypothesis, reflection, variant: 'C' }
}

// Voraussetzung: hasShowableWins(input) === true. Wählt die Variante:
//   A — ≥ 2 KPIs erfüllen Kriterium A (mehrere Treiber gemeinsam)
//   B — genau 1 KPI erfüllt Kriterium A (ein dominanter Treiber)
//   C — kein Wachstum, aber absolute Stärke (Kriterium B)
export function buildWinsBlock(input: WinsInput): WinsBlock {
  const drivers = qualifyingDrivers(input)
  if (drivers.length >= 2) return buildVariantA(input, drivers)
  if (drivers.length === 1) return buildVariantB(input, drivers[0])
  return buildVariantC(input)
}
