# CopeCart-Anbindung — Einrichtung

Der Zugang zu Pin-Flow entsteht ausschließlich durch den Kauf über CopeCart.
Der Webhook unter `/api/webhooks/copecart` legt das Supabase-Konto an,
verschickt die Zugangsmail über Brevo und steuert Sperrungen.

## 1. Datenbank vorbereiten

`supabase/migrations/20260815_copecart_abo.sql` einmalig im **Supabase-SQL-Editor**
ausführen. Das legt drei Tabellen an:

| Tabelle | Zweck |
| --- | --- |
| `abo_status` | Zugangsstatus je Nutzer — wer darf ins Dashboard, und bis wann |
| `copecart_events` | Rohprotokoll aller eingehenden IPNs (Fehlersuche) |
| `zugang_tokens` | Zugangslinks der Willkommensmail, 72 Stunden gültig |

RLS ist auf allen dreien aktiv. Nutzer sehen ausschließlich ihre eigene Zeile in
`abo_status`; an `copecart_events` und `zugang_tokens` kommt nur der Webhook.

## 2. Umgebungsvariablen setzen

Lokal stehen sie als Platzhalter in `.env.local`. In **Vercel** unter
*Settings → Environment Variables* für Production **und** Preview eintragen:

| Variable | Wert |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `COPECART_IPN_SECRET` | das in CopeCart vergebene Kennwort (Schritt 3) |
| `BREVO_API_KEY` | Brevo → SMTP & API → **API Keys** (HTTP-API, nicht der SMTP-Key) |
| `BREVO_SENDER_EMAIL` | verifizierte Absenderadresse in Brevo |
| `BREVO_SENDER_NAME` | z. B. `Pin-Flow` |
| `NEXT_PUBLIC_SITE_URL` | `https://<deine-domain>` (ohne Slash am Ende) |
| `ZUGANG_LINK_GUELTIGKEIT_STUNDEN` | `72` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | optional, erscheint auf der Seite `/zugang` |

> `SUPABASE_SERVICE_ROLE_KEY` und die beiden Secrets **niemals** mit dem Präfix
> `NEXT_PUBLIC_` anlegen — damit landen sie im Browser-Bundle.

## 3. IPN-Integration in CopeCart anlegen

1. Produkt **Pin-Flow Cockpit** öffnen → *Schnittstellen* → *Zu den IPN-Integrationen*
2. Neue Integration, Typ **Generic**
3. Name z. B. `Pin-Flow Vercel Webhook`, Kennwort festlegen, *Integration zu
   Vertragserfüllung* auswählen
4. Benachrichtigungs-URL: `https://<deine-domain>/api/webhooks/copecart`
5. Dasselbe Kennwort als `COPECART_IPN_SECRET` in Vercel hinterlegen

Ob die URL erreichbar ist, lässt sich direkt im Browser prüfen: ein `GET` auf den
Endpunkt antwortet mit einem kurzen Hinweistext.

## 4. Was bei welchem Ereignis passiert

| `event_type` | Aktion |
| --- | --- |
| `payment.made` | Konto anlegen (falls neu) + Zugang freischalten + Zugangsmail. Bestandskonto wird nur reaktiviert, **ohne** neue Mail. |
| `payment.recurring.upcoming` | nur der Termin der nächsten Zahlung wird notiert |
| `payment.recurring.cancelled` | Zugang endet **zum Datum** aus `is_cancelled_for`, nicht sofort |
| `payment.failed` | **keine** Sperre — nur interner Vermerk plus Zähler (CopeCart bucht ohnehin mehrfach nach) |
| `payment.refunded` / `payment.charged_back` | Zugang sofort gesperrt |

Der Webhook antwortet bei Erfolg mit exakt `OK`. Alles andere löst CopeCarts
Wiederholung aus (bis zu 10 Versuche über 3 Stunden) — genau so gewollt:
Signaturfehler → `401`, unlesbares JSON → `400` (beides nicht wiederholbar
sinnvoll), Verarbeitungs- oder Konfigurationsfehler → `500`, damit CopeCart es
erneut zustellt und nichts verloren geht.

## 5. Wie der Zugang geprüft wird

