// V3.5 — Onboarding-Hauptseite (Server). Lädt Zustand + Vorbelegungen,
// berechnet die dynamische Abschluss-Empfehlung (Schritt 12) und übergibt
// alles an den Client. Diese Route ist vom Auto-Redirect-Gate in
// app/dashboard/page.tsx ausgenommen (sonst Endlos-Redirect).

import { createClient } from '@/lib/supabase-server'
import {
  loadOnboardingState,
  ONBOARDING_LAST_STEP,
} from '@/lib/onboarding-state'
import OnboardingClient, {
  type CompletionInfo,
  type ProfileDefaults,
} from './OnboardingClient'

async function count(
  supabase: ReturnType<typeof createClient>,
  table: string
): Promise<number> {
  try {
    const { count: c } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
    return c ?? 0
  } catch {
    return 0
  }
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const state = await loadOnboardingState(supabase, user.id)

  const [{ data: settings }, contentN, keywordsN, pinsN, analyticsN] =
    await Promise.all([
      supabase
        .from('einstellungen')
        .select(
          'profil_name, pinterest_account_url, pinterest_analytics_url, strategie_onboarding_abgeschlossen'
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      count(supabase, 'content_inhalte'),
      count(supabase, 'keywords'),
      count(supabase, 'pins'),
      count(supabase, 'profil_analytics'),
    ])

  const profile: ProfileDefaults = {
    profilName: settings?.profil_name ?? '',
    pinterestAccountUrl: settings?.pinterest_account_url ?? '',
    pinterestAnalyticsUrl: settings?.pinterest_analytics_url ?? '',
  }

  const strategieDone =
    settings?.strategie_onboarding_abgeschlossen === true
  const hasAnalytics = analyticsN > 0

  const missing: CompletionInfo['missing'] = []
  if (!strategieDone)
    missing.push({ label: 'Strategie festlegen', href: '/dashboard/strategie' })
  if (contentN === 0)
    missing.push({
      label: 'Inhalte eintragen',
      href: '/dashboard/content-inhalte',
    })
  if (keywordsN === 0)
    missing.push({ label: 'Keywords pflegen', href: '/dashboard/keywords' })
  if (pinsN === 0)
    missing.push({
      label: 'Pins anlegen oder importieren',
      href: '/dashboard/pin-produktion',
    })
  if (!hasAnalytics)
    missing.push({
      label: 'Analytics importieren',
      href: '/dashboard/analytics',
    })

  const completion: CompletionInfo = { strategieDone, hasAnalytics, missing }

  // Start-Schritt: ?step= (Rückkehr aus dem Strategie-Onboarding) hat
  // Vorrang, sonst der zuletzt gespeicherte Schritt.
  const stepParam = Number(searchParams?.step)
  const initialStep =
    Number.isFinite(stepParam) && stepParam >= 0
      ? Math.min(ONBOARDING_LAST_STEP, Math.floor(stepParam))
      : state.currentStep

  return (
    <OnboardingClient
      initialStep={initialStep}
      alreadyCompleted={state.completed && !searchParams?.step}
      profile={profile}
      completion={completion}
    />
  )
}
