'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function toggleDashboardErledigt(
  pinId: string,
  kategorie: string,
  erledigt: boolean
): Promise<{ error?: string }> {
  if (!pinId) return { error: 'Pin-ID fehlt.' }
  if (!kategorie) return { error: 'Kategorie fehlt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  if (erledigt) {
    const { error } = await supabase
      .from('dashboard_erledigt')
      .upsert(
        { user_id: user.id, pin_id: pinId, kategorie },
        { onConflict: 'user_id,pin_id,kategorie' }
      )
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('dashboard_erledigt')
      .delete()
      .eq('user_id', user.id)
      .eq('pin_id', pinId)
      .eq('kategorie', kategorie)
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  return {}
}
