'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  BUSINESS_MODELL_OPTIONS,
  HAUPTZIEL_OPTIONS,
  STRATEGIE_SELECT,
  type BusinessModell,
  type Hauptziel,
} from './lib'

const PERCENT_FIELDS = [
  'strategie_soll_blog',
  'strategie_soll_affiliate',
  'strategie_soll_produkt',
  'ziel_soll_traffic',
  'ziel_soll_lead',
  'ziel_soll_sales',
  'format_soll_standard',
  'format_soll_video',
  'format_soll_collage',
  'format_soll_carousel',
] as const

type PercentField = (typeof PERCENT_FIELDS)[number]
type PercentValues = Record<PercentField, number>

function readPercents(
  formData: FormData
): { values: PercentValues } | { error: string } {
  const out = {} as PercentValues
  for (const field of PERCENT_FIELDS) {
    const raw = String(formData.get(field) ?? '').trim()
    if (!raw) return { error: `Feld „${field}" fehlt.` }
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0 || n > 100)
      return { error: `Feld „${field}" muss 0–100 sein.` }
    out[field] = n
  }
  return { values: out }
}

function validateSums(p: PercentValues): string | null {
  const mix =
    p.strategie_soll_blog +
    p.strategie_soll_affiliate +
    p.strategie_soll_produkt
  if (mix !== 100)
    return `Strategie-Mix-Summe muss 100% ergeben (aktuell ${mix}%).`
  const ziele = p.ziel_soll_traffic + p.ziel_soll_lead + p.ziel_soll_sales
  if (ziele !== 100)
    return `Conversion-Ziele-Summe muss 100% ergeben (aktuell ${ziele}%).`
  const fmt =
    p.format_soll_standard +
    p.format_soll_video +
    p.format_soll_collage +
    p.format_soll_carousel
  if (fmt !== 100)
    return `Format-Mix-Summe muss 100% ergeben (aktuell ${fmt}%).`
  return null
}

function isBusinessModell(v: string): v is BusinessModell {
  return BUSINESS_MODELL_OPTIONS.some((o) => o.value === v)
}

function parseBusinessModelleField(raw: string): BusinessModell[] | null {
  const parts = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  for (const p of parts) {
    if (!isBusinessModell(p)) return null
  }
  return parts as BusinessModell[]
}

function isHauptziel(v: string): v is Hauptziel {
  return HAUPTZIEL_OPTIONS.some((o) => o.value === v)
}

// Snapshot des AKTUELL gespeicherten Zustands (vor einer Änderung).
async function snapshotCurrentBeforeChange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  grund: string
): Promise<void> {
  const { data } = await supabase
    .from('einstellungen')
    .select(STRATEGIE_SELECT)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return
  await supabase.from('strategie_snapshots').insert({
    user_id: userId,
    snapshot_grund: grund,
    strategie_soll_blog: data.strategie_soll_blog,
    strategie_soll_affiliate: data.strategie_soll_affiliate,
    strategie_soll_produkt: data.strategie_soll_produkt,
    ziel_soll_traffic: data.ziel_soll_traffic,
    ziel_soll_lead: data.ziel_soll_lead,
    ziel_soll_sales: data.ziel_soll_sales,
    format_soll_standard: data.format_soll_standard,
    format_soll_video: data.format_soll_video,
    format_soll_collage: data.format_soll_collage,
    format_soll_carousel: data.format_soll_carousel,
    business_modell: data.strategie_business_modell,
    hauptziel: data.strategie_hauptziel,
    vorhanden: data.strategie_vorhanden,
  })
}

// Snapshot des NEUEN Zustands (z.B. direkt nach Onboarding).
async function snapshotAfterChange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  grund: string,
  values: PercentValues,
  texts: {
    business_modell: string | null
    hauptziel: string | null
    vorhanden: string | null
  }
): Promise<void> {
  await supabase.from('strategie_snapshots').insert({
    user_id: userId,
    snapshot_grund: grund,
    ...values,
    business_modell: texts.business_modell,
    hauptziel: texts.hauptziel,
    vorhanden: texts.vorhanden,
  })
}

function revalidateStrategiePaths() {
  revalidatePath('/dashboard/strategie')
  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard')
}

