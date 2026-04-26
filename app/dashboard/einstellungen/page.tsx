import { createClient } from '@/lib/supabase-server'
import EinstellungenClient from './EinstellungenClient'

export default async function EinstellungenPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('einstellungen')
    .select(
      `eigene_signalwoerter, pinterest_analytics_url,
       schwellwert_beobachtung, schwellwert_min_klicks,
       schwellwert_alter_recycling, schwellwert_ctr, schwellwert_impressionen`
    )
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-600">
          Persönliche Konfiguration und nutzerspezifische Anpassungen.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {error.message}
        </div>
      )}

      <EinstellungenClient
        initialEigeneSignalwoerter={data?.eigene_signalwoerter ?? ''}
        initialPinterestAnalyticsUrl={data?.pinterest_analytics_url ?? ''}
        initialSchwellwerte={{
          beobachtung: data?.schwellwert_beobachtung ?? null,
          minKlicks: data?.schwellwert_min_klicks ?? null,
          alterRecycling: data?.schwellwert_alter_recycling ?? null,
          ctr:
            data?.schwellwert_ctr === null ||
            data?.schwellwert_ctr === undefined
              ? null
              : Number(data.schwellwert_ctr),
          impressionen: data?.schwellwert_impressionen ?? null,
        }}
      />
    </div>
  )
}
