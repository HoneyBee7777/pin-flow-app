import { createClient } from '@/lib/supabase-server'
import PinProduktionClient from './PinProduktionClient'
import type {
  BoardOption,
  CanvaVorlageOption,
  ContentOption,
  KeywordOption,
  PinWithRelations,
  SaisonEventOption,
  ZielUrlOption,
} from './utils'

const PIN_SELECT = `
  id, user_id, content_id, canva_vorlage_id, ziel_url_id, board_id, saison_event_id,
  titel, hook, beschreibung, call_to_action, strategie_typ, conversion_ziel, hook_art,
  pin_format, status, geplante_veroeffentlichung, impressionen, klicks, saves, created_at,
  content_inhalte ( id, titel ),
  canva_vorlagen ( id, name ),
  ziel_urls ( id, titel, url ),
  boards ( id, name ),
  saison_events ( id, event_name ),
  pin_keywords ( keyword_id, keywords ( id, keyword, typ ) )
`

type RawPinRow = Omit<
  PinWithRelations,
  'content' | 'vorlage' | 'url' | 'board' | 'saison_event' | 'keywords'
> & {
  content_inhalte: { id: string; titel: string } | null
  canva_vorlagen: { id: string; name: string } | null
  ziel_urls: { id: string; titel: string; url: string } | null
  boards: { id: string; name: string } | null
  saison_events: { id: string; event_name: string } | null
  pin_keywords: Array<{
    keyword_id: string
    keywords: {
      id: string
      keyword: string
      typ: KeywordOption['typ']
    } | null
  }>
}

type ContentRaw = {
  id: string
  titel: string
  content_keywords: Array<{ keyword_id: string }>
}

type DuplRow = { canva_vorlage_id: string; ziel_url_id: string }

export default async function PinProduktionPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    pinsRes,
    contentsRes,
    keywordsRes,
    boardsRes,
    urlsRes,
    vorlagenRes,
    saisonRes,
    duplCountRes,
    settingsRes,
  ] = await Promise.all([
    supabase
      .from('pins')
      .select(PIN_SELECT)
      .order('created_at', { ascending: false }),
    supabase
      .from('content_inhalte')
      .select('id, titel, content_keywords ( keyword_id )')
      .order('titel', { ascending: true }),
    supabase
      .from('keywords')
      .select('id, keyword, typ')
      .order('keyword', { ascending: true }),
    supabase
      .from('boards')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('ziel_urls')
      .select('id, titel, url')
      .order('titel', { ascending: true }),
    supabase
      .from('canva_vorlagen')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('saison_events')
      .select('id, event_name, event_datum')
      .order('event_datum', { ascending: true, nullsFirst: false }),
    supabase
      .from('pins')
      .select('canva_vorlage_id, ziel_url_id')
      .not('canva_vorlage_id', 'is', null)
      .not('ziel_url_id', 'is', null),
    supabase
      .from('einstellungen')
      .select('eigene_signalwoerter')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const customSignalwoerter =
    (settingsRes.data?.eigene_signalwoerter ?? null) as string | null

  const pinsRaw = (pinsRes.data ?? []) as unknown as RawPinRow[]
  const pins: PinWithRelations[] = pinsRaw.map((row) => {
    const {
      content_inhalte,
      canva_vorlagen,
      ziel_urls,
      boards,
      saison_events,
      pin_keywords,
      ...rest
    } = row
    return {
      ...rest,
      content: content_inhalte,
      vorlage: canva_vorlagen,
      url: ziel_urls,
      board: boards,
      saison_event: saison_events,
      keywords: pin_keywords
        .filter((pk) => pk.keywords)
        .map((pk) => ({
          id: pk.keywords!.id,
          keyword: pk.keywords!.keyword,
          typ: pk.keywords!.typ,
        })),
    }
  })

  const contentsRaw = (contentsRes.data ?? []) as unknown as ContentRaw[]
  const contents: ContentOption[] = contentsRaw.map((c) => ({
    id: c.id,
    titel: c.titel,
    keywordIds: c.content_keywords.map((ck) => ck.keyword_id),
  }))

  const keywords = (keywordsRes.data ?? []) as KeywordOption[]
  const boards = (boardsRes.data ?? []) as BoardOption[]
  const urls = (urlsRes.data ?? []) as ZielUrlOption[]
  const vorlagen = (vorlagenRes.data ?? []) as CanvaVorlageOption[]
  const saisonEvents = (saisonRes.data ?? []) as SaisonEventOption[]

  const dupRows = (duplCountRes.data ?? []) as unknown as DuplRow[]
  const comboCount: Record<string, number> = {}
  for (const r of dupRows) {
    const key = `${r.canva_vorlage_id}|${r.ziel_url_id}`
    comboCount[key] = (comboCount[key] ?? 0) + 1
  }

  const loadError =
    pinsRes.error?.message ??
    contentsRes.error?.message ??
    keywordsRes.error?.message ??
    boardsRes.error?.message ??
    urlsRes.error?.message ??
    vorlagenRes.error?.message ??
    saisonRes.error?.message ??
    duplCountRes.error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pin-Produktion</h1>
        <p className="mt-1 text-sm text-gray-600">
          Plane, erstelle und verwalte deine Pinterest-Pins zentral.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      <PinProduktionClient
        pins={pins}
        contents={contents}
        keywords={keywords}
        boards={boards}
        urls={urls}
        vorlagen={vorlagen}
        saisonEvents={saisonEvents}
        comboCount={comboCount}
        customSignalwoerter={customSignalwoerter}
      />
    </div>
  )
}
