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

  revalidatePath('/dashboard/analytics')
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
}
