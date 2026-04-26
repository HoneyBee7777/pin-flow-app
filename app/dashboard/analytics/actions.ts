'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
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

  const datum = String(formData.get('datum') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    return { error: 'Bitte ein gültiges Datum wählen.' }

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
      { user_id: user.id, datum, ...fields },
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

  const datum = String(formData.get('datum') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    return { error: 'Bitte ein gültiges Datum wählen.' }

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
      { user_id: user.id, pin_id, datum, ...fields },
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
        (r.engagement || 0)
      return sum > 0
    })
    .map((r) => {
      for (const key of [
        'impressionen',
        'klicks_auf_pins',
        'ausgehende_klicks',
        'saves',
        'engagement',
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
