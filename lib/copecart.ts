import crypto from 'node:crypto'

// CopeCart Instant Payment Notification (IPN), Spezifikation v1.6.7
// https://s3.eu-central-1.amazonaws.com/shared.copecart.com/IPN_CopeCart_v_1.6.7_.pdf

export const COPECART_SIGNATURE_HEADER = 'x-copecart-signature'

export type CopeCartEventType =
  | 'payment.made'
  | 'payment.recurring.upcoming'
  | 'payment.recurring.cancelled'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.charged_back'

export interface CopeCartIpnPayload {
  event_type: string

  // immer enthalten
  order_id?: string
  product_id?: string
  product_name?: string
  buyer_id?: string
  buyer_email?: string
  buyer_firstname?: string
  buyer_lastname?: string
  payment_plan?: string // hier relevant: 'abonnement'
  payment_status?: string
  is_cancelled_for?: string | null

  // nur bei wiederkehrenden Zahlungen
  frequency?: string // 'half_yearly' | 'yearly'
  next_payment_at?: string | null
  next_payments?: unknown
  rate_number?: number | string

  // nur bei payment.recurring.cancelled
  subscription_state?: string
  cancelation_reason?: string

  [key: string]: unknown
}

/**
 * Prüft die IPN-Signatur: HMAC-SHA256 über den ROHEN Request-Body mit dem in
 * CopeCart hinterlegten Kennwort (Shared Secret), Ergebnis Base64-codiert.
 *
 * Zusätzlich wird die Hex-Variante desselben HMAC akzeptiert. Das schwächt die
 * Prüfung nicht ab (beide Formen stammen aus demselben Digest — ohne das Secret
 * lässt sich keine davon erzeugen), macht die Integration aber unempfindlich
 * gegen eine abweichende Kodierung auf CopeCart-Seite.
 *
 * Der Vergleich läuft über Hashes fester Länge und damit zeitkonstant.
 */
export function verifyCopeCartSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest()

  const received = signatureHeader.trim()

  return (
    safeEqual(received, digest.toString('base64')) ||
    safeEqual(received, digest.toString('hex'))
  )
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest()
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest()
  return crypto.timingSafeEqual(ha, hb)
}

/**
 * Wandelt `is_cancelled_for` (bzw. `next_payment_at`) in einen Zeitpunkt um.
 * Reine Datumsangaben (YYYY-MM-DD) werden auf das Ende des Tages gelegt, damit
 * der Zugang nie einen Tag zu früh endet.
 */
export function parseZugangsEnde(
  wert: string | null | undefined
): string | null {
  if (!wert) return null

  const roh = String(wert).trim()
  if (!roh) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(roh)) {
    const datum = new Date(`${roh}T23:59:59.999Z`)
    return Number.isNaN(datum.getTime()) ? null : datum.toISOString()
  }

  const datum = new Date(roh)
  return Number.isNaN(datum.getTime()) ? null : datum.toISOString()
}

/** Normalisiert eine E-Mail für den Abgleich mit Supabase. */
export function normalisiereEmail(wert: string | null | undefined): string {
  return (wert ?? '').trim().toLowerCase()
}

/** Baut den Anzeigenamen aus Vor- und Nachname, mit E-Mail als Rückfallebene. */
export function anzeigeName(payload: CopeCartIpnPayload): string {
  const name = [payload.buyer_firstname, payload.buyer_lastname]
    .map((teil) => (teil ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return name || normalisiereEmail(payload.buyer_email)
}
