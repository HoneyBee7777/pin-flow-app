'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

type Result = { error?: string; saved?: boolean }

async function upsertOrDelete(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventId: string,
  jahr: number,
  datumRaw: string
): Promise<string | null> {
  const datum = datumRaw.trim()
  if (datum) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return 'Ungültiges Datumsformat.'
    if (!datum.startsWith(String(jahr)))
      return `Datum muss im Jahr ${jahr} liegen.`
    const { error } = await supabase
      .from('saison_event_jahresdaten')
      .upsert(
        { user_id: userId, event_id: eventId, jahr, datum },
        { onConflict: 'event_id,jahr' }
      )
    return error?.message ?? null
  }
  const { error } = await supabase
    .from('saison_event_jahresdaten')
    .delete()
    .eq('event_id', eventId)
    .eq('jahr', jahr)
  return error?.message ?? null
}

export async function saveJahresdaten(formData: FormData): Promise<Result> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const event_id = String(formData.get('event_id') ?? '')
  if (!event_id) return { error: 'Event-ID fehlt.' }

  const ownerCheck = await supabase
    .from('saison_events')
    .select('id, datum_variabel')
    .eq('id', event_id)
    .single()
  if (ownerCheck.error || !ownerCheck.data)
    return { error: 'Event nicht gefunden.' }
  if (!ownerCheck.data.datum_variabel)
    return { error: 'Event hat kein variables Datum.' }

  const jahrPlus1 = Number(formData.get('jahr_plus_1'))
  const jahrPlus2 = Number(formData.get('jahr_plus_2'))
  if (!Number.isInteger(jahrPlus1) || !Number.isInteger(jahrPlus2))
    return { error: 'Ungültige Jahresangabe.' }

  const datumPlus1 = String(formData.get('datum_plus_1') ?? '')
  const datumPlus2 = String(formData.get('datum_plus_2') ?? '')

  const err1 = await upsertOrDelete(
    supabase,
    user.id,
    event_id,
    jahrPlus1,
    datumPlus1
  )
  if (err1) return { error: err1 }

  const err2 = await upsertOrDelete(
    supabase,
    user.id,
    event_id,
    jahrPlus2,
    datumPlus2
  )
  if (err2) return { error: err2 }

  revalidatePath('/dashboard/saison-kalender/planung')
  revalidatePath('/dashboard/saison-kalender')
  return { saved: true }
}
