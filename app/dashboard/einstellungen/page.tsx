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
      `profil_name, eigene_signalwoerter, signalwoerter_deaktiviert,
       pinterest_analytics_url,
       pinterest_account_url, website_url, tailwind_url,
       schwellwert_beobachtung, schwellwert_min_klicks,
       schwellwert_ctr,
       schwellwert_min_imp_ctr_urteil, schwellwert_min_imp_reichweite_stark,
       schwellwert_min_klicks_nutzer_signal,
       schwellwert_top_performer_max_alter,
       schwellwert_schlafender_gewinner_alter,
       schwellwert_ctr_boost_faktor`
    )
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Hier richtest du Pin-Flow für dich ein: deinen Profilnamen für die
          Begrüßung, die Links zu deinem Pinterest-Konto und deinen Tools, und
          die Signalwörter für deine Pin-Texte.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {error.message}
        </div>
      )}

      <EinstellungenClient
        initialProfilName={data?.profil_name ?? ''}
        initialEigeneSignalwoerter={data?.eigene_signalwoerter ?? ''}
        initialSignalwoerterDeaktiviert={
          data?.signalwoerter_deaktiviert ?? ''
        }
        initialPinterestAnalyticsUrl={data?.pinterest_analytics_url ?? ''}
        initialPersoenlicheLinks={{
          pinterestAccountUrl: data?.pinterest_account_url ?? '',
          websiteUrl: data?.website_url ?? '',
          tailwindUrl: data?.tailwind_url ?? '',
        }}
      />
    </div>
  )
}
