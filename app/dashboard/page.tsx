import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import {
  loadOnboardingState,
  shouldShowOnboardingAutomatically,
  shouldShowOnboardingBanner,
} from '@/lib/onboarding-state'
import OnboardingBanner from '@/components/OnboardingBanner'
import InfoTooltip, { LabelWithTooltip } from '@/components/InfoTooltip'
import { HinweisBox } from '@/components/HinweisBox'
import {
  boardThresholdsFromSettings,
  boardAccountHinweise,
  boardHebelFuerBoard,
  boardWirkung,
  boardWirkungMediane,
  BOARD_WIRKUNG_DEFAULTS,
  calcCtr,
  calcUpdateStatusMonat,
  diagnoseBoard,
  diffDays,
  formatDateDe,
  formatGrowth,
  formatPercent,
  formatZahl,
  thresholdsFromSettings,
  type BoardHebel,
  type BoardHebelTyp,
  type BoardWirkung,
  type PinAnalyticsThresholds,
  todayIso,
  withGrowth,
  type BoardStatus,
  type EinstellungenSchwellwerte,
  type PinDiagnose,
  type PinOption,
  type ProfilAnalytics,
  type ProfilAnalyticsWithGrowth,
  type UpdateStatusMonat,
} from './analytics/utils'
import {
  diagnosePinAggregated,
  PIN_DIAGNOSE_TOOLTIP,
} from './analytics/diagnosePinAggregated'
import { loadUserBenchmark } from './analytics/benchmark'
import { loadAccountNicheProfile } from './analytics/account-niche'
import { calculateCoachingDiagnoses } from '@/lib/account-coaching'
import ZielgruppeCoachingBlock from './ZielgruppeCoachingBlock'
import { getAudienceSnapshots } from '@/lib/audience-snapshot'
import type { AudienceSnapshot } from '@/lib/audience-types'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import ProfilGesundheitBlock from './ProfilGesundheitBlock'
import WinsBlock from './WinsBlock'
import {
  computeStatus,
  type SaisonEvent,
} from './saison-kalender/utils'
import PerformanceChart, { type ChartPoint } from './PerformanceChart'
import AufgabenSection, { type Aufgabe } from './AufgabenSection'
import HandlungsbedarfPinRow, {
  type ActionButton,
  type HandlungsbedarfPin,
} from './HandlungsbedarfPinRow'
import BearbeitetRow, { type BearbeitetRowData } from './BearbeitetRow'
import StrategieCheckSection from './strategie-check/StrategieCheckSection'
import BriefingSection from './briefing/BriefingSection'
import {
  buildBriefingItems,
  buildNextStepsItems,
  type BriefingItem,
} from './briefing/lib'
import {
  computeStrategieCheckV2,
  type StrategieCheckV2,
  type StrategieCheckV2Pin,
  type StrategieCheckV2Settings,
} from './strategie-check/lib'
import { parseStrategieRow, type StrategieRow } from './strategie/lib'

// Pin-Pipeline-Defaults — greifen, wenn `einstellungen` für den User
// (noch) keine Zeile bzw. NULL-Werte enthält. Nutzer-Werte werden in
// /dashboard/einstellungen unter „Content-Pipeline-Schwellwerte" gepflegt.
const PIPELINE_DEFAULT_MIN_PINS_GESAMT = 3
const PIPELINE_DEFAULT_MIN_PINS_OHNE_AKTUELL = 3
const PIPELINE_DEFAULT_TAGE_OHNE_PIN = 30
const PIPELINE_DEFAULT_MIN_CTR_GOLDNUGGET = 1.5
const PIPELINE_DEFAULT_MAX_PINS_GOLDNUGGET = 5

type PipelineThresholds = {
  minPinsGesamt: number
  minPinsOhneAktuell: number
  tageOhnePin: number
  minCtrGoldnugget: number
  maxPinsGoldnugget: number
}

type PinPipelineInhalt = {
  id: string
  titel: string
  pinCount: number
  letzterPinTage: number | null
  boardNames: string[]
  keywords: string[]
  primaryUrl: string | null
}

type UrlPotenzialRow = {
  basisUrl: string
  displayTitle: string
  pinCount: number
  ctr: number
  boardNames: string[]
}

type KanbanEvent = {
  id: string
  event_name: string
  event_datum: string
  pinStart: string
  pinEnd: string
  suchbeginnTage: number
  countdownDays: number
}

type SaisonKanbanColumns = {
  jetztProduzieren: KanbanEvent[]
  jetztPinnen: KanbanEvent[]
  hochphase: KanbanEvent[]
  nochZeit: KanbanEvent[]
}

type RawPinAnalyticsRow = {
  id: string
  pin_id: string
  datum: string
  zeitraum_bis: string | null
  impressionen: number
  klicks: number
  saves: number
  created_at: string
  pins: PinOption | null
}

type ActionablePin = {
  id: string
  pin_id: string
  titel: string | null
  klicks: number
  impressionen: number
  saves: number
  ctr: number | null
  alterTage: number
  letzterAnalyticsDatum: string
  pinterestUrl: string | null
  diagnose: PinDiagnose
  handlung: string
  // Board-Verknüpfung — wird nach Berechnung der Board-Gesundheit gesetzt.
  // Felder bleiben null bis zum Enrich-Pass; siehe Block „Board-Verknüpfung".
  boardId: string | null
  boardName: string | null
  // Aktivitäts-Status des Boards (diagnoseBoard: aktiv/wenig_aktiv/inaktiv).
  // null = kein Board zugeordnet. Quelle fürs Pin-Board-Badge + Coaching.
  boardAktivitaet: BoardStatus | null
}

type BoardDashHealth = {
  id: string
  name: string
  pinterestUrl: string | null
  status: BoardStatus
  impressionen: number
  klicks: number
  hasAnalytics: boolean
  anzahlPins: number | null
  // Quelle der Wahrheit für „Pins auf diesem Board" — kommt aus der pins-
  // Tabelle (alle Status-Stufen). anzahlPins oben ist der CSV-Wert von
  // Pinterest und kann 0 sein, wenn Pinterest die Zahl nicht liefert.
  pinsInDb: number
  lastPinDate: string | null
  lastPinAlterTage: number | null
  lastPinId: string | null
}

// ===========================================================
// Board-Coaching: Anzeige-Texte je Hebel-Typ (freigegeben). Die Logik
// (welche Hebel ein Board hat) liegt in utils.ts; hier nur die Formulierungen.
// ===========================================================
const BOARD_HEBEL_TEXT: Record<BoardHebelTyp, string> = {
  eingeschlafen:
    'Dieses Board lief schon mal richtig gut, schläft aber gerade. Weck es mit 3 bis 5 frischen Pins pro Woche wieder auf, dann kommt die Sichtbarkeit zurück.',
  beschreibung_fehlt:
    'Diesem Board fehlt noch die Beschreibung. Schreib 200 bis 300 Zeichen, die dein Thema erklären, und pack dein Haupt-Keyword gleich in den ersten Satz.',
  name_ohne_keyword:
    'Im Namen dieses Boards steckt noch keines deiner Keywords. Stell dein wichtigstes Keyword nach vorn, damit Pinterest sofort versteht, worum es geht.',
  beschreibung_zu_duenn:
    'Die Beschreibung ist noch sehr knapp. Bau sie auf 200 bis 300 Zeichen aus, gern mit deinem Haupt-Keyword im ersten Satz, aber bitte nicht mit Keywords vollstopfen.',
  beschreibung_ohne_keyword:
    'Deine Beschreibung steht, aber ohne eines deiner Keywords. Bring dein Haupt-Keyword gleich in den ersten Satz, dann ordnet Pinterest das Board besser ein.',
  wirkung_schwach:
    'Dieses Board bekommt Impressionen, aber die Klicks bleiben aus. Schau dir die Pins hier an, oft fehlt der Anreiz zum Klicken im Titel oder Bild.',
  name_zu_lang:
    'Der Board-Name ist etwas lang. Kürz ihn auf maximal 50 Zeichen und stell das Wichtigste nach vorn, so bleibt er klar und gut auffindbar.',
}

// Verständlicher Satz je Hebel-Typ für die Liste der Bündelkarte (Board mit
// >= 3 offenen Hebeln). Bewusst ganze Sätze statt Kürzel.
const BOARD_HEBEL_BUENDEL_PUNKT: Record<BoardHebelTyp, string> = {
  eingeschlafen: 'Das Board ist eingeschlafen, pinne wieder regelmäßig.',
  beschreibung_fehlt: 'Es fehlt die Beschreibung.',
  beschreibung_zu_duenn: 'Die Beschreibung ist noch zu knapp.',
  name_ohne_keyword: 'Im Namen steckt keines deiner Keywords.',
  beschreibung_ohne_keyword: 'In der Beschreibung fehlt eines deiner Keywords.',
  name_zu_lang: 'Der Name ist länger als 50 Zeichen.',
  wirkung_schwach: 'Das Board bekommt Reichweite, aber kaum Klicks.',
}

// Eine der bis zu drei priorisierten Handlungskarten (Einzel-Hebel oder Bündel).
// Einzel: `text` ist der Coaching-Satz. Bündel: `buendelPunkte` ist die Liste
// der offenen Punkte (absteigend nach Dringlichkeit), `text` bleibt leer.
type CoachingKarte = {
  kind: 'einzel' | 'buendel'
  boardId: string
  boardName: string
  pinterestUrl: string | null
  text: string
  buendelPunkte?: string[]
  prepared: { entwurf: number; geplant: number }
}

// Ein Board im einklappbaren Bereich: restliche Hebel-Texte + vorbereitete Pins.
type CoachingRestBoard = {
  boardId: string
  boardName: string
  pinterestUrl: string | null
  hebelTexte: string[]
  prepared: { entwurf: number; geplant: number }
}


type HandlungsCategory = {
  diagnose: PinDiagnose
  emoji: string
  label: string
  subtitle: string
  tooltip: string
  iconBg: string
  counterBg: string
  primaryAction: ActionButton
  metrics: Array<
    'klicks' | 'impressionen' | 'saves' | 'ctr' | 'alter' | 'datum' | 'push'
  >
  metricLabels: Partial<
    Record<
      'klicks' | 'impressionen' | 'saves' | 'ctr' | 'alter' | 'datum' | 'push',
      string
    >
  >
}

