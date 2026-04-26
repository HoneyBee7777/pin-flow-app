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

  const updates: Record<string, string | number | null> = {}

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

  const intFields = [
    ['schwellwert_beobachtung', 'Beobachtungszeitraum'],
    ['schwellwert_min_klicks', 'Mindest-Klicks'],
    ['schwellwert_alter_recycling', 'Mindest-Alter'],
    ['schwellwert_impressionen', 'Mindest-Impressionen'],
    ['schwellwert_board_wenig_aktiv', 'Wenig aktiv ab (Tage)'],
    ['schwellwert_board_inaktiv', 'Inaktiv ab (Tage)'],
    [
      'schwellwert_board_min_impressionen_top',
      'Mindest-Impressionen für Top Board',
    ],
    [
      'schwellwert_board_min_impressionen_wachstum',
      'Mindest-Impressionen für Wachstum',
    ],
    [
      'schwellwert_board_min_impressionen_beobachten',
      'Mindest-Impressionen für Beobachten',
    ],
  ] as const
  for (const [name, label] of intFields) {
    if (!formData.has(name)) continue
    const raw = String(formData.get(name) ?? '').trim()
    if (!raw) {
      updates[name] = null
      continue
    }
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0)
      return {
        error: `„${label}" muss eine nicht-negative ganze Zahl sein.`,
      }
    updates[name] = n
  }

  const decFields = [
    ['schwellwert_ctr', 'Mindest-CTR'],
    ['schwellwert_board_min_engagement_top', 'Mindest-Engagement Rate'],
  ] as const
  for (const [name, label] of decFields) {
    if (!formData.has(name)) continue
    const raw = String(formData.get(name) ?? '').trim()
    if (!raw) {
      updates[name] = null
      continue
    }
    const normalized = raw.replace(',', '.')
    const n = Number(normalized)
    if (!Number.isFinite(n) || n < 0)
      return { error: `„${label}" muss eine nicht-negative Zahl sein.` }
    updates[name] = n
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
  revalidatePath('/dashboard/analytics')
  return {}
}
