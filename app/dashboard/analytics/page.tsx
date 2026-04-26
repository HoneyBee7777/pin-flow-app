import { createClient } from '@/lib/supabase-server'
import AnalyticsClient from './AnalyticsClient'
import { withGrowth, type ProfilAnalytics } from './utils'

export default async function AnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profilRes, settingsRes] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false }),
    supabase
      .from('einstellungen')
      .select('pinterest_analytics_url, analytics_update_datum')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilAnalytics = withGrowth(rows)

  const loadError =
    profilRes.error?.message ?? settingsRes.error?.message ?? null

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Trage deine Pinterest-Zahlen monatlich ein und beobachte die
          Entwicklung deines Profils, deiner Pins und Boards.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      <AnalyticsClient
        profilAnalytics={profilAnalytics}
        pinterestAnalyticsUrl={
          settingsRes.data?.pinterest_analytics_url ?? null
        }
        analyticsUpdateDatum={
          settingsRes.data?.analytics_update_datum ?? null
        }
      />
    </div>
  )
}
