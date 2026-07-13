// Onboarding → Checkliste „mitlaufen" lassen (Weg 2).
//
// Wird beim ERSTMALIGEN Abschließen eines Onboarding-Schritts aufgerufen
// (siehe app/dashboard/onboarding/actions.ts → goToOnboardingStep). Ist dem
// Schritt ein Checklisten-Punkt zugeordnet UND ist dessen Daten-Bedingung
// (Schwelle) erfüllt, wird der Punkt automatisch in checklist_state ergänzt.
//
// Design-Entscheidungen:
//  - Automatisch markiert, aber manuell überschreibbar: Weil nur beim ersten
//    Abschließen eines Schritts (Aufrufer prüft completedSteps) gehakt wird,
//    bleibt ein späteres manuelles Abwählen bestehen — ein erneutes „Weiter"
//    setzt den Haken nicht wieder.
//  - Schwellen bleiben ehrlich: Die Bedingung wird im Moment des „Weiter"
//    gegen die echten Daten geprüft. „Weiter/Überspringen ohne die Aufgabe
//    gemacht zu haben" hakt daher nichts ab.

import type { createClient } from '@/lib/supabase-server'
import { loadChecklistState, saveChecklistState } from '@/lib/checklist-state'

type SupabaseServer = ReturnType<typeof createClient>

// RLS-scoped Zeilenzahl einer Tabelle (nur eigene Zeilen des Nutzers).
async function rowCount(
  supabase: SupabaseServer,
  table: string
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  return count ?? 0
}

// Einzelnes einstellungen-Feld des Nutzers lesen.
async function einstellung(
  supabase: SupabaseServer,
  userId: string,
  column: string
): Promise<unknown> {
  const { data } = await supabase
    .from('einstellungen')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle()
  return data
    ? (data as unknown as Record<string, unknown>)[column] ?? null
    : null
}

type StepRule = {
  itemId: string
  erfuellt: (supabase: SupabaseServer, userId: string) => Promise<boolean>
}

// Zuordnung Onboarding-Schritt → Checklisten-Punkt + Bedingung.
// Nur Punkte, die sich ehrlich aus App-Daten ableiten lassen. Pinterest-
// seitige/Qualitäts-Punkte (Business-Account, Domain, Cover, Alt-Text …)
// sowie „Zielgruppe definiert" (kein Datensignal am passenden Schritt)
// bleiben bewusst rein manuell.
const STEP_RULES: Record<number, StepRule> = {
  // Schritt 4 — Profil-Formular: Profilname im App-Profil gesetzt.
  4: {
    itemId: 'profile-name',
    erfuellt: async (s, u) => {
      const v = await einstellung(s, u, 'profil_name')
      return typeof v === 'string' && v.trim().length > 0
    },
  },
  // Schritt 5 — Inhalte: mindestens ein Inhalt angelegt.
  5: {
    itemId: 'content-min-5',
    erfuellt: async (s) => (await rowCount(s, 'content_inhalte')) >= 1,
  },
  // Schritt 7 — Keywords: Datenbank „gefüllt" (Schwelle 20).
  7: {
    itemId: 'keywords-min-20',
    erfuellt: async (s) => (await rowCount(s, 'keywords')) >= 20,
  },
  // Schritt 8 — Boards: mindestens ein Board angelegt.
  8: {
    itemId: 'boards-all',
    erfuellt: async (s) => (await rowCount(s, 'boards')) >= 1,
  },
  // Schritt 9 — Saisonkalender: mindestens ein Saison-Event gepflegt.
  9: {
    itemId: 'seasonal-calendar',
    erfuellt: async (s) => (await rowCount(s, 'saison_events')) >= 1,
  },
  // Schritt 10 — Strategie: Wizard abgeschlossen.
  10: {
    itemId: 'strategy-onboarding',
    erfuellt: async (s, u) =>
      (await einstellung(s, u, 'strategie_onboarding_abgeschlossen')) === true,
  },
  // Schritt 11 — Marken-Design: mindestens 3 Canva-Basis-Vorlagen.
  11: {
    itemId: 'canva-templates',
    erfuellt: async (s) => (await rowCount(s, 'canva_vorlagen')) >= 3,
  },
  // Schritt 12 — Pins: mindestens ein Pin vorhanden.
  12: {
    itemId: 'first-pin-seo',
    erfuellt: async (s) => (await rowCount(s, 'pins')) >= 1,
  },
  // Schritt 13 — Analytics: mindestens ein Profil-Analytics-Import.
  13: {
    itemId: 'first-analytics',
    erfuellt: async (s) => (await rowCount(s, 'profil_analytics')) >= 1,
  },
}

// Beim erstmaligen Abschließen von `completedStep` den zugeordneten
// Checklisten-Punkt setzen, falls die Bedingung erfüllt und der Punkt noch
// nicht erledigt ist. Best effort — wirft nie (Aufrufer fängt zusätzlich).
export async function syncChecklistForCompletedStep(
  supabase: SupabaseServer,
  userId: string,
  completedStep: number
): Promise<void> {
  const rule = STEP_RULES[completedStep]
  if (!rule) return

  const ok = await rule.erfuellt(supabase, userId)
  if (!ok) return

  const cur = await loadChecklistState(supabase, userId)
  if (cur.completedItems.includes(rule.itemId)) return

  await saveChecklistState(supabase, userId, {
    completedItems: [...cur.completedItems, rule.itemId],
    lastUpdated: new Date().toISOString(),
  })
}
