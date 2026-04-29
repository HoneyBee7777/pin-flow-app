'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

const ALLOWED_KATEGORIEN = [
  'Essen & Trinken',
  'Reisen',
  'Beauty & Pflege',
  'Mode',
  'Wohnen & Einrichten',
  'Gesundheit & Fitness',
  'Yoga & Wellness',
  'Garten',
  'DIY & Basteln',
  'Hochzeit',
  'Familie & Erziehung',
  'Finanzen',
  'Tiere',
  'Kunst & Design',
  'Bildung',
  'Business & Marketing',
  'Technologie',
  'Sonstiges',
] as const
type Kategorie = (typeof ALLOWED_KATEGORIEN)[number]

const ALLOWED_FOKUS = [
  'blog_content',
  'affiliate',
  'produkt',
  'gemischt',
] as const
type StrategieFokus = (typeof ALLOWED_FOKUS)[number]

function isKategorie(value: string): value is Kategorie {
  return (ALLOWED_KATEGORIEN as readonly string[]).includes(value)
}

function isFokus(value: string): value is StrategieFokus {
  return (ALLOWED_FOKUS as readonly string[]).includes(value)
}

function readKeywordIds(formData: FormData): string[] {
  return Array.from(
    new Set(
      formData
        .getAll('keyword_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
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

function readUrlIds(formData: FormData): string[] {
  return Array.from(
    new Set(
      formData
        .getAll('url_ids')
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
}

type BoardInput = {
  name: string
  beschreibung: string | null
  kategorie: Kategorie | null
  pinterest_url: string | null
  geheim: boolean
  strategie_fokus: StrategieFokus | null
}

function parseBoardInput(
  formData: FormData
): { input: BoardInput } | { error: string } {
  const name = String(formData.get('name') ?? '').trim()
  const beschreibung =
    String(formData.get('beschreibung') ?? '').trim() || null
  const pinterest_url =
    String(formData.get('pinterest_url') ?? '').trim() || null
  const geheim = formData.has('geheim')

  if (!name) return { error: 'Name darf nicht leer sein.' }

  const kategorieRaw = String(formData.get('kategorie') ?? '').trim()
  let kategorie: Kategorie | null = null
  if (kategorieRaw) {
    if (!isKategorie(kategorieRaw)) {
      return { error: 'Bitte eine gültige Kategorie wählen.' }
    }
    kategorie = kategorieRaw
  }

  const fokusRaw = String(formData.get('strategie_fokus') ?? '').trim()
  let strategie_fokus: StrategieFokus | null = null
  if (fokusRaw) {
    if (!isFokus(fokusRaw)) {
      return { error: 'Bitte einen gültigen Strategie-Fokus wählen.' }
    }
    strategie_fokus = fokusRaw
  }

  return {
    input: {
      name,
      beschreibung,
      kategorie,
      pinterest_url,
      geheim,
      strategie_fokus,
    },
  }
}

export async function addBoard(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = parseBoardInput(formData)
  if ('error' in parsed) return { error: parsed.error }
  const keywordIds = readKeywordIds(formData)
  const contentIds = readContentIds(formData)
  const urlIds = readUrlIds(formData)

  const { data: inserted, error } = await supabase
    .from('boards')
    .insert({ user_id: user.id, ...parsed.input })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: error?.message ?? 'Konnte nicht speichern.' }
  }

  if (keywordIds.length > 0) {
    const { error: bkError } = await supabase.from('board_keywords').insert(
      keywordIds.map((kid) => ({
        board_id: inserted.id,
        keyword_id: kid,
      }))
    )
    if (bkError) {
      return {
        error: `Board gespeichert, aber Keywords konnten nicht verknüpft werden: ${bkError.message}`,
      }
    }
  }

  if (contentIds.length > 0) {
    const { error: cbError } = await supabase.from('content_boards').insert(
      contentIds.map((cid) => ({
        content_id: cid,
        board_id: inserted.id,
        user_id: user.id,
      }))
    )
    if (cbError) {
      return {
        error: `Board gespeichert, aber Inhalte konnten nicht verknüpft werden: ${cbError.message}`,
      }
    }
  }

  if (urlIds.length > 0) {
    const { error: ubError } = await supabase.from('url_boards').insert(
      urlIds.map((uid) => ({
        url_id: uid,
        board_id: inserted.id,
        user_id: user.id,
      }))
    )
    if (ubError) {
      return {
        error: `Board gespeichert, aber Ziel-URLs konnten nicht verknüpft werden: ${ubError.message}`,
      }
    }
  }

  revalidatePath('/dashboard/boards')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/ziel-urls')
  return {}
}

export async function updateBoard(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID fehlt.' }

  const parsed = parseBoardInput(formData)
  if ('error' in parsed) return { error: parsed.error }
  const keywordIds = readKeywordIds(formData)
  const contentIds = readContentIds(formData)
  const urlIds = readUrlIds(formData)

  const { error: updateError } = await supabase
    .from('boards')
    .update(parsed.input)
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  const { error: bkDeleteError } = await supabase
    .from('board_keywords')
    .delete()
    .eq('board_id', id)
  if (bkDeleteError) return { error: bkDeleteError.message }

  const { error: cbDeleteError } = await supabase
    .from('content_boards')
    .delete()
    .eq('board_id', id)
  if (cbDeleteError) return { error: cbDeleteError.message }

  const { error: ubDeleteError } = await supabase
    .from('url_boards')
    .delete()
    .eq('board_id', id)
  if (ubDeleteError) return { error: ubDeleteError.message }

  if (keywordIds.length > 0) {
    const { error: insertError } = await supabase
      .from('board_keywords')
      .insert(
        keywordIds.map((kid) => ({ board_id: id, keyword_id: kid }))
      )
    if (insertError) return { error: insertError.message }
  }

  if (contentIds.length > 0) {
    const { error: insertError } = await supabase
      .from('content_boards')
      .insert(
        contentIds.map((cid) => ({
          content_id: cid,
          board_id: id,
          user_id: user.id,
        }))
      )
    if (insertError) return { error: insertError.message }
  }

  if (urlIds.length > 0) {
    const { error: insertError } = await supabase
      .from('url_boards')
      .insert(
        urlIds.map((uid) => ({
          url_id: uid,
          board_id: id,
          user_id: user.id,
        }))
      )
    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/dashboard/boards')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/ziel-urls')
  return {}
}

export async function deleteBoard(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('boards').delete().eq('id', id)
  revalidatePath('/dashboard/boards')
  revalidatePath('/dashboard/content-inhalte')
  revalidatePath('/dashboard/ziel-urls')
}
