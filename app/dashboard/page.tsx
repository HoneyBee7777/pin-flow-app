import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import {
  calcCtr,
  calcUpdateStatus,
  diagnosePin,
  diffDays,
  formatDateDe,
  formatGrowth,
  formatPercent,
  formatZahl,
  PIN_HANDLUNG,
  thresholdsFromSettings,
  todayIso,
  withGrowth,
  type EinstellungenSchwellwerte,
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
import HandlungsbedarfRow, {
  type HandlungsbedarfRowData,
} from './HandlungsbedarfRow'
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
  ctr: number | null
  diagnose: PinDiagnose
  handlung: string
}

const HANDLUNGS_CATEGORIES: Array<{
  diagnose: PinDiagnose
  emoji: string
  label: string
  description: string
}> = [
  {
    diagnose: 'aktiver_top_performer',
    emoji: '🚀',
    label: 'Aktiver Top Performer',
    description:
      'Deine stärksten Pins nach Klicks. Das sind deine Blueprints – repliziere diese Themen, Formate und Hooks für neue Pins. Pins die jünger als 70 Tage sind und bereits mindestens 15 Klicks erreicht haben performen aktiv – produziere jetzt Varianten solange der Algorithmus sie pusht. Die Schwellwerte kannst du in den Einstellungen anpassen.',
  },
  {
    diagnose: 'hidden_gem',
    emoji: '💎',
    label: 'Hidden Gem',
    description:
      'Pins mit einer CTR über 1,5% aber weniger als 1.000 Impressionen. Der Hook funktioniert – aber das SEO ist schwach. Keywords und Board optimieren für mehr Reichweite. Die Schwellwerte kannst du in den Einstellungen anpassen.',
  },
  {
    diagnose: 'hohe_impressionen_niedrige_ctr',
    emoji: '🎨',
    label: 'Optimierungspotenzial',
    description:
      'Pins mit mehr als 1.000 Impressionen aber einer CTR unter 1,5%. Reichweite vorhanden – der Hook überzeugt nicht zum Klicken. Erstelle einen neuen Pin mit optimiertem Titel und Design — bearbeite NICHT den bestehenden Pin da Pinterest sonst alle bisherigen Daten verliert. Die Schwellwerte kannst du in den Einstellungen anpassen.',
  },
  {
    diagnose: 'eingeschlafener_gewinner',
    emoji: '♻️',
    label: 'Eingeschlafener Gewinner',
    description:
      'Eingeschlafene Gewinner die eine neue Chance verdienen. Pins die älter als 120 Tage sind und mindestens 15 Klicks hatten – aber nicht mehr aktiv performen. Produziere eine neue Variante mit frischem Design und aktualisierten Keywords. Die Schwellwerte kannst du in den Einstellungen anpassen.',
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
        `analytics_update_datum,
         schwellwert_beobachtung, schwellwert_min_klicks,
         schwellwert_alter_recycling, schwellwert_ctr, schwellwert_impressionen`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pins_analytics')
      .select(
        `id, pin_id, datum, impressionen, klicks, saves, created_at,
         pins ( id, titel, status, created_at, geplante_veroeffentlichung )`
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
      .select('id, titel, faelligkeitsdatum, erledigt, created_at')
      .eq('user_id', user.id),
    supabase
      .from('dashboard_erledigt')
      .select('pin_id, kategorie, created_at, pins ( id, titel )')
      .eq('user_id', user.id),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilRows = withGrowth(rows)
  const latest = profilRows[0] ?? null

  const updateStatus = calcUpdateStatus(
    settingsRes.data?.analytics_update_datum ?? null
  )

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
  const erledigtCountByDiagnose = new Map<PinDiagnose, number>()
  const validDiagnoseKeys = new Set(HANDLUNGS_CATEGORIES.map((c) => c.diagnose))
  for (const row of erledigtRows) {
    erledigtSet.add(`${row.pin_id}|${row.kategorie}`)
    if (validDiagnoseKeys.has(row.kategorie as PinDiagnose)) {
      const k = row.kategorie as PinDiagnose
      erledigtCountByDiagnose.set(k, (erledigtCountByDiagnose.get(k) ?? 0) + 1)
    }
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
      ctr,
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

  // ===== DEBUG (temporär) — entfernen sobald Diagnose-Parität verifiziert ist =====
  console.log('[DASHBOARD] settingsRes.data:', settingsRes.data)
  console.log('[DASHBOARD] settingsRes.error:', settingsRes.error)
  console.log('[DASHBOARD] thresholds:', thresholds)
  console.log('[DASHBOARD] today:', today)
  console.log(
    '[DASHBOARD] actionable pins (deduped, latest analytics per pin):',
    actionable.map((p) => ({
      pin_id: p.pin_id,
      titel: p.titel,
      klicks: p.klicks,
      ctr: p.ctr,
      diagnose: p.diagnose,
    }))
  )
  // =================================================================

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

  // ===== Performance-Verlauf (letzte 12 Monate, ASC für Chart) =====
  const chartPoints: ChartPoint[] = [...rows]
    .reverse()
    .map((r) => ({
      datum: r.datum,
      impressionen: r.impressionen,
      ausgehende_klicks: r.ausgehende_klicks,
      saves: r.saves,
    }))

  // ===== Aufgaben (offene zuerst, sortiert nach Dringlichkeit) =====
  const aufgabenAll = (aufgabenRes.data ?? []) as Aufgabe[]
  const aufgabenSorted = [...aufgabenAll].sort((a, b) => {
    // 1. Erledigte ganz unten
    if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1

    // Beide offen ODER beide erledigt
    if (a.erledigt && b.erledigt) {
      // Erledigte: zuletzt erstellte zuerst
      return b.created_at.localeCompare(a.created_at)
    }

    // Beide offen — Überfällige + mit Datum nach Datum ASC, ohne Datum nach hinten
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
          Willkommen zurück{user.email ? `, ${user.email}` : ''}.
        </p>
      </header>

      <KpiBar latest={latest} />

      <HandlungsbedarfSection
        grouped={groupedActions}
        hasAnyAnalytics={hasAnyAnalytics}
        erledigtCountByDiagnose={erledigtCountByDiagnose}
        bearbeitet={bearbeitet}
        today={today}
      />

      <SaisonVorschauSection events={upcomingEvents} />

      <ContentPipelineSection
        urls={urlsUnderfed}
        keywords={unusedKeywords}
      />

      <PerformanceVerlaufSection points={chartPoints} />

      <AufgabenSection tasks={aufgabenSorted} today={today} />

      <UpdateStatusCard
        lastUpdate={updateStatus.lastUpdate}
        nextDue={updateStatus.nextDue}
        isOverdue={updateStatus.isOverdue}
        daysSinceUpdate={updateStatus.daysSinceUpdate}
      />
    </div>
  )
}

// ===========================================================
// KPI-Leiste
// ===========================================================
function KpiBar({ latest }: { latest: ProfilAnalyticsWithGrowth | null }) {
  if (!latest) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Profil-Performance
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            'Impressionen',
            'Ausgehende Klicks',
            'Saves',
            'Gesamte Zielgruppe',
            'Interagierende Zielgruppe',
            'CTR',
            'Engagement Rate',
          ].map((label) => (
            <KpiCardEmpty key={label} label={label} />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Noch keine Profil-Analytics — Zahlen erscheinen, sobald du im{' '}
          <Link
            href="/dashboard/analytics"
            className="font-medium text-red-600 hover:underline"
          >
            Analytics-Tab
          </Link>{' '}
          den ersten Monat eingetragen hast.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Profil-Performance
        </h2>
        <span className="text-xs text-gray-500">
          Stand: {formatDateDe(latest.datum)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="Impressionen"
          value={formatZahl(latest.impressionen)}
          fullValue={latest.impressionen}
          growth={latest.impressionen_growth}
        />
        <KpiCard
          label="Ausgehende Klicks"
          value={formatZahl(latest.ausgehende_klicks)}
          fullValue={latest.ausgehende_klicks}
          growth={latest.klicks_growth}
        />
        <KpiCard
          label="Saves"
          value={formatZahl(latest.saves)}
          fullValue={latest.saves}
          growth={latest.saves_growth}
        />
        <KpiCard
          label="Gesamte Zielgruppe"
          value={formatZahl(latest.gesamte_zielgruppe)}
          fullValue={latest.gesamte_zielgruppe}
          growth={latest.zielgruppe_growth}
        />
        <KpiCard
          label="Interagierende Zielgruppe"
          value={formatZahl(latest.interagierende_zielgruppe)}
          fullValue={latest.interagierende_zielgruppe}
          growth={latest.interagierend_growth}
        />
        <KpiCard
          label="CTR"
          value={formatPercent(latest.ctr)}
          growth={latest.ctr_growth}
        />
        <KpiCard
          label="Engagement Rate"
          value={formatPercent(latest.engagement)}
          growth={latest.engagement_growth}
        />
      </div>
    </section>
  )
}

function KpiCard({
  label,
  value,
  fullValue,
  growth,
}: {
  label: string
  value: string
  fullValue?: number
  growth: number | null
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold text-gray-900"
        title={
          fullValue !== undefined ? fullValue.toLocaleString('de-DE') : undefined
        }
      >
        {value}
      </p>
      <GrowthBadge growth={growth} />
    </article>
  )
}

function KpiCardEmpty({ label }: { label: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-400">Noch keine Daten</p>
    </article>
  )
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) {
    return (
      <p className="mt-1 text-xs text-gray-400">Kein Vormonat verfügbar</p>
    )
  }
  if (!Number.isFinite(growth)) {
    return (
      <p className="mt-1 text-xs font-medium text-green-700">↑ neu</p>
    )
  }
  if (growth > 0) {
    return (
      <p className="mt-1 text-xs font-medium text-green-700">
        🟢 ↑ {formatGrowth(growth)}
      </p>
    )
  }
  if (growth < 0) {
    return (
      <p className="mt-1 text-xs font-medium text-red-700">
        🔴 ↓ {formatGrowth(growth)}
      </p>
    )
  }
  return <p className="mt-1 text-xs text-gray-500">→ unverändert</p>
}

// ===========================================================
// Handlungsbedarf
// ===========================================================
function HandlungsbedarfSection({
  grouped,
  hasAnyAnalytics,
  erledigtCountByDiagnose,
  bearbeitet,
  today,
}: {
  grouped: Map<PinDiagnose, ActionablePin[]>
  hasAnyAnalytics: boolean
  erledigtCountByDiagnose: Map<PinDiagnose, number>
  bearbeitet: BearbeitetRowData[]
  today: string
}) {
  const intro = (
    <p className="mt-1 text-sm text-gray-600">
      Hier siehst du alle Pins die aktuell eine konkrete Maßnahme brauchen.
      Jeder Pin zeigt dir direkt was zu tun ist – SEO optimieren, Hook testen
      oder eine Variante produzieren.
    </p>
  )

  if (!hasAnyAnalytics) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
        {intro}
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

  const visibleCategories = HANDLUNGS_CATEGORIES.filter((c) => {
    const active = grouped.get(c.diagnose)?.length ?? 0
    const done = erledigtCountByDiagnose.get(c.diagnose) ?? 0
    return active > 0 || done > 0
  })

  if (visibleCategories.length === 0 && bearbeitet.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
        {intro}
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Aktuell keine offenen Handlungen — alle deine Pins laufen entweder
          noch zu kurz für eine Bewertung oder zeigen keine kritischen Signale.
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
      {intro}
      <div className="mt-3 space-y-2">
        {visibleCategories.map((cat) => {
          const pins = grouped.get(cat.diagnose) ?? []
          const allDone = pins.length === 0
          return (
            <details
              key={cat.diagnose}
              className="group rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.label}
                </span>
                <span className="inline-flex items-center gap-2">
                  {allDone ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      ✓ Alle erledigt
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {pins.length}
                    </span>
                  )}
                  <span className="text-xs text-gray-400" aria-hidden>
                    <span className="inline group-open:hidden">▶</span>
                    <span className="hidden group-open:inline">▼</span>
                  </span>
                </span>
              </summary>
              <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
                {cat.description.split('Die Schwellwerte kannst du in den Einstellungen anpassen.')[0]}
                <Link
                  href="/dashboard/einstellungen"
                  className="font-medium text-red-600 hover:underline"
                >
                  Die Schwellwerte kannst du in den Einstellungen anpassen.
                </Link>
              </div>
              {allDone ? (
                <div className="border-t border-gray-200 px-4 py-6 text-center text-sm text-green-700">
                  ✓ Alle Pins dieser Kategorie sind aktuell als bearbeitet
                  markiert.
                </div>
              ) : (
                <div className="border-t border-gray-200">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Erledigt
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Pin
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Klicks
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          CTR
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Handlung
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Aktion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pins.map((p) => {
                        const rowData: HandlungsbedarfRowData = {
                          id: p.id,
                          pin_id: p.pin_id,
                          titel: p.titel,
                          klicks: p.klicks,
                          ctr: p.ctr,
                          handlung: p.handlung,
                          kategorie: cat.diagnose,
                        }
                        return <HandlungsbedarfRow key={p.id} pin={rowData} />
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          )
        })}

        {bearbeitet.length > 0 && (
          <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>✅</span>
                Bereits bearbeitet
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {bearbeitet.length} {bearbeitet.length === 1 ? 'Pin' : 'Pins'}
                </span>
              </span>
              <span className="text-xs text-gray-400" aria-hidden>
                <span className="inline group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
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
      </div>
    </section>
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
function PerformanceVerlaufSection({ points }: { points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Performance-Verlauf — letztes Jahr
        </h2>
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Noch zu wenig Daten — trage mindestens 2 Monate Analytics ein um den
          Jahresverlauf zu sehen.{' '}
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
      <h2 className="text-lg font-semibold text-gray-900">
        Performance-Verlauf — letztes Jahr
      </h2>
      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <PerformanceChart data={points} />
      </div>
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
}: {
  lastUpdate: string | null
  nextDue: string | null
  isOverdue: boolean
  daysSinceUpdate: number | null
}) {
  if (!lastUpdate) {
    return (
      <section className="rounded-lg border border-orange-200 bg-orange-50 p-6">
        <h2 className="text-lg font-semibold text-orange-900">
          Noch kein Analytics-Update — jetzt starten
        </h2>
        <p className="mt-1 text-sm text-orange-800">
          Trag deine ersten Pinterest-Zahlen ein, um die Profil-Performance auf
          dem Dashboard zu sehen.
        </p>
        <Link
          href="/dashboard/analytics"
          className="mt-3 inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          📊 Zum Analytics-Tab
        </Link>
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
        status: 'Aktualisiert',
      }

  return (
    <section
      className={`rounded-lg border ${tone.border} ${tone.bg} p-6 shadow-sm`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-lg font-semibold ${tone.title}`}>
            {tone.emoji} Analytics-Update — {tone.status}
          </h2>
          <p className={`mt-1 text-sm ${tone.body}`}>
            Letztes Update: <strong>{formatDateDe(lastUpdate)}</strong>
            {daysSinceUpdate !== null && (
              <> (vor {daysSinceUpdate} Tagen)</>
            )}
            {' · '}
            Nächstes Update fällig:{' '}
            <strong>{formatDateDe(nextDue)}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          📊 Jetzt aktualisieren
        </Link>
      </div>
    </section>
  )
}
