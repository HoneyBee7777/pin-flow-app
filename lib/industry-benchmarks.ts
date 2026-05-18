// V3.2 — Branchen-Benchmarks für Engagement-Rate und CTR pro Nische.
//
// Reine Lookup-Tabelle (kein React/Supabase). Werte sind Pinterest-
// Marketing-Erfahrungswerte als Bereich (min/max als Anteil 0..1) plus
// vorformatiertem deutschem Label. Nicht gemappte Nischen fallen auf den
// allgemeinen Pinterest-Schnitt zurück.
//
// Die Keys entsprechen exakt den `label`-Strings aus lib/niche-benchmarks.ts
// (AccountNicheProfile.primaryNiche.label), damit der Lookup direkt greift.

export type Benchmark = {
  min: number
  max: number
  // Vorformatierter Bereich, deutsches Zahlenformat, z. B. "0,3–0,8 %".
  label: string
}

export type IndustryBenchmarks = {
  engagementRate: Benchmark
  ctr: Benchmark
}

export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmarks> = {
  'Yoga & Wellness': {
    engagementRate: { min: 0.003, max: 0.008, label: '0,3–0,8 %' },
    ctr: { min: 0.005, max: 0.01, label: '0,5–1 %' },
  },
  Mode: {
    engagementRate: { min: 0.005, max: 0.012, label: '0,5–1,2 %' },
    ctr: { min: 0.008, max: 0.015, label: '0,8–1,5 %' },
  },
  'Beauty & Pflege': {
    engagementRate: { min: 0.004, max: 0.01, label: '0,4–1 %' },
    ctr: { min: 0.006, max: 0.012, label: '0,6–1,2 %' },
  },
  'Wohnen & Einrichten': {
    engagementRate: { min: 0.005, max: 0.011, label: '0,5–1,1 %' },
    ctr: { min: 0.006, max: 0.012, label: '0,6–1,2 %' },
  },
  'Essen & Trinken': {
    engagementRate: { min: 0.006, max: 0.014, label: '0,6–1,4 %' },
    ctr: { min: 0.005, max: 0.011, label: '0,5–1,1 %' },
  },
  'DIY & Basteln': {
    engagementRate: { min: 0.005, max: 0.012, label: '0,5–1,2 %' },
    ctr: { min: 0.005, max: 0.01, label: '0,5–1 %' },
  },
  Reisen: {
    engagementRate: { min: 0.004, max: 0.009, label: '0,4–0,9 %' },
    ctr: { min: 0.006, max: 0.013, label: '0,6–1,3 %' },
  },
  Hochzeit: {
    engagementRate: { min: 0.005, max: 0.011, label: '0,5–1,1 %' },
    ctr: { min: 0.007, max: 0.014, label: '0,7–1,4 %' },
  },
}

export const PINTEREST_FALLBACK: IndustryBenchmarks = {
  engagementRate: { min: 0.003, max: 0.008, label: '0,3–0,8 %' },
  ctr: { min: 0.005, max: 0.01, label: '0,5–1 %' },
}

export type BenchmarkResult = IndustryBenchmarks & {
  // 'industry' → konkrete Nischen-Werte gefunden (Label „Branchenschnitt").
  // 'pinterest' → Fallback auf Pinterest-Allgemein (Label „Pinterest-Schnitt").
  source: 'industry' | 'pinterest'
}

// `niche` ist der Hauptnischen-Label-String oder null (keine klare Nische).
export function getBenchmark(niche: string | null): BenchmarkResult {
  const mapped = niche ? INDUSTRY_BENCHMARKS[niche] : undefined
  if (mapped) return { ...mapped, source: 'industry' }
  return { ...PINTEREST_FALLBACK, source: 'pinterest' }
}
