'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

// Strategie-Umbau: Zuordnung der Ziel-URL zu einer Zielfläche. Erlaubte
// Werte entsprechen dem DB-Constraint; leer/NULL ist für bestehende URLs ok.
const ALLOWED_ZIELFLAECHE = [
  'blog',
  'shop',
  'etsy',
  'affiliate',
  'landingpage',
  'newsletter',
  'buchung',
] as const
type Zielflaeche = (typeof ALLOWED_ZIELFLAECHE)[number]

function isZielflaeche(value: string): value is Zielflaeche {
  return (ALLOWED_ZIELFLAECHE as readonly string[]).includes(value)
}

// Liest die Zielfläche. Leerer Wert → null (erlaubt bei bestehenden URLs);
// bei neuen URLs (required) ist ein gültiger Wert Pflicht.
function readZielflaeche(
  formData: FormData,
  { required }: { required: boolean }
): { value: string | null } | { error: string } {
  const raw = String(formData.get('zielflaeche') ?? '').trim()
  if (!raw) {
    if (required) return { error: 'Bitte ein Pin-Ziel wählen.' }
    return { value: null }
  }
  if (!isZielflaeche(raw))
    return { error: 'Bitte ein gültiges Pin-Ziel wählen.' }
  return { value: raw }
}

function readContentIds(formData: FormData): string[] {
  return Array.from(
    new Set(
      formData
        .getAll('content_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
}

function readBoardIds(formData: FormData): string[] {
  return Array.from(
    new Set(
      formData
        .getAll('board_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
}

export async function addZielUrl(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const url = String(formData.get('url') ?? '').trim()
  const titel = String(formData.get('titel') ?? '').trim()
  const notizen = String(formData.get('notizen') ?? '').trim() || null
  const contentIds = readContentIds(formData)
  const boardIds = readBoardIds(formData)

  if (!url) return { error: 'URL darf nicht leer sein.' }
  if (!titel) return { error: 'Titel darf nicht leer sein.' }
  // Neue URLs: Zielfläche ist Pflicht (bestehende dürfen NULL bleiben).
  const zielflaeche = readZielflaeche(formData, { required: true })
  if ('error' in zielflaeche) return { error: zielflaeche.error }

  const { data: inserted, error } = await supabase
    .from('ziel_urls')
    .insert({
      user_id: user.id,
      url,
      titel,
      zielflaeche: zielflaeche.value,
      notizen,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: error?.message ?? 'Konnte nicht speichern.' }
  }

  if (contentIds.length > 0) {
    const { error: cuError } = await supabase.from('content_urls').insert(
      contentIds.map((cid) => ({
        content_id: cid,
        url_id: inserted.id,
      }))
    )
    if (cuError) {
      return {
        error: `URL gespeichert, aber Verknüpfungen konnten nicht angelegt werden: ${cuError.message}`,
      }
    }
  }

  if (boardIds.length > 0) {
    const { error: ubError } = await supabase.from('url_boards').insert(
      boardIds.map((bid) => ({
        url_id: inserted.id,
        board_id: bid,
        user_id: user.id,
      }))
    )
    if (ubError) {
      return {
        error: `URL gespeichert, aber Board-Verknüpfungen konnten nicht angelegt werden: ${ubError.message}`,
      }
    }
  }

  revalidatePath('/dashboard/ziel-urls')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/boards')
  return {}
}

export async function updateZielUrl(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID fehlt.' }

  const url = String(formData.get('url') ?? '').trim()
  const titel = String(formData.get('titel') ?? '').trim()
  const notizen = String(formData.get('notizen') ?? '').trim() || null
  const contentIds = readContentIds(formData)
  const boardIds = readBoardIds(formData)

  if (!url) return { error: 'URL darf nicht leer sein.' }
  if (!titel) return { error: 'Titel darf nicht leer sein.' }
  // Bearbeiten: Zielfläche darf NULL bleiben, wird aber validiert falls gesetzt.
  const zielflaeche = readZielflaeche(formData, { required: false })
  if ('error' in zielflaeche) return { error: zielflaeche.error }

  const { error: updateError } = await supabase
    .from('ziel_urls')
    .update({
      url,
      titel,
      zielflaeche: zielflaeche.value,
      notizen,
    })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  const { error: deleteError } = await supabase
    .from('content_urls')
    .delete()
    .eq('url_id', id)
  if (deleteError) return { error: deleteError.message }

  if (contentIds.length > 0) {
    const { error: insertError } = await supabase
      .from('content_urls')
      .insert(contentIds.map((cid) => ({ content_id: cid, url_id: id })))
    if (insertError) return { error: insertError.message }
  }

  const { error: deleteBoardsError } = await supabase
    .from('url_boards')
    .delete()
    .eq('url_id', id)
  if (deleteBoardsError) return { error: deleteBoardsError.message }

  if (boardIds.length > 0) {
    const { error: insertBoardsError } = await supabase
      .from('url_boards')
      .insert(
        boardIds.map((bid) => ({
          url_id: id,
          board_id: bid,
          user_id: user.id,
        }))
      )
    if (insertBoardsError) return { error: insertBoardsError.message }
  }

  revalidatePath('/dashboard/ziel-urls')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/boards')
  return {}
}

export async function deleteZielUrl(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('ziel_urls').delete().eq('id', id)
  revalidatePath('/dashboard/ziel-urls')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/boards')
}

export async function importZielUrls(
  formData: FormData
): Promise<{ error?: string; imported?: number }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const text = String(formData.get('text') ?? '')

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const rows: Array<{
    user_id: string
    url: string
    titel: string
    notizen: null
  }> = []

  for (const line of lines) {
    const parts = line.split(/\s*[|\t]\s*/)
    const url = parts[0]?.trim()
    if (!url) continue
    if (seen.has(url)) continue
    seen.add(url)
    const titel = parts[1]?.trim() || url
    rows.push({
      user_id: user.id,
      url,
      titel,
      notizen: null,
    })
  }

  if (rows.length === 0) {
    return { error: 'Bitte mindestens eine URL einfügen.' }
  }

  const { error } = await supabase.from('ziel_urls').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/ziel-urls')
  return { imported: rows.length }
}
