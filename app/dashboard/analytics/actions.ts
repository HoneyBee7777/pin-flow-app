'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  parseBoardsCsv,
  parseFilenamePeriod,
  parsePinsCsv,
  type PinMetric,
} from './csvImport'
import { todayIso } from './utils'

function parseInt0(v: FormDataEntryValue | null): number {
  const s = String(v ?? '').trim()
  if (!s) return 0
  const n = Number(s)
  if (!Number.isFinite(n)) return NaN
  return Math.trunc(n)
}

export async function saveProfilAnalytics(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const zeitraum_von = String(formData.get('zeitraum_von') ?? '').trim()
  const zeitraum_bis = String(formData.get('zeitraum_bis') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_von))
    return { error: 'Bitte ein gültiges „Von"-Datum wählen.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_bis))
    return { error: 'Bitte ein gültiges „Bis"-Datum wählen.' }
  if (zeitraum_von > zeitraum_bis)
    return { error: '„Von"-Datum darf nicht nach „Bis"-Datum liegen.' }

  // datum spiegelt zeitraum_bis (minimal-invasive Strategie — Unique-Constraint
  // (user_id, datum) bleibt unverändert nutzbar).
  const datum = zeitraum_bis

  const fields = {
    impressionen: parseInt0(formData.get('impressionen')),
    ausgehende_klicks: parseInt0(formData.get('ausgehende_klicks')),
    saves: parseInt0(formData.get('saves')),
    gesamte_zielgruppe: parseInt0(formData.get('gesamte_zielgruppe')),
    interagierende_zielgruppe: parseInt0(
      formData.get('interagierende_zielgruppe')
    ),
  }

  for (const [name, val] of Object.entries(fields)) {
    if (!Number.isInteger(val) || val < 0)
      return {
        error: `Feld „${name}" muss eine nicht-negative ganze Zahl sein.`,
      }
  }

  const { error: upsertError } = await supabase
    .from('profil_analytics')
    .upsert(
      {
        user_id: user.id,
        datum,
        zeitraum_von,
        zeitraum_bis,
        ...fields,
      },
      { onConflict: 'user_id,datum' }
    )
  if (upsertError) return { error: upsertError.message }

  // Update last-update marker (don't fail the whole save if this fails)
  await supabase
    .from('einstellungen')
    .upsert(
      { user_id: user.id, analytics_update_datum: todayIso() },
      { onConflict: 'user_id' }
    )

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteProfilAnalytics(
  formData: FormData
): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('profil_analytics').delete().eq('id', id)
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

export async function savePinAnalytics(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const pin_id = String(formData.get('pin_id') ?? '').trim()
  if (!pin_id) return { error: 'Bitte einen Pin auswählen.' }

  const zeitraum_von = String(formData.get('zeitraum_von') ?? '').trim()
  const zeitraum_bis = String(formData.get('zeitraum_bis') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_von))
    return { error: 'Bitte ein gültiges „Von"-Datum wählen.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_bis))
    return { error: 'Bitte ein gültiges „Bis"-Datum wählen.' }
  if (zeitraum_von > zeitraum_bis)
    return { error: '„Von"-Datum darf nicht nach „Bis"-Datum liegen.' }

  // datum spiegelt zeitraum_bis (Unique-Constraint (pin_id, datum) bleibt nutzbar).
  const datum = zeitraum_bis

  const fields = {
    impressionen: parseInt0(formData.get('impressionen')),
    klicks: parseInt0(formData.get('klicks')),
    saves: parseInt0(formData.get('saves')),
  }

  for (const [name, val] of Object.entries(fields)) {
    if (!Number.isInteger(val) || val < 0)
      return {
        error: `Feld „${name}" muss eine nicht-negative ganze Zahl sein.`,
      }
  }

  const { error } = await supabase
    .from('pins_analytics')
    .upsert(
      {
        user_id: user.id,
        pin_id,
        datum,
        zeitraum_von,
        zeitraum_bis,
        ...fields,
      },
      { onConflict: 'pin_id,datum' }
    )
  if (error) return { error: error.message }

  // Auto-Reset: alle Dashboard-Erledigt-Markierungen für diesen Pin
  // entfernen, damit er bei neuem Handlungsbedarf wieder erscheint.
  await supabase
    .from('dashboard_erledigt')
    .delete()
    .eq('user_id', user.id)
    .eq('pin_id', pin_id)

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}

export async function deletePinAnalytics(
  formData: FormData
): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('pins_analytics').delete().eq('id', id)
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

// ===========================================================
// Board-Analytics
// ===========================================================
type BoardAnalyticsFields = {
  impressionen: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
  engagement: number
  anzahl_pins: number
}

function readBoardAnalyticsFields(
  source: FormData | Record<string, unknown>
): { fields: BoardAnalyticsFields } | { error: string } {
  const get = (key: string): FormDataEntryValue | null =>
    source instanceof FormData
      ? source.get(key)
      : ((source[key] ?? null) as FormDataEntryValue | null)

  const fields: BoardAnalyticsFields = {
    impressionen: parseInt0(get('impressionen')),
    klicks_auf_pins: parseInt0(get('klicks_auf_pins')),
    ausgehende_klicks: parseInt0(get('ausgehende_klicks')),
    saves: parseInt0(get('saves')),
    engagement: parseInt0(get('engagement')),
    anzahl_pins: parseInt0(get('anzahl_pins')),
  }
  for (const [name, val] of Object.entries(fields)) {
    if (!Number.isInteger(val) || val < 0)
      return {
        error: `Feld „${name}" muss eine nicht-negative ganze Zahl sein.`,
      }
  }
  return { fields }
}

export async function saveBoardAnalytics(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const board_id = String(formData.get('board_id') ?? '').trim()
  if (!board_id) return { error: 'Bitte ein Board wählen.' }

  const datum = String(formData.get('datum') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    return { error: 'Bitte ein gültiges Datum wählen.' }

  const parsed = readBoardAnalyticsFields(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('board_analytics')
    .upsert(
      { user_id: user.id, board_id, datum, ...parsed.fields },
      { onConflict: 'board_id,datum' }
    )
  if (error) return { error: error.message }

  revalidatePath('/dashboard/analytics')
  return {}
}

export type BoardAnalyticsBulkRow = {
  board_id: string
  impressionen: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
  engagement: number
  anzahl_pins: number
}

export async function saveBoardAnalyticsBulk(args: {
  datum: string
  rows: BoardAnalyticsBulkRow[]
}): Promise<{ error?: string; saved?: number }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.datum))
    return { error: 'Bitte ein gültiges Datum wählen.' }

  const upserts = args.rows
    .filter((r) => {
      if (!r.board_id) return false
      const sum =
        (r.impressionen || 0) +
        (r.klicks_auf_pins || 0) +
        (r.ausgehende_klicks || 0) +
        (r.saves || 0) +
        (r.engagement || 0) +
        (r.anzahl_pins || 0)
      return sum > 0
    })
    .map((r) => {
      for (const key of [
        'impressionen',
        'klicks_auf_pins',
        'ausgehende_klicks',
        'saves',
        'engagement',
        'anzahl_pins',
      ] as const) {
        const v = r[key]
        if (!Number.isInteger(v) || v < 0)
          return null
      }
      return {
        user_id: user.id,
        board_id: r.board_id,
        datum: args.datum,
        impressionen: r.impressionen,
        klicks_auf_pins: r.klicks_auf_pins,
        ausgehende_klicks: r.ausgehende_klicks,
        saves: r.saves,
        engagement: r.engagement,
        anzahl_pins: r.anzahl_pins,
      }
    })

  if (upserts.some((u) => u === null))
    return { error: 'Alle Werte müssen nicht-negative ganze Zahlen sein.' }

  if (upserts.length === 0) return { saved: 0 }

  const { error } = await supabase
    .from('board_analytics')
    .upsert(upserts as NonNullable<(typeof upserts)[number]>[], {
      onConflict: 'board_id,datum',
    })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/analytics')
  return { saved: upserts.length }
}

