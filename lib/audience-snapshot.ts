// CRUD-Layer für Audience-Snapshots.
//
// Wird sowohl von Server Components (Lese-Pfade auf Dashboard / Analytics)
// als auch von Server Actions (CSV-Import in audience-actions.ts) genutzt.
// Authentifizierung erfolgt implizit über das Supabase-RLS — alle Queries
// laufen mit dem User-Token, sodass nur die eigenen Snapshots sichtbar sind.
//
// Persistenz-Layout:
//   `public.audience_snapshots`
//   – id              uuid (gen_random_uuid)
//   – user_id         uuid (auth.users)
//   – audience_date   date
//   – audience_type   text ('engaged' | 'total')
//   – audience_size   integer
//   – data            jsonb  ← AudienceSnapshotData (siehe audience-types.ts)
//   – imported_at     timestamptz
//   – UNIQUE (user_id, audience_date, audience_type)
//
// Die UNIQUE-Constraint sorgt dafür, dass ein wiederholter Import für den
// gleichen Stichtag den vorhandenen Snapshot überschreibt (UPSERT-Pfad),
// statt Doppel-Einträge zu erzeugen.

import { createClient } from './supabase-server'
import type {
  AudienceSnapshot,
  AudienceSnapshotData,
  AudienceType,
} from './audience-types'

// Roh-Zeile aus der Datenbank — entspricht 1:1 dem Tabellen-Schema.
type AudienceSnapshotRow = {
  id: string
  user_id: string
  audience_date: string
  audience_type: AudienceType
  audience_size: number
  data: AudienceSnapshotData
  imported_at: string
}

function mapRow(row: AudienceSnapshotRow): AudienceSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    audienceDate: row.audience_date,
    audienceType: row.audience_type,
    audienceSize: row.audience_size,
    importedAt: row.imported_at,
    data: row.data,
  }
}

// Listet alle Snapshots des angemeldeten Users, neueste zuerst.
// Liefert leeres Array, wenn nicht angemeldet oder noch keine Snapshots.
export async function getAudienceSnapshots(): Promise<AudienceSnapshot[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('audience_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('audience_date', { ascending: false })

  if (error || !data) return []
  return (data as AudienceSnapshotRow[]).map(mapRow)
}

// Convenience für UI-Pfade, die nur den jüngsten Snapshot brauchen
// (Dashboard-Widget, Heuristik-Default-View). Liefert null statt zu
// werfen, damit Aufrufer einen leeren-State zeigen können.
export async function getLatestAudienceSnapshot(): Promise<AudienceSnapshot | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('audience_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('audience_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as AudienceSnapshotRow)
}

// Für die „älterer Snapshot anzeigen"-Detailansicht im Analytics-Tab.
// Sicherheits-Check via RLS — bei fremder ID liefert die Query nichts.
export async function getAudienceSnapshotById(
  id: string
): Promise<AudienceSnapshot | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('audience_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as AudienceSnapshotRow)
}

// Speichert (oder überschreibt) einen Snapshot. UPSERT auf
// (user_id, audience_date, audience_type). Liefert den neuen/geänderten
// Snapshot oder einen Fehler-String — kein Throw, damit die Server Action
// das Result direkt an die UI weiterreichen kann.
export async function saveAudienceSnapshot(params: {
  audienceDate: string
  audienceType: AudienceType
  audienceSize: number
  data: AudienceSnapshotData
}): Promise<{ snapshot: AudienceSnapshot } | { error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { data, error } = await supabase
    .from('audience_snapshots')
    .upsert(
      {
        user_id: user.id,
        audience_date: params.audienceDate,
        audience_type: params.audienceType,
        audience_size: params.audienceSize,
        data: params.data,
      },
      { onConflict: 'user_id,audience_date,audience_type' }
    )
    .select('*')
    .single()

  if (error || !data) {
    return {
      error: error?.message ?? 'Speichern fehlgeschlagen.',
    }
  }
  return { snapshot: mapRow(data as AudienceSnapshotRow) }
}

// Prüf-Funktion für die UI-Vorwarnung „du hast für diesen Stichtag schon
// einen Snapshot — überschreiben?". Liefert true, wenn bereits ein
// Snapshot mit gleichem (audience_date, audience_type) existiert.
export async function audienceSnapshotExists(params: {
  audienceDate: string
  audienceType: AudienceType
}): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('audience_snapshots')
    .select('id')
    .eq('user_id', user.id)
    .eq('audience_date', params.audienceDate)
    .eq('audience_type', params.audienceType)
    .maybeSingle()

  if (error) return false
  return data !== null
}

// Löscht einen Snapshot (Backup / Korrektur-Pfad — kein UI-Eintrag in V3.0,
// aber als CLI/SQL-freie Operation für späteren Bedarf bereitgestellt).
export async function deleteAudienceSnapshot(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { error } = await supabase
    .from('audience_snapshots')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id)

  if (error) return { error: error.message }
  return { ok: true }
}