Allein `abo_status.zugang_bis` entscheidet, `status` ist das lesbare Etikett:

> Zugang frei, wenn `zugang_bis IS NULL` **oder** `zugang_bis > now()`

Dadurch behält eine gekündigte Nutzerin ihren Zugang bis zum Kündigungsdatum,
während eine Rückerstattung sofort greift. Geprüft wird in `middleware.ts`, und
zwar nur auf `/dashboard`, damit nicht jeder Seitenaufruf eine Abfrage kostet.

**Bewusst fail-open:** Wer keine Zeile in `abo_status` hat, kommt rein — das
betrifft dein eigenes Konto, Tester und alle Bestandskonten. Auch bei einem
Datenbankfehler bleibt der Zugang offen; eine kurze Störung darf niemanden
aussperren, der bezahlt hat. Gesperrt wird nur bei einer Zeile mit abgelaufenem
`zugang_bis`. Gesperrte Nutzer landen auf `/zugang`.

## 6. Warum die Zugangsmail nicht über Supabase läuft

Supabase legt zusätzlich zum SMTP-Server ein eigenes Rate-Limit an (Standard
30 Mails/Stunde). Wird das übersehen, bleibt der Versand instabil, obwohl SMTP
korrekt konfiguriert ist. Der Webhook ruft deshalb direkt die
**Brevo-HTTP-API** auf — volle Kontrolle, echte Fehlermeldungen, unabhängig vom
internen Limit.

Supabase' eigener SMTP-Versand wird dann nur noch für **Passwort-Reset-Mails**
gebraucht. Dafür lohnt es sich weiterhin:

- Auth → Rate Limits: die 30 Mails/Stunde hochsetzen
- SMTP: Host `smtp-relay.brevo.com`, Port `587`, Benutzername die
  Brevo-Login-Mailadresse, Passwort der separat generierte **SMTP-Key**
  (nicht das Brevo-Kontopasswort)

## 7. Die 72 Stunden Linkgültigkeit

Supabase deckelt die Gültigkeit seiner E-Mail-Links bei 24 Stunden
(*Auth → Email OTP Expiry*, Obergrenze 86400 Sekunden). 72 Stunden sind darüber
also nicht erreichbar.

Deshalb trägt die Mail ein **eigenes Token** (`zugang_tokens`, Standard 72 h,
über `ZUGANG_LINK_GUELTIGKEIT_STUNDEN` änderbar). Erst beim Klick erzeugt
`/auth/zugang` den eigentlichen Supabase-Magic-Link und löst ihn Sekunden später
in `/auth/confirm` ein — dessen kurze Lebensdauer spielt damit keine Rolle mehr.

In der Datenbank liegt nur der SHA-256-Hash des Tokens. Innerhalb der 72 Stunden
ist der Link bewusst **mehrfach** einlösbar, weil Spam- und Sicherheitsfilter
mancher Mailanbieter Links vorab aufrufen und ein streng einmaliges Token
dadurch verbraucht wäre, bevor die Nutzerin überhaupt klickt. Sobald das
Passwort gesetzt ist, wird das Token entwertet.

## 8. Testbestellung

Voraussetzung: beim Produkt ist *Testbestellungen erlauben* aktiv und du bist im
eigenen CopeCart-Account eingeloggt.

Nach der Bestellung prüfen:

```sql
-- Kam der IPN an, und was ist passiert?
select empfangen_am, event_type, ergebnis, hinweis, fehler
from copecart_events order by empfangen_am desc limit 10;

-- Steht der Zugang?
select email, status, zugang_bis, letztes_event, letztes_event_am
from abo_status order by aktualisiert_am desc limit 10;
```

`hinweis` sagt dir im Klartext, was der Webhook getan hat — etwa
`Konto neu angelegt. Zugangsmail versendet, Link 72 h gültig (<message-id>)`.
Scheitert der Mailversand, steht das Konto trotzdem; der Hinweis beginnt dann
mit `ACHTUNG:` und nennt den Grund aus der Brevo-Antwort.

Zum Wiederholen: Testkonto in Supabase → Authentication → Users löschen (CASCADE
räumt `abo_status` und `zugang_tokens` mit ab), dann neu bestellen.
