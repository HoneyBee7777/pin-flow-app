'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  extractPinterestBoardSlug,
  extractPinterestPinId,
  parseBoardsCsv,
  parseFilenamePeriod,
  parsePinsCsv,
  type PinMetric,
} from './csvImport'
import { todayIso } from './utils'
import { reclassifyAllPinsForUser } from './benchmark'

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

  await reclassifyAllPinsForUser(user.id)

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}

// Soft-Delete: setzt deleted_at = NOW(), die Zeile bleibt physisch erhalten
// und kann via restorePinAnalytics wiederhergestellt werden. Alle normalen
// Listen-Queries filtern auf deleted_at IS NULL.
export async function deletePinAnalytics(
  formData: FormData
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase
    .from('pins_analytics')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

// Wiederherstellen: setzt deleted_at zurück auf NULL — Eintrag taucht wieder
// in der normalen Liste auf.
export async function restorePinAnalytics(
  formData: FormData
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase
    .from('pins_analytics')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id)
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

// Endgültiges Löschen aller soft-deleted pins_analytics-Zeilen des Users.
// Wird vom „Alle endgültig löschen"-Link im Zuletzt-gelöscht-Toggle aufgerufen.
export async function hardDeleteAllDeletedPinAnalytics(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('pins_analytics')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

// Update einer einzelnen pins_analytics-Zeile (per id) inkl. optionalem
// Schreiben von pinterest_pin_url + pinterest_pin_id auf der pins-Tabelle.
// Wird vom „Bearbeiten"-Modal in der Pins-Analytics-Tabelle aufgerufen.
export async function updatePinAnalyticsEntry(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '').trim()
  const pin_id = String(formData.get('pin_id') ?? '').trim()
  if (!id) return { error: 'Analytics-Eintrag fehlt.' }
  if (!pin_id) return { error: 'Pin fehlt.' }

  const zeitraum_von = String(formData.get('zeitraum_von') ?? '').trim()
  const zeitraum_bis = String(formData.get('zeitraum_bis') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_von))
    return { error: 'Bitte ein gültiges „Von"-Datum wählen.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zeitraum_bis))
    return { error: 'Bitte ein gültiges „Bis"-Datum wählen.' }
  if (zeitraum_von > zeitraum_bis)
    return { error: '„Von"-Datum darf nicht nach „Bis"-Datum liegen.' }

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

  // Optional: Pinterest-URL auf der pins-Tabelle setzen oder entfernen.
  //   - leerer Wert + remove-Flag = Felder auf NULL setzen
  //   - leerer Wert ohne Flag    = unverändert lassen
  //   - expliziter Wert           = setzen (inkl. ID-Extraktion)
  const pinterest_pin_url_raw = String(
    formData.get('pinterest_pin_url') ?? ''
  ).trim()
  const pinterest_pin_url_remove =
    String(formData.get('pinterest_pin_url_remove') ?? '') === '1'
  if (pinterest_pin_url_raw) {
    if (!/^https?:\/\/\S+/i.test(pinterest_pin_url_raw))
      return {
        error: 'Pinterest-URL muss mit http:// oder https:// beginnen.',
      }
    const pinterest_pin_id = extractPinterestPinId(pinterest_pin_url_raw)
    if (!pinterest_pin_id)
      return {
        error:
          'Pinterest-URL erkannt, aber keine Pin-ID extrahierbar. Erwartet: …/pin/<numerische-id>/',
      }
    const { error: pErr } = await supabase
      .from('pins')
      .update({
        pinterest_pin_url: pinterest_pin_url_raw,
        pinterest_pin_id,
      })
      .eq('id', pin_id)
      .eq('user_id', user.id)
    if (pErr) return { error: pErr.message }
  } else if (pinterest_pin_url_remove) {
    const { error: pErr } = await supabase
      .from('pins')
      .update({
        pinterest_pin_url: null,
        pinterest_pin_id: null,
      })
      .eq('id', pin_id)
      .eq('user_id', user.id)
    if (pErr) return { error: pErr.message }
  }

  const { error } = await supabase
    .from('pins_analytics')
    .update({
      pin_id,
      datum,
      zeitraum_von,
      zeitraum_bis,
      ...fields,
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  await reclassifyAllPinsForUser(user.id)

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
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

// Update einer board_analytics-Zeile (per id) inkl. optionalem Schreiben
// von pinterest_url + pinterest_board_slug auf der boards-Tabelle.
export async function updateBoardAnalyticsEntry(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '').trim()
  const board_id = String(formData.get('board_id') ?? '').trim()
  if (!id) return { error: 'Analytics-Eintrag fehlt.' }
  if (!board_id) return { error: 'Board fehlt.' }

  const datum = String(formData.get('datum') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    return { error: 'Bitte ein gültiges Datum wählen.' }

  // anzahl_pins bleibt unverändert (wird automatisch aus den Pins abgeleitet).
  // Daher nur die fünf editierbaren Metriken aus dem Form-Data lesen.
  const editableFields = {
    impressionen: parseInt0(formData.get('impressionen')),
    klicks_auf_pins: parseInt0(formData.get('klicks_auf_pins')),
    ausgehende_klicks: parseInt0(formData.get('ausgehende_klicks')),
    saves: parseInt0(formData.get('saves')),
    engagement: parseInt0(formData.get('engagement')),
  }
  for (const [name, val] of Object.entries(editableFields)) {
    if (!Number.isInteger(val) || val < 0)
      return {
        error: `Feld „${name}" muss eine nicht-negative ganze Zahl sein.`,
      }
  }

  // Optional: Pinterest-URL auf der boards-Tabelle setzen oder entfernen
  // (analoge Semantik zum Pin-Pendant).
  const pinterest_url_raw = String(formData.get('pinterest_url') ?? '').trim()
  const pinterest_url_remove =
    String(formData.get('pinterest_url_remove') ?? '') === '1'
  if (pinterest_url_raw) {
    if (!/^https?:\/\/\S+/i.test(pinterest_url_raw))
      return {
        error: 'Pinterest-URL muss mit http:// oder https:// beginnen.',
      }
    const slug = extractPinterestBoardSlug(pinterest_url_raw)
    if (!slug)
      return {
        error:
          'Board-URL erkannt, aber Slug nicht extrahierbar. Erwartet: …/<username>/<board-slug>/',
      }
    const { error: bErr } = await supabase
      .from('boards')
      .update({
        pinterest_url: pinterest_url_raw,
        pinterest_board_slug: slug,
      })
      .eq('id', board_id)
      .eq('user_id', user.id)
    if (bErr) return { error: bErr.message }
  } else if (pinterest_url_remove) {
    const { error: bErr } = await supabase
      .from('boards')
      .update({
        pinterest_url: null,
        pinterest_board_slug: null,
      })
      .eq('id', board_id)
      .eq('user_id', user.id)
    if (bErr) return { error: bErr.message }
  }

  const { error } = await supabase
    .from('board_analytics')
    .update({ board_id, datum, ...editableFields })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
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
  boardUrl: string
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
        .is('deleted_at', null)
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
    // ===== Stufe 1 — Match über pinterest_url =====
    // Alle Boards des Users mit gesetzter pinterest_url laden. Vergleich
    // erfolgt zweifach: exakte URL und über extrahierten Slug — so matchen
    // auch Varianten wie http vs https oder mit/ohne trailing slash.
    const { data: urlBoardsRows, error: urlErr } = await supabase
      .from('boards')
      .select('id, pinterest_url, pinterest_board_slug')
      .eq('user_id', user.id)
      .not('pinterest_url', 'is', null)
    if (urlErr) return { error: urlErr.message }

    type UrlBoardRow = {
      id: string
      pinterest_url: string
      pinterest_board_slug: string | null
    }
    const urlBoards = (urlBoardsRows ?? []) as UrlBoardRow[]
    const idByUrl = new Map<string, UrlBoardRow>()
    const idBySlugFromUrl = new Map<string, UrlBoardRow>()
    for (const b of urlBoards) {
      idByUrl.set(b.pinterest_url, b)
      const slugFromUrl = extractPinterestBoardSlug(b.pinterest_url)
      if (slugFromUrl) idBySlugFromUrl.set(slugFromUrl, b)
    }

    type ParsedBoardRow = (typeof boardsParsed.rows)[number]
    const stage1Matched: Array<{ row: ParsedBoardRow; board: UrlBoardRow }> = []
    const remainingForStage2: ParsedBoardRow[] = []
    for (const row of boardsParsed.rows) {
      const byUrl = idByUrl.get(row.boardUrl)
      const board = byUrl ?? idBySlugFromUrl.get(row.boardSlug)
      if (board) stage1Matched.push({ row, board })
      else remainingForStage2.push(row)
    }

    // Backfill: Stufe-1-Match ohne pinterest_board_slug → Slug nachtragen.
    const slugBackfills = stage1Matched
      .filter((m) => !m.board.pinterest_board_slug)
      .map((m) => ({ id: m.board.id, slug: m.row.boardSlug }))
    if (slugBackfills.length > 0) {
      // Sequenziell — Supabase-Bulk-Update mit unterschiedlichen Werten pro
      // Zeile geht nur via RPC; bei wenigen Boards pro Import vertretbar.
      for (const u of slugBackfills) {
        await supabase
          .from('boards')
          .update({ pinterest_board_slug: u.slug })
          .eq('id', u.id)
          .eq('user_id', user.id)
      }
    }

    // ===== Stufe 2 — Match über pinterest_board_slug (wie bisher) =====
    const idBySlug = new Map<string, string>()
    if (remainingForStage2.length > 0) {
      const slugs = remainingForStage2.map((r) => r.boardSlug)
      const { data: boardsRows, error: bErr } = await supabase
        .from('boards')
        .select('id, pinterest_board_slug')
        .eq('user_id', user.id)
        .in('pinterest_board_slug', slugs)
      if (bErr) return { error: bErr.message }
      for (const b of (boardsRows ?? []) as Array<{
        id: string
        pinterest_board_slug: string
      }>) {
        idBySlug.set(b.pinterest_board_slug, b.id)
      }
    }

    const stage2Matched: Array<{ row: ParsedBoardRow; boardId: string }> = []
    for (const row of remainingForStage2) {
      const boardId = idBySlug.get(row.boardSlug)
      if (boardId) stage2Matched.push({ row, boardId })
      else boardsUnmatched.push(row)
    }

    // ===== Upsert für alle Stufe-1- und Stufe-2-Treffer =====
    const allMatched: Array<{ row: ParsedBoardRow; boardId: string }> = [
      ...stage1Matched.map((m) => ({ row: m.row, boardId: m.board.id })),
      ...stage2Matched,
    ]

    if (allMatched.length > 0) {
      const matchedBoardIds = allMatched.map((m) => m.boardId)
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

      const upserts = allMatched.map((m) => ({
        user_id: user.id,
        board_id: m.boardId,
        datum: periodOk.bis,
        impressionen: m.row.impressionen,
        engagement: m.row.engagement,
        klicks_auf_pins: m.row.klicks_auf_pins,
        ausgehende_klicks: m.row.ausgehende_klicks,
        saves: m.row.saves,
        anzahl_pins: anzahlByBoardId.get(m.boardId) ?? 0,
      }))

      const { error: upErr } = await supabase
        .from('board_analytics')
        .upsert(upserts, { onConflict: 'board_id,datum' })
      if (upErr) return { error: upErr.message }

      boardsImported = allMatched.length
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
      pinterest_url: u.boardUrl,
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
  // Same-Period-Überschreibung: den vorhandenen Pending-Stand DIESER Periode
  // leeren, BEVOR der Upsert darunter die aktuellen unmatched neu schreibt.
  // Ein erneuter Upload derselben Periode ersetzt damit den alten Stand
  // komplett, statt zu akkumulieren (Pins aus Upload 1, die in Upload 2 fehlen,
  // bleiben sonst als Pending-Leichen liegen). Der Upsert direkt danach stellt
  // alle Überlebenden sofort wieder her → Endzustand: pending(Periode) = exakt
  // die unmatched der aktuellen CSV. matched Pins sind nicht in pendingRows
  // (sie liegen in pins_analytics), kommen also nicht zurück ins Pending.
  // Guards ZWINGEND: ein reiner Pin-Upload (kein Board-Block) darf die
  // Board-Pending dieser Periode NICHT löschen (Delete ohne nachfolgenden
  // Board-Upsert = Datenverlust) — und umgekehrt.
  if (merged.size > 0) {
    await supabase
      .from('csv_import_pending')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'pin')
      .eq('zeitraum_von', periodOk.von)
  }
  if (boardsParsed && !('error' in boardsParsed) && boardsParsed.rows.length > 0) {
    await supabase
      .from('csv_import_pending')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'board')
      .eq('zeitraum_von', periodOk.von)
  }

  if (pendingRows.length > 0) {
    await supabase
      .from('csv_import_pending')
      .upsert(pendingRows, {
        onConflict: 'user_id,pinterest_url,zeitraum_von',
      })
  }

  // Aufräumen: aus den Top 50 gefallene, nie zugeordnete Pending-Einträge
  // verwerfen. Ein unmatched Pin/Board aus einer STRIKT älteren Periode, der
  // in der aktuellen CSV gar nicht mehr vorkommt, soll nicht ewig liegenbleiben
  // (Pareto: war nie wichtig genug zum Zuordnen). Strikt `<` schützt dabei
  // Korrektur-Uploads (gleiche Periode) und Backfills (neuere Periode); die
  // NOT-IN-Menge verschont alles, was weiterhin geliefert wird (matched Pins
  // landen ohnehin nicht im Pending — getroffen werden nur alte unmatched).
  // Werte werden gequotet/escaped, damit Sonderzeichen die in-Liste nicht brechen.
  const toPgInList = (values: string[]) =>
    `(${values
      .map((v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
      .join(',')})`

  // Pins: NUR wenn die CSV überhaupt Pins enthält — sonst wäre die NOT-IN-Menge
  // leer und „nicht in leerer Menge = alle" würde ALLE älteren Pin-Pending löschen.
  if (merged.size > 0) {
    const csvPinIds = Array.from(merged.keys())
    await supabase
      .from('csv_import_pending')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'pin')
      .lt('zeitraum_von', periodOk.von)
      .not('pinterest_id', 'in', toPgInList(csvPinIds))
  }

  // Boards: analog, NUR wenn die CSV Board-Zeilen enthält.
  if (boardsParsed && !('error' in boardsParsed) && boardsParsed.rows.length > 0) {
    const csvBoardSlugs = Array.from(
      new Set(boardsParsed.rows.map((r) => r.boardSlug))
    )
    await supabase
      .from('csv_import_pending')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'board')
      .lt('zeitraum_von', periodOk.von)
      .not('pinterest_id', 'in', toPgInList(csvBoardSlugs))
  }

  // Benchmark neu berechnen + alle Pins re-klassifizieren. Macht den
  // CSV-Import zur Single-Source-of-Truth für Klassifikations-Aktualität.
  if (pinsImported > 0) {
    await reclassifyAllPinsForUser(user.id)
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

  // Optional: volle Pinterest-URL — wird zusätzlich zu pinterest_pin_id auf
  // der pins-Tabelle gespeichert, damit das Bearbeiten-Modal die URL anzeigen
  // kann und beim nächsten CSV-Import URL-Matching greift.
  const pinterest_pin_url = String(
    formData.get('pinterest_pin_url') ?? ''
  ).trim()

  // Pin-Zuordnung speichern. URL nur schreiben, wenn echter http(s)-Wert
  // mitkommt — Legacy-Caller ohne URL bleiben unverändert.
  const pinUpdate: {
    pinterest_pin_id: string
    pinterest_pin_url?: string
  } = { pinterest_pin_id }
  if (pinterest_pin_url && /^https?:\/\//i.test(pinterest_pin_url)) {
    pinUpdate.pinterest_pin_url = pinterest_pin_url
  }
  const { error: pinErr } = await supabase
    .from('pins')
    .update(pinUpdate)
    .eq('id', pin_id)
    .eq('user_id', user.id)
  if (pinErr) return { error: pinErr.message }

  // ALLE offenen Pending-Perioden dieses Pins holen. Metriken UND Zeiträume
  // kommen jetzt aus der DB (nicht mehr aus dem Formular), damit beim Zuordnen
  // die vollständige Historie importiert wird — jede Periode als eigene
  // pins_analytics-Zeile mit ihrem korrekten Datum.
  const { data: pendingRows, error: pendErr } = await supabase
    .from('csv_import_pending')
    .select('zeitraum_von, zeitraum_bis, impressionen, klicks, saves')
    .eq('user_id', user.id)
    .eq('type', 'pin')
    .eq('pinterest_id', pinterest_pin_id)
  if (pendErr) return { error: pendErr.message }

  type PendingPinRow = {
    zeitraum_von: string | null
    zeitraum_bis: string | null
    impressionen: number | null
    klicks: number | null
    saves: number | null
  }
  const periods = (pendingRows ?? []) as PendingPinRow[]

  // Pro Periode eine pins_analytics-Zeile schreiben (datum = deren
  // zeitraum_bis). Findet die Abfrage keine Zeile, läuft die Schleife einfach
  // nicht — die Pin↔ID-Zuordnung oben ist trotzdem gesetzt, kein Crash.
  for (const r of periods) {
    // Ohne gültiges Bis-Datum kein datum-Schlüssel → Periode überspringen.
    if (!r.zeitraum_bis || !/^\d{4}-\d{2}-\d{2}$/.test(r.zeitraum_bis)) continue

    // Bestehende Werte für (pin_id, datum) holen, gemerged speichern —
    // gleiche Logik wie der Bulk-Import.
    const { data: existingRow, error: exErr } = await supabase
      .from('pins_analytics')
      .select('impressionen, klicks, saves')
      .eq('user_id', user.id)
      .eq('pin_id', pin_id)
      .eq('datum', r.zeitraum_bis)
      .is('deleted_at', null)
      .maybeSingle()
    if (exErr) return { error: exErr.message }
    const existing = existingRow ?? { impressionen: 0, klicks: 0, saves: 0 }

    const { error: upErr } = await supabase.from('pins_analytics').upsert(
      {
        user_id: user.id,
        pin_id,
        datum: r.zeitraum_bis,
        zeitraum_von: r.zeitraum_von,
        zeitraum_bis: r.zeitraum_bis,
        impressionen: r.impressionen ?? existing.impressionen,
        klicks: r.klicks ?? existing.klicks,
        saves: r.saves ?? existing.saves,
      },
      { onConflict: 'pin_id,datum' }
    )
    if (upErr) return { error: upErr.message }
  }

  await supabase
    .from('dashboard_erledigt')
    .delete()
    .eq('user_id', user.id)
    .eq('pin_id', pin_id)

  // Erst NACH dem Import ALLER Perioden die Pending-Zeilen entfernen — der
  // DELETE ohne Zeitraum-Filter ist jetzt korrekt, weil oben jede Periode
  // schon importiert wurde. Die Pin↔ID-Zuordnung steht in
  // pins.pinterest_pin_id, beim nächsten Import wird der Pin automatisch erkannt.
  await supabase
    .from('csv_import_pending')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'pin')
    .eq('pinterest_id', pinterest_pin_id)

  await reclassifyAllPinsForUser(user.id)

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
  // Volle Pinterest-URL aus dem Pending-Eintrag — wird zusätzlich zum Slug
  // in boards persistiert, damit beim nächsten CSV-Import Stufe-1-Matching
  // (URL-basiert) sofort greift.
  const pinterest_url = String(formData.get('pinterest_url') ?? '').trim()
  if (!board_id) return { error: 'Bitte ein Board auswählen.' }
  if (!pinterest_board_slug)
    return { error: 'Pinterest-Board-Slug fehlt.' }

  // pinterest_url nur schreiben, wenn ein echter URL-Wert mitkommt — nicht
  // jeder Caller hat die URL parat (z.B. Legacy-Pending-Zeilen, in denen das
  // Feld nur den Slug enthielt).
  const boardUpdate: {
    pinterest_board_slug: string
    pinterest_url?: string
  } = { pinterest_board_slug }
  if (pinterest_url && /^https?:\/\//i.test(pinterest_url)) {
    boardUpdate.pinterest_url = pinterest_url
  }
  const { error: bErr } = await supabase
    .from('boards')
    .update(boardUpdate)
    .eq('id', board_id)
    .eq('user_id', user.id)
  if (bErr) return { error: bErr.message }

  // ALLE offenen Pending-Perioden dieses Boards holen. Metriken UND Zeiträume
  // kommen jetzt aus der DB (nicht mehr aus dem Formular), damit beim Zuordnen
  // die vollständige Historie importiert wird — jede Periode als eigene
  // board_analytics-Zeile mit ihrem korrekten Datum. Board-Traffic-Metrik liegt
  // in ausgehende_klicks (die generische klicks-Spalte ist für Boards null).
  const { data: pendingRows, error: pendErr } = await supabase
    .from('csv_import_pending')
    .select(
      'zeitraum_von, zeitraum_bis, impressionen, engagement, klicks_auf_pins, ausgehende_klicks, saves'
    )
    .eq('user_id', user.id)
    .eq('type', 'board')
    .eq('pinterest_id', pinterest_board_slug)
  if (pendErr) return { error: pendErr.message }

  type PendingBoardRow = {
    zeitraum_von: string | null
    zeitraum_bis: string | null
    impressionen: number | null
    engagement: number | null
    klicks_auf_pins: number | null
    ausgehende_klicks: number | null
    saves: number | null
  }
  const periods = (pendingRows ?? []) as PendingBoardRow[]

  // Pro Periode eine board_analytics-Zeile schreiben (datum = deren
  // zeitraum_bis). Findet die Abfrage keine Zeile, läuft die Schleife einfach
  // nicht — die Board↔Slug-Zuordnung oben ist trotzdem gesetzt, kein Crash.
  for (const r of periods) {
    // Ohne gültiges Bis-Datum kein datum-Schlüssel → Periode überspringen.
    if (!r.zeitraum_bis || !/^\d{4}-\d{2}-\d{2}$/.test(r.zeitraum_bis)) continue

    // anzahl_pins pro (board_id, datum) aus der bestehenden Zeile holen — wird
    // beim CSV-Import nicht geliefert. Die 5 Metriken werden direkt aus der
    // Pending-Zeile übernommen (kein Merge — Board überschrieb nie).
    const { data: existing, error: exErr } = await supabase
      .from('board_analytics')
      .select('anzahl_pins')
      .eq('user_id', user.id)
      .eq('board_id', board_id)
      .eq('datum', r.zeitraum_bis)
      .maybeSingle()
    if (exErr) return { error: exErr.message }

    const { error: upErr } = await supabase.from('board_analytics').upsert(
      {
        user_id: user.id,
        board_id,
        datum: r.zeitraum_bis,
        impressionen: r.impressionen ?? 0,
        engagement: r.engagement ?? 0,
        klicks_auf_pins: r.klicks_auf_pins ?? 0,
        ausgehende_klicks: r.ausgehende_klicks ?? 0,
        saves: r.saves ?? 0,
        anzahl_pins: existing?.anzahl_pins ?? 0,
      },
      { onConflict: 'board_id,datum' }
    )
    if (upErr) return { error: upErr.message }
  }

  // Erst NACH dem Import ALLER Perioden die Pending-Zeilen entfernen — der
  // DELETE ohne Zeitraum-Filter ist jetzt korrekt, weil oben jede Periode
  // schon importiert wurde.
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
