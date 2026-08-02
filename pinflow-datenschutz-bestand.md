# Pin-Flow — Datenschutzrechtliche Bestandsaufnahme

**Projekt:** Pin-Flow (Next.js 14.2.35, Supabase Auth + Postgres, Hosting Vercel)
**Auftragsart:** Reine Prüfung, keine Änderung. Nur belegte Fakten.
**Grundlage:** Quellcode im Repository `pin-flow-app`, Stand der Dateien wie im Arbeitsverzeichnis.
**Erstellt am:** 2026-07-31
**Wichtiger Vorbehalt:** Es wurde **ausschließlich der Quellcode gelesen**. Auf das Supabase-Dashboard, das Vercel-Dashboard und die dortigen Konsolen-Einstellungen bestand **kein Zugriff**. Alle Angaben, die nur dort belegbar sind (Region, SMTP, RLS-Status, Fremdschlüssel-Löschregeln, Backup-Tarif, AVV-Datum), sind als **„nicht ermittelbar aus dem Repository"** gekennzeichnet und müssen von einer Person mit Dashboard-Zugang abgelesen werden. Nichts davon wurde geraten.

**Legende der Belegstellen:** `datei:zeile` = Fundstelle im Code · „Dashboard" = nur in der Anbieter-Konsole prüfbar · „nicht ermittelbar" = im Repository nicht belegbar.

---

## Frage 1 — Serverregion und Datenstandort

