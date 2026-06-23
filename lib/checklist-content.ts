// V3.6 — Setup-Checkliste: 23 Punkte in 6 Kategorien als strukturierte
// Daten (kein React). Die item-`id`s sind stabil — sie werden in
// einstellungen.checklist_state persistiert; nicht umbenennen.
//
// Routen sind gegen components/Sidebar.tsx + StrategieClient-Tab-Keys
// verifiziert: Strategie-Tabs heißen `grundlagen` („So funktioniert
// Pinterest"), `design` („Pin-Gestaltung"), `keywords`, `meine`
// („Mein Setup"). Deep-Links auf neue Wissens-Bereiche nutzen
// `&accordion=<anchorId>` (V3.6 Fix 4).

export type ChecklistLinkType = 'app' | 'knowledge'

export type ChecklistLink = {
  label: string
  href: string
  type: ChecklistLinkType
  // externe Links (z. B. Pinterest) → neuer Tab
  external?: boolean
}

export type ChecklistItem = {
  id: string
  title: string
  description: string
  links: ChecklistLink[]
}

export type ChecklistCategory = {
  id: string
  title: string
  // Name eines PinKategorieIcon (Outline, currentColor) statt Emoji.
  icon?: string
  items: ChecklistItem[]
}

const K = (label: string, href: string): ChecklistLink => ({
  label,
  href,
  type: 'knowledge',
})
const A = (label: string, href: string): ChecklistLink => ({
  label,
  href,
  type: 'app',
})

// Häufig genutzte Wissens-Ziele. Jeder Link öffnet den passenden Tab UND
// klappt das richtige Accordion auf (siehe Accordion `anchorId` in
// StrategieClient.tsx).
const WAS_PINTEREST = '/dashboard/strategie?tab=grundlagen&accordion=was-pinterest-wirklich-ist'
const PROFIL_SETUP =
  '/dashboard/strategie?tab=grundlagen&accordion=profil-setup'
const DOMAIN_VERIF =
  '/dashboard/strategie?tab=grundlagen&accordion=domain-verifizierung'
const GEHEIME_BOARDS =
  '/dashboard/strategie?tab=grundlagen&accordion=geheime-boards'
const MULTI_BOARD =
  '/dashboard/strategie?tab=grundlagen&accordion=multi-board-pinning'
const RANKING_FAKTOREN =
  '/dashboard/strategie?tab=faktoren&accordion=9-ranking-faktoren'
const SAISONALITAET =
  '/dashboard/strategie?tab=grundlagen&accordion=saisonalitaet'
const CUSTOMER_JOURNEY =
  '/dashboard/strategie?tab=design&accordion=customer-journey'
const BILDER_OCR = '/dashboard/strategie?tab=design&accordion=bilder-ocr'
const DESIGN_PRINZIPIEN =
  '/dashboard/strategie?tab=design&accordion=design-prinzipien'
