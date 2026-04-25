'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { SaisonTyp } from './utils'

const ALLOWED_TYPES: readonly SaisonTyp[] = [
  'feiertag',
  'jahreszeit',
  'shopping_event',
  'evergreen',
] as const

function isTyp(value: string): value is SaisonTyp {
  return (ALLOWED_TYPES as readonly string[]).includes(value)
}

type Input = {
  event_name: string
  event_datum: string | null
  saison_typ: SaisonTyp
  suchbeginn_tage: number | null
  notizen: string | null
}

function parseInput(
  formData: FormData
): { input: Input } | { error: string } {
  const event_name = String(formData.get('event_name') ?? '').trim()
  const datumRaw = String(formData.get('event_datum') ?? '').trim()
  const typRaw = String(formData.get('saison_typ') ?? '')
  const tageRaw = String(formData.get('suchbeginn_tage') ?? '').trim()
  const notizen = String(formData.get('notizen') ?? '').trim() || null

  if (!event_name) return { error: 'Event-Name darf nicht leer sein.' }
  if (!isTyp(typRaw))
    return { error: 'Bitte einen gültigen Saison-Typ wählen.' }

  let event_datum: string | null = null
  let suchbeginn_tage: number | null = null

  if (typRaw === 'evergreen') {
    event_datum = null
    suchbeginn_tage = null
  } else {
    if (!datumRaw)
      return { error: 'Datum ist Pflicht (außer bei Evergreen-Events).' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datumRaw))
      return { error: 'Ungültiges Datumsformat.' }
    event_datum = datumRaw

    if (tageRaw) {
      const n = Number(tageRaw)
      if (!Number.isInteger(n) || n <= 0)
        return { error: 'Suchbeginn-Tage muss eine positive ganze Zahl sein.' }
      suchbeginn_tage = n
    } else {
      suchbeginn_tage = 60
    }
  }

  return {
    input: {
      event_name,
      event_datum,
      saison_typ: typRaw,
      suchbeginn_tage,
      notizen,
    },
  }
}

export async function addEvent(
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
    .from('saison_events')
    .insert({ user_id: user.id, ...parsed.input })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/saison-kalender')
  return {}
}

export async function updateEvent(
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
    .from('saison_events')
    .update(parsed.input)
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/saison-kalender')
  return {}
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('saison_events').delete().eq('id', id)
  revalidatePath('/dashboard/saison-kalender')
}
