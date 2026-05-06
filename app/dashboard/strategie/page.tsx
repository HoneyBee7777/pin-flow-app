import { createClient } from '@/lib/supabase-server'
import StrategieClient from './StrategieClient'
import { STRATEGIE_SELECT, type StrategieRow } from './lib'
import { loadUserBenchmark } from '../analytics/benchmark'
import {
  thresholdsFromSettings,
  type EinstellungenSchwellwerte,
  type PinAnalyticsThresholds,
} from '../analytics/utils'

export default async function StrategiePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let row: StrategieRow | null = null
  // Default-Thresholds für den Logged-out- und Fallback-Fall, damit die
  // Texte in „Analytics & Boards" auch ohne User-Settings sinnvolle Werte zeigen.
  let thresholds: PinAnalyticsThresholds = thresholdsFromSettings(null, null)
  if (user) {
    const [strategieRes, settingsRes, benchmark] = await Promise.all([
      supabase
        .from('einstellungen')
        .select(STRATEGIE_SELECT)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('einstellungen')
        .select(
          `schwellwert_beobachtung, schwellwert_min_klicks,
           schwellwert_ctr,
           schwellwert_min_imp_ctr_urteil, schwellwert_min_imp_reichweite_stark,
           schwellwert_min_klicks_nutzer_signal,
           schwellwert_top_performer_max_alter,
           schwellwert_schlafender_gewinner_alter,
           schwellwert_ctr_boost_faktor`
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      loadUserBenchmark(user.id),
    ])
    row = (strategieRes.data ?? null) as StrategieRow | null
    thresholds = thresholdsFromSettings(
      settingsRes.data as Partial<EinstellungenSchwellwerte> | null,
      benchmark
    )
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Strategie &amp; Ausrichtung
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Pinterest-Grundlagen, Strategie-Optionen und Pin-Design – die
          Wissens-Basis für deine eigene Strategie.
        </p>
      </header>

      <StrategieClient strategie={row} thresholds={thresholds} />
    </div>
  )
}