const HANDLUNGS_CATEGORIES: HandlungsCategory[] = [
  {
    diagnose: 'aktiver_top_performer',
    emoji: '⭐',
    label: 'Aktiver Top Performer',
    subtitle:
      'Diese Pins laufen stark – produziere Varianten solange der Algorithmus pusht.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.aktiver_top_performer,
    iconBg: 'bg-green-100 text-green-700',
    counterBg: 'bg-green-100 text-green-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Variante erstellen',
    },
    metrics: ['klicks', 'ctr', 'impressionen', 'saves', 'alter', 'push'],
    metricLabels: {
      klicks: 'Ausg. Klicks',
      ctr: 'CTR',
      impressionen: 'Impressionen',
      saves: 'Saves',
      alter: 'alt',
      push: 'Algorithmus-Push',
    },
  },
  {
    diagnose: 'hidden_gem',
    emoji: '💎',
    label: 'Hidden Gem',
    subtitle:
      'Hohe Klickrate, aber wenig Reichweite — das Cover überzeugt, nur findet Pinterest den Pin kaum. Die Keywords sind der Hebel.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.hidden_gem,
    iconBg: 'bg-blue-100 text-blue-700',
    counterBg: 'bg-blue-100 text-blue-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Neuen Pin erstellen',
    },
    metrics: ['ctr', 'impressionen', 'klicks', 'saves'],
    metricLabels: {
      ctr: 'CTR',
      impressionen: 'Impressionen',
      klicks: 'Ausg. Klicks',
      saves: 'Saves',
    },
  },
  {
    diagnose: 'reichweite_ohne_wirkung',
    emoji: '🔧',
    label: 'Reichweite ohne Wirkung',
    subtitle:
      'Pinterest spielt diesen Pin gut aus – aber zu wenige Menschen klicken durch.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.reichweite_ohne_wirkung,
    iconBg: 'bg-orange-100 text-orange-700',
    counterBg: 'bg-orange-100 text-orange-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Neuen Pin erstellen',
    },
    metrics: ['impressionen', 'ctr', 'klicks', 'saves'],
    metricLabels: {
      impressionen: 'Impressionen',
      ctr: 'CTR',
      klicks: 'Ausg. Klicks',
      saves: 'Saves',
    },
  },
  {
    diagnose: 'save_magnet',
    emoji: '🧲',
    label: 'Save-Magnet',
    subtitle:
      'Wird oft gespeichert, aber selten geklickt – das Cover zieht, der Klick fehlt.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.save_magnet,
    iconBg: 'bg-purple-100 text-purple-700',
    counterBg: 'bg-purple-100 text-purple-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Neuen Pin mit Call-to-Action',
    },
    metrics: ['saves', 'impressionen', 'ctr', 'klicks'],
    metricLabels: {
      saves: 'Saves',
      impressionen: 'Impressionen',
      ctr: 'CTR',
      klicks: 'Ausg. Klicks',
    },
  },
  {
    diagnose: 'eingeschlafener_gewinner',
    emoji: '♻️',
    label: 'Eingeschlafener Gewinner',
    subtitle:
      'Pins, die früher stark liefen — Pinterest spielt sie kaum noch aus. Zeit für einen frischen Pin.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.eingeschlafener_gewinner,
    iconBg: 'bg-amber-100 text-amber-800',
    counterBg: 'bg-amber-100 text-amber-800',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'recycling',
      label: 'Neu aufsetzen',
    },
    metrics: ['klicks', 'saves', 'alter', 'datum'],
    metricLabels: {
      klicks: 'Frühere Klicks',
      saves: 'Saves',
      alter: 'alt',
      datum: 'Letzter Analytics-Eintrag',
    },
  },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // V3.5 — Auto-Redirect-Gate: beim allerersten Login (weder
  // abgeschlossen noch übersprungen) direkt ins Onboarding. Vor dem
  // teuren Daten-Load, damit kein Dashboard unnötig gerendert wird.
  const onboardingState = await loadOnboardingState(supabase, user.id)
  if (shouldShowOnboardingAutomatically(onboardingState)) {
    redirect('/dashboard/onboarding')
  }
  const showOnboardingBanner = shouldShowOnboardingBanner(onboardingState)

  const [
    profilRes,
    settingsRes,
    pinAnalyticsRes,
    saisonRes,
    urlsRes,
    aufgabenRes,
    erledigtRes,
    pinsPublishedCountRes,
    boardsCountRes,
    boardAnalyticsRes,
    contentInhalteRes,
    keywordsRes,
    pinKeywordsRes,
    benchmark,
    nicheProfile,
    audienceSnapshots,
  ] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, zeitraum_bis, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false })
      .limit(12),
    supabase
      .from('einstellungen')
      .select(
        `profil_name, analytics_update_datum,
         schwellwert_beobachtung, schwellwert_min_klicks,
         schwellwert_ctr,
         schwellwert_min_imp_ctr_urteil, schwellwert_min_imp_reichweite_stark,
         schwellwert_min_klicks_nutzer_signal,
         schwellwert_top_performer_max_alter,
         schwellwert_schlafender_gewinner_alter,
         schwellwert_ctr_boost_faktor,
         cp_min_pins_gesamt, cp_min_pins_ohne_aktuell, cp_tage_ohne_pin,
         cp_min_ctr_goldnugget, cp_max_pins_goldnugget,
         strategie_business_modell, strategie_hauptnische,
         ziel_soll_blog, ziel_soll_shop, ziel_soll_etsy, ziel_soll_affiliate,
         ziel_soll_landingpage, ziel_soll_newsletter, ziel_soll_buchung,
         strategie_content_saeulen, strategie_pinning_frequenz,
         strategie_letzte_aenderung, strategie_onboarding_abgeschlossen,
         strategie_check_schwelle_gelb, strategie_check_schwelle_rot`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    // pins_analytics: erweitert um pins.board_id für die Pin↔Board-Verknüpfung
    // (Etappe 3). Bei Netzwerk-/RLS-Fehler wird auf leeres Array zurückgefallen,
    // damit die Dashboard-Seite weiter rendert statt komplett zu crashen.
    Promise.resolve(
      supabase
        .from('pins_analytics')
        .select(
          `id, pin_id, datum, zeitraum_bis, impressionen, klicks, saves, created_at,
           pins ( id, titel, status, created_at, geplante_veroeffentlichung, pinterest_pin_url, board_id )`
        )
        .is('deleted_at', null)
        .order('datum', { ascending: false })
    ).catch((err: unknown) => {
      console.error('[Dashboard] pins_analytics query failed:', err)
      return { data: [], error: err as Error }
    }),
    supabase
      .from('saison_events')
      .select(
        'id, event_name, event_datum, saison_typ, suchbeginn_tage, notizen, datum_variabel, created_at'
      )
      .order('event_datum', { ascending: true, nullsFirst: false }),
    supabase.from('ziel_urls').select('id, titel, url, zielflaeche'),
    supabase
      .from('aufgaben')
      .select(
        'id, titel, faelligkeitsdatum, erledigt, prioritaet, created_at'
      )
      .eq('user_id', user.id),
    supabase
      .from('dashboard_erledigt')
      .select('pin_id, kategorie, created_at, pins ( id, titel )')
      .eq('user_id', user.id),
    // pins: alle Status-Stufen für Pin-Anzahl pro Board (Etappe 3).
    // Bei Netzwerk-/RLS-Fehler leeres Array → veroeffentlichtePinsCount = 0
    // und keine Reaktivierungs-Hinweise; restliche Sektionen rendern normal.
    Promise.resolve(
      supabase
        .from('pins')
        .select(
          'id, status, created_at, geplante_veroeffentlichung, board_id, content_id, ziel_url_id, strategie_typ, conversion_ziel, pin_format'
        )
    ).catch((err: unknown) => {
      console.error('[Dashboard] pins query failed:', err)
      return { data: [], error: err as Error }
    }),
    supabase
      .from('boards')
      .select('id, name, beschreibung, pinterest_url, created_at, kategorie'),
    supabase
      .from('board_analytics')
      .select(
        'id, board_id, datum, impressionen, klicks_auf_pins, ausgehende_klicks, saves, engagement, anzahl_pins, created_at'
      )
      .order('datum', { ascending: false }),
    // content_inhalte: Basis für die Pin-Pipeline-Section.
    // Joins liefern Boards, Keywords und Ziel-URLs pro Inhalt — analog
    // zu /dashboard/content-inhalte. RLS filtert auf user_id.
    Promise.resolve(
      supabase.from('content_inhalte').select(
        `id, titel,
         content_keywords ( keywords ( id, keyword ) ),
         content_urls ( ziel_urls ( id, titel, url ) ),
         content_boards ( boards ( id, name ) )`
      )
    ).catch((err: unknown) => {
      console.error('[Dashboard] content_inhalte query failed:', err)
      return { data: [], error: err as Error }
    }),
    // Keywords & SEO Sektion: keywords + pin_keywords des aktuellen Users.
    // Performance pro Keyword wird aus pinAnalyticsRes (latest per pin) abgeleitet.
    Promise.resolve(
      supabase
        .from('keywords')
        .select('id, keyword, typ')
        .eq('user_id', user.id)
    ).catch((err: unknown) => {
      console.error('[Dashboard] keywords query failed:', err)
      return { data: [], error: err as Error }
    }),
    Promise.resolve(
      supabase
        .from('pin_keywords')
        .select('pin_id, keyword_id')
        .eq('user_id', user.id)
    ).catch((err: unknown) => {
      console.error('[Dashboard] pin_keywords query failed:', err)
      return { data: [], error: err as Error }
    }),
    loadUserBenchmark(user.id),
    loadAccountNicheProfile(user.id),
    getAudienceSnapshots(),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilRows = withGrowth(rows)
  const latest = profilRows[0] ?? null
  const previous = profilRows[1] ?? null

  // ===== Begrüßung =====
  const profilName = (settingsRes.data?.profil_name ?? '').trim()
  const greetingName = (() => {
    if (profilName) return profilName
    const localPart = user.email?.split('@')[0] ?? ''
    if (!localPart) return ''
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase()
  })()

  // ===== Handlungsbedarf =====
  // Identische Diagnose-Logik wie /dashboard/analytics (PinsTab):
  //   - Gleiche pins_analytics-Query (alle Einträge, datum DESC).
  //   - Pro pin_id über alle Perioden aggregiert.
  //   - Gemeinsame Funktion diagnosePinAggregated() mit kumulierten Werten.
  // Damit zeigen Dashboard und Analytics-Tab dieselben Pins in
  // denselben Kategorien.
  const thresholds = thresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerte> | null,
    benchmark
  )

  type RawPipelineSettings = {
    cp_min_pins_gesamt: number | null
    cp_min_pins_ohne_aktuell: number | null
    cp_tage_ohne_pin: number | null
    cp_min_ctr_goldnugget: number | string | null
    cp_max_pins_goldnugget: number | null
  }
  const cpRaw = settingsRes.data as Partial<RawPipelineSettings> | null
  const pipelineThresholds: PipelineThresholds = {
    minPinsGesamt:
      cpRaw?.cp_min_pins_gesamt ?? PIPELINE_DEFAULT_MIN_PINS_GESAMT,
    minPinsOhneAktuell:
      cpRaw?.cp_min_pins_ohne_aktuell ??
      PIPELINE_DEFAULT_MIN_PINS_OHNE_AKTUELL,
    tageOhnePin: cpRaw?.cp_tage_ohne_pin ?? PIPELINE_DEFAULT_TAGE_OHNE_PIN,
    minCtrGoldnugget:
      cpRaw?.cp_min_ctr_goldnugget === null ||
      cpRaw?.cp_min_ctr_goldnugget === undefined
        ? PIPELINE_DEFAULT_MIN_CTR_GOLDNUGGET
        : Number(cpRaw.cp_min_ctr_goldnugget),
    maxPinsGoldnugget:
      cpRaw?.cp_max_pins_goldnugget ?? PIPELINE_DEFAULT_MAX_PINS_GOLDNUGGET,
  }

  const today = todayIso()
  const rawPinAnalytics =
    (pinAnalyticsRes.data ?? []) as unknown as RawPinAnalyticsRow[]

  // Letztes erfasstes Zeitraum-Ende (max zeitraum_bis über Profil + Pins) für
  // den monatsbasierten Analytics-Status. Direkt zeitraum_bis ?? datum (kein
  // effectiveZeitraum nötig, da nur das Ende gebraucht wird). Keine Daten →
  // null → Hero-Banner zeigt den Willkommens-/Onboarding-Zustand.
  let latestZeitraumBis: string | null = null
  for (const r of rows) {
    const bis = r.zeitraum_bis ?? r.datum
    if (bis && (!latestZeitraumBis || bis > latestZeitraumBis)) {
      latestZeitraumBis = bis
    }
  }
  for (const r of rawPinAnalytics) {
    const bis = r.zeitraum_bis ?? r.datum
    if (bis && (!latestZeitraumBis || bis > latestZeitraumBis)) {
      latestZeitraumBis = bis
    }
  }
  const updateStatusMonat = calcUpdateStatusMonat(latestZeitraumBis)

  type ErledigtRawRow = {
    pin_id: string
    kategorie: string
    created_at: string
    pins: { id: string; titel: string | null } | null
  }
  const erledigtRows = (erledigtRes.data ?? []) as unknown as ErledigtRawRow[]

  const erledigtSet = new Set<string>()
  const validDiagnoseKeys = new Set(HANDLUNGS_CATEGORIES.map((c) => c.diagnose))
  for (const row of erledigtRows) {
    erledigtSet.add(`${row.pin_id}|${row.kategorie}`)
  }

  const bearbeitet: BearbeitetRowData[] = erledigtRows
    .filter((r) => validDiagnoseKeys.has(r.kategorie as PinDiagnose))
    .filter((r) => r.pins !== null)
    .map((r) => ({
      pin_id: r.pin_id,
      titel: r.pins?.titel ?? null,
      kategorie: r.kategorie as PinDiagnose,
      created_at: r.created_at,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  // Pro pin_id über alle Perioden aggregieren (Server liefert DESC, also ist
  // die erste Zeile pro pin_id die neueste). Diagnose läuft auf den
  // kumulierten Werten — identisch zum Analytics-Pins-Tab.
  const periodsByPin = new Map<string, RawPinAnalyticsRow[]>()
  const orderedPinIds: string[] = []
  for (const row of rawPinAnalytics) {
    if (!periodsByPin.has(row.pin_id)) {
      orderedPinIds.push(row.pin_id)
      periodsByPin.set(row.pin_id, [])
    }
    periodsByPin.get(row.pin_id)!.push(row)
  }
  const actionable: ActionablePin[] = []
  for (const pin_id of orderedPinIds) {
    const periods = periodsByPin.get(pin_id) ?? []
    const latest = periods[0]
    const pin = latest.pins
    const hatDatum = !!pin?.geplante_veroeffentlichung
    const refDate =
      pin?.geplante_veroeffentlichung ??
      pin?.created_at?.slice(0, 10) ??
      latest.datum
    const alterTage = Math.max(0, diffDays(refDate, today))

    let cumKlicks = 0
    let cumImpressionen = 0
    let cumSaves = 0
    for (const r of periods) {
      cumKlicks += r.klicks
      cumImpressionen += r.impressionen
      cumSaves += r.saves
    }
    const avgCtr = calcCtr(cumKlicks, cumImpressionen)
    const result = diagnosePinAggregated({
      cumKlicks,
      cumImpressionen,
      cumSaves,
      perioden: periods.length,
      pinAlter: hatDatum ? alterTage : null,
      hatDatum,
      thresholds,
      // periods ist DESC nach datum (Index 0 = jüngste Periode).
      impressionenVerlauf: periods.map((r) => r.impressionen),
    })

    actionable.push({
      id: latest.id,
      pin_id,
      titel: pin?.titel ?? null,
      klicks: cumKlicks,
      impressionen: cumImpressionen,
      saves: cumSaves,
      ctr: avgCtr,
      alterTage,
      letzterAnalyticsDatum: latest.datum,
      pinterestUrl: pin?.pinterest_pin_url ?? null,
      diagnose: result.diagnose,
      handlung: result.handlung,
      boardId: pin?.board_id ?? null,
      // Board-Felder werden nach boardsHealth-Berechnung gefüllt.
      boardName: null,
      boardAktivitaet: null,
    })
  }
  const hasAnyAnalytics = rawPinAnalytics.length > 0
  // V3.3 — höchste kumulierte Impressionen eines einzelnen Pins.
  // Kriterium B der Wins-Heuristik (≥ 1 Pin > 1.000 Impressionen).
  const maxPinImpressionen = actionable.reduce(
    (m, p) => Math.max(m, p.impressionen),
    0
  )
  const groupedActions = new Map<PinDiagnose, ActionablePin[]>()
  for (const p of actionable) {
    if (!HANDLUNGS_CATEGORIES.some((c) => c.diagnose === p.diagnose)) continue
    if (erledigtSet.has(`${p.pin_id}|${p.diagnose}`)) continue
    const arr = groupedActions.get(p.diagnose) ?? []
    arr.push(p)
    groupedActions.set(p.diagnose, arr)
  }
  // Innerhalb jeder Kategorie: nach Klicks DESC sortieren
  groupedActions.forEach((arr) => arr.sort((a, b) => b.klicks - a.klicks))

  // ===== Saison-Kalender (Kanban) =====
  // Verwendet die bestehende computeStatus-Logik aus saison-kalender/utils.ts —
  // dieselbe, die auch die Saison-Kalender-Seite nutzt.
  // - statusInfo.pinEnd   = event_datum - suchbeginn_tage  (= Suchstart)
  // - statusInfo.pinStart = pinEnd - 60 (Pinterest Distributions-Zeit)
  // - statusInfo.prodStart = pinStart - 31
  // Evergreen, Events ohne Datum sowie abgeschlossene Events werden nicht
  // angezeigt.
  const saisonRows = (saisonRes.data ?? []) as SaisonEvent[]
  const saisonKanban: SaisonKanbanColumns = {
    jetztProduzieren: [],
    jetztPinnen: [],
    hochphase: [],
    nochZeit: [],
  }

  for (const event of saisonRows) {
    if (event.saison_typ === 'evergreen') continue
    if (!event.event_datum) continue
    if (today >= event.event_datum) continue

    const statusInfo = computeStatus(
      event.event_datum,
      event.saison_typ,
      event.suchbeginn_tage,
      today
    )
    if (!statusInfo.pinStart || !statusInfo.pinEnd || !statusInfo.prodStart) {
      continue
    }

    const base = {
      id: event.id,
      event_name: event.event_name,
      event_datum: event.event_datum,
      pinStart: statusInfo.pinStart,
      pinEnd: statusInfo.pinEnd,
      suchbeginnTage: event.suchbeginn_tage ?? 60,
    }

    if (today >= statusInfo.pinStart && today <= statusInfo.pinEnd) {
      saisonKanban.jetztPinnen.push({
        ...base,
        countdownDays: diffDays(today, event.event_datum),
      })
    } else if (today > statusInfo.pinEnd) {
      saisonKanban.hochphase.push({
        ...base,
        countdownDays: diffDays(today, event.event_datum),
      })
    } else {
      const daysToPinStart = diffDays(today, statusInfo.pinStart)
      if (daysToPinStart <= 30) {
        saisonKanban.jetztProduzieren.push({
          ...base,
          countdownDays: daysToPinStart,
        })
      } else {
        saisonKanban.nochZeit.push({
          ...base,
          countdownDays: Math.max(0, diffDays(today, statusInfo.prodStart)),
        })
      }
    }
  }

  const byEventDate = (a: KanbanEvent, b: KanbanEvent) =>
    a.event_datum.localeCompare(b.event_datum)
  saisonKanban.jetztProduzieren.sort(byEventDate)
  saisonKanban.jetztPinnen.sort(byEventDate)
  saisonKanban.hochphase.sort(byEventDate)
  saisonKanban.nochZeit.sort(byEventDate)

  // ===== Performance-Verlauf (rollierende 12 Monate, ASC für Chart) =====
  const chartPoints: ChartPoint[] = profilRows
    .slice(0, 12)
    .map((r) => ({
      datum: r.datum,
      impressionen: r.impressionen,
      ausgehende_klicks: r.ausgehende_klicks,
      saves: r.saves,
      engagement: r.engagement,
    }))
    .reverse()

  // ===== Bestand: Pins & Boards =====
  type PinRow = {
    id: string
    status: string
    created_at: string
    geplante_veroeffentlichung: string | null
    board_id: string | null
    content_id: string | null
    ziel_url_id: string | null
    strategie_typ: string | null
    conversion_ziel: string | null
    pin_format: string | null
  }
  type BoardRow = {
    id: string
    name: string
    beschreibung: string | null
    pinterest_url: string | null
    created_at: string
  }
  // Alle Pins (jede Statusstufe) — Basis für Pin-Zählung pro Board.
  // Veröffentlichte Pins separat herausgefiltert für lastPinByBoard etc.
  const allPinsRows = (pinsPublishedCountRes.data ?? []) as PinRow[]
  const pinsPublishedRows = allPinsRows.filter(
    (p) => p.status === 'veroeffentlicht'
  )
  const boardsRows = (boardsCountRes.data ?? []) as BoardRow[]
  const veroeffentlichtePinsCount = pinsPublishedRows.length
  const boardsCount = boardsRows.length

  // Entwurf/Geplant-Pins pro Board zählen — Quelle für die grüne ✅-Box in
  // der Board-Gesundheit, die beide Status mit eigener Verlinkung darstellt.
  const preparedPinsByBoard = new Map<
    string,
    { entwurf: number; geplant: number }
  >()
  for (const p of allPinsRows) {
    if (!p.board_id) continue
    if (p.status !== 'entwurf' && p.status !== 'geplant') continue
    const cur = preparedPinsByBoard.get(p.board_id) ?? {
      entwurf: 0,
      geplant: 0,
    }
    if (p.status === 'entwurf') cur.entwurf++
    else cur.geplant++
    preparedPinsByBoard.set(p.board_id, cur)
  }

  // ===== Account-Diagnose / Coaching =====
  // Aggregiert bereits berechnete Pin-Daten für das Account-weite Coaching-
  // Layer (lib/account-coaching.ts). Klassifikations-Logik bleibt unverändert
  // — das hier ist reine Anzeige- und Hinweis-Schicht.
  const pinsAeltAls60Tage = actionable.filter(
    (p) => p.alterTage >= 60
  ).length
  const pinsOhneImpressionen = actionable.filter(
    (p) => p.impressionen === 0
  ).length
  const reichweiteOhneWirkungCount =
    groupedActions.get('reichweite_ohne_wirkung')?.length ?? 0
  // Account-Alter aus der vollen pins-Tabelle (allPinsRows), nicht aus
  // actionable[]: actionable enthält nur Pins mit pins_analytics-Eintrag,
  // alte Pins ohne Analytics-Datensatz würden sonst unterschlagen und das
  // Account-Alter zu jung ausweisen.
  const oldestPinAlterTage = (() => {
    let max = 0
    for (const p of allPinsRows) {
      const refDate =
        p.geplante_veroeffentlichung ?? p.created_at?.slice(0, 10) ?? null
      if (!refDate) continue
      const days = Math.max(0, diffDays(refDate, today))
      if (days > max) max = days
    }
    return max
  })()
  const accountAlterMonate = oldestPinAlterTage / 30
  const alteSchlechtePin = actionable.filter((p) => {
    if (p.alterTage <= 365) return false
    if (p.impressionen <= 0) return false
    const saveRate = (p.saves / p.impressionen) * 100
    return saveRate < 0.1
  }).length
  const boardsOhneKategorie = Math.max(
    0,
    boardsCount -
      nicheProfile.niches.reduce((sum, n) => sum + n.boardCount, 0)
  )
  const coachingDiagnoses = calculateCoachingDiagnoses({
    benchmark,
    nicheProfile,
    pinsAeltAls60Tage,
    pinsOhneImpressionen,
    reichweiteOhneWirkungCount,
    accountAlterMonate,
    alteSchlechtePin,
    totalBoards: boardsCount,
    boardsOhneKategorie,
  })

  // ===== Strategie-Check V2 (30-Tage-Fenster, Soll/Ist) =====
  // Vergleicht die Pin-Arbeit der letzten 30 Tage mit der im Wizard
  // festgelegten Strategie. Pins werden über ihre verknüpfte Ziel-URL der
  // Zielfläche und über ihr Board der Content-Säule zugeordnet. Pure
  // Berechnung in strategie-check/lib.ts.
  const urlZielflaecheById = new Map<string, string | null>()
  for (const u of (urlsRes.data ?? []) as Array<{
    id: string
    zielflaeche: string | null
  }>) {
    urlZielflaecheById.set(u.id, u.zielflaeche ?? null)
  }
  const boardKategorieById = new Map<string, string | null>()
  for (const b of (boardsCountRes.data ?? []) as Array<{
    id: string
    kategorie: string | null
  }>) {
    boardKategorieById.set(b.id, b.kategorie ?? null)
  }
  const strategieSettingsRaw = settingsRes.data as
    | (StrategieRow & {
        strategie_check_schwelle_gelb: number | null
        strategie_check_schwelle_rot: number | null
      })
    | null
  const neueStrategie = parseStrategieRow(strategieSettingsRaw)
  const strategieCheckSettings: StrategieCheckV2Settings = {
    zielSoll: neueStrategie.zielflaechen,
    pinningFrequenz: neueStrategie.pinningFrequenz,
    contentSaeulen: neueStrategie.contentSaeulen,
    onboardingAbgeschlossen: neueStrategie.onboardingAbgeschlossen,
    schwelleGelb: strategieSettingsRaw?.strategie_check_schwelle_gelb ?? null,
    schwelleRot: strategieSettingsRaw?.strategie_check_schwelle_rot ?? null,
  }
  const strategieCheckPins: StrategieCheckV2Pin[] = allPinsRows.map((p) => ({
    status: p.status,
    zielflaeche: p.ziel_url_id
      ? (urlZielflaecheById.get(p.ziel_url_id) ?? null)
      : null,
    boardKategorie: p.board_id
      ? (boardKategorieById.get(p.board_id) ?? null)
      : null,
    created_at: p.created_at,
    geplante_veroeffentlichung: p.geplante_veroeffentlichung,
  }))
  const strategieCheckResult: StrategieCheckV2 = computeStrategieCheckV2(
    strategieCheckSettings,
    strategieCheckPins,
    today
  )

  // ===== Pin-Pipeline: Inhalte mit Pin-Bedarf + URLs mit Potenzial =====
  // Schwellwerte aus `einstellungen` (cp_*) mit Code-Fallback (siehe
  // pipelineThresholds oben):
  //   - Sub A: pinCount < minPinsGesamt
  //   - Sub B: pinCount ≥ minPinsOhneAktuell UND letzter Pin > tageOhnePin
  //   - Cat 2: avg CTR > minCtrGoldnugget % UND Pin-Count < maxPinsGoldnugget
  type RawContentInhalt = {
    id: string
    titel: string
    content_keywords: Array<{
      keywords: { id: string; keyword: string } | null
    }>
    content_urls: Array<{
      ziel_urls: { id: string; titel: string; url: string } | null
    }>
    content_boards: Array<{
      boards: { id: string; name: string } | null
    }>
  }

  const contentInhalteRows = (contentInhalteRes.data ?? []) as
    unknown as RawContentInhalt[]

  // Pins pro content_id sammeln (alle Status-Stufen — auch Drafts zählen).
  const pinsByContent = new Map<string, PinRow[]>()
  for (const p of allPinsRows) {
    if (!p.content_id) continue
    const arr = pinsByContent.get(p.content_id) ?? []
    arr.push(p)
    pinsByContent.set(p.content_id, arr)
  }

  // Letzter Pin = größtes geplante_veroeffentlichung (Fallback created_at).
  function pinDateIso(p: PinRow): string {
    return p.geplante_veroeffentlichung ?? p.created_at.slice(0, 10)
  }

  const pipelineInhalte: PinPipelineInhalt[] = contentInhalteRows.map((ci) => {
    const pins = pinsByContent.get(ci.id) ?? []
    const pinCount = pins.length
    let letzterPinIso: string | null = null
    for (const p of pins) {
      const d = pinDateIso(p)
      if (letzterPinIso === null || d > letzterPinIso) letzterPinIso = d
    }
    const letzterPinTage =
      letzterPinIso !== null ? Math.max(0, diffDays(letzterPinIso, today)) : null
    return {
      id: ci.id,
      titel: ci.titel,
      pinCount,
      letzterPinTage,
      boardNames: ci.content_boards
        .filter((cb) => cb.boards)
        .map((cb) => cb.boards!.name),
      keywords: ci.content_keywords
        .filter((ck) => ck.keywords)
        .map((ck) => ck.keywords!.keyword),
      primaryUrl:
        ci.content_urls.find((cu) => cu.ziel_urls)?.ziel_urls?.url ?? null,
    }
  })

  const inhaltePinBedarfA = pipelineInhalte
    .filter((c) => c.pinCount < pipelineThresholds.minPinsGesamt)
    .sort(
      (a, b) =>
        a.pinCount - b.pinCount || a.titel.localeCompare(b.titel, 'de')
    )

  const inhaltePinBedarfB = pipelineInhalte
    .filter(
      (c) =>
        c.pinCount >= pipelineThresholds.minPinsOhneAktuell &&
        c.letzterPinTage !== null &&
        c.letzterPinTage > pipelineThresholds.tageOhnePin
    )
    .sort((a, b) => (b.letzterPinTage ?? 0) - (a.letzterPinTage ?? 0))

  // ===== Cat 2: URLs mit Potenzial =====
  type RawUrlRowWithUrl = {
    id: string
    titel: string
    url: string
  }
  const urlsRowsForPipeline = (urlsRes.data ?? []) as RawUrlRowWithUrl[]
  const urlInfoById = new Map<string, RawUrlRowWithUrl>(
    urlsRowsForPipeline.map((u) => [u.id, u])
  )

  // Summe klicks/impressionen pro pin_id über alle Analytics-Rows (Lifetime-CTR).
  const pinTotals = new Map<string, { klicks: number; impressionen: number }>()
  for (const row of rawPinAnalytics) {
    const t = pinTotals.get(row.pin_id) ?? { klicks: 0, impressionen: 0 }
    t.klicks += row.klicks ?? 0
    t.impressionen += row.impressionen ?? 0
    pinTotals.set(row.pin_id, t)
  }

  // Aggregation pro Basis-URL (Anker-Fragment entfernt) — fasst z.B.
  // 'soulfulspace.de/blog/yoga' und 'soulfulspace.de/blog/yoga#abschnitt'
  // zusammen.
  type BasisUrlGroup = {
    titel: string
    pinIds: Set<string>
    klicks: number
    impressionen: number
    boardIds: Set<string>
  }
  const byBasis = new Map<string, BasisUrlGroup>()
  for (const p of allPinsRows) {
    if (!p.ziel_url_id) continue
    const info = urlInfoById.get(p.ziel_url_id)
    if (!info) continue
    const basis = (info.url ?? '').split('#')[0]
    if (!basis) continue
    const g = byBasis.get(basis) ?? {
      titel: info.titel,
      pinIds: new Set<string>(),
      klicks: 0,
      impressionen: 0,
      boardIds: new Set<string>(),
    }
    g.pinIds.add(p.id)
    if (p.board_id) g.boardIds.add(p.board_id)
    const t = pinTotals.get(p.id)
    if (t) {
      g.klicks += t.klicks
      g.impressionen += t.impressionen
    }
    byBasis.set(basis, g)
  }

  const boardNameById = new Map<string, string>(
    boardsRows.map((b) => [b.id, b.name])
  )
  const urlPotenzial: UrlPotenzialRow[] = []
  byBasis.forEach((g, basisUrl) => {
    const ctr = g.impressionen > 0 ? (g.klicks / g.impressionen) * 100 : 0
    if (
      ctr <= pipelineThresholds.minCtrGoldnugget ||
      g.pinIds.size >= pipelineThresholds.maxPinsGoldnugget
    ) {
      return
    }
    const boardNamesArr: string[] = []
    g.boardIds.forEach((id) => {
      const name = boardNameById.get(id)
      if (name) boardNamesArr.push(name)
    })
    urlPotenzial.push({
      basisUrl,
      displayTitle: g.titel,
      pinCount: g.pinIds.size,
      ctr,
      boardNames: boardNamesArr,
    })
  })
  urlPotenzial.sort((a, b) => b.ctr - a.ctr)

  // ===== Board-Gesundheit =====
  type BoardAnalyticsRaw = {
    id: string
    board_id: string
    datum: string
    impressionen: number
    klicks_auf_pins: number
    ausgehende_klicks: number
    saves: number
    engagement: number
    anzahl_pins: number | null
    created_at: string
  }
  const boardAnalyticsRaw = (boardAnalyticsRes.data ??
    []) as BoardAnalyticsRaw[]
  const boardThresholds = boardThresholdsFromSettings()
  // Verknüpfung Pins ↔ Boards für „letzter Pin pro Board":
  //   - Quelle: pins.board_id (direkter Foreign-Key auf boards.id)
  //   - Filter: nur status='veroeffentlicht' (siehe pinsPublishedCountRes-Query oben).
  //     Geplante / Entwurfs-Pins zählen nicht — nur was Pinterest tatsächlich gesehen hat.
  //   - Datumspflicht: nur Pins mit gesetztem geplante_veroeffentlichung zählen.
  //     Pins ohne Veröffentlichungsdatum werden ignoriert — Status allein reicht
  //     nicht aus, um „letzter Pin" zu definieren.
  //   - Zukunfts-Filter: geplante_veroeffentlichung > today wird ignoriert
  //     (sonst würden geplante Pins als „heute veröffentlicht" angezeigt werden).
  //   - Pro Board wird das größte (= jüngste) Datum als „letzter Pin" genommen.
  //   - Tie-Break bei gleichem Datum: jüngstes created_at, dann höchste Pin-ID
  //     (deterministisch — wichtig für die Klick-Verknüpfung „letzter Pin").
  type LastPin = { id: string; date: string; createdAt: string }
  const lastPinByBoard = new Map<string, LastPin>()
  for (const p of pinsPublishedRows) {
    if (!p.board_id) continue
    const d = p.geplante_veroeffentlichung
    // Nur Pins mit gesetztem Veröffentlichungsdatum, nicht in der Zukunft.
    if (!d) continue
    if (d > today) continue
    const cur = lastPinByBoard.get(p.board_id)
    const isNewer =
      !cur ||
      d > cur.date ||
      (d === cur.date && p.created_at > cur.createdAt) ||
      (d === cur.date && p.created_at === cur.createdAt && p.id > cur.id)
    if (isNewer) {
      lastPinByBoard.set(p.board_id, {
        id: p.id,
        date: d,
        createdAt: p.created_at,
      })
    }
  }
  // Hilfs-Map nur mit dem Datum (für bestehende Aufrufer wie Aktivitätsrate)
  const lastPinDateByBoard = new Map<string, string>()
  lastPinByBoard.forEach((v, k) => lastPinDateByBoard.set(k, v.date))

  // Pin-Anzahl pro Board aus der pins-Tabelle (alle Status-Stufen).
  // Quelle der Wahrheit für „Hat das Board Pins?" — der CSV-Wert
  // anzahl_pins aus board_analytics ist oft 0, wenn Pinterest die Zahl
  // nicht liefert, und darf nicht für die Klassifizierung benutzt werden.
  const pinsInDbByBoard = new Map<string, number>()
  for (const p of allPinsRows) {
    if (!p.board_id) continue
    pinsInDbByBoard.set(p.board_id, (pinsInDbByBoard.get(p.board_id) ?? 0) + 1)
  }

  // Latest + previous analytics per board (rows are DESC by datum)
  const latestBaByBoard = new Map<string, BoardAnalyticsRaw>()
  const prevBaByBoard = new Map<string, BoardAnalyticsRaw>()
  for (const r of boardAnalyticsRaw) {
    if (!latestBaByBoard.has(r.board_id)) {
      latestBaByBoard.set(r.board_id, r)
    } else if (!prevBaByBoard.has(r.board_id)) {
      prevBaByBoard.set(r.board_id, r)
    }
  }

  // Board-Gesundheit pro Board. Aktivitäts-Status via diagnoseBoard (30/90,
  // unabhängig von Analytics). Die alte ER-/Score-Bewertung ist entfallen
  // (Pin-Badge nutzt jetzt die Aktivität); übrig bleiben Aktivität + Roh-Kennzahlen.
  const boardsHealth: BoardDashHealth[] = boardsRows.map((board) => {
    const ba = latestBaByBoard.get(board.id) ?? null
    const lastPinEntry = lastPinByBoard.get(board.id) ?? null
    const lastPin = lastPinEntry?.date ?? null
    const lastPinAlter = lastPin ? Math.max(0, diffDays(lastPin, today)) : null
    const status = diagnoseBoard({
      lastPinAlterTage: lastPinAlter,
      thresholds: boardThresholds,
    })
    return {
      id: board.id,
      name: board.name,
      pinterestUrl: board.pinterest_url ?? null,
      status,
      impressionen: ba?.impressionen ?? 0,
      klicks: ba?.ausgehende_klicks ?? 0,
      hasAnalytics: !!ba,
      anzahlPins: ba ? (ba.anzahl_pins ?? 0) : null,
      pinsInDb: pinsInDbByBoard.get(board.id) ?? 0,
      lastPinDate: lastPin,
      lastPinAlterTage: lastPinAlter,
      lastPinId: lastPinEntry?.id ?? null,
    }
  })

  // Board-Verknüpfung pro Pin — anreichern, sobald boardsHealth existiert.
  // Das Pin-Board-Badge zeigt jetzt den reinen Aktivitäts-Status (diagnoseBoard:
  // aktiv/wenig_aktiv/inaktiv), nicht mehr die alte ER-Misch-Logik. Aktivität ist
  // unabhängig von Analytics — auch Boards ohne Analytics-Eintrag haben einen
  // Status, da boardsHealth jedes angelegte Board enthält.
  const boardHealthById = new Map<string, BoardDashHealth>()
  for (const b of boardsHealth) boardHealthById.set(b.id, b)
  for (const p of actionable) {
    if (!p.boardId) continue
    const b = boardHealthById.get(p.boardId)
    if (!b) continue
    p.boardName = b.name
    p.boardAktivitaet = b.status
  }

  // Hinweis: Die frühere Aktivitäts-Bucket-Klassifizierung (inaktiv / wenig_aktiv
  // / aktiv / leeres_board) für die alte Board-Sektion entfällt — die Sektion
  // zeigt jetzt Board-Coaching (Hebel). Die Hebel-Berechnung steht weiter unten,
  // sobald die Keywords geladen sind (sie braucht keywordRows).

  // Aktivitätsrate = Anteil der Boards, die in den letzten 30 Tagen
  // einen neuen Pin bekommen haben (Basis: alle angelegten Boards). Die
  // 30-Tage-Grenze ist fest verdrahtet (boardThresholds.wenigAktiv).
  const aktivBoardsCount = boardsRows.filter((b) => {
    const lastPin = lastPinDateByBoard.get(b.id)
    if (!lastPin) return false
    return diffDays(lastPin, today) < boardThresholds.wenigAktiv
  }).length
  const aktivitaetsratePct =
    boardsRows.length > 0 ? (aktivBoardsCount / boardsRows.length) * 100 : 0

  // Ø Letzter Pin = durchschnittliches Alter (in Tagen) des letzten Pins
  // über alle Boards mit mindestens einem veröffentlichten Pin.
  const lastPinAges = boardsRows
    .map((b) => {
      const lastPin = lastPinDateByBoard.get(b.id)
      return lastPin ? Math.max(0, diffDays(lastPin, today)) : null
    })
    .filter((d): d is number => d !== null)
  const avgLastPinDays =
    lastPinAges.length > 0
      ? Math.round(
          lastPinAges.reduce((s, x) => s + x, 0) / lastPinAges.length
        )
      : null

  const boardKpis = {
    boardsTotal: boardsRows.length,
    aktivitaetsratePct,
    aktivBoardsCount,
    avgLastPinDays,
  }
  const hasAnyBoardAnalytics = boardsHealth.some((b) => b.hasAnalytics)
  // Boards ohne Analytics-Einträge: dient nur als Hinweis-Footnote in der Sektion.
  const boardsOhneAnalyticsCount = boardsHealth.filter(
    (b) => !b.hasAnalytics
  ).length

  // ===== Aufgaben (Priorität → Datum → erledigt unten) =====
  const aufgabenAll = (aufgabenRes.data ?? []) as Aufgabe[]
  const aufgabenSorted = [...aufgabenAll].sort((a, b) => {
    // 1. Erledigte ganz unten
    if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1

    if (a.erledigt && b.erledigt) {
      return b.created_at.localeCompare(a.created_at)
    }

    // Beide offen — hohe Priorität zuerst
    if (a.prioritaet !== b.prioritaet) return a.prioritaet ? -1 : 1

    // Innerhalb derselben Prioritätsstufe: mit Datum vor ohne Datum, dann Datum ASC
    const aHasDate = !!a.faelligkeitsdatum
    const bHasDate = !!b.faelligkeitsdatum
    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1
    if (aHasDate && bHasDate)
      return a.faelligkeitsdatum!.localeCompare(b.faelligkeitsdatum!)
    return a.created_at.localeCompare(b.created_at)
  })

  // ===== "Heute aktuell"-Briefing für Hero-Section =====
  // Aggregiert pro Sektion eine kompakte Aussage. Reine Funktion in
  // briefing/lib.ts — siehe dort für Schwellwert-Regeln.
  const saisonMinDaysToPinStart =
    saisonKanban.jetztProduzieren.length > 0
      ? saisonKanban.jetztProduzieren.reduce(
          (min, e) => Math.min(min, e.countdownDays),
          Number.POSITIVE_INFINITY
        )
      : null
  const briefingItems = buildBriefingItems({
    saisonJetztProduzierenCount: saisonKanban.jetztProduzieren.length,
    saisonMinDaysToPinStart:
      saisonMinDaysToPinStart === null ||
      !Number.isFinite(saisonMinDaysToPinStart)
        ? null
        : saisonMinDaysToPinStart,
    saisonEventNames: saisonKanban.jetztProduzieren.map((e) => e.event_name),
    hasAnyBoardAnalytics,
    // Score-basierte Buckets („schlafende Top", „schwache") existieren nicht
    // mehr — Klassifizierung läuft jetzt rein über Pin-Aktivität. Briefing-
    // Items, die auf diese Konzepte abzielten, triggern entsprechend nicht.
    schlafendeTopCount: 0,
    aktivitaetsratePct: boardKpis.aktivitaetsratePct,
    schwacheCount: 0,
    strategieOnboardingDone: strategieCheckResult.onboardingAbgeschlossen,
    strategieSchwelleRot: strategieCheckResult.schwelleRot,
    // Der V2-Strategie-Check liefert (noch) keine Briefing-Coaching-Items;
    // der Strategie-Status erscheint direkt in der Strategie-Check-Sektion.
    strategieTopCoaching: null,
    hasAnyAnalytics,
    hiddenGemCount: groupedActions.get('hidden_gem')?.length ?? 0,
    reichweiteOhneWirkungCount:
      groupedActions.get('reichweite_ohne_wirkung')?.length ?? 0,
    aktivTopPerformerCount:
      groupedActions.get('aktiver_top_performer')?.length ?? 0,
    eingeschlafenerGewinnerCount:
      groupedActions.get('eingeschlafener_gewinner')?.length ?? 0,
    inhalteOhneAktuellCount: inhaltePinBedarfB.length,
    inhalteMitWenigPinsCount: inhaltePinBedarfA.length,
    urlsPotenzialCount: urlPotenzial.length,
  })

  // ===== "Deine nächsten Schritte" — regelbasierte Handlungsempfehlung =====
  // Reines Re-Aggregat aus bereits berechneten Werten oben.
  const nextStepEvent = (() => {
    const evs = saisonKanban.jetztProduzieren
    if (evs.length === 0) return null
    const closest = evs.reduce(
      (acc, e) => (e.countdownDays < acc.countdownDays ? e : acc),
      evs[0]
    )
    return { name: closest.event_name, daysToStart: closest.countdownDays }
  })()
  const nextStepTopPerformer = (() => {
    const list = groupedActions.get('aktiver_top_performer') ?? []
    if (list.length === 0) return null
    const best = list.reduce(
      (acc, p) => (p.alterTage < acc.alterTage ? p : acc),
      list[0]
    )
    const remaining = Math.max(
      0,
      thresholds.topPerformerMaxAlter - best.alterTage
    )
    if (remaining <= 0) return null
    return {
      titel: best.titel ?? '(ohne Titel)',
      remainingPushDays: remaining,
    }
  })()
  // schlafende_top-Konzept gibt es nicht mehr — kein Score-basiertes Bucket
  // mehr. „Boards reaktivieren"-Hinweis triggert deshalb nicht.
  const nextStepBoardName: string | null = null
  const nextStepsItems = buildNextStepsItems({
    nextEvent: nextStepEvent,
    topPerformerPin: nextStepTopPerformer,
    hiddenGemCount: groupedActions.get('hidden_gem')?.length ?? 0,
    schlafendeTopBoardName: nextStepBoardName,
  })

  // ===== Keywords & SEO Sektion =====
  // Nur noch der „ungenutzte Keywords"-Bucket (Keyword in keinem Pin). Die
  // CTR-basierten Bewertungs-Buckets wurden entfernt — pro Keyword zählt hier
  // nur noch die Pin-Anzahl (pinsCount === 0).
  type KeywordRow = {
    id: string
    keyword: string
    typ: 'haupt' | 'mid_tail' | 'longtail'
  }
  type PinKeywordRow = { pin_id: string; keyword_id: string }
  const keywordRows = (keywordsRes.data ?? []) as unknown as KeywordRow[]
  const pinKeywordRows =
    (pinKeywordsRes.data ?? []) as unknown as PinKeywordRow[]

  const pinIdsByKeyword = new Map<string, Set<string>>()
  for (const row of pinKeywordRows) {
    const set = pinIdsByKeyword.get(row.keyword_id) ?? new Set<string>()
    set.add(row.pin_id)
    pinIdsByKeyword.set(row.keyword_id, set)
  }

  type KeywordWithStats = {
    id: string
    keyword: string
    typ: KeywordRow['typ']
    pinsCount: number
    avgCtr: number | null
    avgKlicks: number | null
  }
  // Nur die Pin-Anzahl wird gebraucht (unused-Bucket). avgCtr/avgKlicks bleiben
  // null — sie erfüllen nur noch den KeywordSeoEntry-Typ, werden nicht angezeigt.
  const keywordsWithStats: KeywordWithStats[] = keywordRows.map((kw) => ({
    id: kw.id,
    keyword: kw.keyword,
    typ: kw.typ,
    pinsCount: pinIdsByKeyword.get(kw.id)?.size ?? 0,
    avgCtr: null,
    avgKlicks: null,
  }))

  const keywordsBuckets = {
    unused: keywordsWithStats
      .filter((k) => k.pinsCount === 0)
      .sort((a, b) => a.keyword.localeCompare(b.keyword)),
  }

  // ===== Board-Coaching: Hebel pro Board (Anzeige folgt in der Sektion) =====
  // Logik in utils.ts (Häppchen 1). Hier nur die Datenbeschaffung +
  // Priorisierung. Steht nach keywordRows, weil die Hebel die Nutzer-Keywords
  // gegen Board-Name/Beschreibung prüfen.
  //
  // Wirkungs-Gate analog Boards-Tab: Der Median trägt erst ab genug
  // qualifizierten Boards (>= mindestQualifizierteBoards über mindestImpressionen).
  // Ist das Gate nicht erfüllt, gilt jedes Board als 'zu_wenig_daten' → der
  // wirkung_schwach-Hebel entfällt dann automatisch.
  const boardWirkungEntries = boardsRows.map((b) => {
    const ba = latestBaByBoard.get(b.id)
    return {
      impressionen: ba?.impressionen ?? 0,
      ausgehende_klicks: ba?.ausgehende_klicks ?? 0,
      saves: ba?.saves ?? 0,
    }
  })
  const { medianOutbound, medianSave, anzahlQualifiziert } =
    boardWirkungMediane(boardWirkungEntries)
  const wirkungGateErfuellt =
    anzahlQualifiziert >= BOARD_WIRKUNG_DEFAULTS.mindestQualifizierteBoards

  const hebelByBoard = new Map<string, BoardHebel[]>()
  const alleHebel: BoardHebel[] = []
  for (const b of boardsRows) {
    const health = boardHealthById.get(b.id)
    const aktivitaet: BoardStatus = health?.status ?? 'inaktiv'
    const ba = latestBaByBoard.get(b.id)
    const wirkung: BoardWirkung = wirkungGateErfuellt
      ? boardWirkung({
          entry: {
            impressionen: ba?.impressionen ?? 0,
            ausgehende_klicks: ba?.ausgehende_klicks ?? 0,
            saves: ba?.saves ?? 0,
          },
          medianOutbound,
          medianSave,
        }).wirkung
      : 'zu_wenig_daten'
    // „Hatte früher Reichweite": irgendwann (aktuell oder Vorperiode) > 0 Impr.
    const hatteFruehereReichweite =
      (latestBaByBoard.get(b.id)?.impressionen ?? 0) > 0 ||
      (prevBaByBoard.get(b.id)?.impressionen ?? 0) > 0
    const hebel = boardHebelFuerBoard({
      boardId: b.id,
      name: b.name,
      beschreibung: b.beschreibung,
      keywords: keywordRows,
      aktivitaet,
      hatteFruehereReichweite,
      wirkung,
    })
    if (hebel.length > 0) hebelByBoard.set(b.id, hebel)
    alleHebel.push(...hebel)
  }

  // Account-weite Hinweise (Anzahl Boards + Reichweiten-Verteilung).
  const accountHinweise = boardAccountHinweise({
    boardsTotal: boardsRows.length,
    impressionenProBoard: boardsRows.map(
      (b) => latestBaByBoard.get(b.id)?.impressionen ?? 0
    ),
  })

  // Priorisierung der 3 dringendsten Hebel:
  //   - Bündel-Boards (>= 3 Hebel) zuerst als gebündelte „Grundsanierung"-Karte.
  //   - Danach mit Einzel-Hebeln auffüllen, je Board nur der dringendste.
  //   - Max. 1 Eintrag pro Board (die Bündelkarte zählt als dieser Eintrag).
  const COACHING_BUENDEL_AB = 3
  const pinterestUrlByBoard = new Map<string, string | null>()
  for (const b of boardsRows) {
    pinterestUrlByBoard.set(b.id, b.pinterest_url ?? null)
  }
  const maxDringlichkeit = (hs: BoardHebel[]) =>
    hs.reduce((m, h) => Math.max(m, h.dringlichkeit), 0)
  const nachDringlichkeit = (a: BoardHebel, b: BoardHebel) =>
    b.dringlichkeit - a.dringlichkeit || a.boardName.localeCompare(b.boardName)

  const buendelBoards = Array.from(hebelByBoard.entries())
    .filter(([, hs]) => hs.length >= COACHING_BUENDEL_AB)
    .map(([boardId, hs]) => ({ boardId, hebel: [...hs].sort(nachDringlichkeit) }))
    .sort(
      (a, b) =>
        maxDringlichkeit(b.hebel) - maxDringlichkeit(a.hebel) ||
        b.hebel.length - a.hebel.length ||
        a.hebel[0].boardName.localeCompare(b.hebel[0].boardName)
    )

  const topKarten: CoachingKarte[] = []
  const verwendeteBoards = new Set<string>()
  for (const eintrag of buendelBoards) {
    if (topKarten.length >= 3) break
    topKarten.push({
      kind: 'buendel',
      boardId: eintrag.boardId,
      boardName: eintrag.hebel[0].boardName,
      pinterestUrl: pinterestUrlByBoard.get(eintrag.boardId) ?? null,
      text: '',
      buendelPunkte: eintrag.hebel.map(
        (h) => BOARD_HEBEL_BUENDEL_PUNKT[h.typ]
      ),
      prepared: preparedPinsByBoard.get(eintrag.boardId) ?? {
        entwurf: 0,
        geplant: 0,
      },
    })
    verwendeteBoards.add(eintrag.boardId)
  }
  for (const hebel of [...alleHebel].sort(nachDringlichkeit)) {
    if (topKarten.length >= 3) break
    if (verwendeteBoards.has(hebel.boardId)) continue
    topKarten.push({
      kind: 'einzel',
      boardId: hebel.boardId,
      boardName: hebel.boardName,
      pinterestUrl: pinterestUrlByBoard.get(hebel.boardId) ?? null,
      text: BOARD_HEBEL_TEXT[hebel.typ],
      prepared: preparedPinsByBoard.get(hebel.boardId) ?? {
        entwurf: 0,
        geplant: 0,
      },
    })
    verwendeteBoards.add(hebel.boardId)
  }

  // Bereits in Top-Karten gezeigte Hebel ausklammern (Einzel: nur der dringendste
  // dieses Boards; Bündel: alle Hebel des Boards).
  const hebelKey = (boardId: string, typ: BoardHebelTyp) => `${boardId}:${typ}`
  const gezeigteHebelKeys = new Set<string>()
  for (const karte of topKarten) {
    const hs = hebelByBoard.get(karte.boardId) ?? []
    if (karte.kind === 'buendel') {
      for (const h of hs) gezeigteHebelKeys.add(hebelKey(h.boardId, h.typ))
    } else {
      const top = [...hs].sort(nachDringlichkeit)[0]
      if (top) gezeigteHebelKeys.add(hebelKey(top.boardId, top.typ))
    }
  }

  // Einklappbarer Bereich „Alle weiteren Hinweise": pro Board die restlichen
  // Hebel + vorbereitete Pins. Doppelung vermeiden:
  //   - Boards, die oben schon als Top-Karte stehen, erscheinen hier nur mit
  //     ihren NOCH NICHT oben gezeigten Hebeln (restHebel) und OHNE Pin-Box
  //     (die steht jetzt oben bei der Top-Karte).
  //   - Boards ohne Top-Karte: alle Hebel + Pin-Box wie gehabt; reine
  //     „nur vorbereitete Pins"-Boards erscheinen ebenfalls (nur die grüne Box).
  const leerePrepared = { entwurf: 0, geplant: 0 }
  const restBoards: CoachingRestBoard[] = []
  for (const b of boardsRows) {
    const istTopBoard = verwendeteBoards.has(b.id)
    const hs = hebelByBoard.get(b.id) ?? []
    const restHebel = hs
      .filter((h) => !gezeigteHebelKeys.has(hebelKey(h.boardId, h.typ)))
      .sort(nachDringlichkeit)
    // Pin-Box im Toggle nur für Boards, die NICHT oben stehen.
    const prepared = istTopBoard
      ? leerePrepared
      : preparedPinsByBoard.get(b.id) ?? leerePrepared
    const hatPrepared = prepared.entwurf > 0 || prepared.geplant > 0
    if (restHebel.length === 0 && !hatPrepared) continue
    restBoards.push({
      boardId: b.id,
      boardName: b.name,
      pinterestUrl: b.pinterest_url ?? null,
      hebelTexte: restHebel.map((h) => BOARD_HEBEL_TEXT[h.typ]),
      prepared,
    })
  }
  // Sortierung: Boards mit restlichen Hebeln zuerst (nach höchster Dringlichkeit),
  // reine „nur vorbereitete Pins"-Boards danach, alphabetisch.
  restBoards.sort((a, b) => {
    const da = a.hebelTexte.length > 0
    const db = b.hebelTexte.length > 0
    if (da !== db) return da ? -1 : 1
    return a.boardName.localeCompare(b.boardName)
  })

  // KPI: wie viele Boards haben mindestens einen Hebel.
  const boardsMitPotenzial = hebelByBoard.size

  // Name des reichweitenstärksten Boards (höchster Impressionen-Anteil) für die
  // KPI-Kachel „Stärkstes Board". Nur sinnvoll, wenn es überhaupt Impressionen
  // gibt — sonst null (Kachel zeigt dann „-").
  let staerkstesBoardName: string | null = null
  let staerkstesBoardImpr = 0
  for (const b of boardsRows) {
    const impr = latestBaByBoard.get(b.id)?.impressionen ?? 0
    if (impr > staerkstesBoardImpr) {
      staerkstesBoardImpr = impr
      staerkstesBoardName = b.name
    }
  }

  // ===== Empty-State-Weichen (sektionsweise) =====
  // Zwei Flags steuern pro Sektion, ob die normale Auswertung oder ein
  // neutraler Hinweis erscheint. Der bestehende Code für Accounts MIT Daten
  // bleibt unverändert — die Flags schalten nur bei fehlenden Daten um.
  //   hatAnalytics = mindestens ein profil_analytics-Eintrag vorhanden
  //   hatStrategie = Strategie-Onboarding abgeschlossen — gleiche Quelle wie
  //                  der Strategie-Check (strategie_onboarding_abgeschlossen)
  const hatAnalytics = rows.length > 0
  const hatStrategie = strategieCheckResult.onboardingAbgeschlossen

  return (
    <div className="space-y-8 p-8">
      {showOnboardingBanner && <OnboardingBanner />}

      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          {greetingName
            ? `Willkommen zurück, ${greetingName} 👋`
            : 'Willkommen zurück 👋'}
        </p>
      </header>

      {/* 1. Hero-Section: schmaler Analytics-Status-Banner */}
      <HeroSection
        status={updateStatusMonat}
        analyticsUpdateDatum={settingsRes.data?.analytics_update_datum ?? null}
        pinsCount={veroeffentlichtePinsCount}
        boardsCount={boardsCount}
      />

      {/* 2. Briefing-Block: Deine Prioritäten + Deine nächsten Schritte.
            Weiche Sektion 1: Ohne Analytics zeigen wir setup-orientierte
            Prioritäten (Onboarding, erste Pins) statt der analytics-basierten. */}
      {hatAnalytics ? (
        <BriefingBlock
          briefingItems={briefingItems}
          nextStepsItems={nextStepsItems}
        />
      ) : (
        <BriefingBlockEmpty
          contentCount={contentInhalteRows.length}
          pinsCount={allPinsRows.length}
          saisonProduzierenCount={saisonKanban.jetztProduzieren.length}
          saisonMinDaysToPinStart={saisonMinDaysToPinStart}
        />
      )}

      {/* 3. Phasen-Trenner */}
      <PhasenTrenner title="Wo stehst du?" />

      {/* 4. Profil-Status (Status aus aktiven Coaching-Diagnosen + Werte).
            V3.2.1: Die früher eigenständige „Profil-Diagnose" ist jetzt als
            „Befunde"-Sub-Sektion in dieser Box integriert. Status + Befund-
            Liste teilen sich denselben localStorage-Dismiss-State. */}
      {/* Weiche Sektion 2: Ohne Analytics keine Ampel-Bewertung — neutrale
            Info-Box statt Profil-Status, Befunde und Werte-Zeilen. */}
      {hatAnalytics ? (
        <ProfilGesundheitBlock
          profilEr={latest?.engagement ?? null}
          profilSaveRate={
            latest && latest.impressionen > 0
              ? (latest.saves / latest.impressionen) * 100
              : null
          }
          profilCtr={latest?.ctr ?? null}
          nicheProfile={nicheProfile}
          coachingDiagnoses={coachingDiagnoses}
          totalPins={allPinsRows.length}
        />
      ) : (
        <ProfilStatusEmpty />
      )}

      {/* 4b. V3.3 — „Was hat funktioniert?" (Erfolge der letzten 30 Tage).
            Emotionaler Übergang vom diagnostischen Profil-Status zur
            datengetriebenen Performance. Rendert nur bei echten Erfolgen
            (sonst null — kein Leer-State). */}
      <WinsBlock
        latest={latest}
        previous={previous}
        nicheProfile={nicheProfile}
        maxPinImpressionen={maxPinImpressionen}
      />

      {/* 5. Gesamt-Profil-Performance (KPIs + Performance-Verlauf in 3 Spalten).
          V3.0.8: Das ehemalige Standalone-Zielgruppen-Widget entfällt hier —
          die Zielgruppe erscheint jetzt als Coaching-Block innerhalb dieser
          Sektion, direkt unter dem Kontext-Streifen. */}
      {/* Weiche Sektion 3: Ohne Analytics keine KPI-Karten / kein Chart. */}
      {hatAnalytics ? (
        <ProfilPerformanceSection
          latest={latest}
          previous={previous}
          chartPoints={chartPoints}
          audienceSnapshots={audienceSnapshots}
          nicheProfile={nicheProfile}
        />
      ) : (
        <ProfilPerformanceEmpty />
      )}

      {/* 4. Phasen-Trenner */}
      <PhasenTrenner title="Pinnst du das Richtige?" />

      {/* 5. Strategie-Check (V2). Hängt NICHT an Analytics, sondern an der
            festgelegten Strategie und den erfassten Pins. „Keine Strategie"
            wird hier abgefangen, „keine Pins im Fenster" innerhalb der Sektion. */}
      {!hatStrategie ? (
        <StrategieCheckEmptyKeineStrategie />
      ) : (
        <StrategieCheckSection result={strategieCheckResult} />
      )}

      {/* 6. Phasen-Trenner */}
      <PhasenTrenner title="Was steht heute an?" />

      {/* 7. Saisonkalender */}
      <SaisonKalenderSection columns={saisonKanban} />

      {/* 8. Content Pipeline */}
      <PinPipelineSection
        inhaltePinBedarfA={inhaltePinBedarfA}
        inhaltePinBedarfB={inhaltePinBedarfB}
        urlPotenzial={urlPotenzial}
        thresholds={pipelineThresholds}
      />

      {/* 8b. Keywords & SEO */}
      <KeywordsSeoSection
        buckets={keywordsBuckets}
        hasAnyKeywords={keywordRows.length > 0}
      />

      {/* 9. Pin-Handlungsbedarf.
            Weiche Sektion 8: Ohne Analytics keine Diagnose-Kategorien. */}
      {hatAnalytics ? (
        <HandlungsbedarfSection
          grouped={groupedActions}
          hasAnyAnalytics={hasAnyAnalytics}
          bearbeitet={bearbeitet}
          today={today}
          thresholds={thresholds}
        />
      ) : (
        <HandlungsbedarfEmpty />
      )}

      {/* 10. Phasen-Trenner */}
      <PhasenTrenner title="Wie gut sind deine Boards aufgestellt?" />

      {/* 11. Board-Gesundheit.
            Weiche Sektion 9: Ohne angelegte Boards ein neutraler Hinweis.
            Mit Boards zeigt die Sektion KPI-Kacheln + Board-Coaching (Hebel). */}
      {boardsCount === 0 ? (
        <BoardGesundheitEmpty />
      ) : (
        <BoardGesundheitDashboardSection
          kpis={{
            ...boardKpis,
            boardsMitPotenzial,
            staerkstesBoardAnteil: accountHinweise.staerkstesBoardAnteil,
            staerkstesBoardName,
          }}
          topKarten={topKarten}
          restBoards={restBoards}
          accountHinweise={accountHinweise}
          boardsOhneAnalyticsCount={boardsOhneAnalyticsCount}
        />
      )}

      {/* 12. Phasen-Trenner */}
      <PhasenTrenner title="Was steht noch an?" />

      {/* 14. Aufgaben & Erinnerungen — bleibt ganz unten */}
      <AufgabenSection tasks={aufgabenSorted} today={today} />
    </div>
  )
}

// ===========================================================
// Empty-States (sektionsweise) — neutrale Hinweis-Boxen für Accounts ohne
// Analytics / Strategie / Boards. Einheitlich dezent (bg-gray-50,
// border-gray-200, text-gray-600), keine Warn-Farben. Links in Rot.
// ===========================================================

// Lucide „info"-Icon inline (vermeidet eine zusätzliche lucide-react-
// Abhängigkeit für ein einzelnes Icon). Standardgröße 14px.
function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

// Gemeinsame neutrale Hinweis-Box.
function DashEmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600">
      {children}
    </div>
  )
}

