# Strategie-System — Umbau-Audit & Checkliste

> Read-only Audit des bestehenden Strategie-Konzepts vor dem Neuaufbau.
> Pro Bereich: betroffene Datei(en), was dort passiert, Checkbox `[ ]` für „umgebaut".

---

## ⚠️ Querschnitt-Risiken (zuerst lesen!)

> Diese fünf Punkte ziehen sich quer durch das gesamte System und werden beim
> Umbau leicht übersehen:

1. **Drei verschiedene Bedeutungen von `strategie_typ`:**
   - `pins.strategie_typ` → `'blog_content' | 'affiliate' | 'produkt'` (Strategie-Mix)
   - `content_inhalte.strategie_typ` → `'traffic' | 'lead' | 'sales'` (= Conversion-Semantik, NICHT Mix!)
   - `boards.strategie_fokus` → `'blog_content' | 'affiliate' | 'produkt' | 'gemischt'`
   Gleicher/ähnlicher Name, unterschiedliche Wertemengen und Bedeutung.
2. **`'blog'` vs `'blog_content'` Wertmismatch:** Pins speichern `'blog_content'`,
   das SOLL-Feld heißt `strategie_soll_blog`. Mapping/Angleichung nötig.
3. **Format-Asymmetrie:** Pins erlauben **7** Formate
   (`standard/video/idea/collage/shopping/carousel/infografik`), aber SOLL und
   Strategie-Check kennen nur **4** (`standard/video/collage/carousel`).
   Die übrigen 3 fallen aus der Auswertung.
4. **Kein DB-Schema im Repo:** Es gibt keine `.sql`/Migrations-/Supabase-Schema-
   Dateien. Schema ist nur in der Live-Supabase-DB. **Live-Schema (Spalten,
   CHECK-Constraints, Enums, Defaults) vor dem Umbau ziehen.**
5. **`strategie_snapshots`-Historie hängt an denselben Spalten:** Jede Änderung an
   SOLL-Spalten/Wertemengen betrifft auch die Snapshot-Tabelle.

---

## 1. Strategie-Mix (blog / affiliate / produkt)

- [ ] `app/dashboard/strategie/lib.ts` — Typ `StrategieRow` (`strategie_soll_blog/affiliate/produkt`), `STRATEGIE_SELECT`, `BUSINESS_MODELL_OPTIONS` (Default-Mix-Ratios), `computeRecommendation`, `getEmpfehlungstext`
- [ ] `app/dashboard/pin-produktion/utils.ts` — `STRATEGIE_TYPEN = ['blog_content','affiliate','produkt']`, `StrategieTyp`, `STRATEGIE_LABEL`, `STRATEGIE_BADGE`
- [ ] `app/dashboard/pin-produktion/actions.ts` — `isStrategie()`-Validierung für `strategie_typ` (Formular + CSV-Import)
- [ ] `app/dashboard/pin-produktion/PinProduktionClient.tsx` — Tabellen-Sortierung, Filter-Dropdown, Form-Select, CSV-Import-Mapping für `strategie_typ`
- [ ] `app/dashboard/strategie/MyStrategy.tsx` — Wizard Step 4/5 (Slider + Anzeige), schreibt `strategie_soll_*` in FormData; Summary-Balken
- [ ] `app/dashboard/strategie/actions.ts` — Speichern/Validierung (Summe = 100 %) + Snapshots
- [ ] `app/dashboard/einstellungen/EinstellungenClient.tsx` + `page.tsx` — manuelle Slider + Laden der `strategie_soll_*`
- [ ] `app/dashboard/strategie-check/lib.ts` + `StrategieCheckSection.tsx` — IST-Zählung nach `strategie_typ` vs SOLL; `BAR_HEX` `mix:blog/affiliate/produkt`
- ⚠️ Wertmismatch: Pin-Wert `'blog_content'` ↔ SOLL-Spalte `strategie_soll_blog`

## 2. Conversion-Ziele (traffic / lead / sales)

