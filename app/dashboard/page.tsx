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
  boardBadgeKey,
  BOARD_AKTIVITAET_BADGE,
  type BoardBadgeKey,
  boardWirkung,
  boardWirkungMediane,
  BOARD_WIRKUNG_DEFAULTS,
  calcCtr,
  calcGrowth,
  calcSaveRate,
  calcUpdateStatusMonat,
  diagnoseBoard,
  diffDays,
  formatDateDe,
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
import { RichtungsAmpelVertikal } from './ProfilGesundheitBlock'
import { KpiCard } from '@/components/KpiCard'
import { StatusDot, type StatusTone } from '@/components/StatusDot'
import { PinKategorieIcon } from '@/components/PinKategorieIcon'
import { AnzahlBadge } from '@/components/AnzahlBadge'
import { computeRichtungsAmpel } from '@/lib/profil-gesundheit'
import { BefundeListe } from './AccountDiagnoseSection'
import WinsBlock from './WinsBlock'
import {
  computeStatus,
  type SaisonEvent,
  type SaisonTyp,
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

type PipelineThresholds = {
  minPinsGesamt: number
  minPinsOhneAktuell: number
  tageOhnePin: number
  minCtrGoldnugget: number
}

// Content-Pipeline-Schwellwerte — fachlich gesetzte Pinterest-Methodik der
// Expertin, bewusst NICHT nutzer-konfigurierbar (eine sinnvolle Bedienung
// setzt Pinterest-Know-how voraus). Einzige Quelle der Wahrheit; hier zentral
// anpassbar, falls die Methodik sich ändert.
//   minPinsGesamt      — unter so vielen Pins gilt ein Inhalt als unterversorgt
//   minPinsOhneAktuell — ab so vielen Pins zählt ein Inhalt als „stale"-fähig
//   tageOhnePin        — so viele Tage ohne neuen Pin = „ohne aktuellen Pin"
//   minCtrGoldnugget   — fester CTR-Richtwert (Fallback, in %), greift nur
//                        ohne valide Eigen-Benchmark (< 10 qualifizierte Pins)
const PIPELINE_THRESHOLDS: PipelineThresholds = {
  minPinsGesamt: 3,
  minPinsOhneAktuell: 3,
  tageOhnePin: 30,
  minCtrGoldnugget: 1.5,
}

// Goldnugget-CTR primär gegen den eigenen Median: eine URL zählt, wenn ihre
// Ø-CTR mehr als 20 % über dem persönlichen Median liegt — konsistent zur
// „klickstark"-Definition (ctrBoostFaktor) in diagnosePinAggregated.
const GOLDNUGGET_CTR_BOOST = 1.2

type PinPipelineInhalt = {
  id: string
  titel: string
  pinCount: number
  letzterPinTage: number | null
  boardNames: string[]
  keywords: string[]
  primaryUrl: string | null
}

// Inhalt mit Pin-Bedarf inkl. Grund-Kennzeichnung für die zusammengelegte
// Liste: few_pins = zu wenige (und nicht frische) Pins, stale = genug Pins,
// aber lange Pause. Steuert Ampel-Ton und Grund-Text pro Zeile.
type PinPipelineInhaltMitGrund = PinPipelineInhalt & {
  kind: 'few_pins' | 'stale'
}

type UrlPotenzialRow = {
  basisUrl: string
  displayTitle: string
  pinCount: number
  ctr: number
  boardNames: string[]
  // Prozentuale Abweichung der URL-CTR über dem eigenen Median; null, wenn
  // keine valide Benchmark vorliegt (dann griff der feste Richtwert).
  ctrUeberMedianPct: number | null
}

type KanbanEvent = {
  id: string
  event_name: string
  event_datum: string
  saison_typ: SaisonTyp
  pinStart: string
  pinEnd: string
  suchbeginnTage: number
  countdownDays: number
  // Optionaler, vorgerechneter Countdown-Text (überschreibt formatCountdown).
  // Genutzt für Zeitraum-Events in der Hochphase („läuft noch bis …").
  countdownLabelOverride?: string
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
    'Dieses Board lief schon mal gut. Bring mit drei bis fünf frischen Pins pro Woche wieder Bewegung rein, dann kommt die Sichtbarkeit zurück.',
  nie_gestartet:
    'Veröffentliche regelmäßig Pins auf diesem Board, drei bis fünf pro Woche, damit Pinterest es überhaupt kennenlernt und ausspielt.',
  wenig_aktiv:
    'Hier wird es ruhig. Pinne wieder regelmäßig, ein bis zwei Pins pro Woche halten das Board sichtbar, bevor es einschläft.',
  beschreibung_fehlt:
    'Diesem Board fehlt noch die Beschreibung. Schreib 200 bis 300 Zeichen, die dein Thema erklären, und pack dein Haupt-Keyword gleich in den ersten Satz.',
  name_ohne_keyword:
    'Im Namen dieses Boards steckt noch keines deiner Keywords. Stell dein wichtigstes Keyword nach vorn, damit Pinterest sofort versteht, worum es geht.',
  beschreibung_zu_duenn:
    'Die Beschreibung ist noch sehr knapp. Bau sie auf 200 bis 300 Zeichen aus, gern mit deinem Haupt-Keyword im ersten Satz, aber bitte nicht mit Keywords vollstopfen.',
  beschreibung_ohne_keyword:
    'Deine Beschreibung steht, aber ohne eines deiner Keywords. Bring dein Haupt-Keyword gleich in den ersten Satz, dann ordnet Pinterest das Board besser ein.',
  wirkung_schwach:
    'Dieses Board bekommt Impressionen, aber die Klicks bleiben aus. Erstelle eine neue Pin-Variante mit stärkerem Hook im Titel und einem anderen Bild, das zum Klicken einlädt.',
  name_zu_lang:
    'Der Board-Name ist zu lang. Kürz ihn auf zwei bis drei klare Wörter und stell dein wichtigstes Keyword nach vorn, so versteht Pinterest sofort, worum es geht.',
}

// Verständlicher Satz je Hebel-Typ für die Liste der Bündelkarte (Board mit
// >= 3 offenen Hebeln). Bewusst ganze Sätze statt Kürzel.
const BOARD_HEBEL_BUENDEL_PUNKT: Record<BoardHebelTyp, string> = {
  eingeschlafen: 'Das Board ist eingeschlafen, pinne wieder regelmäßig.',
  nie_gestartet:
    'Dieses Board ist noch nicht gestartet, veröffentliche regelmäßig Pins.',
  wenig_aktiv: 'Das Board wird ruhig, pinne wieder regelmäßig.',
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
  // 'einzel' = unter der Bündel-Schwelle (1-2 Hebel): volle Hebel-Sätze ohne
  // große Einleitung. 'buendel' = ab COACHING_BUENDEL_AB Hebeln: Einleitung +
  // kurze Punkte + Abschluss.
  kind: 'einzel' | 'buendel'
  boardId: string
  boardName: string
  pinterestUrl: string | null
  // Volle Hebel-Sätze (ein Satz je Hebel) — bei 'einzel' angezeigt.
  hebelTexte: string[]
  // Kurze Punkte je Hebel — nur bei 'buendel' gesetzt.
  buendelPunkte?: string[]
  prepared: { entwurf: number; geplant: number }
  // Dringendster Hebel-Typ (höchste Dringlichkeit) — steuert Pin-Box-Anzeige.
  primaryHebelTyp: BoardHebelTyp
  // ALLE Hebel-Typen des Boards — für die Button-Hervorhebung (gemischt?).
  hebelTypen: BoardHebelTyp[]
  // Aktivitäts-Zustand für die Badge-Pille neben dem Namen.
  badgeKey: BoardBadgeKey
}

// Ein Board im einklappbaren Bereich: alle seine Hebel-Texte + vorbereitete Pins.
type CoachingRestBoard = {
  boardId: string
  boardName: string
  pinterestUrl: string | null
  hebelTexte: string[]
  prepared: { entwurf: number; geplant: number }
  // Dringendster Hebel-Typ; null bei reinen „nur vorbereitete Pins"-Boards.
  primaryHebelTyp: BoardHebelTyp | null
  hebelTypen: BoardHebelTyp[]
  // Aktivitäts-Zustand für die Badge-Pille neben dem Namen.
  badgeKey: BoardBadgeKey
}

// Primäre Handlung je Hebel-Typ: Metadaten-Hebel (Name/Beschreibung/Keywords)
// → „Board bearbeiten"; Aktivitäts- und Wirkungs-Hebel (eingeschlafen,
// wirkung_schwach) sowie reine Pin-Vorrat-Boards (null) → „Pins planen", da die
// Handlung eine neue Pin-Variante mit besserem Hook/Keyword ist.
function boardPrimaryAction(
  typ: BoardHebelTyp | null
): 'pins' | 'bearbeiten' {
  switch (typ) {
    case 'beschreibung_fehlt':
    case 'beschreibung_zu_duenn':
    case 'beschreibung_ohne_keyword':
    case 'name_ohne_keyword':
    case 'name_zu_lang':
      return 'bearbeiten'
    default:
      return 'pins'
  }
}

// Welche internen Buttons werden hervorgehoben? Enthält ein Board SOWOHL einen
// Aktivitäts-/Wirkungs-Hebel (→ Pins) ALS AUCH einen Bearbeitungs-Hebel, werden
// beide hervorgehoben ('beide'). Sonst nur der passende. Leere Liste (reine
// Pin-Vorrat-Boards) → 'pins'.
function boardHighlight(
  typen: BoardHebelTyp[]
): 'pins' | 'bearbeiten' | 'beide' {
  let hatPins = false
  let hatBearbeiten = false
  for (const t of typen) {
    if (boardPrimaryAction(t) === 'bearbeiten') hatBearbeiten = true
    else hatPins = true
  }
  if (hatPins && hatBearbeiten) return 'beide'
  if (hatBearbeiten) return 'bearbeiten'
  return 'pins'
}


type HandlungsCategory = {
  diagnose: PinDiagnose
  label: string
  subtitle: string
  tooltip: string
  // counterBg: aktuell ungenutzt (Count-Badge ist hartkodiert) — bleibt für den
  // separaten Count-Badge-Schritt erhalten.
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
    label: 'Aktiver Top Performer',
    subtitle:
      'Diese Pins laufen stark – produziere Varianten solange der Algorithmus pusht.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.aktiver_top_performer,
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
    label: 'Hidden Gem',
    subtitle:
      'Hohe Klickrate, aber wenig Reichweite — das Cover überzeugt, nur findet Pinterest den Pin kaum. Die Keywords sind der Hebel.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.hidden_gem,
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
    label: 'Reichweite ohne Wirkung',
    subtitle:
      'Pinterest spielt diesen Pin gut aus – aber zu wenige Menschen klicken durch.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.reichweite_ohne_wirkung,
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
    label: 'Save-Magnet',
    subtitle:
      'Wird oft gespeichert, aber selten geklickt – das Cover zieht, der Klick fehlt.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.save_magnet,
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
    label: 'Eingeschlafener Gewinner',
    subtitle:
      'Pins, die früher stark liefen — Pinterest spielt sie kaum noch aus. Zeit für einen frischen Pin.',
    tooltip: PIN_DIAGNOSE_TOOLTIP.eingeschlafener_gewinner,
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
        'id, event_name, event_datum, event_datum_ende, saison_typ, suchbeginn_tage, notizen, datum_variabel, created_at'
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
          'id, status, created_at, geplante_veroeffentlichung, board_id, content_id, ziel_url_id, strategie_typ, conversion_ziel, pin_format, saison_event_id'
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

  // Feste Pinterest-Methodik (siehe PIPELINE_THRESHOLDS oben), keine DB-Quelle.
  const pipelineThresholds: PipelineThresholds = PIPELINE_THRESHOLDS

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
    // Stichtag-Events fallen ab event_datum raus (wie bisher); Zeitraum-Events
    // (mit event_datum_ende) bleiben bis zum Zeitraum-Ende sichtbar.
    const abschluss = event.event_datum_ende ?? event.event_datum
    if (today >= abschluss) continue

    const statusInfo = computeStatus(
      event.event_datum,
      event.event_datum_ende,
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
      saison_typ: event.saison_typ,
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
        // Zeitraum-Events: kein „bis Event"-Countdown (Start ist schon vorbei),
        // sondern Hinweis bis zum Zeitraum-Ende. Stichtage behalten den Countdown.
        countdownLabelOverride: event.event_datum_ende
          ? `läuft noch bis ${formatDateDe(event.event_datum_ende)}`
          : undefined,
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

  // Sortierung pro Spalte: erst nach Typ-Priorität (einzelne Events vor freien
  // Saisons vor Jahreszeiten), dann innerhalb gleicher Stufe nach frühestem
  // Pin-Start aufsteigend (das Event, das zuerst gepinnt werden muss, oben),
  // bei gleichem Pin-Start als stabile dritte Stufe nach event_datum. So steht
  // das dringlichste Event als sichtbare Karte oben, der Rest (auch im Toggle)
  // entsprechend gewichtet. evergreen kommt hier nicht vor.
  const SAISON_PRIO: Record<SaisonTyp, number> = {
    feiertag: 1,
    shopping_event: 1,
    anlass: 2,
    saison: 2,
    jahreszeit: 3,
    evergreen: 4,
  }
  const byPrioThenPinStart = (a: KanbanEvent, b: KanbanEvent) => {
    const p = SAISON_PRIO[a.saison_typ] - SAISON_PRIO[b.saison_typ]
    if (p !== 0) return p
    const ps = a.pinStart.localeCompare(b.pinStart)
    if (ps !== 0) return ps
    return a.event_datum.localeCompare(b.event_datum)
  }
  saisonKanban.jetztProduzieren.sort(byPrioThenPinStart)
  saisonKanban.jetztPinnen.sort(byPrioThenPinStart)
  saisonKanban.hochphase.sort(byPrioThenPinStart)
  saisonKanban.nochZeit.sort(byPrioThenPinStart)

  // ===== Performance-Verlauf (rollierende 12 Monate, ASC für Chart) =====
  const chartPoints: ChartPoint[] = profilRows
    .slice(0, 12)
    .map((r) => ({
      datum: r.datum,
      impressionen: r.impressionen,
      ausgehende_klicks: r.ausgehende_klicks,
      saves: r.saves,
      saveRate:
        r.impressionen > 0 ? (r.saves / r.impressionen) * 100 : null,
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
    saison_event_id: string | null
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

  // Entwurf/Geplant-Pins pro Saison-Event zählen — dieselbe Quelle und Logik
  // wie preparedPinsByBoard, nur gruppiert auf saison_event_id statt board_id.
  // Speist in Häppchen 3 die Hinweis-Box je Saison-Karte. Pins ohne Saison-Tag
  // (saison_event_id null) gehören zu keinem Event und werden übergangen.
  const pinsBySaisonEvent = new Map<
    string,
    { entwurf: number; geplant: number }
  >()
  for (const p of allPinsRows) {
    if (!p.saison_event_id) continue
    if (p.status !== 'entwurf' && p.status !== 'geplant') continue
    const cur = pinsBySaisonEvent.get(p.saison_event_id) ?? {
      entwurf: 0,
      geplant: 0,
    }
    if (p.status === 'entwurf') cur.entwurf++
    else cur.geplant++
    pinsBySaisonEvent.set(p.saison_event_id, cur)
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
  //   - Cat 2: avg CTR über eigenem Median (×1,2) bzw. Fallback minCtrGoldnugget
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

  // „Wenig Pins" zählt nur als Handlungsbedarf, wenn der Inhalt noch GAR keinen
  // Pin hat (letzterPinTage === null) ODER der letzte Pin älter als die
  // Stale-Grenze ist. Gesund wachsende Inhalte (wenige, aber frische Pins)
  // fallen heraus.
  const fewPinsInhalte = pipelineInhalte.filter(
    (c) =>
      c.pinCount < pipelineThresholds.minPinsGesamt &&
      (c.letzterPinTage === null ||
        c.letzterPinTage > pipelineThresholds.tageOhnePin)
  )
  // „Ohne aktuellen Pin": genug Pins, aber lange Pause.
  const staleInhalte = pipelineInhalte.filter(
    (c) =>
      c.pinCount >= pipelineThresholds.minPinsOhneAktuell &&
      c.letzterPinTage !== null &&
      c.letzterPinTage > pipelineThresholds.tageOhnePin
  )
  // Eine Liste, kind je Inhalt erhalten. Dringlichkeits-Sortierung:
  // 1. Inhalte ganz ohne Pin (größter Hebel), 2. längste Pause zuerst.
  const inhaltePinBedarf: PinPipelineInhaltMitGrund[] = [
    ...fewPinsInhalte.map((c) => ({ ...c, kind: 'few_pins' as const })),
    ...staleInhalte.map((c) => ({ ...c, kind: 'stale' as const })),
  ].sort((a, b) => {
    const aOhnePin = a.letzterPinTage === null
    const bOhnePin = b.letzterPinTage === null
    if (aOhnePin !== bOhnePin) return aOhnePin ? -1 : 1
    return (b.letzterPinTage ?? 0) - (a.letzterPinTage ?? 0)
  })

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
  // Goldnugget-CTR-Schwelle: primär 20 % über dem eigenen Median (sobald eine
  // valide Benchmark vorliegt, d.h. >= 10 qualifizierte Pins → medianCtr nicht
  // null). Sonst der feste Richtwert, damit die Card auch für kleine Konten
  // funktioniert.
  const goldnuggetCtrSchwelle =
    benchmark?.medianCtr != null
      ? benchmark.medianCtr * GOLDNUGGET_CTR_BOOST
      : pipelineThresholds.minCtrGoldnugget
  const urlPotenzial: UrlPotenzialRow[] = []
  byBasis.forEach((g, basisUrl) => {
    const ctr = g.impressionen > 0 ? (g.klicks / g.impressionen) * 100 : 0
    // Allein die CTR entscheidet: keine feste Pins-pro-URL-Grenze mehr. Eine
    // erfolgreiche URL verdient weitere Pins, unabhängig von der Anzahl; fällt
    // ihre CTR auf den Schnitt zurück, verschwindet sie von selbst.
    if (ctr <= goldnuggetCtrSchwelle) {
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
      // Relativer Bezug zum eigenen Median, nur wenn dieser vorliegt; sonst
      // wurde gegen den festen Richtwert gemessen → kein „über deinem Schnitt".
      ctrUeberMedianPct:
        benchmark?.medianCtr != null
          ? Math.round((ctr / benchmark.medianCtr - 1) * 100)
          : null,
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

  // ===== Briefing: "Deine nächsten Schritte" =====
  // saisonMinDaysToPinStart wird für den Setup-Fall (BriefingBlockEmpty)
  // gebraucht; im Analytics-Fall speist es den Next-Steps-Event-Hinweis.
  const saisonMinDaysToPinStart =
    saisonKanban.jetztProduzieren.length > 0
      ? saisonKanban.jetztProduzieren.reduce(
          (min, e) => Math.min(min, e.countdownDays),
          Number.POSITIVE_INFINITY
        )
      : null

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
  const nextStepsItems = buildNextStepsItems({
    nextEvent: nextStepEvent,
    topPerformerPin: nextStepTopPerformer,
    hiddenGemCount: groupedActions.get('hidden_gem')?.length ?? 0,
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
  // Aktivitäts-Zustand je Board für die Badge-Pille (unterscheidet eingeschlafen
  // vs. nie_gestartet über hatteFruehereReichweite).
  const boardBadgeKeyById = new Map<string, BoardBadgeKey>()
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
    boardBadgeKeyById.set(b.id, boardBadgeKey(aktivitaet, hatteFruehereReichweite))
  }

  // Account-weite Hinweise (Anzahl Boards + Reichweiten-Verteilung).
  const accountHinweise = boardAccountHinweise({
    boardsTotal: boardsRows.length,
    impressionenProBoard: boardsRows.map(
      (b) => latestBaByBoard.get(b.id)?.impressionen ?? 0
    ),
  })

  // Priorisierung board-basiert: EIN Eintrag je Board mit ALLEN seinen Hebeln
  // (nach Dringlichkeit sortiert), Boards nach höchster Dringlichkeit. Die drei
  // dringendsten Boards werden Top-Karten, der Rest landet im Toggle. So kann
  // kein Board doppelt erscheinen. Die Bündel-Schwelle entscheidet nur noch über
  // die ausführliche Einleitung (ab COACHING_BUENDEL_AB Hebeln).
  const COACHING_BUENDEL_AB = 3
  const pinterestUrlByBoard = new Map<string, string | null>()
  for (const b of boardsRows) {
    pinterestUrlByBoard.set(b.id, b.pinterest_url ?? null)
  }
  const leerePrepared = { entwurf: 0, geplant: 0 }
  const maxDringlichkeit = (hs: BoardHebel[]) =>
    hs.reduce((m, h) => Math.max(m, h.dringlichkeit), 0)
  const nachDringlichkeit = (a: BoardHebel, b: BoardHebel) =>
    b.dringlichkeit - a.dringlichkeit || a.boardName.localeCompare(b.boardName)

  const boardEintraege = Array.from(hebelByBoard.entries())
    .map(([boardId, hs]) => ({ boardId, hebel: [...hs].sort(nachDringlichkeit) }))
    .sort(
      (a, b) =>
        maxDringlichkeit(b.hebel) - maxDringlichkeit(a.hebel) ||
        b.hebel.length - a.hebel.length ||
        a.hebel[0].boardName.localeCompare(b.hebel[0].boardName)
    )

  const topKarten: CoachingKarte[] = boardEintraege.slice(0, 3).map((e) => {
    const istBuendel = e.hebel.length >= COACHING_BUENDEL_AB
    return {
      kind: istBuendel ? 'buendel' : 'einzel',
      boardId: e.boardId,
      boardName: e.hebel[0].boardName,
      pinterestUrl: pinterestUrlByBoard.get(e.boardId) ?? null,
      hebelTexte: e.hebel.map((h) => BOARD_HEBEL_TEXT[h.typ]),
      buendelPunkte: istBuendel
        ? e.hebel.map((h) => BOARD_HEBEL_BUENDEL_PUNKT[h.typ])
        : undefined,
      prepared: preparedPinsByBoard.get(e.boardId) ?? leerePrepared,
      primaryHebelTyp: e.hebel[0].typ,
      hebelTypen: e.hebel.map((h) => h.typ),
      badgeKey: boardBadgeKeyById.get(e.boardId) ?? 'nie_gestartet',
    }
  })

  // Toggle „Alle weiteren Hinweise": Boards jenseits der Top 3 (mit allen ihren
  // Hebeln), danach Boards ganz ohne Hebel, die nur vorbereitete Pins haben.
  const hatPreparedPins = (boardId: string) => {
    const p = preparedPinsByBoard.get(boardId)
    return !!p && (p.entwurf > 0 || p.geplant > 0)
  }
  const restBoards: CoachingRestBoard[] = boardEintraege.slice(3).map((e) => ({
    boardId: e.boardId,
    boardName: e.hebel[0].boardName,
    pinterestUrl: pinterestUrlByBoard.get(e.boardId) ?? null,
    hebelTexte: e.hebel.map((h) => BOARD_HEBEL_TEXT[h.typ]),
    prepared: preparedPinsByBoard.get(e.boardId) ?? leerePrepared,
    primaryHebelTyp: e.hebel[0].typ,
    hebelTypen: e.hebel.map((h) => h.typ),
    badgeKey: boardBadgeKeyById.get(e.boardId) ?? 'nie_gestartet',
  }))
  const boardsMitHebel = new Set(boardEintraege.map((e) => e.boardId))
  for (const b of boardsRows) {
    if (boardsMitHebel.has(b.id) || !hatPreparedPins(b.id)) continue
    restBoards.push({
      boardId: b.id,
      boardName: b.name,
      pinterestUrl: b.pinterest_url ?? null,
      hebelTexte: [],
      prepared: preparedPinsByBoard.get(b.id) ?? leerePrepared,
      primaryHebelTyp: null,
      hebelTypen: [],
      badgeKey: boardBadgeKeyById.get(b.id) ?? 'nie_gestartet',
    })
  }

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
    // Seitenhintergrund = Rolle bg-seite (hellste Blaugrau-Stufe
    // marke-blaugrau-xhell #EEF1F3), Haupt-Textfarbe = text-haupt (Marke Tanne).
    <div className="space-y-8 bg-seite p-8 text-haupt">
      {showOnboardingBanner && <OnboardingBanner />}

      {/* Header-Fläche = Marke Blaugrau. Kleines Orientierungs-Label oben,
          darunter die Begrüßung als H1. Rechte Hälfte bewusst Weißraum. */}
      <header className="relative overflow-hidden rounded-lg bg-marke-blaugrau px-6 py-4">
        {/* CAMEL-AKZENT (dezent, leicht rücknehmbar): weicher radialer Ocker-
            Schimmer rechts oben, niedrige Deckkraft (~22 %). Belebt die rechte
            Hälfte, ohne laut zu sein. Zum Zurücknehmen: dieses <span> entfernen;
            Stärke justierbar über die Prozentzahl im color-mix. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3"
          style={{
            background:
              'radial-gradient(70% 120% at 90% 20%, color-mix(in srgb, var(--marke-ocker) 22%, transparent), transparent 65%)',
          }}
        />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            {greetingName ? (
              <>
                Willkommen zurück,{' '}
                <span className="text-marke-ocker">{greetingName}</span>
              </>
            ) : (
              'Willkommen zurück'
            )}
          </h1>
        </div>
      </header>

      {/* Einleitung: warum dieses Cockpit zahlenbasiert ist. Ruhiger,
          gedämpfter Ton, etwas schmaler gesetzt für gute Lesbarkeit. */}
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        <p>
          Wer nach Gefühl optimiert, kümmert sich meist um das, was sich am
          lautesten anfühlt,{' '}
          <strong>nicht um das, was den größten Effekt hätte</strong>. Zahlen
          drehen das um: Sie zeigen, wo du wirklich stehst, und erst daraus
          werden Prioritäten.
        </p>
        <p>
          Dieses Cockpit nimmt dir nicht ab, alle Zahlen zu kennen. Es zeigt dir{' '}
          <strong>die wenigen, die zählen</strong>, und was sie für deinen
          nächsten Schritt bedeuten: Welche Pins bringen Menschen auf deine
          Seite? Wo lohnt sich dein Einsatz, wo nicht?
        </p>
        <p>
          Auf dieser Basis entscheidest du, welche Pins als Nächstes{' '}
          <strong>wirklich lohnen</strong>, und wirst Monat für Monat{' '}
          <strong>treffsicherer</strong>.
        </p>
      </div>

      {/* 1. Hero-Section: schmaler Analytics-Status-Banner */}
      <HeroSection
        status={updateStatusMonat}
        analyticsUpdateDatum={settingsRes.data?.analytics_update_datum ?? null}
      />

      {/* 3. Phasen-Trenner */}
      <PhasenTrenner title="Wo stehst du?" />

      {/* 4. Profil-Performance: ein zusammenhängender Block — Richtungs-Ampel
            (oben, in der Sektion), darunter KPI-Kacheln + Verlauf. Die früher
            getrennten Blöcke „Profil-Status" und „Gesamt-Profil-Performance"
            sind hier vereint. Ohne Analytics: Leer-Variante.
            Die Befunde sind nach unten zu „Pins recyceln" gewandert. */}
      <ProfilPerformanceSection
        latest={latest}
        previous={previous}
        chartPoints={chartPoints}
      />

      {/* 4b. „Was hat funktioniert?" (Erfolge der letzten 30 Tage) — schließt
            den Profil-Performance-Block emotional ab. Rendert nur bei echten
            Erfolgen (sonst null — kein Leer-State). */}
      <WinsBlock
        latest={latest}
        previous={previous}
        nicheProfile={nicheProfile}
        maxPinImpressionen={maxPinImpressionen}
      />

      {/* Profil-Befunde (Account-Diagnosen) — Status-Block direkt nach den
            Erfolgen, eigene Überschrift hier (die Liste selbst ist
            überschriftslos). Nur mit Analytics sinnvoll. */}
      {hatAnalytics && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-marke-blaugrau">
              Was dein Profil dir zeigt
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Automatisch erkannte Muster in deinen Zahlen, mit dem nächsten
              konkreten Schritt.
            </p>
          </div>
          <div className="mt-3">
            <BefundeListe diagnoses={coachingDiagnoses} />
          </div>
        </section>
      )}

      {/* Briefing-Block: Deine Prioritäten + nächste Schritte. Bewusst NACH
            dem Wo-stehst-du-Überblick — erst der Stand, dann die Prioritäten.
            Ohne Analytics setup-orientierte statt analytics-basierte Items. */}
      {hatAnalytics ? (
        <BriefingBlock nextStepsItems={nextStepsItems} />
      ) : (
        <BriefingBlockEmpty
          contentCount={contentInhalteRows.length}
          pinsCount={allPinsRows.length}
          saisonProduzierenCount={saisonKanban.jetztProduzieren.length}
          saisonMinDaysToPinStart={saisonMinDaysToPinStart}
        />
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

      {/* Zielgruppe-Coaching, aus der Profil-Performance herausgelöst. Eigener
          Block (Überschrift „Deine Zielgruppe" liegt in der Komponente);
          rendert null, wenn keine Snapshots/kein Coaching-Text vorliegen. */}
      <ZielgruppeCoachingBlock
        snapshots={audienceSnapshots}
        nicheProfile={nicheProfile}
        latest={latest}
        previous={previous}
      />

      {/* 6. Phasen-Trenner */}
      <PhasenTrenner title="Was pinnst du als Nächstes?" />

      {/* 7. Saisonkalender */}
      <SaisonKalenderSection
        columns={saisonKanban}
        pinsBySaisonEvent={pinsBySaisonEvent}
      />

      {/* 8. Content Pipeline */}
      <PinPipelineSection
        inhaltePinBedarf={inhaltePinBedarf}
        urlPotenzial={urlPotenzial}
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
    'ml-1 whitespace-nowrap font-medium text-link underline'
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Deine nächsten Schritte
          </h3>
          <ul className="mt-2 space-y-1.5">
            <li className={itemCls} style={{ borderLeft: '3px solid var(--marke-ocker)' }}>
              Schließe dein Setup ab und setze dein Profil weiter auf.{' '}
              →
              <Link href="/dashboard/onboarding" className={linkCls}>
                Zum Onboarding
              </Link>
            </li>
            {showContentPrio && (
              <li
                className={itemCls}
                style={{ borderLeft: '3px solid var(--marke-ocker)' }}
              >
                Du hast{' '}
                <span className="font-semibold text-gray-900">
                  {contentCount}
                </span>{' '}
                {contentCount === 1 ? 'Inhalt' : 'Inhalte'} angelegt. Produziere
                jetzt erste Pins dazu.{' '}
                →
                <Link href="/dashboard/pin-produktion" className={linkCls}>
                  Neue Pins
                </Link>
              </li>
            )}
            {saisonProduzierenCount > 0 && (
              <li
                className={itemCls}
                style={{ borderLeft: '3px solid var(--marke-ocker)' }}
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
                Material – jetzt mit der Produktion starten.{' '}
                →
                <a href="#saison-kalender" className={linkCls}>
                  Saisonkalender
                </a>
              </li>
            )}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
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

// Sektion 4 — „Strategie-Check" ohne festgelegte Strategie.
function StrategieCheckEmptyKeineStrategie() {
  return (
    <section id="strategie-check" className="scroll-mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          Strategie-Check
        </h2>
      </div>
      <DashEmptyBox>
        Du hast deine Strategie noch nicht festgelegt. Der Strategie-Check
        vergleicht deine tatsächliche Pin-Verteilung mit deinen Zielen. Dafür
        braucht er deine Strategie.{' '}
        →{' '}
        <Link
          href="/dashboard/strategie?tab=meine"
          className="font-medium text-link underline"
        >
          Strategie festlegen
        </Link>
      </DashEmptyBox>
    </section>
  )
}

// Sektion 8 — „Pins recyceln" ohne Analytics.
function HandlungsbedarfEmpty() {
  return (
    <section id="pin-handlungsbedarf" className="scroll-mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          Pins recyceln
        </h2>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <DashEmptyBox>
          Sobald du Pins angelegt und dein erstes Analytics-Update gemacht
          hast, zeigt dir Pin-Flow hier, welche Pins du recyceln, überarbeiten
          oder neu ausspielen solltest. Noch fehlen die Daten dafür.
        </DashEmptyBox>
      </div>
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
        →{' '}
        <Link
          href="/dashboard/boards"
          className="font-medium text-link underline"
        >
          Boards anlegen
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
          →{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-link underline"
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
  bgClass = 'bg-marke-kachel',
}: {
  label: string
  tooltip?: string
  children: React.ReactNode
  bgClass?: string
}) {
  return (
    <div className={`flex shrink-0 flex-col rounded-lg px-3 py-2 ${bgClass}`}>
      <h3 className="text-xs font-semibold tracking-wide text-slate-600">
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

function KpiCardEmpty({ label }: { label: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-marke-kachel p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-400">Noch keine Daten</p>
    </article>
  )
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
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-marke-blaugrau">
        Pins recyceln
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Basierend auf deinen Analytics: Welche Pins brauchen eine Reaktion?
      </p>
    </div>
  )

  // Merke-Hinweis bleibt Inhalt der Card (erste Zeile), nicht Teil der
  // Überschrift auf Creme.
  const merkHinweis = (
    <HinweisBox variant="merke">
      Erstelle immer einen neuen Pin, bearbeite nie den bei Pinterest
      veröffentlichten Pin. Hake den Pin ab, sobald die Handlung erfolgt ist.
    </HinweisBox>
  )

  if (!hasAnyAnalytics) {
    return (
      <section id="pin-handlungsbedarf" className="scroll-mt-4">
        {heading}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          {merkHinweis}
          <div className="mt-3">
            <HinweisBox variant="warnung" tone="achtung">
              Trage deine ersten Pin-Analytics ein, um Handlungsempfehlungen zu
              sehen.{' '}
              <Link
                href="/dashboard/analytics"
                className="font-medium underline hover:opacity-80"
              >
                → Zum Analytics-Tab
              </Link>
            </HinweisBox>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="pin-handlungsbedarf" className="scroll-mt-4">
      {heading}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        {merkHinweis}
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
            <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden">
                <span
                  className="text-2xl leading-none text-gray-400"
                  aria-hidden
                >
                  <span className="inline group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                </span>
                {/* Flacher Haken in Blaugrau statt gefülltem Kreis-Haken. */}
                <PinKategorieIcon
                  name="check"
                  className="h-6 w-6 shrink-0 text-marke-blaugrau"
                />
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
    <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Leere Kategorie (0 offene Pins): Zeile gedimmt, betroffene stechen hervor. */}
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden ${
          pins.length === 0 ? 'opacity-60' : ''
        }`}
      >
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        {/* Kategorie-Kennzeichen: einheitliches Linien-Icon in Blaugrau, ohne
            Kreis-Hintergrund. Unterscheidung allein über die Symbol-Form. */}
        <PinKategorieIcon
          name={cat.diagnose}
          className="h-6 w-6 shrink-0 text-marke-blaugrau"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip label={cat.label} tooltip={tooltip} />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{cat.subtitle}</p>
        </div>
        <AnzahlBadge count={pins.length} />
      </summary>

      {pins.length === 0 ? (
        <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-sekundaer">
          Aktuell fällt keiner deiner Pins in diese Kategorie.
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
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-link underline">
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
// Kopfband ist neutral; die Dringlichkeit trägt allein der StatusDot je Spalte
// (tone), die Logik welche Events in welche Spalte fallen liegt in computeStatus.
// href wird per Event in SaisonCard gebaut (`?open=new&saison_event_id=<id>`),
// damit das Pin-Produktion-Formular automatisch mit dem Event-Tag öffnet.
type SaisonAction = { label: string }

function formatCountdown(prefix: string, days: number): string {
  const rest = days <= 0 ? 'heute' : days === 1 ? 'in 1 Tag' : `in ${days} Tagen`
  // Mit Präfix vorangestellt (z. B. „Pin-Start in 3 Tagen"); ohne Präfix
  // (Event-Spalten) steht der Text allein, daher Satzanfang groß.
  return prefix ? `${prefix} ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1)
}

function buildSuchstartTooltip(event: KanbanEvent): string {
  // Suchstart-Datum entspricht statusInfo.pinEnd (= event_datum - suchbeginn_tage).
  return (
    `Der Suchbeginn für ${event.event_name} liegt bei ` +
    `${event.suchbeginnTage} Tagen vor dem Termin. ` +
    `Ab ${formatDateDe(event.pinEnd)} suchen Pinterest-Nutzer:innen aktiv ` +
    `nach diesem Thema. Der individuelle Suchstart wird in der ` +
    `Saison-Kalender-Datenbank pro Termin hinterlegt.`
  )
}

function SaisonKalenderSection({
  columns,
  pinsBySaisonEvent,
}: {
  columns: SaisonKanbanColumns
  // Entwurf/Geplant-Pin-Bestand je Saison-Event (aus page.tsx-Aggregation).
  pinsBySaisonEvent: Map<string, { entwurf: number; geplant: number }>
}) {
  return (
    <section id="saison-kalender" className="scroll-mt-4">
      <div className="mb-4">
        <h2 className="flex items-center text-xl font-semibold text-marke-blaugrau">
          Saisonkalender
          <InfoTooltip text="Pinterest-Nutzer:innen suchen 6–12 Wochen vor dem Termin. Wer zu spät pinnt, verpasst die Welle. Der Saisonkalender zeigt dir auf einen Blick in welcher Phase jeder Termin gerade ist." />
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Saisonale Themen brauchen 6 bis 12 Wochen Vorlauf.{' '}
          <strong>Wer zu spät pinnt, verpasst die Welle.</strong> Hier siehst du,
          was wann zu tun ist.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaisonColumn
          icon="pen"
          tone="achtung"
          title="Jetzt produzieren"
          subtitle="Material vorbereiten – Pin-Start naht"
          events={columns.jetztProduzieren}
          pinsBySaisonEvent={pinsBySaisonEvent}
          countdownPrefix="Pin-Start"
          actionButton={{ label: 'Pins erstellen' }}
          emptyText="Gerade nichts in dieser Phase."
          zeigeWeitereNamen
        />
        <SaisonColumn
          icon="pin"
          tone="gut"
          title="Jetzt pinnen"
          subtitle="Pin-Fenster offen – aktiv veröffentlichen"
          events={columns.jetztPinnen}
          pinsBySaisonEvent={pinsBySaisonEvent}
          countdownPrefix=""
          emptyText="Gerade nichts in dieser Phase."
          zeigeWeitereNamen
        />
        <SaisonColumn
          icon="flame"
          tone="schlecht"
          title="Hochphase"
          subtitle="Nicht mehr neu pinnen – veröffentlichte Pins beobachten"
          events={columns.hochphase}
          pinsBySaisonEvent={pinsBySaisonEvent}
          countdownPrefix=""
          emptyText="Gerade nichts in der Hochphase."
          zeigeWeitereNamen
        />
        <SaisonColumn
          icon="hourglass"
          tone="neutral"
          title="Noch Zeit"
          subtitle="Vormerken & Ideen sammeln – Produktion startet später"
          events={columns.nochZeit}
          pinsBySaisonEvent={pinsBySaisonEvent}
          countdownPrefix="Produktionsstart"
          actionButton={{ label: 'Pin-Idee speichern' }}
          emptyText="Nichts weiter vorgemerkt."
        />
      </div>

      <p className="mt-1 text-[13px]">
        <span aria-hidden>→ </span>
        <Link
          href="/dashboard/saison-kalender"
          className="text-link underline hover:opacity-80"
        >
          Saisons und Feiertage in der Datenbank verwalten
        </Link>
      </p>
      <p className="mt-1 text-[13px]">
        <span aria-hidden>→ </span>
        <Link
          href="/dashboard/strategie?tab=grundlagen&accordion=saisonalitaet"
          className="text-link underline hover:opacity-80"
        >
          Mehr zur Saisonalität & Pinterest-Timing
        </Link>
      </p>
    </section>
  )
}

function SaisonColumn({
  icon,
  tone,
  title,
  subtitle,
  events,
  pinsBySaisonEvent,
  countdownPrefix,
  actionButton,
  emptyText,
  zeigeWeitereNamen = false,
}: {
  icon: string
  tone: StatusTone
  title: string
  subtitle: string
  events: KanbanEvent[]
  pinsBySaisonEvent: Map<string, { entwurf: number; geplant: number }>
  countdownPrefix: string
  actionButton?: SaisonAction
  emptyText: string
  // true → Toggle-Auslöser listet die Namen der weiteren Events auf;
  // false (z. B. „Noch Zeit") → nur die nackte Zahl „X weitere".
  zeigeWeitereNamen?: boolean
}) {
  const visible = events.slice(0, 1)
  const hidden = events.slice(1)

  return (
    <div className="flex flex-col rounded-lg border border-karte-rand bg-white shadow-sm">
      {/* Kopfband im dunklen Marken-Blaugrau (wie der Header); Icon + Titel hell
          (weiß). Der StatusDot sitzt an der Event-Karte (am Pin-Fenster). */}
      <div className="rounded-t-lg bg-marke-blaugrau px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <PinKategorieIcon
            name={icon}
            className="h-5 w-5 shrink-0 text-white"
          />
          <span>{title}</span>
        </h3>
        <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {events.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-marke-kachel px-3 py-4 text-center text-xs text-gray-500">
            {emptyText}
          </p>
        ) : (
          <>
            {visible.map((e) => (
              <SaisonCard
                key={e.id}
                event={e}
                tone={tone}
                countdownLabel={
                  e.countdownLabelOverride ??
                  formatCountdown(countdownPrefix, e.countdownDays)
                }
                countdownClassName="text-sekundaer"
                actionButton={actionButton}
                prepared={pinsBySaisonEvent.get(e.id) ?? null}
              />
            ))}
            {hidden.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="inline text-xs font-medium text-link underline underline-offset-2 group-open:hidden">
                    {/* Toggle-Beschriftung in Link-Blaugrau (Pfeil + Namen). */}
                    ▸{' '}
                    {zeigeWeitereNamen
                      ? hidden.map((e) => e.event_name).join(', ')
                      : `${hidden.length} ${
                          hidden.length === 1 ? 'weiteres' : 'weitere'
                        }`}
                  </span>
                  <span className="hidden text-xs font-medium text-link underline underline-offset-2 group-open:inline">
                    ▾ Weniger anzeigen
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {hidden.map((e) => (
                    <SaisonCard
                      key={e.id}
                      event={e}
                      tone={tone}
                      countdownLabel={
                        e.countdownLabelOverride ??
                        formatCountdown(countdownPrefix, e.countdownDays)
                      }
                      countdownClassName="text-sekundaer"
                      actionButton={actionButton}
                      prepared={pinsBySaisonEvent.get(e.id) ?? null}
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
  tone,
  countdownLabel,
  countdownClassName,
  actionButton,
  prepared,
}: {
  event: KanbanEvent
  tone: StatusTone
  countdownLabel: string
  countdownClassName: string
  actionButton?: SaisonAction
  // Entwurf/Geplant-Pin-Bestand zu diesem Event; null = keine getaggten Pins.
  prepared: { entwurf: number; geplant: number } | null
}) {
  // „Heute" ist der dringlichste Fall → hervorgehoben; normale Tageszahlen und
  // der „läuft noch bis …"-Text bleiben dezent.
  const istHeute = countdownLabel === 'Heute'
  // Vorbereitete Pins nur bei Bestand (narrowt prepared auf non-null).
  const preparedActive =
    prepared && (prepared.entwurf > 0 || prepared.geplant > 0)
      ? prepared
      : null
  return (
    <div className="flex min-h-[170px] flex-col justify-between rounded-md border border-karte-rand bg-white p-3 shadow-sm">
      <div>
        <div className="flex items-center text-sm font-semibold text-gray-900">
          <span>{event.event_name}</span>
          <InfoTooltip text={buildSuchstartTooltip(event)} />
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {formatDateDe(event.event_datum)}
        </div>
        {/* StatusDot (Ampel) direkt vor der Pin-Fenster-Zeile: er bezieht sich
            auf das Pin-Fenster genau dieses Events. */}
        <div className="mt-2 flex items-center gap-1.5 border-t border-gray-100 pt-2 text-xs text-gray-600">
          <StatusDot tone={tone} />
          <span>
            Pin-Fenster: {formatDateDe(event.pinStart)} –{' '}
            {formatDateDe(event.pinEnd)}
          </span>
        </div>
        <div
          className={`mt-2 text-xs ${
            istHeute ? 'font-semibold text-haupt' : `font-medium ${countdownClassName}`
          }`}
        >
          {countdownLabel}
        </div>
      </div>
      {/* Bodenbündiger Aktionsblock mit EINER gemeinsamen Sichtkante (border-t):
          Button oben, Entwurf-Hinweis darunter. Bei „nichts" hält ein
          unsichtbarer Platzhalter (transparente Kante) dieselbe Höhe, damit die
          Linie über die Karten auf einer Höhe sitzt. */}
      {actionButton || preparedActive ? (
        <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2">
          {actionButton && (
            <Link
              href={`/dashboard/pin-produktion?open=new&saison_event_id=${event.id}`}
              className="inline-flex items-center justify-center self-start rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
            >
              {actionButton.label}
            </Link>
          )}
          {preparedActive && (
            <PreparedPinsHinweis
              basis={`/dashboard/pin-produktion?filter[saison_event]=${event.id}`}
              prepared={preparedActive}
              flush
            />
          )}
        </div>
      ) : (
        <div aria-hidden className="mt-2 border-t border-transparent pt-2">
          <span className="invisible inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium">
            &nbsp;
          </span>
        </div>
      )}
    </div>
  )
}

// Einheitliche Hinweis-Zeile „vorbereitete Pins" (Entwurf/geplant) für Board-
// und Saison-Karten: feiner Trenner + Linien-pin-Icon in Blaugrau + ruhiger
// Text + Camel-Links. `basis` ist der Pin-Produktion-Link ohne Status, also
// …?filter[board]=X bzw. …?filter[saison_event]=Y; der Status wird angehängt.
// Kein Emoji, kein kräftiges Grün. Rendert nur bei Bestand > 0.
function PreparedPinsHinweis({
  basis,
  prepared,
  flush = false,
}: {
  basis: string
  prepared: { entwurf: number; geplant: number }
  // flush = ohne eigene Trennlinie/Top-Abstand, wenn der Eltern-Block die
  // gemeinsame Sichtkante stellt (Saison-Karte). Default: eigene Trennlinie
  // (Board-Karten via PreparedPinsBox).
  flush?: boolean
}) {
  const { entwurf, geplant } = prepared
  if (entwurf === 0 && geplant === 0) return null
  const linkCls = 'text-link underline underline-offset-2 hover:opacity-80'
  return (
    <div
      className={`flex items-start gap-1.5 text-xs text-gray-600${
        flush ? '' : ' mt-2 border-t border-gray-100 pt-2'
      }`}
    >
      <PinKategorieIcon
        name="pin"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-marke-blaugrau"
      />
      <div className="space-y-0.5">
        {entwurf > 0 && (
          <p>
            {entwurf} {entwurf === 1 ? 'Pin' : 'Pins'} als Entwurf gespeichert.{' '}
            <Link
              href={`${basis}&filter[status]=entwurf`}
              className={linkCls}
            >
              Einplanen und veröffentlichen
            </Link>
          </p>
        )}
        {geplant > 0 && (
          <p>
            {geplant} {geplant === 1 ? 'Pin' : 'Pins'} bereits eingeplant.{' '}
            <Link
              href={`${basis}&filter[status]=geplant`}
              className={linkCls}
            >
              Veröffentlichung vorziehen
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

// ===========================================================
// Pin-Pipeline (Inhalte mit Pin-Bedarf + URLs mit Potenzial)
// ===========================================================
function PinPipelineSection({
  inhaltePinBedarf,
  urlPotenzial,
}: {
  inhaltePinBedarf: PinPipelineInhaltMitGrund[]
  urlPotenzial: UrlPotenzialRow[]
}) {
  const cat1Count = inhaltePinBedarf.length
  return (
    <section id="content-pipeline" className="scroll-mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          <LabelWithTooltip
            label="Wo neue Pins jetzt zählen"
            tooltip="Diese Sektion zeigt zwei Quellen: bestehende Inhalte, die mehr Pins brauchen oder veraltete Pins haben, plus URLs mit hoher CTR aber wenig Pins (Goldnugget-Logik)."
          />
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Basierend auf deinen{' '}
          <span className="font-semibold">Inhalten</span> und{' '}
          <span className="font-semibold">URLs</span>: Was braucht frisches
          Pin-Material?
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <PinPipelineInhalteCard
            items={inhaltePinBedarf}
            totalCount={cat1Count}
          />
          <PinPipelineUrlsCard urls={urlPotenzial} />
        </div>
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

// Klassifizierung ohne Wertung (kein Typ ist „besser") → alle drei identisch
// in dezenter Blaugrau-Tönung; der Unterschied steht allein im Wort.
const KEYWORD_TYP_BADGE: Record<KeywordSeoTyp, string> = {
  haupt: 'bg-marke-blaugrau-hell text-marke-blaugrau',
  mid_tail: 'bg-marke-blaugrau-hell text-marke-blaugrau',
  longtail: 'bg-marke-blaugrau-hell text-marke-blaugrau',
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
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-marke-blaugrau">
        Keyword-Einsatz
      </h2>
    </div>
  )

  if (!hasAnyKeywords) {
    return (
      <section id="keywords-seo" className="scroll-mt-4">
        {heading}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <DashEmptyBox>
          →{' '}
          <Link
            href="/dashboard/keywords"
            className="font-medium text-link underline"
          >
            Zuerst Keywords in der Keyword-Datenbank anlegen
          </Link>
          .
        </DashEmptyBox>
        </div>
      </section>
    )
  }

  return (
    <section id="keywords-seo" className="scroll-mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          Keyword-Einsatz
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Hol mehr aus deiner Keyword-Datenbank heraus.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <KeywordsSeoCard
            title="Ungenutzte Keywords"
            subtitle="Diese Keywords stecken noch in keinem Pin."
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
            className="font-medium text-link underline"
          >
            Zur Keyword-Datenbank
          </Link>
        </p>
      </div>
    </section>
  )
}

function KeywordsSeoCard({
  title,
  subtitle,
  entries,
  emptyText,
  renderEntry,
}: {
  title: string
  subtitle: string
  entries: KeywordSeoEntry[]
  emptyText: string
  renderEntry: (kw: KeywordSeoEntry) => JSX.Element
}) {
  const visible = entries.slice(0, 3)
  const hidden = entries.slice(3)
  return (
    <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Leere Kategorie (0 ungenutzte Keywords): Zeile gedimmt. */}
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden ${
          entries.length === 0 ? 'opacity-60' : ''
        }`}
      >
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        {/* Kopf-Icon im einheitlichen Linien-Stil (Blaugrau, kein Kreis). */}
        <PinKategorieIcon
          name="tag"
          className="h-6 w-6 shrink-0 text-marke-blaugrau"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>
        </div>
        <AnzahlBadge count={entries.length} variant="ruhig" />
      </summary>

      <div className="border-t border-gray-200 px-4 py-2">
        {entries.length === 0 ? (
          <p className="px-1 py-3 text-sm text-gray-500">{emptyText}</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {visible.map((kw) => renderEntry(kw))}
            </ul>
            {hidden.length > 0 && (
              // Rest hinter nativem Toggle (Server-Komponente → kein useState);
              // Camel-Link-Stil + ▸/▾ wie im Saisonkalender. Eigener benannter
              // group/more-Scope, damit er nicht mit dem äußeren Card-group kollidiert.
              <details className="group/more">
                <summary className="cursor-pointer list-none px-1 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="text-xs font-medium text-link underline underline-offset-2 group-open/more:hidden">
                    ▸ {hidden.length} weitere anzeigen
                  </span>
                  <span className="hidden text-xs font-medium text-link underline underline-offset-2 group-open/more:inline">
                    ▾ Weniger anzeigen
                  </span>
                </summary>
                <ul className="divide-y divide-gray-100">
                  {hidden.map((kw) => renderEntry(kw))}
                </ul>
              </details>
            )}
          </>
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
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          Pin erstellen
        </Link>
      </div>
    </li>
  )
}

function PinPipelineInhalteCard({
  items,
  totalCount,
}: {
  items: PinPipelineInhaltMitGrund[]
  totalCount: number
}) {
  const visibleLimit = 3
  const visible = items.slice(0, visibleLimit)
  const remaining = items.length - visible.length
  return (
    <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Leere Kategorie (totalCount 0): Zeile gedimmt, damit betroffene
          Kategorien hervorstechen. */}
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden ${
          totalCount === 0 ? 'opacity-60' : ''
        }`}
      >
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        {/* Einheitliches Linien-Icon (Blaugrau, kein Kreis) wie in Pins recyceln. */}
        <PinKategorieIcon
          name="inhalt"
          className="h-6 w-6 shrink-0 text-marke-blaugrau"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip
              label="Inhalte mit Pin-Bedarf"
              tooltip="Pinterest belohnt kontinuierliche Pin-Produktion pro Inhalt. Pro Inhalt sollten alle 3-4 Wochen neue Pin-Varianten erscheinen."
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            Jedes Thema aus deiner{' '}
            <span className="font-semibold">Content-Datenbank</span> lebt von
            mehreren Pin-Varianten. Wo zu wenige oder zu alte Pins liegen, lohnt
            sich frisches Material zuerst.
          </p>
        </div>
        <AnzahlBadge count={totalCount} />
      </summary>

      <div className="border-t border-gray-200">
        {items.length === 0 ? (
          <div className="border-t border-gray-100 px-4 py-4 text-center text-sm text-gray-500">
            Aktuell kein Inhalt mit Pin-Bedarf.
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <ul className="space-y-2 p-3">
              {visible.map((c) => (
                <PinPipelineInhaltRow key={c.id} item={c} kind={c.kind} />
              ))}
            </ul>
            {remaining > 0 && (
              <details className="group/more">
                <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-link underline [&::-webkit-details-marker]:hidden">
                  <span className="inline group-open/more:hidden">
                    ▸ {remaining} weitere anzeigen
                  </span>
                  <span className="hidden group-open/more:inline">
                    ▾ Weniger anzeigen
                  </span>
                </summary>
                <ul className="space-y-2 p-3">
                  {items.slice(visibleLimit).map((c) => (
                    <PinPipelineInhaltRow key={c.id} item={c} kind={c.kind} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {/* Dezenter Verweis auf die interne Content-Datenbank (untergeordnet,
            kein externer Pfeil). */}
        <p className="px-4 py-2.5 text-xs">
          <span aria-hidden className="text-gray-400">
            →
          </span>{' '}
          <Link
            href="/dashboard/content-inhalte"
            className="font-medium text-link underline underline-offset-2 hover:opacity-80"
          >
            Hier geht es zu deiner Content-Datenbank
          </Link>
        </p>
      </div>
    </details>
  )
}

function PinPipelineInhaltRow({
  item,
  kind,
}: {
  item: PinPipelineInhalt
  kind: 'few_pins' | 'stale'
}) {
  // Ampel + knapper Grund: rot = noch gar kein Pin (größter Hebel),
  // sonst amber (zu wenige bzw. alte Pins). Der StatusDot trägt den Status,
  // daher kein Warn-Symbol im Text. Trägt auch die Pin-Anzahl, daher keine
  // separate Meta-Zeile mehr.
  const tone: StatusTone = item.pinCount === 0 ? 'schlecht' : 'achtung'
  const grund =
    item.pinCount === 0
      ? 'Noch kein Pin zu diesem Inhalt.'
      : kind === 'few_pins'
        ? `Nur ${item.pinCount} Pin${item.pinCount === 1 ? '' : 's'}, letzter vor ${item.letzterPinTage} Tagen.`
        : `${item.pinCount} Pin${item.pinCount === 1 ? '' : 's'}, letzter vor ${item.letzterPinTage} Tagen.`
  const boardLabel = item.boardNames.length === 1 ? 'Board:' : 'Boards:'
  return (
    <li className="space-y-2.5 rounded-lg border border-gray-200 bg-marke-kachel p-3 text-sm hover:bg-marke-kachel-hover">
      {/* a. Titel */}
      <div className="text-[15px] font-semibold text-gray-900">
        {item.titel}
      </div>
      {/* b. Ampel + Grund (trägt auch die Pin-Anzahl) */}
      <div className="flex items-center gap-1.5 text-xs text-haupt">
        <StatusDot tone={tone} />
        <span>{grund}</span>
      </div>
      {/* c. Boards als reiner Text (keine Pille) */}
      {item.boardNames.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="text-gray-500">{boardLabel}</span>{' '}
          <span className="font-medium text-gray-700">
            {item.boardNames.join(', ')}
          </span>
        </div>
      )}
      {/* e. Buttons unten in eigener Zeile */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/pin-produktion?content_id=${item.id}&open=new`}
          className="inline-flex items-center justify-center rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
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
    </li>
  )
}

function PinPipelineUrlsCard({ urls }: { urls: UrlPotenzialRow[] }) {
  const visibleLimit = 3
  const visible = urls.slice(0, visibleLimit)
  const remaining = urls.length - visible.length
  const urlsTooltip =
    'URLs, deren Pins im Schnitt mehr als 20 Prozent über deiner ' +
    'durchschnittlichen Klickrate liegen. Solche Themen funktionieren ' +
    'nachweislich, jeder weitere Pin bringt vorhersehbar Traffic. Solange noch ' +
    'keine 10 ausgewerteten Pins vorliegen, gilt ein fester Richtwert.'
  return (
    <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Leere Kategorie (0 URLs): Zeile gedimmt. */}
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden ${
          urls.length === 0 ? 'opacity-60' : ''
        }`}
      >
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        {/* Einheitliches Linien-Icon (Blaugrau, kein Kreis) wie in Pins recyceln. */}
        <PinKategorieIcon
          name="url"
          className="h-6 w-6 shrink-0 text-marke-blaugrau"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <LabelWithTooltip label="URLs mit Potenzial" tooltip={urlsTooltip} />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            Diese URLs laufen überdurchschnittlich gut. Jeder weitere Pin bringt
            vorhersehbar Traffic.
          </p>
        </div>
        <AnzahlBadge count={urls.length} />
      </summary>

      {urls.length === 0 ? (
        <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          Aktuell keine URLs mit auffälligem CTR-Potenzial. Bei mehr
          Datenmaterial werden hier Goldnugget-URLs angezeigt.
        </div>
      ) : (
        <div className="border-t border-gray-200">
          <ul className="space-y-2 p-3">
            {visible.map((u) => (
              <PinPipelineUrlRow key={u.basisUrl} url={u} />
            ))}
          </ul>
          {remaining > 0 && (
            <details className="group/more">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-link underline [&::-webkit-details-marker]:hidden">
                <span className="inline group-open/more:hidden">
                  ▸ {remaining} weitere anzeigen
                </span>
                <span className="hidden group-open/more:inline">
                  ▾ Weniger anzeigen
                </span>
              </summary>
              <ul className="space-y-2 p-3">
                {urls.slice(visibleLimit).map((u) => (
                  <PinPipelineUrlRow key={u.basisUrl} url={u} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {/* Dezenter Verweis auf die interne Ziel-URL-Datenbank (untergeordnet,
          kein externer Pfeil). */}
      <p className="px-4 py-2.5 text-xs">
        <span aria-hidden className="text-gray-400">
          →
        </span>{' '}
        <Link
          href="/dashboard/ziel-urls"
          className="font-medium text-link underline underline-offset-2 hover:opacity-80"
        >
          Hier geht es zu deinen Ziel-URLs
        </Link>
      </p>
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
  const boardLabel = url.boardNames.length === 1 ? 'Board:' : 'Boards:'
  return (
    <li className="space-y-2.5 rounded-lg border border-gray-200 bg-marke-kachel p-3 text-sm hover:bg-marke-kachel-hover">
      {/* a. Titel / gekürzte URL */}
      <div className="text-[15px] font-semibold text-gray-900">{display}</div>
      {/* b. Meta (Pin-Anzahl + Ø CTR) — die zeilenspezifische Information.
          Die allgemeine Chance-Botschaft steht in der Card-Subheadline. */}
      <div className="text-xs text-gray-500">
        {url.pinCount} Pin{url.pinCount === 1 ? '' : 's'} · Ø CTR:{' '}
        <strong className="text-gray-700">{ctrText}%</strong>
        {url.ctrUeberMedianPct != null && (
          <span className="text-status-gut-text">
            {' '}
            · {url.ctrUeberMedianPct}% über deinem Schnitt
          </span>
        )}
      </div>
      {/* d. Boards als reiner Text (keine Pille) */}
      {url.boardNames.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="text-gray-500">{boardLabel}</span>{' '}
          <span className="font-medium text-gray-700">
            {url.boardNames.join(', ')}
          </span>
        </div>
      )}
      {/* e. Buttons unten in eigener Zeile (externer „URL öffnen" mit ↗) */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/pin-produktion?open=new"
          className="inline-flex items-center justify-center rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
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
      <h2 className="text-xl font-semibold text-marke-blaugrau">
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
  // Anzahl Boards mit Handlungsbedarf = sichtbare Top-Hebel-Karten + die
  // restlichen Boards im „weitere"-Toggle. Speist die AnzahlBadge am Card-Kopf.
  const hebelAnzahl = topKarten.length + restBoards.length

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

      {topKarten.length === 0 && restBoards.length === 0 ? (
        <div className="coaching-box mt-4">
          <p className="font-medium leading-relaxed">
            Deine Boards sind richtig gut aufgestellt, hier ist gerade nichts
            zu tun. Pinne einfach weiter regelmäßig, dann bleibt das so.
          </p>
        </div>
      ) : (
        // Hebel-Teil im gewohnten Card-Muster: Card mit Kopf (Boards-Icon +
        // Titel + AnzahlBadge), darunter graue Zeilen-Kacheln; die restlichen
        // Boards hinter einem „N weitere anzeigen"-Toggle.
        <details className="group mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-2xl leading-none text-gray-400" aria-hidden>
              <span className="inline group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            <PinKategorieIcon
              name="boards"
              className="h-6 w-6 shrink-0 text-marke-blaugrau"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                Deine wichtigsten Hebel
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                Boards mit dem größten Hebel für mehr Sichtbarkeit.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Boards darfst du direkt bearbeiten, anders als Pins. Wähle Namen
                und Beschreibung mit klaren Keywords, kurz und ohne Spielereien,
                denn daran erkennt Pinterest, worum es geht.
              </p>
            </div>
            <AnzahlBadge count={hebelAnzahl} />
          </summary>

          <div className="border-t border-gray-200">
            {topKarten.length > 0 && (
              <ul className="space-y-2 p-3">
                {topKarten.map((karte) => (
                  <CoachingKarteRow key={karte.boardId} karte={karte} />
                ))}
              </ul>
            )}
            {restBoards.length > 0 && (
              <details className="group/more border-t border-gray-100">
                <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-link underline [&::-webkit-details-marker]:hidden">
                  <span className="inline group-open/more:hidden">
                    ▸ {restBoards.length} weitere anzeigen
                  </span>
                  <span className="hidden group-open/more:inline">
                    ▾ Weniger anzeigen
                  </span>
                </summary>
                <ul className="space-y-2 p-3">
                  {restBoards.map((rb) => (
                    <CoachingRestKachel key={rb.boardId} rb={rb} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </details>
      )}

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-gray-500">
          <span>
            →{' '}
            <Link
              href="/dashboard/boards"
              className="font-medium text-link underline"
            >
              Alle Boards in der Übersicht ansehen
            </Link>
          </span>
          {boardsOhneAnalyticsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <InfoIcon className="shrink-0 text-gray-400" />
              <span>
                {boardsOhneAnalyticsCount}{' '}
                {boardsOhneAnalyticsCount === 1
                  ? 'Board ohne'
                  : 'Boards ohne'}{' '}
                Analytics-Einträge:{' '}
                →{' '}
                <Link
                  href="/dashboard/analytics?tab=boards"
                  className="font-medium text-link underline"
                >
                  Daten eintragen
                </Link>
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

// Buttons „Pins planen" + „Board bearbeiten" (intern) + „Zum Board ↗" (extern).
// `highlight` bestimmt, welche der beiden internen Aktionen gefüllt (primär)
// erscheint; die andere bleibt zurückhaltend (Outline). „Zum Board" ist nie
// die Hauptaktion und bleibt immer der reduzierte graue Outline-Button.
function CoachingButtons({
  boardId,
  pinterestUrl,
  highlight,
}: {
  boardId: string
  pinterestUrl: string | null
  // 'beide' = gemischte Hebel → beide internen Buttons gefüllt.
  highlight: 'pins' | 'bearbeiten' | 'beide'
}) {
  const filled =
    'rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel'
  const outline =
    'rounded-md border border-marke-blaugrau px-3 py-1 text-xs font-medium text-marke-blaugrau hover:bg-marke-blaugrau hover:text-white'
  const pinsFilled = highlight === 'pins' || highlight === 'beide'
  const editFilled = highlight === 'bearbeiten' || highlight === 'beide'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/pin-produktion?new=1&board=${boardId}`}
        className={pinsFilled ? filled : outline}
      >
        Pins planen
      </Link>
      <Link
        href={`/dashboard/boards?edit=${boardId}`}
        className={editFilled ? filled : outline}
      >
        Board bearbeiten
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
  const hl = boardHighlight(karte.hebelTypen)
  return (
    <li className="space-y-2.5 rounded-lg border border-gray-200 bg-marke-kachel p-3 text-sm hover:bg-marke-kachel-hover">
      {/* a. Board-Name + Aktivitäts-Zustands-Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-gray-900">
          {karte.boardName}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BOARD_AKTIVITAET_BADGE[karte.badgeKey].cls}`}
        >
          {BOARD_AKTIVITAET_BADGE[karte.badgeKey].text}
        </span>
      </div>
      {/* b. Coaching mit Camel-Streifen. Bündel (>= 3 Hebel): Einleitung +
          kurze Punkte + Abschluss. Sonst: alle Hebel-Sätze untereinander. */}
      {karte.kind === 'buendel' && karte.buendelPunkte ? (
        <div className="border-l-[3px] border-l-marke-ocker pl-3 text-haupt">
          <p className="text-sm font-semibold leading-relaxed">
            Dieses Board braucht einmal deine volle Aufmerksamkeit.
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {karte.buendelPunkte.map((punkt, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {punkt}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-sm leading-relaxed">
            Nimm es dir am Stück vor, das bringt auf einen Schlag am meisten.
          </p>
        </div>
      ) : (
        <div className="border-l-[3px] border-l-marke-ocker pl-3 text-haupt">
          {karte.hebelTexte.map((t, i) => (
            <p
              key={i}
              className={`text-sm leading-relaxed${i > 0 ? ' mt-1.5' : ''}`}
            >
              {t}
            </p>
          ))}
        </div>
      )}
      {/* c. Vorbereitete Pins (Entwurf/geplant) — nur wenn „Pins planen" zur
          Handlung gehört (also nicht bei reinen Bearbeitungs-Hebeln). */}
      {hl !== 'bearbeiten' && (
        <PreparedPinsBox boardId={karte.boardId} prepared={karte.prepared} />
      )}
      {/* d. Buttons unten in eigener Zeile */}
      <CoachingButtons
        boardId={karte.boardId}
        pinterestUrl={karte.pinterestUrl}
        highlight={hl}
      />
    </li>
  )
}

// Eine Zeilen-Kachel für die restlichen Boards (im „weitere"-Toggle). Gleicher
// graue-Kachel-Stil wie CoachingKarteRow; die Hebel-Texte als ein Coaching-Block
// mit Camel-Streifen.
function CoachingRestKachel({ rb }: { rb: CoachingRestBoard }) {
  const hl = boardHighlight(rb.hebelTypen)
  return (
    <li className="space-y-2.5 rounded-lg border border-gray-200 bg-marke-kachel p-3 text-sm hover:bg-marke-kachel-hover">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-gray-900">
          {rb.boardName}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BOARD_AKTIVITAET_BADGE[rb.badgeKey].cls}`}
        >
          {BOARD_AKTIVITAET_BADGE[rb.badgeKey].text}
        </span>
      </div>
      {rb.hebelTexte.length > 0 && (
        <div className="border-l-[3px] border-l-marke-ocker pl-3 text-haupt">
          <ul className="space-y-1">
            {rb.hebelTexte.map((t, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hl !== 'bearbeiten' && (
        <PreparedPinsBox boardId={rb.boardId} prepared={rb.prepared} />
      )}
      <CoachingButtons
        boardId={rb.boardId}
        pinterestUrl={rb.pinterestUrl}
        highlight={hl}
      />
    </li>
  )
}

// Hinweis-Box „vorbereitete Pins" je Board. Nutzt die gemeinsame
// PreparedPinsHinweis-Komponente (gleicher ruhiger Stil wie die Saison-Box),
// nur mit dem board-Filter als Link-Basis.
function PreparedPinsBox({
  boardId,
  prepared,
}: {
  boardId: string
  prepared: { entwurf: number; geplant: number }
}) {
  return (
    <PreparedPinsHinweis
      basis={`/dashboard/pin-produktion?filter[board]=${boardId}`}
      prepared={prepared}
    />
  )
}

type KpiAccent = 'green' | 'yellow' | 'red' | 'gray' | null

// Board-Status → einheitlicher Status-Ton (flacher StatusDot, status-Tokens).
const ACCENT_TONE: Record<Exclude<KpiAccent, null>, StatusTone> = {
  green: 'gut',
  yellow: 'achtung',
  red: 'schlecht',
  gray: 'neutral',
}

function BoardKpiCell({
  label,
  value,
  valueClass = 'text-haupt',
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
  // Neutrale weiße Karte wie die Profil-Performance-Kacheln; der Status liegt
  // allein im flachen StatusDot neben dem Wert (kein farbiger Balken, keine
  // Hintergrund-Tönung).
  const borderCls = highlight
    ? 'border-2 border-green-200'
    : 'border border-karte-rand'
  return (
    <div className={`rounded-lg ${borderCls} bg-white p-4 shadow-sm`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </div>
      <div className="mt-1 flex items-center gap-2">
        {accent && <StatusDot tone={ACCENT_TONE[accent]} />}
        <span className={`text-2xl font-semibold ${valueClass}`}>{value}</span>
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
      <details className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-marke-kachel-hover [&::-webkit-details-marker]:hidden">
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
// Briefing-Block: weiße Sektion mit „Deine nächsten Schritte".
// Der Aktualitäts-/Rhythmus-Hinweis steht jetzt in der Dashboard-
// Einleitung oben, daher hier keine Fußnote mehr.
// ===========================================================
function BriefingBlock({
  nextStepsItems,
}: {
  nextStepsItems: BriefingItem[]
}) {
  return (
    // Karte weiß (Core-bg-white, robust) + Rand karte-rand (Marke Blaugrau-
    // hell), hebt sich vom Creme-Hintergrund ab.
    <section className="rounded-lg border border-karte-rand bg-white p-4 shadow-sm">
      <BriefingSection items={nextStepsItems} />
    </section>
  )
}

// ===========================================================
// Hero-Section: Analytics-Status-Banner auf neutraler Fläche (bg-karte +
// karte-rand). Statusfarbe nur als flacher Punkt-Akzent, Status-Wort groß in
// Blaugrau. Drei Zustände: aktuell / fällig / leer (Willkommen).
// ===========================================================
function HeroSection({
  status,
  analyticsUpdateDatum,
}: {
  status: UpdateStatusMonat
  analyticsUpdateDatum: string | null
}) {
  const letztesUpdate = analyticsUpdateDatum
    ? formatDateDe(analyticsUpdateDatum)
    : 'noch nie'

  // Leer-Zustand: noch nie Analytics gepflegt — ruhiger Willkommens-Hinweis,
  // gleiche neutrale Fläche wie die Status-Zustände (kein farbiger Vollgrund).
  if (status.state === 'leer') {
    return (
      <section className="flex flex-wrap items-start gap-4 rounded-lg border border-karte-rand bg-karte px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-haupt">Willkommen!</p>
          <p className="mt-1 text-sm text-sekundaer">
            Bevor das Dashboard aussagekräftig wird, pflege einmal monatlich
            deine Pinterest-Analytics ein. Erst dann zeigen KPIs,
            Strategie-Check und Coaching-Empfehlungen verlässliche Werte.
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="ml-auto shrink-0 rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          Analytics einpflegen
        </Link>
      </section>
    )
  }

  const istRot = status.state === 'rot'

  return (
    <section className="grid grid-cols-1 gap-y-2 rounded-lg border border-karte-rand bg-karte px-4 py-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-x-4 md:gap-y-0">
      {/* Links (kräftig): Status-Punkt + Status-Wort, darunter die zwei
          Datumszeilen — die dominante Gruppe. Sitzt in der linken 1fr-Spalte. */}
      <div className="flex items-start gap-3">
        <StatusDot tone={istRot ? 'schlecht' : 'gut'} size="lg" />
        <div>
          <p className="text-base font-semibold text-haupt">
            {istRot ? 'Update fällig' : 'Aktuell'}
          </p>
          <p className="mt-0.5 text-sm text-sekundaer">
            {istRot ? (
              <>
                Zeitraum{' '}
                <span className="font-medium text-haupt">
                  {formatDateDe(status.faelligerMonatVon)} bis{' '}
                  {formatDateDe(status.faelligerMonatBis)}
                </span>{' '}
                fällig
              </>
            ) : (
              <>
                Nächstes Update ab{' '}
                <span className="font-medium text-haupt">
                  {formatDateDe(status.eintragbarAb)}
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-sekundaer">
            Letztes Update: {letztesUpdate}
          </p>
        </div>
      </div>

      {/* Mitte (leise, klar untergeordnet): kompakter Erklär-Zweizeiler in der
          zentrierten Auto-Spalte zwischen zwei gleich breiten 1fr-Spalten →
          exakt über dem „Wo stehst du?"-Trenner darunter. max-w-md hält ihn auf
          zwei Zeilen. Neutrales Grau, kein Icon, kein Link-Look. */}
      <p className="mx-auto max-w-md text-center text-xs text-gray-500">
        Der Stand deines Dashboards beruht auf deinem letzten Monats-Update.
        Pflege deine Pinterest-Zahlen einmal im Monat ein, dann ist er wieder
        aktuell.
      </p>

      {/* Rechts: leise Aktion in Blaugrau (nicht Camel). Grün = dezenter
          Outline-Button; Rot = gefüllt und damit etwas präsenter. */}
      <Link
        href="/dashboard/analytics"
        className={
          istRot
            ? 'shrink-0 justify-self-start rounded-md bg-marke-blaugrau px-3 py-1.5 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel md:justify-self-end'
            : 'shrink-0 justify-self-start rounded-md border border-marke-blaugrau px-3 py-1.5 text-xs font-medium text-marke-blaugrau hover:bg-marke-blaugrau hover:text-white md:justify-self-end'
        }
      >
        Jetzt aktualisieren
      </Link>
    </section>
  )
}

// ===========================================================
// Phasen-Trenner — Space Grotesk, Titel mittig zwischen zwei Linien
// ===========================================================
function PhasenTrenner({ title }: { title: string }) {
  return (
    <div className="mb-6 mt-12 flex items-center gap-6">
      <span aria-hidden className="h-px flex-1 bg-marke-blaugrau-mittel" />
      <span
        className="text-[18px] font-semibold text-gray-900 sm:text-[20px]"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </span>
      <span aria-hidden className="h-px flex-1 bg-marke-blaugrau-mittel" />
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
}: {
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
  chartPoints: ChartPoint[]
}) {
  const prevCtr =
    previous && previous.impressionen > 0
      ? (previous.ausgehende_klicks / previous.impressionen) * 100
      : null
  const headingTooltip =
    'Pinterest zeigt rollierende Daten der letzten 31 Tage. Wachstum % basiert auf Vergleich zum vorherigen eingetragenen Monat.'

  const prevDateLabel = previous ? ` (${formatDateDe(previous.datum)})` : ''
  const prevText = (val: string | null) =>
    val !== null ? `Vorperiode: ${val}${prevDateLabel}` : undefined

  if (!latest) {
    return (
      <section id="gesamt-profil-performance" className="scroll-mt-4">
        {/* Sektions-Überschrift (v2): Hierarchie über Schrift + Weißraum, keine
            Trennlinie. Muster identisch zum Strategie-Check. */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-marke-blaugrau">
            <LabelWithTooltip
              label="Profil-Performance"
              tooltip={headingTooltip}
            />
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Wie sich deine Pinterest-Zahlen im Vergleich zum vorherigen
            Analytics-Update entwickelt haben.
          </p>
        </div>
        {/* Leerzustand: identisches Layout wie mit Daten — gleiche Kacheln
            (Werte „–") und echte Graph-Fläche mit Achsen, aber ohne Linie. */}
        <div className="mt-3 grid items-stretch gap-4 lg:grid-cols-[170px_170px_minmax(0,1fr)]">
          {/* Spalte 1 — Ergebnis */}
          <div className="flex flex-col">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
              <LabelWithTooltip
                label="Ergebnis"
                tooltip="Was ist am Ende rausgekommen – die Erfolgs-Metriken deines Profils."
              />
            </h3>
            <div className="mt-2 flex flex-1 flex-col gap-2">
              <KpiCard
                className="flex-1"
                label="Ausgehende Klicks"
                value="–"
                tooltip="Wie oft Nutzer von Pinterest auf deine Website geklickt haben. Das ist deine wichtigste Metrik für echten Traffic."
              />
              <KpiCard
                className="flex-1"
                label="Save-Rate"
                value="–"
                tooltip="Saves ÷ Impressionen. Wie oft Menschen deine Pins speichern, das stärkste Signal, das Pinterest für die Ausspielung nutzt."
              />
            </div>
          </div>

          {/* Spalte 2 — Treiber */}
          <div className="flex flex-col">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
              <LabelWithTooltip
                label="Treiber"
                tooltip="Was hat das Ergebnis erzeugt – die Hebel, an denen du drehen kannst."
              />
            </h3>
            <div className="mt-2 flex flex-1 flex-col gap-2">
              <KpiCard
                label="Saves"
                value="–"
                tooltip="Saves sind das stärkste Algorithmus-Signal. Mehr Saves = längere Lebensdauer + mehr Reichweite."
              />
              <KpiCard
                label="CTR"
                value="–"
                tooltip="Ausgehende Klicks ÷ Impressionen. Zeigt ob dein Pin-Hook funktioniert."
              />
              <KpiCard
                label="Impressionen"
                value="–"
                tooltip="Wie oft deine Pins angezeigt wurden. Zeigt ob deine Keywords und SEO greifen."
              />
            </div>
          </div>

          {/* Spalte 3 — Performance-Verlauf: echte Achsen, keine Linie */}
          <div className="flex flex-col">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
              <LabelWithTooltip
                label="Performance-Verlauf"
                tooltip="Hier siehst du die Entwicklung deiner wichtigsten Metriken über die letzten 12 Monate (rollierend). Sobald ein neuer Monat hinzukommt, fällt der älteste raus."
              />
            </h3>
            <div className="relative mt-2 flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <PerformanceChart data={[]} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-marke-blaugrau-mittel">
                  Noch keine Daten
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Noch kein Analytics-Update:{' '}
          →{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-link underline"
          >
            jetzt starten
          </Link>
          .
        </p>
      </section>
    )
  }

  // Save-Rate (saves / impressionen) + Wachstum gegen die Vorperiode — gleiche
  // Konvention wie CTR (calcSaveRate/calcGrowth aus utils).
  const saveRate = calcSaveRate(latest.saves, latest.impressionen)
  const prevSaveRate = previous
    ? calcSaveRate(previous.saves, previous.impressionen)
    : null
  const saveRateGrowth =
    saveRate !== null && prevSaveRate !== null
      ? calcGrowth(saveRate, prevSaveRate)
      : null

  // Richtungs-Ampel (Trend der Kernsignale ggü. Vormonat). Ohne Vormonat 'leer'.
  const ampel = computeRichtungsAmpel({
    hasPrevious: previous !== null,
    klicksGrowth: latest.klicks_growth,
    savesGrowth: latest.saves_growth,
    saveRateGrowth,
  })

  return (
    <section id="gesamt-profil-performance" className="scroll-mt-4">
      {/* Sektions-Überschrift (v2): Hierarchie über Schrift + Weißraum, keine
          Trennlinie. Muster identisch zum Strategie-Check. */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          <LabelWithTooltip
            label="Profil-Performance"
            tooltip={headingTooltip}
          />
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Wie sich deine wichtigsten Pinterest-Zahlen im Vergleich zum letzten
          Monat entwickeln: ausgehende Klicks, Saves und deine Save-Rate. Die
          Ampel fasst die Richtung zusammen, die Zahlen und der Verlauf zeigen
          die Details.
        </p>
      </div>

      {/* Leerzustand (kein Vormonat): keine Ampel, nur der Hinweis. */}
      {ampel.status === 'leer' && (
        <p className="mt-3 text-sm text-gray-600">{ampel.begleitsatz}</p>
      )}

      {/* 3-Spalten-Grid: Ergebnis (oben Richtungs-Ampel-Kachel) | Treiber | Chart */}
      <div className="mt-3 grid items-stretch gap-4 lg:grid-cols-[170px_170px_minmax(0,1fr)]">
        {/* Spalte 1 — Ergebnis: oben die Richtungs-Ampel als Kachel, darunter
            die beiden Ergebnis-KPIs. */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
            <LabelWithTooltip
              label="Ergebnis"
              tooltip="Was ist am Ende rausgekommen – die Erfolgs-Metriken deines Profils."
            />
          </h3>
          <div className="mt-2 flex flex-1 flex-col gap-2">
            {ampel.status !== 'leer' && (
              <div className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Richtung
                </p>
                <div className="flex flex-1 items-center justify-center">
                  <RichtungsAmpelVertikal status={ampel.status} />
                </div>
              </div>
            )}
            <KpiCard
              className="flex-1"
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
              className="flex-1"
              label="Save-Rate"
              value={formatPercent(saveRate)}
              growth={saveRateGrowth}
              tooltip="Saves ÷ Impressionen. Wie oft Menschen deine Pins speichern, das stärkste Signal, das Pinterest für die Ausspielung nutzt."
              previousValue={prevText(
                prevSaveRate !== null ? formatPercent(prevSaveRate) : null
              )}
            />
          </div>
        </div>

        {/* Spalte 2 — Treiber */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
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
              tooltip="Ausgehende Klicks ÷ Impressionen. Zeigt ob dein Pin-Hook funktioniert."
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
          <h3 className="text-[11px] font-semibold tracking-wide text-slate-600">
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

// (entfernt: KontextZeile + KontextKpi — Gesamte/Interagierende Zielgruppe vom
// Dashboard genommen; Audience-Größen stehen weiter im Zielgruppe-Analytics-Tab.)