// Sektion 1 — „Deine Prioritäten" ohne Analytics: setup-orientierte
// Prioritäten (Onboarding immer, erste Pins wenn Inhalte da & < 5 Pins,
// Saison bleibt) + Hinweis statt „Deine nächsten Schritte".
function BriefingBlockEmpty({
  contentCount,
  pinsCount,
  saisonProduzierenCount,
  saisonMinDaysToPinStart,
}: {
  contentCount: number
  pinsCount: number
  saisonProduzierenCount: number
  saisonMinDaysToPinStart: number | null
}) {
  const showContentPrio = contentCount > 0 && pinsCount < 5
  const saisonDays = saisonMinDaysToPinStart ?? 0
  const saisonDaysLabel =
    saisonDays <= 0
      ? 'jetzt'
      : `in ${saisonDays} ${saisonDays === 1 ? 'Tag' : 'Tagen'}`
  const itemCls =
    'rounded-r bg-white/60 py-1 pl-3 pr-2 text-sm leading-snug text-gray-800'
  const linkCls =
    'ml-1 whitespace-nowrap font-medium text-red-600 hover:underline'
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Deine Prioritäten
          </h3>
          <ul className="mt-2 space-y-1.5">
            <li className={itemCls} style={{ borderLeft: '3px solid #60a5fa' }}>
              Schließe dein Setup ab und setze dein Profil weiter auf.
              <Link href="/dashboard/onboarding" className={linkCls}>
                → Zum Onboarding
              </Link>
            </li>
            {showContentPrio && (
              <li
                className={itemCls}
                style={{ borderLeft: '3px solid #60a5fa' }}
              >
                Du hast{' '}
                <span className="font-semibold text-gray-900">
                  {contentCount}
                </span>{' '}
                {contentCount === 1 ? 'Inhalt' : 'Inhalte'} angelegt. Produziere
                jetzt erste Pins dazu.
                <Link href="/dashboard/pin-produktion" className={linkCls}>
                  → Neue Pins
                </Link>
              </li>
            )}
            {saisonProduzierenCount > 0 && (
              <li
                className={itemCls}
                style={{ borderLeft: '3px solid #f59e0b' }}
              >
                <span className="font-semibold text-gray-900">
                  {saisonProduzierenCount}
                </span>{' '}
                {saisonProduzierenCount === 1
                  ? 'Event braucht'
                  : 'Events brauchen'}{' '}
                <span className="font-semibold text-gray-900">
                  {saisonDaysLabel}
                </span>{' '}
                Material – jetzt mit der Produktion starten.
                <a href="#saison-kalender" className={linkCls}>
                  → Saisonkalender
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Deine nächsten Schritte
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Nach deinem ersten Analytics-Update erscheinen hier konkrete
            Handlungsempfehlungen auf Basis deiner Performance-Daten.
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <InfoIcon className="mb-0.5 inline text-gray-400" /> Das Dashboard ist nur so aktuell wie deine
        zuletzt eingepflegten Daten. Pflege einmal monatlich deine
        Pinterest-Analytics ein.
      </p>
    </section>
  )
}

// Sektion 2 — „Profil-Status" ohne Analytics: noch keine Bewertung möglich.
function ProfilStatusEmpty() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Profil-Status</h2>
      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600 shadow-sm">
        <p className="text-base font-semibold text-gray-700">
          Noch keine Bewertung möglich
        </p>
        <p className="mt-2">
          Hier siehst du nach deinem ersten Analytics-Update, wie stark dein
          Profil aufgestellt ist. Bewertet wird anhand automatisch erkannter
          Muster in deinen Daten: Reichweite, Save-Rate, Klickrate und
          Board-Aktivität. Deine Hauptnische wird aus den Kategorien deiner
          Boards erkannt.
        </p>
        <Link
          href="/dashboard/analytics"
          className="mt-3 inline-flex font-medium text-red-600 hover:underline"
        >
          → Analytics einpflegen
        </Link>
      </div>
    </section>
  )
}

