import { createClient } from '@/lib/supabase-server'
import PinProduktionClient from './PinProduktionClient'
import type {
  BoardOption,
  CanvaVorlageOption,
  ContentOption,
  KeywordOption,
  KeywordSignal,
  PinKeywordMatchSource,
  PinWithRelations,
  SaisonEventOption,
  ZielUrlOption,
} from './utils'

const PIN_SELECT = `
  id, user_id, content_id, canva_vorlage_id, ziel_url_id, board_id, saison_event_id,
  titel, hook, beschreibung, call_to_action, strategie_typ, conversion_ziel, hook_art,
  pin_format, status, geplante_veroeffentlichung, impressionen, klicks, saves, created_at,
  variante_von_pin_id, variante_typ, pinterest_pin_url,
  content_inhalte ( id, titel ),
  canva_vorlagen ( id, name ),
  ziel_urls ( id, titel, url ),
  boards ( id, name ),
  saison_events ( id, event_name ),
  pin_keywords ( keyword_id, match_source, keywords ( id, keyword, typ ) )
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
    match_source: PinKeywordMatchSource
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

// Self-healing Status-Reconciliation: gleicht alle Pins des aktuellen Nutzers
// auf den korrekten Status an, basierend auf geplante_veroeffentlichung.
// Idempotent — die `.neq('status', …)`-Filter sorgen dafür, dass nur Pins mit
// abweichendem Status angefasst werden. Läuft bei jedem Seitenaufruf als
// stiller No-Op, sobald alles synchron ist. Vergleichs-Datum: Berlin-Lokal
// (matched mit `computeStatus` in actions.ts).
async function reconcilePinStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  try {
    // 1. Kein Datum → 'entwurf'
    await supabase
      .from('pins')
      .update({ status: 'entwurf' })
      .eq('user_id', userId)
      .is('geplante_veroeffentlichung', null)
      .neq('status', 'entwurf')

    // 2. Datum > heute → 'geplant'
    await supabase
      .from('pins')
      .update({ status: 'geplant' })
      .eq('user_id', userId)
      .gt('geplante_veroeffentlichung', today)
      .neq('status', 'geplant')

    // 3. Datum <= heute → 'veroeffentlicht'
    await supabase
      .from('pins')
      .update({ status: 'veroeffentlicht' })
      .eq('user_id', userId)
      .lte('geplante_veroeffentlichung', today)
      .neq('status', 'veroeffentlicht')
  } catch (err) {
    // Fehler beim Reconcile blockiert das Seiten-Rendering nicht — die
    // Anzeige nutzt im Worst-Case den alten DB-Status, das ist tolerierbar.
    console.error('[PinProduktion] Status-Reconcile fehlgeschlagen:', err)
  }
}

export default async function PinProduktionPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Status-Migration VOR dem Pin-Fetch ausführen, damit die Tabelle direkt die
  // korrekten Werte zeigt. await ist wichtig — sonst läuft der Fetch noch
  // gegen den alten Zustand.
  await reconcilePinStatus(supabase, user.id)

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
    pinKeywordsRes,
    pinAnalyticsRes,
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
    // Für Keyword-Signale (Stark / Gut / Beobachten) brauchen wir alle
    // pin_keywords + die latest pins_analytics pro Pin. Defensiv eingewickelt
    // damit ein Fehler die Tabelle nicht crasht — Spalte zeigt dann '—'.
    Promise.resolve(
      supabase
        .from('pin_keywords')
        .select('pin_id, keyword_id')
        .eq('user_id', user.id)
    ).catch((err: unknown) => {
      console.error('[PinProduktion] pin_keywords query failed:', err)
      return { data: [], error: err as Error }
    }),
    Promise.resolve(
      supabase
        .from('pins_analytics')
        .select('pin_id, datum, impressionen, klicks')
        .order('datum', { ascending: false })
    ).catch((err: unknown) => {
      console.error('[PinProduktion] pins_analytics query failed:', err)
      return { data: [], error: err as Error }
    }),
  ])

  const customSignalwoerter =
    (settingsRes.data?.eigene_signalwoerter ?? null) as string | null

  const pinsRaw = (pinsRes.data ?? []) as unknown as RawPinRow[]
  const titelById = new Map<string, string | null>()
  for (const r of pinsRaw) titelById.set(r.id, r.titel)
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
          match_source: pk.match_source,
        })),
      variante_von_titel: row.variante_von_pin_id
        ? titelById.get(row.variante_von_pin_id) ?? null
        : null,
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

  // Keyword-Signal pro Keyword: gleiche Logik wie auf der Keywords-Seite —
  // pinsCount + Ø CTR (latest analytics pro Pin) → Signal.
  type PinKeywordRow = { pin_id: string; keyword_id: string }
  type PinAnalyticsRow = {
    pin_id: string
    datum: string
    impressionen: number
    klicks: number
  }
  const pinKeywordRows =
    (pinKeywordsRes.data ?? []) as unknown as PinKeywordRow[]
  const pinAnalyticsRows =
    (pinAnalyticsRes.data ?? []) as unknown as PinAnalyticsRow[]

  const latestAnalyticsByPin = new Map<
    string,
    { impressionen: number; klicks: number }
  >()
  for (const row of pinAnalyticsRows) {
    if (!latestAnalyticsByPin.has(row.pin_id)) {
      latestAnalyticsByPin.set(row.pin_id, {
        impressionen: row.impressionen ?? 0,
        klicks: row.klicks ?? 0,
      })
    }
  }

  const pinIdsByKeyword = new Map<string, Set<string>>()
  for (const row of pinKeywordRows) {
    const set = pinIdsByKeyword.get(row.keyword_id) ?? new Set<string>()
    set.add(row.pin_id)
    pinIdsByKeyword.set(row.keyword_id, set)
  }

  const keywordSignalById: Record<string, KeywordSignal> = {}
  pinIdsByKeyword.forEach((pinIds, keywordId) => {
    if (pinIds.size === 0) {
      keywordSignalById[keywordId] = 'unused'
      return
    }
    let ctrSum = 0
    let ctrCount = 0
    pinIds.forEach((pinId) => {
      const a = latestAnalyticsByPin.get(pinId)
      if (!a) return
      if (a.impressionen > 0) {
        ctrSum += (a.klicks / a.impressionen) * 100
        ctrCount += 1
      }
    })
    const avgCtr = ctrCount > 0 ? ctrSum / ctrCount : 0
    if (avgCtr > 2 && pinIds.size >= 3) {
      keywordSignalById[keywordId] = 'stark'
    } else if (avgCtr >= 1 && avgCtr <= 2) {
      keywordSignalById[keywordId] = 'gut'
    } else {
      keywordSignalById[keywordId] = 'beobachten'
    }
  })

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
        <p className="mt-1 text-sm text-gray-500">
          Hier erfasst du alle Pins — veröffentlichte, geplante und
          Entwürfe. Du siehst welche Keywords in deinen Pins stecken
          (📌 Titel · 📝 Beschreibung), kannst nach Board, Status,
          Keyword und mehr filtern und neue Pins direkt anlegen oder per
          CSV importieren. Die Grundlage für dein monatliches
          Analytics-Update.
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
        keywordSignalById={keywordSignalById}
      />
    </div>
  )
}