const PIN_FELDER = '/dashboard/strategie?tab=keywords&accordion=pin-felder'
const SICHTBARKEIT_KEYWORDS =
  '/dashboard/strategie?tab=keywords&accordion=sichtbarkeit-keywords'

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    id: 'pinterest-setup',
    title: 'Pinterest-Account einrichten',
    icon: 'settings',
    items: [
      {
        id: 'business-account',
        title: 'Pinterest Business-Account aktiviert',
        description:
          'Privater Account wird zu Business in 2 Min umgestellt (kostenlos).',
        links: [K('Was Pinterest wirklich ist', WAS_PINTEREST)],
      },
      {
        id: 'username-keyword',
        title: 'Benutzername mit Keyword optimiert',
        description: 'Beispiel: „yogaflow-studio" statt „Jana_123".',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
      {
        id: 'profile-image',
        title: 'Profilbild hochgeladen',
        description:
          'Dein Gesicht (Personal Brand) oder Logo (Brand): klar erkennbar auch klein.',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
      {
        id: 'profile-name',
        title: 'Profilname im Format „Name | Was du tust" gesetzt',
        description:
          'Format-Empfehlung: „dein-Markenname | Was du tust". Beispiel: „yogaflow-studio | Yoga & Selbstfürsorge".',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
      {
        id: 'profile-description',
        title: 'Profilbeschreibung mit Keywords und klarer Positionierung',
        description:
          'Wichtigste Keywords möglichst weit vorne platzieren (Pinterest ist eine Suchmaschine). Die „Ich helfe…"-Formel ist empfehlenswert für klare Positionierung, aber kein Muss.',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
    ],
  },
  {
    id: 'account-verknuepfen',
    title: 'Pinterest-Account verknüpfen',
    icon: 'url',
    items: [
      {
        id: 'domain-verified',
        title: 'Domain verifiziert',
        description:
          'Gibt dir Pin-Analytics pro URL. Ohne das funktioniert vieles in Pin-Flow nicht.',
        links: [K('Domain-Verifizierung', DOMAIN_VERIF)],
      },
      {
        id: 'cover-image',
        title: 'Cover-Bild hochgeladen',
        description:
          'Format: 800 × 450 px, repräsentiert deine Nische und Brand.',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
      {
        id: 'search-visibility',
        title: 'Suchmaschinen-Sichtbarkeit aktiviert',
        description:
          '„Profil vor Suchmaschinen verbergen" muss in Pinterest deaktiviert sein.',
        links: [K('Profil-Setup', PROFIL_SETUP)],
      },
    ],
  },
  {
    id: 'pinflow-setup',
    title: 'Pin-Flow-Setup',
    icon: 'gauge',
    items: [
      {
        id: 'strategy-onboarding',
        title: 'Strategie-Onboarding durchlaufen',
        description:
          'Definiert dein Business-Modell, Conversion-Ziele und Pin-Format-Mix.',
        links: [
          A('Strategie-Onboarding starten', '/dashboard/strategie?tab=meine'),
        ],
      },
      {
        id: 'content-min-5',
        title: 'Deine Inhalte in „Dein Content" eingetragen',
        description:
          'Alle deine Blogartikel, Produkte oder Affiliate-Inhalte mit Keywords, URLs und Boards verknüpft.',
        links: [A('Zu Dein Content', '/dashboard/content-inhalte')],
      },
      {
        id: 'keywords-min-20',
        title:
          'Keyword-Datenbank mit deinen relevanten Keywords gefüllt',
        description:
          'Lieber wenige sehr gute Keywords als viele mittelmäßige. Pin-Flow lernt mit jedem Analytics-Import dazu, welche tatsächlich funktionieren.',
        links: [
          A('Zur Keyword-Datenbank', '/dashboard/keywords'),
          K('Sichtbarkeit & Keywords', SICHTBARKEIT_KEYWORDS),
        ],
      },
      {
        id: 'boards-all',
        title: 'Alle Boards in Pin-Flow eingetragen',
        description:
          'Mindestens 5-15 öffentliche, themen-fokussierte Boards.',
        links: [
          A('Zu Boards', '/dashboard/boards'),
          K('Geheime Boards', GEHEIME_BOARDS),
        ],
      },
      {
        id: 'zielgruppe_definiert',
        title: 'Zielgruppe definiert',
        description:
          'Du weißt, wen du auf Pinterest erreichen willst, was diese Person sucht und welche Begriffe sie benutzt. Wie du das sauber herausarbeitest, zeigt dir die Wissensseite Zielgruppe verstehen.',
        links: [K('Zielgruppe verstehen', '/dashboard/strategie?tab=audience')],
      },
    ],
  },
  {
    id: 'tools-einrichtung',
    title: 'Tools-Einrichtung',
    icon: 'vorlage',
    items: [
      {
        id: 'canva-templates',
        title: 'Canva-Vorlagen erstellt (mindestens 3 Basis-Vorlagen)',
        description:
          'Im Format 1000 × 1500 px, mit Brand-Farben und Schriften.',
        links: [K('5 Design-Prinzipien', DESIGN_PRINZIPIEN)],
      },
      {
        id: 'image-source',
        title: 'Bildquelle gewählt (eigene Fotos, Stock oder KI)',
        description:
          'Canva, Unsplash, Midjourney, DALL·E etc., je nach Bedarf.',
        links: [K('Bilder & OCR', BILDER_OCR)],
      },
      {
        id: 'scheduler',
        title: 'Tailwind oder Pinterest-Scheduler eingerichtet (optional)',
        description:
          'Für automatisches Pin-Scheduling. Spart Zeit bei der Routine.',
        links: [K('Multi-Board-Pinning', MULTI_BOARD)],
      },
    ],
  },
  {
    id: 'first-pins',
    title: 'Erste Pin-Produktion',
    icon: 'pen',
    items: [
      {
        id: 'first-pin-seo',
        title: 'Erster Pin nach SEO-Regeln erstellt',
        description:
          'Pin-Titel mit Haupt-Keyword am Anfang, optimierte Beschreibung, Alt-Text.',
        links: [K('10 Ranking-Faktoren', RANKING_FAKTOREN)],
      },
      {
        id: 'pin-title-keyword',
        title: 'Pin-Titel mit Haupt-Keyword am Anfang',
        description:
          'Die ersten 30-35 Zeichen sind im Feed sichtbar. Keyword muss früh kommen.',
        links: [K('Pin-Felder', PIN_FELDER)],
      },
      {
        id: 'alt-text',
        title: 'Alt-Text bei jedem Pin ausgefüllt',
        description:
          'Pinterest liest Alt-Text für SEO und Barrierefreiheit.',
        links: [K('Bilder & OCR', BILDER_OCR)],
      },
      {
        id: 'pin-exact-landingpage',
        title: 'Pin verlinkt zur exakten Landingpage (nicht zur Startseite)',
        description:
          'Wer einen „Yogaraum einrichten"-Pin klickt und auf der Startseite landet, springt ab.',
        links: [K('Customer Journey', CUSTOMER_JOURNEY)],
      },
    ],
  },
  {
    id: 'analytics-routine',
    title: 'Erste Analytics + Routine',
    icon: 'chart',
    items: [
      {
        id: 'first-analytics',
        title: 'Erste Analytics importiert (nach ~30 Tagen mit Pins)',
        description:
          'Analytics machen erst Sinn, wenn Pins drin sind und gelaufen sind.',
        links: [A('Zur Analytics-Eingabe', '/dashboard/analytics')],
      },
      {
        id: 'monthly-reminder',
        title: 'Monatlicher Update-Termin im Kalender geblockt',
        description:
          'Pin-Flow lebt von monatlichen Analytics-Updates. Pinterest selbst löscht nach 6 Monaten. (Extern in deinem Kalender festlegen.)',
        links: [],
      },
      {
        id: 'seasonal-calendar',
        title: 'Saisonkalender für die nächsten 12 Monate gepflegt',
        description:
          'Pinterest belohnt 6-12 Wochen Vorlauf. Saisonalität ist ein riesiger Hebel.',
        links: [
          A('Zum Saisonkalender', '/dashboard/saison-kalender'),
          K('Saisonalität', SAISONALITAET),
        ],
      },
    ],
  },
]

// Flache Liste aller Item-IDs — Basis für Fortschritt + Validierung.
export const CHECKLIST_ITEM_IDS: string[] = CHECKLIST_CATEGORIES.flatMap(
  (c) => c.items.map((i) => i.id)
)

export const CHECKLIST_TOTAL = CHECKLIST_ITEM_IDS.length // 23