// Sektion 3 — „Gesamt-Profil-Performance" ohne Analytics.
function ProfilPerformanceEmpty() {
  return (
    <section id="gesamt-profil-performance" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Gesamt-Profil-Performance
      </h2>
      <DashEmptyBox>
        Nach deinem ersten Analytics-Update siehst du hier deine
        Performance-Entwicklung: Klicks, Saves, Impressionen und
        Engagement-Rate im Verlauf, jeweils im Vergleich zur Vorperiode.
      </DashEmptyBox>
    </section>
  )
}

// Sektion 4 — „Strategie-Check" ohne festgelegte Strategie.
function StrategieCheckEmptyKeineStrategie() {
  return (
    <section id="strategie-check" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">Strategie-Check</h2>
      <DashEmptyBox>
        Du hast deine Strategie noch nicht festgelegt. Der Strategie-Check
        vergleicht deine tatsächliche Pin-Verteilung mit deinen Zielen. Dafür
        braucht er deine Strategie.{' '}
        <Link
          href="/dashboard/strategie?tab=meine"
          className="font-medium text-red-600 hover:underline"
        >
          → Strategie festlegen
        </Link>
      </DashEmptyBox>
    </section>
  )
}

// Sektion 8 — „Pins recyceln" ohne Analytics.
function HandlungsbedarfEmpty() {
  return (
    <section id="pin-handlungsbedarf" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">Pins recyceln</h2>
      <DashEmptyBox>
        Diese Auswertung wird aussagekräftig, sobald deine Pins in der Datenbank
        hinterlegt sind und du dein erstes Analytics-Update gemacht hast. Dann
        bekommt jeder Pin automatisch eine Diagnose (z.B. Hidden Gem, Top
        Performer) und eine konkrete Handlungsempfehlung. Ohne Performance-Daten
        ist keine ehrliche Bewertung möglich.
      </DashEmptyBox>
    </section>
  )
}

