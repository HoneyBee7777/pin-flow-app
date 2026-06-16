// V3.6 — Persistenz der Setup-Checkliste (analog zu lib/onboarding-state).
//
// Speicher-Ort: einstellungen.checklist_state (JSONB), pro user_id.
// EINMALIG im Supabase-SQL-Editor anzulegen:
//
//   ALTER TABLE einstellungen
//     ADD COLUMN IF NOT EXISTS checklist_state JSONB DEFAULT '{}'::jsonb;
//
// Fehlt die Spalte, liefert loadChecklistState defensiv den leeren
// Zustand — die Seite funktioniert, Häkchen werden nur nicht persistiert.

import type { createClient } from '@/lib/supabase-server'
import { CHECKLIST_ITEM_IDS } from '@/lib/checklist-content'

type SupabaseServer = ReturnType<typeof createClient>

export type ChecklistState = {
  completedItems: string[]
  lastUpdated: string // ISO, '' wenn nie gespeichert
}

export const DEFAULT_CHECKLIST_STATE: ChecklistState = {
  completedItems: [],
  lastUpdated: '',
}

// Nur bekannte, eindeutige IDs übernehmen — schützt vor verwaisten IDs
// nach Inhalts-Änderungen.
export function coerceChecklistState(raw: unknown): ChecklistState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHECKLIST_STATE }
  const r = raw as Record<string, unknown>
  const valid = new Set(CHECKLIST_ITEM_IDS)
  const completedItems = Array.isArray(r.completedItems)
    ? Array.from(
        new Set(
          r.completedItems.filter(
            (x): x is string => typeof x === 'string' && valid.has(x)
          )
        )
      )
    : []
  return {
    completedItems,
    lastUpdated: typeof r.lastUpdated === 'string' ? r.lastUpdated : '',
  }
}

export async function loadChecklistState(
  supabase: SupabaseServer,
  userId: string
): Promise<ChecklistState> {
  try {
    const { data, error } = await supabase
      .from('einstellungen')
      .select('checklist_state')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return { ...DEFAULT_CHECKLIST_STATE }
    return coerceChecklistState(
      (data as { checklist_state?: unknown }).checklist_state
    )
  } catch {
    return { ...DEFAULT_CHECKLIST_STATE }
  }
}

export async function saveChecklistState(
  supabase: SupabaseServer,
  userId: string,
  next: ChecklistState
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('einstellungen')
      .upsert(
        { user_id: userId, checklist_state: next },
        { onConflict: 'user_id' }
      )
    return { error: error ? error.message : null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unbekannter Fehler' }
  }
}
