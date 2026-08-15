import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Eigene Zugangstokens für die Willkommensmail.
//
// Hintergrund: Supabase begrenzt die Gültigkeit seiner E-Mail-Links auf
// maximal 24 Stunden (Auth → Email OTP Expiry, Obergrenze 86400 Sekunden).
// Für einen 72-Stunden-Link brauchen wir deshalb eine eigene Ablaufsteuerung.
// Der eigentliche Supabase-Link wird erst beim Klick erzeugt und unmittelbar
// danach eingelöst — dessen kurze Lebensdauer ist damit irrelevant.

export const STANDARD_GUELTIGKEIT_STUNDEN = 72

export function gueltigkeitStunden(): number {
  const roh = process.env.ZUGANG_LINK_GUELTIGKEIT_STUNDEN
  if (!roh) return STANDARD_GUELTIGKEIT_STUNDEN

  const wert = Number(roh)
  if (!Number.isFinite(wert) || wert <= 0) return STANDARD_GUELTIGKEIT_STUNDEN

  return wert
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Legt ein frisches Zugangstoken an und gibt den Klartext zurück — dieser
 * existiert danach nur noch in der versendeten Mail, in der Datenbank liegt
 * ausschließlich der Hash.
 */
export async function erstelleZugangsToken(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<{ token: string; ablaufAm: string; stunden: number }> {
  const token = crypto.randomBytes(32).toString('base64url')
  const stunden = gueltigkeitStunden()
  const ablaufAm = new Date(Date.now() + stunden * 60 * 60 * 1000).toISOString()

  // Ältere, noch offene Tokens dieses Kontos entwerten.
  await supabase
    .from('zugang_tokens')
    .update({ ungueltig_ab: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ungueltig_ab', null)

  const { error } = await supabase.from('zugang_tokens').insert({
    user_id: userId,
    email,
    token_hash: hashToken(token),
    ablauf_am: ablaufAm,
  })

  if (error) {
    throw new Error(`Zugangstoken konnte nicht angelegt werden: ${error.message}`)
  }

  return { token, ablaufAm, stunden }
}

/** Entwertet alle offenen Tokens eines Kontos (z. B. nachdem das Passwort steht). */
export async function entwerteZugangsTokens(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from('zugang_tokens')
    .update({ ungueltig_ab: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ungueltig_ab', null)
}

export interface TokenPruefung {
  gueltig: boolean
  userId?: string
  email?: string
  grund?: 'unbekannt' | 'abgelaufen' | 'entwertet'
}

/** Prüft ein Token aus der Mail und gibt bei Erfolg das zugehörige Konto zurück. */
export async function pruefeZugangsToken(
  supabase: SupabaseClient,
  token: string
): Promise<TokenPruefung> {
  const { data, error } = await supabase
    .from('zugang_tokens')
    .select('id, user_id, email, ablauf_am, ungueltig_ab, einloesungen')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (error || !data) return { gueltig: false, grund: 'unbekannt' }
  if (data.ungueltig_ab) return { gueltig: false, grund: 'entwertet' }
  if (new Date(data.ablauf_am).getTime() < Date.now()) {
    return { gueltig: false, grund: 'abgelaufen' }
  }

  // Innerhalb der Gültigkeit bewusst mehrfach einlösbar: Spam- und
  // Sicherheitsfilter mancher Mailanbieter rufen Links vorab auf. Ein
  // strikt einmaliges Token wäre dadurch verbraucht, bevor die Nutzerin
  // überhaupt klickt.
  const jetzt = new Date().toISOString()
  await supabase
    .from('zugang_tokens')
    .update({
      eingeloest_am: data.einloesungen === 0 ? jetzt : undefined,
      zuletzt_eingeloest_am: jetzt,
      einloesungen: (data.einloesungen ?? 0) + 1,
    })
    .eq('id', data.id)

  return { gueltig: true, userId: data.user_id as string, email: data.email as string }
}