// Sektion 9 — „Board-Gesundheit" ohne angelegte Boards.
function BoardGesundheitEmpty() {
  return (
    <section id="board-gesundheit" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">Board-Gesundheit</h2>
      <DashEmptyBox>
        Sobald du Boards angelegt hast, siehst du hier deren Aktivitäts-Status:
        Welche Boards sind aktiv, welche brauchen Aufmerksamkeit, wo liegen
        vorbereitete Pins ohne Veröffentlichung.{' '}
        <Link
          href="/dashboard/boards"
          className="font-medium text-red-600 hover:underline"
        >
          → Boards anlegen
        </Link>
      </DashEmptyBox>
    </section>
  )
}

// ===========================================================
// Gesamt-Profil-Performance — Ergebnis · Treiber · Kontext
// ===========================================================
function ProfilPerformanceKpiBar({
  latest,
  previous,
}: {
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
}) {
  const prevCtr =
    previous && previous.impressionen > 0
      ? (previous.ausgehende_klicks / previous.impressionen) * 100
      : null
  const prevEngagement =
    previous && previous.impressionen > 0
      ? ((previous.saves + previous.ausgehende_klicks) /
          previous.impressionen) *
        100
      : null
  const deltaTage =
    latest && previous ? diffDays(previous.datum, latest.datum) : null
  const headingTooltip =
    'Pinterest zeigt rollierende Daten der letzten 31 Tage. Wachstum % basiert auf Vergleich zum vorherigen eingetragenen Monat.'

  const prevDateLabel = previous ? ` (${formatDateDe(previous.datum)})` : ''
  const prevText = (val: string | null) =>
    val !== null ? `Vorperiode: ${val}${prevDateLabel}` : undefined

  if (!latest) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          <LabelWithTooltip
            label="Gesamt-Profil-Performance"
            tooltip={headingTooltip}
          />
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            'Ausgehende Klicks',
            'Engagement Rate',
            'Saves',
            'CTR',
            'Impressionen',
            'Gesamte Zielgruppe',
            'Interagierende Zielgruppe',
          ].map((label) => (
            <KpiCardEmpty key={label} label={label} />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Noch kein Analytics-Update:{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-red-600 hover:underline"
          >
            jetzt starten
          </Link>
          .
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">
        <LabelWithTooltip
          label="Gesamt-Profil-Performance"
          tooltip={headingTooltip}
        />
        {previous && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            (Vergleich zu {formatDateDe(previous.datum)}
            {deltaTage !== null && <>, Δ {deltaTage} Tage</>})
          </span>
        )}
      </h2>

      {/* Drei Sektionen in einer Reihe — getrennt durch Hintergrund, nicht durch Linien. */}
      <div className="mt-3 flex items-stretch gap-x-4 overflow-x-auto pb-1">
        <KpiSectionGroup
          label="Ergebnis"
          tooltip="Was ist am Ende rausgekommen – die Erfolgs-Metriken deines Profils."
        >
          <KpiCard
            variant="hero"
            className="w-48"
            label="Ausgehende Klicks"
            value={formatZahl(latest.ausgehende_klicks)}
            fullValue={latest.ausgehende_klicks}
            growth={latest.klicks_growth}
            tooltip="Wie oft Nutzer von Pinterest auf deine Website geklickt haben. Das ist deine wichtigste Metrik für echten Traffic."
            previousValue={prevText(
              previous ? formatZahl(previous.ausgehende_klicks) : null
            )}
          />
          <KpiCard
            variant="hero"
            className="w-48"
            label="Engagement Rate"
            value={formatPercent(latest.engagement)}
            growth={latest.engagement_growth}
            tooltip="(Saves + Ausgehende Klicks) ÷ Impressionen. Ein Überblickswert: Auf Pinterest sind diese Werte oft klein, das ist normal. Statt auf eine feste Zahl zu schauen, achte darauf, ob er über die Zeit steigt, das siehst du im Tab Profil-Entwicklung."
            previousValue={prevText(
              prevEngagement !== null ? formatPercent(prevEngagement) : null
            )}
          />
        </KpiSectionGroup>
        <KpiSectionGroup
          label="Treiber"
          tooltip="Was hat das Ergebnis erzeugt – die Hebel, an denen du drehen kannst."
        >
          <KpiCard
            className="w-48"
            label="Saves"
            value={formatZahl(latest.saves)}
            fullValue={latest.saves}
            growth={latest.saves_growth}
            tooltip="Saves sind das stärkste Algorithmus-Signal. Mehr Saves = längere Lebensdauer + mehr Reichweite."
            previousValue={prevText(
              previous ? formatZahl(previous.saves) : null
            )}
          />
          <KpiCard
            className="w-48"
            label="CTR"
            value={formatPercent(latest.ctr)}
            growth={latest.ctr_growth}
            tooltip="Ausgehende Klicks ÷ Impressionen. Zeigt ob dein Pin-Hook funktioniert. Pinterest organisch: 1,54%."
            previousValue={prevText(
              prevCtr !== null ? formatPercent(prevCtr) : null
            )}
          />
          <KpiCard
            className="w-48"
            label="Impressionen"
            value={formatZahl(latest.impressionen)}
            fullValue={latest.impressionen}
            growth={latest.impressionen_growth}
            tooltip="Wie oft deine Pins angezeigt wurden. Zeigt ob deine Keywords und SEO greifen."
            previousValue={prevText(
              previous ? formatZahl(previous.impressionen) : null
            )}
          />
        </KpiSectionGroup>
        <KpiSectionGroup
          label="Kontext"
          tooltip="In welchem Umfeld passiert das – wen du erreichst."
        >
          <KpiCard
            variant="context"
            className="w-48"
            label="Gesamte Zielgruppe"
            value={formatZahl(latest.gesamte_zielgruppe)}
            fullValue={latest.gesamte_zielgruppe}
            growth={latest.zielgruppe_growth}
            tooltip="Alle Menschen die deinen Content gesehen haben, auf Pinterest und außerhalb."
            previousValue={prevText(
              previous ? formatZahl(previous.gesamte_zielgruppe) : null
            )}
          />
          <KpiCard
            variant="context"
            className="w-48"
            label="Interagierende Zielgruppe"
            value={formatZahl(latest.interagierende_zielgruppe)}
            fullValue={latest.interagierende_zielgruppe}
            growth={latest.interagierend_growth}
            tooltip="Menschen die aktiv reagiert haben: geklickt, gespeichert oder kommentiert. Qualitativ wertvoller als Gesamtzielgruppe."
            previousValue={prevText(
              previous ? formatZahl(previous.interagierende_zielgruppe) : null
            )}
          />
        </KpiSectionGroup>
      </div>
    </section>
  )
}

