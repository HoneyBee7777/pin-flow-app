import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import KeywordsClient, {
  type ContentOption,
  type Keyword,
  type KeywordStats,
} from './KeywordsClient'

type RawKeywordRow = {
  id: string
  keyword: string
  typ: Keyword['typ']
  saison_peak: string | null
  notizen: string | null
  created_at: string
  content_keywords: Array<{
    content_id: string
    content_inhalte: { id: string; titel: string } | null
  }>
}

type PinKeywordRow = {
  pin_id: string
  keyword_id: string
}

type PinAnalyticsRow = {
  pin_id: string
  datum: string
  impressionen: number
  klicks: number
}

export default async function KeywordsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Stats werden nur berechnet wenn ein User eingeloggt ist — sonst leerer
  // Datensatz, damit das Rendering nicht stirbt.
  const [keywordsRes, contentsRes, pinKeywordsRes, pinAnalyticsRes] =
    await Promise.all([
      supabase
        .from('keywords')
        .select(
          `
          id, keyword, typ, saison_peak, notizen, created_at,
          content_keywords ( content_id, content_inhalte ( id, titel ) )
        `
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('content_inhalte')
        .select('id, titel')
        .order('titel', { ascending: true }),
      user
        ? supabase
            .from('pin_keywords')
            .select('pin_id, keyword_id')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] as PinKeywordRow[], error: null }),
      user
        ? supabase
            .from('pins_analytics')
            .select('pin_id, datum, impressionen, klicks')
            .order('datum', { ascending: false })
        : Promise.resolve({ data: [] as PinAnalyticsRow[], error: null }),
    ])

  const rawRows = (keywordsRes.data ?? []) as unknown as RawKeywordRow[]

  // Latest analytics row per pin — gleicher Ansatz wie auf der Boards-Seite,
  // damit „aktuelle Performance" nicht von alten Snapshots verzerrt wird.
  const pinAnalyticsRows =
    (pinAnalyticsRes.data ?? []) as unknown as PinAnalyticsRow[]
  const latestAnalyticsByPin = new Map<string, PinAnalyticsRow>()
  for (const row of pinAnalyticsRows) {
    if (!latestAnalyticsByPin.has(row.pin_id)) {
      latestAnalyticsByPin.set(row.pin_id, row)
    }
  }

  // Pro Keyword: distinct Pin-IDs sammeln, dann CTR/Klicks daraus mitteln.
  // Wir bauen einen Map<keywordId, Set<pinId>> auf — Set garantiert distinct.
  const pinKeywordsRows =
    (pinKeywordsRes.data ?? []) as unknown as PinKeywordRow[]
  const pinIdsByKeyword = new Map<string, Set<string>>()
  for (const row of pinKeywordsRows) {
    const set = pinIdsByKeyword.get(row.keyword_id) ?? new Set<string>()
    set.add(row.pin_id)
    pinIdsByKeyword.set(row.keyword_id, set)
  }

  function statsFor(keywordId: string): KeywordStats {
    const pinIds = pinIdsByKeyword.get(keywordId)
    if (!pinIds || pinIds.size === 0) {
      return { pinsCount: 0, avgCtr: null, avgKlicks: null }
    }
    let ctrSum = 0
    let ctrCount = 0
    let klicksSum = 0
    let klicksCount = 0
    pinIds.forEach((pinId) => {
      const a = latestAnalyticsByPin.get(pinId)
      if (!a) return
      if (a.impressionen > 0) {
        ctrSum += (a.klicks / a.impressionen) * 100
        ctrCount += 1
      }
      klicksSum += a.klicks
      klicksCount += 1
    })
    return {
      pinsCount: pinIds.size,
      avgCtr: ctrCount > 0 ? ctrSum / ctrCount : null,
      avgKlicks: klicksCount > 0 ? klicksSum / klicksCount : null,
    }
  }

  const keywords: Keyword[] = rawRows.map((row) => ({
    id: row.id,
    keyword: row.keyword,
    typ: row.typ,
    saison_peak: row.saison_peak,
    notizen: row.notizen,
    created_at: row.created_at,
    contents: row.content_keywords
      .filter((ck) => ck.content_inhalte)
      .map((ck) => ({
        id: ck.content_inhalte!.id,
        titel: ck.content_inhalte!.titel,
      })),
    stats: statsFor(row.id),
  }))

  const availableContents = (contentsRes.data ?? []) as ContentOption[]

  const loadError =
    keywordsRes.error?.message ??
    contentsRes.error?.message ??
    (pinKeywordsRes as { error: { message: string } | null }).error?.message ??
    (pinAnalyticsRes as { error: { message: string } | null }).error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Keywords</h1>
        <p className="mb-4 mt-1 text-sm text-gray-600">
          Keywords sind das Fundament deiner Pinterest-Reichweite. Hier
          pflegst du alle Keywords die du für deine Pins verwendest — und
          siehst welche wirklich performen.{' '}
          →{' '}
          <Link
            href="/dashboard/strategie?tab=keywords"
            className="text-red-700 underline underline-offset-2 hover:text-red-800"
          >
            Mehr zu Keywords &amp; SEO
          </Link>
        </p>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-500">
          Hier kannst du Keywords hinzufügen und verwalten. Das System zeigt
          dir automatisch in wie vielen Pins jedes Keyword gefunden wurde
          und welches Performance-Signal es hat. Nach dem Hinzufügen neuer
          Keywords kannst du mit dem Button „Keywords neu abgleichen" das
          System alle Pins nach diesen Keywords durchsuchen lassen.
        </div>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler beim Laden: {loadError}
        </div>
      )}

      <KeywordsClient
        keywords={keywords}
        availableContents={availableContents}
      />
    </div>
  )
}