export async function deleteBoardAnalytics(
  formData: FormData
): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('board_analytics').delete().eq('id', id)
  revalidatePath('/dashboard/analytics')
}

// ===========================================================
// Pinterest Analytics CSV-Import
// ===========================================================

export type UnmatchedPin = {
  pinterestPinId: string
  // Metriken werden zurückgegeben, damit der Nutzer die Pins nachträglich
  // zuordnen kann ohne die CSVs erneut hochzuladen.
  impressionen: number | null
  klicks: number | null
  saves: number | null
}

export type UnmatchedBoard = {
  boardSlug: string
  impressionen: number
  engagement: number
  klicks_auf_pins: number
  ausgehende_klicks: number
  saves: number
}

export type ImportPinterestCsvResult = {
  error?: string
  zeitraum_von?: string
  zeitraum_bis?: string
  // Pins-Block (Top Pins) — nur eine Metrik pro CSV-Export.
  pinsImported?: number
  metricsImported?: PinMetric[]
  pinsUnmatched?: UnmatchedPin[]
  // Boards-Block (Top Boards) — alle Metriken in einem Export.
  boardsImported?: number
  boardsUnmatched?: UnmatchedBoard[]
}

// Importiert bis zu drei Pinterest-Analytics-CSVs aus demselben Export-
// Zeitraum. Jede CSV enthält Top Pins mit genau EINER Metrik (Outbound
// Clicks / Impressions / Saves) sowie den vollen Top-Boards-Block.
// Pin-Metriken werden über alle Dateien hinweg pro pin_id zusammengeführt;
// existierende Werte für nicht gelieferte Metriken bleiben erhalten.
export async function importPinterestCsv(
  formData: FormData
): Promise<ImportPinterestCsvResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const slots = ['csv_klicks', 'csv_impressionen', 'csv_saves'] as const
  const files: File[] = []
  for (const slot of slots) {
    const f = formData.get(slot)
    if (f instanceof File && f.size > 0) files.push(f)
  }
  if (files.length === 0)
    return { error: 'Bitte mindestens eine CSV hochladen.' }

  // Periode aus jedem Dateinamen ziehen und Cross-File-Konsistenz prüfen.
  let period: { von: string; bis: string } | null = null
  for (const file of files) {
    const fp = parseFilenamePeriod(file.name)
    if (!fp)
      return {
        error: `Dateiname „${file.name}" entspricht nicht dem Pinterest-Schema („Pinterest Analytics overview YYYYMMDD-YYYYMMDD.csv").`,
      }
    if (!period) period = fp
    else if (period.von !== fp.von || period.bis !== fp.bis)
      return {
        error:
          'Die hochgeladenen Dateien haben unterschiedliche Zeiträume. Bitte nur CSVs desselben Zeitraums hochladen.',
      }
  }
  // Hier garantiert non-null nach erfolgreicher Schleife.
  const periodOk = period as { von: string; bis: string }

  // Pins über alle Dateien hinweg mergen; Boards nur einmal parsen
  // (der Top-Boards-Block ist in jedem Export identisch, da er
  // datumsabhängig aber nicht sortier-abhängig ist).
  type PinMetricEntry = {
    impressionen?: number
    klicks?: number
    saves?: number
  }
  const merged = new Map<string, PinMetricEntry>()
  const metricsImported: PinMetric[] = []
  let boardsParsed: ReturnType<typeof parseBoardsCsv> | null = null
  let anyPinsParsed = false

  for (const file of files) {
    const text = await file.text()
    const pp = parsePinsCsv(text)
    if (!('error' in pp)) {
      anyPinsParsed = true
      if (!metricsImported.includes(pp.metric)) metricsImported.push(pp.metric)
      for (const row of pp.rows) {
        const existing =
          merged.get(row.pinterestPinId) ?? ({} as PinMetricEntry)
        existing[pp.metric] = row.value
        merged.set(row.pinterestPinId, existing)
      }
    }
    if (boardsParsed === null) {
      const bp = parseBoardsCsv(text)
      if (!('error' in bp)) boardsParsed = bp
    }
  }

  if (!anyPinsParsed && !boardsParsed) {
    return {
      error:
        'Weder „Top Pins" noch „Top Boards" in den hochgeladenen CSVs gefunden — sind das wirklich Pinterest-Analytics-Overview-Exports?',
    }
  }

  // ===== Top Pins =====
  let pinsImported = 0
  const pinsUnmatched: UnmatchedPin[] = []

  if (merged.size > 0) {
    const pinterestIds = Array.from(merged.keys())
    const { data: pinsRows, error: pinsErr } = await supabase
      .from('pins')
      .select('id, pinterest_pin_id')
      .eq('user_id', user.id)
      .in('pinterest_pin_id', pinterestIds)
    if (pinsErr) return { error: pinsErr.message }
    const idByPinterestId = new Map<string, string>()
    for (const p of (pinsRows ?? []) as Array<{
      id: string
      pinterest_pin_id: string
    }>) {
      idByPinterestId.set(p.pinterest_pin_id, p.id)
    }

    const matched: Array<{ dbId: string; metrics: PinMetricEntry }> = []
    merged.forEach((entry, ppId) => {
      const dbId = idByPinterestId.get(ppId)
      if (dbId) {
        matched.push({ dbId, metrics: entry })
      } else {
        pinsUnmatched.push({
          pinterestPinId: ppId,
          impressionen: entry.impressionen ?? null,
          klicks: entry.klicks ?? null,
          saves: entry.saves ?? null,
        })
      }
    })

    if (matched.length > 0) {
      const datum = periodOk.bis
      const matchedIds = matched.map((m) => m.dbId)

      // Bestehende Werte für diesen Zeitraum holen — Metriken die nicht
      // im aktuellen Upload sind dürfen nicht überschrieben werden.
      const { data: existingRows, error: exErr } = await supabase
        .from('pins_analytics')
        .select('pin_id, impressionen, klicks, saves')
        .eq('user_id', user.id)
        .in('pin_id', matchedIds)
        .eq('datum', datum)
      if (exErr) return { error: exErr.message }
      const existingByPinId = new Map<
        string,
        { impressionen: number; klicks: number; saves: number }
      >()
      for (const r of (existingRows ?? []) as Array<{
        pin_id: string
        impressionen: number
        klicks: number
        saves: number
      }>) {
        existingByPinId.set(r.pin_id, {
          impressionen: r.impressionen,
          klicks: r.klicks,
          saves: r.saves,
        })
      }

      const upserts = matched.map((m) => {
        const existing =
          existingByPinId.get(m.dbId) ?? {
            impressionen: 0,
            klicks: 0,
            saves: 0,
          }
        return {
          user_id: user.id,
          pin_id: m.dbId,
          datum,
          zeitraum_von: periodOk.von,
          zeitraum_bis: periodOk.bis,
          impressionen: m.metrics.impressionen ?? existing.impressionen,
          klicks: m.metrics.klicks ?? existing.klicks,
          saves: m.metrics.saves ?? existing.saves,
        }
      })

      const { error: upErr } = await supabase
        .from('pins_analytics')
        .upsert(upserts, { onConflict: 'pin_id,datum' })
      if (upErr) return { error: upErr.message }

      await supabase
        .from('dashboard_erledigt')
        .delete()
        .eq('user_id', user.id)
        .in('pin_id', matchedIds)

      pinsImported = matched.length
    }
  }

  // ===== Top Boards =====
  let boardsImported = 0
  const boardsUnmatched: UnmatchedBoard[] = []

  if (boardsParsed && !('error' in boardsParsed) && boardsParsed.rows.length > 0) {
    const slugs = boardsParsed.rows.map((r) => r.boardSlug)
    const { data: boardsRows, error: bErr } = await supabase
      .from('boards')
      .select('id, pinterest_board_slug')
      .eq('user_id', user.id)
      .in('pinterest_board_slug', slugs)
    if (bErr) return { error: bErr.message }
    const idBySlug = new Map<string, string>()
    for (const b of (boardsRows ?? []) as Array<{
      id: string
      pinterest_board_slug: string
    }>) {
      idBySlug.set(b.pinterest_board_slug, b.id)
    }

    const matched: typeof boardsParsed.rows = []
    for (const row of boardsParsed.rows) {
      if (idBySlug.has(row.boardSlug)) matched.push(row)
      else boardsUnmatched.push(row)
    }

    if (matched.length > 0) {
      const matchedBoardIds = matched.map(
        (r) => idBySlug.get(r.boardSlug) as string
      )
      const { data: existingRows, error: exErr } = await supabase
        .from('board_analytics')
        .select('board_id, anzahl_pins')
        .eq('user_id', user.id)
        .in('board_id', matchedBoardIds)
        .eq('datum', periodOk.bis)
      if (exErr) return { error: exErr.message }
      const anzahlByBoardId = new Map<string, number>()
      for (const r of (existingRows ?? []) as Array<{
        board_id: string
        anzahl_pins: number | null
      }>) {
        anzahlByBoardId.set(r.board_id, r.anzahl_pins ?? 0)
      }

      const upserts = matched.map((r) => {
        const board_id = idBySlug.get(r.boardSlug) as string
        return {
          user_id: user.id,
          board_id,
          datum: periodOk.bis,
          impressionen: r.impressionen,
          engagement: r.engagement,
          klicks_auf_pins: r.klicks_auf_pins,
          ausgehende_klicks: r.ausgehende_klicks,
          saves: r.saves,
          anzahl_pins: anzahlByBoardId.get(board_id) ?? 0,
        }
      })

      const { error: upErr } = await supabase
        .from('board_analytics')
        .upsert(upserts, { onConflict: 'board_id,datum' })
      if (upErr) return { error: upErr.message }

      boardsImported = matched.length
    }
  }

  if (
    pinsImported === 0 &&
    pinsUnmatched.length === 0 &&
    boardsImported === 0 &&
    boardsUnmatched.length === 0
  ) {
    return {
      error:
        'Keine verwertbaren Daten in der CSV gefunden — weder Top Pins noch Top Boards lieferten Zeilen.',
    }
  }

  await supabase
    .from('einstellungen')
    .upsert(
      { user_id: user.id, analytics_update_datum: todayIso() },
      { onConflict: 'user_id' }
    )

  // Pending Pins + Boards persistieren, damit die „Nicht zugeordnet"-Liste
  // einen Page-Reload überlebt. UNIQUE(user_id, pinterest_url, zeitraum_von)
  // macht das idempotent: ein erneuter Import desselben Pins im gleichen
  // Zeitraum überschreibt nur die Metriken.
  // Pins nutzen klicks/impressionen/saves; Boards füllen zusätzlich die drei
  // dedizierten Board-Spalten (engagement, klicks_auf_pins, ausgehende_klicks),
  // damit beim Re-Assign nach Reload alle 5 board_analytics-Metriken in
  // voller Fidelity verfügbar sind.
  type PendingInsert = {
    user_id: string
    type: 'pin' | 'board'
    pinterest_url: string
    pinterest_id: string
    klicks: number | null
    impressionen: number | null
    saves: number | null
    engagement: number | null
    klicks_auf_pins: number | null
    ausgehende_klicks: number | null
    zeitraum_von: string
    zeitraum_bis: string
  }
  const pendingRows: PendingInsert[] = []
  for (const u of pinsUnmatched) {
    pendingRows.push({
      user_id: user.id,
      type: 'pin',
      pinterest_url: `https://www.pinterest.com/pin/${u.pinterestPinId}/`,
      pinterest_id: u.pinterestPinId,
      klicks: u.klicks,
      impressionen: u.impressionen,
      saves: u.saves,
      engagement: null,
      klicks_auf_pins: null,
      ausgehende_klicks: null,
      zeitraum_von: periodOk.von,
      zeitraum_bis: periodOk.bis,
    })
  }
  for (const u of boardsUnmatched) {
    pendingRows.push({
      user_id: user.id,
      type: 'board',
      pinterest_url: u.boardSlug,
      pinterest_id: u.boardSlug,
      // Generische klicks-Spalte bleibt für Boards leer — Traffic-Metrik
      // lebt jetzt sauber in ausgehende_klicks.
      klicks: null,
      impressionen: u.impressionen,
      saves: u.saves,
      engagement: u.engagement,
      klicks_auf_pins: u.klicks_auf_pins,
      ausgehende_klicks: u.ausgehende_klicks,
      zeitraum_von: periodOk.von,
      zeitraum_bis: periodOk.bis,
    })
  }
  if (pendingRows.length > 0) {
    await supabase
      .from('csv_import_pending')
      .upsert(pendingRows, {
        onConflict: 'user_id,pinterest_url,zeitraum_von',
      })
  }

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {
    zeitraum_von: periodOk.von,
    zeitraum_bis: periodOk.bis,
    pinsImported,
    metricsImported,
    pinsUnmatched,
    boardsImported,
    boardsUnmatched,
  }
}

