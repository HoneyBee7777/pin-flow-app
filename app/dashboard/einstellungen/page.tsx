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
      `profil_name, eigene_signalwoerter, pinterest_analytics_url,
       pinterest_account_url, website_url, tailwind_url,
       schwellwert_beobachtung, schwellwert_min_klicks,
       schwellwert_alter_recycling, schwellwert_ctr, schwellwert_impressionen,
       schwellwert_board_wenig_aktiv, schwellwert_board_inaktiv,
       schwellwert_board_top_er, schwellwert_board_top_prozent,
       schwellwert_board_schwach_er, schwellwert_board_wachstum_trend,
       cp_min_pins_gesamt, cp_min_pins_ohne_aktuell, cp_tage_ohne_pin,
       cp_min_ctr_goldnugget, cp_max_pins_goldnugget,
       strategie_soll_blog, strategie_soll_affiliate, strategie_soll_produkt,
       ziel_soll_traffic, ziel_soll_lead, ziel_soll_sales,
       format_soll_standard, format_soll_video, format_soll_collage, format_soll_carousel,
       strategie_onboarding_abgeschlossen,
       strategie_check_schwelle_gelb, strategie_check_schwelle_rot`
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
        initialProfilName={data?.profil_name ?? ''}
        initialEigeneSignalwoerter={data?.eigene_signalwoerter ?? ''}
        initialPinterestAnalyticsUrl={data?.pinterest_analytics_url ?? ''}
        initialPersoenlicheLinks={{
          pinterestAccountUrl: data?.pinterest_account_url ?? '',
          websiteUrl: data?.website_url ?? '',
          tailwindUrl: data?.tailwind_url ?? '',
        }}
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
        initialBoardSchwellwerte={{
          wenigAktiv: data?.schwellwert_board_wenig_aktiv ?? null,
          inaktiv: data?.schwellwert_board_inaktiv ?? null,
          topEr:
            data?.schwellwert_board_top_er === null ||
            data?.schwellwert_board_top_er === undefined
              ? null
              : Number(data.schwellwert_board_top_er),
          topProzent:
            data?.schwellwert_board_top_prozent === null ||
            data?.schwellwert_board_top_prozent === undefined
              ? null
              : Number(data.schwellwert_board_top_prozent),
          schwachEr:
            data?.schwellwert_board_schwach_er === null ||
            data?.schwellwert_board_schwach_er === undefined
              ? null
              : Number(data.schwellwert_board_schwach_er),
          wachstumTrend:
            data?.schwellwert_board_wachstum_trend === null ||
            data?.schwellwert_board_wachstum_trend === undefined
              ? null
              : Number(data.schwellwert_board_wachstum_trend),
        }}
        initialContentPipelineSchwellwerte={{
          minPinsGesamt: data?.cp_min_pins_gesamt ?? null,
          minPinsOhneAktuell: data?.cp_min_pins_ohne_aktuell ?? null,
          tageOhnePin: data?.cp_tage_ohne_pin ?? null,
          minCtrGoldnugget:
            data?.cp_min_ctr_goldnugget === null ||
            data?.cp_min_ctr_goldnugget === undefined
              ? null
              : Number(data.cp_min_ctr_goldnugget),
          maxPinsGoldnugget: data?.cp_max_pins_goldnugget ?? null,
        }}
        initialStrategie={{
          mix: [
            data?.strategie_soll_blog ?? 0,
            data?.strategie_soll_affiliate ?? 0,
            data?.strategie_soll_produkt ?? 0,
          ],
          ziele: [
            data?.ziel_soll_traffic ?? 0,
            data?.ziel_soll_lead ?? 0,
            data?.ziel_soll_sales ?? 0,
          ],
          format: [
            data?.format_soll_standard ?? 60,
            data?.format_soll_video ?? 20,
            data?.format_soll_collage ?? 10,
            data?.format_soll_carousel ?? 10,
          ],
          schwelleGelb: data?.strategie_check_schwelle_gelb ?? 5,
          schwelleRot: data?.strategie_check_schwelle_rot ?? 15,
          onboardingAbgeschlossen:
            data?.strategie_onboarding_abgeschlossen === true,
        }}
      />
    </div>
  )
}
