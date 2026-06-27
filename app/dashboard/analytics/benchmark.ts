'use server'

import { createClient } from '@/lib/supabase-server'
import {
  diffDays,
  todayIso,
  type UserPinBenchmark,
} from './utils'

// Mindest-Anzahl qualifizierter Pins für eine valide Benchmark.
// Darunter: Benchmark = NULL → diagnose nutzt Hard-Floor-Defaults.
const BENCHMARK_MIN_PINS = 10
// Wunsch-Anzahl. Wenn weniger qualifiziert, wird Filter aufgeweicht.
const BENCHMARK_PREFERRED_PINS = 20
// Qualifikationsschwellen.
const BENCHMARK_MAX_AGE_DAYS = 90
const BENCHMARK_MIN_IMPRESSIONS = 100

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

type RawAnalyticsRow = {
  pin_id: string
  impressionen: number
  klicks: number
  saves: number
  pins: {
    geplante_veroeffentlichung: string | null
    created_at: string | null
  } | null
}

type AggregatedPin = {
  pin_id: string
  cumKlicks: number
  cumImpressionen: number
  cumSaves: number
  pinAlterTage: number | null
}

// Berechnet die Benchmark-Werte (Median CTR, Save-Rate, Impressionen)
// für einen User aus seinen pins_analytics. Schreibt das Ergebnis in
// user_pin_benchmark (UPSERT).
export async function calculateUserBenchmark(
  userId: string
): Promise<{ error?: string; benchmark?: UserPinBenchmark }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pins_analytics')
    .select(
      `pin_id, impressionen, klicks, saves,
       pins ( geplante_veroeffentlichung, created_at )`
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
  if (error) return { error: error.message }

  const rows = (data ?? []) as unknown as RawAnalyticsRow[]
  const today = todayIso()

  const aggregatedMap = new Map<string, AggregatedPin>()
  for (const row of rows) {
    const refDate =
      row.pins?.geplante_veroeffentlichung ??
      row.pins?.created_at?.slice(0, 10) ??
      null
    const pinAlterTage = refDate
      ? Math.max(0, diffDays(refDate, today))
      : null

    const existing = aggregatedMap.get(row.pin_id)
    if (existing) {
      existing.cumKlicks += row.klicks
      existing.cumImpressionen += row.impressionen
      existing.cumSaves += row.saves
    } else {
      aggregatedMap.set(row.pin_id, {
        pin_id: row.pin_id,
        cumKlicks: row.klicks,
        cumImpressionen: row.impressionen,
        cumSaves: row.saves,
        pinAlterTage,
      })
    }
  }

  const allPins = Array.from(aggregatedMap.values())

  // Stufe 1: jung + impressionen
  const qualifiziert = allPins.filter(
    (p) =>
      p.pinAlterTage !== null &&
      p.pinAlterTage <= BENCHMARK_MAX_AGE_DAYS &&
      p.cumImpressionen >= BENCHMARK_MIN_IMPRESSIONS
  )
  // Stufe 2 (Fallback): nur Mindest-Impressionen, beliebiges Alter
  const fallback = allPins.filter(
    (p) => p.cumImpressionen >= BENCHMARK_MIN_IMPRESSIONS
  )

  const useFallback = qualifiziert.length < BENCHMARK_PREFERRED_PINS
  const pool = useFallback ? fallback : qualifiziert

  const benchmark: UserPinBenchmark = {
    medianCtr: null,
    medianSaveRate: null,
    medianImpressionen: null,
    qualifiziertePins: pool.length,
  }

  if (pool.length >= BENCHMARK_MIN_PINS) {
    const ctrs = pool.map((p) => (p.cumKlicks / p.cumImpressionen) * 100)
    const saveRates = pool.map(
      (p) => (p.cumSaves / p.cumImpressionen) * 100
    )
    const impressions = pool.map((p) => p.cumImpressionen)
    benchmark.medianCtr = median(ctrs)
    benchmark.medianSaveRate = median(saveRates)
    const medianImp = median(impressions)
    benchmark.medianImpressionen =
      medianImp === null ? null : Math.round(medianImp)
  }

  // UPSERT in user_pin_benchmark
  const { error: upsertError } = await supabase
    .from('user_pin_benchmark')
    .upsert(
      {
        user_id: userId,
        median_ctr: benchmark.medianCtr,
        median_save_rate: benchmark.medianSaveRate,
        median_impressionen: benchmark.medianImpressionen,
        qualifizierte_pins: benchmark.qualifiziertePins,
        berechnet_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (upsertError) return { error: upsertError.message }

  return { benchmark }
}

// Lädt die zuletzt berechnete Benchmark eines Users; null wenn noch keine
// vorhanden ist (dann nutzt diagnose die Hard-Floor-Defaults).
export async function loadUserBenchmark(
  userId: string
): Promise<UserPinBenchmark | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_pin_benchmark')
    .select(
      'median_ctr, median_save_rate, median_impressionen, qualifizierte_pins'
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    medianCtr:
      data.median_ctr === null ? null : Number(data.median_ctr),
    medianSaveRate:
      data.median_save_rate === null
        ? null
        : Number(data.median_save_rate),
    medianImpressionen:
      data.median_impressionen === null
        ? null
        : Number(data.median_impressionen),
    qualifiziertePins:
      data.qualifizierte_pins === null
        ? null
        : Number(data.qualifizierte_pins),
  }
}

// Re-Berechnung der User-Benchmark (median_ctr/median_save_rate/…), die im
// Dashboard + Analytics-Tab gelesen wird (loadUserBenchmark).
// Hinweis: Die frühere denormalisierte Pro-Pin-Klassifikation wurde entfernt —
// die Spalten klassifikation/klassifikation_at/save_rate/engagement_rate in
// pins_analytics wurden nirgends gelesen (Diagnosen werden live berechnet),
// und die geladenen Einstellungs-Schwellwerte wurden ohnehin ignoriert.
export async function refreshUserBenchmark(
  userId: string
): Promise<{ error?: string }> {
  const benchmarkResult = await calculateUserBenchmark(userId)
  if (benchmarkResult.error) return { error: benchmarkResult.error }
  return {}
}
