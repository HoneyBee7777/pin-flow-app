'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { VORLAGEN_TYPEN, type VorlagenTyp } from './utils'

function isTyp(value: string): value is VorlagenTyp {
  return (VORLAGEN_TYPEN as readonly string[]).includes(value)
}

type Input = {
  name: string
  canva_link: string | null
  vorlagen_typ: VorlagenTyp
  farbschema: string | null
  notizen: string | null
}

function parseInput(formData: FormData): { input: Input } | { error: string } {
  const name = String(formData.get('name') ?? '').trim()
  const canvaLinkRaw = String(formData.get('canva_link') ?? '').trim()
  const typRaw = String(formData.get('vorlagen_typ') ?? '')
  const farbschemaRaw = String(formData.get('farbschema') ?? '').trim()
  const notizenRaw = String(formData.get('notizen') ?? '').trim()

  if (!name) return { error: 'Name darf nicht leer sein.' }
  if (!isTyp(typRaw))
    return { error: 'Bitte einen gültigen Vorlagen-Typ wählen.' }
  if (canvaLinkRaw && !/^https?:\/\//i.test(canvaLinkRaw))
    return { error: 'Canva-Link muss mit http:// oder https:// beginnen.' }

  return {
    input: {
      name,
      canva_link: canvaLinkRaw || null,
      vorlagen_typ: typRaw,
      farbschema: farbschemaRaw || null,
      notizen: notizenRaw || null,
    },
  }
}

export async function addVorlage(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = parseInput(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('canva_vorlagen')
    .insert({ user_id: user.id, ...parsed.input })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/canva-vorlagen')
  return {}
}

export async function updateVorlage(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID fehlt.' }

  const parsed = parseInput(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('canva_vorlagen')
    .update(parsed.input)
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/canva-vorlagen')
  return {}
}

export async function deleteVorlage(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('canva_vorlagen').delete().eq('id', id)
  revalidatePath('/dashboard/canva-vorlagen')
}
