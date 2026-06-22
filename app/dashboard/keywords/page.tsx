import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { calcCtr } from '../analytics/utils'
import KeywordsClient, {
  type ContentOption,
  type Keyword,
  type KeywordStats,
} from './KeywordsClient'

type RawKeywordRow = {
  id: string
  keyword: string
  typ: Keyword['typ']
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
          id, keyword, typ, notizen, created_at,
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
          .is('deleted_at', null)
          .order('datum', { ascending: false })
      : Promise.resolve({ data: [] as PinAnalyticsRow[], error: null }),
  ])

  const rawRows = (keywordsRes.data ?? []) as unknown as RawKeywordRow[]

  // Kumulierte Werte pro Pin — Summe Klicks/Impressionen über ALLE Perioden
  // (deleted_at IS NULL ist durch die Query gesichert). Ersetzt die frühere
  // latest-only-Reduktion, damit die Keyword-CTR kumuliert-pooled berechnet
  // wird. Muster wie dashboard/page.tsx (pinTotals) bzw. PinsTab.
  const pinAnalyticsRows =
    (pinAnalyticsRes.data ?? []) as unknown as PinAnalyticsRow[]
  const pinTotals = new Map<string, { klicks: number; impressionen: number }>()
  for (const row of pinAnalyticsRows) {
    const t = pinTotals.get(row.pin_id) ?? { klicks: 0, impressionen: 0 }
    t.klicks += row.klicks ?? 0
    t.impressionen += row.impressionen ?? 0
    pinTotals.set(row.pin_id, t)
  }

  // Pro Keyword: distinct Pin-IDs sammeln, daraus dann die kumuliert-pooled
  // CTR bilden. Wir bauen einen Map<keywordId, Set<pinId>> auf — Set garantiert
  // distinct.
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
      return {
        pinsCount: 0,
        avgCtr: null,
        avgKlicks: null,
      }
    }
    // Kumuliert-pooled: alle Klicks/Impressionen der Keyword-Pins über alle
    // Perioden summieren, dann CTR = ΣKlicks / ΣImpressionen.
    let cumKlicks = 0
    let cumImpressionen = 0
    pinIds.forEach((pinId) => {
      const t = pinTotals.get(pinId)
      if (!t) return
      cumKlicks += t.klicks
      cumImpressionen += t.impressionen
    })
    const pinsCount = pinIds.size
    return {
      pinsCount,
      avgCtr: calcCtr(cumKlicks, cumImpressionen),
      avgKlicks: pinsCount > 0 ? cumKlicks / pinsCount : 0,
    }
  }

  const keywords: Keyword[] = rawRows.map((row) => ({
    id: row.id,
    keyword: row.keyword,
    typ: row.typ,
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
        <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Auf Pinterest wirst du über Keywords gefunden, nicht über Likes. Das
          richtige Keyword entscheidet, ob dein Pin in der Suche auftaucht oder
          unsichtbar bleibt. Hier sammelst du deine Keywords und siehst an
          echten Zahlen, welche davon Reichweite bringen. Wie du die passenden
          findest, zeigt dir die{' '}
          <Link
            href="/dashboard/strategie?tab=keywords&accordion=keywords-recherchieren"
            className="font-medium text-link underline underline-offset-2"
          >
            Anleitung zur Keyword-Recherche
          </Link>
          .
        </p>
        <details className="group overflow-hidden max-w-3xl rounded-lg border border-gray-200 bg-white shadow-sm">
          <summary className="group/sum flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-marke-blaugrau [&::-webkit-details-marker]:hidden">
            <span
              className="text-lg leading-none text-gray-400 transition-transform group-hover/sum:text-white"
              aria-hidden
            >
              <span className="inline group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            <span className="flex-1 group-hover/sum:text-white">
              So funktioniert diese Seite
            </span>
          </summary>
          <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">
                Was du eingibst, was Pin-Flow berechnet
              </p>
              <p>
                Du gibst drei Dinge ein: das Keyword, seinen Typ und die
                Inhalte, zu denen es gehört. Alles andere berechnet Pin-Flow für
                dich: in wie vielen Pins das Keyword vorkommt, die
                durchschnittliche CTR und die Klicks.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Der Typ</p>
              <p>
                Der Typ sagt, wie viele Menschen nach einem Keyword suchen, also
                wie breit oder spezifisch es ist. Haupt-Keywords haben viel
                Reichweite, aber auch viel Konkurrenz, Longtail-Keywords wenig
                Reichweite, aber hohe Trefferwahrscheinlichkeit. Mehr dazu in
                den{' '}
                <Link
                  href="/dashboard/strategie?tab=keywords&accordion=keyword-typen"
                  className="text-link underline underline-offset-2"
                >
                  drei Keyword-Typen
                </Link>
                .
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Abgleichen und importieren
              </p>
              <p>
                Hast du <strong>neue Keywords angelegt</strong>, durchsucht der
                Button <strong>Keywords neu abgleichen</strong> auch deine
                älteren Pins danach und verknüpft sie.
              </p>
              <p className="mt-2">
                Mehrere Keywords auf einmal, etwa aus einer Excel-Tabelle, fügst
                du über <strong>Keywords importieren</strong> ein.
              </p>
            </div>
          </div>
        </details>
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