- [ ] `app/dashboard/pin-produktion/utils.ts` — `CONVERSION_ZIELE = ['traffic','lead','sales']`, `CONVERSION_LABEL`, `CONVERSION_BADGE`
- [ ] `app/dashboard/pin-produktion/actions.ts` + `PinProduktionClient.tsx` — `isConversion()`-Validierung; Filter/Form/CSV für `conversion_ziel`
- [ ] `app/dashboard/strategie/lib.ts` — `ziel_soll_traffic/lead/sales` in `StrategieRow`; `HAUPTZIEL_OPTIONS` (Default-Ziel-Ratios)
- [ ] `app/dashboard/strategie/MyStrategy.tsx` + `actions.ts` — Step 5 Slider + Speichern (Summe = 100 %)
- [ ] `app/dashboard/strategie-check/lib.ts` + `StrategieCheckSection.tsx` — IST nach `conversion_ziel` vs SOLL; `BAR_HEX` `ziel:*`
- ⚠️ `app/dashboard/content-inhalte/actions.ts` — `content_inhalte.strategie_typ` nutzt **traffic/lead/sales** (`ALLOWED_STRATEGIE`); gleicher Spaltenname-Stamm, andere Semantik

## 3. Pin-Format-Mix (standard / video / collage / carousel)

- [ ] `app/dashboard/pin-produktion/utils.ts` — `PIN_FORMATE` (7 Werte: standard/video/idea/collage/shopping/carousel/infografik), `PIN_FORMAT_LABEL`, `PIN_FORMAT_BADGE`
- [ ] `app/dashboard/strategie/lib.ts` — `format_soll_standard/video/collage/carousel`, `STRATEGIE_DEFAULT_FORMAT_MIX` (60/20/10/10)
- [ ] `app/dashboard/strategie/MyStrategy.tsx` — Step 5 Format-Slider, schreibt `format_soll_*`
- [ ] `app/dashboard/pin-produktion/actions.ts` + `PinProduktionClient.tsx` — `isPinFormat()`, Filter/Form/CSV für `pin_format`
- [ ] `app/dashboard/strategie-check/lib.ts` + `StrategieCheckSection.tsx` — IST nach `pin_format` (nur 4 Haupttypen) vs SOLL; `BAR_HEX` `format:*`
- ⚠️ 7 Pin-Formate vs nur 4 im SOLL/Check

## 4. Strategie-Setup Flow (Wizard)

- [ ] `app/dashboard/strategie/page.tsx` — Server-Loader (`STRATEGIE_SELECT` + Schwellwerte) → `StrategieClient`
- [ ] `app/dashboard/strategie/StrategieClient.tsx` — Tab-Router; Tab `meine` rendert `MyStrategy`
- [ ] `app/dashboard/strategie/MyStrategy.tsx` — Welcome → Wizard (Step 0–5: Business-Modell → Hauptziel → Vorhanden → Empfehlung → Slider) → Summary
- [ ] `app/dashboard/strategie/lib.ts` — Optionen, `computeRecommendation`, `adjustProportional`, parse/serialize, Typen
- [ ] `app/dashboard/strategie/actions.ts` — `saveStrategieOnboarding`, `saveStrategieManual`, `restartStrategieOnboarding` (+ Snapshots)

## 5. Datenbank (inferiert — kein Schema im Repo)

- [ ] **`einstellungen`** (SOLL-Werte, pro `user_id`): `strategie_soll_blog/affiliate/produkt`, `ziel_soll_traffic/lead/sales`, `format_soll_standard/video/collage/carousel`, `strategie_business_modell` (CSV), `strategie_hauptziel`, `strategie_vorhanden` (CSV), `strategie_onboarding_abgeschlossen` (bool), `strategie_letzte_aenderung`, `strategie_check_schwelle_gelb/rot`
- [ ] **`pins`**: `strategie_typ` ('blog_content'|'affiliate'|'produkt'), `conversion_ziel` ('traffic'|'lead'|'sales'), `pin_format` (7 Werte), `hook_art`
- [ ] **`content_inhalte`**: `typ`, `strategie_typ` (⚠️ traffic/lead/sales)
- [ ] **`boards`**: `strategie_fokus` ('blog_content'|'affiliate'|'produkt'|'gemischt'), `kategorie`
- [ ] **`strategie_snapshots`**: Historie aller SOLL-Werte + business_modell/hauptziel/vorhanden + `snapshot_grund`
- ⚠️ CHECK-Constraints nur als App-Validierung im Code (Summen = 100 %, `rot > gelb`, 5%-Schritte) — echte DB-Constraints/Enums/Defaults aus Supabase prüfen

## 6. Dashboard — Strategie-Check