- **Supabase-Projekt-Referenz:** `lipwgxriybqnrljqnfwt` — Projekt-URL `https://lipwgxriybqnrljqnfwt.supabase.co`. Beleg: `.env.local:1` (`NEXT_PUBLIC_SUPABASE_URL`).
- **Supabase-Region (Region-Code + Standort):** **nicht ermittelbar aus dem Repository.** Die Projekt-Referenz in der URL ist ein anonymer Bezeichner und enthält keine Regionsangabe. Die Region ist **nur** im Supabase-Dashboard unter *Project Settings → General* (bzw. *Infrastructure*) ablesbar. **→ Kritischster offener Punkt dieser Prüfung; muss vor Livegang abgelesen werden.**
- **Liegt die Region außerhalb EU/EWR?** **Nicht ermittelbar aus dem Repository** — hängt allein von der oben genannten Dashboard-Angabe ab. Solange nicht belegt, ist ein Drittlandtransfer **nicht ausgeschlossen**. (Ist die Region `eu-central-1` Frankfurt o. Ä., liegt sie im EWR; ist sie z. B. `us-east-1`, liegt sie außerhalb. Beides bislang unbelegt.)
- **Vercel-Region / Serverless- und Edge-Funktionen:** Es existiert **keine `vercel.json`** im Repository (Prüfung: kein Treffer im Projektverzeichnis). Es gibt **keine Regionsangabe im Code** — kein `regions`, kein `preferredRegion` (Grep ohne Treffer). Es gibt **keine Edge-Runtime-Deklaration** — kein `export const runtime = 'edge'` (Grep ohne Treffer). Damit laufen alle Server-Komponenten und Server Actions als **Standard-Serverless-Funktionen in der im Vercel-Dashboard eingestellten Default-Region**. Welche Region das konkret ist: **nicht ermittelbar aus dem Repository**, nur im Vercel-Dashboard unter *Project Settings → Functions* ablesbar. **→ Zweiter offener EU/EWR-Punkt.**
- **Supabase Storage genutzt?** **Nein, keine Nutzung im Code belegt.** Kein einziger Aufruf von `.storage`/`storage.from` (Grep ohne Treffer). Datei-Uploads laufen ausschließlich als CSV-Verarbeitung im Browser bzw. Server Action (siehe Frage „Zusätzlich"), es werden keine Dateien in einem Supabase-Storage-Bucket abgelegt.

---

## Frage 2 — Anmeldeverfahren

- **Tatsächlich verwendete Auth-Methoden (vollständig):**
  - `signInWithPassword` — E-Mail + Passwort-Login. Beleg: `app/login/actions.ts:13`.
  - `signUp` — Registrierung mit E-Mail + Passwort (nur wenn Self-Signup aktiv, s. u.). Beleg: `app/register/actions.ts:23`.
  - `verifyOtp` — Verarbeitung von Einladungs- und Magic-Links (Token-Hash aus der E-Mail). Beleg: `app/auth/confirm/route.ts:24`.
  - `updateUser({ password })` — Passwort setzen/ändern. Beleg: `app/auth/set-password/actions.ts:38` und `app/dashboard/profil/actions.ts:33`.
  - `signOut` — Abmelden. Beleg: `app/actions/auth.ts:9`.
  - `getUser` — reine Sitzungsprüfung, kein Anmeldeverfahren (zahlreiche Stellen, u. a. `middleware.ts:30`).
- **OAuth / Single Sign-on:** **Nicht verwendet.** Kein Aufruf von `signInWithOAuth` (Grep ohne Treffer). **Keine Drittanbieter** (Google, GitHub o. a.) als Login-Provider im Code. → In der Datenschutzerklärung ist **keine SSO-Angabe** nötig; über den Code wird **kein OAuth-Drittanbieter zum Empfänger**. Ob im Supabase-Dashboard dennoch Provider aktiviert wurden, ist dort unter *Authentication → Providers* zu bestätigen (im Code nicht genutzt).
- **Magic-Link-Login (`signInWithOtp`):** **Nicht verwendet** (Grep ohne Treffer). Der `verifyOtp`-Pfad dient nur der Einladungs-/Bestätigungs-Verarbeitung, nicht einem aktiven Magic-Link-Login.
- **Passwort-Zurücksetzen (`resetPasswordForEmail`):** **Im Code nicht implementiert** (Grep ohne Treffer). Ein Self-Service-„Passwort vergessen"-Flow existiert in der App nicht.
- **Zwei-Faktor / MFA:** **Im Code nicht aktiviert und nicht genutzt.** Kein Aufruf von `mfa`/`enroll` (Grep ohne Treffer). Ob im Supabase-Dashboard MFA grundsätzlich freigeschaltet ist: nicht ermittelbar aus dem Repository — aber die App fordert/nutzt MFA nirgends an.
- **Registrierung offen oder eingeschränkt?** **Eingeschränkt.** Self-Registrierung ist per Umgebungsvariable deaktiviert: `NEXT_PUBLIC_ALLOW_SIGNUP=false`. Beleg: `.env.local:5`. Der Block wirkt sowohl serverseitig (`app/register/actions.ts:11`, blockt auch POST ohne sichtbares Formular) als auch in der UI (`app/register/page.tsx:11`). Zugang damit **nur per Supabase-Einladung** (Invite-Flow über `app/auth/confirm/route.ts` → `app/auth/set-password`). Kommentar dazu: `.env.local:4`.

---

## Frage 3 — Versand der System-Mails

- **Wer versendet Bestätigungs-, Einladungs-, Magic-Link- und Passwort-Mails?** Der Versand erfolgt **serverseitig durch Supabase Auth** (ausgelöst durch `signUp` und den Einladungs-Flow; die App empfängt die Links nur über `app/auth/confirm/route.ts`). **Welcher SMTP-Weg dahintersteht — Supabase-Standardversand oder ein eigener Custom-SMTP-Anbieter — ist im Code nicht konfiguriert und damit nicht ermittelbar aus dem Repository.** SMTP wird ausschließlich im Supabase-Dashboard unter *Authentication → Emails / SMTP Settings* festgelegt. **→ Muss dort abgelesen werden.**
- **Falls Custom SMTP (Anbieter + Absenderadresse):** **Nicht ermittelbar aus dem Repository** — keine SMTP-Zugangsdaten, kein Absender, kein `emailRedirectTo` im Code (Grep ohne Treffer). Kein `nodemailer`, kein Brevo-SDK, keine SMTP-Bibliothek in `package.json`.
- **Falls Supabase-Standardversand (dahinterstehender Dienst):** **Nicht ermittelbar.** Supabase benennt den konkreten Subprozessor des eingebauten Versands nicht im Projektcode; er ist nur dokumentations-/dashboardseitig zu klären. Nicht raten.
- **Weitere Mails aus der Anwendung (Hinweise, Reports, Erinnerungen)?** **Nein, keine.** Es gibt keinerlei anwendungseitigen Mailversand — kein `nodemailer`, `brevo`, `sendMail`, `smtp` (Grep ohne Treffer), keine entsprechende Abhängigkeit in `package.json:11-18`. Die App verschickt selbst **keine** E-Mails; jeglicher Mailverkehr entsteht ausschließlich über Supabase Auth (Login/Invite).

---

## Frage 4 — Konto- und Datenlöschung

- **Self-Service-Kontolöschung in der App?** **Nein, existiert nicht.** Es gibt keine Funktion, mit der eine Nutzerin ihr Konto selbst löscht. Kein Aufruf von `auth.admin.deleteUser`/`admin.delete` (Grep ohne Treffer). Die Profil-Seite bietet ausschließlich „Passwort ändern", keinen Lösch-Button (`app/dashboard/profil/page.tsx:14-92`). Auch die Einstellungen-Seite enthält keine Kontolöschung (`app/dashboard/einstellungen/page.tsx`, `app/dashboard/einstellungen/actions.ts`). Die zahlreichen „Löschen"-Aktionen im UI betreffen **nur Inhaltsdaten** (Pins, Boards, Keywords, Aufgaben, Analytics-Zeilen), **nicht das Nutzerkonto**. → Kontolöschung ist derzeit **nur manuell durch die Betreiberin im Supabase-Dashboard** möglich.
- **Verwendeter Schlüssel / Rechtekontext:** Die App nutzt **ausschließlich den anonymen Public-Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `.env.local:2`; Clients in `lib/supabase.ts:5-6`, `lib/supabase-server.ts:8-9`, `middleware.ts:8-9`). **Kein Service-Role-Key** im Code (Grep ohne Treffer). Das bestätigt, dass keine administrative Löschung aus der App heraus stattfindet.
- **Löschregeln abhängiger Daten (on delete cascade / Fremdschlüssel):** **Nicht ermittelbar aus dem Repository.** Es liegen **keine Migrationen, keine SQL-Dateien und kein `supabase/`-Verzeichnis** im Projekt vor (Suche nach `*.sql`, `*migration*`, `*schema*` ohne Treffer). Ob beim Löschen eines Nutzers/`auth.users`-Eintrags die abhängigen Zeilen (siehe Tabellenliste unten) per `ON DELETE CASCADE` mitgelöscht werden oder verwaist zurückbleiben, ist **nur im Supabase-Dashboard** unter *Database → Tables* (Foreign Keys) bzw. im dortigen Schema prüfbar. **→ Offener Punkt.**
- **Restbestände nach Löschung (Logs, Backups, Auth-Tabellen):** **Nicht ermittelbar aus dem Repository.** Der Auth-Datensatz liegt in Supabases verwalteter `auth.users`-Tabelle (nicht im App-Schema); Log- und Backup-Verhalten ist Plattformsache. Nur im Dashboard/Tarif belegbar.
- **Backup-Aufbewahrungsdauer / Tarif:** **Nicht ermittelbar aus dem Repository.** Der Supabase-Tarif ist im Code nicht hinterlegt. Nur im Supabase-Dashboard unter *Organization → Billing* bzw. *Database → Backups* belegbar. **→ Offener Punkt.**
- **Automatische Löschung inaktiver Konten?** **Nein, im Code nicht vorhanden.** Es gibt keinen Cron, keine geplante Aufgabe, keine Lösch-Logik für inaktive Konten im Repository. (Falls im Supabase-Dashboard kein entsprechender Job eingerichtet ist, findet **keine** automatische Löschung statt.)

