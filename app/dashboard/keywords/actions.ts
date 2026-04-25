'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

const ALLOWED_TYPES = ['haupt', 'mid_tail', 'longtail'] as const
type KeywordTyp = (typeof ALLOWED_TYPES)[number]

function isTyp(value: string): value is KeywordTyp {
  return (ALLOWED_TYPES as readonly string[]).includes(value)
}

export async function addKeyword(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const keyword = String(formData.get('keyword') ?? '').trim()
  const typ = String(formData.get('typ') ?? '')
  const saison_peak =
    String(formData.get('saison_peak') ?? '').trim() || null
  const notizen = String(formData.get('notizen') ?? '').trim() || null

  if (!keyword) return { error: 'Keyword darf nicht leer sein.' }
  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }

  const { error } = await supabase.from('keywords').insert({
    user_id: user.id,
    keyword,
    typ,
    saison_peak,
    notizen,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/keywords')
  return {}
}

export async function deleteKeyword(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('keywords').delete().eq('id', id)
  revalidatePath('/dashboard/keywords')
}

export async function importKeywords(
  formData: FormData
): Promise<{ error?: string; imported?: number }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const text = String(formData.get('text') ?? '')
  const typ = String(formData.get('typ') ?? '')

  if (!isTyp(typ)) return { error: 'Bitte einen gültigen Typ wählen.' }

  const lines = Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  )

  if (lines.length === 0) {
    return { error: 'Bitte mindestens ein Keyword einfügen.' }
  }

  const rows = lines.map((keyword) => ({
    user_id: user.id,
    keyword,
    typ,
    saison_peak: null,
    notizen: null,
  }))

  const { error } = await supabase.from('keywords').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/keywords')
  return { imported: lines.length }
}
