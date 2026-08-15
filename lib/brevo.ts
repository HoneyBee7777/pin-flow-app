// Transaktionsmails direkt über die Brevo-HTTP-API — bewusst NICHT über den
// SMTP-Versand von Supabase.
//
// Grund: Supabase legt zusätzlich zum SMTP-Server ein eigenes Rate-Limit an
// (Standard 30 Mails/Stunde). Wird das übersehen, bleibt der Versand instabil,
// obwohl SMTP korrekt konfiguriert ist. Über die HTTP-API entfällt dieser
// Umweg komplett, und wir bekommen echte Fehlermeldungen zurück.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export interface BrevoMail {
  an: string
  anName?: string
  betreff: string
  html: string
  text: string
}

export interface BrevoErgebnis {
  ok: boolean
  messageId?: string
  fehler?: string
}

export async function sendeBrevoMail(mail: BrevoMail): Promise<BrevoErgebnis> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Pin-Flow'

  if (!apiKey) return { ok: false, fehler: 'BREVO_API_KEY ist nicht gesetzt.' }
  if (!senderEmail) {
    return { ok: false, fehler: 'BREVO_SENDER_EMAIL ist nicht gesetzt.' }
  }

  try {
    const antwort = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: mail.an, ...(mail.anName ? { name: mail.anName } : {}) }],
        subject: mail.betreff,
        htmlContent: mail.html,
        textContent: mail.text,
      }),
    })

    const rohtext = await antwort.text()

    if (!antwort.ok) {
      return {
        ok: false,
        fehler: `Brevo antwortete mit ${antwort.status}: ${rohtext.slice(0, 500)}`,
      }
    }

    let messageId: string | undefined
    try {
      messageId = JSON.parse(rohtext)?.messageId
    } catch {
      // Antwort ohne verwertbares JSON — Versand gilt trotzdem als erfolgreich.
    }

    return { ok: true, messageId }
  } catch (fehler) {
    return {
      ok: false,
      fehler: fehler instanceof Error ? fehler.message : String(fehler),
    }
  }
}

/** Zugangsmail für ein frisch angelegtes Konto. */
export function zugangsMail(params: {
  vorname: string
  link: string
  produktName: string
  gueltigkeitStunden: number
}): { betreff: string; html: string; text: string } {
  const anrede = params.vorname ? `Hallo ${escapeHtml(params.vorname)},` : 'Hallo,'
  const anredeText = params.vorname ? `Hallo ${params.vorname},` : 'Hallo,'
  const produkt = escapeHtml(params.produktName || 'Pin-Flow')
  const stunden = params.gueltigkeitStunden

  const betreff = 'Dein Zugang zu Pin-Flow'

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f7f5f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#2f3e46;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2f3e46;">
        Willkommen bei Pin-Flow
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${anrede}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        deine Bestellung für <strong>${produkt}</strong> ist eingegangen — dein Zugang steht bereit.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        Über den folgenden Link legst du dein Passwort fest und kommst direkt ins Cockpit:
      </p>
      <p style="margin:0 0 24px;">
        <a href="${params.link}"
           style="display:inline-block;background:#2f3e46;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
          Passwort festlegen
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
        Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:
      </p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
        <a href="${params.link}" style="color:#3f5c68;">${params.link}</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        Der Link ist ${stunden} Stunden gültig. Ist er abgelaufen, kannst du dir
        auf der Anmeldeseite jederzeit einen neuen schicken lassen.
      </p>
    </div>
  </body>
</html>`

  const text = `${anredeText}

deine Bestellung für ${params.produktName || 'Pin-Flow'} ist eingegangen — dein Zugang steht bereit.

Über diesen Link legst du dein Passwort fest und kommst direkt ins Cockpit:
${params.link}

Der Link ist ${stunden} Stunden gültig. Ist er abgelaufen, kannst du dir auf der
Anmeldeseite jederzeit einen neuen schicken lassen.`

  return { betreff, html, text }
}

function escapeHtml(wert: string): string {
  return wert
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
