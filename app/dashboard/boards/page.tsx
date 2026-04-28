import { createClient } from '@/lib/supabase-server'
import BoardsClient, {
  type Board,
  type BoardPin,
  type ContentOption,
  type KeywordOption,
} from './BoardsClient'

type RawBoardRow = {
  id: string
  name: string
  beschreibung: string | null
  kategorie: string | null
  pinterest_url: string | null
  geheim: boolean
  strategie_fokus: Board['strategie_fokus']
  impressionen: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
  created_at: string
  board_keywords: Array<{
    keyword_id: string
    keywords: { id: string; keyword: string } | null
  }>
  content_boards: Array<{
    content_id: string
    content_inhalte: { id: string; titel: string } | null
  }>
}

export default async function BoardsPage() {
  const supabase = createClient()

  const [boardsRes, keywordsRes, contentsRes, pinsRes, pinAnalyticsRes] =
    await Promise.all([
      supabase
        .from('boards')
        .select(
          `
        id, name, beschreibung, kategorie, pinterest_url, geheim,
        strategie_fokus, impressionen, klicks_auf_pins, ausgehende_klicks,
        saves, created_at,
        board_keywords ( keyword_id, keywords ( id, keyword ) ),
        content_boards ( content_id, content_inhalte ( id, titel ) )
      `
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('keywords')
        .select('id, keyword, typ')
        .order('keyword', { ascending: true }),
      supabase
        .from('content_inhalte')
        .select('id, titel')
        .order('titel', { ascending: true }),
      supabase
        .from('pins')
        .select(
          'id, board_id, titel, status, geplante_veroeffentlichung, created_at'
        )
        .not('board_id', 'is', null)
        .order('geplante_veroeffentlichung', {
          ascending: false,
          nullsFirst: false,
        }),
      supabase
        .from('pins_analytics')
        .select('pin_id, datum, impressionen, klicks')
        .order('datum', { ascending: false }),
    ])

  const rawRows = (boardsRes.data ?? []) as unknown as RawBoardRow[]
  const boards: Board[] = rawRows.map((row) => ({
    id: row.id,
    name: row.name,
    beschreibung: row.beschreibung,
    kategorie: row.kategorie,
    pinterest_url: row.pinterest_url,
    geheim: row.geheim,
    strategie_fokus: row.strategie_fokus,
    impressionen: row.impressionen,
    klicks_auf_pins: row.klicks_auf_pins,
    ausgehende_klicks: row.ausgehende_klicks,
    saves: row.saves,
    created_at: row.created_at,
    keywords: row.board_keywords
      .filter((bk) => bk.keywords)
      .map((bk) => ({
        id: bk.keywords!.id,
        keyword: bk.keywords!.keyword,
      })),
    contents: row.content_boards
      .filter((cb) => cb.content_inhalte)
      .map((cb) => ({
        id: cb.content_inhalte!.id,
        titel: cb.content_inhalte!.titel,
      })),
  }))

  const availableKeywords = (keywordsRes.data ?? []) as KeywordOption[]
  const availableContents = (contentsRes.data ?? []) as ContentOption[]

  // Pins pro Board mit aktuellster CTR (aus pins_analytics)
  type PinRow = {
    id: string
    board_id: string
    titel: string | null
    status: 'entwurf' | 'geplant' | 'veroeffentlicht'
    geplante_veroeffentlichung: string | null
    created_at: string
  }
  type PinAnalyticsLite = {
    pin_id: string
    datum: string
    impressionen: number
    klicks: number
  }
  const pinRows = (pinsRes.data ?? []) as unknown as PinRow[]
  const pinAnalyticsRows =
    (pinAnalyticsRes.data ?? []) as unknown as PinAnalyticsLite[]

  // Latest analytics per pin (rows DESC by datum)
  const latestAnalyticsByPin = new Map<string, PinAnalyticsLite>()
  for (const r of pinAnalyticsRows) {
    if (!latestAnalyticsByPin.has(r.pin_id))
      latestAnalyticsByPin.set(r.pin_id, r)
  }

  const pinsByBoardId: Record<string, BoardPin[]> = {}
  for (const p of pinRows) {
    const a = latestAnalyticsByPin.get(p.id) ?? null
    const ctr =
      a && a.impressionen > 0 ? (a.klicks / a.impressionen) * 100 : null
    const arr = pinsByBoardId[p.board_id] ?? []
    arr.push({
      id: p.id,
      titel: p.titel,
      status: p.status,
      geplante_veroeffentlichung: p.geplante_veroeffentlichung,
      ctr,
    })
    pinsByBoardId[p.board_id] = arr
  }

  const loadError =
    boardsRes.error?.message ??
    keywordsRes.error?.message ??
    contentsRes.error?.message ??
    pinsRes.error?.message ??
    pinAnalyticsRes.error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Boards</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verwalte deine Pinterest-Boards mit Strategie und Keywords.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler beim Laden: {loadError}
        </div>
      )}

      <BoardsClient
        boards={boards}
        availableKeywords={availableKeywords}
        availableContents={availableContents}
        pinsByBoardId={pinsByBoardId}
      />
    </div>
  )
}