- [ ] `app/dashboard/strategie-check/lib.ts` — `computeStrategieCheck` (180-Tage-Fenster, IST vs SOLL, 3 Areas, `coachingTop3`), Typen `StrategiePinRow`/`StrategieSettings`, RECOMMENDATIONS-Registry
- [ ] `app/dashboard/strategie-check/StrategieCheckSection.tsx` — Rendering: `AreaBlock`, `CheckRow`, `Bar` (IST-Füllung + SOLL-Marker), `CoachingBlock`, `BAR_HEX`, `AREA_LABEL`
- [ ] `app/dashboard/page.tsx` — SOLL-Query (~Z. 503), `computeStrategieCheck`-Aufruf (~Z. 966), `<StrategieCheckSection>` (~Z. 1721) + Empty-State-Weichen `StrategieCheckEmptyKeineStrategie/KeineAnalytics`

## 7. Wissensseite — Tab „Strategie-Modelle"

- [ ] `app/dashboard/strategie/StrategieClient.tsx` — Tab-Registry (`{ key: 'strategien', label: '💼 Strategie-Modelle' }`); Funktion `TabStrategien()` (~Z. 1511–1894) mit 7 Accordions: „Warum eine Strategie wichtig ist", „Die Strategien im Detail" (Blog/Affiliate/Produkt/Dienstleistung), „Conversion-Ziele: Traffic/Lead/Sales", „Strategien kombinieren", „Welche Strategie für welches Business" (Tabelle), „Die fünf Fragen"

## 8. Onboarding

