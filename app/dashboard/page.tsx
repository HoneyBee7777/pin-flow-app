import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import InfoTooltip, { LabelWithTooltip } from '@/components/InfoTooltip'
import {
  boardThresholdsFromSettings,
  calcBoardEngagementRate,
  calcCtr,
  calcUpdateStatus,
  diagnoseBoard,
  diagnosePin,
  diffDays,
  formatDateDe,
  formatGrowth,
  formatPercent,
  formatZahl,
  PIN_DIAGNOSE_BADGE,
  PIN_DIAGNOSE_LABEL,
  PIN_HANDLUNG,
  boardScoreTooltip,
  scoreBoardHybrid,
  thresholdsFromSettings,
  topPercentCutoff,
  type BoardScore,
  type BoardThresholds,
  todayIso,
  withGrowth,
  type BoardStatus,
  type EinstellungenSchwellwerte,
  type EinstellungenSchwellwerteBoard,
  type PinDiagnose,
  type PinOption,
  type ProfilAnalytics,
  type ProfilAnalyticsWithGrowth,
} from './analytics/utils'
import {
  computeStatus,
  type EventStatus,
  type SaisonEvent,
  type SaisonTyp,
  type StatusInfo,
} from './saison-kalender/utils'
import PerformanceChart, { type ChartPoint } from './PerformanceChart'
import AufgabenSection, { type Aufgabe } from './AufgabenSection'
import HandlungsbedarfPinRow, {
  type ActionButton,
  type HandlungsbedarfPin,
} from './HandlungsbedarfPinRow'
import BearbeitetRow, { type BearbeitetRowData } from './BearbeitetRow'

type ContentPipelineUrl = {
  id: string
  titel: string
  prioritaet: 'hoch' | 'mittel' | 'niedrig'
  pinCount: number
}

type UnusedKeyword = {
  id: string
  keyword: string
  typ: 'haupt' | 'mid_tail' | 'longtail'
}

type UpcomingEvent = {
  id: string
  event_name: string
  event_datum: string | null
  statusInfo: StatusInfo
}

const URGENCY_ORDER: Record<EventStatus, number> = {
  jetzt_produzieren: 0,
  jetzt_pinnen: 1,
  hochphase: 2,
  noch_zeit: 3,
  evergreen: 4,
  abgeschlossen: 5,
}

const KEYWORD_TYP_LABEL: Record<UnusedKeyword['typ'], string> = {
  haupt: 'Haupt',
  mid_tail: 'Mid-Tail',
  longtail: 'Longtail',
}

const KEYWORD_TYP_EMOJI: Record<UnusedKeyword['typ'], string> = {
  haupt: '🔴',
  mid_tail: '🟡',
  longtail: '🟢',
}

const KEYWORD_TYP_BADGE: Record<UnusedKeyword['typ'], string> = {
  haupt: 'bg-red-100 text-red-700',
  mid_tail: 'bg-yellow-100 text-yellow-800',
  longtail: 'bg-green-100 text-green-700',
}

const PRIO_EMOJI: Record<ContentPipelineUrl['prioritaet'], string> = {
  hoch: '🔴',
  mittel: '🟡',
  niedrig: '🟢',
}

const PRIO_LABEL: Record<ContentPipelineUrl['prioritaet'], string> = {
  hoch: 'Hoch',
  mittel: 'Mittel',
  niedrig: 'Niedrig',
}

const PRIO_BADGE: Record<ContentPipelineUrl['prioritaet'], string> = {
  hoch: 'bg-red-100 text-red-700',
  mittel: 'bg-yellow-100 text-yellow-800',
  niedrig: 'bg-green-100 text-green-700',
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
  // 'Top' | 'Wachstum' | 'Solide' | 'Schwach' | 'Schlafend' | null (= Board ohne Analytics)
  boardScoreLabel: string | null
  boardIsWeak: boolean
  boardHasAnalytics: boolean
}

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

type BoardCat = BoardScore | 'schlafende_top'

type WinItem =
  | { kind: 'pin'; titel: string; growthPct: number }
  | { kind: 'board'; boardName: string; from: string; to: string }
  | { kind: 'react'; boardName: string; impressionGrowthPct: number | null }

type BoardMetricKind = 'er' | 'erChange' | 'impressionen' | 'klicks'

