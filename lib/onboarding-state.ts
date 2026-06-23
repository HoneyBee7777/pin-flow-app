// V3.5 — Persistenz des Käufer-Onboardings.
//
// Speicher-Ort: einstellungen.onboarding_state (JSONB), pro user_id.
// EINMALIG im Supabase-SQL-Editor anzulegen:
//
//   ALTER TABLE einstellungen
//     ADD COLUMN IF NOT EXISTS onboarding_state JSONB;
//
// Solange die Spalte fehlt, liefert loadOnboardingState defensiv den
// Default-Zustand (Onboarding „noch nicht gestartet") — die App crasht
// nicht, der Käufer sieht dann eben das Onboarding als ob neu.

import type { createClient } from '@/lib/supabase-server'

type SupabaseServer = ReturnType<typeof createClient>

export type OnboardingState = {
  completed: boolean
  skipped: boolean
  currentStep: number // 0..15
  completedSteps: number[]
  lastUpdated: string // ISO-Zeitstempel, '' wenn noch nie gespeichert
}

// 16 Schritte: 0..15.
export const ONBOARDING_LAST_STEP = 15
export const ONBOARDING_TOTAL_STEPS = 16

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  skipped: false,
  currentStep: 0,
  completedSteps: [],
  lastUpdated: '',
}

// Beim allerersten Login (weder abgeschlossen noch übersprungen) wird das
// Onboarding automatisch gestartet.
export function shouldShowOnboardingAutomatically(
  s: OnboardingState
): boolean {
  return !s.completed && !s.skipped
}

// Banner auf dem Dashboard nur, wenn bewusst übersprungen, aber (noch)
// nicht abgeschlossen.
export function shouldShowOnboardingBanner(s: OnboardingState): boolean {
  return s.skipped && !s.completed
}

function clampStep(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 0
  return Math.min(ONBOARDING_LAST_STEP, Math.max(0, v))
}

// Defensiv aus unbekanntem JSON in einen sauberen OnboardingState — fehlt
// ein Feld oder hat es den falschen Typ, greift der Default.
export function coerceOnboardingState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ONBOARDING_STATE }
  const r = raw as Record<string, unknown>
  const completedSteps = Array.isArray(r.completedSteps)
    ? Array.from(
        new Set(
          r.completedSteps
            .filter((x): x is number => typeof x === 'number')
            .map((x) => clampStep(x))
        )
      ).sort((a, b) => a - b)
    : []
  return {
    completed: r.completed === true,
    skipped: r.skipped === true,
    currentStep: clampStep(r.currentStep),
    completedSteps,
    lastUpdated: typeof r.lastUpdated === 'string' ? r.lastUpdated : '',
  }
}

// Liest den Zustand; jeder Fehler (fehlende Spalte, kein Settings-Row,
// kaputtes JSON) → Default. Niemals werfen.
export async function loadOnboardingState(
  supabase: SupabaseServer,
  userId: string
): Promise<OnboardingState> {
  try {
    const { data, error } = await supabase
      .from('einstellungen')
      .select('onboarding_state')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return { ...DEFAULT_ONBOARDING_STATE }
    return coerceOnboardingState(
      (data as { onboarding_state?: unknown }).onboarding_state
    )
  } catch {
    return { ...DEFAULT_ONBOARDING_STATE }
  }
}

// Schreibt den Zustand (upsert auf user_id). Gibt eine Fehlermeldung
// zurück statt zu werfen — der Aufrufer (Server-Action) entscheidet, ob
// das den Nutzer-Flow blockiert.
export async function saveOnboardingState(
  supabase: SupabaseServer,
  userId: string,
  next: OnboardingState
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('einstellungen')
      .upsert(
        { user_id: userId, onboarding_state: next },
        { onConflict: 'user_id' }
      )
    return { error: error ? error.message : null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unbekannter Fehler' }
  }
}
