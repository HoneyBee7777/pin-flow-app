import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import InfoTooltip, { LabelWithTooltip } from '@/components/InfoTooltip'
import {
  boardThresholdsFromSettings,
  calcBoardEngagementRate,
  calcCtr,
  calcUpdateStatus,
  calcUpdateStatusTri,
  diagnoseBoard,
  diagnosePin,
  diffDays,
  formatDateDe,
  formatGrowth,
  formatPercent,
  formatZahl,
  PIN_HANDLUNG,
  boardScoreTooltip,
  scoreBoardHybrid,
  thresholdsFromSettings,
  topPercentCutoff,
  type BoardScore,
  type BoardThresholds,
  type PinAnalyticsThresholds,
  todayIso,
  withGrowth,
  type BoardStatus,
  type EinstellungenSchwellwerte,
  type EinstellungenSchwellwerteBoard,
  type PinDiagnose,
  type PinOption,
  type ProfilAnalytics,
  type ProfilAnalyticsWithGrowth,
  type UpdateStatusTri,
} from './analytics/utils'
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
import { buildBriefingItems, type BriefingItem } from './briefing/lib'
import {
  computeStrategieCheck,
  type StrategiePinRow,
  type StrategieSettings,
} from './strategie-check/lib'

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
  // Status aus der Board-Gesundheit-Klassifizierung (assignCategory). Single
  // Source of Truth für Farbe + Warnhinweis im Pin-Handlungsbedarf.
  // null = Board ohne Analytics (eigener Anzeigefall).
  boardScoreLabel: BoardScoreLabel | null
  boardHasAnalytics: boolean
}

type BoardScoreLabel =
  | 'Top'
  | 'Wachstum'
  | 'Solide'
  | 'Schwach'
  | 'Schlafend'
  | 'Inaktiv'

type BoardDashHealth = {
  id: string
  name: string
  pinterestUrl: string | null
  status: BoardStatus
  score: BoardScore
  engagementRate: number | null
  engagementRatePrev: number | null
  engagementRateChangePct: number | null
  trendPct: number | null
  dataInsufficient: boolean
  impressionen: number
  klicks: number
  hasAnalytics: boolean
  anzahlPins: number | null
  lastPinDate: string | null
  lastPinAlterTage: number | null
  lastPinId: string | null
}

type BoardCat = BoardScore | 'schlafende_top' | 'inaktive'

type BoardMetricKind = 'er' | 'erChange' | 'impressionen' | 'klicks'

type BoardCatConfig = {
  key: BoardCat
  group: 'A' | 'B' // A = Brauchen Aufmerksamkeit, B = Performen gut
  emoji: string
  label: string
  subtitle: string
  tooltip: string
  iconBg: string
  counterBg: string
  hint: string
  nextStep: string
  hintTone: 'orange' | 'blue' | 'green' | 'gray'
  primary: { label: string; href: (b: BoardDashHealth) => string }
  primaryButtonClass: string
  metrics: BoardMetricKind[]
  emptyMessage: string
  emptyTooltip?: string
  prominentLastPin?: boolean
}

