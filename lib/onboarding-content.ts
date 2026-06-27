// V3.5 — Inhalte des Käufer-Onboardings als strukturierte Daten.
//
// Reine Daten (kein React). Die generische Schritt-Ansicht
// (app/dashboard/onboarding/StepView.tsx) rendert blocks + ctas; die
// vier interaktiven Schritte (special) bekommen zusätzliche UI im Client.
//
// Routen sind gegen components/Sidebar.tsx verifiziert — insbesondere
// Pins = /dashboard/pin-produktion und das Strategie-Onboarding =
// /dashboard/strategie?tab=meine (Tab-Key „meine", nicht „mein-setup").

export type OnboardingPhaseKey = 'einstieg' | 'setup' | 'produktion'

export type OnboardingPhase = {
  key: OnboardingPhaseKey
  label: string
}

export const ONBOARDING_PHASES: Record<OnboardingPhaseKey, OnboardingPhase> = {
  einstieg: { key: 'einstieg', label: 'EINSTIEG' },
  setup: { key: 'setup', label: 'SETUP' },
  produktion: { key: 'produktion', label: 'PRODUKTION & ANALYSE' },
}

// Inline-Markdown in `text`: **fett**. Links laufen über ctas (Buttons).
// `intro` = größerer Lead-Absatz (Welcome-Style). `divider` = dezente Trennlinie.
export type OBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'callout'; text: string }
  | { kind: 'intro'; text: string }
  | { kind: 'footnote'; text: string }
  | { kind: 'divider' }

export type OCta = {
  label: string
  href: string
  // true → neuer Tab (externe Links + Setup-Sprünge, Onboarding bleibt offen)
  newTab?: boolean
  variant: 'primary' | 'secondary'
}

export type OnboardingStepSpecial =
  | 'business-check'
  | 'profile-form'
  | 'strategy'
  | 'completion'

export type OnboardingStepDef = {
  id: number
  phase: OnboardingPhase
  // Unter-Fortschritt innerhalb der Phase, z. B. „Setup: Schritt 1 von 6".
  phaseProgress?: string
  title: string
  blocks: OBlock[]
  ctas?: OCta[]
  // Wenn gesetzt, rendert StepView neben den CTAs einen sekundären
  // „Skip + weiter"-Button mit diesem Label. Schaltet zum nächsten Schritt
  // ohne Warnung — gedacht für Schritte mit prominentem Primär-CTA, bei
  // denen man trotzdem direkt weitergehen können soll.
  inlineSkipLabel?: string
  // „Diesen Schritt überspringen" sichtbar?
  skippable: boolean
  skipWarning?: string
  special?: OnboardingStepSpecial
}

