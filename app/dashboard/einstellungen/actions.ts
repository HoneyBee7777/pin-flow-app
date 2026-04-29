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

  if (formData.has('profil_name')) {
    const v = String(formData.get('profil_name') ?? '').trim()
    if (v.length > 100)
      return { error: 'Profilname darf maximal 100 Zeichen haben.' }
    updates.profil_name = v || null
  }

  const urlFields = [
    ['pinterest_analytics_url', 'Pinterest Analytics URL'],
    ['pinterest_account_url', 'Pinterest Account URL'],
    ['website_url', 'Website URL'],
    ['tailwind_url', 'Tailwind URL'],
  ] as const
  for (const [name, label] of urlFields) {
    if (!formData.has(name)) continue
    const v = String(formData.get(name) ?? '').trim()
    if (v && !/^https?:\/\//i.test(v))
      return { error: `„${label}" muss mit http:// oder https:// beginnen.` }
    updates[name] = v || null
  }

  const intFields = [
    ['schwellwert_beobachtung', 'Beobachtungszeitraum'],
    ['schwellwert_min_klicks', 'Mindest-Klicks'],
    ['schwellwert_alter_recycling', 'Mindest-Alter'],
    ['schwellwert_impressionen', 'Mindest-Impressionen'],
    ['schwellwert_board_wenig_aktiv', 'Wenig aktiv ab (Tage)'],
    ['schwellwert_board_inaktiv', 'Inaktiv ab (Tage)'],
    ['cp_min_pins_gesamt', 'Mindest-Pin-Anzahl pro Inhalt'],
    [
      'cp_min_pins_ohne_aktuell',
      'Mindest-Pin-Anzahl für Sub-Liste „Ohne aktuellen Pin"',
    ],
    ['cp_tage_ohne_pin', 'Tage seit letztem Pin'],
    ['cp_max_pins_goldnugget', 'Maximale Pin-Anzahl für Goldnugget-URLs'],
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
    ['schwellwert_board_top_er', 'Top Board ER Schwellwert'],
    ['schwellwert_board_top_prozent', 'Top Board Profil-Prozent'],
    ['schwellwert_board_schwach_er', 'Schwach ER Schwellwert'],
    ['schwellwert_board_wachstum_trend', 'Wachstums-Trend Schwellwert'],
    ['cp_min_ctr_goldnugget', 'Mindest-CTR für Goldnugget-URLs'],
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
  revalidatePath('/dashboard')
  return {}
}
