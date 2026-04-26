'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  CONVERSION_ZIELE,
  HOOK_ARTEN,
  PIN_FORMATE,
  STATUS,
  STRATEGIE_TYPEN,
  type ConversionZiel,
  type HookArt,
  type PinFormat,
  type Status,
  type StrategieTyp,
} from './utils'

function isStatus(value: string): value is Status {
  return (STATUS as readonly string[]).includes(value)
}
function isStrategie(value: string): value is StrategieTyp {
  return (STRATEGIE_TYPEN as readonly string[]).includes(value)
}
function isConversion(value: string): value is ConversionZiel {
  return (CONVERSION_ZIELE as readonly string[]).includes(value)
}
function isHookArt(value: string): value is HookArt {
  return (HOOK_ARTEN as readonly string[]).includes(value)
}
function isPinFormat(value: string): value is PinFormat {
  return (PIN_FORMATE as readonly string[]).includes(value)
}

type Input = {
  content_id: string
  canva_vorlage_id: string | null
  ziel_url_id: string | null
  ziel_url_direct: string | null
  board_id: string | null
  saison_event_id: string | null
  titel: string | null
  hook: string | null
  beschreibung: string | null
  call_to_action: string | null
  strategie_typ: StrategieTyp | null
  conversion_ziel: ConversionZiel | null
  hook_art: HookArt | null
  pin_format: PinFormat | null
  status: Status
  geplante_veroeffentlichung: string | null
  keyword_ids: string[]
}

function readIds(formData: FormData, name: string): string[] {
  return Array.from(
    new Set(
      formData
        .getAll(name)
        .map((v) => String(v))
        .filter(Boolean)
    )
  )
}

function nullable(formData: FormData, name: string): string | null {
  const v = String(formData.get(name) ?? '').trim()
  return v || null
}

function parseInput(
  formData: FormData
): { input: Input } | { error: string } {
  const content_id = String(formData.get('content_id') ?? '').trim()
  if (!content_id) return { error: 'Bitte einen Content-Inhalt wählen.' }

  const statusRaw = String(formData.get('status') ?? '')
  if (!isStatus(statusRaw))
    return { error: 'Bitte einen gültigen Status wählen.' }

  const strategieRaw = String(formData.get('strategie_typ') ?? '').trim()
  if (strategieRaw && !isStrategie(strategieRaw))
    return { error: 'Ungültiger Strategie-Typ.' }
  const conversionRaw = String(formData.get('conversion_ziel') ?? '').trim()
  if (conversionRaw && !isConversion(conversionRaw))
    return { error: 'Ungültiges Conversion-Ziel.' }
  const hookArtRaw = String(formData.get('hook_art') ?? '').trim()
  if (hookArtRaw && !isHookArt(hookArtRaw))
    return { error: 'Ungültige Hook-Art.' }
  const pinFormatRaw = String(formData.get('pin_format') ?? '').trim()
  if (pinFormatRaw && !isPinFormat(pinFormatRaw))
    return { error: 'Ungültiges Pin-Format.' }

  const titel = nullable(formData, 'titel')
  if (titel && titel.length > 100)
    return { error: 'Titel darf maximal 100 Zeichen haben.' }

  const beschreibung = nullable(formData, 'beschreibung')
  if (beschreibung && beschreibung.length > 500)
    return { error: 'Beschreibung darf maximal 500 Zeichen haben.' }

  const hook = nullable(formData, 'hook')
  if (hook) {
    const wordCount = hook.trim().split(/\s+/).filter(Boolean).length
    if (wordCount > 10)
      return { error: 'Hook darf maximal 10 Wörter haben.' }
  }

  const datumRaw = nullable(formData, 'geplante_veroeffentlichung')
  if (datumRaw && !/^\d{4}-\d{2}-\d{2}$/.test(datumRaw))
    return { error: 'Ungültiges Datumsformat für Veröffentlichung.' }

  const zielUrlDirectRaw = nullable(formData, 'ziel_url_direct')
  if (zielUrlDirectRaw && !/^https?:\/\/\S+/i.test(zielUrlDirectRaw))
    return {
      error: 'Ziel-URL muss mit http:// oder https:// beginnen.',
    }

  return {
    input: {
      content_id,
      canva_vorlage_id: nullable(formData, 'canva_vorlage_id'),
      ziel_url_id: nullable(formData, 'ziel_url_id'),
      ziel_url_direct: zielUrlDirectRaw,
      board_id: nullable(formData, 'board_id'),
      saison_event_id: nullable(formData, 'saison_event_id'),
      titel,
      hook,
      beschreibung,
      call_to_action: nullable(formData, 'call_to_action'),
      strategie_typ: strategieRaw ? (strategieRaw as StrategieTyp) : null,
      conversion_ziel: conversionRaw ? (conversionRaw as ConversionZiel) : null,
      hook_art: hookArtRaw ? (hookArtRaw as HookArt) : null,
      pin_format: pinFormatRaw ? (pinFormatRaw as PinFormat) : null,
      status: statusRaw,
      geplante_veroeffentlichung: datumRaw,
      keyword_ids: readIds(formData, 'keyword_ids'),
    },
  }
}

