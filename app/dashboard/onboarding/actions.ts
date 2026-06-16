'use server'

// V3.5 — Server-Actions für das Käufer-Onboarding. Persistiert in
// einstellungen.onboarding_state (siehe lib/onboarding-state.ts) sowie
// die drei Profil-Felder aus Schritt 3 (existierende Spalten).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  loadOnboardingState,
  saveOnboardingState,
  ONBOARDING_LAST_STEP,
  type OnboardingState,
} from '@/lib/onboarding-state'

function revalidate() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/onboarding')
}

async function mutate(
  apply: (cur: OnboardingState) => OnboardingState
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const cur = await loadOnboardingState(supabase, user.id)
  const next = apply(cur)
  next.lastUpdated = new Date().toISOString()
  const res = await saveOnboardingState(supabase, user.id, next)
  if (!res.error) revalidate()
  return res
}

// Schritt-Wechsel: setzt currentStep und merkt den verlassenen Schritt
// als erledigt vor (für die Übersicht bei abgeschlossenem Onboarding).
export async function goToOnboardingStep(
  step: number,
  markStepDone?: number
) {
  return mutate((cur) => {
    const completedSteps =
      typeof markStepDone === 'number' &&
      !cur.completedSteps.includes(markStepDone)
        ? [...cur.completedSteps, markStepDone].sort((a, b) => a - b)
        : cur.completedSteps
    return {
      ...cur,
      currentStep: Math.min(
        ONBOARDING_LAST_STEP,
        Math.max(0, Math.floor(step))
      ),
      completedSteps,
    }
  })
}

export async function skipOnboarding() {
  return mutate((cur) => ({ ...cur, skipped: true }))
}

export async function completeOnboarding() {
  return mutate((cur) => ({
    ...cur,
    completed: true,
    skipped: false,
    currentStep: ONBOARDING_LAST_STEP,
    completedSteps: Array.from(
      { length: ONBOARDING_LAST_STEP + 1 },
      (_, i) => i
    ),
  }))
}

// Setzt das Onboarding für einen erneuten Durchlauf zurück (Sidebar-
// Wiederaufruf bei bereits abgeschlossenem Onboarding ist read-only —
// dieser Reset ist nur für einen bewussten Neustart).
export async function restartOnboarding() {
  return mutate((cur) => ({
    ...cur,
    completed: false,
    skipped: false,
    currentStep: 0,
  }))
}

// Schritt 3 — Profil & Pinterest-Zugang. Schreibt in vorhandene Spalten.
export async function saveOnboardingProfile(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const profil_name = String(formData.get('profil_name') ?? '').trim()
  const pinterest_account_url = String(
    formData.get('pinterest_account_url') ?? ''
  ).trim()
  const pinterest_analytics_url = String(
    formData.get('pinterest_analytics_url') ?? ''
  ).trim()

  const { error } = await supabase.from('einstellungen').upsert(
    {
      user_id: user.id,
      profil_name: profil_name || null,
      pinterest_account_url: pinterest_account_url || null,
      pinterest_analytics_url: pinterest_analytics_url || null,
    },
    { onConflict: 'user_id' }
  )
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}
