import { createClient } from '@/lib/supabase-server'
import ZielUrlsClient, {
  type BoardOption,
  type ContentOption,
  type ZielUrl,
} from './ZielUrlsClient'

type RawZielUrlRow = {
  id: string
  url: string
  titel: string
  typ: ZielUrl['typ']
  prioritaet: ZielUrl['prioritaet']
  notizen: string | null
  created_at: string
  content_urls: Array<{
    content_id: string
    content_inhalte: { id: string; titel: string } | null
  }>
  url_boards: Array<{
    boards: { id: string; name: string } | null
  }>
  pins: Array<{ id: string }> | null
}

export default async function ZielUrlsPage() {
  const supabase = createClient()

  const [urlsRes, contentsRes, boardsRes] = await Promise.all([
    supabase
      .from('ziel_urls')
      .select(
        `
        id, url, titel, typ, prioritaet, notizen, created_at,
        content_urls ( content_id, content_inhalte ( id, titel ) ),
        url_boards ( boards ( id, name ) ),
        pins!ziel_url_id ( id )
      `
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('content_inhalte')
      .select('id, titel')
      .order('titel', { ascending: true }),
    supabase
      .from('boards')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const rawRows = (urlsRes.data ?? []) as unknown as RawZielUrlRow[]
  const urls: ZielUrl[] = rawRows.map((row) => ({
    id: row.id,
    url: row.url,
    titel: row.titel,
    typ: row.typ,
    prioritaet: row.prioritaet,
    notizen: row.notizen,
    created_at: row.created_at,
    contents: row.content_urls
      .filter((cu) => cu.content_inhalte)
      .map((cu) => ({
        id: cu.content_inhalte!.id,
        titel: cu.content_inhalte!.titel,
      })),
    boards: row.url_boards
      .filter((ub) => ub.boards)
      .map((ub) => ({ id: ub.boards!.id, name: ub.boards!.name })),
    pinCount: row.pins?.length ?? 0,
  }))

  const availableContents = (contentsRes.data ?? []) as ContentOption[]
  const availableBoards = (boardsRes.data ?? []) as BoardOption[]

  const loadError =
    urlsRes.error?.message ??
    contentsRes.error?.message ??
    boardsRes.error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ziel-URLs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sammle und priorisiere alle URLs, auf die deine Pins verlinken sollen.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler beim Laden: {loadError}
        </div>
      )}

      <ZielUrlsClient
        urls={urls}
        availableContents={availableContents}
        availableBoards={availableBoards}
      />
    </div>
  )
}