- [ ] `lib/onboarding-content.ts` — **Schritt 9** (`special: 'strategy'`, „Deine Strategie festlegen", Link `/dashboard/strategie?tab=meine`, die fünf Fragen)
- [ ] `app/dashboard/onboarding/OnboardingClient.tsx` — `StrategyCtas` → Button zu `/dashboard/strategie?tab=meine&onboarding=true&returnTo=onboarding-step-10`; `completion`-Check liest `strategie_onboarding_abgeschlossen`
- [ ] `app/dashboard/onboarding/page.tsx` — lädt `completion`-Info inkl. Strategie-Status
- [ ] `app/dashboard/strategie/MyStrategy.tsx` — Onboarding-Rückkehr-Logik (`OnboardingHint`, `finishToOnboarding` → `/dashboard/onboarding?step=10`)

## 9. Zielgruppe / Audience Insights

**Speicherung & Verarbeitung (lib):**
- [ ] `lib/audience-snapshot.ts` — `getAudienceSnapshots()` (lädt Snapshots aus Supabase, DESC)
- [ ] `lib/audience-types.ts` — `AudienceSnapshot`-Typ
- [ ] `lib/audience-parser.ts`, `lib/audience-translations.ts`, `lib/audience-niche-mapping.ts`, `lib/audience-insights.ts` (`generateAudienceInsights` → `coachingBlock`)
- [ ] `app/dashboard/analytics/audience-actions.ts` — Server-Actions (Upload/Speichern)

**Anzeige Analytics-Tab „Zielgruppe":**
- [ ] `app/dashboard/analytics/AudienceTab.tsx` + `AudienceOverview/AudienceInterestsTable/AudienceCsvUpload/AudienceSnapshotList/AudienceInsightSummary.tsx`

**Anzeige Pinterest-Wissen-Tab „Zielgruppe verstehen":**
- [ ] `app/dashboard/strategie/AudienceWissen.tsx`

**➡️ Taucht Audience-Insights auf dem DASHBOARD auf? → JA.**
- [ ] `app/dashboard/ZielgruppeCoachingBlock.tsx` — gerendert **innerhalb** von `ProfilPerformanceSection` (Sektion „Gesamt-Profil-Performance", unter dem Kontext-Streifen), `page.tsx:5103`. Datenquelle: `getAudienceSnapshots()` (`page.tsx:601`) + `generateAudienceInsights()`.
- **Hinter dem `hatAnalytics`-Empty-State versteckt? → JA.** `page.tsx:1698` rendert `ProfilPerformanceSection` nur bei `hatAnalytics === true`, sonst `ProfilPerformanceEmpty`. Bei `hatAnalytics === false` ist der Zielgruppen-Block komplett verborgen.
- **Doppelt gegated:** `ZielgruppeCoachingBlock` gibt `null` zurück, wenn keine Snapshots vorhanden sind oder kein `coachingBlock` existiert (`ZielgruppeCoachingBlock.tsx:33,43`).
- Es gibt **kein** eigenständiges Audience-Dashboard-Widget mehr (laut Code-Kommentar in V3.0.8 in die Performance-Sektion integriert).

## 10. Toggle „Wie nutzt du diese Daten für deine Pin-Strategie?"

- [ ] `app/dashboard/strategie/AudienceWissen.tsx`, **Zeilen 130–164** (Tab „Zielgruppe verstehen"). Inhalt: drei Wege — „1. Themen-Erweiterung", „2. Themen-Schwerpunkte verstärken", „3. Themen-Anpassung".
- **Referenziert das alte Strategie-Konzept? → Nein (nur sprachlich).** Keine Bezüge zu Strategie-Mix, Conversion-Zielen (traffic/lead/sales), `conversion_ziel`, `strategie_typ` oder der Strategie-Check-Komponente. Einzige Berührung: das Wort „Strategie-Check" in Z. 159 wird **generisch** verwendet („lohnt sich ein Strategie-Check: Kannst du deinen Content anders aufbauen…"), nicht als Verweis auf das technische Feature. Inhaltlich geht es um **Themen-Affinität ↔ Nische**, nicht um SOLL/IST.

---

## NEUES KONZEPT (Stand der Planung)

**Recherche-Ergebnis (Pinterest 2026):**
- Idea Pins wurden 2023 abgeschafft, alle Pins sind ein einheitliches Format
- Optimal: vertikal 2:3 (1000x1500px), hochwertig, Video etwas mehr Sichtbarkeit
- Format-Präferenz ist NICHT nischen- oder business-modell-abhängig

**ENTSCHEIDUNGEN:**

### 1. Pin-Format — dreifach getrennt
- **Format-SOLL** (`format_soll_*` als Strategie-Vorgabe): **WIRD ENTFERNT.** War Pseudo-Präzision.
- **Format-Feld am Pin** (`pins.pin_format`): **BLEIBT** als reines Erfassungsfeld, kein Soll. Grund: minimaler Pflegeaufwand, ermöglicht später Performance-nach-Format-Analyse. Altdaten gehen sonst verloren.
- **Format-Performance-Auswertung in Analytics:** SPÄTER möglich (Datenbasis `pins_analytics x pins.pin_format` trägt es schon), JETZT NICHT bauen.
- **Format-Empfehlung** (vertikal 2:3 etc.) kommt auf die Wissensseite.

### 2. Conversion-Ziele (traffic/lead/sales als Prozent)
**ERSETZT** durch **Zielflächen-Verteilung** (Blog / Shop / Affiliate / Lead-Magnet / Buchung), gemessen über Pin-Ziel-URLs.

### 3. Neue Strategie-Bausteine
- **Baustein 1:** Business-Modell + Hauptnische
- **Baustein 2:** Zielflächen-Verteilung
- **Baustein 3:** Content-Säulen (3-5 thematische Schwerpunkte)
- **Baustein 4:** Pinning-Rhythmus (gestaffelt: 3-5/Woche, 1/Tag, 5+/Tag; Konsistenz vor Menge)

### 4. Content-/Strategie-Typ am Pin (blog_content/affiliate/produkt/dienstleistung)
**BLEIBT, bereinigt:** `'blog'` vs `'blog_content'` Mismatch beheben, `'dienstleistung'` ergänzen.

### 5. Monatliches Tracking pro Baustein
- Zielflächen Soll vs Ist (über URLs)
- Content-Säulen-Abdeckung
- Content-Typ-Mix Soll vs Ist
- Pinning-Frequenz Soll vs Ist
- Nischen-Fokus (Content passt zu erklärter Nische?)

### 6. Offen für später
Format-Performance-Auswertung als eigenes Analytics-Feature.

---

## NEUES SETUP: FINALE FASSUNG (Wortlaut)

**Ton:** Archetyp Königin und Weise. Keine Emojis. Keine langen Gedankenstriche. Für Pinterest-Anfänger verständlich. Ziel durchgängig: Zeit sparen, Traffic auf die eigene Seite, mehr Umsatz.

**Einstiegssatz (über allen Fragen):**
> "Diese vier Antworten formen deine Pinterest-Strategie. Sie legen fest, worauf du deine Zeit konzentrierst, damit jeder Pin auf ein Ziel einzahlt: mehr Menschen auf deine Seite, mehr Sichtbarkeit, am Ende mehr Umsatz."

### Baustein 1 von 4: Was beschreibt dein Business am besten?
**Hilfetext:** "Mehrfachauswahl möglich. Daraus leitet Pin-Flow ab, welche Art von Pins für dich sinnvoll ist."

Mehrfachauswahl:
- Blog oder Content-Website (Einnahmen über Werbung, Reichweite, Markenaufbau)
- Eigener Shop (physische oder digitale Produkte)
- Dienstleistung oder Beratung (Coaching, Design, Heilpraxis, Training, Agentur)
- Affiliate-Marketing (Provisionen über empfohlene Produkte)

**Dropdown "Deine Hauptnische":** feste Liste aus `lib/niche-benchmarks.ts` + Option "Meine Nische ist nicht dabei".
**Hilfetext:** "Wähle das Themenfeld, in dem du unterwegs bist. Pin-Flow vergleicht deine Zahlen später mit typischen Werten dieser Nische."

### Baustein 2 von 4: Wohin sollen deine Pins die Menschen führen?
**Hilfetext:** "Stell dir Pinterest wie eine Suchmaschine vor, die Menschen zu dir schickt. Aber wohin genau? Auf deinen Blog? In deinen Shop? Zu deinem Newsletter? Lege fest, wie viel von deiner Pinterest-Arbeit auf welches Ziel einzahlen soll. Verteile 100 Prozent auf die Flächen, die für dich zählen."

Zielflächen mit Prozent-Slidern (Summe 100): Blog / Shop auf eigener Website / Etsy-Shop / Affiliate-Seiten / Landingpage / Newsletter oder Lead-Magnet / Buchungs- oder Angebotsseite

**WICHTIG:** Nur die Slider zeigen, die zum in Baustein 1 gewählten Business-Modell passen.
**Hilfetext darunter:** "Jeder Pin verlinkt auf genau eine dieser Flächen. Pin-Flow prüft später Monat für Monat, ob deine echten Pins zu dieser Verteilung passen, oder ob du nachsteuern solltest."

### Baustein 3 von 4: Deine thematischen Schwerpunkte
**Hilfetext:** "Pinterest will verstehen, worum es bei dir geht. Wenn du immer wieder zu denselben Themen pinnst, ordnet Pinterest dich klarer ein und zeigt dich den richtigen Menschen. Deine Themen-Schwerpunkte sind genau das: die paar großen Themen, um die sich bei dir alles dreht."

"Du hast deine Themen bereits festgelegt, als du deine Boards angelegt hast. Hier sind sie:" → Board-Kategorien als Liste, Nutzer bestätigt/hakt an.
**Fallback ohne Boards:** "Du hast noch keine Boards angelegt. Sobald du das tust, erscheinen deine Themen-Schwerpunkte automatisch hier. → Boards anlegen"
**Hinweis:** "Ideen für sinnvolle Themen-Schwerpunkte findest du unter Prompts und Vorlagen." (kein Live-KI-Call)

### Baustein 4 von 4: Wie oft willst du pinnen?
**Hilfetext:** "Es gibt keine offizielle Zahl. Pinterest selbst sagt nur: poste regelmäßig frischen Inhalt. Wichtiger als die Menge ist, dass du dranbleibst. Lieber jeden Tag ein guter Pin als zwanzig auf einmal und dann zwei Wochen nichts."

Phasen-Vorschlag basierend auf Anzahl Ziel-URLs des Nutzers:
- Einsteiger (unter 20 URLs): 1 bis 3 Pins pro Tag
- Wachstum (20 bis 100 URLs): 3 bis 5 Pins pro Tag
- Etabliert (über 100 URLs): 5 bis 10 Pins pro Tag

**Hilfetext darunter:** "Pin-Flow hat dir eine Frequenz vorgeschlagen, die zu deiner Anzahl an Inhalten passt. Du kannst sie anpassen. Eine Faustregel: Bleib unter 15 Pins pro Tag, und pinne dieselbe Seite nicht öfter als alle paar Tage. Qualität und Regelmäßigkeit schlagen Masse."
**Quellen-Hinweis (intern):** Tailwind ~5/Tag, Adobe 3-10/Tag, Obergrenze 15/Tag. Pinterest gibt keine offizielle Zahl vor.

### Abschluss-Seite: Deine Strategie steht
**Zusammenfassung:** Business-Modell, Hauptnische, Zielflächen-Verteilung (Balken), Themen-Schwerpunkte, Pinning-Rhythmus, abgeleiteter empfohlener Content-Typ-Mix.
**Abschlusstext:** "Das ist dein Startpunkt, kein starres Gesetz. Ab jetzt vergleicht Pin-Flow Monat für Monat deine tatsächliche Arbeit mit dieser Strategie und zeigt dir, wo du gut liegst und wo du nachsteuern kannst. So bleibst du auf Kurs, ohne raten zu müssen."

**Zielgruppe:** nicht im Setup. Läuft über die vorhandenen Audience-Insights in der laufenden Analyse (`ZielgruppeCoachingBlock` + AudienceWissen-Toggle).