---

## Zusätzlich — für die Erklärung mitbestimmend

### Felder, die ein Konto anlegt

- **Auth-Ebene (`auth.users`, von Supabase verwaltet):** Bei der Registrierung werden **nur E-Mail-Adresse und Passwort** übergeben (`app/register/actions.ts:20-23`); es werden **keine zusätzlichen Metadaten** gesetzt. Die von Supabase in `auth.users` gehaltenen Standardfelder (E-Mail, Passwort-Hash, Zeitstempel, Bestätigungsstatus) sind Plattform-Standard und im App-Code nicht spezifiziert. E-Mail wird in der App nur angezeigt (`app/dashboard/profil/page.tsx:18-22`).
- **Profil-/Einstellungstabelle `einstellungen`** (dient als Profil, verknüpft über `user_id`; Upsert `onConflict: 'user_id'`, `app/dashboard/einstellungen/actions.ts:140-145`). Feldliste mit Zweck (Beleg: `app/dashboard/einstellungen/page.tsx:14-23`, `app/dashboard/einstellungen/actions.ts`):
  - `user_id` — Verknüpfung zum Auth-Konto.
  - `profil_name` — frei gewählter Anzeigename für die Begrüßung.
  - `eigene_signalwoerter` — nutzerdefinierte Signalwörter für Pin-Texte.
  - `signalwoerter_deaktiviert` — abgeschaltete Standard-Signalwörter.
  - `pinterest_analytics_url`, `pinterest_account_url`, `website_url`, `tailwind_url` — von der Nutzerin eingetragene Links zu ihren eigenen Tools/Profilen.
  - `schwellwert_*` (mehrere Ganzzahl-/Dezimalfelder, `app/dashboard/einstellungen/actions.ts:49-101`) — persönliche Auswertungs-Schwellwerte (Beobachtungszeitraum, Mindestklicks, CTR usw.), keine personenbezogenen Inhalte, nur Konfiguration.
  - `strategie_check_schwelle_gelb`, `strategie_check_schwelle_rot` — Ampel-Schwellen für den Strategie-Check.
