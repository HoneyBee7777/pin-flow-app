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

  const updates: Record<string, string | null> = {}

  if (formData.has('eigene_signalwoerter')) {
    const v = String(formData.get('eigene_signalwoerter') ?? '').trim()
    updates.eigene_signalwoerter = v || null
  }

  if (formData.has('pinterest_analytics_url')) {
    const v = String(formData.get('pinterest_analytics_url') ?? '').trim()
    if (v && !/^https?:\/\//i.test(v))
      return {
        error:
          'Pinterest Analytics URL muss mit http:// oder https:// beginnen.',
      }
    updates.pinterest_analytics_url = v || null
  }

  if (Object.keys(updates).length === 0)
    return { error: 'Keine Änderungen zum Speichern.' }

  const { error } = await supabase
    .from('einstellungen')
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: 'user_id' }
    )
  if (error) return { error: error.message }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/pin-produktion')
  return {}
}
