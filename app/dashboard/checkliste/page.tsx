// V3.6 — Setup-Checkliste (Server). Lädt den persistierten Zustand und
// übergibt die abgehakten IDs an den Client. Defensive Lesung: fehlende
// Spalte → leerer Zustand (Seite bleibt nutzbar).

import { createClient } from '@/lib/supabase-server'
import { loadChecklistState } from '@/lib/checklist-state'
import ChecklistClient from './ChecklistClient'

export default async function ChecklistePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const state = await loadChecklistState(supabase, user.id)

  return <ChecklistClient initialCompleted={state.completedItems} />
}
