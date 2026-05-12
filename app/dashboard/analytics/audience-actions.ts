'use server'

import { revalidatePath } from 'next/cache'
import { AudienceCsvError, parseAudienceCsv } from '@/lib/audience-parser'
import {
  audienceSnapshotExists,
  saveAudienceSnapshot,
} from '@/lib/audience-snapshot'
import type { AudienceSnapshot } from '@/lib/audience-types'

// Importiert eine Pinterest „Interagierende Zielgruppe"-CSV.
// Schritte:
//   1. File aus FormData lesen
//   2. Mit `parseAudienceCsv` strukturiert parsen (wirft AudienceCsvError)
//   3. Prüfen, ob bereits ein Snapshot mit (audience_date, audience_type)
//      existiert — UI zeigt dann „überschrieben"-Hinweis
//   4. Per `saveAudienceSnapshot` UPSERTen (Unique-Constraint sorgt für
//      atomare Ersetzung statt Duplikat)
//   5. revalidatePath aufrufen, damit Dashboard/Analytics den neuen
//      Snapshot beim nächsten Render sehen
export type ImportAudienceCsvResult =
  | { error: string }
  | {
      snapshot: AudienceSnapshot
      replaced: boolean
    }

export async function importAudienceCsv(
  formData: FormData
): Promise<ImportAudienceCsvResult> {
  const file = formData.get('csv_audience')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Bitte eine CSV-Datei auswählen.' }
  }
  // Pinterest-Exports sind ≪ 100 KB — wenn deutlich größer, vermutlich
  // falsche Datei.
  if (file.size > 2_000_000) {
    return {
      error: 'Datei ist ungewöhnlich groß. Stelle sicher, dass es die richtige Audience-CSV ist.',
    }
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { error: 'CSV konnte nicht gelesen werden.' }
  }

  let parsed
  try {
    parsed = parseAudienceCsv(text)
  } catch (e) {
    if (e instanceof AudienceCsvError) return { error: e.message }
    return { error: 'Unbekannter Parser-Fehler beim Verarbeiten der CSV.' }
  }

  const existed = await audienceSnapshotExists({
    audienceDate: parsed.audienceDate,
    audienceType: parsed.audienceType,
  })

  const saveResult = await saveAudienceSnapshot({
    audienceDate: parsed.audienceDate,
    audienceType: parsed.audienceType,
    audienceSize: parsed.audienceSize,
    data: parsed.data,
  })

  if ('error' in saveResult) return { error: saveResult.error }

  // Dashboard-Widget und der neue Audience-Tab lesen Snapshots beim Render —
  // ohne revalidatePath wäre der Snapshot dort erst nach manuellem Reload sichtbar.
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/analytics')

  return {
    snapshot: saveResult.snapshot,
    replaced: existed,
  }
}
