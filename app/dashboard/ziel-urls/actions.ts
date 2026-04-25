'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

const ALLOWED_TYPES = [
  'blogpost',
  'produkt',
  'affiliate',
  'landingpage',
  'leadmagnet',
  'kategorie',
  'startseite',
] as const
type ZielUrlTyp = (typeof ALLOWED_TYPES)[number]

const ALLOWED_PRIO = ['hoch', 'mittel', 'niedrig'] as const
type Prioritaet = (typeof ALLOWED_PRIO)[number]

function isTyp(value: string): value is ZielUrlTyp {
  return (ALLOWED_TYPES as readonly string[]).includes(value)
}

function isPrio(value: string): value is Prioritaet {
  return (ALLOWED_PRIO as readonly string[]).includes(value)
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
  const typ = String(formData.get('typ') ?? '')
  const prioritaet = String(formData.get('prioritaet') ?? '')
  const notizen = String(formData.get('notizen') ?? '').trim() || null

  if (!url) return { error: 'URL darf nicht leer sein.' }
  if (!titel) return { error: 'Titel darf nicht leer sein.' }
  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }
  if (!isPrio(prioritaet))
    return { error: 'Bitte eine gültige Priorität wählen.' }

  const { error } = await supabase.from('ziel_urls').insert({
    user_id: user.id,
    url,
    titel,
    typ,
    prioritaet,
    notizen,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/ziel-urls')
  return {}
}

export async function deleteZielUrl(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('ziel_urls').delete().eq('id', id)
  revalidatePath('/dashboard/ziel-urls')
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
  const typ = String(formData.get('typ') ?? '')
  const prioritaet = String(formData.get('prioritaet') ?? '')

  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }
  if (!isPrio(prioritaet))
    return { error: 'Bitte eine gültige Priorität wählen.' }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const rows: Array<{
    user_id: string
    url: string
    titel: string
    typ: string
    prioritaet: string
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
      typ,
      prioritaet,
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
