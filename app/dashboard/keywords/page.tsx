import { createClient } from '@/lib/supabase-server'
import KeywordsClient, {
  type Keyword,
  type ContentOption,
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

export default async function KeywordsPage() {
  const supabase = createClient()

  const [keywordsRes, contentsRes] = await Promise.all([
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
  ])

  const rawRows = (keywordsRes.data ?? []) as unknown as RawKeywordRow[]
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
  }))

  const availableContents = (contentsRes.data ?? []) as ContentOption[]

  const loadError =
    keywordsRes.error?.message ?? contentsRes.error?.message ?? null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Keywords</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verwalte deine Pinterest-Keywords nach Typ und Saison.
        </p>
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
