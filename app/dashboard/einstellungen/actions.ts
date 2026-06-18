'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { reclassifyAllPinsForUser } from '../analytics/benchmark'

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

  if (formData.has('signalwoerter_deaktiviert')) {
    const v = String(formData.get('signalwoerter_deaktiviert') ?? '').trim()
    updates.signalwoerter_deaktiviert = v || null
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
    ['schwellwert_min_klicks', 'Mindestzahl ausgehender Klicks für Top Performer'],
    [
      'schwellwert_min_imp_ctr_urteil',
      'Mindest-Impressionen für CTR-Urteil',
    ],
    [
      'schwellwert_min_imp_reichweite_stark',
      'Mindest-Impressionen für starke Reichweite',
    ],
    [
      'schwellwert_min_klicks_nutzer_signal',
      'Mindestzahl ausgehender Klicks für Nutzer-Signal',
    ],
    ['schwellwert_top_performer_max_alter', 'Top Performer Max-Alter'],
    [
      'schwellwert_schlafender_gewinner_alter',
      'Eingeschlafener Gewinner ab Alter',
    ],
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
    ['schwellwert_ctr', 'Mindest-CTR (Fallback)'],
    ['schwellwert_ctr_boost_faktor', 'CTR-Boost-Faktor'],
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

  // Diff-Schwellen für den Strategie-Check (Dashboard). Bereich 0..100, und
  // die rote Schwelle muss über der gelben liegen. Beide werden gemeinsam
  // gesendet, damit die Cross-Validierung greifen kann.
  const schwelleFields = [
    ['strategie_check_schwelle_gelb', 'Diff-Schwelle Gelb'],
    ['strategie_check_schwelle_rot', 'Diff-Schwelle Rot'],
  ] as const
  const schwelleValues: Record<string, number> = {}
  for (const [name, label] of schwelleFields) {
    if (!formData.has(name)) continue
    const raw = String(formData.get(name) ?? '').trim()
    if (!raw) {
      return { error: `„${label}" darf nicht leer sein.` }
    }
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      return {
        error: `„${label}" muss eine ganze Zahl zwischen 0 und 100 sein.`,
      }
    }
    schwelleValues[name] = n
    updates[name] = n
  }
  if (
    schwelleValues.strategie_check_schwelle_gelb !== undefined &&
    schwelleValues.strategie_check_schwelle_rot !== undefined &&
    schwelleValues.strategie_check_schwelle_rot <=
      schwelleValues.strategie_check_schwelle_gelb
  ) {
    return {
      error: '„Diff-Schwelle Rot" muss größer sein als „Diff-Schwelle Gelb".',
    }
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

  // Re-Klassifikation triggern, wenn Pin-Schwellwerte angepasst wurden.
  // Nicht-Pin-Schwellwerte (Boards, Status, Content-Pipeline) lösen das nicht aus.
  const pinThresholdKeys = new Set([
    'schwellwert_beobachtung',
    'schwellwert_min_klicks',
    'schwellwert_ctr',
    'schwellwert_min_imp_ctr_urteil',
    'schwellwert_min_imp_reichweite_stark',
    'schwellwert_min_klicks_nutzer_signal',
    'schwellwert_top_performer_max_alter',
    'schwellwert_schlafender_gewinner_alter',
    'schwellwert_ctr_boost_faktor',
  ])
  const pinThresholdsTouched = Object.keys(updates).some((k) =>
    pinThresholdKeys.has(k)
  )
  if (pinThresholdsTouched) {
    await reclassifyAllPinsForUser(user.id)
  }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}