// Nicht-zugeordneten Pin nachträglich einer DB-Pin-Zeile zuweisen und
// gleichzeitig die in der CSV gefundenen Metriken speichern. Die Pin-ID
// wird in pins.pinterest_pin_id geschrieben — beim nächsten Import wird
// dieser Pin automatisch erkannt.
export async function assignPinAndImportMetrics(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const pin_id = String(formData.get('pin_id') ?? '').trim()
  const pinterest_pin_id = String(
    formData.get('pinterest_pin_id') ?? ''
  ).trim()
  if (!pin_id) return { error: 'Bitte einen Pin auswählen.' }
  if (!/^\d+$/.test(pinterest_pin_id))
    return { error: 'Pinterest-Pin-ID muss numerisch sein.' }

  const zeitraum_von = String(formData.get('zeitraum_von') ?? '').trim()
  const zeitraum_bis = String(formData.get('zeitraum_bis') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_von))
    return { error: 'Ungültiges „Von"-Datum.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_bis))
    return { error: 'Ungültiges „Bis"-Datum.' }

  function num(name: string): number | null {
    const raw = String(formData.get(name) ?? '').trim()
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null
  }
  const impressionen = num('impressionen')
  const klicks = num('klicks')
  const saves = num('saves')

  // Pin-Zuordnung speichern.
  const { error: pinErr } = await supabase
    .from('pins')
    .update({ pinterest_pin_id })
    .eq('id', pin_id)
    .eq('user_id', user.id)
  if (pinErr) return { error: pinErr.message }

  // Bestehende Werte für (pin_id, datum) holen, gemerged speichern —
  // gleiche Logik wie der Bulk-Import.
  const { data: existingRows, error: exErr } = await supabase
    .from('pins_analytics')
    .select('impressionen, klicks, saves')
    .eq('user_id', user.id)
    .eq('pin_id', pin_id)
    .eq('datum', zeitraum_bis)
    .maybeSingle()
  if (exErr) return { error: exErr.message }
  const existing = existingRows ?? { impressionen: 0, klicks: 0, saves: 0 }

  const { error: upErr } = await supabase.from('pins_analytics').upsert(
    {
      user_id: user.id,
      pin_id,
      datum: zeitraum_bis,
      zeitraum_von,
      zeitraum_bis,
      impressionen: impressionen ?? existing.impressionen,
      klicks: klicks ?? existing.klicks,
      saves: saves ?? existing.saves,
    },
    { onConflict: 'pin_id,datum' }
  )
  if (upErr) return { error: upErr.message }

  await supabase
    .from('dashboard_erledigt')
    .delete()
    .eq('user_id', user.id)
    .eq('pin_id', pin_id)

  // Persistente Pending-Zeile(n) für diesen Pin entfernen — die Pin↔ID-
  // Zuordnung steht jetzt in pins.pinterest_pin_id, beim nächsten Import
  // wird der Pin automatisch erkannt.
  await supabase
    .from('csv_import_pending')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'pin')
    .eq('pinterest_id', pinterest_pin_id)

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard')
  return {}
}

