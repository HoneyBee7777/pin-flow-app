'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export type VarianteTyp = 'variante' | 'recycling'

export async function produceVariant(
  originalPinId: string,
  varianteTyp: VarianteTyp
): Promise<{ error?: string }> {
  if (!originalPinId) return { error: 'Pin-ID fehlt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { data: original, error: loadErr } = await supabase
    .from('pins')
    .select(
      `content_id, canva_vorlage_id, ziel_url_id, board_id, saison_event_id,
       titel, hook, beschreibung, call_to_action,
       strategie_typ, conversion_ziel, hook_art, pin_format`
    )
    .eq('id', originalPinId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadErr) return { error: loadErr.message }
  if (!original) return { error: 'Original-Pin nicht gefunden.' }

  const { data: inserted, error: insertErr } = await supabase
    .from('pins')
    .insert({
      user_id: user.id,
      content_id: original.content_id,
      canva_vorlage_id: original.canva_vorlage_id,
      ziel_url_id: original.ziel_url_id,
      board_id: original.board_id,
      saison_event_id: original.saison_event_id,
      titel: original.titel,
      hook: original.hook,
      beschreibung: original.beschreibung,
      call_to_action: original.call_to_action,
      strategie_typ: original.strategie_typ,
      conversion_ziel: original.conversion_ziel,
      hook_art: original.hook_art,
      pin_format: original.pin_format,
      status: 'entwurf',
      variante_von_pin_id: originalPinId,
      variante_typ: varianteTyp,
    })
    .select('id')
    .single()

  if (insertErr || !inserted)
    return {
      error: insertErr?.message ?? 'Konnte Variante nicht anlegen.',
    }

  // Original-Keywords kopieren
  const { data: kwLinks } = await supabase
    .from('pin_keywords')
    .select('keyword_id')
    .eq('pin_id', originalPinId)
  if (kwLinks && kwLinks.length > 0) {
    await supabase.from('pin_keywords').insert(
      kwLinks.map((k) => ({
        pin_id: inserted.id,
        keyword_id: k.keyword_id,
        user_id: user.id,
      }))
    )
  }

  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard')
  redirect(`/dashboard/pin-produktion?edit=${inserted.id}`)
}