type BoardCatConfig = {
  key: BoardCat
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
    emoji: '🔺',
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
    key: 'top',
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
    emoji: '👀',
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
    emoji: '💤',
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

const BOARD_HINT_TONE: Record<
  BoardCatConfig['hintTone'],
  { bg: string; text: string }
> = {
  orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800' },
  blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  green: { bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  gray: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' },
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
    emoji: '🚀',
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
    metrics: ['klicks', 'ctr', 'alter', 'push'],
    metricLabels: {
      klicks: 'Klicks',
      ctr: 'CTR',
      alter: 'Alter',
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
    emoji: '🎯',
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
      alter: 'Alter',
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
    keywordsRes,
    aufgabenRes,
    erledigtRes,
    pinsPublishedCountRes,
    boardsCountRes,
    boardAnalyticsRes,
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
         schwellwert_board_wenig_aktiv, schwellwert_board_inaktiv,
         schwellwert_board_top_er, schwellwert_board_top_prozent,
         schwellwert_board_schwach_er, schwellwert_board_wachstum_trend`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pins_analytics')
      .select(
        `id, pin_id, datum, impressionen, klicks, saves, created_at,
         pins ( id, titel, status, created_at, geplante_veroeffentlichung, pinterest_pin_url, board_id )`
      )
      .order('datum', { ascending: false }),
    supabase
      .from('saison_events')
      .select(
        'id, event_name, event_datum, saison_typ, suchbeginn_tage, notizen, datum_variabel, created_at'
      )
      .order('event_datum', { ascending: true, nullsFirst: false }),
    supabase
      .from('ziel_urls')
      .select('id, titel, prioritaet, pins ( id )'),
    supabase
      .from('keywords')
      .select('id, keyword, typ, pin_keywords ( pin_id )'),
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
    supabase
      .from('pins')
      .select('id, status, created_at, geplante_veroeffentlichung, board_id'),
    supabase.from('boards').select('id, name, pinterest_url, created_at'),
    supabase
      .from('board_analytics')
      .select(
        'id, board_id, datum, impressionen, klicks_auf_pins, ausgehende_klicks, saves, engagement, anzahl_pins, created_at'
      )
      .order('datum', { ascending: false }),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilRows = withGrowth(rows)
  const latest = profilRows[0] ?? null
  const previous = profilRows[1] ?? null

  const updateStatus = calcUpdateStatus(
    settingsRes.data?.analytics_update_datum ?? null
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

  // ===== Saison-Vorschau =====
  const saisonRows = (saisonRes.data ?? []) as SaisonEvent[]
  const upcomingEvents: UpcomingEvent[] = saisonRows
    .filter((e) => e.saison_typ !== ('evergreen' as SaisonTyp))
    .map((e) => ({
      id: e.id,
      event_name: e.event_name,
      event_datum: e.event_datum,
      statusInfo: computeStatus(
        e.event_datum,
        e.saison_typ,
        e.suchbeginn_tage,
        today
      ),
    }))
    .filter((e) => e.statusInfo.status !== 'abgeschlossen')
    .sort((a, b) => {
      const ord =
        URGENCY_ORDER[a.statusInfo.status] - URGENCY_ORDER[b.statusInfo.status]
      if (ord !== 0) return ord
      const aD = a.event_datum ?? '￿'
      const bD = b.event_datum ?? '￿'
      return aD.localeCompare(bD)
    })
    .slice(0, 5)

  // ===== Content-Pipeline: URLs mit < 3 Pins =====
  type RawUrlRow = {
    id: string
    titel: string
    prioritaet: ContentPipelineUrl['prioritaet']
    pins: Array<{ id: string }> | null
  }
  const urlsUnderfed: ContentPipelineUrl[] = (
    (urlsRes.data ?? []) as RawUrlRow[]
  )
    .map((u) => ({
      id: u.id,
      titel: u.titel,
      prioritaet: u.prioritaet,
      pinCount: u.pins?.length ?? 0,
    }))
    .filter((u) => u.pinCount < 3)
    .sort((a, b) => a.pinCount - b.pinCount)
    .slice(0, 5)

  // ===== Content-Pipeline: ungenutzte Keywords =====
  type RawKwRow = {
    id: string
    keyword: string
    typ: UnusedKeyword['typ']
    pin_keywords: Array<{ pin_id: string }> | null
  }
  const unusedKeywords: UnusedKeyword[] = (
    (keywordsRes.data ?? []) as RawKwRow[]
  )
    .filter((k) => (k.pin_keywords?.length ?? 0) === 0)
    .map((k) => ({ id: k.id, keyword: k.keyword, typ: k.typ }))
    .slice(0, 10)

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

  // ===== Top Pins (nach Klicks) =====
  const topPins = [...actionable]
    .sort((a, b) => b.klicks - a.klicks)
    .slice(0, 5)

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

  type BoardAssignment = BoardCat | 'ohne_analytics' | 'leeres_board'
  function assignCategory(b: BoardDashHealth): BoardAssignment {
    if (!b.hasAnalytics) return 'ohne_analytics'
    // Boards ohne Pins (anzahl_pins = 0/null) werden NICHT in den
    // Kategorien angezeigt. Stattdessen separater Footer-Hinweis.
    if ((b.anzahlPins ?? 0) <= 0) return 'leeres_board'
    // Schlafende Top: starkes Board (top oder wachstum), aber inaktiv —
    // ungenutztes Potenzial, eigene Kategorie vor dem Score-Routing.
    if (
      b.status === 'inaktiv' &&
      (b.score === 'top' || b.score === 'wachstum')
    ) {
      return 'schlafende_top'
    }
    return b.score
  }

  const boardsByCategory: Record<BoardCat, BoardDashHealth[]> = {
    schlafende_top: [],
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
  // Innerhalb jeder Kategorie nach ER DESC sortieren
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

  // ===== Wins der letzten 30 Tage =====
  // Drei regelbasierte Wins. Sektion wird nur ab 2 Monaten Profil-Analytics
  // angezeigt — vorher fehlt die Vergleichsbasis.
  const SCORE_RANK: Record<BoardScore, number> = {
    schwach: 0,
    solide: 1,
    wachstum: 2,
    top: 3,
  }
  const SCORE_LABEL: Record<BoardScore, string> = {
    schwach: 'Schwach',
    solide: 'Solide',
    wachstum: 'Wachstum',
    top: 'Top',
  }

  // Per-Pin: neuester + vorheriger Analytics-Eintrag (rawPinAnalytics ist DESC).
  const latestPaByPin = new Map<string, RawPinAnalyticsRow>()
  const prevPaByPin = new Map<string, RawPinAnalyticsRow>()
  for (const r of rawPinAnalytics) {
    if (!latestPaByPin.has(r.pin_id)) latestPaByPin.set(r.pin_id, r)
    else if (!prevPaByPin.has(r.pin_id)) prevPaByPin.set(r.pin_id, r)
  }

  // Win 1 — Pin mit größter Klick-Steigerung gegenüber Vormonat (≥50% Pflicht,
  // sonst „schwacher" Win — wird gefiltert, damit nur echte Erfolge erscheinen).
  const WIN_PIN_MIN_GROWTH_PCT = 50
  let winPin: WinItem | null = null
  let winPinPct = 0
  latestPaByPin.forEach((latestPa, pinId) => {
    const prevPa = prevPaByPin.get(pinId)
    if (!prevPa || prevPa.klicks <= 0) return
    const growth = ((latestPa.klicks - prevPa.klicks) / prevPa.klicks) * 100
    if (growth < WIN_PIN_MIN_GROWTH_PCT) return
    if (growth > winPinPct) {
      winPinPct = growth
      const titel = (latestPa.pins?.titel ?? '').trim() || '(ohne Titel)'
      winPin = { kind: 'pin', titel, growthPct: growth }
    }
  })

  // Vor-Vormonats-Eintrag pro Board (für vorherigen Score).
  const prevPrevBaByBoard = new Map<string, BoardAnalyticsRaw>()
  {
    const seenLatest = new Set<string>()
    const seenPrev = new Set<string>()
    for (const r of boardAnalyticsRaw) {
      if (!seenLatest.has(r.board_id)) {
        seenLatest.add(r.board_id)
      } else if (!seenPrev.has(r.board_id)) {
        seenPrev.add(r.board_id)
      } else if (!prevPrevBaByBoard.has(r.board_id)) {
        prevPrevBaByBoard.set(r.board_id, r)
      }
    }
  }

  // Win 2 — Board mit Ein-Stufen-Aufstieg von Solide oder Wachstum:
  // Solide→Wachstum oder Wachstum→Top. Schwach→Solide gilt nicht als Win,
  // da Solide noch keine echte Stärke ist. Mehrstufige Sprünge werden nicht
  // gewertet, weil sie meist auf instabile Datenbasis hindeuten.
  let winBoard: WinItem | null = null
  for (const b of boardsRows) {
    const latestBa = latestBaByBoard.get(b.id)
    const prevBa = prevBaByBoard.get(b.id)
    if (!latestBa || !prevBa) continue
    const erNow = calcBoardEngagementRate(latestBa.engagement, latestBa.impressionen)
    const erPrev = calcBoardEngagementRate(prevBa.engagement, prevBa.impressionen)
    const prevPrevBa = prevPrevBaByBoard.get(b.id) ?? null
    const erPrevPrev = prevPrevBa
      ? calcBoardEngagementRate(prevPrevBa.engagement, prevPrevBa.impressionen)
      : null
    const currentScore = scoreBoardHybrid({
      er: erNow,
      erVormonat: erPrev,
      topCutoffEr,
      thresholds: boardThresholds,
    }).score
    const previousScore = scoreBoardHybrid({
      er: erPrev,
      erVormonat: erPrevPrev,
      topCutoffEr,
      thresholds: boardThresholds,
    }).score
    const jump = SCORE_RANK[currentScore] - SCORE_RANK[previousScore]
    if (jump !== 1) continue
    if (previousScore !== 'solide' && previousScore !== 'wachstum') continue
    // Erstes passendes Board nehmen — boardsRows hat keine Ranking-Reihenfolge.
    winBoard = {
      kind: 'board',
      boardName: b.name,
      from: SCORE_LABEL[previousScore],
      to: SCORE_LABEL[currentScore],
    }
    break
  }

  // Win 3 — Reaktivierung: neuester Pin in den letzten 30 Tagen, davor Lücke >30 Tage.
  const publishedDatesByBoard = new Map<string, string[]>()
  for (const p of pinsPublishedRows) {
    if (!p.board_id) continue
    const d = p.geplante_veroeffentlichung
    if (!d || d > today) continue
    const arr = publishedDatesByBoard.get(p.board_id) ?? []
    arr.push(d)
    publishedDatesByBoard.set(p.board_id, arr)
  }
  publishedDatesByBoard.forEach((arr) =>
    arr.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  )
  // Reaktivierung zählt nur, wenn die Impressionen in der ersten Periode nach
  // dem Reaktivierungs-Pin um mindestens 20% gegenüber der Vor-Periode stiegen.
  // Sonst war der „Wieder-Pin" zu schwach, um als Win zu zählen.
  const WIN_REACT_MIN_GROWTH_PCT = 20
  let winReact: WinItem | null = null
  let winReactGap = 0
  publishedDatesByBoard.forEach((dates, boardId) => {
    if (dates.length < 2) return
    const newest = dates[0]
    const second = dates[1]
    if (diffDays(newest, today) > 30) return
    const gap = diffDays(second, newest)
    if (gap <= 30) return
    const board = boardsRows.find((b) => b.id === boardId)
    if (!board) return
    const latestBa = latestBaByBoard.get(boardId)
    const prevBa = prevBaByBoard.get(boardId)
    if (!latestBa || !prevBa || prevBa.impressionen <= 0) return
    const growthPct =
      ((latestBa.impressionen - prevBa.impressionen) / prevBa.impressionen) * 100
    if (growthPct < WIN_REACT_MIN_GROWTH_PCT) return
    if (gap > winReactGap) {
      winReactGap = gap
      winReact = {
        kind: 'react',
        boardName: board.name,
        impressionGrowthPct: growthPct,
      }
    }
  })

  const wins: WinItem[] = ([winPin, winBoard, winReact] as (WinItem | null)[])
    .filter((w): w is WinItem => !!w)
  const showWins = profilRows.length >= 2

  // [WINS-DEBUG] Sichtbarkeit + Rohdaten der drei Win-Berechnungen.
  // showWins=false bei <2 Monaten Profil-Analytics → Sektion bleibt leer (Spec).
  console.log('[WINS-DEBUG]', {
    showWins,
    profilRowsCount: profilRows.length,
    winPin,
    winBoard,
    winReact,
  })

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

      <UpdateStatusCard
        lastUpdate={updateStatus.lastUpdate}
        nextDue={updateStatus.nextDue}
        isOverdue={updateStatus.isOverdue}
        daysSinceUpdate={updateStatus.daysSinceUpdate}
        pinsCount={veroeffentlichtePinsCount}
        boardsCount={boardsCount}
      />

      <DashboardHelp />

      <ProfilGesundheitWidget
        ctr={latest?.ctr ?? null}
        engagement={latest?.engagement ?? null}
        impressionenGrowth={latest?.impressionen_growth ?? null}
      />

      {showWins && <WinsSection wins={wins} />}

      <ProfilPerformanceKpiBar latest={latest} previous={previous} />

      <PerformanceVerlaufSection points={chartPoints} />

      <HandlungsbedarfSection
        grouped={groupedActions}
        hasAnyAnalytics={hasAnyAnalytics}
        bearbeitet={bearbeitet}
        today={today}
      />

      <BoardGesundheitDashboardSection
        byCategory={boardsByCategory}
        kpis={boardKpis}
        thresholds={boardThresholds}
        hasAnyBoardAnalytics={hasAnyBoardAnalytics}
        boardsOhneAnalyticsCount={boardsOhneAnalyticsCount}
        boardsLeerCount={boardsLeerCount}
      />

      <MeineTopPinsSection pins={topPins} />

      <SaisonVorschauSection events={upcomingEvents} />

      <ContentPipelineSection
        urls={urlsUnderfed}
        keywords={unusedKeywords}
      />

      <AufgabenSection tasks={aufgabenSorted} today={today} />
    </div>
  )
}

// ===========================================================
// Hilfe-Box „So liest du dieses Dashboard"
// ===========================================================
function DashboardHelp() {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span>ⓘ So liest du dieses Dashboard</span>
        <span className="text-xs text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▶</span>
          <span className="hidden group-open:inline">▼</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-700">
        <div>
          <p className="font-semibold text-gray-900">
            ERGEBNIS – Was ist am Ende rausgekommen?
          </p>
          <p className="mt-1">
            Ausgehende Klicks zeigen deinen tatsächlichen Website-Traffic – das
            ist, was am Monatsende zählt. Engagement Rate zeigt, wie relevant
            dein Content insgesamt wahrgenommen wird.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            TREIBER – Was hat das Ergebnis erzeugt?
          </p>
          <p className="mt-1">
            Saves sind das stärkste Algorithmus-Signal auf Pinterest – je mehr
            Saves, desto länger lebt dein Pin und desto mehr Reichweite bekommt
            er. CTR zeigt, ob dein Pin-Design (Hook) funktioniert. Impressionen
            zeigen, ob deine Keywords und SEO greifen.
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            KONTEXT – In welchem Umfeld passiert das?
          </p>
          <p className="mt-1">
            Die Zielgruppen-Zahlen zeigen, wen du erreichst. Sie sind keine
            Erfolgsmetriken an sich, sondern beschreiben den Kreis, aus dem
            deine Klicks und Saves kommen.
          </p>
        </div>
      </div>
    </details>
  )
}

// ===========================================================
// Wins der letzten 30 Tage — regelbasierte Mini-Erfolge
// ===========================================================
function WinsSection({ wins }: { wins: WinItem[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        🎉 Deine Wins der letzten 30 Tage
      </h2>
      {wins.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">
          📊 In den letzten 30 Tagen sind die Daten stabil – weiter dranbleiben.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {wins.map((w, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 border-l-2 border-emerald-200 pl-2 text-sm text-gray-700"
            >
              <span aria-hidden>{winIcon(w)}</span>
              <span>{winText(w)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function winIcon(w: WinItem): string {
  if (w.kind === 'pin') return '📌'
  if (w.kind === 'board') return '📋'
  return '♻️'
}

function winText(w: WinItem): string {
  if (w.kind === 'pin') {
    return `${w.titel} hat sich stark entwickelt – Klicks +${Math.round(w.growthPct)}% gegenüber Vormonat.`
  }
  if (w.kind === 'board') {
    return `Dein Board ${w.boardName} hat den Sprung von ${w.from} zu ${w.to} geschafft.`
  }
  if (w.impressionGrowthPct !== null && w.impressionGrowthPct > 0) {
    return `Du hast ${w.boardName} reaktiviert – seitdem +${Math.round(w.impressionGrowthPct)}% Impressionen.`
  }
  return `Du hast ${w.boardName} reaktiviert.`
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
}: {
  ctr: number | null
  engagement: number | null
  impressionenGrowth: number | null
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

  return (
    <div className="mt-4 space-y-2">
      <div
        className={`flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 text-sm ${c.cls}`}
      >
        <span className="text-lg leading-tight" aria-hidden>
          {c.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Profil-Gesundheit: {c.label}</p>
          <p className="mt-0.5 text-gray-700">{c.text}</p>
        </div>
      </div>
      {showSeparateWarn && (
        <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <span className="text-lg leading-tight" aria-hidden>
            ⚠️
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
  const cardCls = `flex h-full flex-col rounded-lg ${borderCls} bg-white px-3 py-2 shadow-sm`
  const labelCls =
    'text-[11px] font-medium uppercase tracking-wide text-gray-500'
  const valueCls = 'mt-0.5 text-lg font-semibold text-gray-900'

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
}: {
  grouped: Map<PinDiagnose, ActionablePin[]>
  hasAnyAnalytics: boolean
  bearbeitet: BearbeitetRowData[]
  today: string
}) {
  const heading = (
    <>
      <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
      <p className="mt-1 text-sm text-gray-600">
        Hier siehst du alle Pins die aktuell eine konkrete Maßnahme brauchen.
        Jeder Pin zeigt dir direkt was zu tun ist. Erstelle immer einen neuen
        Pin — bearbeite nie den bereits bei Pinterest veröffentlichten Pin!
      </p>
    </>
  )

  if (!hasAnyAnalytics) {
    return (
      <section>
        {heading}
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Trage deine ersten Pin-Analytics ein um Handlungsempfehlungen zu
          sehen.{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-red-600 hover:underline"
          >
            → Zum Analytics-Tab
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      {heading}
      <div className="mt-3 space-y-3">
        {HANDLUNGS_CATEGORIES.map((cat) => (
          <HandlungsbedarfKategorieCard
            key={cat.diagnose}
            cat={cat}
            pins={grouped.get(cat.diagnose) ?? []}
          />
        ))}

        {bearbeitet.length > 0 && (
          <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <span className="text-2xl leading-none text-gray-400" aria-hidden>
                <span className="inline group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>
              </span>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-base font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
              <span className="flex-1">Handlung abgeschlossen</span>
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
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
        )}

        <p className="pt-2 text-xs text-gray-500">
          <Link
            href="/dashboard/einstellungen#pin-schwellwerte"
            className="font-medium text-red-600 hover:underline"
          >
            Schwellwerte aller Kategorien anpassen ↗
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
}: {
  cat: HandlungsCategory
  pins: ActionablePin[]
}) {
  const visiblePins = pins.slice(0, 3)
  const remaining = pins.length - visiblePins.length

  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${cat.iconBg}`}
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
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.counterBg}`}
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
          <p className="px-4 pt-2 text-[11px] uppercase tracking-wide text-gray-400">
            Abhaken sobald Handlung erfolgt ist
          </p>
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
// Saison-Vorschau
// ===========================================================
function SaisonVorschauSection({ events }: { events: UpcomingEvent[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Anstehende Events
        </h2>
        <Link
          href="/dashboard/saison-kalender"
          className="text-xs font-medium text-red-600 hover:underline"
        >
          → Zum Saison-Kalender
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Alle Events abgeschlossen 👍
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-gray-900">
                  {e.event_name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${e.statusInfo.badge}`}
                >
                  <span aria-hidden>{e.statusInfo.emoji}</span>
                  {e.statusInfo.label}
                </span>
                {e.statusInfo.countdown && (
                  <span className="text-xs text-gray-600">
                    {e.statusInfo.countdown}
                  </span>
                )}
                {e.event_datum && (
                  <span className="text-xs text-gray-400">
                    am {formatDateDe(e.event_datum)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ===========================================================
// Content-Pipeline
// ===========================================================
function ContentPipelineSection({
  urls,
  keywords,
}: {
  urls: ContentPipelineUrl[]
  keywords: UnusedKeyword[]
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Content-Pipeline</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <UrlsUnderfedCard urls={urls} />
        <UnusedKeywordsCard keywords={keywords} />
      </div>
    </section>
  )
}

function UrlsUnderfedCard({ urls }: { urls: ContentPipelineUrl[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          URLs die mehr Pins brauchen
        </h3>
        <Link
          href="/dashboard/ziel-urls"
          className="text-xs font-medium text-red-600 hover:underline"
        >
          → Alle URLs
        </Link>
      </div>
      {urls.length === 0 ? (
        <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          Alle URLs sind gut bespielt 👍
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {urls.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="truncate font-medium text-gray-900">
                {u.titel}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PRIO_BADGE[u.prioritaet]}`}
                  title={`Priorität: ${PRIO_LABEL[u.prioritaet]}`}
                >
                  <span aria-hidden>{PRIO_EMOJI[u.prioritaet]}</span>
                  {PRIO_LABEL[u.prioritaet]}
                </span>
                <span
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                  title={`${u.pinCount} Pin${u.pinCount === 1 ? '' : 's'}`}
                >
                  {u.pinCount} {u.pinCount === 1 ? 'Pin' : 'Pins'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function UnusedKeywordsCard({ keywords }: { keywords: UnusedKeyword[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Ungenutzte Keywords
        </h3>
        <Link
          href="/dashboard/keywords"
          className="text-xs font-medium text-red-600 hover:underline"
        >
          → Alle Keywords
        </Link>
      </div>
      {keywords.length === 0 ? (
        <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          Alle Keywords wurden bereits verwendet 👍
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span
              key={k.id}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${KEYWORD_TYP_BADGE[k.typ]}`}
              title={`${KEYWORD_TYP_LABEL[k.typ]}-Keyword`}
            >
              <span aria-hidden>{KEYWORD_TYP_EMOJI[k.typ]}</span>
              {k.keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================
// Performance-Verlauf
// ===========================================================
// ===========================================================
// Meine Top Pins
// ===========================================================
function MeineTopPinsSection({ pins }: { pins: ActionablePin[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Meine Top Pins</h2>
      <div className="mt-3 rounded-lg border border-gray-200 bg-white shadow-sm">
        {pins.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">
            Noch keine Pin-Analytics eingetragen.{' '}
            <Link
              href="/dashboard/analytics"
              className="font-medium text-red-600 hover:underline"
            >
              → Zum Analytics-Tab
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pins.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"
              >
                <span className="flex-1 truncate text-gray-900">
                  {p.titel ?? '—'}
                </span>
                <span className="text-xs text-gray-600">
                  <strong className="text-gray-900">
                    {formatZahl(p.klicks)}
                  </strong>{' '}
                  Klicks
                </span>
                <span className="text-xs text-gray-600">
                  CTR{' '}
                  <strong className="text-gray-900">
                    {formatPercent(p.ctr)}
                  </strong>
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PIN_DIAGNOSE_BADGE[p.diagnose]
                  }`}
                >
                  {PIN_DIAGNOSE_LABEL[p.diagnose]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-gray-200 px-4 py-2 text-right text-xs">
          <Link
            href="/dashboard/analytics"
            className="font-medium text-red-600 hover:underline"
          >
            Alle Pins anzeigen →
          </Link>
        </div>
      </div>
    </section>
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
        Boards bestimmen ob Pinterest deinem Profil thematisch vertraut – hier
        siehst du wo du ansetzen solltest.
      </p>
    </>
  )

  if (!hasAnyBoardAnalytics) {
    return (
      <section>
        {heading}
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Noch keine Board-Analytics eingetragen. Trage deine ersten Board-Daten
          ein um die Board-Gesundheit zu sehen.{' '}
          <Link
            href="/dashboard/analytics?tab=boards"
            className="font-medium text-red-600 hover:underline"
          >
            → Zum Boards-Tab
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      {heading}

      <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        💡 Bei Boards zählt die Engagement Rate stärker als Klicks. Sie zeigt,
        ob Pinterest-Nutzer:innen mit deinen Themen interagieren – das
        signalisiert dem Algorithmus thematische Autorität. Ausgehende Klicks
        misst du auf Pin-Ebene, denn dort entstehen Conversions.
      </div>

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
        />
      </div>

      <div className="mt-3 space-y-3">
        {BOARD_CATEGORIES.map((cat) => (
          <BoardKategorieCard
            key={cat.key}
            cat={cat}
            boards={byCategory[cat.key]}
            thresholds={thresholds}
          />
        ))}

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

function BoardKpiCell({
  label,
  value,
  valueClass = 'text-gray-900',
  tooltip,
  sub,
  highlight = false,
}: {
  label: string
  value: string
  valueClass?: string
  tooltip?: string
  sub?: string
  highlight?: boolean
}) {
  const borderCls = highlight
    ? 'border-2 border-green-200'
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

function BoardKategorieCard({
  cat,
  boards,
  thresholds,
}: {
  cat: BoardCatConfig
  boards: BoardDashHealth[]
  thresholds: BoardThresholds
}) {
  const visible = boards.slice(0, 3)
  const remaining = boards.length - visible.length
  const tone = BOARD_HINT_TONE[cat.hintTone]

  return (
    <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl leading-none text-gray-400" aria-hidden>
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${cat.iconBg}`}
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
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.counterBg}`}
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
          <div
            className={`space-y-1 border-b px-4 py-2 text-xs font-medium ${tone.bg} ${tone.text}`}
          >
            <div>{cat.hint}</div>
            <div>{cat.nextStep}</div>
          </div>
          <ul className="divide-y divide-gray-100">
            {visible.map((b) => (
              <BoardRow key={b.id} board={b} cat={cat} thresholds={thresholds} />
            ))}
          </ul>
          {remaining > 0 && (
            <details className="border-t border-gray-100">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-red-600 hover:underline">
                + {remaining} weitere Board{remaining === 1 ? '' : 's'} anzeigen
              </summary>
              <ul className="divide-y divide-gray-100">
                {boards.slice(3).map((b) => (
                  <BoardRow key={b.id} board={b} cat={cat} thresholds={thresholds} />
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

function buildWasFehltText(b: BoardDashHealth): string | null {
  const pins = b.anzahlPins ?? 0
  const imp = b.impressionen
  const er = b.engagementRate
  if (pins < SOLIDE_PINS_MIN && imp < SOLIDE_IMPRESSIONS_MIN) {
    return 'Was fehlt: Pin-Volumen erhöhen – mehr Material für Pinterest.'
  }
  if (pins >= SOLIDE_PINS_MIN && imp < SOLIDE_IMPRESSIONS_MIN) {
    return 'Was fehlt: Reichweite – Keywords in Titel und Beschreibung optimieren.'
  }
  if (
    pins >= SOLIDE_PINS_MIN &&
    imp >= SOLIDE_IMPRESSIONS_MIN &&
    er !== null &&
    er < SOLIDE_ER_TARGET
  ) {
    return 'Was fehlt: Engagement – Pin-Designs und Hooks überarbeiten.'
  }
  return null
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
      const base = `📊 Was funktioniert: ER bei ${er} – stabile Performance.`
      return fehlt ? `${base} ${fehlt}` : base
    }
    case 'schwach':
      return `📊 Warum schwach: Engagement Rate bei nur ${er} – Nutzer:innen interagieren wenig mit den Themen oder Pin-Designs.`
    case 'schlafende_top': {
      const tage = b.lastPinAlterTage !== null ? `${b.lastPinAlterTage}` : '—'
      return `📊 Warum schlafend: Hohe Engagement Rate (${er}), aber seit ${tage} Tagen keine neuen Pins – ungenutztes Potenzial.`
    }
  }
}

function BoardRow({
  board,
  cat,
  thresholds,
}: {
  board: BoardDashHealth
  cat: BoardCatConfig
  thresholds: BoardThresholds
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

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <span className="truncate">{board.name}</span>
            <InfoTooltip text={scoreTooltip} className="text-gray-400" />
          </div>
          <div className={`mt-0.5 text-xs ${activityClass}`}>
            {isEmpty ? (
              'Leeres Board · erste Pins veröffentlichen'
            ) : (
              <>
                {pins} {pins === 1 ? 'Pin' : 'Pins'} ·{' '}
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
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {cat.metrics.map((kind) => {
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
            })}
          </div>
          <div className="mt-2 text-xs text-gray-700">{warum}</div>
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