async function resolveZielUrlId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  zielUrlId: string | null,
  zielUrlDirect: string | null
): Promise<{ id: string | null } | { error: string }> {
  if (!zielUrlDirect) return { id: zielUrlId }

  const url = zielUrlDirect.trim()

  const { data: existing, error: lookupError } = await supabase
    .from('ziel_urls')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle()
  if (lookupError) return { error: lookupError.message }
  if (existing) return { id: existing.id }

  const { data: created, error: insertError } = await supabase
    .from('ziel_urls')
    .insert({
      user_id: userId,
      url,
      titel: url,
      typ: 'blogpost',
      prioritaet: 'mittel',
    })
    .select('id')
    .single()
  if (insertError || !created)
    return {
      error: insertError?.message ?? 'Ziel-URL konnte nicht angelegt werden.',
    }
  return { id: created.id }
}

async function syncKeywords(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pinId: string,
  keywordIds: string[]
): Promise<string | null> {
  const del = await supabase.from('pin_keywords').delete().eq('pin_id', pinId)
  if (del.error) return del.error.message

  if (keywordIds.length === 0) return null
  const rows = keywordIds.map((kid) => ({
    pin_id: pinId,
    keyword_id: kid,
    user_id: userId,
  }))
  const ins = await supabase.from('pin_keywords').insert(rows)
  return ins.error?.message ?? null
}

export async function addPin(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const parsed = parseInput(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { keyword_ids, ziel_url_direct, ...rest } = parsed.input

  const resolved = await resolveZielUrlId(
    supabase,
    user.id,
    rest.ziel_url_id,
    ziel_url_direct
  )
  if ('error' in resolved) return { error: resolved.error }

  const pinFields = { ...rest, ziel_url_id: resolved.id }

  const { data: inserted, error } = await supabase
    .from('pins')
    .insert({ user_id: user.id, ...pinFields })
    .select('id')
    .single()
  if (error || !inserted)
    return { error: error?.message ?? 'Konnte nicht speichern.' }

  if (keyword_ids.length > 0) {
    const err = await syncKeywords(supabase, user.id, inserted.id, keyword_ids)
    if (err)
      return {
        error: `Pin gespeichert, aber Keyword-Verknüpfungen fehlgeschlagen: ${err}`,
      }
  }

  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard/canva-vorlagen')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}

export async function updatePin(
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

  const { keyword_ids, ziel_url_direct, ...rest } = parsed.input

  const resolved = await resolveZielUrlId(
    supabase,
    user.id,
    rest.ziel_url_id,
    ziel_url_direct
  )
  if ('error' in resolved) return { error: resolved.error }

  const pinFields = { ...rest, ziel_url_id: resolved.id }

  const { error } = await supabase.from('pins').update(pinFields).eq('id', id)
  if (error) return { error: error.message }

  const err = await syncKeywords(supabase, user.id, id, keyword_ids)
  if (err)
    return {
      error: `Pin aktualisiert, aber Keywords konnten nicht synchronisiert werden: ${err}`,
    }

  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard/canva-vorlagen')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return {}
}

export async function deletePin(formData: FormData): Promise<void> {
  const supabase = createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('pins').delete().eq('id', id)
  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard/canva-vorlagen')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
}

export type ImportPinRow = {
  titel: string | null
  hook: string | null
  beschreibung: string | null
  call_to_action: string | null
  pin_format: PinFormat | null
  status: Status
  geplante_veroeffentlichung: string | null
}

export async function importPins(args: {
  contentId: string
  rows: ImportPinRow[]
}): Promise<{ error?: string; imported?: number }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  if (!args.contentId)
    return { error: 'Bitte einen Content-Inhalt für den Import wählen.' }
  if (!args.rows || args.rows.length === 0)
    return { error: 'Keine Zeilen zu importieren.' }

  for (let i = 0; i < args.rows.length; i++) {
    const r = args.rows[i]
    const lineNo = i + 2
    if (r.titel && r.titel.length > 100)
      return { error: `Zeile ${lineNo}: Titel darf max. 100 Zeichen haben.` }
    if (r.beschreibung && r.beschreibung.length > 500)
      return {
        error: `Zeile ${lineNo}: Beschreibung darf max. 500 Zeichen haben.`,
      }
    if (r.hook) {
      const wc = r.hook.trim().split(/\s+/).filter(Boolean).length
      if (wc > 10)
        return { error: `Zeile ${lineNo}: Hook darf max. 10 Wörter haben.` }
    }
    if (!isStatus(r.status))
      return { error: `Zeile ${lineNo}: Status "${r.status}" ungültig.` }
    if (r.pin_format && !isPinFormat(r.pin_format))
      return {
        error: `Zeile ${lineNo}: Pin-Format "${r.pin_format}" ungültig.`,
      }
    if (
      r.geplante_veroeffentlichung &&
      !/^\d{4}-\d{2}-\d{2}$/.test(r.geplante_veroeffentlichung)
    )
      return {
        error: `Zeile ${lineNo}: Datum muss im Format YYYY-MM-DD sein.`,
      }
  }

  const inserts = args.rows.map((r) => ({
    user_id: user.id,
    content_id: args.contentId,
    titel: r.titel,
    hook: r.hook,
    beschreibung: r.beschreibung,
    call_to_action: r.call_to_action,
    pin_format: r.pin_format,
    status: r.status,
    geplante_veroeffentlichung: r.geplante_veroeffentlichung,
  }))

  const { error } = await supabase.from('pins').insert(inserts)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/pin-produktion')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard')
  return { imported: inserts.length }
}