function KpiSectionGroup({
  label,
  tooltip,
  children,
  bgClass = 'bg-gray-50',
}: {
  label: string
  tooltip?: string
  children: React.ReactNode
  bgClass?: string
}) {
  return (
    <div className={`flex shrink-0 flex-col rounded-lg px-3 py-2 ${bgClass}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </h3>
      <div className="mt-2 flex flex-1 items-stretch gap-2">{children}</div>
    </div>
  )
}

// Profil-Gesundheit lebt jetzt komplett in app/dashboard/ProfilGesundheitBlock.tsx
// (Client-Component) — Status-Berechnung in lib/profil-gesundheit.ts. Die alte
// Aggregat-CTR/ER-Logik mit hartkodierten Pinterest-Branchen-Schnitten
// (0,15-0,25 % etc.) wurde entfernt: sie hat account-spezifische Bewertung
// mit allgemeinen Werten vermischt.

type KpiVariant = 'hero' | 'normal' | 'context'

function KpiCard({
  label,
  value,
  fullValue,
  growth,
  tooltip,
  previousValue,
  variant = 'normal',
  className = '',
}: {
  label: string
  value: string
  fullValue?: number
  growth?: number | null
  tooltip?: string
  previousValue?: string
  variant?: KpiVariant
  className?: string
}) {
  // Hero-Kacheln: grüner Akzent-Rahmen. Alle anderen: neutraler grauer Rahmen.
  const borderCls =
    variant === 'hero'
      ? 'border-2 border-green-300'
      : 'border border-gray-200'
  const cardCls = `flex h-full flex-col rounded-lg ${borderCls} bg-white p-2.5 shadow-sm`
  const labelCls =
    'text-[10px] font-medium uppercase tracking-wide text-gray-500'
  const valueCls = 'mt-0.5 text-[22px] font-semibold leading-tight text-gray-900'

  const hasPrev =
    previousValue !== undefined && previousValue !== null && previousValue !== ''

  return (
    <article className={`${cardCls} ${className}`}>
      <p className={labelCls}>
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </p>
      <p
        className={valueCls}
        title={
          fullValue !== undefined
            ? fullValue.toLocaleString('de-DE')
            : undefined
        }
      >
        {value}
      </p>
      {hasPrev ? (
        <>
          <GrowthBadge growth={growth} />
          <p className="mt-0.5 whitespace-nowrap text-[10px] text-gray-400">
            {previousValue}
          </p>
        </>
      ) : (
        <p className="mt-0.5 whitespace-nowrap text-[10px] text-gray-400">
          noch keine Vorperiode verfügbar
        </p>
      )}
    </article>
  )
}

function KpiCardEmpty({ label }: { label: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-400">Noch keine Daten</p>
    </article>
  )
}

function GrowthBadge({ growth }: { growth: number | null | undefined }) {
  if (growth === null || growth === undefined) return null
  if (!Number.isFinite(growth)) {
    return <p className="text-xs font-medium text-green-700">↑ neu</p>
  }
  if (growth > 0) {
    return (
      <p className="text-xs font-medium text-green-700">
        ↑ {formatGrowth(growth)}
      </p>
    )
  }
  if (growth < 0) {
    return (
      <p className="text-xs font-medium text-red-700">
        ↓ {formatGrowth(growth)}
      </p>
    )
  }
  return <p className="text-xs text-gray-500">→ unverändert</p>
}

// ===========================================================
// Handlungsbedarf
// ===========================================================
function formatMetric(
  kind:
    | 'klicks'
    | 'impressionen'
    | 'saves'
    | 'ctr'
    | 'alter'
    | 'datum'
    | 'push',
  pin: HandlungsbedarfPin,
  thresholds: PinAnalyticsThresholds
): string {
  switch (kind) {
    case 'klicks':
      return formatZahl(pin.klicks)
    case 'impressionen':
      return formatZahl(pin.impressionen)
    case 'saves':
      return formatZahl(pin.saves)
    case 'ctr':
      return formatPercent(pin.ctr)
    case 'alter':
      return `${pin.alterTage} Tage`
    case 'datum':
      return formatDateDe(pin.letzterAnalyticsDatum)
    case 'push': {
      const remaining = thresholds.topPerformerMaxAlter - pin.alterTage
      return remaining > 0 ? `noch ${remaining} Tage aktiv` : ''
    }
  }
}

function HandlungsbedarfSection({
  grouped,
  hasAnyAnalytics,
  bearbeitet,
  today,
  thresholds,
}: {
  grouped: Map<PinDiagnose, ActionablePin[]>
  hasAnyAnalytics: boolean
  bearbeitet: BearbeitetRowData[]
  today: string
  thresholds: PinAnalyticsThresholds
}) {
  const heading = (
    <>
      <h2 className="text-lg font-semibold text-gray-900">Pins recyceln</h2>
      <p className="mt-1 text-sm text-gray-600">
        Basierend auf deinen Analytics: Welche Pins brauchen eine Reaktion?
      </p>
      <div className="mt-2">
        <HinweisBox variant="tipp">
          Erstelle immer einen neuen Pin, bearbeite nie den bei Pinterest
          veröffentlichten Pin. Hake den Pin ab, sobald die Handlung erfolgt
          ist.
        </HinweisBox>
      </div>
    </>
  )

  if (!hasAnyAnalytics) {
    return (
      <section id="pin-handlungsbedarf" className="scroll-mt-4">
        {heading}
        <div className="achtung-box mt-3">
          ⚠️ Trage deine ersten Pin-Analytics ein um Handlungsempfehlungen zu
          sehen.{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium underline hover:opacity-80"
          >
            → Zum Analytics-Tab
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="pin-handlungsbedarf" className="scroll-mt-4">
      {heading}
      <div className="mt-3 space-y-3">
        {HANDLUNGS_CATEGORIES.map((cat) => (
          <HandlungsbedarfKategorieCard
            key={cat.diagnose}
            cat={cat}
            pins={grouped.get(cat.diagnose) ?? []}
            thresholds={thresholds}
          />
        ))}

        {bearbeitet.length > 0 && (
          <>
            {/* Dezente Trennlinie + Abstand vor der Abgeschlossen-Kategorie */}
            <div className="mt-5 border-t border-gray-100" />
            <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                <span
                  className="text-2xl leading-none text-gray-400"
                  aria-hidden
                >
                  <span className="inline group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-base font-medium text-gray-500"
                  aria-hidden
                >
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-500">
                    Handlung abgeschlossen
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Bereits bearbeitete Pins der letzten 30 Tage.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                  {bearbeitet.length}
                </span>
              </summary>
              <div className="border-t border-gray-200 px-4 py-2">
                <ul className="divide-y divide-gray-100">
                  {bearbeitet.map((b) => (
                    <BearbeitetRow
                      key={`${b.pin_id}|${b.kategorie}`}
                      row={b}
                      today={today}
                    />
                  ))}
                </ul>
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  )
}

const PUSH_TOOLTIP =
  'Pinterest pusht neue Pins in den ersten 60-90 Tagen besonders stark. Das nennt sich Push-Window oder Honeymoon-Phase. In dieser Zeit reicht der Algorithmus den Pin proaktiv neuen Zielgruppen aus. Danach läuft er nur noch über Saves und natürliche Reichweite. Wenn ein Pin in dieser Phase außergewöhnlich gut läuft hast du ein kurzes Zeitfenster um das Maximum rauszuholen. Produziere Varianten während der Algorithmus deinem Profil gerade vertraut. Pinterest lernt dann: Diese Person macht guten Content zu diesem Thema und pusht die nächsten Pins bevorzugt.'

function buildPinData(p: ActionablePin): HandlungsbedarfPin {
  return {
    id: p.id,
    pin_id: p.pin_id,
    titel: p.titel,
    klicks: p.klicks,
    impressionen: p.impressionen,
    saves: p.saves,
    ctr: p.ctr,
    alterTage: p.alterTage,
    letzterAnalyticsDatum: p.letzterAnalyticsDatum,
    pinterestUrl: p.pinterestUrl,
    boardName: p.boardName,
    boardAktivitaet: p.boardAktivitaet,
  }
}

function buildMetrics(
  cat: HandlungsCategory,
  pinData: HandlungsbedarfPin,
  thresholds: PinAnalyticsThresholds
) {
  return cat.metrics
    .map((kind) => ({
      label: cat.metricLabels[kind] ?? '',
      value: formatMetric(kind, pinData, thresholds),
      tooltip: kind === 'push' ? PUSH_TOOLTIP : undefined,
    }))
    .filter((m) => m.value !== '')
}

function HandlungsbedarfKategorieCard({
  cat,
  pins,
  thresholds,
}: {
  cat: HandlungsCategory
  pins: ActionablePin[]
  thresholds: PinAnalyticsThresholds
}) {
  const visiblePins = pins.slice(0, 3)
  const remaining = pins.length - visiblePins.length

  // Statischer Klartext-Tooltip aus PIN_DIAGNOSE_TOOLTIP — Struktur:
  // Erklärung → Was tun → Wie wir das erkennen.
  const tooltip = cat.tooltip

  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-base text-gray-700"
          aria-hidden
        >
          {cat.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip label={cat.label} tooltip={tooltip} />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{cat.subtitle}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            pins.length === 0
              ? 'bg-gray-100 text-gray-400'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {pins.length}
        </span>
      </summary>

      {pins.length === 0 ? (
        <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-green-700">
          ✓ Alle Pins dieser Kategorie sind aktuell als bearbeitet markiert.
        </div>
      ) : (
        <div className="border-t border-gray-200">
          <ul className="space-y-2 p-3">
            {visiblePins.map((p) => {
              const pinData = buildPinData(p)
              return (
                <HandlungsbedarfPinRow
                  key={p.id}
                  pin={pinData}
                  kategorie={cat.diagnose}
                  metrics={buildMetrics(cat, pinData, thresholds)}
                  primaryAction={cat.primaryAction}
                />
              )
            })}
          </ul>
          {remaining > 0 && (
            <details className="border-t border-gray-100">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-red-600 hover:underline">
                + {remaining} weitere Pin{remaining === 1 ? '' : 's'} anzeigen
              </summary>
              <ul className="space-y-2 p-3">
                {pins.slice(3).map((p) => {
                  const pinData = buildPinData(p)
                  return (
                    <HandlungsbedarfPinRow
                      key={p.id}
                      pin={pinData}
                      kategorie={cat.diagnose}
                      metrics={buildMetrics(cat, pinData, thresholds)}
                      primaryAction={cat.primaryAction}
                    />
                  )
                })}
              </ul>
            </details>
          )}
        </div>
      )}
    </details>
  )
}

// ===========================================================
// Saison-Kalender (Kanban)
// ===========================================================
const SAISON_ACCENT = {
  blue: {
    headerBg: 'bg-blue-50',
    border: 'border-blue-200',
    headerText: 'text-blue-900',
    countdown: 'text-blue-600',
  },
  green: {
    headerBg: 'bg-green-50',
    border: 'border-green-200',
    headerText: 'text-green-900',
    countdown: 'text-green-600',
  },
  orange: {
    headerBg: 'bg-orange-50',
    border: 'border-orange-200',
    headerText: 'text-orange-900',
    countdown: 'text-orange-600',
  },
  gray: {
    headerBg: 'bg-gray-100',
    border: 'border-gray-200',
    headerText: 'text-gray-700',
    countdown: 'text-gray-600',
  },
} as const

type SaisonAccent = keyof typeof SAISON_ACCENT
// href wird per Event in SaisonCard gebaut (`?open=new&saison_event_id=<id>`),
// damit das Pin-Produktion-Formular automatisch mit dem Event-Tag öffnet.
type SaisonAction = { label: string }

function formatCountdown(prefix: string, days: number): string {
  if (days <= 0) return `${prefix} heute`
  if (days === 1) return `${prefix} in 1 Tag`
  return `${prefix} in ${days} Tagen`
}

function buildSuchstartTooltip(event: KanbanEvent): string {
  // Suchstart-Datum entspricht statusInfo.pinEnd (= event_datum - suchbeginn_tage).
  return (
    `Der Suchbeginn für ${event.event_name} liegt bei ` +
    `${event.suchbeginnTage} Tagen vor dem Event-Datum. ` +
    `Ab ${formatDateDe(event.pinEnd)} suchen Pinterest-Nutzer:innen aktiv ` +
    `nach diesem Thema. Der individuelle Suchstart wird in der ` +
    `Saison-Kalender-Datenbank pro Event hinterlegt.`
  )
}

function SaisonKalenderSection({ columns }: { columns: SaisonKanbanColumns }) {
  return (
    <section id="saison-kalender" className="scroll-mt-4">
      <div>
        <h2 className="flex items-center text-lg font-semibold text-gray-900">
          Saisonkalender
          <InfoTooltip text="Pinterest-Nutzer:innen suchen 6–12 Wochen vor einem Event. Wer zu spät pinnt, verpasst die Welle. Der Saisonkalender zeigt dir auf einen Blick in welcher Phase jedes Event gerade ist." />
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Saisonale Themen brauchen 6-12 Wochen Vorlauf. Hier siehst du,
          was wann zu tun ist.
        </p>
        <p className="mt-1 text-[13px]">
          <span aria-hidden>→ </span>
          <Link
            href="/dashboard/strategie?tab=grundlagen&accordion=saisonalitaet"
            className="text-red-600 underline hover:opacity-80"
          >
            Mehr zur Saisonalität & Pinterest-Timing
          </Link>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaisonColumn
          accent="blue"
          emoji="🎬"
          title="Jetzt produzieren"
          subtitle="Material vorbereiten – Pin-Start naht"
          events={columns.jetztProduzieren}
          countdownPrefix="Pin-Start"
          actionButton={{ label: 'Pins erstellen' }}
          emptyText="Aktuell kein Event in dieser Phase."
        />
        <SaisonColumn
          accent="green"
          emoji="📌"
          title="Jetzt pinnen"
          subtitle="Pin-Fenster offen – aktiv veröffentlichen"
          events={columns.jetztPinnen}
          countdownPrefix="Event"
          emptyText="Aktuell kein Event in dieser Phase."
        />
        <SaisonColumn
          accent="orange"
          emoji="🚀"
          title="Hochphase"
          subtitle="Nicht mehr neu pinnen – veröffentlichte Pins beobachten"
          events={columns.hochphase}
          countdownPrefix="Event"
          emptyText="Aktuell kein Event in der Hochphase."
        />
        <SaisonColumn
          accent="gray"
          emoji="⏳"
          title="Noch Zeit"
          subtitle="Vormerken & Ideen sammeln – Produktion startet später"
          events={columns.nochZeit}
          countdownPrefix="Produktionsstart"
          actionButton={{ label: 'Pin-Idee speichern' }}
          emptyText="Keine weiteren Events vorgemerkt."
        />
      </div>

      <div className="mt-4 text-right">
        <Link
          href="/dashboard/saison-kalender"
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Alle Events in der Datenbank verwalten ↗
        </Link>
      </div>
    </section>
  )
}

function SaisonColumn({
  accent,
  emoji,
  title,
  subtitle,
  events,
  countdownPrefix,
  actionButton,
  emptyText,
}: {
  accent: SaisonAccent
  emoji: string
  title: string
  subtitle: string
  events: KanbanEvent[]
  countdownPrefix: string
  actionButton?: SaisonAction
  emptyText: string
}) {
  const cls = SAISON_ACCENT[accent]
  const visible = events.slice(0, 1)
  const hidden = events.slice(1)

  return (
    <div
      className={`flex flex-col rounded-lg border ${cls.border} bg-white shadow-sm`}
    >
      <div
        className={`rounded-t-lg border-b ${cls.border} ${cls.headerBg} px-3 py-2`}
      >
        <h3
          className={`flex items-center gap-1.5 text-sm font-semibold ${cls.headerText}`}
        >
          <span aria-hidden>{emoji}</span>
          {title}
        </h3>
        <p className={`mt-0.5 text-xs ${cls.headerText} opacity-80`}>
          {subtitle}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {events.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
            {emptyText}
          </p>
        ) : (
          <>
            {visible.map((e) => (
              <SaisonCard
                key={e.id}
                event={e}
                countdownLabel={formatCountdown(countdownPrefix, e.countdownDays)}
                countdownClassName={cls.countdown}
                actionButton={actionButton}
              />
            ))}
            {hidden.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-medium text-red-600 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="inline group-open:hidden">
                    ▸ {hidden.length}{' '}
                    {hidden.length === 1 ? 'weiteres' : 'weitere'}
                  </span>
                  <span className="hidden group-open:inline">
                    ▾ Weniger anzeigen
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {hidden.map((e) => (
                    <SaisonCard
                      key={e.id}
                      event={e}
                      countdownLabel={formatCountdown(
                        countdownPrefix,
                        e.countdownDays
                      )}
                      countdownClassName={cls.countdown}
                      actionButton={actionButton}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SaisonCard({
  event,
  countdownLabel,
  countdownClassName,
  actionButton,
}: {
  event: KanbanEvent
  countdownLabel: string
  countdownClassName: string
  actionButton?: SaisonAction
}) {
  return (
    <div className="flex min-h-[170px] flex-col justify-between rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <div>
        <div className="flex items-center text-sm font-medium text-gray-900">
          <span>{event.event_name}</span>
          <InfoTooltip text={buildSuchstartTooltip(event)} />
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {formatDateDe(event.event_datum)}
        </div>
        <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
          Pin-Fenster: {formatDateDe(event.pinStart)} –{' '}
          {formatDateDe(event.pinEnd)}
        </div>
        <div className={`mt-2 text-xs font-medium ${countdownClassName}`}>
          {countdownLabel}
        </div>
        {actionButton && (
          <div className="mt-1.5">
            <Link
              href={`/dashboard/pin-produktion?open=new&saison_event_id=${event.id}`}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              {actionButton.label}
            </Link>
          </div>
        )}
      </div>
      {!actionButton && (
        <div aria-hidden className="mt-1.5">
          <span className="invisible inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium">
            &nbsp;
          </span>
        </div>
      )}
    </div>
  )
}

// ===========================================================
// Pin-Pipeline (Inhalte mit Pin-Bedarf + URLs mit Potenzial)
// ===========================================================
function PinPipelineSection({
  inhaltePinBedarfA,
  inhaltePinBedarfB,
  urlPotenzial,
  thresholds,
}: {
  inhaltePinBedarfA: PinPipelineInhalt[]
  inhaltePinBedarfB: PinPipelineInhalt[]
  urlPotenzial: UrlPotenzialRow[]
  thresholds: PipelineThresholds
}) {
  const cat1Count = inhaltePinBedarfA.length + inhaltePinBedarfB.length
  return (
    <section id="content-pipeline" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">
        <LabelWithTooltip
          label="Neue Pins produzieren"
          tooltip="Diese Sektion zeigt zwei Quellen: bestehende Inhalte, die mehr Pins brauchen oder veraltete Pins haben, plus URLs mit hoher CTR aber wenig Pins (Goldnugget-Logik)."
        />
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Basierend auf deinen Inhalten und URLs: Was braucht frisches
        Pin-Material?
      </p>
      <div className="mt-3 space-y-3">
        <PinPipelineInhalteCard
          subA={inhaltePinBedarfA}
          subB={inhaltePinBedarfB}
          totalCount={cat1Count}
          thresholds={thresholds}
        />
        <PinPipelineUrlsCard urls={urlPotenzial} thresholds={thresholds} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        <Link
          href="/dashboard/einstellungen#content-pipeline-schwellwerte"
          className="font-medium text-red-600 hover:underline"
        >
          Schwellwerte in den Einstellungen anpassen ↗
        </Link>
      </div>
    </section>
  )
}

// ===========================================================
// Keywords & SEO Sektion — 4 regelbasierte Buckets aus der
// Keyword-Datenbank gegen die latest pin_analytics gerechnet.
// ===========================================================

type KeywordSeoTyp = 'haupt' | 'mid_tail' | 'longtail'

type KeywordSeoEntry = {
  id: string
  keyword: string
  typ: KeywordSeoTyp
  pinsCount: number
  avgCtr: number | null
  avgKlicks: number | null
}

type KeywordsSeoBuckets = {
  unused: KeywordSeoEntry[]
}

const KEYWORD_TYP_LABEL: Record<KeywordSeoTyp, string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
}

const KEYWORD_TYP_BADGE: Record<KeywordSeoTyp, string> = {
  haupt: 'bg-red-100 text-red-700',
  mid_tail: 'bg-yellow-100 text-yellow-800',
  longtail: 'bg-green-100 text-green-700',
}

function buildKeywordPinHref(keyword: string): string {
  return `/dashboard/pin-produktion?keyword=${encodeURIComponent(keyword)}`
}

function KeywordsSeoSection({
  buckets,
  hasAnyKeywords,
}: {
  buckets: KeywordsSeoBuckets
  hasAnyKeywords: boolean
}) {
  const heading = (
    <h2 className="text-lg font-semibold text-gray-900">Keyword-Einsatz</h2>
  )

  if (!hasAnyKeywords) {
    return (
      <section id="keywords-seo" className="scroll-mt-4">
        {heading}
        <DashEmptyBox>
          →{' '}
          <Link
            href="/dashboard/keywords"
            className="font-medium text-red-600 hover:underline"
          >
            Zuerst Keywords in der Keyword-Datenbank anlegen
          </Link>
          .
        </DashEmptyBox>
      </section>
    )
  }

  return (
    <section id="keywords-seo" className="scroll-mt-4">
      {heading}
      <p className="mt-1 text-sm text-gray-600">
        Hol mehr aus deiner Keyword-Datenbank heraus.
      </p>
      <div className="mt-3 space-y-3">
        <KeywordsSeoCard
          title="Ungenutzte Keywords"
          subtitle="Diese Keywords stecken noch in keinem Pin."
          counterClass="bg-gray-100 text-gray-700"
          entries={buckets.unused}
          emptyText="Alle Keywords sind bereits in Pins eingesetzt."
          renderEntry={(kw) => (
            <KeywordRowUnused key={kw.id} kw={kw} />
          )}
        />
      </div>
      <p className="pt-2 text-xs text-gray-500">
        →{' '}
        <Link
          href="/dashboard/keywords"
          className="font-medium text-red-600 hover:underline"
        >
          Zur Keyword-Datenbank
        </Link>
      </p>
    </section>
  )
}

function KeywordsSeoCard({
  title,
  subtitle,
  counterClass,
  entries,
  emptyText,
  renderEntry,
}: {
  title: string
  subtitle: string
  counterClass: string
  entries: KeywordSeoEntry[]
  emptyText: string
  renderEntry: (kw: KeywordSeoEntry) => JSX.Element
}) {
  const visible = entries.slice(0, 5)
  const remaining = entries.length - visible.length
  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            entries.length === 0 ? 'bg-gray-100 text-gray-400' : counterClass
          }`}
        >
          {entries.length}
        </span>
      </summary>

      <div className="border-t border-gray-200 px-4 py-2">
        {entries.length === 0 ? (
          <p className="px-1 py-3 text-sm text-gray-500">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((kw) => renderEntry(kw))}
          </ul>
        )}
        {remaining > 0 && (
          <p className="px-1 pb-2 pt-3 text-xs text-gray-500">
            + {remaining} weitere, siehe{' '}
            <Link
              href="/dashboard/keywords"
              className="font-medium text-red-600 hover:underline"
            >
              Keyword-Datenbank
            </Link>
          </p>
        )}
      </div>
    </details>
  )
}

function KeywordRowUnused({ kw }: { kw: KeywordSeoEntry }) {
  return (
    <li className="px-1 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {kw.keyword}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${KEYWORD_TYP_BADGE[kw.typ]}`}
            >
              {KEYWORD_TYP_LABEL[kw.typ]}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            0 Pins, noch in keinem Pin verwendet
          </div>
        </div>
        <Link
          href={buildKeywordPinHref(kw.keyword)}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Pin erstellen
        </Link>
      </div>
    </li>
  )
}

function PinPipelineInhalteCard({
  subA,
  subB,
  totalCount,
  thresholds,
}: {
  subA: PinPipelineInhalt[]
  subB: PinPipelineInhalt[]
  totalCount: number
  thresholds: PipelineThresholds
}) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-base text-gray-700"
          aria-hidden
        >
          📖
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip
              label="Inhalte mit Pin-Bedarf"
              tooltip="Pinterest belohnt kontinuierliche Pin-Produktion pro Inhalt. Pro Inhalt sollten alle 3-4 Wochen neue Pin-Varianten erscheinen."
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            Inhalte aus deiner Content-Datenbank, die mehr Pin-Material brauchen
            – größter Hebel für Reichweite.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            totalCount === 0
              ? 'bg-gray-100 text-gray-400'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {totalCount}
        </span>
      </summary>

      <div className="border-t border-gray-200">
        <div className="coaching-box mx-4 my-3 space-y-1 text-xs font-medium">
          <div>
            🎯 <strong>Der Hebel:</strong> Pinterest belohnt frische
            Pin-Varianten pro Inhalt. Wer pro Inhalt regelmäßig neue Pins mit
            anderen Hooks produziert, maximiert die Reichweite jedes
            einzelnen Themas.
          </div>
          <div>
            <strong>So gehst du vor:</strong> Pro Inhalt mindestens alle 3-4
            Wochen eine neue Pin-Variante produzieren. Verschiedene Hooks und
            Designs für denselben Inhalt ausspielen.
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          <PinPipelineInhalteSubList
            heading="🆕 INHALTE MIT ZU WENIGEN PINS"
            items={subA}
            kind="few_pins"
            emptyText="Aktuell keine Inhalte mit zu wenigen Pins – stark, alle Themen haben Material."
            thresholds={thresholds}
          />
          <PinPipelineInhalteSubList
            heading="💤 INHALTE OHNE AKTUELLEN PIN"
            items={subB}
            kind="stale"
            emptyText="Aktuell keine Inhalte mit langer Pin-Pause – alle Themen werden regelmäßig bepinnt."
            thresholds={thresholds}
          />
        </div>
      </div>
    </details>
  )
}

