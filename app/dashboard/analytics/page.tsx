import { createClient } from '@/lib/supabase-server'
import AnalyticsClient from './AnalyticsClient'
import {
  calcCtr,
  diagnosePin,
  diffDays,
  PIN_HANDLUNG,
  thresholdsFromSettings,
  todayIso,
  withGrowth,
  type EinstellungenSchwellwerte,
  type PinAnalyticsRow,
  type PinOption,
  type ProfilAnalytics,
} from './utils'

type RawPinAnalyticsRow = {
  id: string
  pin_id: string
  datum: string
  impressionen: number
  klicks: number
  saves: number
  created_at: string
  pins: PinOption | null
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profilRes, settingsRes, pinsRes, pinAnalyticsRes] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false }),
    supabase
      .from('einstellungen')
      .select(
        `pinterest_analytics_url, analytics_update_datum,
         schwellwert_beobachtung, schwellwert_min_klicks,
         schwellwert_alter_recycling, schwellwert_ctr, schwellwert_impressionen`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pins')
      .select('id, titel, status, created_at, geplante_veroeffentlichung')
      .order('created_at', { ascending: false }),
    supabase
      .from('pins_analytics')
      .select(
        `id, pin_id, datum, impressionen, klicks, saves, created_at,
         pins ( id, titel, status, created_at, geplante_veroeffentlichung )`
      )
      .order('datum', { ascending: false }),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilAnalytics = withGrowth(rows)

  const pins = (pinsRes.data ?? []) as PinOption[]

  const today = todayIso()
  const thresholds = thresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerte> | null
  )
  const rawPinAnalytics =
    (pinAnalyticsRes.data ?? []) as unknown as RawPinAnalyticsRow[]
  const pinAnalytics: PinAnalyticsRow[] = rawPinAnalytics.map((row) => {
    const pin = row.pins
    const hatDatum = !!pin?.geplante_veroeffentlichung
    const refDate =
      pin?.geplante_veroeffentlichung ??
      pin?.created_at?.slice(0, 10) ??
      row.datum
    const alterTage = Math.max(0, diffDays(refDate, today))
    const ctr = calcCtr(row.klicks, row.impressionen)
    const diagnose = diagnosePin({
      alterTage,
      klicks: row.klicks,
      impressionen: row.impressionen,
      ctr,
      hatDatum,
      thresholds,
    })
    return {
      id: row.id,
      pin_id: row.pin_id,
      datum: row.datum,
      impressionen: row.impressionen,
      klicks: row.klicks,
      saves: row.saves,
      created_at: row.created_at,
      pin,
      ctr,
      alter_tage: alterTage,
      diagnose,
      handlung: PIN_HANDLUNG[diagnose],
    }
  })

  const loadError =
    profilRes.error?.message ??
    settingsRes.error?.message ??
    pinsRes.error?.message ??
    pinAnalyticsRes.error?.message ??
    null

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
        pins={pins}
        pinAnalytics={pinAnalytics}
        thresholds={thresholds}
      />
    </div>
  )
}
