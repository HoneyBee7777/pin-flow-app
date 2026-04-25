import { createClient } from '@/lib/supabase-server'
import BoardsClient, {
  type Board,
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

  const [boardsRes, keywordsRes, contentsRes] = await Promise.all([
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

  const loadError =
    boardsRes.error?.message ??
    keywordsRes.error?.message ??
    contentsRes.error?.message ??
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
      />
    </div>
  )
}