export async function assignBoardAndImportMetrics(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const board_id = String(formData.get('board_id') ?? '').trim()
  const pinterest_board_slug = String(
    formData.get('pinterest_board_slug') ?? ''
  ).trim()
  if (!board_id) return { error: 'Bitte ein Board auswählen.' }
  if (!pinterest_board_slug)
    return { error: 'Pinterest-Board-Slug fehlt.' }

  const datum = String(formData.get('datum') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    return { error: 'Ungültiges Datum.' }

  function num(name: string): number {
    const raw = String(formData.get(name) ?? '').trim()
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
  }
  const fields = {
    impressionen: num('impressionen'),
    engagement: num('engagement'),
    klicks_auf_pins: num('klicks_auf_pins'),
    ausgehende_klicks: num('ausgehende_klicks'),
    saves: num('saves'),
  }

  const { error: bErr } = await supabase
    .from('boards')
    .update({ pinterest_board_slug })
    .eq('id', board_id)
    .eq('user_id', user.id)
  if (bErr) return { error: bErr.message }

  const { data: existing, error: exErr } = await supabase
    .from('board_analytics')
    .select('anzahl_pins')
    .eq('user_id', user.id)
    .eq('board_id', board_id)
    .eq('datum', datum)
    .maybeSingle()
  if (exErr) return { error: exErr.message }

  const { error: upErr } = await supabase.from('board_analytics').upsert(
    {
      user_id: user.id,
      board_id,
      datum,
      ...fields,
      anzahl_pins: existing?.anzahl_pins ?? 0,
    },
    { onConflict: 'board_id,datum' }
  )
  if (upErr) return { error: upErr.message }

  // Persistente Pending-Zeile für diesen Board-Slug entfernen.
  await supabase
    .from('csv_import_pending')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'board')
    .eq('pinterest_id', pinterest_board_slug)

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/boards')
  return {}
}

// Skip-Action für die „Überspringen"-Buttons in der Nicht-zugeordnet-Liste.
// Löscht die persistente Pending-Zeile, ohne irgendwas in pins_analytics /
// board_analytics zu schreiben — der Nutzer hat sich bewusst gegen die
// Zuordnung entschieden. Bei einem zukünftigen CSV-Import desselben Pins/
// Boards im selben Zeitraum wird der Eintrag wieder neu angelegt.
export async function skipPendingImport(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const type = String(formData.get('type') ?? '')
  const identifier = String(formData.get('identifier') ?? '').trim()
  if (type !== 'pin' && type !== 'board')
    return { error: 'Ungültiger Typ.' }
  if (!identifier) return { error: 'Identifier fehlt.' }

  const { error } = await supabase
    .from('csv_import_pending')
    .delete()
    .eq('user_id', user.id)
    .eq('type', type)
    .eq('pinterest_id', identifier)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/analytics')
  return {}
}