function PinPipelineInhalteSubList({
  heading,
  items,
  kind,
  emptyText,
  thresholds,
}: {
  heading: string
  items: PinPipelineInhalt[]
  kind: 'few_pins' | 'stale'
  emptyText: string
  thresholds: PipelineThresholds
}) {
  const visibleLimit = 3
  const visible = items.slice(0, visibleLimit)
  const remaining = items.length - visible.length
  const tooltip =
    kind === 'few_pins'
      ? `Inhalte mit weniger als ${thresholds.minPinsGesamt} Pins insgesamt. ` +
        'Pinterest belohnt mehrere Pin-Varianten pro Inhalt – idealerweise ' +
        '3+ Hooks und Designs für denselben Inhalt. Hinweis: Jeder Inhalt ' +
        'erscheint nur in einer Sub-Liste. Schwellwert in den Einstellungen ' +
        'anpassbar.'
      : `Inhalte mit ausreichend Pins (${thresholds.minPinsOhneAktuell}+ insgesamt), bei denen ` +
        `aber seit über ${thresholds.tageOhnePin} Tagen kein neuer Pin mehr ` +
        'veröffentlicht wurde. Pinterest belohnt kontinuierliche Aktivität ' +
        'pro Inhalt. Hinweis: Inhalte mit zu wenigen Pins erscheinen in ' +
        'Sub-Liste A, auch wenn der letzte Pin lange zurückliegt. ' +
        'Schwellwerte in den Einstellungen anpassbar.'

  return (
    <details className="group/sub">
      <summary className="flex cursor-pointer list-none items-center gap-2 bg-gray-50 py-2 pl-8 pr-4 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
        <span className="text-base leading-none text-gray-400" aria-hidden>
          <span className="inline group-open/sub:hidden">▸</span>
          <span className="hidden group-open/sub:inline">▾</span>
        </span>
        <span className="flex flex-1 items-center text-[13px] font-semibold uppercase tracking-wide text-gray-700">
          {heading}
          <InfoTooltip text={tooltip} />
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            items.length === 0
              ? 'bg-gray-100 text-gray-400'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {items.length}
        </span>
      </summary>

      {items.length === 0 ? (
        <div className="border-t border-gray-100 px-4 py-4 text-center text-sm text-green-700">
          {emptyText}
        </div>
      ) : (
        <div className="border-t border-gray-100">
          <ul className="divide-y divide-gray-100">
            {visible.map((c) => (
              <PinPipelineInhaltRow
                key={c.id}
                item={c}
                kind={kind}
                thresholds={thresholds}
              />
            ))}
          </ul>
          {remaining > 0 && (
            <details className="group/more border-t border-gray-100">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-red-600 hover:underline [&::-webkit-details-marker]:hidden">
                <span className="inline group-open/more:hidden">
                  ▸ {remaining} weitere Inhalte anzeigen
                </span>
                <span className="hidden group-open/more:inline">
                  ▾ Weniger anzeigen
                </span>
              </summary>
              <ul className="divide-y divide-gray-100">
                {items.slice(visibleLimit).map((c) => (
                  <PinPipelineInhaltRow
                    key={c.id}
                    item={c}
                    kind={kind}
                    thresholds={thresholds}
                  />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </details>
  )
}

function PinPipelineInhaltRow({
  item,
  kind,
  thresholds,
}: {
  item: PinPipelineInhalt
  kind: 'few_pins' | 'stale'
  thresholds: PipelineThresholds
}) {
  const meta =
    item.pinCount === 0
      ? 'Noch kein Pin zu diesem Inhalt vorhanden'
      : `${item.pinCount} Pin${item.pinCount === 1 ? '' : 's'}` +
        (item.letzterPinTage !== null
          ? ` · Letzter Pin: vor ${item.letzterPinTage} Tag${
              item.letzterPinTage === 1 ? '' : 'en'
            }`
          : '')
  const pinPlural = item.pinCount === 1 ? '' : 's'
  // Sub A (few_pins) hat zwei Varianten:
  //   - Letzter Pin > tageOhnePin → orange (zusätzliches Stale-Signal)
  //   - sonst → gelb (reines Volumen-Signal)
  // Sub B (stale) ist immer orange.
  const fewPinsIsStale =
    kind === 'few_pins' &&
    item.letzterPinTage !== null &&
    item.letzterPinTage > thresholds.tageOhnePin
  const hint =
    kind === 'stale'
      ? `⚠️ Letzter Pin vor ${item.letzterPinTage ?? 0} Tagen – kontinuierliche Pin-Produktion fehlt, neue Variante mit anderem Hook produzieren.`
      : fewPinsIsStale
        ? `⚠️ Nur ${item.pinCount} Pin${pinPlural} und seit ${item.letzterPinTage} Tagen kein neuer – kontinuierliche Pin-Produktion fehlt.`
        : item.pinCount === 0
          ? `⚠️ Noch keinen Pin zu diesem Inhalt erstellt – pro Inhalt sollten ${thresholds.minPinsGesamt}+ Varianten existieren.`
          : `⚠️ Nur ${item.pinCount} Pin${pinPlural} – pro Inhalt sollten ${thresholds.minPinsGesamt}+ Varianten existieren.`
  const hintBoxCls =
    kind === 'stale' || fewPinsIsStale
      ? 'bg-orange-50 text-orange-800'
      : 'bg-yellow-50 text-yellow-800'
  const visibleBoards = item.boardNames.slice(0, 2)
  const hiddenBoards = item.boardNames.slice(2)
  const chipCls =
    'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700'
  const boardLabel = item.boardNames.length === 1 ? 'Board:' : 'Boards:'
  return (
    <li className="space-y-1 px-4 py-3">
      {/* Zeile 1 — Titel links | Buttons rechts */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-semibold text-gray-900">
          {item.titel}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/pin-produktion?content_id=${item.id}&open=new`}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Pin erstellen
          </Link>
          {item.primaryUrl && (
            <a
              href={item.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Zur Ziel-URL ↗
            </a>
          )}
        </div>
      </div>
      {/* Zeile 2 — Meta */}
      <div className="text-xs text-gray-600">{meta}</div>
      {item.boardNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500">{boardLabel}</span>
          {visibleBoards.map((name) => (
            <span key={`b-${name}`} className={chipCls}>
              {name}
            </span>
          ))}
          {hiddenBoards.length > 0 && (
            <details className="contents">
              <summary className="cursor-pointer list-none text-xs font-medium text-red-600 hover:underline [&::-webkit-details-marker]:hidden">
                + {hiddenBoards.length} weitere
              </summary>
              {hiddenBoards.map((name) => (
                <span key={`b-${name}`} className={chipCls}>
                  {name}
                </span>
              ))}
            </details>
          )}
        </div>
      )}
      <div className={`rounded-md px-2 py-1.5 text-xs ${hintBoxCls}`}>
        {hint}
      </div>
    </li>
  )
}

function PinPipelineUrlsCard({
  urls,
  thresholds,
}: {
  urls: UrlPotenzialRow[]
  thresholds: PipelineThresholds
}) {
  const visible = urls.slice(0, 5)
  const remaining = urls.length - visible.length
  const ctrText = thresholds.minCtrGoldnugget
    .toString()
    .replace('.', ',')
  const urlsTooltip =
    `URLs deren Pins eine Ø-CTR über ${ctrText}% haben und gleichzeitig ` +
    `weniger als ${thresholds.maxPinsGoldnugget} Pins haben. Hier zahlt sich ` +
    'jeder zusätzliche Pin besonders aus, weil das Thema bewiesen funktioniert. ' +
    'Pinterest-Durchschnitt liegt bei 0,3-0,8%. Schwellwerte in den ' +
    'Einstellungen anpassbar.'
  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-base text-gray-700"
          aria-hidden
        >
          🔗
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip label="URLs mit Potenzial" tooltip={urlsTooltip} />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            URLs mit hoher CTR aber wenigen Pins – ungenutztes Goldnugget.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            urls.length === 0
              ? 'bg-gray-100 text-gray-400'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {urls.length}
        </span>
      </summary>

      {urls.length === 0 ? (
        <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
          Aktuell keine URLs mit auffälligem CTR-Potenzial. Bei mehr
          Datenmaterial werden hier Goldnugget-URLs angezeigt.
        </div>
      ) : (
        <div className="border-t border-gray-200">
          <div className="coaching-box mx-4 my-3 space-y-1 text-xs font-medium">
            <div>
              🎯 <strong>Der Hebel:</strong> Eine URL mit hoher CTR und
              wenigen Pins ist ein bewiesenes Erfolgs-Thema mit ungenutztem
              Volumen. Jeder neue Pin auf dieses Thema bringt vorhersehbar
              Traffic.
            </div>
            <div>
              <strong>So gehst du vor:</strong> Identifiziere die Hooks und
              Designs die bei den bestehenden Pins funktioniert haben.
              Produziere 3-5 weitere Varianten in derselben Erfolgs-Logik.
            </div>
          </div>
          <ul className="divide-y divide-gray-100">
            {visible.map((u) => (
              <PinPipelineUrlRow key={u.basisUrl} url={u} />
            ))}
          </ul>
          {remaining > 0 && (
            <details className="border-t border-gray-100">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-red-600 hover:underline">
                + {remaining} weitere URL{remaining === 1 ? '' : 's'} anzeigen
              </summary>
              <ul className="divide-y divide-gray-100">
                {urls.slice(5).map((u) => (
                  <PinPipelineUrlRow key={u.basisUrl} url={u} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </details>
  )
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.host.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return url
  }
}

function PinPipelineUrlRow({ url }: { url: UrlPotenzialRow }) {
  const display =
    url.displayTitle && url.displayTitle.trim() !== ''
      ? url.displayTitle
      : shortenUrl(url.basisUrl)
  const ctrText = url.ctr.toFixed(1).replace('.', ',')
  const visibleBoards = url.boardNames.slice(0, 2)
  const hiddenBoards = url.boardNames.slice(2)
  const chipCls =
    'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700'
  return (
    <li className="space-y-1 px-4 py-3">
      {/* Zeile 1 — Titel links | Buttons rechts */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-semibold text-gray-900">
          {display}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/dashboard/pin-produktion?open=new"
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Pin erstellen
          </Link>
          <a
            href={url.basisUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            URL öffnen ↗
          </a>
        </div>
      </div>
      {/* Zeile 2 — Meta (Pin-Count + Ø CTR) */}
      <div className="text-xs text-gray-600">
        {url.pinCount} Pin{url.pinCount === 1 ? '' : 's'} · Ø CTR:{' '}
        <strong className="text-gray-900">{ctrText}%</strong>
      </div>
      {url.boardNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500">
            {url.boardNames.length === 1 ? 'Board:' : 'Boards:'}
          </span>
          {visibleBoards.map((name) => (
            <span key={`b-${name}`} className={chipCls}>
              {name}
            </span>
          ))}
          {hiddenBoards.length > 0 && (
            <details className="contents">
              <summary className="cursor-pointer list-none text-xs font-medium text-red-600 hover:underline [&::-webkit-details-marker]:hidden">
                + {hiddenBoards.length} weitere
              </summary>
              {hiddenBoards.map((name) => (
                <span key={`b-${name}`} className={chipCls}>
                  {name}
                </span>
              ))}
            </details>
          )}
        </div>
      )}
      <div className="coaching-box !px-2 !py-1.5 text-xs">
        🎯 Hohe CTR ({ctrText}%) bei wenigen Pins – Erfolg skalieren.
      </div>
    </li>
  )
}

// ===========================================================
// Board-Gesundheit (Dashboard)
// ===========================================================
function BoardGesundheitDashboardSection({
  kpis,
  topKarten,
  restBoards,
  accountHinweise,
  boardsOhneAnalyticsCount,
}: {
  kpis: {
    boardsTotal: number
    aktivitaetsratePct: number
    aktivBoardsCount: number
    avgLastPinDays: number | null
    boardsMitPotenzial: number
    staerkstesBoardAnteil: number
    staerkstesBoardName: string | null
  }
  topKarten: CoachingKarte[]
  restBoards: CoachingRestBoard[]
  accountHinweise: {
    zuVieleBoards: boolean
    zuWenigeBoards: boolean
    staerkstesBoardAnteil: number
  }
  boardsOhneAnalyticsCount: number
}) {
  const headingTooltip =
    'Pinterest ist eine Suchmaschine. Keywords bestimmen wer dich findet, Boards bestimmen ob Pinterest dir vertraut. Inaktive Boards bremsen alle Pins darauf und schaden deiner thematischen Autorität. Top Boards signalisieren thematische Expertise und geben neuen Pins automatisch mehr Reichweite.'

  const heading = (
    <>
      <h2 className="text-lg font-semibold text-gray-900">
        <LabelWithTooltip
          label="Board-Gesundheit"
          tooltip={headingTooltip}
        />
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Boards zeigen Pinterest, für welche Themen du stehst. Hier siehst du,
        welche deiner Boards gepflegt sind und wo du mit wenig Aufwand mehr
        Sichtbarkeit holst.
      </p>
    </>
  )

  const staerkstesProzent = Math.round(accountHinweise.staerkstesBoardAnteil * 100)

  return (
    <section id="board-gesundheit" className="scroll-mt-4">
      {heading}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BoardKpiCell
          label="Aktivitätsrate"
          value={`${formatPercent(kpis.aktivitaetsratePct, 0)} aktiv`}
          sub={`${kpis.aktivBoardsCount} von ${kpis.boardsTotal} Boards`}
          tooltip="Anteil der Boards, die in den letzten 30 Tagen einen neuen Pin bekommen haben. Pinterest belohnt aktive Boards mit mehr Reichweite."
          accent={aktivitaetAccent(kpis.aktivitaetsratePct)}
        />
        <BoardKpiCell
          label="Ø Letzter Pin"
          value={
            kpis.avgLastPinDays === null
              ? '-'
              : kpis.avgLastPinDays === 0
                ? 'heute'
                : kpis.avgLastPinDays === 1
                  ? 'vor 1 Tag'
                  : `vor ${kpis.avgLastPinDays} Tagen`
          }
          tooltip="Im Durchschnitt vor wie vielen Tagen wurde auf deinen Boards zuletzt ein Pin veröffentlicht. Frequenz ist der wichtigste Hebel für Board-Performance."
          accent={avgPinAccent(kpis.avgLastPinDays)}
        />
        <BoardKpiCell
          label="Boards mit Potenzial"
          value={`${kpis.boardsMitPotenzial} von ${kpis.boardsTotal}`}
          tooltip="So viele deiner Boards haben mindestens einen offenen Hebel, mit dem du mehr Sichtbarkeit holst."
          accent={kpis.boardsMitPotenzial === 0 ? 'green' : 'yellow'}
        />
        <BoardKpiCell
          label="Stärkstes Board"
          value={
            accountHinweise.staerkstesBoardAnteil > 0
              ? `${staerkstesProzent} %`
              : '-'
          }
          sub={kpis.staerkstesBoardName ?? 'deiner Reichweite'}
          tooltip="Das ist dein reichweitenstärkstes Board: So viel deiner gesamten Board-Impressionen entfallen auf dieses eine Board. Ein sehr hoher Wert bei vielen Boards kann ein Klumpenrisiko sein."
          accent="gray"
        />
      </div>

      {(accountHinweise.zuWenigeBoards || accountHinweise.zuVieleBoards) && (
        <div className="coaching-box mt-3">
          {accountHinweise.zuWenigeBoards && (
            <p className="leading-relaxed">
              Du hast erst {kpis.boardsTotal}{' '}
              {kpis.boardsTotal === 1 ? 'Board' : 'Boards'}. Mit ein paar
              fokussierten Themen-Boards mehr gibst du Pinterest klarere
              Signale, wofür du stehst.
            </p>
          )}
          {accountHinweise.zuVieleBoards && (
            <p className="leading-relaxed">
              Du pflegst {kpis.boardsTotal} Boards. Das ist viel: bündle deine
              Energie lieber auf die Themen, die wirklich tragen, statt sie zu
              verzetteln.
            </p>
          )}
        </div>
      )}

      {topKarten.length === 0 ? (
        <div className="coaching-box mt-4">
          <p className="font-medium leading-relaxed">
            Deine Boards sind richtig gut aufgestellt, hier ist gerade nichts
            zu tun. Pinne einfach weiter regelmäßig, dann bleibt das so.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
            Das sind deine wichtigsten Hebel gerade.
          </p>
          <div className="mt-2 space-y-3">
            {topKarten.map((karte) => (
              <CoachingKarteRow key={karte.boardId} karte={karte} />
            ))}
          </div>
        </>
      )}

      {restBoards.length > 0 && (
        <details className="group mt-3 rounded-lg border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
            <span className="text-2xl leading-none text-gray-400" aria-hidden>
              <span className="inline group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            <span>Alle weiteren Hinweise</span>
          </summary>
          <ul className="border-t border-gray-200">
            {restBoards.map((rb) => (
              <li
                key={rb.boardId}
                className="border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 text-sm font-semibold text-gray-900">
                    <span className="truncate">{rb.boardName}</span>
                  </div>
                  <CoachingButtons
                    boardId={rb.boardId}
                    pinterestUrl={rb.pinterestUrl}
                  />
                </div>
                {rb.hebelTexte.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {rb.hebelTexte.map((t, i) => (
                      <li
                        key={i}
                        className="text-sm leading-relaxed text-gray-700"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <PreparedPinsBox boardId={rb.boardId} prepared={rb.prepared} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-gray-500">
          <Link
            href="/dashboard/boards"
            className="font-medium text-red-600 hover:underline"
          >
            Alle Boards in der Übersicht ansehen ↗
          </Link>
          {boardsOhneAnalyticsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <InfoIcon className="shrink-0 text-gray-400" />
              <span>
                {boardsOhneAnalyticsCount}{' '}
                {boardsOhneAnalyticsCount === 1
                  ? 'Board ohne'
                  : 'Boards ohne'}{' '}
                Analytics-Einträge:{' '}
                <Link
                  href="/dashboard/analytics?tab=boards"
                  className="font-medium text-red-600 hover:underline"
                >
                  Daten eintragen ↗
                </Link>
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

// Buttons „Pins planen" + „Zum Board" für ein Board (Coaching-Karten + Liste).
function CoachingButtons({
  boardId,
  pinterestUrl,
}: {
  boardId: string
  pinterestUrl: string | null
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={`/dashboard/pin-produktion?new=1&board=${boardId}`}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
      >
        Pins planen
      </Link>
      {pinterestUrl && (
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Zum Board ↗
        </a>
      )}
    </div>
  )
}

// Eine der bis zu drei priorisierten Handlungskarten. Hat das Board vorbereitete
// Pins, erscheint die grüne Box auch hier (im einklappbaren Bereich wird sie für
// dieses Board dann ausgelassen, damit jede Info nur einmal steht).
function CoachingKarteRow({ karte }: { karte: CoachingKarte }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-base font-semibold text-gray-900">
          <span className="truncate">{karte.boardName}</span>
        </div>
        <CoachingButtons
          boardId={karte.boardId}
          pinterestUrl={karte.pinterestUrl}
        />
      </div>
      {karte.kind === 'buendel' && karte.buendelPunkte ? (
        <div className="mt-1.5">
          <p className="text-sm font-semibold leading-relaxed text-gray-900">
            Dieses Board braucht einmal deine volle Aufmerksamkeit.
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {karte.buendelPunkte.map((punkt, i) => (
              <li key={i} className="text-sm leading-relaxed text-gray-700">
                {punkt}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
            Nimm es dir am Stück vor, das bringt auf einen Schlag am meisten.
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          {karte.text}
        </p>
      )}
      <PreparedPinsBox boardId={karte.boardId} prepared={karte.prepared} />
    </div>
  )
}

// Grüne Box „vorbereitete Pins" (Entwurf / geplant). Wird nur gezeigt, wenn
// mindestens einer der beiden Counts > 0 ist.
function PreparedPinsBox({
  boardId,
  prepared,
}: {
  boardId: string
  prepared: { entwurf: number; geplant: number }
}) {
  const { entwurf, geplant } = prepared
  if (entwurf === 0 && geplant === 0) return null
  const showEntwurf = entwurf > 0
  const showGeplant = geplant > 0
  const entwurfHref = `/dashboard/pin-produktion?filter[board]=${boardId}&filter[status]=entwurf`
  const geplantHref = `/dashboard/pin-produktion?filter[board]=${boardId}&filter[status]=geplant`
  const linkCls = 'underline underline-offset-2 hover:text-green-800'
  return (
    <div className="mt-2 text-xs text-green-700">
      ✅{' '}
      {showEntwurf && (
        <>
          <Link href={entwurfHref} className={linkCls}>
            {entwurf} {entwurf === 1 ? 'Pin' : 'Pins'} als Entwurf gespeichert
          </Link>{' '}
          – einplanen und veröffentlichen.
        </>
      )}
      {showEntwurf && showGeplant && ' '}
      {showGeplant && (
        <>
          <Link href={geplantHref} className={linkCls}>
            {geplant} {geplant === 1 ? 'Pin' : 'Pins'} bereits eingeplant
          </Link>{' '}
          – Veröffentlichung vorziehen möglich.
        </>
      )}
    </div>
  )
}

type KpiAccent = 'green' | 'yellow' | 'red' | 'gray' | null

const KPI_ACCENT_CLASS: Record<Exclude<KpiAccent, null>, string> = {
  green: 'border-l-4 border-l-green-500',
  yellow: 'border-l-4 border-l-yellow-500',
  red: 'border-l-4 border-l-red-500',
  gray: 'border-l-4 border-l-gray-400',
}

function BoardKpiCell({
  label,
  value,
  valueClass = 'text-gray-900',
  tooltip,
  sub,
  highlight = false,
  accent = null,
}: {
  label: string
  value: string
  valueClass?: string
  tooltip?: string
  sub?: string
  highlight?: boolean
  accent?: KpiAccent
}) {
  // Hero (Engagement Rate) hat eigenen 2px-Rahmen — kein zusätzlicher Akzent.
  // Andernfalls dezenter Linksrand-Akzent gemäß Datenwert.
  const borderCls = highlight
    ? 'border-2 border-green-200'
    : accent
      ? `border border-gray-200 ${KPI_ACCENT_CLASS[accent]}`
      : 'border border-gray-200'
  return (
    <div className={`rounded-lg ${borderCls} bg-white p-4 shadow-sm`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

function aktivitaetAccent(pct: number): KpiAccent {
  if (pct >= 70) return 'green'
  if (pct >= 40) return 'yellow'
  return 'red'
}

function avgPinAccent(days: number | null): KpiAccent {
  if (days === null) return null
  if (days <= 7) return 'green'
  if (days <= 14) return 'gray'
  if (days <= 30) return 'yellow'
  return 'red'
}

function PerformanceVerlaufSection({ points }: { points: ChartPoint[] }) {
  const headingTooltip =
    'Hier siehst du die Entwicklung deiner wichtigsten Metriken über die letzten 12 Monate (rollierend). Sobald ein neuer Monat hinzukommt, fällt der älteste raus.'
  const tooLittle = points.length < 3
  const datapointLabel =
    points.length === 1 ? '1 Datenpunkt' : `${points.length} Datenpunkte`

  return (
    <section>
      <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
          <span className="text-2xl leading-none text-gray-400" aria-hidden>
            <span className="inline group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </span>
          <h2 className="flex-1 text-lg font-semibold text-gray-900">
            <LabelWithTooltip
              label="Performance-Verlauf"
              tooltip={headingTooltip}
            />
          </h2>
        </summary>
        <div className="border-t border-gray-200 p-4">
          {tooLittle ? (
            <div className="flex h-72 items-center justify-center">
              <p className="text-center text-sm text-gray-400">
                Der Verlauf wird ab dem 3. Monat sichtbar.
                <br />
                Aktuell verfügbar: {datapointLabel}.
              </p>
            </div>
          ) : (
            <PerformanceChart data={points} />
          )}
        </div>
      </details>
    </section>
  )
}

// ===========================================================
// Briefing-Block: weiße Sektion mit „Deine Prioritäten" +
// „Deine nächsten Schritte" + Aktualitäts-Hinweis am Ende.
// ===========================================================
function BriefingBlock({
  briefingItems,
  nextStepsItems,
}: {
  briefingItems: BriefingItem[]
  nextStepsItems: BriefingItem[]
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <BriefingSection items={briefingItems} nextSteps={nextStepsItems} />
      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <InfoIcon className="mb-0.5 inline text-gray-400" /> Das Dashboard ist nur so aktuell wie deine
        zuletzt eingepflegten Daten. Pflege einmal monatlich deine
        Pinterest-Analytics ein.
      </p>
    </section>
  )
}

// ===========================================================
// Hero-Section: schmaler Analytics-Status-Banner (grün/gelb/rot/grau)
// + optionales Warn-Banner bei rotem Status. Profil-Gesundheit und
// Briefing sind eigenständige weiße Sektionen darunter.
// ===========================================================
function HeroSection({
  status,
  analyticsUpdateDatum,
  pinsCount,
  boardsCount,
}: {
  status: UpdateStatusMonat
  analyticsUpdateDatum: string | null
  pinsCount: number
  boardsCount: number
}) {
  // Onboarding-Modus: noch nie Analytics gepflegt — blauer Info-Banner
  // statt Status/Profil-Gesundheit.
  if (status.state === 'leer') {
    return (
      <section className="rounded-lg bg-slate-800 px-4 py-4 text-white shadow-md">
        <div className="flex flex-wrap items-start gap-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Willkommen!</p>
            <p className="mt-0.5 text-slate-300">
              Bevor das Dashboard aussagekräftig wird, pflege einmal monatlich
              deine Pinterest-Analytics ein. Erst dann zeigen KPIs,
              Strategie-Check und Coaching-Empfehlungen verlässliche Werte.
            </p>
            <Link
              href="/dashboard/analytics"
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              → Analytics jetzt einpflegen
            </Link>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-3 border-l border-slate-600 pl-3 text-xs text-slate-300">
            <span>📌 {formatZahl(pinsCount)} Pins</span>
            <span className="text-slate-500" aria-hidden>
              ·
            </span>
            <span>📋 {formatZahl(boardsCount)} Boards</span>
          </span>
        </div>
      </section>
    )
  }
  const tone =
    status.state === 'rot'
      ? {
          border: 'border-red-200',
          bg: 'bg-red-50',
          title: 'text-red-900',
          body: 'text-red-800',
        }
      : {
          border: 'border-green-200',
          bg: 'bg-green-50',
          title: 'text-green-900',
          body: 'text-green-800',
        }

  const statusLabel =
    status.state === 'rot'
      ? '🔴 Analytics-Status: Update fällig'
      : '🟢 Analytics-Status: Aktuell'

  return (
    <section
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2.5 text-sm shadow-sm ${tone.border} ${tone.bg} ${tone.body}`}
    >
      <span className={`font-semibold ${tone.title}`}>{statusLabel}</span>
      <span className="text-gray-400" aria-hidden>
        ·
      </span>
      <span>
        Letztes Update:{' '}
        <strong>
          {analyticsUpdateDatum ? formatDateDe(analyticsUpdateDatum) : 'noch nie'}
        </strong>
      </span>
      {status.state === 'gruen' && (
        <>
          <span className="text-gray-400" aria-hidden>
            ·
          </span>
          <span>
            Nächstes Update ab:{' '}
            <strong>{formatDateDe(status.eintragbarAb)}</strong>
          </span>
        </>
      )}
      {status.state === 'rot' && (
        <>
          <span className="text-gray-400" aria-hidden>
            ·
          </span>
          <span>
            Zeitraum{' '}
            <strong>
              {formatDateDe(status.faelligerMonatVon)} bis{' '}
              {formatDateDe(status.faelligerMonatBis)}
            </strong>{' '}
            fällig
          </span>
        </>
      )}
      <Link
        href="/dashboard/analytics"
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        📊 Jetzt aktualisieren
      </Link>
      <span className="ml-auto flex items-center gap-3 border-l border-gray-300 pl-3 text-gray-700">
        <span>📌 {formatZahl(pinsCount)} Pins</span>
        <span className="text-gray-400" aria-hidden>
          ·
        </span>
        <span>📋 {formatZahl(boardsCount)} Boards</span>
      </span>
    </section>
  )
}

// ===========================================================
// Phasen-Trenner — Space Grotesk, Titel mittig zwischen zwei Linien
// ===========================================================
function PhasenTrenner({ title }: { title: string }) {
  return (
    <div className="mb-6 mt-12 flex items-center gap-6">
      <span aria-hidden className="h-px flex-1 bg-gray-200" />
      <span
        className="text-[18px] font-semibold text-gray-900 sm:text-[20px]"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </span>
      <span aria-hidden className="h-px flex-1 bg-gray-200" />
    </div>
  )
}

// ===========================================================
// Gesamt-Profil-Performance — neues 3-Spalten-Layout
// Spalte 1: Ergebnis (Hero-KPIs untereinander)
// Spalte 2: Treiber (KPIs untereinander)
// Spalte 3: Performance-Verlauf (Chart, gleiche Höhe wie Sp. 1+2)
// Darunter: Kontext-Zeile in voller Breite
// ===========================================================
function ProfilPerformanceSection({
  latest,
  previous,
  chartPoints,
  audienceSnapshots,
  nicheProfile,
}: {
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
  chartPoints: ChartPoint[]
  audienceSnapshots: AudienceSnapshot[]
  nicheProfile: AccountNicheProfile
}) {
  const prevCtr =
    previous && previous.impressionen > 0
      ? (previous.ausgehende_klicks / previous.impressionen) * 100
      : null
  const prevEngagement =
    previous && previous.impressionen > 0
      ? ((previous.saves + previous.ausgehende_klicks) /
          previous.impressionen) *
        100
      : null
  const headingTooltip =
    'Pinterest zeigt rollierende Daten der letzten 31 Tage. Wachstum % basiert auf Vergleich zum vorherigen eingetragenen Monat.'

  const prevDateLabel = previous ? ` (${formatDateDe(previous.datum)})` : ''
  const prevText = (val: string | null) =>
    val !== null ? `Vorperiode: ${val}${prevDateLabel}` : undefined

  if (!latest) {
    return (
      <section id="gesamt-profil-performance" className="scroll-mt-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <LabelWithTooltip
            label="Gesamt-Profil-Performance"
            tooltip={headingTooltip}
          />
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Wie sich deine Pinterest-Zahlen im Vergleich zum vorherigen
          Analytics-Update entwickelt haben.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            'Ausgehende Klicks',
            'Engagement Rate',
            'Saves',
            'CTR',
            'Impressionen',
            'Gesamte Zielgruppe',
            'Interagierende Zielgruppe',
          ].map((label) => (
            <KpiCardEmpty key={label} label={label} />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Noch kein Analytics-Update:{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-red-600 hover:underline"
          >
            jetzt starten
          </Link>
          .
        </p>
      </section>
    )
  }

  return (
    <section id="gesamt-profil-performance" className="scroll-mt-4">
      <h2 className="text-lg font-semibold text-gray-900">
        <LabelWithTooltip
          label="Gesamt-Profil-Performance"
          tooltip={headingTooltip}
        />
        {previous && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            (Vergleich zur Vorperiode)
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Wie sich deine Pinterest-Zahlen im Vergleich zum vorherigen
        Analytics-Update entwickelt haben.
      </p>

      {/* 3-Spalten-Grid: Ergebnis (schmal) | Treiber (schmal) | Chart (flex-1) */}
      <div className="mt-3 grid items-stretch gap-4 lg:grid-cols-[170px_170px_minmax(0,1fr)]">
        {/* Spalte 1 — Ergebnis */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <LabelWithTooltip
              label="Ergebnis"
              tooltip="Was ist am Ende rausgekommen – die Erfolgs-Metriken deines Profils."
            />
          </h3>
          <div className="mt-2 flex flex-1 flex-col gap-2">
            <KpiCard
              variant="hero"
              label="Ausgehende Klicks"
              value={formatZahl(latest.ausgehende_klicks)}
              fullValue={latest.ausgehende_klicks}
              growth={latest.klicks_growth}
              tooltip="Wie oft Nutzer von Pinterest auf deine Website geklickt haben. Das ist deine wichtigste Metrik für echten Traffic."
              previousValue={prevText(
                previous ? formatZahl(previous.ausgehende_klicks) : null
              )}
            />
            <KpiCard
              variant="hero"
              label="Engagement Rate"
              value={formatPercent(latest.engagement)}
              growth={latest.engagement_growth}
              tooltip="(Saves + Ausgehende Klicks) ÷ Impressionen. Ein Überblickswert: Auf Pinterest sind diese Werte oft klein, das ist normal. Statt auf eine feste Zahl zu schauen, achte darauf, ob er über die Zeit steigt, das siehst du im Tab Profil-Entwicklung."
              previousValue={prevText(
                prevEngagement !== null ? formatPercent(prevEngagement) : null
              )}
            />
          </div>
        </div>

        {/* Spalte 2 — Treiber */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <LabelWithTooltip
              label="Treiber"
              tooltip="Was hat das Ergebnis erzeugt – die Hebel, an denen du drehen kannst."
            />
          </h3>
          <div className="mt-2 flex flex-1 flex-col gap-2">
            <KpiCard
              label="Saves"
              value={formatZahl(latest.saves)}
              fullValue={latest.saves}
              growth={latest.saves_growth}
              tooltip="Saves sind das stärkste Algorithmus-Signal. Mehr Saves = längere Lebensdauer + mehr Reichweite."
              previousValue={prevText(
                previous ? formatZahl(previous.saves) : null
              )}
            />
            <KpiCard
              label="CTR"
              value={formatPercent(latest.ctr)}
              growth={latest.ctr_growth}
              tooltip="Ausgehende Klicks ÷ Impressionen. Zeigt ob dein Pin-Hook funktioniert. Pinterest organisch: 1,54%."
              previousValue={prevText(
                prevCtr !== null ? formatPercent(prevCtr) : null
              )}
            />
            <KpiCard
              label="Impressionen"
              value={formatZahl(latest.impressionen)}
              fullValue={latest.impressionen}
              growth={latest.impressionen_growth}
              tooltip="Wie oft deine Pins angezeigt wurden. Zeigt ob deine Keywords und SEO greifen."
              previousValue={prevText(
                previous ? formatZahl(previous.impressionen) : null
              )}
            />
          </div>
        </div>

        {/* Spalte 3 — Performance-Verlauf, volle Höhe der Treiber-Spalte */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <LabelWithTooltip
              label="Performance-Verlauf"
              tooltip="Hier siehst du die Entwicklung deiner wichtigsten Metriken über die letzten 12 Monate (rollierend). Sobald ein neuer Monat hinzukommt, fällt der älteste raus."
            />
          </h3>
          <div className="mt-2 flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <PerformanceChartArea points={chartPoints} />
          </div>
        </div>
      </div>

      {/* Kontext-Zeile in voller Breite unter den 3 Spalten */}
      <KontextZeile latest={latest} previous={previous} prevDateLabel={prevDateLabel} />

      {/* V3.0.8 — Zielgruppe-Coaching-Block direkt unter dem Kontext-Streifen.
          Der Kontext-Streifen selbst bleibt unverändert. */}
      <ZielgruppeCoachingBlock
        snapshots={audienceSnapshots}
        nicheProfile={nicheProfile}
      />
    </section>
  )
}

// Inline-Variante des Performance-Charts ohne eigenen Section-/Border-Wrapper.
// Nimmt die volle Höhe der Spalte (h-full / flex-1), damit Spalte 3 bündig
// mit der Treiber-Spalte abschließt.
function PerformanceChartArea({ points }: { points: ChartPoint[] }) {
  const tooLittle = points.length < 3
  const datapointLabel =
    points.length === 1 ? '1 Datenpunkt' : `${points.length} Datenpunkte`
  if (tooLittle) {
    return (
      <div className="flex min-h-[18rem] flex-1 items-center justify-center">
        <p className="text-center text-sm text-gray-400">
          Der Verlauf wird ab dem 3. Monat sichtbar.
          <br />
          Aktuell verfügbar: {datapointLabel}.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col">
      <PerformanceChart data={points} />
    </div>
  )
}

// Kontext-Zeile: kompakt, eine Zeile, beide Zielgruppen-KPIs mit Pfeil.
// Format: 'KONTEXT  Gesamte Zielgruppe: [Wert] [Pfeil]   ·   Interagierende ZG: [Wert] [Pfeil]'
function KontextZeile({
  latest,
  previous,
  prevDateLabel,
}: {
  latest: ProfilAnalyticsWithGrowth
  previous: ProfilAnalyticsWithGrowth | null
  prevDateLabel: string
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        <LabelWithTooltip
          label="Kontext"
          tooltip="In welchem Umfeld passiert das – wen du erreichst."
        />
      </span>
      <KontextKpi
        label="Gesamte Zielgruppe"
        value={formatZahl(latest.gesamte_zielgruppe)}
        growth={latest.zielgruppe_growth}
        tooltip="Alle Menschen die deinen Content gesehen haben, auf Pinterest und außerhalb."
        previousValue={
          previous
            ? `Vorperiode: ${formatZahl(previous.gesamte_zielgruppe)}${prevDateLabel}`
            : undefined
        }
      />
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      <KontextKpi
        label="Interagierende Zielgruppe"
        value={formatZahl(latest.interagierende_zielgruppe)}
        growth={latest.interagierend_growth}
        tooltip="Menschen die aktiv reagiert haben: geklickt, gespeichert oder kommentiert. Qualitativ wertvoller als Gesamtzielgruppe."
        previousValue={
          previous
            ? `Vorperiode: ${formatZahl(previous.interagierende_zielgruppe)}${prevDateLabel}`
            : undefined
        }
      />
    </div>
  )
}

function KontextKpi({
  label,
  value,
  growth,
  tooltip,
  previousValue,
}: {
  label: string
  value: string
  growth: number | null | undefined
  tooltip?: string
  previousValue?: string
}) {
  const arrow =
    growth === null || growth === undefined
      ? null
      : !Number.isFinite(growth)
        ? '↑ neu'
        : growth > 0
          ? `↑ ${formatGrowth(growth)}`
          : growth < 0
            ? `↓ ${formatGrowth(growth)}`
            : '→'
  const arrowCls =
    growth === null || growth === undefined
      ? 'text-gray-400'
      : !Number.isFinite(growth) || growth > 0
        ? 'text-green-700'
        : growth < 0
          ? 'text-red-700'
          : 'text-gray-500'
  // Alle Elemente in EINER Zeile: Label · Wert · Veränderung · Vorperiode
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </span>
      <span className="text-base font-semibold leading-tight text-gray-900">
        {value}
      </span>
      {arrow && (
        <span className={`text-xs font-medium ${arrowCls}`}>{arrow}</span>
      )}
      {previousValue && (
        <span className="whitespace-nowrap text-[10px] text-gray-400">
          {previousValue}
        </span>
      )}
    </span>
  )
}
