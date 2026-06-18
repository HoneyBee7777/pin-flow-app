import { createClient } from '@/lib/supabase-server'
import EinstellungenClient from './EinstellungenClient'
import { loadUserBenchmark } from '../analytics/benchmark'
import { loadAccountNicheProfile } from '../analytics/account-niche'

export default async function EinstellungenPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data, error }, benchmark, nicheProfile] = await Promise.all([
    supabase
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
       schwellwert_ctr_boost_faktor,
       schwellwert_board_wenig_aktiv, schwellwert_board_inaktiv,
       schwellwert_board_top_er, schwellwert_board_top_prozent,
       schwellwert_board_schwach_er, schwellwert_board_wachstum_trend,
       cp_min_pins_gesamt, cp_min_pins_ohne_aktuell, cp_tage_ohne_pin,
       cp_min_ctr_goldnugget, cp_max_pins_goldnugget`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    loadUserBenchmark(user.id),
    loadAccountNicheProfile(user.id),
  ])

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Hier richtest du Pin-Flow für dich ein: deinen Profilnamen für die
          Begrüßung, die Links zu deinem Pinterest-Konto und deinen Tools, und
          die Signalwörter für deine Pin-Texte. Weiter unten kannst du in den
          erweiterten Einstellungen die Schwellwerte anpassen, nach denen
          Pin-Flow deine Pins, Boards und deinen Content bewertet. Wenn du dir
          unsicher bist, lass die Standardwerte einfach stehen.
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
        initialSchwellwerte={{
          beobachtung: data?.schwellwert_beobachtung ?? null,
          minKlicksTopPerformer: data?.schwellwert_min_klicks ?? null,
          minImpCtrUrteil: data?.schwellwert_min_imp_ctr_urteil ?? null,
          minImpReichweiteStark:
            data?.schwellwert_min_imp_reichweite_stark ?? null,
          minKlicksNutzerSignal:
            data?.schwellwert_min_klicks_nutzer_signal ?? null,
          topPerformerMaxAlter:
            data?.schwellwert_top_performer_max_alter ?? null,
          schlafenderGewinnerAlter:
            data?.schwellwert_schlafender_gewinner_alter ?? null,
          ctrBoostFaktor:
            data?.schwellwert_ctr_boost_faktor === null ||
            data?.schwellwert_ctr_boost_faktor === undefined
              ? null
              : Number(data.schwellwert_ctr_boost_faktor),
          fallbackCtr:
            data?.schwellwert_ctr === null ||
            data?.schwellwert_ctr === undefined
              ? null
              : Number(data.schwellwert_ctr),
        }}
        initialBenchmark={benchmark}
        initialNicheProfile={nicheProfile}
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
      />
    </div>
  )
}
