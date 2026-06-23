import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import BoardsClient, {
  type Board,
  type BoardPin,
  type ContentOption,
  type KeywordOption,
  type UrlOption,
} from './BoardsClient'
import { keywordInText } from '../analytics/utils'

type RawBoardRow = {
  id: string
  name: string
  beschreibung: string | null
  kategorie: string | null
  pinterest_url: string | null
  created_at: string
  content_boards: Array<{
    content_id: string
    content_inhalte: { id: string; titel: string } | null
  }>
  url_boards: Array<{
    url_id: string
    ziel_urls: { id: string; titel: string; url: string } | null
  }>
}

export default async function BoardsPage() {
  const supabase = createClient()

  const [
    boardsRes,
    keywordsRes,
    contentsRes,
    urlsRes,
    pinsRes,
    pinAnalyticsRes,
    contentKeywordsRes,
  ] = await Promise.all([
    supabase
      .from('boards')
      .select(
        `
        id, name, beschreibung, kategorie, pinterest_url, created_at,
        content_boards ( content_id, content_inhalte ( id, titel ) ),
        url_boards ( url_id, ziel_urls ( id, titel, url ) )
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
      .from('ziel_urls')
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
      .is('deleted_at', null)
      .order('datum', { ascending: false }),
    supabase.from('content_keywords').select('content_id, keyword_id'),
  ])

  const rawRows = (boardsRes.data ?? []) as unknown as RawBoardRow[]
  const availableKeywords = (keywordsRes.data ?? []) as KeywordOption[]
  const availableContents = (contentsRes.data ?? []) as ContentOption[]
  const availableUrls = (urlsRes.data ?? []) as UrlOption[]

  const boards: Board[] = rawRows.map((row) => ({
    id: row.id,
    name: row.name,
    beschreibung: row.beschreibung,
    kategorie: row.kategorie,
    pinterest_url: row.pinterest_url,
    created_at: row.created_at,
    // Automatisches Screening: zeigt die Keywords aus der Keyword-Datenbank,
    // die als Teilstring im Board-Namen ODER in der Board-Beschreibung
    // vorkommen (statt manueller Zuordnung). beschreibung kann null sein,
    // keywordInText fängt das ab.
    keywords: availableKeywords
      .filter(
        (k) =>
          keywordInText(k.keyword, row.name) ||
          keywordInText(k.keyword, row.beschreibung)
      )
      .map((k) => ({ id: k.id, keyword: k.keyword })),
    contents: row.content_boards
      .filter((cb) => cb.content_inhalte)
      .map((cb) => ({
        id: cb.content_inhalte!.id,
        titel: cb.content_inhalte!.titel,
      })),
    urls: row.url_boards
      .filter((ub) => ub.ziel_urls)
      .map((ub) => ({
        id: ub.ziel_urls!.id,
        titel: ub.ziel_urls!.titel,
        url: ub.ziel_urls!.url,
      })),
  }))

  // contentKeywordIds: für jeden Content die Liste der zugeordneten Keyword-IDs
  // — wird im KI-Prompt-Modal genutzt, um die Keyword-Auswahl zu filtern.
  const contentKeywordsRows = (contentKeywordsRes.data ?? []) as Array<{
    content_id: string
    keyword_id: string
  }>
  const contentKeywordIds: Record<string, string[]> = {}
  for (const row of contentKeywordsRows) {
    const arr = contentKeywordIds[row.content_id] ?? []
    arr.push(row.keyword_id)
    contentKeywordIds[row.content_id] = arr
  }

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
    urlsRes.error?.message ??
    pinsRes.error?.message ??
    pinAnalyticsRes.error?.message ??
    contentKeywordsRes.error?.message ??
    null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Boards</h1>
        <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Boards sind die Pinnwände deines Pinterest-Profils. Jeder Pin liegt in
          einem Board, und Pinterest nutzt Board-Name und Beschreibung, um
          einzuordnen, worum es geht. Deshalb sind Keywords hier entscheidend:
          Der Board-Name ist nach dem Pin-Titel deine wichtigste Stellschraube
          für Sichtbarkeit, und auch die Board-Beschreibung sollte deine
          Keywords aufgreifen. Hier legst du deine Boards an und ordnest ihnen
          Inhalte und Ziel-URLs zu. Wie du Boards richtig benennst und aufbaust,
          zeigt dir die{' '}
          <Link
            href="/dashboard/strategie?tab=keywords&accordion=boards-aufbauen-benennen"
            className="font-medium text-link underline underline-offset-2"
          >
            Anleitung dazu
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
            <span className="flex-1 group-hover/sum:text-white">So funktioniert diese Seite</span>
          </summary>
          <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">Was du eingibst</p>
              <p>
                Name, Beschreibung, Kategorie und optional die Pinterest-URL
                deines Boards. Inhalte und Ziel-URLs ordnest du zu.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Keywords</p>
              <p>
                Die Keyword-Spalte zeigt automatisch, welche deiner Keywords im
                Board-Namen und in der Board-Beschreibung vorkommen. Hinter jedem
                Keyword steht ein N (Name) oder B (Beschreibung). So siehst du
                auf einen Blick, ob dein Board die richtigen Begriffe enthält,
                denn Board-Name und Beschreibung zählen für deine Sichtbarkeit.
                Steht in der Spalte nichts, enthalten Board-Name und
                Board-Beschreibung noch keines deiner Keywords, ein Hinweis, sie
                zu schärfen. Gematcht wird nur, was genauso in deiner
                Keyword-Liste steht. Pflege dort alle Varianten, nach denen
                gesucht wird, also etwa „Wellness Hotel“ und einzeln „Wellness“
                und „Hotel“.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Die Kategorie</p>
              <p>
                Die Kategorie ordnet dein Board einer Nische zu. Aus den
                Kategorien all deiner Boards bestimmt Pin-Flow deine Hauptnische
                und die passenden Vergleichswerte.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Nur öffentliche Boards
              </p>
              <p>
                Lege hier nur deine öffentlichen Boards an. Private oder geheime
                Boards, die du auf Pinterest nur zur eigenen Inspiration führst,
                gehören nicht ins Cockpit, denn Pinterest liefert für sie keine
                Analytics-Daten.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Board mit KI erstellen
              </p>
              <p>
                Erzeugt aus Thema, Keywords und Zielgruppe einen Vorschlag für
                Name und Beschreibung, den du auf Pinterest übernehmen kannst.
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

      <BoardsClient
        boards={boards}
        availableKeywords={availableKeywords}
        availableContents={availableContents}
        availableUrls={availableUrls}
        pinsByBoardId={pinsByBoardId}
        contentKeywordIds={contentKeywordIds}
      />
    </div>
  )
}