- **Weitere Tabellen mit nutzerbezogenen Inhaltsdaten** (jeweils über `user_id` gescoped, aus `.from(...)`-Aufrufen; kein Zugriff auf die tatsächlichen Spalten ohne Schema): `boards`, `pins`, `pins_analytics`, `board_analytics`, `profil_analytics`, `keywords`, `pin_keywords`, `content_keywords`, `content_inhalte`, `content_urls`, `content_boards`, `url_boards`, `ziel_urls`, `aufgaben`, `dashboard_erledigt`, `saison_events`, `saison_event_jahresdaten`, `canva_vorlagen`, `strategie_snapshots`, `audience_snapshots`, `csv_import_pending`, `user_pin_benchmark`. Diese enthalten selbst importierte **Pinterest-Analytics-Daten** (u. a. `audience_snapshots` mit `audience_type`, `audience_size`, `audience_date` und einem `data`-Feld — Zielgruppen-Insights, `lib/audience-snapshot.ts:41-50`). Genaue Spalten je Tabelle: **nicht ermittelbar aus dem Repository** (keine Migrationen vorhanden).

### Row Level Security (RLS) je Tabelle — Ja/Nein-Liste

**Nicht ermittelbar aus dem Repository.** Es liegen keine Migrationen/Policies im Projekt. **Indiz** (kein Beweis): Die App nutzt ausschließlich den anon-Key und filtert jede Query per `.eq('user_id', user.id)`; ein Code-Kommentar benennt RLS ausdrücklich als Schutzmechanismus („Sicherheits-Check via RLS — bei fremder ID liefert die Query nichts", `lib/audience-snapshot.ts:95`). Die Architektur **setzt aktives RLS voraus** — wäre RLS ausgeschaltet, könnte jede angemeldete Person mit dem öffentlichen anon-Key fremde Daten lesen. **Der tatsächliche RLS-Status muss pro Tabelle im Supabase-Dashboard (Table Editor / Database → Tables → RLS) bestätigt werden.** Betroffene Tabellen: alle unter „Weitere Tabellen" oben plus `einstellungen`. **→ Sicherheitskritischer Prüfpunkt.**

### Analytics-, Fehler- oder Monitoring-Dienste

- **Vercel Analytics:** **nicht vorhanden** — kein `@vercel/analytics` (Grep + `package.json:11-18` ohne Treffer).
- **Vercel Speed Insights:** **nicht vorhanden** — kein `speed-insights` (ohne Treffer).
- **Sentry:** **nicht vorhanden** (ohne Treffer).
- **PostHog:** **nicht vorhanden** (ohne Treffer).
- **Google Analytics / gtag / Tag Manager:** **nicht vorhanden** (ohne Treffer).
- **Ergebnis:** Es läuft **kein Analytics-/Fehler-/Monitoring-Dienst in der App** und werden dadurch **keine Cookies gesetzt**; eine Einwilligungsschranke dafür ist mangels solcher Dienste **nicht erforderlich**. (Rein technisch nutzt Supabase Auth Sitzungs-Cookies für den Login — diese sind funktional notwendig, kein Tracking.)

### Zahlungen im App-Kontext

- **Keine Zahlungsabwicklung in der App.** Kein Stripe, kein CopeCart, kein sonstiger Payment-Anbieter im Code (`stripe`/`copecart` Grep ohne Treffer; keine Payment-Abhängigkeit in `package.json`). Es gibt keine Bezahl-, Abo- oder Checkout-Route im Projekt. → Zahlungen laufen **außerhalb der App** (laut Auftrag über CopeCart); in der App selbst wird **kein Zahlungsanbieter** eingebunden.

### Schriften / Skripte von Drittservern

- **Schriften:** Die App lädt drei Google-Fonts — **Lora, DM Sans, Space Grotesk** — über `next/font/google` (`app/layout.tsx:2-23`). **Wichtig:** `next/font/google` **lädt die Schriftdateien zur Build-Zeit herunter und hostet sie selbst** von der eigenen (Vercel-)Domain; **zur Laufzeit erfolgt kein Request an Google-Server** und es wird keine IP an Google übertragen. Es sind **keine** `<link>`-Einbindungen zu `fonts.googleapis.com`/`fonts.gstatic.com` im Code (Grep ohne Treffer). Die im README genannte „Geist"-Schrift (`README.md:21`) wird im aktuellen Layout **nicht** verwendet (dort Lora/DM Sans/Space Grotesk). Lokale Font-Dateien liegen zudem in `app/fonts/` (`GeistVF.woff`, `GeistMonoVF.woff`), werden im Layout aber nicht referenziert.
- **Sonstige Drittskripte:** **Keine** externen Skript-Einbindungen von Drittservern im Code gefunden. Netzwerkverkehr entsteht nur zur eigenen Supabase-Instanz (`*.supabase.co`).

### Auftragsverarbeitungsvertrag (AVV) Supabase

- **Vorliegen/URL/Datum:** **Nicht ermittelbar aus dem Repository.** Ein AVV ist ein Vertrags-/Dashboard-Dokument und im Code nicht hinterlegt. Supabase stellt einen DPA bereit; die konkret akzeptierte Fassung, das Datum und der Abruf-Link sind über das Supabase-Dashboard bzw. das Trust-/Legal-Portal von Supabase zu beziehen. **→ Muss dort beschafft und mit Datum/URL dokumentiert werden.** Analog ist der AVV/DPA von **Vercel** einzuholen (Vercel ist zweiter Auftragsverarbeiter, Hosting).

---

## Handlungsbedarf vor Livegang

### A) Punkte, welche die Datenschutzerklärung betreffen

1. **Supabase-Region eintragen** (Frage 1). Region-Code + Klartext-Standort aus dem Dashboard ablesen und benennen; liegt sie außerhalb EU/EWR, ist ein Drittlandtransfer samt Rechtsgrundlage (SCC) in der Erklärung zu adressieren. **Kritischster Punkt.**
2. **Vercel-Region eintragen** (Frage 1). Default-Function-Region aus dem Vercel-Dashboard ablesen; gleiche EU/EWR-Frage wie oben.
3. **System-Mail-Versender benennen** (Frage 3). Im Supabase-Dashboard klären, ob Standardversand oder Custom-SMTP; den tatsächlichen Anbieter (und ggf. Absenderadresse) als Empfänger/Subprozessor in die Erklärung übernehmen.
4. **Auftragsverarbeiter auflisten:** Supabase (Datenbank/Auth) und Vercel (Hosting) als Auftragsverarbeiter samt AVV/DPA-Fundstelle und -Datum aufnehmen (Frage „AVV").
5. **Konten- und Datenlöschung beschreiben** wie tatsächlich umgesetzt: keine Self-Service-Löschung; Löschung auf Anfrage manuell durch die Betreiberin. Cascade-/Restbestand-Verhalten erst nach Dashboard-Prüfung final formulieren.
6. **Backup-Aufbewahrung** aus dem Supabase-Tarif belegen und als Speicherdauer/Frist in die Erklärung übernehmen.
7. **Positiv-Feststellungen aufnehmen**, die die Erklärung vereinfachen: keine Kontolöschung durch Nutzer / kein OAuth-SSO / kein MFA / **kein** Analytics-, Tracking-, Fehler- oder Monitoring-Dienst / **keine** Tracking-Cookies / **kein** Payment-Anbieter in der App / **keine** Laufzeit-Requests an Google (Fonts selbst-gehostet) / Registrierung nur per Einladung.

### B) Punkte, die technisch zu prüfen/entscheiden wären (nicht umgesetzt — Entscheidung nach Rechtsprüfung)

1. **RLS je Tabelle im Dashboard verifizieren** (sicherheitskritisch). Die App nutzt nur den öffentlichen anon-Key; ist RLS auf einer Tabelle mit Nutzerdaten aus, sind fremde Daten lesbar. Ja/Nein pro Tabelle bestätigen.
2. **Fremdschlüssel-Löschregeln (`ON DELETE CASCADE`) im Schema prüfen** — sicherstellen, dass beim Löschen eines Kontos alle abhängigen Tabellen mitgelöscht werden und keine verwaisten personenbezogenen Zeilen bleiben.
3. **Region ggf. anpassen:** Falls Supabase- oder Vercel-Region außerhalb EU/EWR liegt und ein EWR-Standort gewünscht ist, wäre ein Regions-/Projektumzug zu erwägen (nur nach Ihrer Entscheidung).
4. **Löschkonzept/-frist** technisch festlegen: ob eine (halb-)automatische Löschung inaktiver Konten eingeführt wird — derzeit existiert keine.
5. **Repository-Hygiene:** `.env.local` mit Projekt-URL und anon-Key liegt im Arbeitsverzeichnis; sicherstellen, dass es nicht ins öffentliche Repo gelangt (nur Hinweis, keine Änderung vorgenommen). Zudem: README nennt „Geist", Layout nutzt andere Fonts — kosmetische Inkonsistenz ohne Datenschutzrelevanz.

---

*Diese Bestandsaufnahme erhebt nur, was im Quellcode belegbar ist. Sämtliche mit „nicht ermittelbar aus dem Repository" markierten Angaben erfordern eine Ablesung im Supabase- bzw. Vercel-Dashboard durch eine berechtigte Person und wurden bewusst nicht geschätzt.*