const P = ONBOARDING_PHASES

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // ---- Schritt 0 — Welcome ----
  {
    id: 0,
    phase: P.einstieg,
    title: 'Willkommen in deinem Pin-Flow Cockpit.',
    blocks: [
      {
        kind: 'intro',
        text: 'Dieses Cockpit vereint ein System aus Strategie, Analytics und klaren Handlungsempfehlungen: dein zentraler Hub für deine gesamte Pinterest-Strategie.',
      },
      {
        kind: 'intro',
        text: 'Keyword-Datenbank, Pin-Produktionsplanung, saisonale Themenvorschläge, Performance-Analyse und Content-Hub in einem.',
      },
      {
        kind: 'intro',
        text: 'Alles an einem Ort. Klarer Plan, was wann ansteht. Datenbasierte Entscheidungen statt Bauchgefühl.',
      },
      {
        kind: 'intro',
        text: 'Mit diesem System baust du dir etwas auf, das monatelang Evergreen-Traffic generiert, während du offline bist. **Pin to Profit.**',
      },
      { kind: 'divider' },
      {
        kind: 'p',
        text: 'Damit das System optimal für dich arbeiten kann, richten wir in den nächsten Schritten alles gemeinsam ein:',
      },
      {
        kind: 'ul',
        items: [
          'Deine Pinterest-Strategie',
          'Deine Inhalte, URLs, Keywords und Boards',
          'Deinen Saisonkalender',
          'Deine ersten Pins und Analytics',
        ],
      },
      {
        kind: 'p',
        text: 'Du kannst jederzeit pausieren, dein Fortschritt wird automatisch gespeichert.',
      },
    ],
    skippable: false,
  },

  // ---- Schritt 1 — Was Pin-Flow für dich tut ----
  {
    id: 1,
    phase: P.einstieg,
    title: 'Was macht Pin-Flow anders?',
    blocks: [
      {
        kind: 'h',
        text: 'Ein System, in dem alles ineinandergreift, statt verstreuter Listen.',
      },
      {
        kind: 'p',
        text: 'Andere Pinterest-Tools sind reine Scheduler. Excel-Tabellen sind manuell und vergesslich. Pin-Flow ist die zentrale Plattform, in der alles zusammenhängt: deine Inhalte, Keywords, Ziel-URLs, Boards und Analytics greifen ineinander, statt nebeneinanderher zu existieren.',
      },
      { kind: 'p', text: 'Was das konkret bedeutet:' },
      {
        kind: 'ul',
        items: [
          'Du trägst einen Blogartikel einmal ein und verknüpfst ihn mit Keywords, Ziel-URL und Board. Pin-Flow weiß dann sofort: Dieser Inhalt braucht Pins mit diesen Keywords, die auf diese URL verlinken, und zeigt dir, wo noch Pin-Lücken sind.',
          'Du legst deine Strategie einmal fest und bekommst daraus konkrete Empfehlungen für deine nächsten Pins, nicht allgemein, sondern auf deine Inhalte bezogen.',
          'Dein monatliches Analytics-Update läuft als fester Ablauf: Daten in wenigen Minuten importieren, Pins zuordnen, fertig. Kein verstreutes Excel-Geflicke mehr, das du dir jeden Monat neu zusammensuchst.',
        ],
      },
      {
        kind: 'p',
        text: 'Pin-Flow nimmt dir die Arbeit nicht ab, aber es sorgt dafür, dass deine Arbeit am Richtigen ansetzt. Keine Stunde mehr, die in Pins fließt, von denen du nicht weißt, ob sie etwas bringen.',
      },
      { kind: 'h', text: 'Alle Pinterest-Daten verknüpft an einem Ort' },
      {
        kind: 'p',
        text: 'Pin-Flow ist eine vernetzte Datenbank für deine Pinterest-Strategie. Sobald ein Inhalt mit seinen Keywords, seiner URL und seinem Board verbunden ist, hängt alles zusammen, und du siehst auf einen Blick, was zusammengehört und wo noch etwas fehlt. Statt fünf loser Listen hast du ein Bild.',
      },
      { kind: 'h', text: 'Deine Keyword-Datenbank: das Herzstück' },
      {
        kind: 'p',
        text: 'Pinterest-Erfolg läuft über Suchworte. Mit jedem monatlichen Analytics-Import lernt deine Keyword-Datenbank dazu: Welche Worte bringen Klicks, welche bleiben ohne Wirkung, wo liegen die Quick Wins? So siehst du Schwarz auf Weiß, worauf du setzen solltest, statt es zu raten.',
      },
      { kind: 'h', text: 'Pin-Flow vergisst nicht' },
      {
        kind: 'p',
        text: 'Pinterest zeigt deine Analytics-Daten nur begrenzt rückwirkend. Pin-Flow archiviert sie dauerhaft. Nach einem Jahr weiß deine App mehr über deine Pinterest-Entwicklung als Pinterest selbst anzeigt, du siehst Langzeit-Trends, die sonst einfach verloren wären. Das kann kein Scheduler und keine Excel-Tabelle.',
      },
      { kind: 'h', text: 'Auf dich personalisiert' },
      {
        kind: 'p',
        text: 'Jede Diagnose, jede Strategie-Empfehlung, jeder KI-Prompt ist mit deinen echten Daten gefüllt. Keine allgemeinen Tipps von der Stange, sondern Hinweise, die zu deinem Profil, deinen Inhalten und deinen Zahlen passen.',
      },
    ],
    skippable: false,
  },

  // ---- Schritt 2 — Zielgruppe ----
  {
    id: 2,
    phase: P.einstieg,
    title: 'Wen willst du auf Pinterest erreichen?',
    blocks: [
      {
        kind: 'intro',
        text: 'Bevor du dein Profil einrichtest, Keywords sammelst oder Boards anlegst, brauchst du eine klare Antwort auf eine Frage: Wen willst du auf Pinterest erreichen? Diese Antwort ist die Brille, durch die du alles andere planst.',
      },
      {
        kind: 'p',
        text: 'Pinterest ist eine Suchmaschine. Menschen tippen dort ein, was sie suchen, planen oder träumen. Wenn du genau weißt, wer diese Menschen sind, was sie umtreibt und welche Worte sie benutzen, triffst du mit jedem Pin ins Schwarze. Wenn nicht, produzierst du an ihnen vorbei.',
      },
      {
        kind: 'ul',
        items: [
          'Wer ist dein idealer Mensch auf Pinterest, möglichst konkret, nicht „Frauen zwischen 30 und 50", sondern eine echte Person mit echtem Anliegen',
          'Was sucht diese Person, welches Problem will sie lösen, welches Ziel erreichen',
          'Welche Begriffe tippt sie in die Suche, in ihrer Sprache, nicht in deiner Fachsprache',
        ],
      },
      {
        kind: 'callout',
        text: 'Die Zielgruppe bestimmt deine Keywords, deine Boards und deine Pin-Texte. Deshalb steht sie am Anfang. Wie du deine Zielgruppe sauber herausarbeitest, zeigt dir [Zielgruppe verstehen](/dashboard/strategie?tab=audience) auf der Wissensseite.',
      },
    ],
    ctas: [
      {
        label: 'Zielgruppe verstehen',
        href: '/dashboard/strategie?tab=audience',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 3 — Business-Account-Check ----
  {
    id: 3,
    phase: P.einstieg,
    title: 'Hast du einen Pinterest-Business-Account?',
    blocks: [
      {
        kind: 'p',
        text: 'Pin-Flow funktioniert nur mit einem **Business-Account**: die Analytics-Daten sind sonst nicht verfügbar. Die Umstellung ist kostenlos und in 2 Minuten erledigt.',
      },
    ],
    special: 'business-check',
    skippable: true,
    skipWarning:
      'Ohne Business-Account stehen dir keine Analytics-Daten zur Verfügung: Pin-Flow funktioniert dann nur eingeschränkt.',
  },

  // ---- Schritt 4 — Profil & Pinterest-Zugang ----
  {
    id: 4,
    phase: P.setup,
    title: 'Personalisiere deine App',
    blocks: [
      {
        kind: 'p',
        text: 'Drei Angaben, damit Pin-Flow dich persönlich begrüßt und dich beim monatlichen Update direkt zu Pinterest führt. Alle Angaben kannst du jederzeit in den Einstellungen anpassen.',
      },
      {
        kind: 'callout',
        text: 'Überlege, nach welchen Keywords deine Zielgruppe sucht. Wenn möglich, verwende die wichtigsten davon natürlich integriert in deiner Profilbeschreibung.',
      },
    ],
    special: 'profile-form',
    skippable: true,
  },

  // ---- Schritt 5 — Dein Content ----
  {
    id: 5,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 1 von 7',
    title: 'Trage deine Inhalte ein',
    blocks: [
      {
        kind: 'p',
        text: 'Das Fundament deiner Pinterest-Strategie sind die Inhalte, auf die deine Pins verlinken: Blogartikel, Produkte, Affiliate-Inhalte.',
      },
      {
        kind: 'p',
        text: 'Im Bereich **„Dein Content"** trägst du alle deine Inhalte ein, jeder mit:',
      },
      {
        kind: 'ul',
        items: [
          'Typ (Blogpost / Affiliate / Produkt / Dienstleistung)',
          'Ziel-URL (die Seite, auf die dein Pin verlinken soll)',
          'Board (optional, wenn du schon Boards hast)',
          'Keywords und Strategie kannst du später ergänzen',
        ],
      },
      {
        kind: 'p',
        text: 'Pin-Flow weiß so für jeden deiner Inhalte, wie viele Pins schon existieren und wo Lücken sind.',
      },
      {
        kind: 'callout',
        text: 'Tipp: Starte mit deinen wichtigsten Inhalten. Du kannst jederzeit weitere ergänzen, zum Beispiel wenn ein neues Produkt, Angebot oder ein neuer Blogbeitrag erscheint.',
      },
    ],
    ctas: [
      {
        label: 'Jetzt Content eintragen',
        href: '/dashboard/content-inhalte',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 6 — Ziel-URLs ----
  {
    id: 6,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 2 von 7',
    title: 'Sammle deine Ziel-URLs',
    blocks: [
      {
        kind: 'p',
        text: 'Ziel-URLs sind die Landingpages, auf die deine Pins verlinken: Blogbeiträge, Produktseiten, Affiliate-Links und dein Dienstleistungsangebot.',
      },
      {
        kind: 'p',
        text: 'Pflege hier alle URLs, die du auf Pinterest bewerben willst. Pin-Flow verknüpft die URLs automatisch mit deinen Inhalten und zeigt dir später, welche URLs Traffic bringen und welche nicht.',
      },
      {
        kind: 'callout',
        text: 'Jeder Pin sollte eine Ziel-URL haben. Ohne Ziel-URL verschenkst du den Traffic-Effekt deiner Pinterest-Arbeit.',
      },
      {
        kind: 'callout',
        text: 'Wenn du bereits viele URLs hast, nutze den „URLs importieren"-Button. So lädst du mehrere URLs auf einmal hoch.',
      },
    ],
    ctas: [
      {
        label: 'Jetzt URLs pflegen',
        href: '/dashboard/ziel-urls',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 7 — Keywords (Herzstück) ----
  {
    id: 7,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 3 von 7',
    title: 'Deine Keyword-Datenbank: das Herzstück',
    blocks: [
      {
        kind: 'p',
        text: 'Pinterest ist keine Social-Media-Plattform. Pinterest ist eine Suchmaschine. Das bedeutet: du wirst nur gefunden, wenn du die richtigen Keywords verwendest. Die Keyword-Recherche ist deshalb eine der wichtigsten Arbeiten für deinen Pinterest-Erfolg.',
      },
      {
        kind: 'p',
        text: 'Deine Keyword-Datenbank ist eines der **wertvollsten Elemente** von Pin-Flow:',
      },
      { kind: 'h', text: 'Mit jedem Analytics-Import lernt sie dazu' },
      {
        kind: 'p',
        text: 'Welche deiner Keywords bringen tatsächlich Klicks? Welche bleiben ohne Wirkung? Wo sind ungenutzte Quick Wins?',
      },
      { kind: 'h', text: 'Aus den Daten entstehen Handlungs-Kategorien' },
      {
        kind: 'p',
        text: 'Auf dem Dashboard siehst du später:',
      },
      {
        kind: 'ul',
        items: [
          'Stark performende Keywords: mehr davon produzieren',
          'Verstecktes Potenzial: ungenutzte Keywords mit Chance',
          'Quick Wins: untergenutzte Keywords über Schnitt',
          'Keywords überdenken: schwache Performer',
        ],
      },
      {
        kind: 'p',
        text: 'Beim Start: Trage so viele passende Keywords ein wie du finden kannst. Mit der Zeit zeigt dir das System, welche wirklich funktionieren.',
      },
      {
        kind: 'callout',
        text: 'Tipp: Die wichtigste Methode zur Keyword-Recherche ist die Pinterest-Suchleiste selbst. Gib ein Stichwort ein und schau, welche Ergänzungen Pinterest vorschlägt. Pinterest-Trends ist ein zusätzliches Tool. Weitere Methoden findest du in → [Pinterest-Wissen](/dashboard/strategie?tab=keywords).',
      },
    ],
    ctas: [
      {
        label: 'Jetzt Keywords pflegen',
        href: '/dashboard/keywords',
        newTab: true,
        variant: 'primary',
      },
      {
        label: 'Pinterest Trends öffnen',
        href: 'https://trends.pinterest.com',
        newTab: true,
        variant: 'secondary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 8 — Boards ----
  {
    id: 8,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 4 von 7',
    title: 'Lege deine Boards an',
    blocks: [
      {
        kind: 'p',
        text: 'Boards sind die thematischen Kategorien deines Pinterest-Profils. Sie helfen Pinterest zu verstehen, worum es bei dir geht, und sie geben deinem Profil Struktur.',
      },
      {
        kind: 'p',
        text: 'Faustregel: lieber wenige, fokussierte Boards als viele schwache.',
      },
      {
        kind: 'ul',
        items: [
          'Etwa 5 bis 20 Boards sind für die meisten Profile ideal, lieber wenige scharfe als viele schwache',
          'Jedes Board sollte ein klar abgegrenztes Sub-Thema bedienen',
          'Boards unter 10-20 Pins wirken auf Pinterest schwach',
        ],
      },
      {
        kind: 'p',
        text: '**Wichtig:** Jedes Board braucht einen keywordreichen Namen und eine aussagekräftige Beschreibung (ebenfalls mit relevanten Keywords). Das hilft Pinterest, dein Board den richtigen Nutzern zu zeigen.',
      },
      { kind: 'p', text: 'Im Boards-Bereich kannst du:' },
      {
        kind: 'ul',
        items: [
          'Bestehende Pinterest-Boards einlesen',
          'Neue Boards anlegen',
          'Aktivitäts-Status sehen (welche Boards sind aktiv, welche eingeschlafen?)',
        ],
      },
    ],
    ctas: [
      {
        label: 'Zu deinen Boards',
        href: '/dashboard/boards',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 9 — Saisonkalender ----
  {
    id: 9,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 5 von 7',
    title: 'Pflege deinen Saisonkalender',
    blocks: [
      {
        kind: 'p',
        text: 'Saisonale Inhalte sind ein riesiger Pinterest-Hebel, aber nur, wenn du sie rechtzeitig produzierst.',
      },
      {
        kind: 'p',
        text: 'Der Saisonkalender zeigt dir für jedes Event vier Phasen:',
      },
      {
        kind: 'ul',
        items: [
          'Jetzt produzieren: Material vorbereiten',
          'Jetzt pinnen: Pin-Fenster offen',
          'Hochphase: nicht mehr diese Saison / Event bepinnen',
          'Noch Zeit: Ideen sammeln',
        ],
      },
      {
        kind: 'callout',
        text: 'Pflege den Kalender einmal jährlich für die nächsten 2 Jahre mit allen relevanten Events deiner Nische: Feiertage, Jahreszeiten und branchenspezifische Anlässe. Der KI-Prompt-Button hilft dir dabei, passende Events für deine Nische zu finden.',
      },
      {
        kind: 'p',
        text: 'Beispiele für einen Rezepte-Blog:',
      },
      {
        kind: 'ul',
        items: [
          'Sommerrezepte und Grillsaison (Event: Juni/Juli): pinnen ab Ende Februar bis Mitte April',
          'Halloween-Rezepte (Event: 31. Oktober): im Juli und August pinnen',
          'Weihnachtsbäckerei und Festessen (Event: Dezember): pinnen ab Anfang August bis Ende September',
          'Detox und Neustart (Event: Januar): ab Oktober pinnen',
        ],
      },
      {
        kind: 'p',
        text: 'Bei anderer Nische entsprechend deine eigenen Anlässe und Zeitfenster.',
      },
      {
        kind: 'p',
        text: 'Mehr zum Thema Saisonalität und richtiges Timing findest du in → [Pinterest-Wissen](/dashboard/strategie?tab=grundlagen) (Abschnitt Saisonalität & Pinterest-Timing).',
      },
    ],
    ctas: [
      {
        label: 'Saisonkalender pflegen',
        href: '/dashboard/saison-kalender',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 10 — Einstellungen + Strategie-Onboarding ----
  {
    id: 10,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 6 von 7',
    title: 'Deine Strategie festlegen',
    blocks: [
      {
        kind: 'p',
        text: 'Pinterest belohnt keine Aktivität. Pinterest belohnt Relevanz und Konsistenz. Wer ohne Strategie pinnt, verschwendet Zeit. Wer mit Strategie pinnt, baut ein System, das auch arbeitet, während er schläft.',
      },
      { kind: 'p', text: 'Eine klare Strategie legt fest:' },
      {
        kind: 'ul',
        items: [
          'Wen du auf Pinterest erreichen willst',
          'Was du dieser Person anbieten willst',
          'Wie aus Pinterest-Traffic echte Ergebnisse für dein Business werden',
        ],
      },
      {
        kind: 'p',
        text: 'Pinterest braucht 3-6 Monate, um dein Profil thematisch einzuordnen. Mit klarer Strategie geht das deutlich schneller.',
      },
      { kind: 'p', text: 'Pin-Flow führt dich durch fünf Fragen:' },
      {
        kind: 'ol',
        items: [
          'Was ist dein Pinterest-Hauptziel?',
          'Wen willst du auf Pinterest erreichen?',
          'Welche Inhalte und Angebote bringst du mit?',
          'Welches Business-Modell beschreibt dich am besten?',
          'Woran misst du Erfolg?',
        ],
      },
      {
        kind: 'p',
        text: 'Aus deinen Antworten entsteht eine personalisierte Strategie-Empfehlung mit konkreten Prozent-Werten. Sie ist ein Startpunkt, kein Gesetz. Du kannst sie jederzeit anpassen.',
      },
      {
        kind: 'footnote',
        text: 'Optional: In den Einstellungen findest du alle Schwellwerte für die Pin-Bewertung. Die Standardwerte passen für die meisten Profile. [Zu den Einstellungen](/dashboard/einstellungen)',
      },
    ],
    special: 'strategy',
    skippable: true,
    skipWarning:
      'Ohne festgelegte Strategie funktioniert der Strategie-Check auf dem Dashboard nicht. Du kannst die Strategie jederzeit nachholen.',
  },

  // ---- Schritt 11 — Dein Marken-Design ----
  {
    id: 11,
    phase: P.setup,
    phaseProgress: 'Setup: Schritt 7 von 7',
    title: 'Dein Marken-Design',
    blocks: [
      {
        kind: 'intro',
        text: 'Bevor du deinen ersten Pin erstellst, lohnt sich ein Schritt, der dir auf Pinterest einen echten Vorsprung gibt: ein durchgängiges Design für deine Pins.',
      },
      {
        kind: 'p',
        text: 'Vertrauen und Markenidentität sind heute das Wichtigste. Menschen kaufen erst, wenn sie einer Marke vertrauen, und Vertrauen entsteht durch Wiedererkennung. Wenn deine Pins eine klare, einheitliche Bildsprache haben, prägt sich deine Marke ein, und genau das zahlt am Ende auf deine Verkäufe ein.',
      },
      {
        kind: 'callout',
        text: 'Achte darauf, deine Canva-Vorlagen nach deinem Marken-Design auszurichten, gleiche Farben, gleiche Schriften, gleiche Handschrift in jedem Pin. Deine Vorlagen findest du in [Canva-Vorlagen](/dashboard/canva-vorlagen).',
      },
    ],
    ctas: [
      {
        label: 'Zu deinen Canva-Vorlagen',
        href: '/dashboard/canva-vorlagen',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 12 — Pins ----
  {
    id: 12,
    phase: P.produktion,
    phaseProgress: 'Produktion: Schritt 1 von 2',
    title: 'Deine Pins: erstellen oder importieren',
    blocks: [
      {
        kind: 'p',
        text: 'In Pin-Flow gibt es zwei Wege, mit deinen Pins zu arbeiten:',
      },
      { kind: 'h', text: 'Bestehende Pins importieren' },
      {
        kind: 'p',
        text: 'Wenn du schon Pins auf Pinterest hast, kannst du sie als CSV-Datei in Pin-Flow importieren. So bleibt deine bisherige Arbeit erhalten und du kannst sie analysieren und weiter optimieren.',
      },
      { kind: 'h', text: 'Neue Pins erstellen' },
      {
        kind: 'p',
        text: 'Plane neue Pins direkt in Pin-Flow: Titel, Beschreibung, Keywords und Verknüpfung zu deinen Inhalten und Boards. Pin-Flow erstellt dir auf Wunsch einen fertigen Prompt für ChatGPT oder Claude.',
      },
      {
        kind: 'callout',
        text: 'Wichtig zu wissen: Pin-Flow veröffentlicht keine Pins bei Pinterest. Pin-Flow ist dein Strategie- und Tracking-Tool, kein Scheduler. Die fertigen Pins lädst du weiterhin selbst bei Pinterest hoch oder nutzt einen Pinterest-Scheduler wie Tailwind oder Later.',
      },
    ],
    ctas: [
      {
        label: 'Zu deinen Pins',
        href: '/dashboard/pin-produktion',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 13 — Analytics importieren ----
  {
    id: 13,
    phase: P.produktion,
    phaseProgress: 'Auswertung: Schritt 2 von 2',
    title: 'Importiere deine Analytics',
    blocks: [
      {
        kind: 'p',
        text: 'Ohne Analytics keine Optimierung. Im Analytics-Bereich von Pin-Flow trägst du regelmäßig deine Pinterest-Zahlen ein. Daraus entsteht deine Performance-Übersicht, die Pin-Diagnose und die strategische Auswertung.',
      },
      { kind: 'h', text: 'Wichtig zu wissen' },
      {
        kind: 'p',
        text: 'Analytics-Import macht erst Sinn, sobald du Pins im System hast und diese mindestens 4-6 Wochen auf Pinterest aktiv sind. Vorher hat Pinterest noch keine belastbaren Performance-Daten geliefert.',
      },
      { kind: 'p', text: 'Was du importierst:' },
      {
        kind: 'ul',
        items: [
          'Profil-Performance: Gesamtwerte für Klicks, Saves, CTR und Impressionen',
          'Top Pins nach Klicks, Saves und Impressionen (3 separate CSVs). Pinterest exportiert für jede Metrik eine eigene Liste. So siehst du, welche Pins klick-stark sind, welche viel gespeichert werden und welche hohe Reichweite haben.',
          'Zielgruppen-Daten (Audience Insights CSV): wer interagiert mit deinen Pins',
        ],
      },
      {
        kind: 'p',
        text: 'Beim ersten Mal etwa 10 Minuten. Danach 5 Minuten pro Monat. Pinterest liefert die Daten in 30-Tage-Fenstern.',
      },
      {
        kind: 'callout',
        text: 'Pinterest zeigt deine Analytics nur begrenzt rückwirkend. Pin-Flow archiviert sie dauerhaft, sodass du nach einem Jahr Jahr-zu-Jahr-Vergleiche ziehen kannst, die in Pinterest längst nicht mehr sichtbar wären: Welche saisonalen Themen liefen letztes Jahr stark? Welche Pins haben sich über Zeit verbessert? Diese Auswertung wäre ohne Pin-Flow nicht möglich.',
      },
    ],
    ctas: [
      {
        label: 'Analytics importieren',
        href: '/dashboard/analytics',
        newTab: true,
        variant: 'primary',
      },
    ],
    skippable: true,
  },

  // ---- Schritt 14 — Dein System steht ----
  {
    id: 14,
    phase: P.produktion,
    title: 'Dein System steht.',
    blocks: [
      {
        kind: 'p',
        text: 'Du hast dein Setup abgeschlossen. Pin-Flow kennt jetzt dein Business, deine Strategie, deine Inhalte und falls importiert auch deine ersten Analytics. Damit ist die Basis gelegt.',
      },
      { kind: 'h', text: 'Dein Doppelnutzen ab heute' },
      {
        kind: 'p',
        text: 'Du gewinnst zwei Dinge: Zeit und Klarheit. Zeit, weil du nicht mehr in Excel-Tabellen und Notiz-Apps springst. Klarheit, weil du auf einen Blick siehst was wann ansteht.',
      },
      {
        kind: 'ul',
        items: [
          'Keine Excel-Tabellen mehr für Pinterest-Strategie',
          'Keine Pin-Brainstormings am leeren Blatt, Pin-Flow zeigt dir Lücken und Empfehlungen',
          'Kein Suchen nach „Wo war nochmal welcher Pin?", alles verknüpft und auffindbar',
        ],
      },
      {
        kind: 'p',
        text: 'Pin-Flow zahlt sich doppelt aus: weniger Zeit für Strategie und Tracking, mehr Reichweite durch konsequentes, datenbasiertes Arbeiten.',
      },
      { kind: 'h', text: 'Dein Pinterest-Rhythmus ab jetzt' },
      {
        kind: 'ul',
        items: [
          'Monatlich 15-20 Minuten Analytics-Update',
          '1 Tag Pin-Produktion pro Monat (Batch-Producing)',
          'Jährlich Saisonkalender für die nächsten 2 Jahre aktualisieren',
        ],
      },
      {
        kind: 'callout',
        text: 'Pin-Flow ist dein dauerhaftes Archiv. Jeder Datenpunkt den du heute einpflegst, ist in 2 Jahren noch da. Auch wenn Pinterest die Daten längst nicht mehr anzeigt. So baust du dir ein Asset auf, das dir niemand nehmen kann.',
      },
    ],
    skippable: false,
  },

  // ---- Schritt 15 — Pinterest ist ein Marathon, kein Sprint ----
  {
    id: 15,
    phase: P.produktion,
    title: 'Pinterest ist ein Marathon, kein Sprint',
    blocks: [
      {
        kind: 'intro',
        text: 'Dein System steht. Jetzt kommt der Teil, der über Erfolg entscheidet: dranbleiben und in Zyklen denken.',
      },
      {
        kind: 'p',
        text: 'Dein Weg auf Pinterest läuft immer im selben Kreis: Du pinnst, du wertest aus, du optimierst, und dann pinnst du wieder. Je öfter du diesen Kreis durchläufst, desto besser wirst du, weil du mit jeder Runde mehr über deine Zielgruppe lernst und Pin-Flow dir die richtigen Stellschrauben zeigt.',
      },
      {
        kind: 'p',
        text: 'Eine Sache musst du wissen, damit du nicht zu früh aufgibst: Pinterest braucht Zeit. Ein neuer Pin wird nicht sofort voll ausgespielt, das dauert oft 60 bis 90 Tage. Dein Dashboard wird also erst nach etwa drei Monaten wirklich aussagekräftig. Wenn du nach vier Wochen auswertest, sind die Zahlen noch nicht final, das ist normal und kein Grund zur Sorge.',
      },
      {
        kind: 'ul',
        items: [
          'Pinnen, regelmäßig und mit Plan, nicht in Schüben',
          'Auswerten, einmal im Monat, mit dem Wissen, dass die Daten erst nach Monaten valide werden',
          'Optimieren, anhand der Vorschläge, die dir Pin-Flow macht',
          'Wieder pinnen, mit dem, was du gelernt hast',
        ],
      },
      {
        kind: 'p',
        text: 'Bleib dran. Nach etwa drei Monaten fängt Pinterest an, dich auszuspielen, und du bekommst Stück für Stück mehr Klicks auf deine Website. Achte dort darauf, die Customer Journey einzuhalten, damit aus Klicks auch Ergebnisse werden. Je länger und konsequenter du den Kreislauf fährst, desto stärker wirst du.',
      },
    ],
    special: 'completion',
    skippable: false,
  },
]

export function getOnboardingStep(id: number): OnboardingStepDef {
  return (
    ONBOARDING_STEPS.find((s) => s.id === id) ?? ONBOARDING_STEPS[0]
  )
}
