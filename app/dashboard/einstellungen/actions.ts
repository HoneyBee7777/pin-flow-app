'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function saveEinstellungen(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const eigene = String(formData.get('eigene_signalwoerter') ?? '').trim()
  const eigene_signalwoerter = eigene || null

  const { error } = await supabase
    .from('einstellungen')
    .upsert(
      { user_id: user.id, eigene_signalwoerter },
      { onConflict: 'user_id' }
    )
  if (error) return { error: error.message }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/pin-produktion')
  return {}
}