// =====================================================
// 1) Onboarding abgeschlossen — vollständiges Speichern aus dem Wizard
// =====================================================
export async function saveStrategieOnboarding(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = readPercents(formData)
  if ('error' in parsed) return { error: parsed.error }
  const values = parsed.values
  const sumErr = validateSums(values)
  if (sumErr) return { error: sumErr }

  const modell = String(formData.get('strategie_business_modell') ?? '').trim()
  const hauptziel = String(formData.get('strategie_hauptziel') ?? '').trim()
  const vorhanden = String(formData.get('strategie_vorhanden') ?? '').trim()

  const modelle = parseBusinessModelleField(modell)
  if (!modelle)
    return { error: 'Bitte mindestens ein gültiges Business-Modell wählen.' }
  if (!hauptziel || !isHauptziel(hauptziel))
    return { error: 'Bitte ein gültiges Hauptziel wählen.' }

  const update = {
    user_id: user.id,
    ...values,
    strategie_business_modell: modelle.join(','),
    strategie_hauptziel: hauptziel,
    strategie_vorhanden: vorhanden || null,
    strategie_onboarding_abgeschlossen: true,
    strategie_letzte_aenderung: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('einstellungen')
    .upsert(update, { onConflict: 'user_id' })
  if (error) return { error: error.message }

  await snapshotAfterChange(
    supabase,
    user.id,
    'Onboarding abgeschlossen',
    values,
    {
      business_modell: modelle.join(','),
      hauptziel,
      vorhanden: vorhanden || null,
    }
  )

  revalidateStrategiePaths()
  return {}
}

// =====================================================
// 2) Manuelle Änderung — aus Einstellungen-Sektion
// =====================================================
function readDiffSchwellen(
  formData: FormData
):
  | {
      gelb: number | null
      rot: number | null
    }
  | { error: string } {
  const rawGelb = String(formData.get('strategie_check_schwelle_gelb') ?? '')
    .trim()
  const rawRot = String(formData.get('strategie_check_schwelle_rot') ?? '')
    .trim()
  // Beide leer → kein Update der Schwellwerte (nur Slider gespeichert).
  if (rawGelb === '' && rawRot === '') {
    return { gelb: null, rot: null }
  }
  if (rawGelb === '' || rawRot === '') {
    return { error: 'Bitte beide Diff-Schwellen ausfüllen.' }
  }
  const gelb = Number(rawGelb)
  const rot = Number(rawRot)
  if (!Number.isInteger(gelb) || gelb < 0 || gelb > 100) {
    return { error: 'Diff-Schwelle Gelb muss eine ganze Zahl zwischen 0 und 100 sein.' }
  }
  if (!Number.isInteger(rot) || rot < 0 || rot > 100) {
    return { error: 'Diff-Schwelle Rot muss eine ganze Zahl zwischen 0 und 100 sein.' }
  }
  if (rot <= gelb) {
    return { error: 'Diff-Schwelle Rot muss größer sein als Gelb.' }
  }
  return { gelb, rot }
}

export async function saveStrategieManual(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = readPercents(formData)
  if ('error' in parsed) return { error: parsed.error }
  const values = parsed.values
  const sumErr = validateSums(values)
  if (sumErr) return { error: sumErr }

  const schwellen = readDiffSchwellen(formData)
  if ('error' in schwellen) return { error: schwellen.error }

  const update: Record<string, unknown> = {
    user_id: user.id,
    ...values,
    strategie_letzte_aenderung: new Date().toISOString(),
  }
  if (schwellen.gelb !== null && schwellen.rot !== null) {
    update.strategie_check_schwelle_gelb = schwellen.gelb
    update.strategie_check_schwelle_rot = schwellen.rot
  }

  const { error } = await supabase
    .from('einstellungen')
    .upsert(update, { onConflict: 'user_id' })
  if (error) return { error: error.message }

  // Aktuelle Texte für Snapshot mitziehen.
  const { data: ctx } = await supabase
    .from('einstellungen')
    .select(
      'strategie_business_modell, strategie_hauptziel, strategie_vorhanden'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  await snapshotAfterChange(
    supabase,
    user.id,
    'Manuelle Änderung',
    values,
    {
      business_modell: ctx?.strategie_business_modell ?? null,
      hauptziel: ctx?.strategie_hauptziel ?? null,
      vorhanden: ctx?.strategie_vorhanden ?? null,
    }
  )

  revalidateStrategiePaths()
  return {}
}

// =====================================================
// 3) Onboarding wiederholen — alten Stand archivieren, Flag zurücksetzen
// =====================================================
export async function restartStrategieOnboarding(): Promise<{
  error?: string
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  // Aktuellen Stand erst archivieren.
  await snapshotCurrentBeforeChange(supabase, user.id, 'Onboarding wiederholt')

  const { error } = await supabase
    .from('einstellungen')
    .upsert(
      {
        user_id: user.id,
        strategie_onboarding_abgeschlossen: false,
      },
      { onConflict: 'user_id' }
    )
  if (error) return { error: error.message }

  revalidateStrategiePaths()
  return {}
}
