'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

const ALLOWED_TYPES = [
  'blogpost',
  'produkt',
  'affiliate',
  'landingpage',
  'leadmagnet',
] as const
type ContentTyp = (typeof ALLOWED_TYPES)[number]

const ALLOWED_STRATEGIE = ['traffic', 'lead', 'sales'] as const
type StrategieTyp = (typeof ALLOWED_STRATEGIE)[number]

function isTyp(value: string): value is ContentTyp {
  return (ALLOWED_TYPES as readonly string[]).includes(value)
}

function isStrategie(value: string): value is StrategieTyp {
  return (ALLOWED_STRATEGIE as readonly string[]).includes(value)
}

export async function addContent(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const titel = String(formData.get('titel') ?? '').trim()
  const typ = String(formData.get('typ') ?? '')
  const strategie_typ = String(formData.get('strategie_typ') ?? '')
  const notizen = String(formData.get('notizen') ?? '').trim() || null

  if (!titel) return { error: 'Titel darf nicht leer sein.' }
  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }
  if (!isStrategie(strategie_typ))
    return { error: 'Bitte einen gültigen Strategie-Typ wählen.' }

  const keywordIds = Array.from(
    new Set(
      formData
        .getAll('keyword_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
  const urlIds = Array.from(
    new Set(
      formData
        .getAll('url_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )

  const { data: inserted, error } = await supabase
    .from('content_inhalte')
    .insert({ user_id: user.id, titel, typ, strategie_typ, notizen })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: error?.message ?? 'Konnte nicht speichern.' }
  }

  if (keywordIds.length > 0) {
    const { error: kwError } = await supabase.from('content_keywords').insert(
      keywordIds.map((kid) => ({
        content_id: inserted.id,
        keyword_id: kid,
      }))
    )
    if (kwError) {
      return {
        error: `Inhalt gespeichert, aber Keywords konnten nicht verknüpft werden: ${kwError.message}`,
      }
    }
  }

  if (urlIds.length > 0) {
    const { error: urlError } = await supabase.from('content_urls').insert(
      urlIds.map((uid) => ({
        content_id: inserted.id,
        url_id: uid,
      }))
    )
    if (urlError) {
      return {
        error: `Inhalt gespeichert, aber URLs konnten nicht verknüpft werden: ${urlError.message}`,
      }
    }
  }

  revalidatePath('/dashboard/content-inhalte')
  return {}
}

export async function updateContent(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID fehlt.' }

  const titel = String(formData.get('titel') ?? '').trim()
  const typ = String(formData.get('typ') ?? '')
  const strategie_typ = String(formData.get('strategie_typ') ?? '')
  const notizen = String(formData.get('notizen') ?? '').trim() || null

  if (!titel) return { error: 'Titel darf nicht leer sein.' }
  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }
  if (!isStrategie(strategie_typ))
    return { error: 'Bitte einen gültigen Strategie-Typ wählen.' }

  const keywordIds = Array.from(
    new Set(
      formData
        .getAll('keyword_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
  const urlIds = Array.from(
    new Set(
      formData
        .getAll('url_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )

  const { error: updateError } = await supabase
    .from('content_inhalte')
    .update({ titel, typ, strategie_typ, notizen })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  const { error: kwDeleteError } = await supabase
    .from('content_keywords')
    .delete()
    .eq('content_id', id)
  if (kwDeleteError) return { error: kwDeleteError.message }

  const { error: urlDeleteError } = await supabase
    .from('content_urls')
    .delete()
    .eq('content_id', id)
  if (urlDeleteError) return { error: urlDeleteError.message }

  if (keywordIds.length > 0) {
    const { error: kwError } = await supabase.from('content_keywords').insert(
      keywordIds.map((kid) => ({ content_id: id, keyword_id: kid }))
    )
    if (kwError) return { error: kwError.message }
  }

  if (urlIds.length > 0) {
    const { error: urlError } = await supabase.from('content_urls').insert(
      urlIds.map((uid) => ({ content_id: id, url_id: uid }))
    )
    if (urlError) return { error: urlError.message }
  }

  revalidatePath('/dashboard/content-inhalte')
  return {}
}

export async function deleteContent(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('content_inhalte').delete().eq('id', id)
  revalidatePath('/dashboard/content-inhalte')
}
