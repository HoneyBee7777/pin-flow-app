'use server'

// V3.6 — Server-Action zum Umschalten eines Checklisten-Punkts.
// Optimistic im Client, hier nur Persistenz (best effort).

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

  return saveChecklistState(supabase, user.id, {
    completedItems: Array.from(set),
    lastUpdated: new Date().toISOString(),
  })
}
