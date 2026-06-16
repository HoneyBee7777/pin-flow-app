// V3.4 — App-FAQ-Inhalte als strukturierte Daten.
//
// Reine Daten (kein React) — die Antworten sind ein leichtgewichtiges
// Markdown: Absätze (Leerzeile getrennt), nummerierte Listen (`1. `),
// Aufzählungen (`- `), **fett** und [Link](/pfad). Interne Links zeigen
// auf echte Sidebar-Routen (siehe components/Sidebar.tsx) — der Renderer
// in app/dashboard/faq/FaqAccordion.tsx macht daraus Next-Links.
//
// App-FAQ ≠ Website-FAQ: hier nur Nutzungshilfe für zahlende Kund:innen.
// Eine spätere Website-FAQ kann Inhalte hieraus wiederverwenden.

export type FaqItem = {
  question: string
  answer: string
}

export type FaqCategory = {
  title: string
  intro?: string
  items: FaqItem[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: 'Einstieg & Setup',
    items: [
      {
        question: 'Wie starte ich mit Pin-Flow?',
        answer: `In fünf Schritten bist du startklar:

1. **Pinterest-Business-Account bereithalten.** Falls du noch einen privaten Account hast: Umstellung ist kostenlos und in 2 Minuten erledigt (in den Pinterest-Einstellungen unter „Konto verwalten").
2. **Strategie festlegen**: beim ersten Start führt dich Pin-Flow durch ein geführtes Setup mit vier Bausteinen: dein **Business-Modell und deine Hauptnische**, deine **Pin-Ziel-Verteilung** (wohin deine Pins führen: Blog, Shop, Etsy, Affiliate, Landingpage, Newsletter und Lead-Magnet oder Buchung), deine **Content-Säulen** (deine Themen-Schwerpunkte) und dein **Pinning-Rhythmus**. Das ist das Fundament für alle späteren Analysen. Du kannst deine Strategie jederzeit unter [Strategie festlegen](/dashboard/strategie?tab=meine) anpassen.
3. **Erste Analytics importieren** auf der [Analytics-Eingabe-Seite](/dashboard/analytics). Pin-Flow führt dich Schritt für Schritt durch die 4 CSV-Exporte aus Pinterest.
4. **Setup pflegen**: trage deine [Keywords](/dashboard/keywords), [Ziel-URLs](/dashboard/ziel-urls), [Boards](/dashboard/boards) und [Inhalte](/dashboard/content-inhalte) (Blogposts, Produkte, Affiliate) ein. Je mehr Verknüpfungen du anlegst, desto präziser werden die Empfehlungen.
5. **Dashboard-Tour:** Schau dir an, was die App aus deinen Daten gemacht hat. Prioritäten oben sagen dir, wo du am besten anfängst.

Nimm dir für das initiale Setup etwa **45-60 Minuten Zeit**. Danach läuft alles in monatlichen 15-Minuten-Updates.`,
      },
      {
        question: 'Was soll ich in den Einstellungen alles eintragen?',
        answer: `Die Einstellungen sind das Fundament für eine präzise Analyse: je sauberer sie gepflegt sind, desto besser werden Pin-Flows Empfehlungen. Die [Einstellungs-Seite](/dashboard/einstellungen) ist von oben nach unten so aufgebaut, dass das Häufige und Einfache zuerst kommt und die technischen Feineinstellungen gebündelt darunter.

**Oben, schnell ausgefüllt:**

1. **Mein Profil**: dein Begrüßungsname für das Dashboard.
2. **Persönliche Links (Dashboard)**: Quick-Buttons zu deinem Pinterest-Account, Pinterest-Trends, Pinterest-Analytics und optional Tailwind.
3. **Pinterest Analytics Link**: die direkte URL zu deiner Pinterest-Analytics-Seite, damit du beim monatlichen Update mit einem Klick dort landest.
4. **Signalwörter**: eine kuratierbare Liste der Wörter, die bei der KI-gestützten Pin-Produktion in den Vorschlag einfließen. Du kannst einzelne Standard-Wörter abwählen, die nicht zu dir passen, oder eigene ergänzen.
5. **Deine Pinterest-Strategie**: ein kurzer Überblick mit Link zum geführten Setup. Deine Strategie legst du nicht hier fest, sondern unter [Strategie festlegen](/dashboard/strategie?tab=meine).

**Erweiterte Einstellungen (bereits sinnvoll voreingestellt, nur bei Bedarf anpassen):**

6. **Pin-Schwellwerte für Analytics**: die Werte, die bestimmen, ab wann ein Pin als „gut" oder „schlecht" gilt (z. B. Mindest-Impressionen für ein CTR-Urteil, Top-Performer-Schwellen).
7. **Board-Schwellwerte für Analytics**: wann gilt ein Board als „aktiv", „inaktiv" oder „Top"?
8. **Content-Pipeline-Schwellwerte**: wann markiert die App einen Inhalt als „braucht mehr Pins"?
9. **Status-Schwellwerte**: nach wie vielen Tagen gilt dein Analytics-Update als „überfällig"?

**Wichtig (Premium-Detail):** Jedes Schwellwert-Feld hat einen „Wann anpassen?"-Hinweis mit Orientierungswerten für Anfänger:innen, Erfahrene und Profis. Du musst nichts wissen, die Standardwerte funktionieren für die meisten Profile. Anpassen lohnt sich erst, wenn du Pin-Flow ein paar Monate kennst und merkst, dass eine Schwelle zu streng oder zu locker ist.

→ Zur [Einstellungs-Seite](/dashboard/einstellungen)`,
      },
      {
        question:
          'Warum ist es wichtig, eine Content-Strategie zu Beginn festzulegen?',
        answer: `Pinterest ist eine **Suchmaschine, kein soziales Netzwerk**. Der Algorithmus belohnt Konsistenz: Profile, die zu einem klar definierten Themenbereich pinnen, werden bevorzugt ausgespielt. Wer mal Yoga, mal Reise, mal Rezept-Pins postet, bekommt deutlich weniger Reichweite als wer fokussiert bei einer Nische bleibt.

Eine klare Content-Strategie zu Beginn hat drei Effekte:

1. **Pinterest versteht dich schneller.** Der Algorithmus braucht ca. 3-6 Monate, um dein Profil thematisch einzuordnen. Bei klarer Strategie geht das schneller.
2. **Du wirst von der richtigen Zielgruppe gefunden.** Pinterest-User:innen suchen nach Themen, nicht nach Profilen. Ein fokussiertes Profil wird in den richtigen Suchen sichtbar.
3. **Du baust nachhaltig auf.** Pinterest belohnt langfristige Konsistenz. Strategie-Wechsel kosten Reichweite, weil der Algorithmus dich neu einordnen muss.

**Wie Pin-Flow dir hilft:** Im geführten Setup unter [Strategie festlegen](/dashboard/strategie?tab=meine) bestimmst du deine vier Bausteine, allen voran deine Pin-Ziel-Verteilung und deine Content-Säulen. Das Dashboard zeigt dir dann im Strategie-Check, ob deine tatsächlichen Pins zu deinem Plan passen. Abweichungen werden mit klaren Hinweisen sichtbar.`,
      },
      {
        question: 'Brauche ich einen Pinterest-Business-Account?',
        answer: `Ja. Pin-Flow arbeitet mit den Analytics-Daten von Pinterest, und die gibt es nur in Business-Accounts. Außerdem hast du mit einem Business-Account Zugriff auf erweiterte Funktionen wie Pinterest-Trends und detaillierte Audience Insights.

**Umstellung ist einfach und kostenlos:**

1. In Pinterest → Einstellungen → Konto verwalten
2. „Zu Business-Account wechseln" auswählen
3. Wenige Angaben zu deinem Business machen
4. Fertig, deine bisherigen Pins und Boards bleiben erhalten`,
      },
    ],
  },
  {
    title: 'Datenpflege',
    items: [
      {
        question: 'Wo trage ich meine Pinterest-Daten ein?',
        answer: `Auf der **[Analytics-Eingabe-Seite](/dashboard/analytics)** (links in der Sidebar unter „Analytics"). Du findest dort drei Bereiche:

1. **Profil-Performance**: Gesamt-Klicks, Saves, CTR, Engagement-Rate, Impressionen (manuelle Eingabe, Pinterest bietet hier keinen CSV-Export)
2. **Top Pins & Boards importieren**: drei CSV-Exporte aus Pinterest (sortiert nach Klicks, Saves, Impressionen). Die Boards werden dabei automatisch aus den Pin-CSVs gezogen, du brauchst dafür keinen separaten Import.
3. **Zielgruppe importieren**: ein CSV-Export aus Pinterest Audience Insights (Interagierende Zielgruppe)

Die genaue Klick-für-Klick-Anleitung öffnest du auf der Eingabe-Seite über den Toggle **„So findest du alle Zahlen"**.`,
      },
      {
        question: 'Wie oft soll ich die Analytics aktualisieren?',
        answer: `**Einmal pro Monat** ist optimal, und meist auch ausreichend.

Begründung:
- Pinterest-Trends entwickeln sich über Wochen, nicht Tage. Tägliche oder wöchentliche Updates liefern kaum bessere Erkenntnisse, kosten aber Zeit.
- Pin-Flow nutzt monatliche Snapshots als Datengrundlage für Vergleiche („Vorperiode" = 30 Tage zurück).
- Wichtigster Grund: **Pinterest speichert Analytics-Daten nur 6 Monate.** Mit monatlichen Snapshots in Pin-Flow baust du dir eine dauerhafte Historie auf, die Pinterest selbst nicht hat.

**Empfohlener Rhythmus:** Wähle einen festen Tag im Monat (z. B. der 1. oder der 15.) und blocke dir 15-20 Minuten dafür. Das Dashboard zeigt im Analytics-Status oben, wann dein letztes Update war.`,
      },
      {
        question:
          'Was passiert, wenn ich einen Monat vergesse einzupflegen?',
        answer: `Kein Problem, Pin-Flow arbeitet mit den vorhandenen Datenpunkten weiter. Lücken im Verlauf sind nicht kritisch.

**Was du wissen solltest:**
- Pinterest speichert Analytics-Daten **6 Monate** rückwirkend. Du kannst also Daten nachpflegen, falls du einen oder zwei Monate verpasst hast.
- Je mehr Snapshots, desto präziser werden Trend-Erkennungen und Vergleiche. Bei nur 1-2 Snapshots sind manche Coaching-Hinweise vorsichtiger.
- Bei längeren Pausen bleibt Pin-Flow funktional, aber die Aussagen über „Erfolge der letzten 30 Tage" basieren dann auf älteren Vergleichswerten.

**Tipp:** Setze dir einen monatlichen Reminder im Kalender. So entstehen erst gar keine Lücken.`,
      },
    ],
  },
  {
    title: 'Verständnis & Begriffe',
    items: [
      {
        question: 'Was bedeutet „Profil-Status: Ausbaufähig"?',
        answer: `Pin-Flow bewertet dein Pinterest-Profil in fünf Stufen:

- **Schwach**: kritische Probleme, Profil funktioniert kaum
- **Ausbaufähig**: erkennbare Probleme mit klaren Lösungs-Schritten
- **Optimierbar**: funktioniert grundsätzlich, hat aber noch Verbesserungspotential
- **Solide**: stabil und gut performend
- **Stark**: vorbildlich, über dem Branchenschnitt

Die Einordnung basiert auf der **typischen Pin-Leistung** deines Profils (Median) im Vergleich zum Branchenschnitt deiner Nische. „Ausbaufähig" ist eine konstruktive Einstufung: es gibt erkannte Probleme, aber sie sind lösbar. Die konkreten Befunde findest du direkt unter der Skala im Bereich „Befunde".

**Wichtig:** Der Status wird **automatisch** neu berechnet, wenn du neue Analytics-Daten importierst. Wenn sich deine Werte verbessern, steigst du in eine höhere Stufe auf, das ist das motivierende Element.`,
      },
      {
        question: 'Was ist der Affinitäts-Index?',
        answer: `Der Affinitäts-Index zeigt, wie stark sich deine Zielgruppe für ein Thema interessiert, **im Vergleich zum Pinterest-Durchschnitt**.

- **1,0** = genau der Pinterest-Mittelwert
- **> 1,0** = überdurchschnittliches Interesse
- **< 1,0** = unterdurchschnittliches Interesse

**Beispiel:** Wenn deine Zielgruppe einen Affinitäts-Index von 1,88 für „Architektur" hat, bedeutet das: sie interessiert sich **1,88-mal so stark** für Architektur wie der durchschnittliche Pinterest-Nutzer.

**Strategisch wichtig:** Themen mit hoher Affinität sind dein **Algorithmus-Hebel**. Pinterest spielt Pins bevorzugt an Nutzer:innen aus, deren Interessen-Profile zu deinen Pin-Themen passen. Hohe Affinität bedeutet weniger Konkurrenz in der Pinterest-Suche.

Mehr dazu in [Pinterest-Wissen → Zielgruppe verstehen](/dashboard/strategie?tab=audience).`,
      },
      {
        question: 'Was sind Brücken-Themen?',
        answer: `Brücken-Themen sind **Inhalte, die deine Pinterest-Nische mit den Interessen deiner Zielgruppe verbinden**.

**Beispiel:** Deine Hauptnische ist Yoga & Wellness, aber deine Zielgruppe zeigt hohe Affinität zu Gartenarbeit. Ein Brücken-Thema wäre „Yoga im Garten" oder „Outdoor-Yoga-Routinen für den Sommer". Du bedienst beide Interessen gleichzeitig.

**Warum das mächtig ist:**
- Du erreichst **mehrere Zielgruppen gleichzeitig** (Yoga-Interessierte UND Garten-Interessierte)
- Pinterest belohnt das mit **mehr Reichweite und mehr Saves**
- Du hast **weniger Konkurrenz** in der Pinterest-Suche, weil Brücken-Themen oft Nischen-Lücken sind

**Wie Pin-Flow dir hilft:** Im Bereich [Prompts & Vorlagen](/dashboard/ressourcen) findest du den **Brücken-Themen-Generator**, ein vorgefertigter KI-Prompt, der mit deinen Daten automatisch personalisiert wird und dir 10 konkrete Brücken-Themen-Ideen liefert.`,
      },
      {
        question: 'Was sind Pin-Ziele?',
        answer: `Jeder Pin führt auf genau eine Fläche, und genau diese Fläche ist sein **Pin-Ziel**. Es beschreibt, wohin du die Menschen schickst, die auf deinen Pin klicken.

**Mögliche Pin-Ziele:**

- **Blog**: ein Beitrag auf deiner Website
- **Shop auf eigener Website**: deine eigenen Produkte
- **Etsy-Shop**: dein Verkauf über Etsy
- **Affiliate-Seite**: eine Partnerseite, über die du Provisionen verdienst
- **Landingpage**: eine fokussierte Seite für ein einzelnes Angebot oder eine Aktion
- **Newsletter oder Lead-Magnet**: Menschen tragen sich ein, du gewinnst einen direkten Kontakt
- **Buchungs- oder Angebotsseite**: Anfragen oder Buchungen für deine Dienstleistung

Ein Pin bekommt sein Pin-Ziel über seine verknüpfte **Ziel-URL**: der Fläche wird die URL zugeordnet, und darüber weiß Pin-Flow, worauf der Pin einzahlt.

Pin-Ziele ersetzen das frühere Denken in abstrakten Stufen. Statt allgemein von „Traffic" oder „Verkauf" zu sprechen, legst du konkret fest, wohin deine Pins führen. Das macht deine Strategie greifbar und messbar.

Mehr dazu in [Pinterest-Wissen → Strategie-Modelle](/dashboard/strategie?tab=strategien).`,
      },
      {
        question: 'Was sind Content-Säulen?',
        answer: `Content-Säulen sind die **drei bis fünf großen Themen**, um die sich dein ganzer Pinterest-Auftritt dreht. Sie sind die Schwerpunkte, zu denen du immer wieder pinnst.

Pin-Flow leitet deine Content-Säulen aus den **Kategorien deiner Boards** ab. Du musst sie also nicht neu erfinden, du bestätigst sie im geführten Setup.

**Warum sie wichtig sind:** Pinterest will verstehen, worum es bei dir geht. Wenn du immer wieder zu denselben Themen pinnst, ordnet Pinterest dein Profil klarer ein und zeigt dich den richtigen Menschen. Klare Schwerpunkte schlagen ein buntes Durcheinander.

Im **Strategie-Check** auf dem Dashboard siehst du, welche deiner Säulen aktiv neue Pins bekommen und welche gerade schlafen, damit kein Schwerpunkt unbemerkt liegen bleibt.`,
      },
      {
        question: 'Wie funktioniert der Strategie-Check?',
        answer: `Der **Strategie-Check** auf dem Dashboard vergleicht Monat für Monat deine tatsächliche Pin-Arbeit der letzten 30 Tage mit der Strategie, die du festgelegt hast. So siehst du auf einen Blick, ob du auf Kurs bist.

Er schaut sich drei Bereiche an:

1. **Pin-Ziel-Verteilung**: Führen deine Pins auf die Flächen, die du geplant hast?
2. **Pinning-Rhythmus**: Pinnst du so regelmäßig wie vorgenommen?
3. **Content-Säulen**: Bekommen alle deine Themen-Schwerpunkte neue Pins?

Ein **Ampel-System** zeigt pro Bereich, wie es steht: **grün** für auf Kurs, **gelb** für eine kleine Abweichung, **rot** für eine größere Abweichung. So weißt du sofort, wo du nachsteuern kannst.

**Wichtig:** Gezählt werden nur **veröffentlichte und geplante Pins**, keine Entwürfe. Entwürfe sind Arbeitsstände und lenken noch keinen Traffic, daher fließen sie nicht in die Auswertung ein.`,
      },
      {
        question: 'Was sind Signalwörter?',
        answer: `Signalwörter sind Begriffe, die beim Betrachter sofort eine Reaktion auslösen: Neugier, Dringlichkeit oder Vertrauen. Beispiele sind „einfach", „in 5 Minuten" oder „bewährt".

Pin-Flow baut sie in den **KI-Vorschlag** ein, wenn du auf der [Pins-Seite](/dashboard/pin-produktion) neue Pins erstellst. So werden deine Pin-Titel und Beschreibungen klickstärker.

**Du behältst die Kontrolle:** In den [Einstellungen](/dashboard/einstellungen) kannst du die Signalwort-Liste kuratieren. Wähle einzelne Standard-Wörter ab, die nicht zu dir passen, oder ergänze eigene. Die Liste steuert direkt, welche Wörter Pin-Flow dir vorschlägt.

Mehr dazu, wie Signalwörter wirken, in [Pinterest-Wissen](/dashboard/strategie?tab=design&accordion=signalwoerter).`,
      },
    ],
  },
  {
    title: 'Pinterest-Best-Practice',
    items: [
      {
        question: 'Wie viele Pins pro Tag soll ich posten?',
        answer: `**Heute gilt: Qualität vor Quantität.** Pinterest hat seine Empfehlungen in den letzten Jahren stark verändert:

- **Früher (2018-2020):** 20-30 Pins pro Tag waren der Standard
- **Heute (2024-2026):** Pinterest empfiehlt **1-3 hochwertige Pins pro Tag**

**Was wichtig ist:**
- **Frische Inhalte** schlagen Volumen. Ein neuer Pin pro Tag, der auf einen relevanten Inhalt verlinkt, ist besser als 20 Wiederholungen.
- **Konsistenz** ist wichtiger als Frequenz. 5 Pins pro Woche dauerhaft sind besser als 20 Pins eine Woche und dann nichts.
- **Qualität bedeutet:** durchdachtes Cover, klarer Hook, Keywords in Titel und Beschreibung, Verlinkung zu starkem Content.

**Für Einsteiger:innen:** Lieber **3-5 Pins pro Woche**, dafür durchdacht und mit Keywords optimiert. Sobald du den Workflow beherrschst, kannst du auf 1-3 Pins pro Tag hochfahren.

**Dein Pinning-Rhythmus in Pin-Flow:** Im Setup unter [Strategie festlegen](/dashboard/strategie?tab=meine) schlägt dir Pin-Flow eine Frequenz passend zu deiner Anzahl an Inhalten vor:

- **Einsteiger:** 1 bis 3 Pins pro Tag
- **Wachstum:** 3 bis 5 Pins pro Tag
- **Etabliert:** 5 bis 10 Pins pro Tag

Bleib unter 15 Pins pro Tag und pinne dieselbe Seite nicht öfter als alle paar Tage. Wichtig ist nicht die höchste Zahl, sondern dass du regelmäßig dranbleibst.`,
      },
      {
        question: 'Wie häufig darf ich das gleiche Bild verwenden?',
        answer: `Wiederverwenden ist okay, aber mit **Abstand und Variation**.

**Faustregel:**
- Ein konkretes Pin-Bild **nicht öfter als alle 4-6 Wochen** wiederverwenden
- Bei Wiederverwendung: anderes Board, anderer Titel, andere Beschreibung
- **Nie den gleichen Pin am selben Tag mehrfach posten**, Pinterest stuft das als Spam ein

**Besser als reine Wiederverwendung:** Erstelle **Pin-Varianten** desselben Inhalts.
- Anderes Cover-Design (verschiedene Farben, Schriftarten)
- Anderer Hook in der Bild-Überschrift
- Anderes Format (statisches Bild oder Video)
- Andere Pin-Beschreibung mit anderen Keywords

Pinterest belohnt Varianten desselben Inhalts als **frischen Content**: du nutzt die gleiche Quelle, kommunizierst aber an unterschiedliche Suchanfragen.`,
      },
      {
        question: 'Wie viel Vorlauf brauchen saisonale Pins?',
        answer: `Saisonale Inhalte brauchen deutlich mehr Vorlauf, als die meisten denken: **6-12 Wochen vor dem Event** ist der Sweet Spot.

**Warum so früh:**
- Pinterest beginnt schon Wochen vor einem Event, saisonalen Content auszuspielen
- User:innen planen voraus: wer Halloween-Deko sucht, beginnt im September, nicht im Oktober
- Dein Pin braucht Zeit, um vom Algorithmus indexiert und in Such-Ergebnissen platziert zu werden

**Konkrete Vorlauf-Zeiten:**
- **Sommer-Themen** (Mai-August): pinnen ab Februar/März
- **Herbst-Themen** (September-November): pinnen ab Juli
- **Weihnachten/Advent**: pinnen ab September/Oktober
- **Valentinstag**: pinnen ab Dezember

**Wie Pin-Flow dir hilft:** Der [Saisonkalender](/dashboard/saison-kalender) auf dem Dashboard zeigt dir genau, was wann zu produzieren oder zu pinnen ist. Vier Phasen-Spalten (Jetzt produzieren / Jetzt pinnen / Hochphase / Noch Zeit) führen dich durch den optimalen Pinterest-Workflow.`,
      },
      {
        question: 'Wie viele Boards sollte ich haben?',
        answer: `Es gibt keine starre Zahl, wichtiger als die Anzahl ist die **strategische Sauberkeit** deiner Boards.

**Faustregel: Lieber wenige starke Boards als viele schwache.**

- **5-15 fokussierte Boards** sind für die meisten Profile ideal
- Jedes Board sollte ein **klar abgegrenztes Sub-Thema** deiner Hauptnische bedienen
- Boards mit weniger als 10-20 Pins wirken auf Pinterest schwach
- Inaktive Boards (länger als 60 Tage kein neuer Pin) schaden deiner Reichweite

**Was Pin-Flow checkt:** Im Bereich [Board-Gesundheit](/dashboard/boards) unten auf dem Dashboard siehst du:
- **Aktivitätsrate** (Wie viele deiner Boards bekommen regelmäßig neue Pins?)
- **Engagement-Rate pro Board**
- **Inaktive Boards** (>60 Tage): direkt mit Handlungs-Empfehlung

**Wenn du zu viele Boards hast** und es dir schwerfällt, sie alle aktiv zu halten: lieber Boards zusammenführen oder die schwächsten löschen, statt alles halbherzig zu bedienen.`,
      },
    ],
  },
  {
    title: 'App-Navigation',
    items: [
      {
        question: 'Wo finde ich meine Pins?',
        answer: `Im linken Menü unter **[Produktion → Pins](/dashboard/pin-produktion)**. Dort siehst du:

- Alle Pins deines Profils mit Performance-Werten
- Pin-Kategorien (Top Performer, Hidden Gem, Reichweite ohne Wirkung, Eingeschlafener Gewinner)
- Filter- und Sortier-Optionen
- Möglichkeit, Pin-Inhalte zu bearbeiten und neue Pin-Varianten zu produzieren

**Schnellzugriff vom Dashboard:** Im Bereich „Bestehende Pins optimieren" siehst du direkt, welche Pins gerade Aufmerksamkeit brauchen. Klick auf die Kategorie öffnet die konkrete Pin-Liste.`,
      },
      {
        question: 'Wie pflege ich meine Keywords, Inhalte und URLs?',
        answer: `In der Sidebar unter „SETUP" findest du **vier Bereiche** zur Inhalts-Pflege:

**[Content & Strategie](/dashboard/content-inhalte)**: deine **Inhalts-Datenbank**. Hier trägst du alle Inhalte ein, auf die deine Pins verlinken: Blogposts, Produkte, Affiliate-Inhalte. Jeder Inhalt wird verknüpft mit Angebotsart (Blog, Affiliate, Produkt, Dienstleistung), Pin-Anzahl, Keywords, Ziel-URLs und Boards. Über die Ziel-URL bekommt jeder Pin sein Pin-Ziel, also die Fläche, auf die er führt. So weiß Pin-Flow für jeden deiner Inhalte, wie viele Pins schon dafür existieren und wo Lücken sind.

**[Ziel-URLs](/dashboard/ziel-urls)**: alle URLs, auf die deine Pins verlinken (Blog-Artikel, Produktseiten, Affiliate-Links). Mit Priorität und Verknüpfung zu deinen Inhalten und Boards.

**[Keywords](/dashboard/keywords)**: deine Keyword-Datenbank. Pin-Flow zeigt, welche Keywords gut performen, welche ungenutzt sind und welche unter dem Pinterest-Schnitt liegen. Auf dem Dashboard siehst du im Bereich „Keyword-Analyse" konkrete Handlungs-Kategorien (Stark performend, Verstecktes Potenzial, Quick Wins, Überdenken).

**[Boards](/dashboard/boards)**: alle deine Pinterest-Boards mit Aktivitäts-Status und Performance-Werten.

**Empfehlung:** Pflege diese Bereiche **einmal sauber initial** beim Setup, danach nur noch ergänzen, wenn neue Inhalte, Keywords oder URLs dazukommen, z. B. mit jedem neuen Blogartikel oder Produkt. Pin-Flow wird mit jedem zusätzlichen Datenpunkt präziser.`,
      },
    ],
  },
  {
    title: 'Strategie',
    items: [
      {
        question: 'Wie entwickle ich eine Content-Strategie?',
        answer: `Deine Pinterest-Strategie steht auf **vier Bausteinen**, die du im geführten Setup festlegst:

1. **Business-Modell und Hauptnische**: Was beschreibt dich am besten, Blog oder Content-Website, eigener Shop, Dienstleistung oder Affiliate? Mehrfachauswahl ist möglich. Dazu wählst du deine Hauptnische, damit Pin-Flow deine Zahlen mit typischen Werten dieser Nische vergleichen kann.
2. **Pin-Ziel-Verteilung**: Wohin sollen deine Pins die Menschen führen? Du verteilst 100 Prozent auf die Flächen, die für dich zählen: Blog, Shop auf eigener Website, Etsy-Shop, Affiliate-Seite, Landingpage, Newsletter und Lead-Magnet oder Buchungs- und Angebotsseite.
3. **Content-Säulen**: die drei bis fünf großen Themen, um die sich bei dir alles dreht. Pin-Flow leitet sie aus den Kategorien deiner Boards ab. Klare Schwerpunkte helfen Pinterest, dich richtig einzuordnen.
4. **Pinning-Rhythmus**: wie oft du pinnst, als Einsteiger, im Wachstum oder etabliert. Wichtiger als die Menge ist, dass du dranbleibst. Konsistenz schlägt Masse.

**Wichtig:** Deine Strategie ist nicht in Stein gemeißelt. Pin-Flow zeigt dir im **Strategie-Check** auf dem Dashboard, wie deine **tatsächlichen Pins** zu deinem **Plan** passen. Wenn du große Abweichungen siehst, hast du zwei Optionen:

1. Pin-Produktion an den Plan anpassen
2. Plan an die tatsächliche Realität anpassen

Beides ist okay, wichtig ist die **bewusste Entscheidung**.

**Wo lege ich die Strategie in Pin-Flow fest?**

Im geführten Setup unter [Strategie festlegen](/dashboard/strategie?tab=meine). Dort beantwortest du die vier Bausteine Schritt für Schritt und bekommst eine Empfehlung, die du anpassen kannst. Du kannst dein Setup jederzeit erneut öffnen und deine Strategie aktualisieren.

Mehr dazu in [Pinterest-Wissen → Strategie-Modelle](/dashboard/strategie?tab=strategien).`,
      },
      {
        question: 'Wie nutze ich die Prompt-Bibliothek?',
        answer: `Die Prompt-Bibliothek ([Prompts & Vorlagen](/dashboard/ressourcen)) enthält **vorgefertigte KI-Prompts**, die automatisch mit deinen eigenen Daten gefüllt sind.

**So nutzt du einen Prompt:**

1. Öffne den Bereich [Prompts & Vorlagen](/dashboard/ressourcen)
2. Wähle den gewünschten Prompt (aktuell: Brücken-Themen-Ideen)
3. Klick auf „Prompt kopieren": der personalisierte Prompt landet in deiner Zwischenablage
4. Öffne ChatGPT oder Claude in einem neuen Tab
5. Füge den Prompt ein und sende ihn ab
6. Die KI liefert dir 10 konkrete Brücken-Themen-Ideen

**Warum Pin-Flow nicht selbst die KI nutzt:**
- **Keine zusätzlichen Kosten** für dich: du nutzt deine bestehende ChatGPT-/Claude-Anbindung
- **Volle Kontrolle**: du wählst die KI, die du am besten kennst
- **Dauerhaft nutzbar**: auch wenn Pin-Flow später nicht mehr aktiv betreut wird

**Tipp:** Speichere die Antworten der KI in deinem Notion oder in einem Google-Doc. So baust du dir mit der Zeit deine eigene Brücken-Themen-Datenbank auf.`,
      },
    ],
  },
]
