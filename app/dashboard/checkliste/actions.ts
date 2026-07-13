'use server'

// V3.6 — Server-Action zum Umschalten eines Checklisten-Punkts.
// Optimistic im Client, hier nur Persistenz (best effort).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  loadChecklistState,
  saveChecklistState,
} from '@/lib/checklist-state'
import { CHECKLIST_ITEM_IDS } from '@/lib/checklist-content'

export async function toggleChecklistItem(
  itemId: string,
  done: boolean
): Promise<{ error: string | null }> {
  if (!CHECKLIST_ITEM_IDS.includes(itemId)) {
    return { error: 'Unbekannter Checklisten-Punkt.' }
  }
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const cur = await loadChecklistState(supabase, user.id)
  const set = new Set(cur.completedItems)
  if (done) set.add(itemId)
  else set.delete(itemId)

  const res = await saveChecklistState(supabase, user.id, {
    completedItems: Array.from(set),
    lastUpdated: new Date().toISOString(),
  })

  // Router-Cache der Checklisten-Seite invalidieren, damit die Haken auch
  // nach Weg-Navigation + Browser-Zurück frisch aus Supabase geladen werden
  // (sonst zeigt der veraltete RSC-Payload den Stand vor dem Abhaken).
  if (!res.error) {
    revalidatePath('/dashboard/checkliste')
  }

  return res
}
