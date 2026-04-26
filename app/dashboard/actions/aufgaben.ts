'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function addAufgabe(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const titel = String(formData.get('titel') ?? '').trim()
  if (!titel) return { error: 'Bitte einen Titel angeben.' }
  if (titel.length > 200)
    return { error: 'Titel darf maximal 200 Zeichen haben.' }

  const datumRaw = String(formData.get('faelligkeitsdatum') ?? '').trim()
  const faelligkeitsdatum = datumRaw || null
  if (faelligkeitsdatum && !/^\d{4}-\d{2}-\d{2}$/.test(faelligkeitsdatum))
    return { error: 'Datum muss im Format YYYY-MM-DD sein.' }

  const { error } = await supabase.from('aufgaben').insert({
    user_id: user.id,
    titel,
    faelligkeitsdatum,
    erledigt: false,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}

export async function toggleAufgabe(
  id: string,
  erledigt: boolean
): Promise<{ error?: string }> {
  if (!id) return { error: 'ID fehlt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { error } = await supabase
    .from('aufgaben')
    .update({ erledigt })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}

export async function deleteAufgabe(id: string): Promise<{ error?: string }> {
  if (!id) return { error: 'ID fehlt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { error } = await supabase.from('aufgaben').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}
