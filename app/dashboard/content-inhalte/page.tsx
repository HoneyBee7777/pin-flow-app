import { createClient } from '@/lib/supabase-server'
import ContentClient, {
  type BoardOption,
  type ContentItem,
  type KeywordOption,
  type UrlOption,
} from './ContentClient'

type RawContentRow = {
  id: string
  titel: string
  typ: ContentItem['typ']
  strategie_typ: ContentItem['strategie_typ']
  notizen: string | null
  created_at: string
  content_keywords: Array<{
    keyword_id: string
    keywords: { id: string; keyword: string } | null
  }>
  content_urls: Array<{
    url_id: string
    ziel_urls: { id: string; titel: string; url: string } | null
  }>
  content_boards: Array<{
    board_id: string
    boards: { id: string; name: string } | null
  }>
  pins: Array<{ id: string }> | null
}

export default async function ContentInhaltePage() {
  const supabase = createClient()

  const [contentRes, keywordsRes, urlsRes, boardsRes] = await Promise.all([
    supabase
      .from('content_inhalte')
      .select(
        `
        id, titel, typ, strategie_typ, notizen, created_at,
        content_keywords ( keyword_id, keywords ( id, keyword ) ),
        content_urls ( url_id, ziel_urls ( id, titel, url ) ),
        content_boards ( board_id, boards ( id, name ) ),
        pins!content_id ( id )
      `
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('keywords')
      .select('id, keyword, typ')
      .order('keyword', { ascending: true }),
    supabase
      .from('ziel_urls')
      .select('id, titel, url')
      .order('titel', { ascending: true }),
    supabase
      .from('boards')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const rawRows = (contentRes.data ?? []) as unknown as RawContentRow[]
  const items: ContentItem[] = rawRows.map((row) => ({
    id: row.id,
    titel: row.titel,
    typ: row.typ,
    strategie_typ: row.strategie_typ,
    notizen: row.notizen,
    created_at: row.created_at,
    keywords: row.content_keywords
      .filter((ck) => ck.keywords)
      .map((ck) => ({ id: ck.keywords!.id, keyword: ck.keywords!.keyword })),
    urls: row.content_urls
      .filter((cu) => cu.ziel_urls)
      .map((cu) => ({
        id: cu.ziel_urls!.id,
        titel: cu.ziel_urls!.titel,
        url: cu.ziel_urls!.url,
      })),
    boards: row.content_boards
      .filter((cb) => cb.boards)
      .map((cb) => ({ id: cb.boards!.id, name: cb.boards!.name })),
    pinCount: row.pins?.length ?? 0,
  }))

  const keywords = (keywordsRes.data ?? []) as KeywordOption[]
  const urls = (urlsRes.data ?? []) as UrlOption[]
  const boards = (boardsRes.data ?? []) as BoardOption[]

  const loadError =
    contentRes.error?.message ??
    keywordsRes.error?.message ??
    urlsRes.error?.message ??
    boardsRes.error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content-Inhalte</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verknüpfe deine Inhalte mit Keywords, Ziel-URLs und Boards.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler beim Laden: {loadError}
        </div>
      )}

      <ContentClient
        items={items}
        availableKeywords={keywords}
        availableUrls={urls}
        availableBoards={boards}
      />
    </div>
  )
}
