import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import {
  calcCtr,
  calcUpdateStatus,
  diagnosePin,
  diffDays,
  formatDateDe,
  formatGrowth,
  formatNumber,
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
}> = [
  { diagnose: 'aktiver_top_performer', emoji: '🚀', label: 'Aktiver Top Performer' },
  { diagnose: 'hidden_gem', emoji: '💎', label: 'Hidden Gem' },
  { diagnose: 'hohe_impressionen_niedrige_ctr', emoji: '🎨', label: 'Optimierungspotenzial' },
  { diagnose: 'eingeschlafener_gewinner', emoji: '♻️', label: 'Eingeschlafener Gewinner' },
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
  ] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false })
      .limit(2),
    supabase
      .from('einstellungen')
      .select(
        `analytics_update_datum, pinterest_account_url, website_url, tailwind_url,
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
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilRows = withGrowth(rows)
  const latest = profilRows[0] ?? null

  const updateStatus = calcUpdateStatus(
    settingsRes.data?.analytics_update_datum ?? null
  )

  // ===== Handlungsbedarf =====
  const thresholds = thresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerte> | null
  )
  const today = todayIso()
  const rawPinAnalytics =
    (pinAnalyticsRes.data ?? []) as unknown as RawPinAnalyticsRow[]

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

  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Willkommen zurück{user.email ? `, ${user.email}` : ''}.
        </p>
      </header>

      <KpiBar latest={latest} />

      <QuickActionsAndLinks
        pinterestAccountUrl={settingsRes.data?.pinterest_account_url ?? null}
        websiteUrl={settingsRes.data?.website_url ?? null}
        tailwindUrl={settingsRes.data?.tailwind_url ?? null}
      />

      <HandlungsbedarfSection
        grouped={groupedActions}
        hasAnyAnalytics={hasAnyAnalytics}
      />

      <SaisonVorschauSection events={upcomingEvents} />

      <ContentPipelineSection
        urls={urlsUnderfed}
        keywords={unusedKeywords}
      />

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
// Quick Actions + Persönliche Links
// ===========================================================
function QuickActionsAndLinks({
  pinterestAccountUrl,
  websiteUrl,
  tailwindUrl,
}: {
  pinterestAccountUrl: string | null
  websiteUrl: string | null
  tailwindUrl: string | null
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ActionButton
            href="/dashboard/pin-produktion"
            label="➕ Neuen Pin erstellen"
          />
          <ActionButton
            href="/dashboard/keywords"
            label="➕ Keyword hinzufügen"
          />
          <ActionButton
            href="/dashboard/analytics"
            label="📊 Analytics aktualisieren"
          />
          <ActionButton href="/dashboard/boards" label="📋 Board erstellen" />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Persönliche Links
        </h2>
        <div className="mt-4 space-y-2">
          <ExternalLinkButton
            url={pinterestAccountUrl}
            label="🔗 Pinterest Account"
          />
          <ExternalLinkButton url={websiteUrl} label="🌐 Meine Website" />
          <ExternalLinkButton url={tailwindUrl} label="📅 Tailwind" />
        </div>
      </div>
    </section>
  )
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
    >
      {label}
    </Link>
  )
}

function ExternalLinkButton({
  url,
  label,
}: {
  url: string | null
  label: string
}) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <span>{label}</span>
        <span className="text-xs text-gray-400" aria-hidden>
          ↗
        </span>
      </a>
    )
  }
  return (
    <Link
      href="/dashboard/einstellungen"
      className="flex items-center justify-between rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-100"
    >
      <span>{label}</span>
      <span className="text-xs">In Einstellungen hinterlegen →</span>
    </Link>
  )
}

// ===========================================================
// Handlungsbedarf
// ===========================================================
function HandlungsbedarfSection({
  grouped,
  hasAnyAnalytics,
}: {
  grouped: Map<PinDiagnose, ActionablePin[]>
  hasAnyAnalytics: boolean
}) {
  if (!hasAnyAnalytics) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
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

  const visibleCategories = HANDLUNGS_CATEGORIES.filter(
    (c) => (grouped.get(c.diagnose)?.length ?? 0) > 0
  )

  if (visibleCategories.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Handlungsbedarf</h2>
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
      <div className="mt-3 space-y-2">
        {visibleCategories.map((cat) => {
          const pins = grouped.get(cat.diagnose) ?? []
          return (
            <details
              key={cat.diagnose}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.label}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {pins.length}
                </span>
              </summary>
              <div className="border-t border-gray-200">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
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
                    {pins.map((p) => (
                      <tr key={p.id} className="align-top hover:bg-gray-50">
                        <td className="max-w-xs px-4 py-2 font-medium text-gray-900">
                          {p.titel ?? (
                            <span className="text-gray-400">(ohne Titel)</span>
                          )}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-2 text-gray-700"
                          title={formatNumber(p.klicks)}
                        >
                          {formatZahl(p.klicks)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {formatPercent(p.ctr)}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {p.handlung}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          <Link
                            href="/dashboard/pin-produktion"
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Zum Pin →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )
        })}
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
