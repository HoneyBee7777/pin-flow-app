import { createClient } from '@/lib/supabase-server'
import AnalyticsClient from './AnalyticsClient'
import UpdateStatusBanner from './UpdateStatusBanner'
import {
  boardHandlung,
  boardThresholdsFromSettings,
  calcBoardEngagementRate,
  calcCtr,
  diagnoseBoard,
  diffDays,
  scoreBoardHybrid,
  topPercentCutoff,
  thresholdsFromSettings,
  todayIso,
  withGrowth,
  type BoardAnalyticsEntry,
  type BoardAnalyticsRow,
  type BoardOption,
  type EinstellungenSchwellwerte,
  type EinstellungenSchwellwerteBoard,
  type PinAnalyticsRow,
  type PinOption,
  type ProfilAnalytics,
} from './utils'
import { loadUserBenchmark } from './benchmark'
import { loadAccountNicheProfile } from './account-niche'
import { getAudienceSnapshots } from '@/lib/audience-snapshot'

type RawPinAnalyticsRow = {
  id: string
  pin_id: string
  datum: string
  zeitraum_von: string | null
  zeitraum_bis: string | null
  impressionen: number
  klicks: number
  saves: number
  created_at: string
  pins: PinOption | null
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    profilRes,
    settingsRes,
    pinsRes,
    pinAnalyticsRes,
    boardsRes,
    boardAnalyticsRes,
    pinsForBoardRes,
    pendingRes,
    deletedPinAnalyticsRes,
  ] = await Promise.all([
    supabase
      .from('profil_analytics')
      .select(
        'id, datum, zeitraum_von, zeitraum_bis, impressionen, ausgehende_klicks, saves, gesamte_zielgruppe, interagierende_zielgruppe, created_at'
      )
      .order('datum', { ascending: false }),
    supabase
      .from('einstellungen')
      .select(
        `pinterest_analytics_url, analytics_update_datum,
         status_update_intervall, status_update_vorwarnung,
         schwellwert_beobachtung, schwellwert_min_klicks,
         schwellwert_ctr,
         schwellwert_min_imp_ctr_urteil, schwellwert_min_imp_reichweite_stark,
         schwellwert_min_klicks_nutzer_signal,
         schwellwert_top_performer_max_alter,
         schwellwert_schlafender_gewinner_alter,
         schwellwert_ctr_boost_faktor,
         schwellwert_board_wenig_aktiv, schwellwert_board_inaktiv,
         schwellwert_board_top_er, schwellwert_board_top_prozent,
         schwellwert_board_schwach_er, schwellwert_board_wachstum_trend`
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pins')
      .select(
        'id, titel, status, created_at, geplante_veroeffentlichung, pinterest_pin_url, pinterest_pin_id'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('pins_analytics')
      .select(
        `id, pin_id, datum, zeitraum_von, zeitraum_bis, impressionen, klicks, saves, created_at,
         pins ( id, titel, status, created_at, geplante_veroeffentlichung, pinterest_pin_url, pinterest_pin_id )`
      )
      .is('deleted_at', null)
      .order('datum', { ascending: false }),
    supabase
      .from('boards')
      .select('id, name, pinterest_url')
      .order('name', { ascending: true }),
    supabase
      .from('board_analytics')
      .select(
        'id, board_id, datum, impressionen, klicks_auf_pins, ausgehende_klicks, saves, engagement, anzahl_pins, created_at'
      )
      .order('datum', { ascending: false }),
    supabase
      .from('pins')
      .select('board_id, geplante_veroeffentlichung, created_at')
      .not('board_id', 'is', null),
    // Persistente „Nicht zugeordnet"-Liste aus dem letzten CSV-Import.
    // DESC nach created_at — der initiale Pending-State wird daraus gebaut.
    supabase
      .from('csv_import_pending')
      .select(
        'id, type, pinterest_url, pinterest_id, klicks, impressionen, saves, engagement, klicks_auf_pins, ausgehende_klicks, zeitraum_von, zeitraum_bis, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Soft-deleted pins_analytics-Einträge — DESC nach deleted_at, max. 10
    // für den „Zuletzt gelöscht"-Toggle im Pins-Tab.
    supabase
      .from('pins_analytics')
      .select(
        `id, pin_id, datum, zeitraum_von, zeitraum_bis, deleted_at,
         pins ( id, titel )`
      )
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(10),
  ])

  const rows = (profilRes.data ?? []) as ProfilAnalytics[]
  const profilAnalytics = withGrowth(rows)

  const pins = (pinsRes.data ?? []) as PinOption[]

  const today = todayIso()
  const [benchmark, nicheProfile, audienceSnapshots] = await Promise.all([
    loadUserBenchmark(user.id),
    loadAccountNicheProfile(user.id),
    getAudienceSnapshots(),
  ])
  const thresholds = thresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerte> | null,
    benchmark
  )
  const rawPinAnalytics =
    (pinAnalyticsRes.data ?? []) as unknown as RawPinAnalyticsRow[]
  const pinAnalytics: PinAnalyticsRow[] = rawPinAnalytics.map((row) => {
    const pin = row.pins
    const refDate =
      pin?.geplante_veroeffentlichung ??
      pin?.created_at?.slice(0, 10) ??
      row.datum
    const alterTage = Math.max(0, diffDays(refDate, today))
    const ctr = calcCtr(row.klicks, row.impressionen)
    return {
      id: row.id,
      pin_id: row.pin_id,
      datum: row.datum,
      zeitraum_von: row.zeitraum_von,
      zeitraum_bis: row.zeitraum_bis,
      impressionen: row.impressionen,
      klicks: row.klicks,
      saves: row.saves,
      created_at: row.created_at,
      pin,
      ctr,
      alter_tage: alterTage,
    }
  })

  // ===== Boards =====
  const boardsRaw = (boardsRes.data ?? []) as BoardOption[]
  const boards: BoardOption[] = boardsRaw.map(({ id, name, pinterest_url }) => ({
    id,
    name,
    pinterest_url,
  }))
  const boardAnalyticsRaw =
    (boardAnalyticsRes.data ?? []) as BoardAnalyticsEntry[]
  const pinsForBoardRaw = (pinsForBoardRes.data ?? []) as Array<{
    board_id: string | null
    geplante_veroeffentlichung: string | null
    created_at: string | null
  }>

  const boardThresholds = boardThresholdsFromSettings(
    settingsRes.data as Partial<EinstellungenSchwellwerteBoard> | null
  )

  const lastPinByBoard = new Map<string, string>()
  for (const p of pinsForBoardRaw) {
    if (!p.board_id) continue
    const refDate =
      p.geplante_veroeffentlichung ?? p.created_at?.slice(0, 10) ?? null
    if (!refDate) continue
    const existing = lastPinByBoard.get(p.board_id)
    if (!existing || refDate > existing)
      lastPinByBoard.set(p.board_id, refDate)
  }

  // Dedup board_analytics — neueste + zweitneueste Datum pro Board
  // (Rohdaten sind DESC sortiert; zweiter Treffer = Vormonat). Außerdem
  // die komplette Zeitreihe pro Board für die aufklappbare Detailansicht.
  const latestByBoard = new Map<string, BoardAnalyticsEntry>()
  const prevByBoard = new Map<string, BoardAnalyticsEntry>()
  const historyByBoard = new Map<string, BoardAnalyticsEntry[]>()
  for (const row of boardAnalyticsRaw) {
    if (!latestByBoard.has(row.board_id)) {
      latestByBoard.set(row.board_id, row)
    } else if (!prevByBoard.has(row.board_id)) {
      prevByBoard.set(row.board_id, row)
    }
    const arr = historyByBoard.get(row.board_id) ?? []
    arr.push(row)
    historyByBoard.set(row.board_id, arr)
  }

  const boardById = new Map(boards.map((b) => [b.id, b]))

  type PreScored = {
    board: BoardOption
    latest: BoardAnalyticsEntry
    prev: BoardAnalyticsEntry | null
    lastPinDatum: string | null
    lastPinAlterTage: number | null
    engagementRate: number | null
    engagementRateVormonat: number | null
    status: ReturnType<typeof diagnoseBoard>
  }
  const preScored: PreScored[] = []
  latestByBoard.forEach((latest, boardId) => {
    const board = boardById.get(boardId)
    if (!board) return
    const lastPinDatum = lastPinByBoard.get(boardId) ?? null
    const lastPinAlterTage = lastPinDatum
      ? Math.max(0, diffDays(lastPinDatum, today))
      : null
    const engagementRate = calcBoardEngagementRate(
      latest.engagement,
      latest.impressionen
    )
    const prev = prevByBoard.get(boardId) ?? null
    const engagementRateVormonat = prev
      ? calcBoardEngagementRate(prev.engagement, prev.impressionen)
      : null
    const status = diagnoseBoard({
      lastPinAlterTage,
      thresholds: boardThresholds,
    })
    preScored.push({
      board,
      latest,
      prev,
      lastPinDatum,
      lastPinAlterTage,
      engagementRate,
      engagementRateVormonat,
      status,
    })
  })

  // Cutoff für „obere X %" des Profils berechnen.
  const allErs = preScored
    .map((p) => p.engagementRate)
    .filter((er): er is number => er !== null)
  const topCutoffEr = topPercentCutoff(allErs, boardThresholds.topProzent)

  const boardAnalytics: BoardAnalyticsRow[] = preScored.map((p) => {
    const { score, dataInsufficient, trendPct } = scoreBoardHybrid({
      er: p.engagementRate,
      erVormonat: p.engagementRateVormonat,
      topCutoffEr,
      thresholds: boardThresholds,
    })
    return {
      board: p.board,
      latest: p.latest,
      lastPinDatum: p.lastPinDatum,
      lastPinAlterTage: p.lastPinAlterTage,
      status: p.status,
      score,
      engagementRate: p.engagementRate,
      engagementRateVormonat: p.engagementRateVormonat,
      trendPct,
      dataInsufficient,
      handlung: boardHandlung({
        score,
        status: p.status,
        dataInsufficient,
      }),
    }
  })

  // Angelegte Boards ohne board_analytics-Eintrag
  const boardsWithAnalyticsIds = new Set(latestByBoard.keys())
  const publicBoardsWithoutAnalytics = boardsRaw
    .filter((b) => !boardsWithAnalyticsIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name }))

  // ===== Persistente „Nicht zugeordnet"-Liste in das von AnalyticsClient
  // erwartete Format übersetzen =====
  type PendingRow = {
    id: string
    type: string
    pinterest_url: string
    pinterest_id: string | null
    klicks: number | null
    impressionen: number | null
    saves: number | null
    engagement: number | null
    klicks_auf_pins: number | null
    ausgehende_klicks: number | null
    zeitraum_von: string | null
    zeitraum_bis: string | null
    created_at: string
  }
  const pendingRows = (pendingRes.data ?? []) as PendingRow[]
  const pendingPins = pendingRows
    .filter(
      (r): r is PendingRow & { pinterest_id: string } =>
        r.type === 'pin' && !!r.pinterest_id
    )
    .map((r) => ({
      pinterestPinId: r.pinterest_id,
      impressionen: r.impressionen,
      klicks: r.klicks,
      saves: r.saves,
    }))
  // Boards: alle 5 Metriken aus dedizierten Spalten; Fallback auf die
  // generische klicks-Spalte für ältere Zeilen, die noch mit dem
  // 3-Spalten-Schema geschrieben wurden (ausgehende_klicks war damals
  // in `klicks` gemerged).
  const pendingBoards = pendingRows
    .filter(
      (r): r is PendingRow & { pinterest_id: string } =>
        r.type === 'board' && !!r.pinterest_id
    )
    .map((r) => ({
      boardSlug: r.pinterest_id,
      // Legacy-Zeilen (vor URL-Persistenz) speicherten den Slug auch in
      // pinterest_url. Nur als echten URL durchreichen, wenn http(s)://
      // — sonst leerer String, dann fällt die UI auf den Slug-Fallback zurück.
      boardUrl: /^https?:\/\//i.test(r.pinterest_url) ? r.pinterest_url : '',
      impressionen: r.impressionen ?? 0,
      saves: r.saves ?? 0,
      ausgehende_klicks: r.ausgehende_klicks ?? r.klicks ?? 0,
      engagement: r.engagement ?? 0,
      klicks_auf_pins: r.klicks_auf_pins ?? 0,
    }))
  // Anzeige-Zeitraum: jüngster Eintrag (rows sind DESC by created_at, also
  // ist [0] der jüngste). Bei mehreren Zeiträumen in der Tabelle wird also
  // der zuletzt importierte als Header verwendet — der „Du hast noch X
  // nicht zugeordnete …"-Hinweis ist damit auf den letzten Import bezogen.
  const initialPending =
    pendingRows.length > 0
      ? {
          zeitraum_von: pendingRows[0].zeitraum_von ?? '',
          zeitraum_bis: pendingRows[0].zeitraum_bis ?? '',
          unmatchedPins: pendingPins,
          unmatchedBoards: pendingBoards,
        }
      : null

  const loadError =
    profilRes.error?.message ??
    settingsRes.error?.message ??
    pinsRes.error?.message ??
    pinAnalyticsRes.error?.message ??
    boardsRes.error?.message ??
    boardAnalyticsRes.error?.message ??
    pinsForBoardRes.error?.message ??
    pendingRes.error?.message ??
    deletedPinAnalyticsRes.error?.message ??
    null

  // Soft-deleted pins_analytics → flaches Format für den UI-Toggle.
  type DeletedRawRow = {
    id: string
    pin_id: string
    datum: string
    zeitraum_von: string | null
    zeitraum_bis: string | null
    deleted_at: string
    pins: { id: string; titel: string | null } | null
  }
  const deletedPinAnalytics = (
    (deletedPinAnalyticsRes.data ?? []) as unknown as DeletedRawRow[]
  ).map((r) => ({
    id: r.id,
    pin_id: r.pin_id,
    pinTitel: r.pins?.titel ?? null,
    zeitraum_von: r.zeitraum_von ?? r.datum,
    zeitraum_bis: r.zeitraum_bis ?? r.datum,
    deleted_at: r.deleted_at,
  }))

  return (
    <div className="p-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <UpdateStatusBanner
            analyticsUpdateDatum={
              settingsRes.data?.analytics_update_datum ?? null
            }
            intervall={settingsRes.data?.status_update_intervall ?? null}
            vorwarnung={settingsRes.data?.status_update_vorwarnung ?? null}
          />
        </div>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      <AnalyticsClient
        profilAnalytics={profilAnalytics}
        pins={pins}
        pinAnalytics={pinAnalytics}
        deletedPinAnalytics={deletedPinAnalytics}
        thresholds={thresholds}
        benchmark={benchmark}
        nicheProfile={nicheProfile}
        boards={boards}
        boardAnalytics={boardAnalytics}
        boardHistory={Object.fromEntries(historyByBoard)}
        boardThresholds={boardThresholds}
        publicBoardsWithoutAnalytics={publicBoardsWithoutAnalytics}
        pinterestAnalyticsUrl={
          settingsRes.data?.pinterest_analytics_url ?? null
        }
        initialPending={initialPending}
        audienceSnapshots={audienceSnapshots}
      />
    </div>
  )
}
