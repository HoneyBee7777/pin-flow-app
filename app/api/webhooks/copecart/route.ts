import { type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendeBrevoMail, zugangsMail } from '@/lib/brevo'
import { erstelleZugangsToken } from '@/lib/zugang-token'
import {
  COPECART_SIGNATURE_HEADER,
  anzeigeName,
  normalisiereEmail,
  parseZugangsEnde,
  verifyCopeCartSignature,
  type CopeCartIpnPayload,
} from '@/lib/copecart'

// Braucht node:crypto und den Service-Role-Key → Node-Runtime, kein Edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// CopeCart wertet AUSSCHLIESSLICH den exakten Body "OK" als Erfolg. Alles
// andere löst bis zu 10 Wiederholungen über 3 Stunden aus.
const OK = new Response('OK', {
  status: 200,
  headers: { 'content-type': 'text/plain; charset=utf-8' },
})

function fehler(status: number, nachricht: string) {
  return new Response(nachricht, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: NextRequest) {
  // 1. Rohen Body lesen — die Signatur gilt über exakt diese Bytes, deshalb
  //    darf hier NICHT request.json() verwendet werden.
  const rohBody = await request.text()

  // 2. Signatur prüfen, bevor irgendetwas verarbeitet wird.
  const secret = process.env.COPECART_IPN_SECRET
  if (!secret) {
    console.error('[copecart] COPECART_IPN_SECRET ist nicht gesetzt.')
    // 500 → CopeCart versucht es erneut, sobald die Variable gesetzt ist.
    return fehler(500, 'Serverkonfiguration unvollstaendig')
  }

  const signatur = request.headers.get(COPECART_SIGNATURE_HEADER)
  if (!verifyCopeCartSignature(rohBody, signatur, secret)) {
    console.warn('[copecart] Ungueltige Signatur — Request verworfen.')
    return fehler(401, 'Ungueltige Signatur')
  }

  // 3. Payload lesen
  let payload: CopeCartIpnPayload
  try {
    payload = JSON.parse(rohBody) as CopeCartIpnPayload
  } catch {
    // Kein wiederholbarer Fehler → 400, damit CopeCart nicht 10× nachlegt.
    return fehler(400, 'Body ist kein gueltiges JSON')
  }

  const eventType = String(payload.event_type ?? '')
  const email = normalisiereEmail(payload.buyer_email)

  // Fehlende Konfiguration darf nicht als unbehandelte Exception durchschlagen:
  // 500 ist richtig (CopeCart wiederholt die Zustellung), aber der Grund soll
  // klar im Log stehen.
  let supabase: SupabaseClient
  try {
    supabase = createAdminClient()
  } catch (e) {
    console.error('[copecart]', e instanceof Error ? e.message : e)
    return fehler(500, 'Serverkonfiguration unvollstaendig')
  }

  const logId = await protokolliereEingang(supabase, payload, eventType, email)

  try {
    const ergebnis = await verarbeite(supabase, eventType, payload, email)
    await protokolliereErgebnis(supabase, logId, ergebnis.ergebnis, ergebnis.hinweis)
    return OK
  } catch (e) {
    const nachricht = e instanceof Error ? e.message : String(e)
    console.error(`[copecart] Verarbeitung von "${eventType}" fehlgeschlagen:`, nachricht)
    await protokolliereErgebnis(supabase, logId, 'fehler', nachricht)
    // 500 → CopeCart wiederholt die Zustellung, nichts geht verloren.
    return fehler(500, 'Verarbeitung fehlgeschlagen')
  }
}

// Hilft beim Einrichten: zeigt im Browser, dass die URL erreichbar ist.
export async function GET() {
  return new Response(
    'CopeCart-IPN-Endpunkt aktiv. Erwartet POST mit gueltigem X-Copecart-Signature-Header.',
    { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }
  )
}

// ---------------------------------------------------------------------------
// Ereignisverarbeitung
// ---------------------------------------------------------------------------

interface Verarbeitungsergebnis {
  ergebnis: 'ok' | 'ignoriert'
  hinweis?: string
}

async function verarbeite(
  supabase: SupabaseClient,
  eventType: string,
  payload: CopeCartIpnPayload,
  email: string
): Promise<Verarbeitungsergebnis> {
  if (!email) {
    return { ergebnis: 'ignoriert', hinweis: 'Kein buyer_email im Payload.' }
  }

  switch (eventType) {
    case 'payment.made':
      return zugangFreischalten(supabase, payload, email)

    case 'payment.recurring.upcoming':
      // Rein informativ — nur den Termin der nächsten Zahlung nachziehen.
      return nurAktualisieren(supabase, payload, email, eventType, {
        naechste_zahlung_am: parseZugangsEnde(payload.next_payment_at),
      })

    case 'payment.recurring.cancelled':
      return kuendigungVormerken(supabase, payload, email)

    case 'payment.failed':
      return zahlungsproblemVermerken(supabase, payload, email)

    case 'payment.refunded':
    case 'payment.charged_back':
      return zugangSperren(supabase, payload, email, eventType)

    default:
      return {
        ergebnis: 'ignoriert',
        hinweis: `Unbekannter event_type "${eventType}" — keine Aktion.`,
      }
  }
}

/** payment.made → Konto anlegen (falls nötig) und Zugang freischalten. */
async function zugangFreischalten(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string
): Promise<Verarbeitungsergebnis> {
  const { userId, neuAngelegt } = await findeOderErstelleNutzer(supabase, payload, email)

  const { error } = await supabase.from('abo_status').upsert(
    {
      user_id: userId,
      email,
      ...herkunftsfelder(payload),
      status: 'aktiv',
      zugang_bis: null,
      gekuendigt_zum: null,
      naechste_zahlung_am: parseZugangsEnde(payload.next_payment_at),
      // Erfolgreiche Zahlung räumt frühere Fehlversuche ab.
      zahlung_fehlgeschlagen_am: null,
      zahlung_fehlversuche: 0,
      interner_hinweis: null,
      letztes_event: 'payment.made',
      letztes_event_am: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) throw new Error(`abo_status konnte nicht gesetzt werden: ${error.message}`)

  if (!neuAngelegt) {
    // Bestandskonto (Verlängerung, Folgerate oder erneuter Kauf): Zugang ist
    // wieder aktiv, aber es geht KEINE neue Zugangsmail raus — das Passwort
    // ist bereits gesetzt. Verhindert außerdem doppelte Mails bei
    // CopeCart-Wiederholungen desselben IPNs.
    return { ergebnis: 'ok', hinweis: 'Bestehendes Konto reaktiviert, keine Mail versendet.' }
  }

  const mailHinweis = await sendeZugangsmail(supabase, payload, email, userId)
  return { ergebnis: 'ok', hinweis: `Konto neu angelegt. ${mailHinweis}` }
}

/** payment.recurring.cancelled → Zugang zum Kündigungsdatum beenden. */
async function kuendigungVormerken(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string
): Promise<Verarbeitungsergebnis> {
  const userId = await findeNutzerId(supabase, email)
  if (!userId) {
    return { ergebnis: 'ignoriert', hinweis: `Kein Konto zu ${email} gefunden.` }
  }

  // Reihenfolge: das von CopeCart genannte Kündigungsdatum, sonst die nächste
  // Zahlung, sonst sofort. Der Zugang bleibt bis dahin bestehen.
  const zugangBis =
    parseZugangsEnde(payload.is_cancelled_for) ??
    parseZugangsEnde(payload.next_payment_at) ??
    new Date().toISOString()

  const gekuendigtZum = (payload.is_cancelled_for ?? '').toString().slice(0, 10) || null

  const { error } = await supabase
    .from('abo_status')
    .update({
      ...herkunftsfelder(payload),
      status: 'gekuendigt',
      zugang_bis: zugangBis,
      gekuendigt_zum: gekuendigtZum,
      interner_hinweis: [
        payload.subscription_state ? `Status: ${payload.subscription_state}` : null,
        payload.cancelation_reason ? `Grund: ${payload.cancelation_reason}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
      letztes_event: 'payment.recurring.cancelled',
      letztes_event_am: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(`Kündigung konnte nicht gespeichert werden: ${error.message}`)

  return { ergebnis: 'ok', hinweis: `Zugang endet am ${zugangBis}.` }
}

/**
 * payment.failed → NICHT sperren. CopeCart versucht die Abbuchung ohnehin
 * mehrfach automatisch; wir vermerken den Fehlschlag nur für den Kundenservice.
 */
async function zahlungsproblemVermerken(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string
): Promise<Verarbeitungsergebnis> {
  const userId = await findeNutzerId(supabase, email)
  if (!userId) {
    return { ergebnis: 'ignoriert', hinweis: `Kein Konto zu ${email} gefunden.` }
  }

  const { data: bestand } = await supabase
    .from('abo_status')
    .select('zahlung_fehlversuche')
    .eq('user_id', userId)
    .maybeSingle()

  const versuche = (bestand?.zahlung_fehlversuche ?? 0) + 1

  const { error } = await supabase
    .from('abo_status')
    .update({
      ...herkunftsfelder(payload),
      // status bleibt bewusst unverändert — kein Zugangsentzug.
      zahlung_fehlgeschlagen_am: new Date().toISOString(),
      zahlung_fehlversuche: versuche,
      interner_hinweis: `Zahlung fehlgeschlagen (${versuche}. Versuch)${
        payload.payment_status ? ` — payment_status: ${payload.payment_status}` : ''
      }`,
      letztes_event: 'payment.failed',
      letztes_event_am: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(`Zahlungsproblem konnte nicht vermerkt werden: ${error.message}`)

  return { ergebnis: 'ok', hinweis: `Vermerkt, Zugang bleibt aktiv (${versuche}. Fehlversuch).` }
}

/** payment.refunded / payment.charged_back → Zugang sofort sperren. */
async function zugangSperren(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string,
  eventType: string
): Promise<Verarbeitungsergebnis> {
  const userId = await findeNutzerId(supabase, email)
  if (!userId) {
    return { ergebnis: 'ignoriert', hinweis: `Kein Konto zu ${email} gefunden.` }
  }

  const jetzt = new Date().toISOString()

  const { error } = await supabase
    .from('abo_status')
    .update({
      ...herkunftsfelder(payload),
      status: 'gesperrt',
      zugang_bis: jetzt,
      interner_hinweis:
        eventType === 'payment.refunded'
          ? 'Zugang gesperrt: Rückerstattung'
          : 'Zugang gesperrt: Rückbuchung (Chargeback)',
      letztes_event: eventType,
      letztes_event_am: jetzt,
    })
    .eq('user_id', userId)

  if (error) throw new Error(`Sperrung fehlgeschlagen: ${error.message}`)

  return { ergebnis: 'ok', hinweis: 'Zugang sofort gesperrt.' }
}

/** Nur Stammdaten nachziehen, ohne den Zugangsstatus anzufassen. */
async function nurAktualisieren(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string,
  eventType: string,
  felder: Record<string, unknown>
): Promise<Verarbeitungsergebnis> {
  const userId = await findeNutzerId(supabase, email)
  if (!userId) {
    return { ergebnis: 'ignoriert', hinweis: `Kein Konto zu ${email} gefunden.` }
  }

  const { error } = await supabase
    .from('abo_status')
    .update({
      ...herkunftsfelder(payload),
      ...felder,
      letztes_event: eventType,
      letztes_event_am: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(`Aktualisierung fehlgeschlagen: ${error.message}`)

  return { ergebnis: 'ok', hinweis: 'Nur informativ, kein Zugangswechsel.' }
}

// ---------------------------------------------------------------------------
// Nutzerverwaltung
// ---------------------------------------------------------------------------

async function findeOderErstelleNutzer(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string
): Promise<{ userId: string; neuAngelegt: boolean }> {
  const bekannt = await findeNutzerId(supabase, email)
  if (bekannt) return { userId: bekannt, neuAngelegt: false }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    // Die Mailadresse ist durch den Kauf bei CopeCart bereits bestätigt.
    email_confirm: true,
    user_metadata: {
      vorname: payload.buyer_firstname ?? null,
      nachname: payload.buyer_lastname ?? null,
      copecart_buyer_id: payload.buyer_id ?? null,
      quelle: 'copecart',
    },
  })

  if (!error && data?.user) {
    return { userId: data.user.id, neuAngelegt: true }
  }

  // Konto existierte doch schon (Wettlauf mit einer Wiederholung oder ein
  // Konto ohne abo_status-Zeile) → per Auth-Liste nachschlagen.
  const vorhanden = await sucheInAuthNutzern(supabase, email)
  if (vorhanden) return { userId: vorhanden, neuAngelegt: false }

  throw new Error(
    `Konto für ${email} konnte weder angelegt noch gefunden werden: ${
      error?.message ?? 'unbekannter Fehler'
    }`
  )
}

/** Sucht die user_id — zuerst günstig über abo_status, dann über Auth. */
async function findeNutzerId(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data } = await supabase
    .from('abo_status')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()

  if (data?.user_id) return data.user_id as string

  return sucheInAuthNutzern(supabase, email)
}

/** Blättert durch auth.users. Nur als Rückfallebene gedacht. */
async function sucheInAuthNutzern(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const proSeite = 200
  const maxSeiten = 25 // deckt bis zu 5.000 Konten ab

  for (let seite = 1; seite <= maxSeiten; seite++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: seite,
      perPage: proSeite,
    })
    if (error) throw new Error(`Nutzerliste nicht lesbar: ${error.message}`)

    const treffer = data.users.find((u) => normalisiereEmail(u.email) === email)
    if (treffer) return treffer.id

    if (data.users.length < proSeite) break
  }

  return null
}

// ---------------------------------------------------------------------------
// Zugangsmail
// ---------------------------------------------------------------------------

async function sendeZugangsmail(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  email: string,
  userId: string
): Promise<string> {
  const basis = seitenBasisUrl()

  // Eigenes Token statt eines direkten Supabase-Links: nur so lässt sich die
  // Gültigkeit auf 72 Stunden setzen (Supabase deckelt bei 24). Der
  // Supabase-Magic-Link entsteht erst beim Klick in /auth/zugang.
  let token: string
  let stunden: number
  try {
    const erstellt = await erstelleZugangsToken(supabase, userId, email)
    token = erstellt.token
    stunden = erstellt.stunden
  } catch (e) {
    // Kein Grund, den ganzen Webhook scheitern zu lassen: das Konto steht,
    // die Nutzerin kann sich per "Passwort vergessen" selbst helfen.
    const grund = e instanceof Error ? e.message : String(e)
    console.error(`[copecart] Zugangslink für ${email} fehlgeschlagen: ${grund}`)
    return `ACHTUNG: Zugangslink fehlgeschlagen (${grund}) — Mail manuell nachholen.`
  }

  const link = `${basis}/auth/zugang?token=${encodeURIComponent(token)}`

  const inhalt = zugangsMail({
    vorname: (payload.buyer_firstname ?? '').trim(),
    link,
    produktName: payload.product_name ?? 'Pin-Flow',
    gueltigkeitStunden: stunden,
  })

  const versand = await sendeBrevoMail({
    an: email,
    anName: anzeigeName(payload),
    betreff: inhalt.betreff,
    html: inhalt.html,
    text: inhalt.text,
  })

  if (!versand.ok) {
    console.error(`[copecart] Brevo-Versand an ${email} fehlgeschlagen: ${versand.fehler}`)
    return `ACHTUNG: Mailversand fehlgeschlagen (${versand.fehler}) — Zugang besteht, Mail manuell nachholen.`
  }

  return `Zugangsmail versendet, Link ${stunden} h gültig${
    versand.messageId ? ` (${versand.messageId})` : ''
  }.`
}

function seitenBasisUrl(): string {
  const explizit = process.env.NEXT_PUBLIC_SITE_URL
  if (explizit) return explizit.replace(/\/+$/, '')

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}

// ---------------------------------------------------------------------------
// Protokoll
// ---------------------------------------------------------------------------

function herkunftsfelder(payload: CopeCartIpnPayload) {
  return {
    copecart_buyer_id: payload.buyer_id ?? null,
    copecart_order_id: payload.order_id ?? null,
    product_id: payload.product_id ?? null,
    product_name: payload.product_name ?? null,
    payment_plan: payload.payment_plan ?? null,
    frequency: payload.frequency ?? null,
  }
}

async function protokolliereEingang(
  supabase: SupabaseClient,
  payload: CopeCartIpnPayload,
  eventType: string,
  email: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('copecart_events')
      .insert({
        event_type: eventType || null,
        order_id: payload.order_id ?? null,
        buyer_email: email || null,
        payload,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[copecart] Protokollierung fehlgeschlagen:', error.message)
      return null
    }
    return data.id as number
  } catch (e) {
    console.error('[copecart] Protokollierung fehlgeschlagen:', e)
    return null
  }
}

async function protokolliereErgebnis(
  supabase: SupabaseClient,
  logId: number | null,
  ergebnis: string,
  hinweis?: string
): Promise<void> {
  if (logId === null) return
  try {
    await supabase
      .from('copecart_events')
      .update({
        ergebnis,
        hinweis: hinweis ?? null,
        fehler: ergebnis === 'fehler' ? hinweis ?? null : null,
      })
      .eq('id', logId)
  } catch (e) {
    console.error('[copecart] Ergebnis-Protokollierung fehlgeschlagen:', e)
  }
}