const BOARD_CATEGORIES: BoardCatConfig[] = [
  {
    key: 'schlafende_top',
    group: 'A',
    emoji: '💤',
    label: 'Schlafende Top-Boards',
    subtitle:
      'Stark performende Boards aktuell ohne Aktivität – größtes ungenutztes Potenzial.',
    tooltip:
      'Boards mit überdurchschnittlicher Engagement Rate, die aktuell keine neuen Pins erhalten. Pinterest würde diese Boards sofort belohnen, sobald wieder Aktivität entsteht.',
    iconBg: 'bg-orange-100 text-orange-700',
    counterBg: 'bg-orange-100 text-orange-700',
    hint: '💡 Der Hebel: Diese Boards haben ihre Performance schon bewiesen – Pinterest pusht sie sofort wieder, sobald frische Pins kommen.',
    nextStep:
      '🎯 So gehst du vor: Mindestens 3 neue Pins pro Woche für 4 Wochen einplanen, dann Reichweite kontrollieren.',
    hintTone: 'orange',
    primary: {
      label: 'Pins planen',
      href: (b) => `/dashboard/pin-produktion?new=1&board=${b.id}`,
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage:
      'Aktuell keine schlafenden Top-Boards – deine starken Boards werden aktiv bepinnt. Sehr gut!',
    prominentLastPin: true,
  },
  {
    key: 'inaktive',
    group: 'A',
    emoji: '⏸️',
    label: 'Inaktive Boards',
    subtitle:
      'Boards mit mittlerer Performance, aktuell ohne neue Pins – Reaktivierung lohnt sich.',
    tooltip:
      'Boards mit mittlerer Engagement Rate, die seit über 30 Tagen keine neuen Pins erhalten haben. Auch ohne Top-Performance profitieren Boards von regelmäßigem Bepinnen – sonst verliert Pinterest das thematische Vertrauen.',
    iconBg: 'bg-orange-50 text-orange-700',
    counterBg: 'bg-orange-50 text-orange-700',
    hint: '💡 Der Hebel: Inaktive Boards mit mittlerer Performance können wieder hochgefahren werden – Pinterest belohnt regelmäßige Aktivität, auch bei stabilen Werten.',
    nextStep:
      '🎯 So gehst du vor: Mit 2-3 neuen Pins pro Woche reaktivieren – das hält die Sichtbarkeit aufrecht und kann zur Performance-Verbesserung führen.',
    hintTone: 'orange',
    primary: {
      label: 'Pins planen',
      href: (b) => `/dashboard/pin-produktion?new=1&board=${b.id}`,
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage:
      'Aktuell keine inaktiven solide Boards – deine soliden Boards werden alle aktiv bepinnt.',
    prominentLastPin: true,
  },
  {
    key: 'top',
    group: 'B',
    emoji: '🏆',
    label: 'Aktive Top Boards',
    subtitle:
      'Deine stärksten Performer – Pinterest erkennt hier thematische Expertise. Erweitere mit verwandten Boards.',
    tooltip:
      'Ein Board ist ein Top Board, wenn seine Engagement Rate ≥ 3% beträgt UND es zu den besten 30% deines Profils gehört. Das sind deine bewiesenen Stärken.',
    iconBg: 'bg-emerald-100 text-emerald-700',
    counterBg: 'bg-emerald-100 text-emerald-700',
    hint: '💡 Der Hebel: Pinterest belohnt thematische Cluster – wenn mehrere Boards verwandte Keywords abdecken, überträgt sich die Autorität auf alle.',
    nextStep:
      '🎯 So gehst du vor: Wähle ein Top Board, identifiziere 2–3 verwandte Keyword-Themen und lege dafür neue Boards an.',
    hintTone: 'green',
    primary: {
      label: 'Verwandtes Board anlegen',
      href: () => '/dashboard/boards?new=1',
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage:
      'Aktuell kein Top Board mit aktivem Bepinnen. Top Boards entstehen, wenn ein Board überdurchschnittliche Engagement Rate erreicht UND regelmäßig neue Pins bekommt.',
  },
  {
    key: 'wachstum',
    group: 'B',
    emoji: '📈',
    label: 'Wachstums-Boards',
    subtitle:
      'Aufstrebende Boards mit Momentum — Frequenz nicht abreißen lassen.',
    tooltip:
      'Ein Board gilt als Wachstums-Board, wenn seine Engagement Rate sich zum Vormonat um mindestens 20% verbessert hat — unabhängig vom absoluten Wert.',
    iconBg: 'bg-blue-100 text-blue-700',
    counterBg: 'bg-blue-100 text-blue-700',
    hint: '💡 Der Hebel: Algorithmus belohnt Konsistenz – wer dranbleibt, bekommt stabiles Wachstum statt Strohfeuer.',
    nextStep:
      '🎯 So gehst du vor: Pin-Frequenz halten – mindestens 3–5 neue Pins pro Woche für die nächsten 30 Tage.',
    hintTone: 'blue',
    primary: {
      label: 'Pins planen',
      href: (b) => `/dashboard/pin-produktion?new=1&board=${b.id}`,
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage:
      'Aktuell kein Wachstums-Board – aus deinen Solide Boards können welche werden, wenn die Engagement Rate konstant steigt.',
  },
  {
    key: 'solide',
    group: 'B',
    emoji: '⚖️',
    label: 'Solide Boards',
    subtitle:
      'Boards mit stabiler Performance – mit gezielten Optimierungen können sie zu Top Boards werden.',
    tooltip:
      'Solide Boards machen ihren Job, ohne aufzufallen. Sie erfüllen nicht die Top-Kriterien, sind aber auch nicht schwach. Mit mehr Pins könnten sie zu Top Boards werden.',
    iconBg: 'bg-slate-100 text-slate-700',
    counterBg: 'bg-slate-100 text-slate-700',
    hint: '💡 Der Hebel: Solide Boards werden zu Top Boards, wenn Pinterest mehr Material bekommt – aktive Boards werden mit mehr Reichweite belohnt.',
    nextStep:
      '🎯 So gehst du vor: Pin-Volumen pro Board in den nächsten 4 Wochen verdoppeln. Ziel: ER über 5%.',
    hintTone: 'gray',
    primary: {
      label: 'Pins planen',
      href: (b) => `/dashboard/pin-produktion?new=1&board=${b.id}`,
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage: 'Aktuell keine Boards in dieser Kategorie.',
  },
  {
    key: 'schwach',
    group: 'A',
    emoji: '📉',
    label: 'Schwache Boards',
    subtitle:
      'Geringe Engagement Rate – Pin-Designs überarbeiten oder Keywords in Titel und Beschreibung optimieren.',
    tooltip:
      'Schwache Boards haben eine Engagement Rate unter 1,5% ODER sind deutlich rückläufig zum Vormonat. Hier lohnt sich SEO-Optimierung oder mehr Pins.',
    iconBg: 'bg-gray-200 text-gray-700',
    counterBg: 'bg-gray-200 text-gray-700',
    hint: '💡 Der Hebel: Schwache Boards können das ganze Profil runterziehen – entweder optimieren oder archivieren, kein Mittelweg.',
    nextStep:
      '🎯 So gehst du vor: Erst Daten prüfen – bei niedriger Reichweite Keywords in Titel und Beschreibung optimieren, bei niedriger Engagement Rate Pin-Designs überarbeiten.',
    hintTone: 'gray',
    primary: {
      label: 'Keywords optimieren',
      href: (b) => `/dashboard/boards?edit=${b.id}`,
    },
    primaryButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    metrics: ['er', 'impressionen', 'klicks'],
    emptyMessage:
      'Aktuell keine schwachen Boards – alle deine Boards performen mindestens solide. Stark!',
  },
]

// Text-Akzentfarbe pro Kategorie für die Board-Zeilen-Metadaten
// (📊 Warum, 📌 Pins). Coaching-Boxen selbst verwenden einheitlich
// `coaching-box`; dies ist nur die Text-Tönung in den Listenzeilen.
const BOARD_HINT_TONE: Record<
  BoardCatConfig['hintTone'],
  { text: string }
> = {
  orange: { text: 'text-orange-800' },
  blue: { text: 'text-blue-800' },
  green: { text: 'text-green-800' },
  gray: { text: 'text-gray-700' },
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
    'klicks' | 'impressionen' | 'ctr' | 'alter' | 'datum' | 'push'
  >
  metricLabels: Partial<
    Record<'klicks' | 'impressionen' | 'ctr' | 'alter' | 'datum' | 'push', string>
  >
}

const HANDLUNGS_CATEGORIES: HandlungsCategory[] = [
  {
    diagnose: 'aktiver_top_performer',
    emoji: '⭐',
    label: 'Aktiver Top Performer',
    subtitle:
      'Diese Pins laufen stark – produziere Varianten solange der Algorithmus pusht.',
    tooltip:
      'Deine stärksten Pins nach Klicks. Pins jünger als 70 Tage mit mindestens 15 Klicks performen aktiv. Pinterest pusht neue Pins in den ersten 60-90 Tagen besonders stark – nutze dieses Zeitfenster.',
    iconBg: 'bg-green-100 text-green-700',
    counterBg: 'bg-green-100 text-green-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Variante produzieren',
    },
    metrics: ['klicks', 'ctr', 'impressionen', 'alter', 'push'],
    metricLabels: {
      klicks: 'Klicks',
      ctr: 'CTR',
      impressionen: 'Impressionen',
      alter: 'alt',
      push: 'Algorithmus-Push',
    },
  },
  {
    diagnose: 'hidden_gem',
    emoji: '💎',
    label: 'Hidden Gem',
    subtitle:
      'Hohe CTR wenig Reichweite – Hook und Design top aber SEO schwach – Keywords und Boards optimieren.',
    tooltip:
      'Pins mit einer CTR über 1,5% aber weniger als 1.000 Impressionen. Der Hook funktioniert – aber das SEO ist schwach. Keywords und Board optimieren für mehr Reichweite.',
    iconBg: 'bg-blue-100 text-blue-700',
    counterBg: 'bg-blue-100 text-blue-700',
    primaryAction: { type: 'edit', label: 'Keywords optimieren' },
    metrics: ['ctr', 'impressionen', 'klicks'],
    metricLabels: {
      ctr: 'CTR',
      impressionen: 'Impressionen',
      klicks: 'Klicks',
    },
  },
  {
    diagnose: 'hohe_impressionen_niedrige_ctr',
    emoji: '🔍',
    label: 'Optimierungspotenzial',
    subtitle:
      'Viel ausgespielt wenig geklickt – SEO läuft, Hook und Design optimieren.',
    tooltip:
      'Viel ausgespielt (SEO funktioniert) aber wenig geklickt. Titel und Beschreibung können identisch bleiben — sie funktionieren für den Algorithmus. Was geändert werden muss: Hook-Text auf dem Bild und Pin-Design. Erstelle einen neuen Pin mit demselben Titel aber anderem Hook und Design.',
    iconBg: 'bg-orange-100 text-orange-700',
    counterBg: 'bg-orange-100 text-orange-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'variante',
      label: 'Hook optimieren',
    },
    metrics: ['impressionen', 'ctr', 'klicks'],
    metricLabels: {
      impressionen: 'Impressionen',
      ctr: 'CTR',
      klicks: 'Klicks',
    },
  },
  {
    diagnose: 'eingeschlafener_gewinner',
    emoji: '♻️',
    label: 'Eingeschlafener Gewinner',
    subtitle:
      'Pins die früher stark liefen – jetzt Zeit fürs Recycling mit frischem Design.',
    tooltip:
      'Pins die älter als 120 Tage sind und mindestens 15 Klicks hatten – aber nicht mehr aktiv performen. Produziere eine neue Variante mit frischem Design und aktualisierten Keywords.',
    iconBg: 'bg-gray-200 text-gray-700',
    counterBg: 'bg-gray-200 text-gray-700',
    primaryAction: {
      type: 'variante',
      varianteTyp: 'recycling',
      label: 'Recycling starten',
    },
    metrics: ['klicks', 'alter', 'datum'],
    metricLabels: {
      klicks: 'Frühere Klicks',
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
  ] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false })
      .limit(12),
    supabase
      .from('einstellungen')
      .select(
        `profil_name, analytics_update_datum,
         schwellwert_beobachtung, schwellwert_min_klicks,
         schwellwert_alter_recycling, schwellwert_ctr, schwellwert_impressionen,
         schwellwert_top_performer_bonus_impressionen,
         schwellwert_board_wenig_aktiv, schwellwert_board_inaktiv,
         schwellwert_board_top_er, schwellwert_board_top_prozent,
         schwellwert_board_schwach_er, schwellwert_board_wachstum_trend,
         cp_min_pins_gesamt, cp_min_pins_ohne_aktuell, cp_tage_ohne_pin,
         cp_min_ctr_goldnugget, cp_max_pins_goldnugget,
         strategie_soll_blog, strategie_soll_affiliate, strategie_soll_produkt,
         ziel_soll_traffic, ziel_soll_lead, ziel_soll_sales,
         format_soll_standard, format_soll_video, format_soll_collage, format_soll_carousel,
         strategie_onboarding_abgeschlossen,
         strategie_check_schwelle_gelb, strategie_check_schwelle_rot,
         status_update_intervall, status_update_vorwarnung`
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
          `id, pin_id, datum, impressionen, klicks, saves, created_at,
           pins ( id, titel, status, created_at, geplante_veroeffentlichung, pinterest_pin_url, board_id )`
        )
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
    supabase.from('ziel_urls').select('id, titel, url'),
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
    supabase.from('boards').select('id, name, pinterest_url, created_at'),
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
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilRows = withGrowth(rows)
  const latest = profilRows[0] ?? null
  const previous = profilRows[1] ?? null

  const updateStatus = calcUpdateStatus(
    settingsRes.data?.analytics_update_datum ?? null
  )
  // Tri-State (grün/gelb/rot) für Hero-Section. Nutzt User-Schwellwerte
  // aus Einstellungen (Defaults: 31 Tage Intervall, 7 Tage Vorwarnung).
  type RawStatusSettings = {
    status_update_intervall: number | null
    status_update_vorwarnung: number | null
  }
  const statusRaw = settingsRes.data as Partial<RawStatusSettings> | null
  const updateStatusTri: UpdateStatusTri = calcUpdateStatusTri(
    settingsRes.data?.analytics_update_datum ?? null,
    statusRaw?.status_update_intervall ?? undefined,
    statusRaw?.status_update_vorwarnung ?? undefined
  )

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
  //   - Gleiche Threshold-Quelle (thresholdsFromSettings).
  //   - Gleiche Dedup-Strategie (erste Begegnung pro pin_id = neueste).
  //   - Identischer diagnosePin()-Aufruf mit denselben Argumenten.
  // Damit zeigen Dashboard und Analytics-Tab dieselben Pins in
  // denselben Kategorien.
  const thresholds = thresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerte> | null
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

  // Dedup — nur neueste Datum pro pin_id (Server sortiert DESC)
  const seenPin = new Set<string>()
  const actionable: ActionablePin[] = []
  for (const row of rawPinAnalytics) {
    if (seenPin.has(row.pin_id)) continue
    seenPin.add(row.pin_id)
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
    actionable.push({
      id: row.id,
      pin_id: row.pin_id,
      titel: pin?.titel ?? null,
      klicks: row.klicks,
      impressionen: row.impressionen,
      ctr,
      alterTage,
      letzterAnalyticsDatum: row.datum,
      pinterestUrl: pin?.pinterest_pin_url ?? null,
      diagnose,
      handlung: PIN_HANDLUNG[diagnose],
      boardId: pin?.board_id ?? null,
      // Board-Felder werden nach boardsHealth-Berechnung gefüllt.
      boardName: null,
      boardScoreLabel: null,
      boardHasAnalytics: false,
    })
  }
  const hasAnyAnalytics = rawPinAnalytics.length > 0
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

  // Pins pro Board zählen (alle Status-Stufen — Entwurf, geplant, veröffentlicht).
  // Wird in Board-Gesundheit als „Pins in deiner Datenbank auf diesem Board" angezeigt.
  const pinsCountByBoard = new Map<string, number>()
  for (const p of allPinsRows) {
    if (!p.board_id) continue
    pinsCountByBoard.set(p.board_id, (pinsCountByBoard.get(p.board_id) ?? 0) + 1)
  }

  // ===== Strategie-Check (180 Tage, IST vs. SOLL) =====
  // Vergleicht IST-Verteilung der Pins der letzten 180 Tage mit den SOLL-Werten
  // aus den Strategie-Einstellungen. Pure Berechnung in strategie-check/lib.ts.
  const strategieCheckResult = computeStrategieCheck(
    allPinsRows as StrategiePinRow[],
    (settingsRes.data ?? null) as StrategieSettings | null,
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
  const boardThresholds = boardThresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerteBoard> | null
  )
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

  // ER pro Board (latest entry); Profil-ER = Mittelwert über Boards mit Analytics.
  // Board-ER = engagement ÷ impressionen × 100 — gleiche Definition wie
  // Analytics-Seite (engagement ist der vom Nutzer eingetragene Pinterest-
  // Wert „Engagement" / „Interaktionen", NICHT die Summe der Einzelmetriken).
  const boardErRaw = boardsRows.map((b) => {
    const ba = latestBaByBoard.get(b.id) ?? null
    const impressionen = ba?.impressionen ?? 0
    const interaktionen = ba?.engagement ?? 0
    const er = ba
      ? calcBoardEngagementRate(interaktionen, impressionen)
      : null
    return { board: b, ba, er, interaktionen, impressionen }
  })
  // Profil-ER = Durchschnitt ALLER Boards mit Analytics-Eintrag UND berechenbarer ER
  // (impressionen > 0 — sonst wäre ER null und nicht definiert).
  const erInputs = boardErRaw.filter((x) => x.ba !== null && x.er !== null)
  const validErs = erInputs.map((x) => x.er as number)
  const profilEr =
    validErs.length > 0
      ? validErs.reduce((s, x) => s + x, 0) / validErs.length
      : null

  // Cutoff für „Top X %" über alle Boards mit gültiger ER
  const allErsForCutoff = boardErRaw
    .map((x) => x.er)
    .filter((er): er is number => er !== null)
  const topCutoffEr = topPercentCutoff(
    allErsForCutoff,
    boardThresholds.topProzent
  )

  const boardsHealth: BoardDashHealth[] = boardErRaw.map(({ board, ba, er }) => {
    const lastPinEntry = lastPinByBoard.get(board.id) ?? null
    const lastPin = lastPinEntry?.date ?? null
    const lastPinAlter = lastPin ? Math.max(0, diffDays(lastPin, today)) : null
    const status = diagnoseBoard({
      lastPinAlterTage: lastPinAlter,
      thresholds: boardThresholds,
    })
    const prevBa = prevBaByBoard.get(board.id) ?? null
    const erPrev = prevBa
      ? calcBoardEngagementRate(prevBa.engagement, prevBa.impressionen)
      : null
    const { score, dataInsufficient, trendPct } = scoreBoardHybrid({
      er,
      erVormonat: erPrev,
      topCutoffEr,
      thresholds: boardThresholds,
    })
    const erChangePct = trendPct
    return {
      id: board.id,
      name: board.name,
      pinterestUrl: board.pinterest_url ?? null,
      status,
      score,
      engagementRate: er,
      engagementRatePrev: erPrev,
      engagementRateChangePct: erChangePct,
      trendPct,
      dataInsufficient,
      impressionen: ba?.impressionen ?? 0,
      klicks: ba?.ausgehende_klicks ?? 0,
      hasAnalytics: !!ba,
      anzahlPins: ba ? (ba.anzahl_pins ?? 0) : null,
      lastPinDate: lastPin,
      lastPinAlterTage: lastPinAlter,
      lastPinId: lastPinEntry?.id ?? null,
    }
  })

  // Board-Verknüpfung pro Pin — anreichern, sobald boardsHealth existiert.
  // Klassifizierung 1:1 aus assignCategory (gleiche Logik wie Board-Gesundheit-
  // Sektion):
  //   - Inaktiv + (top|wachstum) → 'Schlafend'
  //   - Inaktiv + solide          → 'Inaktiv'
  //   - Inaktiv + schwach         → 'Schwach' (Performance dominiert)
  //   - Sonst                     → score-Label
  const boardHealthById = new Map<string, BoardDashHealth>()
  for (const b of boardsHealth) boardHealthById.set(b.id, b)
  for (const p of actionable) {
    if (!p.boardId) continue
    const b = boardHealthById.get(p.boardId)
    if (!b) continue
    p.boardName = b.name
    p.boardHasAnalytics = b.hasAnalytics
    if (!b.hasAnalytics) {
      p.boardScoreLabel = null
      continue
    }
    if (b.status === 'inaktiv') {
      if (b.score === 'top' || b.score === 'wachstum') {
        p.boardScoreLabel = 'Schlafend'
        continue
      }
      if (b.score === 'solide') {
        p.boardScoreLabel = 'Inaktiv'
        continue
      }
      // schwach + inaktiv → fällt durch zur Score-Zuordnung unten
    }
    if (b.score === 'top') p.boardScoreLabel = 'Top'
    else if (b.score === 'wachstum') p.boardScoreLabel = 'Wachstum'
    else if (b.score === 'solide') p.boardScoreLabel = 'Solide'
    else p.boardScoreLabel = 'Schwach'
  }

  type BoardAssignment = BoardCat | 'ohne_analytics' | 'leeres_board'
  // Routing-Reihenfolge:
  //   1. Inaktiv + (Top|Wachstum) → schlafende_top
  //   2. Inaktiv + Solide          → inaktive
  //   3. Schwach (egal welcher Status) → schwach
  //   4. Sonst (aktiv|wenig_aktiv) → score (top|wachstum|solide)
  // „inaktive" enthält nur solide Boards ohne Aktivität — schwache inaktive
  // Boards landen weiterhin in der Schwach-Kategorie (Performance-Issue
  // dominiert über Aktivitäts-Issue).
  function assignCategory(b: BoardDashHealth): BoardAssignment {
    if (!b.hasAnalytics) return 'ohne_analytics'
    if ((b.anzahlPins ?? 0) <= 0) return 'leeres_board'
    if (b.status === 'inaktiv') {
      if (b.score === 'top' || b.score === 'wachstum') return 'schlafende_top'
      if (b.score === 'solide') return 'inaktive'
      // schwach + inaktiv → Schwach-Kategorie (Performance dominiert)
    }
    return b.score
  }

  const boardsByCategory: Record<BoardCat, BoardDashHealth[]> = {
    schlafende_top: [],
    inaktive: [],
    top: [],
    wachstum: [],
    solide: [],
    schwach: [],
  }
  const boardsOhneAnalytics: BoardDashHealth[] = []
  const boardsLeer: BoardDashHealth[] = []

  for (const b of boardsHealth) {
    const assignment = assignCategory(b)
    if (assignment === 'ohne_analytics') {
      boardsOhneAnalytics.push(b)
    } else if (assignment === 'leeres_board') {
      boardsLeer.push(b)
    } else {
      boardsByCategory[assignment].push(b)
    }
  }
  // Innerhalb jeder Kategorie nach ER DESC sortieren. Solide enthält jetzt
  // nur noch aktive/wenig_aktive Boards (inaktive solide → eigene Kategorie),
  // daher reicht reine ER-Sortierung überall.
  for (const key of Object.keys(boardsByCategory) as BoardCat[]) {
    boardsByCategory[key].sort(
      (a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0)
    )
  }

  // [BOARD-DEBUG] Prüfung der Status- und Kategorie-Logik pro Board.
  // Zeigt: letzter Pin, Alter in Tagen, Status, Score, Kategorie + die
  // tatsächlich verwendeten Schwellwerte (kommen aus einstellungen, fallen
  // bei NULL auf die Defaults wenigAktiv=14 / inaktiv=30 zurück).
  console.log(
    `[BOARD-DEBUG] Schwellwerte aktiv: wenigAktiv=${boardThresholds.wenigAktiv} Tage, inaktiv=${boardThresholds.inaktiv} Tage (Defaults: 14/30)`
  )
  for (const b of boardsHealth) {
    const cat = assignCategory(b)
    console.log(
      `[BOARD-DEBUG] „${b.name}": letzter Pin=${b.lastPinDate ?? 'kein Pin'} | Alter=${b.lastPinAlterTage ?? '—'} Tage | Status=${b.status} | Score=${b.score} | Kategorie=${cat}`
    )
  }

  // Aktivitätsrate = Anteil der Boards, die in den letzten 14 Tagen
  // einen neuen Pin bekommen haben (Basis: alle angelegten Boards).
  const aktivBoardsCount = boardsRows.filter((b) => {
    const lastPin = lastPinDateByBoard.get(b.id)
    if (!lastPin) return false
    return diffDays(lastPin, today) <= 14
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
    profilEr,
  }
  const hasAnyBoardAnalytics = boardsHealth.some((b) => b.hasAnalytics)
  const boardsOhneAnalyticsCount = boardsOhneAnalytics.length
  const boardsLeerCount = boardsLeer.length

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
    schlafendeTopCount: boardsByCategory.schlafende_top.length,
    aktivitaetsratePct: boardKpis.aktivitaetsratePct,
    schwacheCount: boardsByCategory.schwach.length,
    strategieOnboardingDone: strategieCheckResult.onboardingAbgeschlossen,
    strategieSchwelleRot: strategieCheckResult.schwelleRot,
    strategieTopCoaching: strategieCheckResult.coachingTop3[0]
      ? {
          area: strategieCheckResult.coachingTop3[0].area,
          label: strategieCheckResult.coachingTop3[0].label,
          diff: strategieCheckResult.coachingTop3[0].diff,
          recommendation:
            strategieCheckResult.coachingTop3[0].recommendation,
        }
      : null,
    hasAnyAnalytics,
    hiddenGemCount: groupedActions.get('hidden_gem')?.length ?? 0,
    optimierungCount:
      groupedActions.get('hohe_impressionen_niedrige_ctr')?.length ?? 0,
    aktivTopPerformerCount:
      groupedActions.get('aktiver_top_performer')?.length ?? 0,
    eingeschlafenerGewinnerCount:
      groupedActions.get('eingeschlafener_gewinner')?.length ?? 0,
    inhalteOhneAktuellCount: inhaltePinBedarfB.length,
    inhalteMitWenigPinsCount: inhaltePinBedarfA.length,
    urlsPotenzialCount: urlPotenzial.length,
  })

  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          {greetingName
            ? `Willkommen zurück, ${greetingName} 👋`
            : 'Willkommen zurück 👋'}
        </p>
      </header>

      {/* 1. Hero-Section: Status + Profil-Gesundheit fusioniert */}
      <HeroSection
        statusTri={updateStatusTri}
        pinsCount={veroeffentlichtePinsCount}
        boardsCount={boardsCount}
        ctr={latest?.ctr ?? null}
        engagement={latest?.engagement ?? null}
        impressionenGrowth={latest?.impressionen_growth ?? null}
        briefingItems={briefingItems}
      />

      {/* 2. Phasen-Trenner */}
      <PhasenTrenner title="Wo stehst du?" />

      {/* 3. Gesamt-Profil-Performance (KPIs + Performance-Verlauf in 3 Spalten) */}
      <ProfilPerformanceSection
        latest={latest}
        previous={previous}
        chartPoints={chartPoints}
      />

      {/* 4. Phasen-Trenner */}
      <PhasenTrenner title="Pinst du das Richtige?" />

      {/* 5. Strategie-Check */}
      <StrategieCheckSection result={strategieCheckResult} />

      {/* 6. Phasen-Trenner */}
      <PhasenTrenner title="Was tust du heute?" />

      {/* 7. Saisonkalender */}
      <SaisonKalenderSection columns={saisonKanban} />

      {/* 8. Content Pipeline */}
      <PinPipelineSection
        inhaltePinBedarfA={inhaltePinBedarfA}
        inhaltePinBedarfB={inhaltePinBedarfB}
        urlPotenzial={urlPotenzial}
        thresholds={pipelineThresholds}
      />

      {/* 9. Pin-Handlungsbedarf */}
      <HandlungsbedarfSection
        grouped={groupedActions}
        hasAnyAnalytics={hasAnyAnalytics}
        bearbeitet={bearbeitet}
        today={today}
        thresholds={thresholds}
      />

      {/* 10. Phasen-Trenner */}
      <PhasenTrenner title="Wo verbesserst du strukturell?" />

      {/* 11. Board-Gesundheit */}
      <BoardGesundheitDashboardSection
        byCategory={boardsByCategory}
        kpis={boardKpis}
        thresholds={boardThresholds}
        hasAnyBoardAnalytics={hasAnyBoardAnalytics}
        boardsOhneAnalyticsCount={boardsOhneAnalyticsCount}
        boardsLeerCount={boardsLeerCount}
        pinsCountByBoard={pinsCountByBoard}
      />

      {/* 12. Phasen-Trenner */}
      <PhasenTrenner title="Was steht noch an?" />

      {/* 14. Aufgaben & Erinnerungen — bleibt ganz unten */}
      <AufgabenSection tasks={aufgabenSorted} today={today} />
    </div>
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
          Noch kein Analytics-Update —{' '}
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
            — Vergleich zu {formatDateDe(previous.datum)}
            {deltaTage !== null && <>, Δ {deltaTage} Tage</>}
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
            tooltip="Wie oft Nutzer von Pinterest auf deine Website geklickt haben. Das ist deine wichtigste Metrik — sie zeigt echten Traffic."
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
            tooltip="(Saves + Klicks) ÷ Impressionen. Standard Pins Durchschnitt: 0,15–0,25%. Über 1% ist ausgezeichnet."
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
            tooltip="Alle Menschen die deinen Content gesehen haben — auf Pinterest und außerhalb."
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
            tooltip="Menschen die aktiv reagiert haben — geklickt, gespeichert oder kommentiert. Qualitativ wertvoller als Gesamtzielgruppe."
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

// ===========================================================
// Profil-Gesundheit Widget
// ===========================================================
function ProfilGesundheitWidget({
  ctr,
  engagement,
  impressionenGrowth,
  embedded = false,
}: {
  ctr: number | null
  engagement: number | null
  impressionenGrowth: number | null
  embedded?: boolean
}) {
  type StatusKey =
    | 'stark'
    | 'wachsend'
    | 'solide'
    | 'aufbau'
    | 'optimieren'
    | 'leer'

  console.log('[ProfilGesundheit] received:', {
    ctr,
    engagement,
    impressionenGrowth,
  })

  const ctrFmt = ctr !== null ? formatPercent(ctr) : '—'
  const engagementFmt = engagement !== null ? formatPercent(engagement) : '—'

  const status: StatusKey = (() => {
    if (ctr === null || engagement === null) return 'leer'
    if (ctr >= 1.54 && engagement >= 1) return 'stark'
    if (ctr >= 1 && engagement >= 0.5) return 'wachsend'
    if (ctr >= 0.5 && engagement >= 0.25) return 'solide'
    if (ctr >= 0.5 || engagement >= 0.15) return 'aufbau'
    return 'optimieren'
  })()

  console.log('[ProfilGesundheit] computed status:', status)

  const showImpWarn =
    impressionenGrowth !== null &&
    Number.isFinite(impressionenGrowth) &&
    impressionenGrowth < -10

  const solideText = (() => {
    const base =
      engagement !== null && engagement >= 1
        ? `Deine Engagement Rate (${engagementFmt}) ist ausgezeichnet — weit über dem Durchschnitt (0,15–0,25%). Schwachpunkt: CTR (${ctrFmt}) noch unter 1%. Pinterest spielt deine Pins aus und Nutzer interagieren — aber der Hook könnte überzeugender sein. Optimiere Titel und Design der Pins mit niedrigster CTR im Handlungsbedarf.`
        : `CTR (${ctrFmt}) und Engagement Rate (${engagementFmt}) im soliden Bereich. Nächster Schritt: Hooks der Pins mit hohen Impressionen aber niedriger CTR optimieren — schau in den Handlungsbedarf.`
    return showImpWarn
      ? `${base} ⚠️ Impressionen rückläufig (${formatGrowth(
          impressionenGrowth
        )}) — Pinning-Frequenz erhöhen oder Keywords überarbeiten.`
      : base
  })()

  const config: Record<
    StatusKey,
    { emoji: string; label: string; text: string; cls: string }
  > = {
    stark: {
      emoji: '🟢',
      label: 'Stark',
      text: 'Dein Profil performt über dem Pinterest-Durchschnitt (organische CTR: 1,54%). Skaliere was funktioniert — produziere Varianten deiner Top Performer und erweitere erfolgreiche Keyword-Cluster.',
      cls: 'border-green-200 bg-green-50 text-green-900',
    },
    wachsend: {
      emoji: '🟢',
      label: 'Wachsend',
      text: `Solide Performance über dem Branchendurchschnitt. Deine CTR (${ctrFmt}) zeigt dass deine Hooks funktionieren. Nächster Fokus: Impressionen steigern durch mehr Pins und stärkere Keywords.`,
      cls: 'border-green-200 bg-green-50 text-green-900',
    },
    solide: {
      emoji: '🟡',
      label: 'Solide',
      text: solideText,
      cls: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    },
    aufbau: {
      emoji: '🟡',
      label: 'Aufbauphase',
      text: 'Erste Signale sichtbar — der Account wächst. Pinterest braucht 3–6 Monate um thematische Autorität aufzubauen. Konsistenz ist jetzt wichtiger als Perfektion. Halte deinen monatlichen Produktionstag ein.',
      cls: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    },
    optimieren: {
      emoji: '🔴',
      label: 'Optimierungsbedarf',
      text: 'Deine Zahlen liegen unter dem Pinterest-Durchschnitt (organische CTR: 1,54%, Engagement Standard Pins: 0,15–0,25%). Häufigste Ursachen: schwache Hooks, falsche Keywords oder zu wenig Pins. Starte mit dem Handlungsbedarf — dort siehst du welche Pins sofortige Aufmerksamkeit brauchen.',
      cls: 'border-red-200 bg-red-50 text-red-900',
    },
    leer: {
      emoji: '⚪',
      label: 'Noch keine Daten',
      text: 'Trage deine ersten Analytics ein um deinen Profil-Gesundheits-Score zu sehen.',
      cls: 'border-gray-200 bg-gray-50 text-gray-700',
    },
  }
  const c = config[status]

  // Bei „solide" steckt die Impressionen-Warnung schon im Text — keine Doppel-Anzeige.
  const showSeparateWarn = showImpWarn && status !== 'solide'

  // Embedded-Mode: kein eigener Hintergrund/Border — Hero-Section liefert
  // den einheitlichen Status-Hintergrund. Erkennbar bleibt der Status durch
  // Ampel-Icon, Titel und Coaching-Text.
  const innerCls = embedded
    ? 'flex flex-wrap items-start gap-3 px-1 text-sm text-gray-800'
    : `flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 text-sm ${c.cls}`

  return (
    <div className={embedded ? 'space-y-2' : 'mt-4 space-y-2'}>
      <div className={innerCls}>
        <span className="text-lg leading-tight" aria-hidden>
          {c.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Profil-Gesundheit: {c.label}</p>
          <p className="mt-0.5 text-gray-700">{c.text}</p>
          {status !== 'leer' && (
            <p className="mt-1.5 text-xs">
              <span aria-hidden>→ </span>
              <a
                href="#gesamt-profil-performance"
                className="text-gray-600 underline hover:opacity-80"
              >
                Alle KPIs im Detail
              </a>
            </p>
          )}
        </div>
      </div>
      {showSeparateWarn && (
        <div className="warn-box flex items-start gap-3">
          <span className="text-lg leading-tight" aria-hidden>
            🚨
          </span>
          <p>
            <span className="font-semibold">
              Impressionen rückläufig ({formatGrowth(impressionenGrowth)})
            </span>{' '}
            — Pinning-Frequenz prüfen oder Keywords überarbeiten.
          </p>
        </div>
      )}
    </div>
  )
}

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
  kind: 'klicks' | 'impressionen' | 'ctr' | 'alter' | 'datum' | 'push',
  pin: HandlungsbedarfPin
): string {
  switch (kind) {
    case 'klicks':
      return formatZahl(pin.klicks)
    case 'impressionen':
      return formatZahl(pin.impressionen)
    case 'ctr':
      return formatPercent(pin.ctr)
    case 'alter':
      return `${pin.alterTage} Tage`
    case 'datum':
      return formatDateDe(pin.letzterAnalyticsDatum)
    case 'push': {
      const remaining = 70 - pin.alterTage
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
      <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
      <p className="mt-1 text-sm text-gray-600">
        Pins, die aktuell eine konkrete Maßnahme brauchen.
      </p>
      <div className="achtung-box mt-2">
        ⚠️ Erstelle immer einen neuen Pin – bearbeite nie den bei Pinterest
        veröffentlichten Pin. Hake den Pin ab sobald die Handlung erfolgt
        ist.
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

        <p className="pt-2 text-xs text-gray-500">
          <Link
            href="/dashboard/einstellungen#pin-schwellwerte"
            className="font-medium text-red-600 hover:underline"
          >
            Schwellwerte in den Einstellungen anpassen ↗
          </Link>
        </p>
      </div>
    </section>
  )
}

const PUSH_TOOLTIP =
  'Pinterest pusht neue Pins in den ersten 60-90 Tagen besonders stark – das nennt sich Push-Window oder Honeymoon-Phase. In dieser Zeit reicht der Algorithmus den Pin proaktiv neuen Zielgruppen aus. Danach läuft er nur noch über Saves und natürliche Reichweite. Wenn ein Pin in dieser Phase außergewöhnlich gut läuft hast du ein kurzes Zeitfenster um das Maximum rauszuholen — produziere Varianten während der Algorithmus deinem Profil gerade vertraut. Pinterest lernt dann: Diese Person macht guten Content zu diesem Thema und pusht die nächsten Pins bevorzugt.'

function buildPinData(p: ActionablePin): HandlungsbedarfPin {
  return {
    id: p.id,
    pin_id: p.pin_id,
    titel: p.titel,
    klicks: p.klicks,
    impressionen: p.impressionen,
    ctr: p.ctr,
    alterTage: p.alterTage,
    letzterAnalyticsDatum: p.letzterAnalyticsDatum,
    pinterestUrl: p.pinterestUrl,
    boardName: p.boardName,
    boardScoreLabel: p.boardScoreLabel,
    boardHasAnalytics: p.boardHasAnalytics,
  }
}

function buildMetrics(cat: HandlungsCategory, pinData: HandlungsbedarfPin) {
  return cat.metrics
    .map((kind) => ({
      label: cat.metricLabels[kind] ?? '',
      value: formatMetric(kind, pinData),
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

  // Top-Performer-Tooltip dynamisch mit aktuellen Schwellwerten — die anderen
  // Kategorien nutzen weiterhin den statischen Text aus der Konfiguration.
  const ctrText = String(thresholds.mindestCtr).replace('.', ',')
  const tooltip =
    cat.diagnose === 'aktiver_top_performer'
      ? `Pins, die alle drei Kriterien erfüllen:\n` +
        `- Mehr als ${thresholds.mindestKlicks} Klicks\n` +
        `- CTR über ${ctrText}%\n` +
        `- Jünger als ${thresholds.mindestAlter} Tage\n\n` +
        `Diese Pins laufen aktiv und profitieren vom Algorithmus-Push. Varianten produzieren, solange der Push aktiv ist.`
      : cat.tooltip

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
          <ul className="divide-y divide-gray-100">
            {visiblePins.map((p) => {
              const pinData = buildPinData(p)
              return (
                <HandlungsbedarfPinRow
                  key={p.id}
                  pin={pinData}
                  kategorie={cat.diagnose}
                  metrics={buildMetrics(cat, pinData)}
                  primaryAction={cat.primaryAction}
                  bonusImpressionenSchwelle={
                    thresholds.topPerformerBonusImpressionen
                  }
                />
              )
            })}
          </ul>
          {remaining > 0 && (
            <details className="border-t border-gray-100">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-red-600 hover:underline">
                + {remaining} weitere Pin{remaining === 1 ? '' : 's'} anzeigen
              </summary>
              <ul className="divide-y divide-gray-100">
                {pins.slice(3).map((p) => {
                  const pinData = buildPinData(p)
                  return (
                    <HandlungsbedarfPinRow
                      key={p.id}
                      pin={pinData}
                      kategorie={cat.diagnose}
                      metrics={buildMetrics(cat, pinData)}
                      primaryAction={cat.primaryAction}
                      bonusImpressionenSchwelle={
                        thresholds.topPerformerBonusImpressionen
                      }
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
          Saisonale Themen brauchen 6–12 Wochen Vorlauf — hier siehst du,
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
  const visible = events.slice(0, 2)
  const hidden = events.slice(2)

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
          label="Content Pipeline – Was als nächstes pinnen?"
          tooltip="Diese Sektion zeigt zwei Quellen: bestehende Inhalte, die mehr Pins brauchen oder veraltete Pins haben, plus URLs mit hoher CTR aber wenig Pins (Goldnugget-Logik)."
        />
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Inhalte und URLs aus deiner Datenbank, die noch Pin-Material
        brauchen.
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
    <li className="space-y-2 px-4 py-3">
      <div className="text-[15px] font-semibold text-gray-900">{item.titel}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">{meta}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/pin-produktion?content_id=${item.id}&open=new`}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Pin erstellen
          </Link>
          {item.primaryUrl && (
            <a
              href={item.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Zur Ziel-URL ↗
            </a>
          )}
        </div>
      </div>
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
    <li className="space-y-2 px-4 py-3">
      <div className="text-[15px] font-semibold text-gray-900">{display}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">
          {url.pinCount} Pin{url.pinCount === 1 ? '' : 's'} · Ø CTR:{' '}
          <strong className="text-gray-900">{ctrText}%</strong>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/pin-produktion?open=new"
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Pin erstellen
          </Link>
          <a
            href={url.basisUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            URL öffnen ↗
          </a>
        </div>
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
  byCategory,
  kpis,
  thresholds,
  hasAnyBoardAnalytics,
  boardsOhneAnalyticsCount,
  boardsLeerCount,
  pinsCountByBoard,
}: {
  byCategory: Record<BoardCat, BoardDashHealth[]>
  kpis: {
    boardsTotal: number
    aktivitaetsratePct: number
    aktivBoardsCount: number
    avgLastPinDays: number | null
    profilEr: number | null
  }
  thresholds: BoardThresholds
  hasAnyBoardAnalytics: boolean
  boardsOhneAnalyticsCount: number
  boardsLeerCount: number
  pinsCountByBoard: Map<string, number>
}) {
  const headingTooltip =
    'Pinterest ist eine Suchmaschine — Keywords bestimmen wer dich findet, Boards bestimmen ob Pinterest dir vertraut. Inaktive Boards bremsen alle Pins darauf und schaden deiner thematischen Autorität. Top Boards signalisieren thematische Expertise und geben neuen Pins automatisch mehr Reichweite.'

  const heading = (
    <>
      <h2 className="text-lg font-semibold text-gray-900">
        <LabelWithTooltip
          label="Board-Gesundheit"
          tooltip={headingTooltip}
        />
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Boards bestimmen, wie thematisch vertraut Pinterest deinem Profil
        ist. Engagement Rate ist hier wichtiger als Klicks – sie zeigt,
        ob Nutzer:innen mit deinen Themen interagieren.
      </p>
    </>
  )

  if (!hasAnyBoardAnalytics) {
    return (
      <section id="board-gesundheit" className="scroll-mt-4">
        {heading}
        <div className="achtung-box mt-3">
          ⚠️ Noch keine Board-Analytics eingetragen. Trage deine ersten Board-Daten
          ein um die Board-Gesundheit zu sehen.{' '}
          <Link
            href="/dashboard/analytics?tab=boards"
            className="font-medium underline hover:opacity-80"
          >
            → Zum Boards-Tab
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="board-gesundheit" className="scroll-mt-4">
      {heading}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BoardKpiCell
          label="Ø Engagement Rate"
          value={formatPercent(kpis.profilEr)}
          tooltip="Bei Boards die wichtigste Erfolgs-Metrik. Zeigt, ob Pinterest-Nutzer:innen mit deinen Themen interagieren – das signalisiert dem Algorithmus thematische Autorität."
          highlight
        />
        <BoardKpiCell
          label="Aktivitätsrate"
          value={`${formatPercent(kpis.aktivitaetsratePct, 0)} aktiv`}
          sub={`${kpis.aktivBoardsCount} von ${kpis.boardsTotal} Boards`}
          tooltip="Anteil der Boards, die in den letzten 14 Tagen einen neuen Pin bekommen haben. Pinterest belohnt aktive Boards mit mehr Reichweite."
          accent={aktivitaetAccent(kpis.aktivitaetsratePct)}
        />
        <BoardKpiCell
          label="Ø Letzter Pin"
          value={
            kpis.avgLastPinDays === null
              ? '—'
              : kpis.avgLastPinDays === 0
                ? 'heute'
                : kpis.avgLastPinDays === 1
                  ? 'vor 1 Tag'
                  : `vor ${kpis.avgLastPinDays} Tagen`
          }
          tooltip="Im Durchschnitt vor wie vielen Tagen wurde auf deinen Boards zuletzt ein Pin veröffentlicht. Frequenz ist der wichtigste Hebel für Board-Performance."
          accent={avgPinAccent(kpis.avgLastPinDays)}
        />
      </div>

      <BoardKurzanalyse
        aktivitaetsratePct={kpis.aktivitaetsratePct}
        avgLastPinDays={kpis.avgLastPinDays}
        profilEr={kpis.profilEr}
      />

      {(() => {
        const categoriesA = BOARD_CATEGORIES.filter((c) => c.group === 'A')
        const categoriesB = BOARD_CATEGORIES.filter((c) => c.group === 'B')
        const countA = categoriesA.reduce(
          (s, cat) => s + (byCategory[cat.key]?.length ?? 0),
          0
        )
        const countB = categoriesB.reduce(
          (s, cat) => s + (byCategory[cat.key]?.length ?? 0),
          0
        )
        return (
          <div className="mt-3">
            {/* Gruppe A — Brauchen Aufmerksamkeit */}
            <BoardGruppeHeader group="A" count={countA} />
            <div className="mt-3 space-y-3">
              {categoriesA.map((cat) => (
                <BoardKategorieCard
                  key={cat.key}
                  cat={cat}
                  boards={byCategory[cat.key]}
                  thresholds={thresholds}
                  pinsCountByBoard={pinsCountByBoard}
                />
              ))}
            </div>

            {/* Gruppe B — Performen gut (leicht ausgegraut) */}
            <div className="mt-7 opacity-85">
              <BoardGruppeHeader group="B" count={countB} />
              <div className="mt-3 space-y-3">
                {categoriesB.map((cat) => (
                  <BoardKategorieCard
                    key={cat.key}
                    cat={cat}
                    boards={byCategory[cat.key]}
                    thresholds={thresholds}
                    pinsCountByBoard={pinsCountByBoard}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-gray-500">
          <Link
            href="/dashboard/einstellungen#board-schwellwerte"
            className="font-medium text-red-600 hover:underline"
          >
            Schwellwerte in den Einstellungen anpassen ↗
          </Link>
          <Link
            href="/dashboard/boards"
            className="font-medium text-red-600 hover:underline"
          >
            Alle Boards in der Übersicht ansehen ↗
          </Link>
          {boardsOhneAnalyticsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <span aria-hidden>ⓘ</span>
              <span>
                {boardsOhneAnalyticsCount}{' '}
                {boardsOhneAnalyticsCount === 1
                  ? 'Board ohne'
                  : 'Boards ohne'}{' '}
                Analytics-Einträge —{' '}
                <Link
                  href="/dashboard/analytics?tab=boards"
                  className="font-medium text-red-600 hover:underline"
                >
                  Daten eintragen ↗
                </Link>
              </span>
            </span>
          )}
          {boardsLeerCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <span aria-hidden>ⓘ</span>
              <span>
                {boardsLeerCount}{' '}
                {boardsLeerCount === 1 ? 'leeres Board' : 'leere Boards'} ohne
                Pins — erste Pins veröffentlichen um Daten zu sehen
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

// ===========================================================
// Board-Gruppen-Header (A: Brauchen Aufmerksamkeit, B: Performen gut)
// ===========================================================
function BoardGruppeHeader({
  group,
  count,
}: {
  group: 'A' | 'B'
  count: number
}) {
  if (group === 'A') {
    const isEmpty = count === 0
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span aria-hidden className="text-base leading-none">
            {isEmpty ? '👍' : '⚠️'}
          </span>
          Brauchen Aufmerksamkeit
        </h3>
        <p className="text-xs text-gray-500">
          {isEmpty ? (
            <>
              0 Boards mit Handlungsbedarf
              <span className="ml-2 font-medium text-green-700">
                ✓ Stark, alle Boards laufen stabil!
              </span>
            </>
          ) : (
            <>{count} Boards mit Handlungsbedarf</>
          )}
        </p>
      </div>
    )
  }
  // Gruppe B
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
      <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500">
        <span aria-hidden className="text-base leading-none">
          ✓
        </span>
        Performen gut
      </h3>
      <p className="text-xs text-gray-500">
        {count === 0
          ? '0 Boards laufen aktuell stabil'
          : `${count} Boards laufen stabil`}
      </p>
    </div>
  )
}

// Regelbasierte Kurzanalyse — keine KI, nur Textbausteine je nach Datenwert.
// Schwellwerte hier als Konstanten; bei Bedarf später nach einstellungen
// auslagern (analog zu boardThresholds).
function BoardKurzanalyse({
  aktivitaetsratePct,
  avgLastPinDays,
  profilEr,
}: {
  aktivitaetsratePct: number
  avgLastPinDays: number | null
  profilEr: number | null
}) {
  const lines: string[] = []

  // Baustein 1 — Aktivitätsrate
  if (aktivitaetsratePct >= 70) {
    lines.push('Deine Boards sind aktiv – das ist eine starke Basis.')
  } else if (aktivitaetsratePct >= 40) {
    lines.push(
      'Etwa die Hälfte deiner Boards wird aktiv bepinnt – hier ist Luft nach oben.'
    )
  } else {
    const inaktivPct = Math.round(100 - aktivitaetsratePct)
    lines.push(
      `${inaktivPct}% deiner Boards sind nicht aktiv – das bremst dein Pinterest-Wachstum.`
    )
  }

  // Baustein 2 — Ø Letzter Pin
  if (avgLastPinDays !== null) {
    const d = avgLastPinDays
    if (d <= 7) {
      lines.push(
        'Im Schnitt pinnst du fast täglich – der Algorithmus bekommt konstant Material.'
      )
    } else if (d <= 14) {
      lines.push(
        'Im Schnitt pinnst du etwa wöchentlich – solide, könnte aber öfter sein.'
      )
    } else if (d <= 30) {
      lines.push(
        `Im Schnitt wird auf jedem Board nur alle ${d} Tage gepinnt – das ist zu wenig für stabiles Wachstum.`
      )
    } else {
      lines.push(
        `Im Schnitt wird auf jedem Board nur alle ${d} Tage gepinnt – das ist deutlich zu wenig für Pinterest-Wachstum.`
      )
    }
  }

  // Baustein 3 — Ø Engagement Rate
  if (profilEr !== null) {
    if (profilEr >= 5) {
      lines.push(
        'Deine Engagement Rate ist überdurchschnittlich – Pinterest erkennt thematische Stärke.'
      )
    } else if (profilEr >= 3) {
      lines.push('Deine Engagement Rate ist solide – über dem Pinterest-Schnitt.')
    } else if (profilEr >= 1.5) {
      lines.push(
        'Deine Engagement Rate liegt im normalen Bereich – Optimierungspotenzial vorhanden.'
      )
    } else {
      lines.push(
        'Deine Engagement Rate liegt unter dem Pinterest-Schnitt – Hooks und Themen prüfen.'
      )
    }
  }

  // Baustein 4 — Handlungsempfehlung. Reihenfolge = Priorität: erste passende
  // Regel gewinnt. Wenn keine kritische Bedingung greift und alle Werte im
  // grünen Bereich sind → „Weiter so". Sonst keine Empfehlung (40-69% mit
  // grüner ER bekommt z.B. keine, da kein klarer Hebel sichtbar).
  const r = aktivitaetsratePct
  const d = avgLastPinDays
  const er = profilEr
  let recHeading: string | null = null
  let recText: string | null = null
  if (r < 40 && d !== null && d > 14) {
    recHeading = '🎯 Größter Hebel'
    recText =
      'Pinning-Frequenz erhöhen – mindestens 3 neue Pins pro Woche pro aktivem Board.'
  } else if (r < 40 && d !== null && d <= 14) {
    recHeading = '🎯 Größter Hebel'
    recText =
      'Inaktive Boards reaktivieren – das Pinning auf mehr Boards verteilen.'
  } else if (r >= 70 && er !== null && er < 3) {
    recHeading = '🎯 Größter Hebel'
    recText =
      'Pin-Designs und Hooks optimieren – die Aktivität stimmt, aber das Engagement bleibt zurück.'
  } else if (
    r >= 70 &&
    (d === null || d <= 14) &&
    (er === null || er >= 3)
  ) {
    recText = '🎯 Weiter so – Dranbleiben ist der wichtigste Hebel.'
  }

  if (lines.length === 0 && !recText) return null

  return (
    <div className="coaching-box mt-3">
      {lines.length > 0 && (
        <div className="space-y-1.5">
          {lines.map((l, i) => (
            <p key={i} className="leading-relaxed">
              {l}
            </p>
          ))}
        </div>
      )}
      {(recHeading || recText) && (
        <div className={lines.length > 0 ? 'mt-2' : ''}>
          {recHeading && (
            <p className="font-medium leading-relaxed">{recHeading}</p>
          )}
          {recText && (
            <p
              className={
                recHeading
                  ? 'mt-1.5 leading-relaxed'
                  : 'font-medium leading-relaxed'
              }
            >
              {recText}
            </p>
          )}
        </div>
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

function BoardKategorieCard({
  cat,
  boards,
  thresholds,
  pinsCountByBoard,
}: {
  cat: BoardCatConfig
  boards: BoardDashHealth[]
  thresholds: BoardThresholds
  pinsCountByBoard: Map<string, number>
}) {
  const visible = boards.slice(0, 3)
  const remaining = boards.length - visible.length

  return (
    <details
      className="group rounded-lg border border-gray-200 bg-white shadow-sm"
    >
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
            <LabelWithTooltip label={cat.label} tooltip={cat.tooltip} />
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{cat.subtitle}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            boards.length === 0
              ? 'bg-gray-100 text-gray-400'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {boards.length === 0 && cat.emptyTooltip ? (
            <LabelWithTooltip
              label={String(boards.length)}
              tooltip={cat.emptyTooltip}
            />
          ) : (
            boards.length
          )}
        </span>
      </summary>

      {boards.length === 0 ? (
        <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
          {cat.emptyMessage}
        </div>
      ) : (
        <div className="border-t border-gray-200">
          <div className="coaching-box mx-4 my-3 space-y-1 text-xs font-medium">
            <div>{cat.hint}</div>
            <div>{cat.nextStep}</div>
          </div>
          <ul className="space-y-4 py-3">
            {visible.map((b) => (
              <BoardRow
                key={b.id}
                board={b}
                cat={cat}
                thresholds={thresholds}
                pinsInDb={pinsCountByBoard.get(b.id) ?? 0}
              />
            ))}
          </ul>
          {remaining > 0 && (
            <details className="group border-t border-gray-100">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                <span className="text-lg leading-none text-gray-400" aria-hidden>
                  <span className="inline group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                </span>
                <span>
                  {remaining} weitere Board{remaining === 1 ? '' : 's'} anzeigen
                </span>
              </summary>
              <ul className="space-y-4 py-3">
                {boards.slice(3).map((b) => (
                  <BoardRow
                key={b.id}
                board={b}
                cat={cat}
                thresholds={thresholds}
                pinsInDb={pinsCountByBoard.get(b.id) ?? 0}
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

// Deutsche ER-Formatierung mit Komma als Dezimaltrenner.
function fmtErDe(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(digits).replace('.', ',')}%`
}

// Vormonatsvergleich-Block.
//   - Verbesserung: 'ER 7,1% ↑ (Vormonat: 6,5%)' — nur Pfeil grün, Klammer grau.
//   - Verschlechterung: 'ER 7,1% ↓ (Vormonat: 7,8%)' — nur Pfeil rot, Klammer grau.
//   - 0%-Differenz: → in Grau.
//   - Kein Vormonat: 'ER 7,1% (kein Vormonat verfügbar)' — Klammer in Grau.
function ErWithTrend({ board }: { board: BoardDashHealth }) {
  const er = board.engagementRate
  const erPrev = board.engagementRatePrev
  const trend = board.trendPct
  if (erPrev === null || trend === null) {
    return (
      <span>
        ER <strong className="text-gray-900">{fmtErDe(er)}</strong>{' '}
        <span className="text-gray-500">(kein Vormonat verfügbar)</span>
      </span>
    )
  }
  const arrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→'
  const arrowCls =
    trend > 0
      ? 'text-green-700'
      : trend < 0
        ? 'text-red-700'
        : 'text-gray-500'
  return (
    <span>
      ER <strong className="text-gray-900">{fmtErDe(er)}</strong>{' '}
      <span className={`font-semibold ${arrowCls}`}>{arrow}</span>{' '}
      <span className="text-gray-500">(Vormonat: {fmtErDe(erPrev)})</span>
    </span>
  )
}

// Solide-Schwellwerte für „Was fehlt"-Hinweis (später in Einstellungen
// konfigurierbar — vorerst Konstanten).
const SOLIDE_PINS_MIN = 10
const SOLIDE_IMPRESSIONS_MIN = 1000
const SOLIDE_ER_TARGET = 5.0

// Liefert die Lücke des Solide-Boards als „[Defizit] – [Aktion]"-Phrase
// (ohne führendes „Was fehlt:"). Wird im warum-Text als Anschluss an
// „Stabile ER (X%), aber …" eingebaut. null = keine erkennbare Lücke.
function buildWasFehltText(b: BoardDashHealth): string | null {
  const pins = b.anzahlPins ?? 0
  const imp = b.impressionen
  const er = b.engagementRate
  if (pins < SOLIDE_PINS_MIN && imp < SOLIDE_IMPRESSIONS_MIN) {
    return 'wenig Pin-Volumen – mehr Material für Pinterest erstellen.'
  }
  if (pins >= SOLIDE_PINS_MIN && imp < SOLIDE_IMPRESSIONS_MIN) {
    return 'niedrige Reichweite – Keywords optimieren.'
  }
  if (
    pins >= SOLIDE_PINS_MIN &&
    imp >= SOLIDE_IMPRESSIONS_MIN &&
    er !== null &&
    er < SOLIDE_ER_TARGET
  ) {
    return 'niedriges Engagement – Pin-Designs und Hooks überarbeiten.'
  }
  return null
}

// Hinweis „vorbereitete Pins in der Datenbank" — nur in Kategorien mit
// ungenutztem Reaktivierungs-Potenzial: Schlafende Top, Solide, Schwach.
// Top/Wachstum sind bereits aktiv → kein Hinweis (gibt nur Rauschen).
//
// Differenz-Logik:
//   prepared = dbCount (alle Pins mit board_id) − publishedCount (anzahl_pins
//   aus board_analytics, also was Pinterest aktuell sieht).
// Wenn prepared > 0 → einsetzbares Reaktivierungs-Material vorhanden.
// Wenn prepared < 0 → Datenbank ist nicht synchron (Pinterest hat Pins, die
// in der lokalen Erfassung fehlen).
function buildPinsInDbLine(
  cat: BoardCat,
  dbCount: number,
  publishedCount: number | null
): string | null {
  if (cat === 'top' || cat === 'wachstum') return null
  // Sync-Lücke: lokale Erfassung kennt weniger Pins als Pinterest meldet.
  if (publishedCount !== null && dbCount < publishedCount) {
    return '📌 Datenbank nicht vollständig synchronisiert – einige veröffentlichte Pins fehlen noch in deiner Pin-Erfassung.'
  }
  const prepared = Math.max(0, dbCount - (publishedCount ?? 0))
  if (prepared <= 0) {
    return '📌 Keine vorbereiteten Pins in deiner Datenbank – Pin-Pipeline auffüllen für schnelle Reaktivierung.'
  }
  return `📌 ${prepared} weitere ${prepared === 1 ? 'Pin' : 'Pins'} in deiner Datenbank vorbereitet – sofort einsetzbar zur Reaktivierung.`
}

function buildWarumText(cat: BoardCat, b: BoardDashHealth): string {
  const er = fmtErDe(b.engagementRate)
  const trend = b.trendPct !== null ? Math.round(b.trendPct) : 0
  switch (cat) {
    case 'top':
      return `📊 Warum Top: Engagement Rate liegt mit ${er} deutlich über deinem Profil-Schnitt – Pinterest erkennt thematische Expertise.`
    case 'wachstum':
      return `📊 Warum spannend: Engagement Rate ist im Vergleich zum Vormonat um ${trend}% gestiegen – das Board nimmt Fahrt auf.`
    case 'solide': {
      const fehlt = buildWasFehltText(b)
      if (fehlt) return `📊 Stabile ER (${er}), aber ${fehlt}`
      return `📊 Stabile ER (${er}) – solide Performance.`
    }
    case 'schwach':
      return `📊 Warum schwach: Engagement Rate bei nur ${er} – Nutzer:innen interagieren wenig mit den Themen oder Pin-Designs.`
    case 'schlafende_top': {
      const tage = b.lastPinAlterTage !== null ? `${b.lastPinAlterTage}` : '—'
      return `📊 Warum schlafend: Hohe Engagement Rate (${er}), aber seit ${tage} Tagen keine neuen Pins – ungenutztes Potenzial.`
    }
    case 'inaktive': {
      const tage = b.lastPinAlterTage !== null ? `${b.lastPinAlterTage}` : '—'
      return `📊 Warum inaktiv: Stabile ER (${er}), aber seit ${tage} Tagen keine neuen Pins – Pinterest verliert das thematische Vertrauen.`
    }
  }
}

function BoardRow({
  board,
  cat,
  thresholds,
  pinsInDb,
}: {
  board: BoardDashHealth
  cat: BoardCatConfig
  thresholds: BoardThresholds
  pinsInDb: number
}) {
  const pins = board.anzahlPins ?? 0
  const isEmpty = pins <= 0
  const activityClass = cat.prominentLastPin
    ? 'text-orange-700 font-semibold'
    : 'text-gray-500'
  const lastPinText =
    board.lastPinAlterTage === null
      ? 'Noch kein veröffentlichter Pin'
      : board.lastPinAlterTage === 0
        ? 'Letzter Pin: heute'
        : board.lastPinAlterTage === 1
          ? 'Letzter Pin: vor 1 Tag'
          : `Letzter Pin: vor ${board.lastPinAlterTage} Tagen`
  const scoreTooltip = boardScoreTooltip({
    score: board.score,
    er: board.engagementRate,
    erVormonat: board.engagementRatePrev,
    trendPct: board.trendPct,
    dataInsufficient: board.dataInsufficient,
    thresholds,
    short: true,
  })
  const warum = buildWarumText(cat.key, board)

  const metricEls = cat.metrics
    .map((kind) => {
      switch (kind) {
        case 'er':
          return <ErWithTrend key={kind} board={board} />
        case 'impressionen':
          return (
            <span key={kind}>
              Impressionen{' '}
              <strong className="text-gray-900">
                {formatZahl(board.impressionen)}
              </strong>
            </span>
          )
        case 'klicks':
          return (
            <span key={kind}>
              Klicks{' '}
              <strong className="text-gray-900">
                {formatZahl(board.klicks)}
              </strong>
            </span>
          )
        default:
          return null
      }
    })
    .filter((el): el is JSX.Element => el !== null)
  // Hint-Zeilen tragen den Kategorie-Akzentton (📊 Warum, 📌 Pins). Solide-
  // Inaktiv-Hinweis behält bewusst eigene Warn-Tönung (orange-700), weil er
  // ein zusätzliches Achtungssignal setzt, unabhängig vom Kategorie-Tone.
  const hintToneText = BOARD_HINT_TONE[cat.hintTone].text

  return (
    <li className="px-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5 text-base font-semibold text-gray-900">
            <span className="truncate">{board.name}</span>
            <InfoTooltip text={scoreTooltip} className="text-gray-400" />
          </div>
          <div className={`text-[13px] ${activityClass}`}>
            {isEmpty ? (
              'Leeres Board · erste Pins veröffentlichen'
            ) : (
              <>
                {pins} {pins === 1 ? 'Pin veröffentlicht' : 'Pins veröffentlicht'} ·{' '}
                {board.lastPinId ? (
                  <Link
                    href={`/dashboard/pin-produktion?highlight=${board.lastPinId}`}
                    className="underline-offset-2 hover:underline hover:text-red-700"
                    title="Zum Pin in der Pin-Datenbank springen"
                  >
                    {lastPinText}
                  </Link>
                ) : (
                  lastPinText
                )}
              </>
            )}
          </div>
          {metricEls.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-y-1 text-[13px] text-gray-500">
              {metricEls.map((el, idx) => (
                <span key={idx} className="inline-flex items-center">
                  {idx > 0 && (
                    <span className="mx-2 text-gray-400" aria-hidden>
                      ·
                    </span>
                  )}
                  {el}
                </span>
              ))}
            </div>
          )}
          <div className={`mt-2 text-xs ${hintToneText}`}>{warum}</div>
          {(() => {
            const pinsInDbLine = buildPinsInDbLine(
              cat.key,
              pinsInDb,
              board.anzahlPins
            )
            if (!pinsInDbLine) return null
            return (
              <div className={`mt-1 text-xs ${hintToneText}`}>
                {pinsInDbLine}
              </div>
            )
          })()}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={cat.primary.href(board)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${cat.primaryButtonClass}`}
          >
            {cat.primary.label}
          </Link>
          {board.pinterestUrl && (
            <a
              href={board.pinterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Zum Board ↗
            </a>
          )}
        </div>
      </div>
    </li>
  )
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
// Update-Status
// ===========================================================
function UpdateStatusCard({
  lastUpdate,
  nextDue,
  isOverdue,
  daysSinceUpdate,
  pinsCount,
  boardsCount,
}: {
  lastUpdate: string | null
  nextDue: string | null
  isOverdue: boolean
  daysSinceUpdate: number | null
  pinsCount: number
  boardsCount: number
}) {
  const daysAgoLabel =
    daysSinceUpdate === null
      ? null
      : daysSinceUpdate === 0
        ? 'heute'
        : daysSinceUpdate === 1
          ? 'vor 1 Tag'
          : `vor ${daysSinceUpdate} Tagen`
  if (!lastUpdate) {
    return (
      <section className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">Analytics-Status:</span>
        <span className="font-semibold">⚪ Noch kein Update</span>
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

  const tone = isOverdue
    ? {
        border: 'border-red-200',
        bg: 'bg-red-50',
        title: 'text-red-900',
        body: 'text-red-800',
        emoji: '🔴',
        status: 'Überfällig',
      }
    : {
        border: 'border-green-200',
        bg: 'bg-green-50',
        title: 'text-green-900',
        body: 'text-green-800',
        emoji: '🟢',
        status: 'Aktuell',
      }

  return (
    <section
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border ${tone.border} ${tone.bg} px-3 py-2 text-sm ${tone.body}`}
    >
      <span className={`font-semibold ${tone.title}`}>Analytics-Status:</span>
      <span className={`font-semibold ${tone.title}`}>
        {tone.emoji} {tone.status}
      </span>
      <span className="text-gray-400" aria-hidden>
        ·
      </span>
      <span>
        Letztes Update: <strong>{formatDateDe(lastUpdate)}</strong>
        {daysAgoLabel && <> ({daysAgoLabel})</>}
      </span>
      <span className="text-gray-400" aria-hidden>
        ·
      </span>
      <span>
        Nächstes Update: <strong>{formatDateDe(nextDue)}</strong>
      </span>
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
// Hero-Section: Status-Zeile + (rotes Warn-Banner) + Profil-Gesundheit
// in einer Box mit Status-abhängigem Hintergrund.
// ===========================================================
function HeroSection({
  statusTri,
  pinsCount,
  boardsCount,
  ctr,
  engagement,
  impressionenGrowth,
  briefingItems,
}: {
  statusTri: UpdateStatusTri
  pinsCount: number
  boardsCount: number
  ctr: number | null
  engagement: number | null
  impressionenGrowth: number | null
  briefingItems: BriefingItem[]
}) {
  // Onboarding-Modus: noch nie Analytics gepflegt — blauer Info-Banner
  // statt Status/Profil-Gesundheit.
  if (statusTri.state === 'leer') {
    return (
      <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-3 text-sm text-blue-900">
          <span className="text-lg leading-tight" aria-hidden>
            🔵
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Willkommen!</p>
            <p className="mt-0.5">
              Bevor das Dashboard aussagekräftig wird, pflege einmal monatlich
              deine Pinterest-Analytics ein. Erst dann zeigen KPIs,
              Strategie-Check und Coaching-Empfehlungen verlässliche Werte.
            </p>
            <Link
              href="/dashboard/analytics"
              className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              → Analytics jetzt einpflegen
            </Link>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-3 border-l border-blue-200 pl-3 text-xs text-blue-900">
            <span>📌 {formatZahl(pinsCount)} Pins</span>
            <span className="text-blue-300" aria-hidden>
              ·
            </span>
            <span>📋 {formatZahl(boardsCount)} Boards</span>
          </span>
        </div>
      </section>
    )
  }
  const tone =
    statusTri.state === 'rot'
      ? {
          border: 'border-red-200',
          bg: 'bg-red-50',
          title: 'text-red-900',
          body: 'text-red-800',
          divider: 'border-red-200/60',
        }
      : statusTri.state === 'gelb'
        ? {
            border: 'border-yellow-200',
            bg: 'bg-yellow-50',
            title: 'text-yellow-900',
            body: 'text-yellow-800',
            divider: 'border-yellow-200/60',
          }
        : statusTri.state === 'gruen'
          ? {
              border: 'border-green-200',
              bg: 'bg-green-50',
              title: 'text-green-900',
              body: 'text-green-800',
              divider: 'border-green-200/60',
            }
          : {
              border: 'border-gray-200',
              bg: 'bg-gray-50',
              title: 'text-gray-900',
              body: 'text-gray-700',
              divider: 'border-gray-200/60',
            }

  const statusLabel =
    statusTri.state === 'rot'
      ? '🔴 Analytics-Status: Daten veraltet'
      : statusTri.state === 'gelb'
        ? `🟡 Analytics-Status: Update fällig in ${
            statusTri.daysUntilDue !== null
              ? Math.max(0, statusTri.daysUntilDue)
              : '—'
          } Tagen`
        : statusTri.state === 'gruen'
          ? '🟢 Analytics-Status: Aktuell'
          : '⚪ Analytics-Status: Noch kein Update'

  const daysAgoLabel =
    statusTri.daysSinceUpdate === null
      ? null
      : statusTri.daysSinceUpdate === 0
        ? 'heute'
        : statusTri.daysSinceUpdate === 1
          ? 'vor 1 Tag'
          : `vor ${statusTri.daysSinceUpdate} Tagen`

  return (
    <section
      className={`rounded-lg border ${tone.border} ${tone.bg} shadow-sm`}
    >
      {/* Status-Bereich oben */}
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm ${tone.body}`}
      >
        <span className={`font-semibold ${tone.title}`}>{statusLabel}</span>
        {statusTri.lastUpdate && (
          <>
            <span className="text-gray-400" aria-hidden>
              ·
            </span>
            <span>
              Letztes Update:{' '}
              <strong>{formatDateDe(statusTri.lastUpdate)}</strong>
              {daysAgoLabel && <> ({daysAgoLabel})</>}
            </span>
            <span className="text-gray-400" aria-hidden>
              ·
            </span>
            <span>
              Nächstes Update:{' '}
              <strong>{formatDateDe(statusTri.nextDue)}</strong>
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
      </div>

      {/* Warn-Hinweis nur bei rotem Status */}
      {statusTri.state === 'rot' && statusTri.daysSinceUpdate !== null && (
        <div className="warn-box mx-4 mb-3">
          <span className="font-semibold">🚨 Daten veraltet</span> – das
          Dashboard zeigt Werte vom letzten Update (vor{' '}
          {statusTri.daysSinceUpdate} Tagen). Aktualisiere jetzt deine
          Analytics, damit alle Sektionen verlässliche Empfehlungen zeigen.
        </div>
      )}

      {/* Dezente Trennlinie */}
      <div className={`border-t ${tone.divider}`} />

      {/* Profil-Gesundheit */}
      <div className="px-4 py-3">
        <ProfilGesundheitWidget
          ctr={ctr}
          engagement={engagement}
          impressionenGrowth={impressionenGrowth}
          embedded
        />
      </div>

      {/* Dezente Trennlinie vor "Heute aktuell" */}
      <div className={`border-t ${tone.divider}`} />

      {/* Heute aktuell — Briefing mit den wichtigsten Items */}
      <div className="px-4 py-3">
        <BriefingSection items={briefingItems} />
      </div>

      {/* Dezente Trennlinie vor Footer-Hinweis */}
      <div className={`border-t ${tone.divider}`} />

      {/* Footer-Hinweis: Aktualität der Daten */}
      <p className="px-4 py-2 text-xs text-gray-500">
        <span aria-hidden>ⓘ</span> Das Dashboard ist nur so aktuell wie deine
        zuletzt eingepflegten Daten. Pflege einmal monatlich deine
        Pinterest-Analytics ein.
      </p>
    </section>
  )
}

// ===========================================================
// Phasen-Trenner — Space Grotesk, Titel mittig zwischen zwei Linien
// ===========================================================
function PhasenTrenner({ title }: { title: string }) {
  return (
    <div className="mb-6 mt-10 flex items-center gap-6">
      <span aria-hidden className="h-px flex-1 bg-gray-200" />
      <span
        className="text-[18px] font-medium text-gray-500 sm:text-[20px]"
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
}: {
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
  chartPoints: ChartPoint[]
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
          Noch kein Analytics-Update —{' '}
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
            — Vergleich zum {formatDateDe(previous.datum)}
            {deltaTage !== null && <> ({deltaTage} Tage zuvor)</>}
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
              tooltip="Wie oft Nutzer von Pinterest auf deine Website geklickt haben. Das ist deine wichtigste Metrik — sie zeigt echten Traffic."
              previousValue={prevText(
                previous ? formatZahl(previous.ausgehende_klicks) : null
              )}
            />
            <KpiCard
              variant="hero"
              label="Engagement Rate"
              value={formatPercent(latest.engagement)}
              growth={latest.engagement_growth}
              tooltip="(Saves + Klicks) ÷ Impressionen. Standard Pins Durchschnitt: 0,15–0,25%. Über 1% ist ausgezeichnet."
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
        tooltip="Alle Menschen die deinen Content gesehen haben — auf Pinterest und außerhalb."
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
        tooltip="Menschen die aktiv reagiert haben — geklickt, gespeichert oder kommentiert. Qualitativ wertvoller als Gesamtzielgruppe."
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
