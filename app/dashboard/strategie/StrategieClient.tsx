'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { StrategieRow } from './lib'
import type { PinAnalyticsThresholds } from '../analytics/utils'
import AudienceWissen from './AudienceWissen'
import MyStrategy from './MyStrategy'
import PinLifecycleSection from './PinLifecycleSection'
import { HinweisBox } from '@/components/HinweisBox'

type TabKey =
  | 'faktoren'
  | 'meine'
  | 'grundlagen'
  | 'strategien'
  | 'design'
  | 'keywords'
  | 'analytics'
  | 'audience'

// Tab-Schlüssel bleiben bewusst stabil (`meine`, `grundlagen`, …), damit
// gespeicherte URLs wie `?tab=analytics` und alte Bookmarks weiter
// funktionieren. Geändert wurden nur Labels und Anzeigereihenfolge gemäß
// V2.1.
// V3.0 (Phase 2c): neuer `audience`-Tab direkt nach `analytics` —
// Audience-Wissen war bisher ein Sub-Block in „Erfolg messen", ist jetzt
// eine eigene Sektion.
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'grundlagen', label: 'So funktioniert Pinterest' },
  { key: 'faktoren', label: 'Erfolgsfaktoren' },
  { key: 'strategien', label: 'Strategie verstehen' },
  { key: 'meine', label: 'Strategie festlegen' },
  { key: 'design', label: 'Pin-Gestaltung' },
  { key: 'keywords', label: 'Sichtbarkeit & Keywords' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'audience', label: 'Zielgruppe verstehen' },
]

const TAB_KEYS: TabKey[] = [
  'grundlagen',
  'faktoren',
  'strategien',
  'meine',
  'design',
  'keywords',
  'analytics',
  'audience',
]

export default function StrategieClient({
  strategie,
  thresholds,
  strategieBoardKategorien,
  strategieUrlCount,
}: {
  strategie: StrategieRow | null
  // Aktuelle Pin-Schwellwerte aus den Einstellungen — werden im Analytics-Tab
  // in die Klartext-Erklärungen eingesetzt, damit die Strategie-Texte immer
  // mit dem übereinstimmen, was die Diagnose-Logik wirklich nutzt.
  thresholds: PinAnalyticsThresholds
  // Strategie-Setup (Phase B): Board-Kategorien für Baustein 3 und Anzahl
  // Ziel-URLs für den Frequenz-Vorschlag in Baustein 4.
  strategieBoardKategorien: string[]
  strategieUrlCount: number
}) {
  const searchParams = useSearchParams()
  // Ohne ?tab-Parameter startet die Seite bewusst auf dem ersten Tab
  // („So funktioniert Pinterest", Key `grundlagen`). Ein gültiger ?tab-Wert
  // hat Vorrang, damit Deep-Links wie ?tab=design&accordion=… weiter greifen.
  const initialTab: TabKey = (() => {
    const t = searchParams?.get('tab')
    return t && (TAB_KEYS as string[]).includes(t) ? (t as TabKey) : 'grundlagen'
  })()
  const [active, setActive] = useState<TabKey>(initialTab)

  // Soft-Navigation: ändert sich `?tab=` ohne Full-Reload (z.B. via Link von
  // einem anderen Tab innerhalb der Strategie-Seite), holt der State sich den
  // neuen Tab nach. `active` darf hier NICHT in den Dependencies stehen —
  // sonst würde ein Klick auf einen anderen Tab den Effect erneut laufen
  // lassen und den State sofort wieder auf den `?tab=`-Wert aus der URL
  // zurücksetzen (Tab-Wechsel blieb hängen).
  useEffect(() => {
    const t = searchParams?.get('tab')
    if (t && (TAB_KEYS as string[]).includes(t)) {
      setActive(t as TabKey)
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex flex-wrap gap-x-6 gap-y-1"
          role="tablist"
          aria-label="Strategie-Bereiche"
        >
          {TABS.map((tab) => {
            const isActive = active === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.key)}
                className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'border-red-600 bg-red-50 font-semibold text-red-700'
                    : 'border-transparent font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div role="tabpanel">
        {active === 'meine' && (
          <MyStrategy
            strategie={strategie}
            boardKategorien={strategieBoardKategorien}
            urlCount={strategieUrlCount}
          />
        )}
        {active === 'faktoren' && <TabFaktoren />}
        {active === 'grundlagen' && <TabGrundlagen />}
        {active === 'strategien' && <TabStrategien />}
        {active === 'design' && <TabDesign />}
        {active === 'keywords' && <TabKeywords />}
        {active === 'analytics' && <TabAnalytics thresholds={thresholds} />}
        {active === 'audience' && <AudienceWissen />}
      </div>
    </div>
  )
}

// ===========================================================
// Reusable building blocks
// ===========================================================

function Accordion({
  title,
  defaultOpen = false,
  anchorId,
  children,
}: {
  title: string
  defaultOpen?: boolean
  anchorId?: string
  children: ReactNode
}) {
  const searchParams = useSearchParams()
  const matched = !!anchorId && searchParams?.get('accordion') === anchorId
  const [open, setOpen] = useState<boolean>(defaultOpen || matched)
  const ref = useRef<HTMLDetailsElement>(null)

  // Wenn die URL auf dieses Accordion zeigt: aufklappen und reinscrollen.
  useEffect(() => {
    if (matched) {
      setOpen(true)
      const t = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [matched])

  return (
    <details
      ref={ref}
      id={anchorId}
      className="group scroll-mt-4 rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
        <span
          className="text-lg leading-none text-gray-400 transition-transform"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1">{title}</span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </details>
  )
}

// Tool-Block mit kopierbarem Prompt — eigener Look (heller Background,
// monospace-Prompt, Kopier-Button mit 2s Bestätigung).
function CopyPromptBlock({
  title,
  prompt,
  steps,
}: {
  title: string
  prompt: string
  steps: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard-API unavailable (z.B. ohne HTTPS / sehr alte Browser):
      // Button bleibt unverändert, Nutzer kann den Prompt manuell markieren.
    }
  }
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            {copied ? '✓ Kopiert!' : 'Prompt kopieren'}
          </button>
        </div>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800">
{prompt}
        </pre>
      </div>
      {steps}
    </div>
  )
}

function Para({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-gray-700">{children}</p>
}

function H3({ children }: { children: ReactNode }) {
  // V3.6.2 — `uppercase tracking-wide` entfernt: die Überschriften der
  // Sub-Sektionen sollen in normaler Schreibweise erscheinen
  // (Spec V3.6.2 Fix 3b/3d/4a/4e/4f/5).
  return (
    <h3 className="text-base font-semibold text-gray-900">{children}</h3>
  )
}

function H4({ children }: { children: ReactNode }) {
  return <h4 className="text-sm font-semibold text-gray-900">{children}</h4>
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

// Zentrale nummerierte Liste — einheitlicher Abstand und Stil für alle
// <ol>-Aufzählungen, analog zu Bullets. Nimmt die <li>-Kinder direkt entgegen,
// damit die Listeninhalte unverändert bleiben.
function OrderedList({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
      {children}
    </ol>
  )
}

// Ruhige, typografische Karte für einen Pin-Typ: Name fett in eigener Zeile,
// optionaler gedämpfter Zusatz, darunter die Beschreibung als ruhiger Absatz.
// Bewusst ohne Icons und ohne Farbakzente.
function PinTypKarte({
  name,
  zusatz,
  children,
}: {
  name: string
  zusatz?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-[15px] font-semibold text-gray-900">
        {name}
        {zusatz && (
          <span className="ml-1.5 text-sm font-normal text-gray-500">
            ({zusatz})
          </span>
        )}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{children}</p>
    </div>
  )
}

function Table({
  head,
  rows,
}: {
  head: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top ${
                    j === 0
                      ? 'font-medium text-gray-900'
                      : 'text-gray-700'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// V3.6.3 — Tabellen-Komponente für Vergleichs-Wissens-Bereiche. Akzeptiert
// ReactNode-Zellen (Emojis, formatierte Texte). `mutedFirstColumn` macht
// die linke Spalte gedämpft (z. B. „Ohne Signalwort"-Beispiele); sonst
// wird sie leicht hervorgehoben. Zebra-Streifen für Lesbarkeit.
function WissenTabelle({
  headers,
  rows,
  mutedFirstColumn = false,
}: {
  headers: ReactNode[]
  rows: ReactNode[][]
  mutedFirstColumn?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-sm font-semibold text-gray-900"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, r) => (
            <tr key={r} className={r % 2 === 1 ? 'bg-gray-50/60' : ''}>
              {row.map((cell, c) => {
                const firstColCls =
                  c === 0
                    ? mutedFirstColumn
                      ? 'text-gray-500'
                      : 'font-medium text-gray-900'
                    : 'text-gray-700'
                return (
                  <td
                    key={c}
                    className={`px-3 py-2 align-top leading-relaxed ${firstColCls}`}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800">
      {children}
    </pre>
  )
}

// ===========================================================
// Tab 1 — So funktioniert Pinterest
// ===========================================================

function TabFaktoren() {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Worauf es bei Pinterest wirklich ankommt, auf einen Blick.
      </p>
      <Accordion
        title="Die 10 Ranking-Faktoren: dein Fahrplan für Pinterest-Erfolg"
        anchorId="9-ranking-faktoren"
      >
        <Para>
          Pinterest ist eine Suchmaschine, kein soziales Netzwerk. Gefunden
          wirst du nur über die richtigen Keywords, an möglichst vielen Stellen:
          im Pin-Titel, in der Beschreibung, im Hook (dem Text auf dem Bild),
          in den Board-Namen, in deiner Profilbeschreibung und in der Ziel-URL.
          Verwende dabei so viele
          relevante Keywords wie möglich, die wichtigsten weit vorne, immer
          natürlich in vollständige Sätze eingebettet. Eine Liste
          aneinandergereihter Keywords wirkt unnatürlich und wird abgestraft.
          Beim natürlichen Formulieren helfen dir die Vorlagen unter{' '}
          <Link
            href="/dashboard/ressourcen"
            className="font-medium text-red-600 hover:underline"
          >
            Prompts &amp; Vorlagen
          </Link>{' '}
          in der linken Menüleiste. Die folgenden Faktoren sind nach ihrem
          Einfluss auf deine Sichtbarkeit geordnet.
        </Para>

        <div>
          <H4>1. Pin-Titel: der wichtigste Sichtbarkeits-Faktor</H4>
          <Para>
            Dein wichtigstes Keyword steht ganz am Anfang, gefolgt von weiteren
            passenden Keywords, solange der Titel natürlich klingt. Die ersten
            30 bis 35 Zeichen erscheinen im Feed, alles danach wird
            abgeschnitten. Maximal 100 Zeichen. Ohne ein klares Keyword im Titel
            wird der Pin in der Suche kaum gefunden. Nutze möglichst die
            Keywords, nach denen wirklich gesucht wird, die findest du über die
            Pinterest-Suchvorschläge.
          </Para>
        </div>

        <div>
          <H4>2. Pin-Beschreibung</H4>
          <Para>
            Beschreibe in vollständigen Sätzen, worum es geht, und verwende
            dabei möglichst viele relevante Keywords, die wichtigsten möglichst
            weit vorne. Nutze auch Synonyme und verwandte Suchbegriffe und
            schöpfe die vollen 500 Zeichen aus. Achte vor allem darauf, dass die
            Beschreibung zur Customer Journey passt: Sie sollte das einlösen,
            was Bild und Titel versprechen, und zur Zielseite hinführen. Mehr
            dazu im Abschnitt{' '}
            <Link
              href="/dashboard/strategie?tab=design&accordion=customer-journey"
              className="font-medium text-red-600 hover:underline"
            >
              Customer Journey
            </Link>
            . Schließe mit einer klaren Handlungsaufforderung.
          </Para>
        </div>

        <div>
          <H4>3. Board-Name</H4>
          <Para>
            Der Name des Boards, auf dem du den Pin speicherst, beeinflusst
            seine Reichweite. Verwende so viele klare, relevante Keywords im
            Board-Namen wie sinnvoll, die wichtigsten weit vorne. Besonders
            stark sind Board-Namen, die meistgesuchte Keywords aufgreifen, also
            Begriffe, nach denen viele Menschen tatsächlich suchen. Ein
            thematisch passender Board-Name ordnet alle Pins darauf demselben
            Thema zu.
          </Para>
        </div>

        <div>
          <H4>4. Board-Beschreibung</H4>
          <Para>
            Wird von Pinterest vollständig gelesen und zur thematischen
            Einordnung genutzt. Verwende möglichst viele relevante Keywords und
            Longtail-Keywords, die wichtigsten weit vorne, natürlich in Sätze
            eingebettet. Maximal 500 Zeichen.
          </Para>
        </div>

        <div>
          <H4>5. Profilbeschreibung (Bio)</H4>
          <Para>
            Pinterest liest deine Profilbeschreibung, ordnet sie thematisch ein
            und gleicht sie mit deinen Pins ab. Schöpfe die vollen 500 Zeichen
            aus und bringe darin so viele deiner wichtigsten Keywords unter wie
            möglich, natürlich in Sätze eingebettet, die zentralen möglichst
            weit vorne. So erkennt Pinterest, für welche Themen dein gesamter
            Account steht.
          </Para>
        </div>

        <div>
          <H4>6. Zielseite und URL</H4>
          <Para>
            Die URL muss nicht zwingend deine Keywords enthalten, aber sie
            sollte thematisch zum Pin passen. Ein Yoga-Pin, der auf einen
            Honig-Blog führt, irritiert Pinterest und schadet der Einordnung.
            Wenn deine URL zusätzlich passende Keywords trägt (zum Beispiel
            /yogaraum-einrichten statt /post-123), ist das ein weiterer
            Sichtbarkeits-Vorteil. Du musst bestehende URLs dafür aber nicht
            umbenennen.
          </Para>
        </div>

        <div>
          <H4>7. Website-Titel, Metadaten und Alt-Text</H4>
          <Para>
            Pinterest schaut sich die Zielseite an, um ihr Thema einzuordnen.
            Der Seitentitel (die Überschrift im Browser-Tab) und der kurze
            Beschreibungstext der Seite (die Meta-Beschreibung) helfen dabei.
            Ebenso der Alt-Text deines Pins (bis 500 Zeichen, mit den
            wichtigsten Keywords), den Pinterest ausliest und der zugleich der
            Barrierefreiheit dient. Wichtig ist die thematische Passung zwischen
            Pin und Zielseite, nicht die exakte Wortgleichheit.
          </Para>
        </div>

        <div>
          <H4>8. Hook (Text auf dem Bild)</H4>
          <Para>
            Der Text, den du auf dein Pin-Bild schreibst, wird von Pinterest per
            Texterkennung (OCR) gelesen und als Keyword gewertet. Bring dein
            wichtigstes Keyword gut lesbar im Hook unter. Wichtig: Pin-Flows
            eigenes Keyword-Tracking kann den Hook nicht mitlesen, da er Text im
            Bild ist. Schreibe das Keyword deshalb immer auch in Titel oder
            Beschreibung.
          </Para>
        </div>

        <div>
          <H4>9. Bilder und Bildqualität</H4>
          <Para>
            Benenne die Bilddatei vor dem Upload mit Keywords, nicht
            „IMG_1234.jpg", sondern zum Beispiel
            „yogaraum-einrichten-ideen.jpg". Pinterest liest den Dateinamen als
            zusätzliches Signal.
          </Para>
          <Para>
            Gute Bildqualität ist selbstverständlich Pflicht: hochauflösend,
            hell, scharf und klar. Unscharfe oder dunkle Bilder werden
            schlechter ausgespielt.
          </Para>
        </div>

        <div>
          <H4>10. Pin-Konsistenz</H4>
          <Para>
            Pinterest prüft, ob Bild, Titel, Beschreibung, URL und Board
            thematisch zusammenpassen. Ein Pin über „Yogaraum einrichten" auf
            einem Board für Kochrezepte sendet widersprüchliche Signale und wird
            schlechter ausgespielt. Konsistenz über alle Elemente hinweg ist
            Pflicht.
          </Para>
        </div>

        <H4>Das stärkste Signal: der Save</H4>
        <Para>
          Wie Menschen auf deinen Pin reagieren, ist Pinterests wichtigstes
          Qualitätssignal, aber du erzeugst es nicht direkt, sondern durch
          alles, was oben steht. Am meisten zählt der Save: Wenn jemand deinen
          Pin auf einem eigenen Board merkt, wertet Pinterest das als
          deutlichstes Zeichen, dass dein Pin wertvoll ist. Es folgen die Klicks
          auf deine Zielseite. Tippt jemand den Pin nur an, um ihn vergrößert zu
          betrachten, ohne weiterzuklicken, spricht man von einer Nahaufnahme
          (Close-up), auch das ist ein Interesse-Signal. Likes zählen kaum,
          negative Reaktionen wie Verbergen oder Melden schaden. Saves entstehen
          nicht zufällig, sie sind das Ergebnis, wenn die zehn Faktoren oben
          stimmen.
        </Para>

        <H4>Empfehlungen für Board-Titel und -Beschreibungen</H4>
        <Para>
          Meistgesuchte Keywords sind besonders stark. Nutze sie vor allem in
          deinen Board-Namen und in deiner Profilbeschreibung. Im Pin-Titel
          passen sie ebenfalls, siehe Faktor 1.
        </Para>
        <Bullets
          items={[
            <>
              <strong>Board-Titel:</strong> Die meistgesuchten Keywords zu
              deinem Thema verwenden.
            </>,
            <>
              <strong>Schwach:</strong> „Meine Yoga-Welt", weder ein gesuchtes
              Keyword noch ein klares Thema.
            </>,
            <>
              <strong>Stark:</strong> „Yoga zuhause: Yogaraum &amp; Yoga Ecke
              einrichten", ein Keyword plus Unterthema.
            </>,
            <>
              <strong>Stark:</strong> „Achtsamkeit &amp; Meditation:
              Morgenroutine für mehr Ruhe", ein Hauptthema plus
              Longtail-Keyword.
            </>,
            <>
              <strong>Board-Beschreibung:</strong> Schöpfe die 500 Zeichen aus,
              eine kurze Beschreibung plus die meistgesuchten
              Longtail-Keywords.
            </>,
            <>
              <strong>So findest du starke Keywords:</strong> Gib dein Thema in
              die Pinterest-Suchleiste ein. Pinterest schlägt dir darunter die
              meistgesuchten verwandten Keywords als farbige Kacheln vor. Das
              sind die echten Begriffe, nach denen Menschen suchen, und damit
              die stärksten Keywords für deine Board-Namen und deine
              Profilbeschreibung.
            </>,
          ]}
        />

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Pinterest ist eine Suchmaschine, kein
          Social Media. Wer alle 10 Faktoren konsequent optimiert wird belohnt.
        </HinweisBox>
      </Accordion>
    </div>
  )
}

function TabGrundlagen() {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Was Pinterest ist und wie du dich richtig einrichtest.
      </p>
      <Accordion
        title="Was Pinterest wirklich ist"
        anchorId="was-pinterest-wirklich-ist"
      >
        <Para>
          Pinterest funktioniert grundlegend anders als Google oder Social
          Media. Wer Pinterest mit Instagram oder TikTok vergleicht, versteht
          es falsch.
        </Para>
        <H4>Die drei Plattform-Typen im Vergleich</H4>
        <WissenTabelle
          headers={[
            'Kriterium',
            'Google',
            'Social Media',
            'Pinterest',
          ]}
          rows={[
            [
              'Was es ist',
              'Text-Suchmaschine',
              'Unterhaltungsplattform',
              'Visuelle Suchmaschine',
            ],
            [
              'Warum Menschen es nutzen',
              'Antworten finden',
              'Unterhalten werden',
              'Inspiration & Ideen',
            ],
            [
              'Kaufbereitschaft',
              'Hoch (aktive Suche)',
              'Niedrig (Scrollen)',
              'Sehr hoch (Planung)',
            ],
            [
              'Lebensdauer eines Beitrags',
              'Monate bis Jahre',
              '24 bis 48 Stunden',
              'Monate bis Jahre',
            ],
            [
              'Reichweite ohne Follower',
              'Möglich (über Suche)',
              'Fast unmöglich',
              'Sehr gut möglich',
            ],
            [
              'Algorithmus',
              'Keyword-basiert',
              'Engagement-basiert',
              'Keyword + Engagement',
            ],
            [
              'Zeitliche Bindung',
              'Einmalig pro Inhalt, dann dauerhaft',
              'Tägliche Präsenz nötig',
              'Frei planbar, kein tägliches Online-Sein nötig',
            ],
            [
              'Arbeitsaufwand',
              'Hoch (Texte und Keywords, einmalig pro Seite)',
              'Sehr hoch (ständig neuer Content)',
              'Mittel (Pins erstellen, frei einteilbar)',
            ],
          ]}
        />
        <H4>Was das für dich bedeutet:</H4>
        <Para>
          Pinterest-Nutzer sind Planer, sie suchen aktiv nach Ideen und
          Lösungen für Vorhaben, die sie umsetzen wollen. Wer einen Garten
          anlegt, ein Geschenk kauft, ein Rezept sucht oder eine Reise plant, 
          der nutzt Pinterest. Diese Planungsabsicht macht Pinterest-Traffic
          besonders wertvoll:
        </Para>
        <Bullets
          items={[
            'Nutzer sind kaufbereiter als auf Social Media',
            'Sie speichern Pins für später, dein Content wird noch Monate später gefunden',
            'Sie kommen mit konkreter Suchintention, kein Zufallstraffic',
          ]}
        />
        <Para>
          Bei Pinterest kannst du deinen Content zum Beispiel einmal im Monat
          vorbereiten und einplanen und musst dann nicht täglich online sein.
          Wer mag, plant wöchentlich.
        </Para>
        <Para>
          Pinterest ist keine Alternative zu Google, es ist eine Ergänzung.
          Google zeigt Text-Ergebnisse, Pinterest zeigt visuelle Ergebnisse.
          Wer auf beiden präsent ist, verdoppelt seine Sichtbarkeit.
        </Para>
        <HinweisBox variant="merke">
          <strong>Merke:</strong> Pinterest ist keine Social-Media-Plattform,
          die tägliche Aufmerksamkeit braucht. Es ist eine Suchmaschine, die
          mit einmaliger Arbeit langfristige Ergebnisse liefert.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Ohne Instagram-Hustle: Pinterest als Fundament, Instagram als Ergänzung"
        anchorId="ohne-instagram-hustle"
      >
        <Para>
          Pinterest funktioniert vollständig ohne Instagram. Das ganze System
          ist darauf ausgelegt, sichtbar zu sein, während du offline bist, ohne
          täglichen Social-Media-Druck. Wer von Instagram kommt und dort
          ausgebrannt ist, kann mit Pinterest allein arbeiten. Instagram ist
          eine Ergänzung, kein Muss.
        </Para>

        <H4>Zwei verschiedene Welten</H4>
        <Para>
          Pinterest und Instagram unterscheiden sich im Wesen. Pinterest ist
          eine Suchmaschine mit langlebigen Inhalten: Ein Pin wird über Monate
          gefunden, der Traffic ist planbar und dauerhaft. Instagram ist ein
          schnelllebiger Feed: Ein Beitrag lebt Stunden bis wenige Tage und
          lebt von Beziehung, Persönlichkeit und täglicher Präsenz.
        </Para>
        <Para>
          Pinterest bringt kaufbereite Fremde über die Suche, Instagram
          vertieft die Bindung zu Menschen, die dich schon kennen. Deshalb
          ergänzen sie sich, statt zu konkurrieren: Pinterest sorgt für
          dauerhafte Sichtbarkeit bei neuen Menschen, Instagram für Nähe zu
          bestehenden.
        </Para>

        <H4>Inhalte klug wiederverwenden</H4>
        <Para>
          Du kannst dasselbe Material für beide Kanäle nutzen und sparst so
          Zeit, aber nicht eins zu eins. Diese technischen Unterschiede
          solltest du beachten:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Format:</strong> Bei Videos passt es weitgehend, beide
              nutzen das vertikale Format 9:16 (Reels und Video-Pins). Bei
              statischen Bildern unterscheidet es sich deutlich: Pinterest
              bevorzugt das Hochformat 2:3 (zum Beispiel 1000 x 1500 Pixel),
              während Instagram-Beiträge oft quadratisch (1:1) oder im Format
              4:5 sind. Ein quadratischer Instagram-Post passt also nicht ins
              ideale Pinterest-Format, du musst neu zuschneiden oder neu
              gestalten.
            </>,
            <>
              <strong>Ton aus:</strong> Pinterest-Videos werden oft ohne Ton
              angeschaut. Setze daher auf starke Bilder und gut lesbaren Text
              im Bild, nicht auf Trend-Sounds wie bei Instagram.
            </>,
            <>
              <strong>Keywords statt Hashtags:</strong> Auf Pinterest zählen
              suchbare Keywords im Titel und in der Beschreibung, nicht
              Hashtags. Titel sollten dem entsprechen, was deine Zielgruppe bei
              der Suche eingibt.
            </>,
            <>
              <strong>Kein Wasserzeichen:</strong> Wenn du ein Instagram-Reel
              wiederverwendest, entferne vorher das Instagram-Logo
              beziehungsweise das Wasserzeichen. Ein sichtbares fremdes
              Wasserzeichen wirkt unsauber und signalisiert, dass Pinterest nur
              ein nachträglicher Gedanke ist.
            </>,
            <>
              <strong>Nicht alles passt:</strong> Manche Instagram-Inhalte
              gehören gar nicht auf Pinterest, etwa zeitkritische Aktionen,
              sehr persönliche Momentaufnahmen oder Memes. Prüfe, ob ein Inhalt
              für eine Suchmaschine überhaupt Sinn ergibt.
            </>,
          ]}
        />

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Wenn du beides nutzt, lass Pinterest dein
          Fundament sein, die Sichtbarkeit, die ohne dich weiterarbeitet, und
          Instagram die Ergänzung für Nähe. Wenn du nur Kapazität für einen
          Kanal hast, ist Pinterest die nachhaltigere Wahl für dauerhafte
          Sichtbarkeit.
        </HinweisBox>
      </Accordion>

      <Accordion title="Profil-Setup" anchorId="profil-setup">
        <Para>
          Dein Pinterest-Profil ist deine Visitenkarte, und gleichzeitig
          ein Sichtbarkeits-Element. Nutzer entscheiden in Sekunden, ob sie dir folgen
          oder weiterscrollen. Pinterest bewertet dein Profil außerdem nach
          Keywords im Profilnamen und in der Beschreibung.
        </Para>
        <H4>Profilname</H4>
        <Para>
          Empfohlenes Format: „dein Name oder Markenname | Was du tust".
        </Para>
        <Para>
          Wer als Person auftritt (Personal Brand), nutzt seinen eigenen Namen,
          zum Beispiel „Max Mustermann | Muster Creator &amp; Coach". Wer mit
          einem Shop oder einer Marke auftritt, nutzt den Shop- oder
          Markennamen, zum Beispiel „yogaflow-studio | Yoga &amp;
          Selbstfürsorge". In beiden Fällen ergänzt du, wenn möglich, ein
          relevantes Keyword im Teil „| Was du tust". Pinterest indexiert den
          Profilnamen für die Suche, Keywords im Namen geben dir einen
          Reichweiten-Vorteil, und Nutzer verstehen auf einen Blick, was sie bei
          dir erwartet.
        </Para>
        <H4>Profilbeschreibung: Keywords vorne, klare Positionierung</H4>
        <Para>
          Wichtigster Punkt: Pinterest ist eine Suchmaschine.{' '}
          <strong>
            Deine wichtigsten Keywords gehören möglichst weit vorne
          </strong>{' '}
          in die Beschreibung, die ersten Worte zählen am meisten für die
          Pinterest-Suche. Dieselbe Logik wie bei den 10 Ranking-Faktoren und
          beim Pin-Titel.
        </Para>
        <Para>
          Nutze den verfügbaren Platz aus und bringe so viele relevante Keywords
          wie möglich unter, aber natürlich formuliert, sodass es nicht nach
          aneinandergereihten Keywords klingt. Die ersten rund 80 Zeichen zählen
          am meisten, sie erscheinen in der Vorschau und in den Suchergebnissen,
          also die wichtigsten Keywords ganz nach vorne. Beim natürlichen
          Formulieren hilft dir der KI-Prompt.
        </Para>
        <Para>
          <strong>Empfohlene Struktur, die „Ich helfe…“-Formel:</strong>{' '}
          „Ich helfe [Zielgruppe] dabei [Ergebnis zu erreichen] indem
          [deine Methode]“.
        </Para>
        <Para>
          Beispiel: „Yoga &amp; Selbstfürsorge für gestresste Frauen, ich
          helfe dir dabei, mit Atemübungen und kleinen Routinen zu mehr
          innerer Ruhe zu finden.“
        </Para>
        <Para>
          (Beachte: In diesem Beispiel kommen die Keywords „Yoga“ und
          „Selbstfürsorge“ gleich an erster Stelle, das ist der
          entscheidende Pinterest-Sichtbarkeits-Hebel.)
        </Para>
        <Para>
          Die „Ich helfe…“-Formel ist empfehlenswert für klare
          Positionierung, aber <strong>kein Muss</strong>. Wichtiger sind
          die Keywords am Anfang und ein klarer Call-to-Action am Ende.
        </Para>
        <Bullets
          items={[
            'Call-to-Action am Ende (z. B. „Entdecke jetzt", „Kostenlos herunterladen", „Schau auf meinen Blog")',
            'Keywords natürlich formulieren, kein Keyword-Stuffing',
          ]}
        />
        <H4>Cover-Bild</H4>
        <Para>
          Das Cover-Bild sollte möglichst dein Logo sein oder, wenn du als
          Personal Brand auftrittst, ein Foto von dir.
        </Para>
        <Bullets
          items={[
            'Format: 800 × 450 Pixel',
            'Stil: konsistent zu deinen Pin-Designs (Farben, Schriften)',
          ]}
        />
        <Para>
          Das Cover-Bild ist das Erste, was Besucher auf deinem Profil sehen,
          investiere die 10 Minuten in ein gutes Design.
        </Para>
        <H4>Benutzername</H4>
        <Para>
          Verwende möglichst denselben Benutzernamen wie auf deinen anderen
          Kanälen (Instagram, TikTok, Website), damit dich Menschen
          wiedererkennen. Nur wenn der Name auf Pinterest schon vergeben ist,
          wähle einen ähnlich klingenden. Wenn möglich, baue ein relevantes
          Keyword ein und halte ihn einfach zu merken und zu tippen.
        </Para>
        <H4>Wie wichtig sind Profil und Follower?</H4>
        <Para>
          Die meisten Nutzer schauen sich dein Profil kaum an. Auf Pinterest
          interessieren sie einzelne Pins, nicht das Profil. Für den Nutzer ist
          das Profil also nebensächlich. Für Pinterest aber nicht: Profilname
          und Beschreibung sind wichtige Keyword- und Distributions-Signale,
          deshalb lohnt sich die Mühe trotzdem.
        </Para>
        <Para>
          Auch Follower sind zweitrangig, deine Reichweite kommt über die Suche.
          Trotzdem sind sie nicht wertlos: Neue Pins werden deinen Followern im
          Home-Feed mit angezeigt, was am Anfang einen ersten Schub an Saves und
          Klicks bringen kann.
        </Para>
        <HinweisBox variant="merke">
          <strong>Merke:</strong> Konzentriere dich auf gute, keyword-starke
          Pins, dann kommen
          Reichweite und Follower von selbst.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Domain-Verifizierung"
        anchorId="domain-verifizierung"
      >
        <Para>
          Die Domain-Verifizierung ist einer der wichtigsten
          Setup-Schritte, und gleichzeitig einer der am häufigsten
          übersehenen. Ohne sie fehlen dir wichtige Daten.
        </Para>
        <H4>Was die Domain-Verifizierung bewirkt</H4>
        <Bullets
          items={[
            'Pinterest erkennt dich offiziell als Inhaber:in der Domain',
            'Du bekommst Analytics-Daten zu allen Pins, die auf deine Domain verlinken, also auch zu Pins, die fremde Nutzer von deiner Website erstellt haben (zum Beispiel, wenn jemandem dein Blogartikel gefällt und er ihn pinnt)',
            'Dein Profilbild und ein Folgen-Button erscheinen in der Herkunftszeile von Pins, die zu deiner Domain führen, also dort, wo Pinterest anzeigt, woher ein Pin stammt. So wirst du als Urheber erkennbar, selbst wenn ein Pin oft weitergeteilt wird. (Hinweis: In deiner eigenen Ansicht siehst du das oft nicht, die Wirkung entfaltet sich vor allem bei anderen Nutzern.)',
            'Pinterest stuft deinen Account als vertrauenswürdiger ein (Algorithmus-Vorteil)',
            'Pin-Flow kann die zusätzlichen Daten nutzen, um dir präzisere URL-Auswertungen zu liefern',
          ]}
        />
        <H4>Wie du die Domain verifizierst</H4>
        <OrderedList>
          <li>
            In Pinterest oben rechts auf den Pfeil nach unten klicken und
            „Einstellungen" wählen.
          </li>
          <li>In der linken Navigation auf „Verifizierte Konten" klicken.</li>
          <li>Neben „Webseiten" auf „Verifizieren" klicken.</li>
          <li>
            Eine der angebotenen Methoden wählen (HTML-Tag, HTML-Datei oder
            TXT-Eintrag im DNS) und auf deiner Website bzw. bei deinem
            Domain-Anbieter einbauen.
          </li>
          <li>
            Zurück in Pinterest auf „Bestätigen" klicken, Pinterest prüft dann
            automatisch.
          </li>
        </OrderedList>
        <Para>Dauer: ca. 10-15 Minuten, einmaliger Aufwand.</Para>
        <H4>Was passiert ohne Verifizierung?</H4>
        <Para>
          Pinterest gibt dir weniger detaillierte Analytics. Pins können
          dir nicht eindeutig zugeordnet werden. Pin-Flow kann nur
          eingeschränkt auf URL-Ebene analysieren. Deine Markenwirkung
          leidet, weil kein Profilbild auf den Pins erscheint.
        </Para>
        <HinweisBox variant="tipp">
          <strong>Tipp:</strong> ohne Domain-Verifizierung verschenkst
          du erheblich Potenzial. Das ist ein 10-Minuten-Schritt mit großem
          Hebel.
        </HinweisBox>
      </Accordion>


      <Accordion title="Posting-Frequenz: wie viele Pins pro Tag in 2026?">
        <H4>Die ehrliche Antwort: Pinterest gibt offiziell keine Zahl vor</H4>
        <Para>
          Pinterest selbst sagt: Es gibt kein Limit wie viele Pins du
          erstellen kannst. Die offizielle Empfehlung lautet nur, regelmäßig
          frischen Content posten, mindestens wöchentlich, ohne feste
          Stückzahl. Pinterest betont Fokus auf Content-Qualität, nicht auf
          eine fixe Pin-Anzahl pro Woche.
        </Para>
        <Para>
          Das heißt: Alle konkreten Zahlen, die du online findest, sind
          Erfahrungswerte von Pinterest-Fachleuten und Planungs-Tools, keine
          offiziellen Pinterest-Vorgaben.
        </Para>

        <H4>Der Konsens für 2026</H4>
        <Para>
          Die Empfehlungen haben sich in den letzten Jahren deutlich nach unten
          verschoben. Was 2020 noch normal war (25 bis 50 Pins pro Tag), gilt
          heute als Spam-Risiko.
        </Para>
        <Para>
          Die meisten seriösen Empfehlungen liegen 2026 zwischen 3 und 10
          frischen Pins pro Tag, abhängig davon, wie viel Content du hast.
        </Para>
        <HinweisBox variant="tipp">
          <strong>Tipp:</strong> Für den Start reichen{' '}
          <strong>1 bis 3 frische Pins pro Tag</strong>
          {' '}völlig aus. Wer schneller wachsen will, steigert mit der Zeit
          Schritt für Schritt bis auf höchstens 15 Pins pro Tag, aber zu Beginn
          ist das nicht nötig. Deinen genauen Wert je nach Phase findest du
          weiter unten.
        </HinweisBox>

        <H4>Warum die Zahlen gesunken sind</H4>
        <Para>
          Drei Gründe haben die „Mehr ist mehr"-Ära beendet:
        </Para>
        <OrderedList>
          <li>
            <strong>Algorithmus-Shift zu Qualität</strong>: Ein Pin mit 100
            Saves ist mehr wert als 100 Pins mit null Interaktion. Pinterest
            belohnt Engagement, nicht Volumen.
          </li>
          <li>
            <strong>Spam-Filter</strong>: Schädlich ist, denselben identischen
            Pin (gleiches Bild, gleiche URL) immer wieder schnell auf viele
            Boards zu werfen, das kann zu Shadow-Ban oder Account-Sperre führen.
            Einen alten, erfolgreichen Pin später mit neuem Design, neuem Hook
            und frischen Keywords neu aufzusetzen, ist dagegen sinnvoll und kein
            Spam.
          </li>
          <li>
            <strong>Search-Intent-Logik</strong>: Pinterest funktioniert wie
            eine Suchmaschine. Wenige starke, gut keyword-optimierte Pins
            schlagen Masse.
          </li>
        </OrderedList>

        <H4>Was wirklich zählt: wichtiger als die Zahl</H4>

        <div>
          <H4>1. Konsistenz über Volumen</H4>
          <Para>
            Lieber 3 Pins jeden Tag als 21 am Sonntag. Regelmäßiges Auftauchen
            zählt mehr als stoßweises Posten.
          </Para>
        </div>

        <div>
          <H4>2. Mindestens drei Monate dranbleiben</H4>
          <Para>
            Wichtiger als die genaue Pin-Zahl ist, dass du mindestens drei
            Monate konsequent dranbleibst. Erst dann beginnt die eigentliche
            Distribution: Pinterest braucht diese Zeit, um deinen Account und
            deine Themen einzuordnen. Dranbleiben und Konstanz lohnen sich,
            viele geben zu früh auf, kurz bevor es losgeht.
          </Para>
        </div>

        <div>
          <H4>3. Pin-Anzahl an Content-Pipeline anpassen</H4>
          <Para>
            Die richtige Zahl hängt davon ab wie viele einzigartige URLs du
            hast. Pinne so viele Pins pro Tag wie du wirklich verschiedene
            Designs zu unterschiedlichen URLs erstellen kannst, ohne in
            Duplikate abzurutschen. Ein Blog mit 10 Posts kann nicht dasselbe
            Pin-Volumen tragen wie ein Shop mit 200 Produkten.
          </Para>
        </div>

        <div>
          <H4>4. Zeitliche Verteilung wichtiger als Volumen</H4>
          <Para>
            Verteile deine Pins über den Tag und über die Woche, statt alles auf
            einmal zu posten. Mehrere verschiedene Designs zur selben Seite
            veröffentlichst du nach und nach, nicht alle am selben Tag, so
            bekommt jedes Design sein eigenes Zeitfenster.
          </Para>
        </div>

        <div>
          <H4>5. Mit einem Planer arbeiten</H4>
          <Para>
            Plane deine Pins möglichst mit Pinterests eigenem Planer, also der
            Planungsfunktion direkt in Pinterest. Sie ist kostenlos, und mehrere
            Quellen aus 2026 empfehlen sie, weil sie die Engagement-Signale
            verbessert.
          </Para>
          <Para>
            Auch Tailwind ist eine gute und sichere Option. Tailwind ist ein
            offiziell von Pinterest zugelassener Partner, Pins über Tailwind
            werden genauso behandelt wie direkt veröffentlichte, es gibt also
            keinen Reichweiten-Nachteil. Tailwind kann sich lohnen, weil es das
            Planen Monate im Voraus erlaubt und optimale Posting-Zeiten für
            deinen Account vorschlägt. Es ist allerdings kostenpflichtig.
          </Para>
          <Para>
            Fazit: Pinterests eigener Planer (kostenlos) und Tailwind
            (kostenpflichtig, mehr Funktionen) sind beide gut.
          </Para>
        </div>

        <H4>Deine Pin-Anzahl nach Wachstumsphase</H4>
        <Para>
          Hier wird die grobe Spanne konkret: Such dir die Phase heraus, in der
          dein Account gerade steckt, das ist dein Richtwert.
        </Para>
        <WissenTabelle
          headers={['Phase', 'Content-Pool', 'Empfehlung']}
          rows={[
            [
              'Einsteiger',
              'weniger als 20 URLs',
              '1 bis 3 frische Pins/Tag',
            ],
            [
              'Wachstumsphase',
              '20 bis 100 URLs',
              '3 bis 5 frische Pins/Tag',
            ],
            [
              'Etablierter Account',
              '100+ URLs',
              '5 bis 10 frische Pins/Tag',
            ],
          ]}
        />
        <Para>
          Mehr als 15 Pins pro Tag bringen in der Regel keinen Vorteil.
        </Para>

        <HinweisBox variant="tipp">
          <p>
            <strong>Wichtig:</strong> Pinterest gibt keine offizielle Zahl
            vor. Diese Empfehlungen basieren auf aktuellen Erfahrungswerten
            aus 2026, sie können sich ändern.
          </p>
          <p className="mt-3">
            <strong>Hier findest du gute Hilfe:</strong>
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              <a
                href="https://help.pinterest.com/en/article/limits-for-pins-boards-and-follows"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-amber-900 underline hover:text-amber-700"
              >
                https://help.pinterest.com/en/article/limits-for-pins-boards-and-follows
              </a>
            </li>
            <li>
              <a
                href="https://business.pinterest.com/blog/how-to-build-audience-pinterest/"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-amber-900 underline hover:text-amber-700"
              >
                https://business.pinterest.com/blog/how-to-build-audience-pinterest/
              </a>
            </li>
          </ul>
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Der Timing-Vorteil: da sein, bevor deine Zielgruppe sucht"
        anchorId="saisonalitaet"
      >
        {/* Block 1 — Warum Timing entscheidend ist */}
        <H3>Warum Timing auf Pinterest entscheidend ist</H3>
        <Para>
          Pinterest ist eine Planungsplattform, kein Spontanmedium. Während ein
          Instagram-Post nach 24 Stunden aus dem Feed verschwindet, hat ein gut
          optimierter Pin eine Lebensdauer von 6 bis 12 Monaten, und
          Evergreen-Pins bringen oft über Jahre Traffic.
        </Para>
        <Para>
          <strong>Wichtig:</strong> Ein Pin ist nach 2 bis 3 Monaten nicht
          etwa am Ende, sondern wird dann gerade erst voll ausgespielt. Die
          Indexierungszeit ist der Anlauf, nicht das Ende.
        </Para>
        <Para>
          <strong>Pinterest belohnt Vorausschauen, nicht Reaktivität:</strong>{' '}
          Pinterest spielt neue Pins langsam aus. Das gibt dir einen enormen
          Vorteil: Du kannst Trends antizipieren, statt darauf zu reagieren.
        </Para>
        <HinweisBox variant="merke">
          <strong>Die goldene Regel:</strong> Zu früh ist besser als zu spät.
          Ein Pin, der 8 Wochen vor dem Event veröffentlicht wird, hat Zeit
          ausgespielt zu werden. Ein Pin, der eine Woche vorher erscheint,
          kommt nicht mehr rechtzeitig an.
        </HinweisBox>

        {/* Block 1b — Produktion vs. Pin-Fenster */}
        <H3>Zwei Zeitachsen: Produktion und Pin-Fenster</H3>
        <Para>
          Beim Timing geht es um zwei verschiedene Dinge, die oft verwechselt
          werden:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Produktionsplanung:</strong> wann du den Content
              erstellst, also Briefing, Design in Canva und die Pins fertig
              machen. Das passiert früh, oft Monate vor dem Event.
            </>,
            <>
              <strong>Pin-Fenster:</strong> wann der fertige Pin live geht und
              ausgespielt wird, also die Wochen vor dem Event, in denen Nutzer
              aktiv suchen.
            </>,
          ]}
        />
        <Para>
          Beispiel: Weihnachts-Pins produzierst du im August oder September,
          live gehen, also pinnen, solltest du sie ab Oktober. Das nimmt Druck:
          Du musst ab August nicht schon pinnen, sondern ab August produzieren,
          um ab Oktober pinnen zu können.
        </Para>

        {/* Block 2 — Vier Phasen */}
        <H3>Die vier Phasen: wann was passieren soll</H3>
        <Para>
          Diese beiden Zeitachsen bilden sich in vier klar definierten Phasen
          ab, von der Produktion bis zum offenen Pin-Fenster. Das Dashboard
          zeigt dir pro Event, in welcher Phase es gerade ist:
        </Para>
        <Bullets
          items={[
            <>
              <strong>🎬 Jetzt produzieren</strong>: Pins werden erstellt und
              zum Veröffentlichen vorbereitet. Das beginnt einige Wochen vor dem
              Pin-Start.
            </>,
            <>
              <strong>📌 Jetzt pinnen</strong>: Pin-Fenster ist offen, neue
              Pins werden veröffentlicht. Das ist die Hauptphase für Pinterest,
              in der Pins indexiert und ausgespielt werden.
            </>,
            <>
              <strong>🚀 Hochphase</strong>: Das Event nähert sich. Keine neuen
              Pins mehr erstellen, Pinterest würde sie nicht mehr rechtzeitig
              ausspielen. Jetzt nur noch beobachten, was funktioniert, und nicht
              mehr in laufende Pins eingreifen.
            </>,
            <>
              <strong>⏳ Noch Zeit</strong>: Event liegt weit in der Zukunft.
              Vormerken, Ideen sammeln, Produktion startet später.
            </>,
          ]}
        />

        {/* Block 3 — Pin-Flow rechnet zurück */}
        <H3>Pin-Flow nimmt dir das Timing ab</H3>
        <Para>
          Das Schwierigste am Timing ist das Zurückrechnen: Wann musst du
          anfangen, damit deine Pins rechtzeitig ausgespielt sind, wenn deine
          Zielgruppe sucht? Genau das übernimmt Pin-Flow. Für jedes Event
          berechnet das System automatisch, ab wann du produzieren und ab wann
          du pinnen solltest, inklusive der Zeit, die Pinterest zur Ausspielung
          braucht.
        </Para>
        <Para>
          Du pflegst nur das Event-Datum, den Rest rechnet das System und zeigt
          dir pro Event die passende Phase an.
        </Para>
        <Para>
          Für die Standard-Events hat Pin-Flow bereits einen sinnvollen Vorlauf
          hinterlegt: Große Events brauchen mehr Vorlauf als kleine, das ist je
          nach Event-Größe voreingestellt. Darum musst du dich nicht kümmern.
          Nur bei eigenen, selbst angelegten Events trägst du den Vorlauf einmal
          selbst ein.
        </Para>

        {/* Block 4 — 70/30-Regel */}
        <H3>70/30-Regel: Evergreen vs. Saisonal</H3>
        <Para>
          Neben saisonalen Inhalten brauchst du Evergreen Content, Inhalte,
          die das ganze Jahr relevant sind und kontinuierlich Traffic bringen.
        </Para>
        <H4>Was guten Evergreen Content ausmacht:</H4>
        <Bullets
          items={[
            'Beantwortet eine zeitlose Frage deiner Zielgruppe',
            'Ist nicht an ein bestimmtes Datum oder Event gebunden',
            'Kann saisonal leicht angepasst werden',
          ]}
        />
        <H4>Beispiele:</H4>
        <Bullets
          items={[
            <>
              „Pasta-Soße einfrieren: 3 Methoden" → ganzjährig relevant
            </>,
            <>
              „Etsy-Shop optimieren: 5 Schritte" → ganzjährig relevant
            </>,
            <>
              „Glühwein-Rezept ohne Alkohol" → nur saisonal relevant
            </>,
            <>
              „Etsy: Black-Friday-Aktionen vorbereiten" → nur saisonal relevant
            </>,
          ]}
        />
        <Para>
          <strong>Empfehlung:</strong> 70% deiner Pins sollten Evergreen
          Content sein, 30% saisonal. So hast du ganzjährig Traffic und nutzt
          zusätzlich saisonale Peaks.
        </Para>

        {/* Block 5 — Ganzjähriger Rhythmus */}
        <H3>Ganzjähriger Rhythmus: kein Leerlauf zwischen den Saisonen</H3>
        <Para>
          Der Schlüssel: Du pinnst immer für die <strong>kommende</strong>
          {' '}Saison, nicht für die laufende, und produzierst schon für die
          übernächste. So sieht ein typischer Monats-Überblick aus:
        </Para>
        <WissenTabelle
          headers={[
            'Monat',
            'Jetzt pinnen (für die kommende Saison)',
            'Jetzt produzieren (für die übernächste)',
            'Auswerten',
          ]}
          rows={[
            [
              'Januar',
              'Valentinstag, Frühling',
              'Ostern, Muttertag',
              'Weihnachtssaison',
            ],
            [
              'April',
              'Muttertag, Sommer',
              'Sommerschlussverkauf, Einschulung',
              'Ostern, Frühling',
            ],
            [
              'Juli',
              'Einschulung, Herbst',
              'Halloween, Weihnachten',
              'Frühling, Muttertag',
            ],
            [
              'Oktober',
              'Weihnachten, Silvester',
              'Valentinstag, Frühling (Folgejahr)',
              'Halloween, Herbst',
            ],
          ]}
        />
        <H4>Nebensaisons als zusätzliche Chance:</H4>
        <Para>
          Neben den Hauptsaisons gibt es kleinere Anlässe mit weniger
          Wettbewerb. Für deutsche Pinner besonders relevant:
        </Para>
        <Bullets
          items={[
            'Einschulung und Schulanfang (August und September, stark für Deko, Schultüten und Geschenke)',
            'Karneval und Fasching (Januar bis März, regional)',
            'Oktoberfest (September und Oktober)',
            'Erntedank (Anfang Oktober)',
            'Adventszeit (eigene Phase vor Weihnachten)',
            'Sommerschlussverkauf (Juli und August)',
            'Spargel- und Erdbeerzeit sowie Gartensaison (Frühjahr)',
          ]}
        />
        <Para>
          Dazu kommen branchenspezifische Nebensaisons, die je nach Nische
          wichtig sind. Sie bieten die Chance, in Zeiträumen mit weniger
          Wettbewerb Sichtbarkeit zu gewinnen.
        </Para>

        {/* Block 6 — Pflege */}
        <H3>
          Saisonkalender pflegen, einmal im Jahr für zwei Jahre vorausplanen
        </H3>
        <Para>
          Der Saisonkalender in diesem System ist vorausgefüllt mit den
          wichtigsten Events. Empfehlung: Im Dezember oder Januar einmal im
          Jahr die Daten für die kommenden ZWEI Jahre vorausplanen.
        </Para>
        <H4>Was zu tun ist:</H4>
        <Bullets
          items={[
            'Feiertage prüfen (Ostern wechselt jährlich, ebenso bewegliche Feiertage)',
            'Persönliche Events ergänzen (Launches, Messen, Kampagnen)',
            'Branchenspezifische Anlässe ergänzen (z.B. der Jahrestag deiner Geschäftsgründung)',
            'Neue Saisons hinzufügen, die du im Jahr beobachtet hast und die für deine Nische relevant sind',
          ]}
        />
        <Para>
          <strong>Zeitaufwand:</strong> etwa 10-15 Minuten pro Jahr für zwei
          Jahre vorausgeplant.
        </Para>

        {/* Block 7 — Häufige Fehler */}
        <H3>Häufige Fehler vermeiden</H3>
        <H4>1. Zu spät starten</H4>
        <Para>
          Wenn du im Dezember anfängst, Weihnachts-Pins zu posten, hast du
          den Großteil der Planungsphase deiner Zielgruppe bereits verpasst.
          Nutzer:innen suchen Weihnachts-Inhalte ab Oktober.
        </Para>
        <H4>2. Generische Keywords statt saisonaler Recherche</H4>
        <Para>
          Was 2026 funktioniert, ist 2027 vielleicht nicht mehr relevant.
          Pinterest-Suchverhalten ändert sich. Vor jeder Saison einmal die
          aktuellen Trends prüfen (Pinterest Trends Tool, Pinterest-Suche-Auto-
          vervollständigung).
        </Para>
        <H4>3. Nur Hauptsaisons bedienen, Zwischenzeiten leer</H4>
        <Para>
          Wer nur zur Weihnachtssaison aktiv ist, verliert Reichweite in den
          restlichen 11 Monaten. Pinterest-Algorithmus belohnt kontinuierliche
          Aktivität.
        </Para>
        <H4>4. Performance nicht analysieren</H4>
        <Para>
          Welche Saison-Kampagne hat funktioniert, welche nicht? Ohne Auswertung
          wiederholst du jedes Jahr die gleichen Fehler. Genau hier hilft dir
          Pin-Flow: Es zeigt dir, welche Pins in welcher Saison am besten
          funktioniert haben, sodass du jedes Jahr datenbasiert besser wirst.
        </Para>

        {/* Block 8 — Tool-Block mit Claude-Prompt */}
        <H3>Welche Events sind für DEINE Nische relevant?</H3>
        <Para>
          Nicht jedes Event passt zu jeder Nische. Ein Yoga-Account priorisiert
          andere Saisonen als ein Etsy-Shop für Wohnaccessoires. Pin-Flow bietet
          dir hier ein KI-gestütztes Coaching, das dir die für deine Nische
          passenden Events vorschlägt: Kopiere den folgenden Prompt in eine KI
          deiner Wahl, und du erhältst eine personalisierte Saison-Strategie.
        </Para>
        <CopyPromptBlock
          title="Welche Events sind für DEINE Nische relevant?"
          prompt={`Ich betreibe einen Pinterest-Account in der Nische [DEINE NISCHE HIER, z.B. "Yoga & Wellness für Selbstständige"]. Mein Ziel ist [DEIN ZIEL, z.B. "Reichweite + E-Mail-Liste aufbauen"]. Mein Hauptangebot ist [DEIN ANGEBOT, z.B. "Online-Yoga-Kurse"].

Bitte erstelle mir eine personalisierte Saison-Strategie für Pinterest mit:

1. Welche 5-8 Hauptsaisons sind für meine Nische besonders relevant?
2. Welche 3-5 Nebensaisons (kleinere Anlässe) sollte ich beachten?
3. Welche saisonalen Themen kann ich aus meinem Hauptangebot ableiten?
4. Was sind typische Sucheingaben meiner Zielgruppe pro Saison auf Pinterest?
5. Wie viele Wochen vor dem Event sollte ich produzieren / pinnen für jede dieser Saisons?

Berücksichtige das Pinterest-Suchverhalten: Nutzer recherchieren mehrere Wochen bis Monate vor einem Event, und ein Pin braucht Vorlauf, bis er voll ausgespielt ist. Große Events brauchen mehr Vorlauf als kleine.`}
          steps={
            <div>
              <H4>So gehst du vor:</H4>
              <OrderedList>
                <li>Klick auf „Prompt kopieren"</li>
                <li>Öffne eine KI deiner Wahl</li>
                <li>
                  Füge den Prompt ein und ersetze die drei Platzhalter (Nische,
                  Ziel, Angebot) mit deinen Angaben
                </li>
                <li>
                  Du erhältst eine personalisierte Saison-Strategie, die du
                  direkt im Saisonkalender umsetzen kannst
                </li>
              </OrderedList>
            </div>
          }
        />
      </Accordion>

    </div>
  )
}

// ===========================================================
// Tab 2 — Strategie-Modelle
// ===========================================================

function TabStrategien() {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Dein Plan: Geschäftsmodell, Pin-Ziele und die vier Bausteine.
      </p>
      <Accordion title="Von Glück zu System: warum eine Strategie wichtig ist">
        <HinweisBox variant="tipp">
          <strong>Erst die Zielgruppe, dann die Strategie.</strong> Bevor du
          deine Strategie festlegst, kläre, wen du überhaupt ansprechen willst.
          Erst wenn du deinen Wunschkunden kennst, kannst du daraus eine
          sinnvolle Strategie ableiten: welche Inhalte, welche Angebote, welche
          Pin-Ziele zu ihm passen. Wie du deine Zielgruppe Schritt für Schritt
          herausarbeitest, zeigt dir der Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=audience"
            className="font-medium text-red-600 hover:underline"
          >
            Zielgruppe verstehen
          </Link>
          .
        </HinweisBox>
        <Para>
          Die meisten Menschen, die Pinterest für ihr Business nutzen, machen
          denselben Fehler: Sie pinnen fleißig, aber ohne klares Ziel. Sie
          produzieren Inhalte, weil sie glauben, mehr Pins = mehr Reichweite.
          Das stimmt nicht.
        </Para>
        <Para>
          Pinterest belohnt keine reine, unregelmäßige Aktivität. Pinterest
          belohnt <strong>Relevanz</strong> und <strong>Konsistenz</strong>.
        </Para>
        <Para>
          Relevanz entsteht nicht durch Zufall. Sie entsteht durch eine klare
          Strategie, die festlegt:
        </Para>
        <Bullets
          items={[
            'Wen du ansprechen willst',
            'Was du dieser Person anbieten willst',
            'Wie Pinterest-Traffic zu echten Ergebnissen für dein Business wird',
          ]}
        />
        <Para>
          Wer ohne Strategie pinnt, verschwendet Zeit. Mit Strategie baust du
          ein System, das auch arbeitet, wenn du schläfst.
        </Para>
        <Para>
          Eine Strategie ist kein einmaliger Plan, sondern ein Kreislauf. Wer
          nur pinnt, aber nie auswertet, läuft nicht nach Strategie, sondern
          rät. Erst die Auswertung zeigt dir, welche Pins, Keywords und Themen
          wirklich funktionieren, und genau daraus entsteht der nächste, bessere
          Schritt.
        </Para>
        <div className="my-4">
          <svg
            viewBox="0 0 420 150"
            role="img"
            aria-label="Strategie-Ablauf: einmal Planen, dann der laufende Kreislauf aus Umsetzen, Auswerten und Anpassen, der zu Umsetzen zurückführt"
            className="h-auto w-full max-w-xl"
          >
            <defs>
              <marker
                id="kette-pfeil"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#9ca3af" />
              </marker>
            </defs>

            <line x1="94" y1="46" x2="113" y2="46" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#kette-pfeil)" />
            <line x1="200" y1="46" x2="217" y2="46" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#kette-pfeil)" />
            <line x1="304" y1="46" x2="321" y2="46" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#kette-pfeil)" />

            <path
              d="M366 66 C366 120, 158 120, 158 68"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              markerEnd="url(#kette-pfeil)"
            />

            <rect x="6" y="28" width="88" height="36" rx="8" fill="#ffffff" stroke="#e5e7eb" />
            <rect x="116" y="28" width="84" height="36" rx="8" fill="#ffffff" stroke="#e5e7eb" />
            <rect x="220" y="28" width="84" height="36" rx="8" fill="#ffffff" stroke="#e5e7eb" />
            <rect x="324" y="28" width="84" height="36" rx="8" fill="#ffffff" stroke="#e5e7eb" />

            <text x="50" y="40" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="600" fill="#1f2937">
              Strategie
            </text>
            <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="600" fill="#1f2937">
              festlegen
            </text>
            <text x="158" y="46" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="600" fill="#1f2937">
              Umsetzen
            </text>
            <text x="262" y="46" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="600" fill="#1f2937">
              Auswerten
            </text>
            <text x="366" y="46" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="600" fill="#1f2937">
              Anpassen
            </text>

            <text x="50" y="82" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#9ca3af">
              einmal zu Beginn
            </text>
            <text x="262" y="136" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#9ca3af">
              der laufende Kreislauf
            </text>
          </svg>
        </div>
        <Para>
          Pin-Flow ist genau dafür gebaut: Es zeigt dir, was funktioniert,
          sodass deine Strategie mit jeder Auswertung schärfer wird, statt im
          Blindflug zu bleiben.
        </Para>
        <Para>
          Deinen ersten konkreten Schritt legst du im Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-red-600 hover:underline"
          >
            Strategie festlegen
          </Link>{' '}
          fest. Dort führt dich der Strategie-Wizard durch deine vier Bausteine.
        </Para>
        <HinweisBox variant="merke">
          <strong>Merke:</strong> So ist deine Sichtbarkeit kein Glück mehr,
          sondern ein System, das
          funktioniert.
        </HinweisBox>
      </Accordion>

      <Accordion title="Mit Pinterest Geld verdienen: die Wege im Überblick">
        <Para>
          Pinterest zahlt dir selbst kein Geld, es ist ein Traffic-Hebel: Es
          bringt dir qualifizierte, kaufbereite Besucher. Verdient wird fast
          immer indirekt, außerhalb der Plattform. Die Wege lassen sich danach
          ordnen, ob du eine eigene Website oder einen Blog hast oder nicht.
        </Para>

        <div className="space-y-5 rounded-md border border-gray-200 bg-white p-4">
          <H3>Geld verdienen über deine Blog-Beiträge</H3>
          <Para>
            Wenn du einen Blog hast, führt Pinterest Leser auf deine Artikel,
            und dort entstehen gleich mehrere Einnahmen auf demselben Beitrag.
          </Para>

          <div className="space-y-2">
            <H4>Werbeeinnahmen</H4>
            <Para>
              Auf deinen Blogartikeln läuft Werbung. Je mehr Leser, desto mehr
              Einnahmen.
            </Para>
            <Bullets
              items={[
                'Werbeplattformen wie Google AdSense, Mediavine oder Raptive blenden die Anzeigen ein',
                'Die meisten Werbeplattformen verlangen eine Mindestanzahl an Artikeln',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H4>Affiliate im Beitrag</H4>
            <Para>
              Du empfiehlst im Artikel passende Produkte und verdienst eine
              Provision, wenn jemand über deinen Link kauft.
            </Para>
            <Bullets
              items={[
                'Provision je Verkauf, abhängig vom jeweiligen Affiliate-Programm',
                'Im Beitrag eingebettet wirkt die Empfehlung glaubwürdiger als ein einzelner Link',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H4>VG Wort</H4>
            <Para>
              Ein in Deutschland oft übersehener Einnahmestrom, losgelöst von
              Pinterest, aber ein echter kleiner Goldnugget. Die VG Wort
              vergütet Blogartikel, die genug Leser erreichen, mit etwa 30 bis
              50 Euro pro Artikel und Jahr.
            </Para>
            <Bullets
              items={[
                'Pinterest liefert genau den Traffic, der die nötigen Mindestzugriffe erreichbar macht',
                'Bei vielen Artikeln summiert sich das spürbar',
              ]}
            />
          </div>
        </div>

        <div className="space-y-5 rounded-md border border-gray-200 bg-white p-4">
          <H3>Geld verdienen über deine Website</H3>
          <Para>
            Auch ohne klassischen Blog kannst du Pinterest-Traffic auf deine
            eigene Website lenken und dort verkaufen.
          </Para>

          <div className="space-y-2">
            <H4>Eigene Produkte verkaufen, digital oder physisch</H4>
            <Para>
              Du verkaufst E-Books, Vorlagen und Online-Kurse oder echte
              Produkte über deinen Shop.
            </Para>
            <Bullets
              items={[
                'Shop-Optionen: eigene Website, Shopify, WooCommerce, Etsy oder Pinterest Shopping mit Produktkatalog',
                'Digitale Produkte haben die höchste Gewinnmarge',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H4>Dienstleistungen anbieten</H4>
            <Para>
              Du bietest Coaching, Beratung, Design und Ähnliches an. Pinterest
              bringt dir die passenden Anfragen auf deine Buchungs- oder
              Angebotsseite.
            </Para>
            <Bullets
              items={[
                'Geeignet für Coaching, Beratung, Design und ähnliche Angebote',
                'Pinterest führt Interessenten direkt auf deine Buchungs- oder Angebotsseite',
              ]}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-gray-200 bg-white p-4">
          <H3>E-Mail-Liste aufbauen</H3>
          <Para>
            Ein besonders starker indirekter Weg, der über Blog wie Website
            gleichermaßen funktioniert. Du bietest etwas Kostenloses an, zum
            Beispiel eine Checkliste, ein Mini-E-Book oder eine Vorlage, und im
            Gegenzug trägt sich der Besucher mit seiner E-Mail-Adresse ein. So
            wird aus einem einmaligen Pinterest-Besucher ein dauerhafter
            Kontakt, dem du später immer wieder Angebote machen kannst,
            unabhängig von Pinterest.
          </Para>
        </div>

        <div className="space-y-5 rounded-md border border-gray-200 bg-white p-4">
          <H3>Möglichkeiten ohne eigene Website</H3>
          <Para>
            Du kannst auch ganz ohne eigene Seite starten, auch wenn der Weg
            über eine eigene Website meist nachhaltiger ist.
          </Para>

          <div className="space-y-2">
            <H4>Direktes Affiliate</H4>
            <Para>
              Affiliate-Links sind auf Pinterest offiziell erlaubt. Wichtig ist,
              sie klar als Werbung zu kennzeichnen und Pinterests Regeln
              einzuhalten.
            </Para>
            <Bullets
              items={[
                'Klar als Werbung kennzeichnen, zum Beispiel mit #werbung oder #affiliate',
                'Keine Link-Verschleierung und keine URL-Kürzer verwenden',
                'Nicht denselben Link massenhaft wiederholen',
              ]}
            />
            <Para>
              Am nachhaltigsten ist es, über die eigene Website zu gehen und dort
              in einem Blogbeitrag oder über einen Linktree auf die
              Affiliate-Angebote zu verweisen, das wirkt vertrauenswürdiger und
              konvertiert oft besser.
            </Para>
            <Para>
              Die genauen Regeln stehen in der{' '}
              <Link
                href="https://policy.pinterest.com/de/commercial-and-branded-content-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-red-600 hover:underline"
              >
                offiziellen Pinterest-Richtlinie
              </Link>
              .
            </Para>
          </div>

          <div className="space-y-2">
            <H4>Pinfluencer (gesponserte Kooperationen)</H4>
            <Para>
              Mit einer starken, themenspezifischen Reichweite zahlen dich Marken
              dafür, ihre Produkte zu zeigen.
            </Para>
            <Bullets
              items={[
                'Eher für Accounts mit bereits etablierter Sichtbarkeit in einer klaren Nische',
              ]}
            />
          </div>
        </div>

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Pinterest ist der Kanal, nicht die
          Einnahmequelle. Wer mehrere Wege kombiniert, baut echte
          Einkommenssicherheit auf.
        </HinweisBox>
      </Accordion>

      <Accordion title="Angebotsart und Pin-Ziel: was du anbietest und wohin der Pin führt">
        <Para>
          An jedem Pin stehen zwei unabhängige Angaben, die du frei
          kombinierst: die Angebotsart und das Pin-Ziel.
        </Para>
        <Para>
          Die <strong>Angebotsart</strong> sagt, womit du verdienst, also welche
          Art von Inhalt der Pin bedient: Blog-Content, Affiliate, Produkt oder
          Dienstleistung. Das <strong>Pin-Ziel</strong> sagt, wohin der Pin
          führt, also auf welche Fläche: Blog, Shop auf eigener Website,
          Etsy-Shop, Affiliate-Seite, Landingpage, Newsletter oder Lead-Magnet,
          Buchungs- oder Angebotsseite. Dieselbe Angebotsart kann zu
          verschiedenen Pin-Zielen führen.
        </Para>

        <H3>Die vier Angebotsarten</H3>

        <div className="space-y-2">
          <H4>Blog-Content</H4>
          <Para>
            Der Pin führt auf deinen eigenen Inhalt, etwa einen Blogbeitrag,
            eine Rezeptseite oder einen Guide. Der Kerngedanke: erst Vertrauen
            aufbauen, dann konvertieren.
          </Para>
        </div>

        <div className="space-y-2">
          <H4>Affiliate</H4>
          <Para>
            Der Pin führt zu empfohlenen Produkten über Partnerlinks, entweder
            über einen Blogbeitrag oder direkt zur Produktseite.
          </Para>
        </div>

        <div className="space-y-2">
          <H4>Produkt</H4>
          <Para>
            Der Pin führt zum Verkauf deiner eigenen Produkte, über deinen Shop
            auf eigener Website oder über Etsy.
          </Para>
        </div>

        <div className="space-y-2">
          <H4>Dienstleistung</H4>
          <Para>
            Für Selbstständige mit eigenem Angebot, etwa Coaches, Berater,
            Designer oder Trainer. Das Ziel ist Lead-Generierung: Die Pins
            führen auf eine Landingpage, eine Buchungsseite oder zum Newsletter.
          </Para>
        </div>

        <HinweisBox>
          <strong>Beispiel Affiliate, zwei Wege, beide legitim:</strong> Ein
          Affiliate-Blogbeitrag hat die Angebotsart „Affiliate" und das Pin-Ziel
          „Blog", der Pin führt auf deinen Artikel, in dem die Partnerlinks
          stehen. Ein direkter Affiliate-Pin hat die Angebotsart „Affiliate" und
          das Pin-Ziel „Affiliate-Seite", der Pin führt direkt zur Partnerseite.
          Beim Anlegen wählst du beides getrennt: die Angebotsart und, über die
          verknüpfte Ziel-URL, das Pin-Ziel. Du bist frei in der Kombination.
        </HinweisBox>

        <H3>Die sieben Pin-Ziele</H3>
        <Para>Jeder Pin führt auf genau eine dieser sieben Flächen:</Para>
        <WissenTabelle
          headers={['Pin-Ziel', 'Wohin der Pin führt und wofür es zählt']}
          rows={[
            [
              'Blog',
              'Menschen lesen deinen Beitrag. Du baust Reichweite, Vertrauen und Themenautorität auf.',
            ],
            [
              'Shop auf eigener Website',
              'Direkter Weg zu deinen eigenen Produkten und zum Verkauf.',
            ],
            [
              'Etsy-Shop',
              'Verkauf über deinen Etsy-Shop, ohne eigene Shop-Seite.',
            ],
            [
              'Affiliate-Seite',
              'Empfohlene Produkte über Partnerlinks. Du verdienst an Provisionen.',
            ],
            [
              'Landingpage',
              'Eine fokussierte Seite für ein einzelnes Angebot, eine Anmeldung oder eine Aktion.',
            ],
            [
              'Newsletter oder Lead-Magnet',
              'Menschen tragen sich ein. Du gewinnst einen direkten Kontakt, unabhängig von Pinterest.',
            ],
            [
              'Buchungs- oder Angebotsseite',
              'Anfragen, Erstgespräche oder Buchungen für deine Dienstleistung.',
            ],
          ]}
        />

        <H3>Welche Angebotsart führt typischerweise wohin</H3>
        <WissenTabelle
          headers={['Angebotsart', 'Typisches Pin-Ziel']}
          rows={[
            [
              'Blog- oder Content-Pin',
              'Blog, darüber auch Newsletter oder Affiliate-Seite',
            ],
            ['Eigenes Produkt', 'Shop auf eigener Website oder Etsy-Shop'],
            ['Dienstleistung', 'Buchungs- oder Angebotsseite, Landingpage'],
            ['Affiliate (direkt)', 'Affiliate-Seite'],
            ['Lead-Magnet', 'Newsletter oder Lead-Magnet'],
          ]}
        />
        <Para>
          Das ist nur eine Orientierung, kein Zwang. Pin-Flow erlaubt jede
          Kombination aus Angebotsart und Pin-Ziel.
        </Para>

        <Para>
          Du verteilst deine Pins bewusst auf die Ziele, die für dich zählen. Im
          Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-red-600 hover:underline"
          >
            Strategie festlegen
          </Link>{' '}
          legst du diese Verteilung in Prozent fest, danach prüft Pin-Flow Monat
          für Monat, ob deine tatsächlichen Pins zu dieser Verteilung passen. Wie
          du sinnvoll gewichtest, zeigt dir der nächste Abschnitt.
        </Para>
      </Accordion>

      <Accordion title="Wie du deine Pins auf die Ziele verteilst">
        <Para>
          Die meisten erfolgreichen Accounts bedienen mehrere Pin-Ziele, aber
          mit klarer Gewichtung. Ein Beispiel:
        </Para>
        <ul className="space-y-1.5 pl-1 text-sm leading-relaxed text-gray-700">
          <li>
            <strong className="text-red-600">60 Prozent</strong> Blog:
            Reichweite, Vertrauen und deine E-Mail-Liste
          </li>
          <li>
            <strong className="text-red-600">30 Prozent</strong>{' '}
            Affiliate-Seite: passive Einnahmen über Empfehlungen
          </li>
          <li>
            <strong className="text-red-600">10 Prozent</strong> Shop:
            Direktverkauf deiner eigenen Produkte
          </li>
        </ul>
        <Para>
          Der Schlüssel ist <strong>bewusste Gewichtung</strong>. Wer auf alle
          Ziele gleich setzt, verliert den Fokus.
        </Para>

        <H4>Wie du deine Gewichtung findest</H4>
        <Bullets
          items={[
            'Was bringt mir heute schon Ergebnisse? Dort mehr investieren.',
            'Was will ich langfristig aufbauen? Dort kontinuierlich investieren.',
            'Was passt zu meinen Stärken und meinem Business?',
          ]}
        />

        <H3>Schwerpunkt je Business-Modell</H3>
        <WissenTabelle
          headers={['Business-Modell', 'Schwerpunkt der Pin-Ziele']}
          rows={[
            [
              'Blog mit Werbeanzeigen',
              'Vor allem Blog, ergänzt um Newsletter oder Lead-Magnet',
            ],
            [
              'Online-Kurs-Anbieter',
              'Vor allem Shop auf eigener Website, ergänzt um Blog und Landingpage',
            ],
            ['Affiliate-Marketer', 'Vor allem Affiliate-Seite, ergänzt um Blog'],
            [
              'Physischer Shop',
              'Vor allem Shop auf eigener Website oder Etsy-Shop, ergänzt um Blog',
            ],
            [
              'Coach oder Berater',
              'Buchungs- oder Angebotsseite und Landingpage, ergänzt um Blog',
            ],
            [
              'Dienstleister (Designer, Friseur, Heilpraktiker, Trainer)',
              'Vor allem Buchungs- oder Angebotsseite, ergänzt um Blog',
            ],
            [
              'Content-Creator mit Mix',
              'Blog als Basis, dazu Affiliate-Seite und Shop',
            ],
            [
              'Newsletter-Fokus',
              'Vor allem Newsletter oder Lead-Magnet, ergänzt um Blog',
            ],
          ]}
        />

        <div className="space-y-2">
          <H4>Coach oder Berater</H4>
          <Para>
            Coaches und Berater verkaufen Vertrauen. Vertrauen entsteht über
            nützliche Inhalte auf deinem Blog und über sichtbare Expertise.
            Führe deine Pins schwerpunktmäßig auf deine Buchungs- oder
            Angebotsseite und auf Landingpages, ergänzt um Blog-Pins, die
            Reichweite und Vertrauen aufbauen.
          </Para>
        </div>

        <div className="space-y-2">
          <H4>Dienstleister</H4>
          <Para>
            Für reine Dienstleister (Designer, Friseur, Heilpraktiker, Trainer)
            zählt die Sichtbarkeit deiner Arbeit. Führe die meisten Pins auf
            deine Buchungs- oder Angebotsseite, ergänzt um Blog-Pins mit
            Ratgeber, FAQ und Tipps aus deiner Branche.
          </Para>
        </div>

        <Para>
          Im Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-red-600 hover:underline"
          >
            Strategie festlegen
          </Link>{' '}
          legst du deine Gewichtung in Prozent fest, danach prüft Pin-Flow Monat
          für Monat, ob deine tatsächlichen Pins zu dieser Verteilung passen, und
          zeigt dir, wo du nachsteuern solltest.
        </Para>
      </Accordion>

      <Accordion title="Deine Strategie in vier Bausteinen">
        <Para>
          Deine Strategie steht auf vier Bausteinen. Im Tab „Strategie
          festlegen" beantwortest du sie Schritt für Schritt. Hier erfährst du,
          worum es bei jedem geht.
        </Para>
        <OrderedList>
          <li>
            <strong>Business-Modell und Hauptnische</strong>
            <br />
            <span className="text-gray-600">
              Was beschreibt dein Business am besten: Blog oder
              Content-Website, eigener Shop, Dienstleistung oder Affiliate?
              Mehrfachauswahl ist möglich. Dazu wählst du deine Hauptnische,
              damit Pin-Flow deine Zahlen mit typischen Werten dieser Nische
              vergleichen kann.
            </span>
          </li>
          <li>
            <strong>Pin-Ziel-Verteilung</strong>
            <br />
            <span className="text-gray-600">
              Wohin sollen deine Pins die Menschen führen: Blog, Shop, Etsy,
              Affiliate-Seite, Landingpage, Newsletter und Lead-Magnet oder
              Buchungsseite? Du verteilst 100 Prozent auf die Flächen, die für
              dich zählen.
            </span>
          </li>
          <li>
            <strong>Content-Säulen</strong>
            <br />
            <span className="text-gray-600">
              Die drei bis fünf großen Themen, um die sich bei dir alles dreht.
              Pin-Flow leitet sie aus den Kategorien deiner Boards ab. Klare
              Schwerpunkte helfen Pinterest, dich richtig einzuordnen und den
              passenden Menschen zu zeigen.
            </span>
          </li>
          <li>
            <strong>Pinning-Rhythmus</strong>
            <br />
            <span className="text-gray-600">
              Wie oft du pinnst: als Einsteiger, im Wachstum oder etabliert.
              Wichtiger als die Menge ist, dass du dranbleibst. Konsistenz
              schlägt Masse.
            </span>
          </li>
        </OrderedList>
        <HinweisBox variant="tipp">
          <strong>Hinweis:</strong> Deine Zielgruppe musst du hier nicht
          festlegen. Sobald du im
          Analytics-Bereich deine Pinterest-Zielgruppen-Daten (Interagierende
          Zielgruppe) hochlädst, wertet Pin-Flow sie automatisch aus und zeigt
          dir die Erkenntnisse im Analytics-Bereich und auf deinem Dashboard.
        </HinweisBox>
        <HinweisBox variant="merke">
          <strong>Merke:</strong> Eine mittelmäßige Strategie, konsequent
          umgesetzt, schlägt eine
          perfekte Strategie, die nie umgesetzt wird.
        </HinweisBox>
        <Para>
          Bereit? Dann leg jetzt im Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-red-600 hover:underline"
          >
            Strategie festlegen
          </Link>{' '}
          deine vier Bausteine fest, Schritt für Schritt.
        </Para>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 4 — Pin-Gestaltung
// ===========================================================

function TabDesign() {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Wie du Pins baust und effizient produzierst.
      </p>
      <Accordion title="Pin-Format und Design-Grundlagen">
        <Para>
          Ein Pin hat nur einen kurzen Moment, um Aufmerksamkeit zu gewinnen. In
          dieser Sekunde entscheidet der Betrachter, ob er weiterscrollt oder
          klickt. Gutes Design ist also kein Beiwerk, sondern dein wichtigster
          Hebel.
        </Para>

        <H4>Format und technische Grundlagen</H4>
        <Bullets
          items={[
            <>
              Hochformat im Verhältnis 2:3, also{' '}
              <strong className="font-semibold">1000 x 1500 Pixel</strong>
            </>,
            'Querformate werden in der Suche abgeschnitten, quadratische Pins fallen weniger auf als hochformatige',
            'Maximale Dateigröße: 20 MB',
          ]}
        />
        <Para>
          Pinterest ist eine mobile Plattform, über 80 Prozent der Menschen
          scrollen auf dem Smartphone. Das Hochformat füllt den Bildschirm und
          gibt dir den meisten Platz für deine Bildaussage.
        </Para>

        <H4>Worauf es wirklich ankommt</H4>
        <Para>
          Egal welchen Pin-Typ du wählst: Qualität, ein starker Hook, ein gutes
          Design und thematische Relevanz entscheiden zuerst. Ein Pin mit
          ruhigem Aufbau, gut lesbarer Schrift und einer klaren Bildaussage
          wirkt stärker als einer, der mit Effekten, vielen Farben und Text
          überladen ist. Das gilt für jeden Pin-Typ.
        </Para>

        <HinweisBox variant="tipp">
          <strong>Hinweis:</strong> Beim Anlegen eines Pins kannst du in
          Pin-Flow den Pin-Typ erfassen, zum Beispiel Standard oder Video. Das
          dient der späteren Auswertung, ist aber keine Strategie-Vorgabe.
        </HinweisBox>
      </Accordion>

      <Accordion title="Standard, Video oder Collage? Alle Pin-Typen im Überblick">
        <Para>
          Alle Pins teilen dasselbe Hochformat, doch es gibt verschiedene
          Pin-Typen, und jeder hat eine eigene Stärke. Den Typ wählst du beim
          Anlegen eines Pins unter „Pin Typ".
        </Para>

        <div className="space-y-2.5">
          <PinTypKarte name="Standard-Pin" zusatz="statisches Bild">
            Der häufigste und wichtigste Typ. Ein einzelnes hochformatiges Bild
            mit Link zu deiner Zielseite. Langlebig und stark für die Sichtbarkeit, wird über
            Monate hinweg in der Suche ausgespielt und ist die ideale Basis für
            Evergreen-Inhalte. Das Fundament jeder Pinterest-Strategie.
          </PinTypKarte>
          <PinTypKarte name="Video-Pin">
            Ein kurzes Video, das im Feed automatisch abspielt. Bekommt oft mehr
            Sichtbarkeit, weil bewegte Inhalte Aufmerksamkeit halten.
            Entscheidend sind die ersten Sekunden, dein Hook muss sofort sitzen,
            sonst wird weitergescrollt. Gut, um Abläufe, Verwandlungen oder
            Produkte in Aktion zu zeigen.
          </PinTypKarte>
          <PinTypKarte name="Carousel-Pin">
            Zwei bis fünf durchwischbare Karten in einem Pin. Jede Karte kann
            ihren eigenen Ziel-Link haben, oder alle teilen einen Link. Ideal
            für Schritt-für-Schritt-Anleitungen, mehrere Produktvarianten oder
            Vorher-Nachher-Geschichten. Weil Menschen aktiv durchwischen, eignet
            er sich gut für Vertrauensaufbau und längeres Verweilen. Hinweis:
            Carousel-Pins lassen sich nur am Desktop erstellen, nicht in der
            App.
          </PinTypKarte>
          <PinTypKarte name="Collage-Pin">
            Ein Pin, bei dem du einzelne Bildelemente digital ausschneidest und
            zu einer visuellen Geschichte zusammensetzt, zum Beispiel ein
            Mood-Board, eine Outfit-Kombination oder eine
            Produkt-Zusammenstellung. Jedes ausgeschnittene Element ist
            antippbar und kann auf eine Quelle oder ein Produkt verlinken.
            Collagen werden auf Pinterest rund dreimal häufiger gespeichert als
            gewöhnliche Pins und sind besonders bei jüngeren Zielgruppen
            beliebt. Am einfachsten erstellst du sie direkt in der
            Pinterest-App, die Desktop-Funktion wird gerade ausgerollt.
          </PinTypKarte>
          <PinTypKarte name="Shopping-Pin">
            Ein Pin, der Produktdaten wie Preis und Verfügbarkeit direkt anzeigt
            und unmittelbar zu deinen Shop-Produkten führt. Pinterest zieht
            diese Angaben automatisch von deiner Website. Für Shop-Betreiber und
            Produktverkauf ist dieser Typ unverzichtbar, Pinterest ist längst
            eine visuelle Shopping-Suchmaschine. Der Shopping-Pin ist für deinen
            eigenen Shop gedacht, nicht für Affiliate. Affiliate-Produkte
            bewirbst du über normale Pins mit dem Affiliate-Link als Ziel.
          </PinTypKarte>
        </div>

        <div className="mt-4 rounded-md bg-gray-50 p-4">
          <H4>Nutze die Vielfalt der Pin-Typen</H4>
          <Para>
            Pinterest belohnt Accounts, die verschiedene Pin-Typen einsetzen.
            Wer nur Standard-Pins erstellt, verschenkt Reichweite. Bewegte und
            neue Formate wie Video, Carousel und Collage bekommen oft einen
            zusätzlichen Sichtbarkeits-Schub. Der Standard-Pin bleibt deine
            Basis, weil er langlebig und stark für die Sichtbarkeit ist. Mische aber bewusst
            andere Typen bei, für Shop und Produkte zusätzlich Shopping-Pins.
            Diese Vielfalt erhöht deine Chancen, gezeigt zu werden.
          </Para>
        </div>
      </Accordion>

      <Accordion title="Hook vs. Titel: der Unterschied">
        <Para>
          Viele verwechseln Hook und Titel. Dabei sind es zwei verschiedene
          Dinge mit verschiedenen Aufgaben.
        </Para>
        <Para>
          <strong>Hook</strong>: Text auf dem Pin-Bild. Wird im Feed gesehen,
          bevor der Pin angeklickt wird. Aufgabe: den Klick sichern.
        </Para>
        <Para>
          <strong>Titel</strong>: Sichtbarkeits-Text unter dem Pin. Wird von
          Pinterest für die Suche genutzt. Aufgabe: gefunden werden und Klick
          bestätigen.
        </Para>
        <WissenTabelle
          headers={[
            'Kriterium',
            'Hook (auf dem Bild)',
            'Titel (Sichtbarkeits-Text)',
          ]}
          rows={[
            [
              'Wo sichtbar',
              'Im Feed auf dem Bild',
              'Unter dem Pin und in der Suche',
            ],
            [
              'Hauptaufgabe',
              'Aufmerksamkeit + Klick sichern',
              'Gefunden werden + Klick bestätigen',
            ],
            ['Länge', 'Max. 6 bis 8 Wörter', 'Max. 100 Zeichen'],
            [
              'Keywords',
              'Keyword einbauen, wird per OCR gelesen',
              'Pflicht, ganz vorne',
            ],
            ['Ton', 'Emotional, neugierig-machend', 'Klar, informativ'],
          ]}
        />
        <HinweisBox variant="merke">
          <strong>Merke:</strong> Das Bild ist der Köder, der Hook ist der Haken.
        </HinweisBox>
      </Accordion>

      <Accordion title="Starke Hooks schreiben: Format und Wirkung">
        <Para>
          Ein starker Hook hat zwei Ebenen. Erstens das Format: Welche Sorte
          Hook baust du? Genau das wählst du in der Pin-Produktion als Hook-Art.
          Zweitens der psychologische Hebel: Was bringt den Nutzer zum Klicken?
          Beide Ebenen wirken zusammen, ein Listen-Hook kann zum Beispiel die
          Neugier wecken.
        </Para>

        <div className="space-y-2">
          <H3>Die sechs Hook-Arten (das Format)</H3>
          <Para>
            Diese sechs Arten kannst du in der Pin-Produktion als Hook-Art
            auswählen:
          </Para>
          <Bullets
            items={[
              <>
                <strong>Problem:</strong> Sprich ein konkretes Problem an.
                Beispiel: „Nie wieder unordentliche Schubladen"
              </>,
              <>
                <strong>Ergebnis-Transformation:</strong> Zeig das Ergebnis.
                Beispiel: „Vom chaotischen zum ruhigen Zuhause"
              </>,
              <>
                <strong>Inspiration:</strong> Wecke eine Vorstellung, ein
                Wunschbild. Beispiel: „Dein Yogaraum zum Wohlfühlen"
              </>,
              <>
                <strong>Liste:</strong> Kündige eine konkrete Anzahl an.
                Beispiel: „7 Ideen für kleine Balkone"
              </>,
              <>
                <strong>Anleitung / How-To:</strong> Versprich eine
                Schritt-für-Schritt-Lösung. Beispiel: „So planst du dein Bullet
                Journal"
              </>,
              <>
                <strong>Vergleich / Entscheidung:</strong> Hilf bei einer Wahl.
                Beispiel: „Standmixer oder Pürierstab, was lohnt sich?"
              </>,
            ]}
          />
        </div>

        <div className="space-y-2">
          <H3>Die psychologischen Hebel (die Wirkung)</H3>
          <Para>
            Der beste Hook ist wertlos, wenn niemand klickt. Diese Hebel bringen
            den Nutzer zum Klicken, unabhängig vom Format:
          </Para>
          <Bullets
            items={[
              <>
                <strong>Neugier-Lücke:</strong> Der Pin verspricht eine Antwort,
                ohne sie zu verraten. Der Nutzer muss klicken, um sie zu
                bekommen. Beispiel: „Der Fehler, den 90 % bei der
                Gartengestaltung machen"
              </>,
              <>
                <strong>Konkreter Nutzen / Transformation:</strong> Was genau
                bekomme ich, wenn ich klicke? Sei so spezifisch wie möglich.
                Beispiel: „So richtest du deinen Arbeitsplatz für unter 100 €
                ein"
              </>,
              <>
                <strong>Zahlen und Listen:</strong> Konkrete Zahlen machen den
                Nutzen greifbar und erhöhen die Klickrate spürbar. Beispiel:
                „7 Fehler" schlägt „Fehler beim …" immer
              </>,
              <>
                <strong>Problemlösung:</strong> Sprich einen konkreten
                Schmerzpunkt direkt an. Beispiel: „Schluss mit trockener
                Zimmerpflanze: diese 3 Fehler vermeiden"
              </>,
              <>
                <strong>Dringlichkeit und Exklusivität:</strong> Beispiel: „Das
                weiß kaum jemand" oder „Noch heute umsetzen"
              </>,
            ]}
          />
        </div>
      </Accordion>

      <Accordion
        title="Signalwörter im Hook: so animierst du zum Klicken"
        anchorId="signalwoerter"
      >
        <Para>
          Signalwörter sind Wörter, die beim Leser sofort eine emotionale oder
          rationale Reaktion auslösen, Neugier, Dringlichkeit, Vertrauen oder
          den Wunsch nach einer Lösung.
        </Para>
        <HinweisBox variant="merke">
          <strong>Merke:</strong> Signalwörter gehören vor allem in deinen Hook,
          also den Text auf dem
          Pin-Bild. Dort entscheiden sie mit darüber, ob jemand klickt, weil sie
          sofort Neugier, Dringlichkeit oder einen konkreten Nutzen spürbar
          machen.
        </HinweisBox>
        <H4>Beispiele: der Unterschied in der Wirkung</H4>
        <Para>
          Das Keyword bleibt immer erhalten, die Signalwörter kommen dazu und
          machen den Hook klickstark.
        </Para>
        <WissenTabelle
          headers={['Keyword allein', 'Keyword + Signalwörter']}
          mutedFirstColumn
          rows={[
            [
              'veganes Abendessen',
              'Schnelles veganes Abendessen in 20 Minuten, perfekt für Anfänger',
            ],
            [
              'Zimmerdeko',
              'Geniale Zimmerdeko-Ideen, die dein Zimmer sofort verschönern',
            ],
            [
              'Garten-Tipps',
              '5 einfache Garten-Tipps, die du sofort umsetzen kannst',
            ],
            [
              'Rezept fürs Abendessen',
              'Das einfachste Rezept fürs Abendessen, perfekt für gemütliche Abende',
            ],
          ]}
        />
        <Para>
          Ein einzelnes Keyword ist gut, die Kombination macht den
          Unterschied:
        </Para>
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
          <p className="font-medium text-gray-900">Die Formel</p>
          <p className="mt-1">
            Keyword + Zahl + Signalwort + konkreter Nutzen ={' '}
            <strong>klickstarker Hook</strong>
          </p>
          <p className="mt-3 font-medium text-gray-900">Konkretes Beispiel</p>
          <p className="mt-1">
            „Garten“ + „5“ + „geniale“ + „Ideen für kleine Balkone“
          </p>
          <p className="mt-1">
            = <strong>„5 geniale Garten-Ideen für kleine Balkone“</strong>
          </p>
        </div>
        <H4>Wichtige Signalwort-Kategorien:</H4>
        <Bullets
          items={[
            'Zeitersparnis: schnell, in 5 Minuten, sofort, blitzschnell',
            'Einfachheit: einfach, simpel, ohne Aufwand, für Anfänger',
            'Exklusivität: Geheimnis, Geheimtipp, das weiß kaum jemand',
            'Emotion: genial, magisch, traumhaft, lebensverändernd',
            'Dringlichkeit: jetzt, noch heute, endlich, nie wieder',
            'Vertrauen: bewiesen, getestet, Experten-Tipp, bewährte Methode',
            'Transformation: vorher/nachher, verwandeln, verschönern',
          ]}
        />
        <Para>
          Du musst dir diese Signalwörter nicht selbst merken: Der KI-Prompt in
          der{' '}
          <Link
            href="/dashboard/pin-produktion"
            className="font-medium text-red-600 hover:underline"
          >
            Pin-Produktion
          </Link>{' '}
          baut sie automatisch in deine Hooks ein. In den{' '}
          <Link
            href="/dashboard/einstellungen"
            className="font-medium text-red-600 hover:underline"
          >
            Einstellungen
          </Link>{' '}
          kannst du außerdem eigene Signalwörter hinzufügen und bestehende
          abwählen, so passt du die Vorschläge an deine Marke und deinen Ton an.
        </Para>
      </Accordion>

      <Accordion title="Die 5 Design-Prinzipien" anchorId="design-prinzipien">
        <div className="space-y-6">
          <div className="space-y-2">
            <H3>1. Kontrast ist König</H3>
            <Para>
              Hoher Kontrast zwischen Text und Hintergrund ist Pflicht.
            </Para>
            <Bullets
              items={[
                'Dunkler Text auf hellem Hintergrund',
                'Heller Text auf dunklem Hintergrund',
                'Grauer Text auf weißem Hintergrund',
                'Ähnliche Farbtöne ohne Kontrast',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H3>2. Headline: Platzierung und Größe</H3>
            <Bullets
              items={[
                'Oberes Drittel → beste Performance',
                'Mindestens 40 bis 60 px Schriftgröße',
                'Maximal 6 bis 8 Wörter',
                'Unteres Drittel vermeiden, wird oft abgeschnitten',
                'Wichtigen Text und das Hauptmotiv in die inneren 80 Prozent legen, denn Pinterest beschneidet Pins in Suche und Raster von den Rändern her',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H3>3. Weniger ist mehr</H3>
            <Para>Das gilt innerhalb eines einzelnen Pins:</Para>
            <Bullets
              items={[
                'Maximal 2 Schriftarten pro Pin',
                'Maximal 3 Farben pro Pin',
                'Eine klare Bildaussage',
                'Viel Weißraum',
                'Fette, serifenlose Schriften (sans-serif), keine dünnen oder Schreibschriften, weil Pinterest Bilder erneut komprimiert und dünne Schriften dann unscharf werden, besonders auf dem Smartphone',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H3>4. Eigenes Branding</H3>
            <Para>
              Hier geht es nicht um den einzelnen Pin, sondern um die Konsistenz
              über alle deine Pins hinweg, damit dein Profil unverwechselbar
              wird:
            </Para>
            <Bullets
              items={[
                'Über alle Pins dieselbe Farbpalette, 2 bis 3 Hauptfarben',
                'Über alle Pins dieselben Schriftarten, maximal 2',
                'Logo oder Website-URL klein, aber sichtbar',
                'Einheitlicher Stil für die Wiedererkennung',
              ]}
            />
          </div>

          <div className="space-y-2">
            <H3>5. Das Bild: emotional und relevant</H3>
            <Bullets
              items={[
                'Emotion erkennbar, Menschen, die etwas erleben',
                'Thematisch relevant, passend zum Hook',
                'Hell und klar, keine dunklen oder unscharfen Bilder',
                'Hochformat zwingend',
              ]}
            />
          </div>
        </div>
      </Accordion>

      <Accordion
        title="Customer Journey - wohin dein Pin führt: die richtige Zielseite"
        anchorId="customer-journey"
      >
        <Para>
          Pinterest-Erfolg hört nicht beim Klick auf, er fängt dort erst
          an. Wer auf deinen Pin klickt und nicht findet, was er erwartet
          hat, springt sofort wieder ab. Das ist nicht nur eine verlorene
          Conversion, es ist auch ein negatives Pinterest-Signal.
        </Para>
        <H4>Das Problem mit der Startseite</H4>
        <Para>
          Viele Pinterest-Marketerinnen verlinken alle ihre Pins zur
          Startseite ihrer Website. Das ist ein Fehler:
        </Para>
        <Bullets
          items={[
            'Wer auf einen „Yogaraum einrichten"-Pin klickt und auf der Startseite landet, sucht erstmal, und springt meist ab',
            'Die Customer Journey ist gestört: Pin verspricht etwas Konkretes, Startseite liefert das Allgemeine',
          ]}
        />
        <Para>
          Pinterest belohnt Pins, die echtes Engagement auslösen, vor allem
          Saves und Klicks. Schickst du Menschen auf eine Seite, die das
          Versprechen des Pins nicht einlöst, springen sie oft enttäuscht zurück
          zu Pinterest. Das kostet dich die Conversion und sendet kein positives
          Signal. Eine Zielseite, die genau das liefert, was der Pin verspricht,
          sorgt dagegen für zufriedene Besucher, mehr Verweildauer auf deiner
          Website und höhere Chancen, dass sie speichern, klicken oder kaufen.
        </Para>
        <H4>Die Lösung: Pin-Kohärenz</H4>
        <Para>
          Pin-Kohärenz bedeutet: Bild + Titel + Beschreibung + URL müssen
          thematisch zusammenpassen.
        </Para>
        <Bullets
          items={[
            'Pin-Titel „5 Ideen für deinen Yogaraum" → URL führt zum Blogartikel über Yogaraum-Ideen, nicht zur Startseite',
            'Pin-Titel „Yoga-Matte aufbewahren" → URL führt zur Produktseite deiner Mattenhalter, nicht zum Shop allgemein',
            'Pin-Titel „Kakaozeremonie zuhause" → URL führt zum spezifischen Blogpost, nicht zur Blog-Übersicht',
          ]}
        />
        <H4>Führe auf die richtige Stelle, nicht nur die richtige Seite</H4>
        <Para>
          Noch besser als die richtige Seite ist die richtige Stelle auf dieser
          Seite. Verspricht dein Pin ein bestimmtes Thema, das erst weiter unten
          auf einer langen Seite steht, nutze einen Anker-Link, der direkt
          dorthin springt. So findet der Besucher sofort, was der Pin
          versprochen hat, statt erst suchen zu müssen.
        </Para>
        <H4>Die URL ist selbst ein Ranking-Signal</H4>
        <Para>
          Pinterest liest auch deine Ziel-URL aus und bewertet, ob sie zum
          Pin-Thema passt. Eine sprechende, thematisch klare Adresse wie
          /blog/yoga-fuer-anfaenger ist ein zusätzliches Signal. Eine kryptische
          Adresse wie /p?id=8821 sagt Pinterest dagegen nichts. Eine sinnvoll
          benannte URL verstärkt also die Botschaft deiner Pin-Kohärenz.
        </Para>
        <H4>Praktische Regel</H4>
        <Para>
          Frage dich bei jedem Pin: „Wenn ich auf diesen Pin klicke, 
          finde ich auf der Zielseite genau das, was der Pin verspricht?“
          Wenn die Antwort „ja“ ist, ist die Customer Journey stimmig. Wenn
          die Antwort „nicht sofort“ oder „ich muss noch klicken“ ist, ist
          der Pin falsch verlinkt.
        </Para>
        <HinweisBox variant="tipp">
          <strong>Wie Pin-Flow dir hilft:</strong> Im Bereich „Ziel-URLs“
          pflegst du genau die Landingpages, auf die deine Pins verlinken
          sollen, mit klarer Zuordnung zu Inhalten. So vermeidest du die
          Startseiten-Falle systematisch.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Wie oft dasselbe Bild auf Pinterest pinnen?"
        anchorId="frische-pins-verteilen"
      >
        <Para>
          Für mehr Reichweite zu einem Inhalt erstellst du mehrere neue
          Pin-Designs zur selben Seite und verteilst sie auf die thematisch
          passenden Boards. Dasselbe Bild unverändert mehrfach zu pinnen,
          schadet.
        </Para>

        <h3 className="mt-6 text-lg font-semibold text-gray-900">
          Was ist ein neuer Pin und wie oft darf dasselbe Bild?
        </h3>

        <H4>Was Pinterest unter einem Duplikat versteht</H4>
        <Para>
          Pinterest definiert einen Duplicate Pin als exakte Bild + URL-
          Kombination. Auch wenn du nur die Beschreibung änderst gilt der Pin
          als Duplikat, weil Pinterest Pins primär am visuellen Eindruck
          erkennt (Perceptual Hashing / pHash). Selbst kleine Änderungen wie
          Verblassen, Helligkeit anpassen oder einen Filter setzen reichen
          nicht, Pinterest erkennt das als dasselbe Motiv.
        </Para>

        <H4>Was als echter neuer Pin gilt</H4>
        <Para>
          Pinterest wertet einen Pin als neu, wenn er mindestens einen
          substanziellen visuellen Unterschied hat:
        </Para>
        <Bullets
          items={[
            'Anderes Foto oder Motiv',
            'Deutlich anderes Layout: eine echte visuelle Umgestaltung, zum Beispiel ein anderer Bildausschnitt, eine andere Anordnung der Elemente oder Collage statt Einzelbild. Nur den Text von oben nach unten zu verschieben, reicht nicht',
            'Anderer Text-Hook / Headline, kombiniert mit visueller Änderung',
            'Anderer Pin-Typ (Standard → Video → Carousel)',
          ]}
        />
        <Para>
          <strong>Faustregel:</strong> Wenn deine Zielgruppe auf den ersten
          Blick erkennen würde dass es derselbe Pin ist, ist es für Pinterest
          auch derselbe Pin.
        </Para>

        <H4>
          Der entscheidende Punkt: ein neues Design heißt nicht neues Foto
        </H4>
        <Para>
          Du brauchst nicht für jeden Pin ein neues Foto. Aus einem einzigen
          Foto kannst du viele neue Pins machen, indem du es in verschiedene
          Canva-Vorlagen einsetzt: anderer Bildausschnitt, anderes Layout,
          andere Farben, anderer Hook und Titel. Jeder dieser Pins sieht anders
          aus und gilt für Pinterest als neu. Was nicht reicht: dasselbe Bild
          mit demselben Layout nehmen und nur den Text austauschen, das erkennt
          Pinterest als Wiederholung. Den genauen Vorlagen-Trick findest du im
          Abschnitt{' '}
          <Link
            href="/dashboard/strategie?tab=design&accordion=effiziente-pin-produktion"
            className="font-medium text-red-600 hover:underline"
          >
            Effiziente Pin-Produktion
          </Link>
          .
        </Para>

        <H4>Warum identische Pins schaden</H4>
        <Para>
          Der Pinterest-Algorithmus bestraft Duplikate nicht mit einer Sperre,
          aber:
        </Para>
        <Bullets
          items={[
            'Er distribuiert sie schlechter in Home-Feed und Suche',
            'Bei identischem Bild auf zwei thematisch unterschiedlichen Boards wird der Algorithmus verwirrt und priorisiert den Pin im Zweifel gar nicht',
            'Bei wiederholtem Verhalten kann es zu Spam-Flag bis Account-Suspension kommen',
          ]}
        />

        <h3 className="mt-6 text-lg font-semibold text-gray-900">
          Wie viele Pins und auf welche Boards?
        </h3>
        <Bullets
          items={[
            <>
              <strong>Pro URL:</strong> beliebig viele neue Designs über die
              Zeit, keine Obergrenze.
            </>,
            <>
              <strong>Zum Start einer neuen URL:</strong> 3 bis 5 verschiedene
              fertige Pin-Designs (nicht Vorlagen, sondern fertige Pins), um
              verschiedene visuelle Zugänge zu testen.
            </>,
            <>
              <strong>Über die Zeit:</strong> regelmäßig weitere neue Designs
              ergänzen, erfolgreiche Inhalte bekommen über Monate 30, 50 oder
              mehr Pins.
            </>,
            <>
              <strong>Auf welche Boards:</strong> jedes Design auf das thematisch
              passendste Board. Ein einzelner Pin gehört einmal auf das beste
              Board. Dasselbe Bild über mehrere Boards zu streuen, gilt 2026 als
              Spam.
            </>,
          ]}
        />

        <H4>Kurzreferenz: erlaubte Bild-Kombinationen</H4>
        <WissenTabelle
          headers={['Kombination', 'Erlaubt', 'Empfehlung']}
          rows={[
            [
              'Gleiches Bild mehrfach (ob gleiche oder andere URL)',
              'Nicht empfohlen',
              'Wird 2026 als Spam gewertet',
            ],
            [
              'Verschiedenes Bild + gleiche URL',
              'Unbegrenzt',
              'Optimal, pro Blogbeitrag 3 bis 5 neue Designs',
            ],
            [
              'Verschiedenes Bild + verschiedenes Design',
              'Unbegrenzt',
              'Beste Strategie für Reichweite',
            ],
          ]}
        />
      </Accordion>

      <Accordion
        title="Effiziente Pin-Produktion: wie du aus einem Foto mit mehreren Vorlagen unterschiedliche Pins machst"
        anchorId="effiziente-pin-produktion"
      >
        <div className="space-y-2">
          <H3>Der Vorlagen-Trick: ein Foto, viele Pins</H3>
          <Para>
            Der größte Zeitfresser ist der Glaube, jeder Pin brauche ein neues
            Bild. Das stimmt nicht. Aus einem einzigen guten Foto machst du mit
            deinen Canva-Vorlagen viele unterschiedlich aussehende Pins.
            Voraussetzung: Du legst einmal 6 bis 10 eigene Vorlagen an, danach
            geht es schnell.
          </Para>
          <Para>
            Das Prinzip: Du setzt dasselbe Foto nacheinander in jede deiner
            Vorlagen ein. Jede Vorlage hat ein anderes Layout, andere Farben und
            eine andere Textplatzierung, und du gibst jeweils einen anderen Hook
            und Titel ein. Wichtig: Kopiere die Vorlage immer und befülle die
            Kopie, damit das Original leer bleibt.
          </Para>
          <Para>Die verschiedenen Bildausschnitte, die du nutzen kannst:</Para>
          <Bullets
            items={[
              'Der volle Ausschnitt: das ganze Foto als Hintergrund, Text oben',
              'Der Zoom auf ein Detail: nur ein Teil des Fotos groß gezeigt, zum Beispiel die Hände, ein Gegenstand oder ein Detail im Hintergrund',
              'Der obere Bildteil als Bild, die untere Hälfte eine farbige Fläche mit dem Text darauf',
              'Ein Drittel bis die Hälfte des Pins eine farbige Fläche, der Rest das Foto',
              'Ein Hochformat-Ausschnitt aus einer querformatigen Aufnahme, Text daneben',
            ]}
          />
          <Para>
            Nur den Text zu verschieben reicht nicht. Der Bildausschnitt und das
            Layout müssen sich sichtbar unterscheiden, dann wertet Pinterest
            jeden dieser Pins als neuen Pin.
          </Para>
          <Para>
            Lade die verschiedenen Designs zur selben Seite nicht alle am selben
            Tag hoch, sondern verteile sie über mehrere Tage oder Wochen. Einen
            festen Mindestabstand gibt es nicht. Solange die Designs sich
            wirklich unterscheiden, bekommt so jedes Design sein eigenes
            Test-Fenster.
          </Para>
        </div>

        <div className="space-y-2">
          <H3>Bulk Create: viele Pins auf einmal (fortgeschritten)</H3>
          <Para>
            Canva bietet im Bezahltarif die Funktion „Bulk Create". Damit
            erzeugt Canva aus einer Tabelle (eine Zeile pro Pin, Spalten für
            Titel, Bild und so weiter) viele Pins auf einmal, indem es die Daten
            automatisch in deine Vorlage einsetzt.
          </Para>
          <Para>
            Ehrlicher Hinweis: Damit die so erzeugten Pins nicht zu ähnlich
            werden und als Duplikate gelten, solltest du mehrere
            Vorlagen-Varianten oder verschiedene Bilder verwenden. Eine
            Schritt-für-Schritt-Anleitung findest du hier:{' '}
            <Link
              href="https://www.youtube.com/watch?v=8PNxQuUGtgI"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-red-600 hover:underline"
            >
              Video-Anleitung: Bulk Create in Canva
            </Link>
            .
          </Para>
        </div>

        <div className="space-y-2">
          <H3>Dein Vorlagen-Set und der Rhythmus</H3>
          <Para>
            Nutze ein festes Set von 6 bis 10 Vorlagen über längere Zeit, statt
            es jeden Monat auszutauschen. Gleiche Farben, Schriften und ein
            einheitlicher Stil über alle Pins schaffen einen ruhigen
            Marken-Rahmen und sorgen für Wiedererkennung. Auf Pinterest zählt
            das etwas weniger streng als auf anderen Plattformen, ist aber gut
            für das Vertrauen in deine Marke.
          </Para>
          <Para>
            Frische deine Vorlagen nur anlassbezogen auf: Wenn Saves und
            Engagement nachlassen oder sich Design-Trends deutlich verschieben,
            überarbeite einzelne Vorlagen, statt ständig alles umzuwerfen.
          </Para>
          <Para>
            Praktischer Tipp: Produziere deine Pins in einem Rutsch, zum Beispiel
            die Pins für mehrere Wochen an einem Tag.
          </Para>
        </div>

        <div className="space-y-2">
          <H3>Bilder und Pins mit KI</H3>
          <Para>
            Wer mag, kann das Foto durch ein KI-Bild ersetzen oder ganze Pins
            per KI erstellen. Tools dafür sind zum Beispiel Midjourney, Adobe
            Firefly, DALL-E, Canva Magic Studio, Nano Banana und Higgsfield. Das
            ist ein eigenes, größeres Thema und hier nur als Möglichkeit
            erwähnt.
          </Para>
          <Para>
            Wie du die Pin-Erstellung mit KI noch effizienter machst, zeige ich
            dir im Detail in meinem separaten Angebot „Pin to Profit mit
            Claude". Es ist nicht Teil von Pin-Flow, ergänzt das System aber
            optimal.
          </Para>
        </div>

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Vorlagen und Systeme sind keine Abkürzung, sie
          sind die Voraussetzung
          dafür, dass Pinterest-Marketing nachhaltig funktioniert. Wer jeden Pin
          von Grund auf neu erstellt, verliert nach drei Monaten die Motivation.
          Wer mit Systemen arbeitet, pinnt noch in drei Jahren.
        </HinweisBox>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 5 — Sichtbarkeit & Keywords
// ===========================================================

function TabKeywords() {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Wie du gefunden wirst.
      </p>
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Keywords sind das Fundament deiner gesamten Reichweite auf Pinterest.
        Pinterest ist eine visuelle Suchmaschine, wer die Sprache seiner
        Zielgruppe kennt und konsequent einsetzt wird ausgespielt. Wer
        generisch schreibt verschwindet in der Masse.
      </p>

      <Accordion
        title="Pinterest-Keywords sind nicht Google-Keywords"
        anchorId="sichtbarkeit-keywords"
      >
        <Para>
          Pinterest ist eine visuelle Suchmaschine, und Menschen suchen hier
          anders als bei Google. Deshalb gilt: Ein Keyword, das bei Google viel
          Suchvolumen hat, kann auf Pinterest fast ungenutzt sein, und
          umgekehrt. Verlass dich bei der Keyword-Recherche also nicht auf
          klassische Google-SEO-Tools. Die beste Quelle ist Pinterest selbst:
          Gib dein Thema in die Pinterest-Suchleiste ein und schau, welche
          Begriffe Pinterest dir vorschlägt. Das sind die Keywords, nach denen
          hier wirklich gesucht wird. Wie das genau geht, zeigt dir der
          Abschnitt{' '}
          <Link
            href="/dashboard/strategie?tab=keywords&accordion=keywords-recherchieren"
            className="font-medium text-red-600 hover:underline"
          >
            Keywords recherchieren: die Autocomplete-Methode
          </Link>
          .
        </Para>
      </Accordion>

      <Accordion
        title="Die drei Keyword-Typen, und wann du welchen einsetzt"
        anchorId="keyword-typen"
      >
        <Para>
          Nicht alle Keywords sind gleich. Je nachdem wie spezifisch ein
          Keyword ist hat es unterschiedliche Stärken und Schwächen.
        </Para>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>🔴 Haupt-Keywords: breite Reichweite, hohe Konkurrenz</H3>
          <Para>
            Bestehen aus einem einzigen Wort oder einem sehr allgemeinen
            Begriff.
          </Para>
          <Para>
            <em>Beispiele:</em> „Outfit", „Rezept",
            „Persönlichkeitsentwicklung", „Handmade"
          </Para>
          <Para>
            Hohes Suchvolumen, aber auch viel Konkurrenz. Haupt-Keywords
            gehören immer in den Titel, möglichst ganz am Anfang. Sie
            signalisieren Pinterest das übergeordnete Thema.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>🟡 Mid-Tail-Keywords: die goldene Mitte</H3>
          <Para>Bestehen aus zwei bis drei Wörtern.</Para>
          <Para>
            <em>Beispiele:</em> „Outfit Herbst Frauen", „schnelle vegane
            Rezepte", „Selbstvertrauen stärken Tipps", „Yogaraum gestalten
            Ideen"
          </Para>
          <Para>
            Spezifischer als Haupt-Keywords aber noch breit genug um von
            vielen Menschen gesucht zu werden. Mid-Tail Keywords sind dein
            wichtigstes Werkzeug. Sie gehören in den Titel und in die
            Beschreibung.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>🟢 Longtail-Keywords: hohe Conversion</H3>
          <Para>Bestehen aus vier oder mehr Wörtern.</Para>
          <Para>
            <em>Beispiele:</em> „Outfit Herbst Frauen 40 casual", „schnelle
            vegane Rezepte unter 30 Minuten", „Selbstvertrauen stärken nach
            Trennung Tipps", „Yoga Retreat Österreich Wellness Hotel Alpen"
          </Para>
          <Para>
            Wenig Suchvolumen, aber wer danach sucht weiß genau was er
            will. Die Klickwahrscheinlichkeit ist deutlich höher als bei
            breiten Keywords. Longtail Keywords gehören in die Beschreibung,
            als natürlicher Satz formuliert, niemals als bloße
            Aneinanderreihung.
          </Para>
        </div>

        <H4>Beispiel für gute Keyword-Nutzung:</H4>
        <Para>Thema: Schnelle vegane Rezepte</Para>
        <Bullets
          items={[
            <>
              <strong>Titel:</strong> „Schnelle vegane Rezepte: 5 Abendessen
              unter 20 Minuten"
            </>,
            <>
              <strong>Beschreibung:</strong> „Du suchst nach schnellen
              veganen Rezepten für den Alltag? Diese veganen Abendessen sind
              in unter 20 Minuten fertig, einfach, gesund und perfekt für
              die ganze Familie."
            </>,
          ]}
        />
        <Para>
          Keywords enthalten: <em>schnelle vegane Rezepte</em> (Mid-Tail),{' '}
          <em>vegane Abendessen</em> (Mid-Tail),{' '}
          <em>schnelle vegane Rezepte Alltag</em> (Longtail-Variante).
          Natürlich formuliert. Kein Keyword-Stuffing.
        </Para>
      </Accordion>

      <Accordion
        title="Keywords recherchieren: die Autocomplete-Methode"
        anchorId="keywords-recherchieren"
      >
        <Para>
          Die beste Keyword-Quelle für Pinterest ist Pinterest selbst. Der
          Grund: Pinterest zeigt dir direkt was seine Nutzer suchen, in
          Echtzeit.
        </Para>

        <div>
          <H4>Schritt 1: Haupt-Keyword eingeben</H4>
          <Para>
            Öffne Pinterest und tippe dein Thema in die Suchleiste. Zum
            Beispiel „Mode". Drücke noch nicht Enter, schau was Pinterest
            dir vorschlägt. Diese Vorschläge sind deine Haupt- und Mid-Tail
            Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 2: Farbige Blöcke beachten</H4>
          <Para>
            Direkt unter der Suchleiste erscheinen farbige Keyword-Blöcke.
            Diese zeigen die beliebtesten Unterthemen zu deinem
            Haupt-Keyword. Klicke darauf und notiere die Kombinationen, das
            sind wertvolle Mid-Tail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 3: Spezifischer werden</H4>
          <Para>
            Tippe dein Haupt-Keyword und füge einen Buchstaben hinzu. Aus
            „Mode" wird „Mode H", Pinterest zeigt dir jetzt spezifischere
            Begriffe wie „Mode Herbst", „Mode Herbst Frauen 40", „Mode
            Herbst casual". Das sind deine Mid-Tail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 4: Longtail Keywords finden</H4>
          <Para>
            Tippe eine vollständige Phrase wie „Outfit Herbst Frauen", 
            Pinterest zeigt dir noch spezifischere Varianten. Das sind deine
            Longtail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 5: In die Keyword-Datenbank eintragen</H4>
          <Para>
            Trage jedes gefundene Keyword direkt in deine →{' '}
            <Link
              href="/dashboard/keywords"
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              Keyword-Datenbank
            </Link>{' '}
            ein. Vergib den Keyword-Typ (Haupt, Mid-Tail oder Longtail) und
            ordne es dem passenden Content-Inhalt zu.
          </Para>
        </div>

        <H4>Wie oft recherchieren?</H4>
        <Para>
          Mindestens einmal pro neuem Thema das du bepinnen möchtest.
          Zusätzlich alle 3 Monate eine neue Recherche, 
          Pinterest-Suchtrends ändern sich und neue Keywords tauchen auf.
        </Para>
      </Accordion>

      <Accordion
        title="Wie viele Keywords und wo überall?"
        anchorId="keywords-wie-viele-wo"
      >
        <Para>
          Pinterest liest Keywords an vielen Stellen, nicht nur im Titel. Nutze
          möglichst viele dieser Stellen, und an jeder so viele relevante
          Keywords, wie natürlich hineinpassen. Die wichtigsten gehören dabei
          immer möglichst weit nach vorne.
        </Para>

        <H4>Wo Pinterest überall Keywords liest</H4>
        <Bullets
          items={[
            <>
              <strong>Pin-Titel:</strong> Haupt-Keyword ganz vorne, die ersten
              30 bis 35 Zeichen erscheinen im Feed.
            </>,
            <>
              <strong>Pin-Beschreibung:</strong> Mid-Tail und Longtail natürlich
              integriert, mit Call-to-Action am Ende.
            </>,
            <>
              <strong>Alt-Text:</strong> Bild und Thema beschreiben, die
              wichtigsten Keywords einbauen.
            </>,
            <>
              <strong>Bilddateiname:</strong> vor dem Upload sprechend benennen,
              „schnelle-vegane-rezepte-abendessen.jpg" statt „IMG_1234.jpg".
            </>,
            <>
              <strong>Hook (Text auf dem Bild):</strong> wird von Pinterest per
              OCR als Keyword gelesen, Haupt-Keyword gut lesbar einbauen.
              Pin-Flows internes Tracking erfasst den Hook nicht, nutze das
              Keyword daher immer auch in Titel oder Beschreibung.
            </>,
            <>
              <strong>URL der Zielseite:</strong> sprechende Adresse,
              „meinblog.de/schnelle-vegane-rezepte" statt „meinblog.de/p=123".
            </>,
            <>
              <strong>Board-Name und -Beschreibung:</strong> geben jedem Pin auf
              dem Board ein zusätzliches thematisches Signal.
            </>,
            <>
              <strong>Website-Metadaten:</strong> Seitentitel und
              Meta-Beschreibung der Zielseite mit relevanten Keywords.
            </>,
          ]}
        />
        <Para>
          Die ausführliche Erklärung zu jeder dieser Stellen findest du unter{' '}
          <Link
            href="/dashboard/strategie?tab=faktoren&accordion=9-ranking-faktoren"
            className="font-medium text-red-600 hover:underline"
          >
            Erfolgsfaktoren
          </Link>
          .
        </Para>

        <H4>Wie viele Keywords pro Pin?</H4>
        <Para>
          So viele relevante Keywords wie möglich, die wichtigsten möglichst
          weit vorne, aber natürlich in vollständige Sätze eingebettet, niemals
          als bloße Aneinanderreihung. Der einzige Fokus-Punkt ist das Thema:
          Ein Pin behandelt ein Thema, nicht fünf verschiedene. Innerhalb dieses
          Themas dürfen ruhig viele verwandte Keywords und Synonyme vorkommen.
          So bleibt der Pin thematisch scharf, und Pinterest weiß genau, wem es
          ihn zeigen soll.
        </Para>

        <H4>Beispiel Yoga-Blog: Yogaraum gestalten</H4>
        <Bullets
          items={[
            <>
              <strong>Titel:</strong> „Yogaraum gestalten: 7 Ideen für ein
              entspanntes Yoga zuhause"
            </>,
            <>
              <strong>Beschreibung:</strong> „Du möchtest deinen Yogaraum
              zuhause gemütlich und inspirierend gestalten? Diese Ideen für
              die Yoga Ecke zuhause helfen dir einen Raum zu schaffen der
              dich täglich zur Praxis einlädt, auch auf kleiner Fläche."
            </>,
          ]}
        />
        <Para>
          Keywords enthalten: <em>Yogaraum gestalten</em> (Mid-Tail),{' '}
          <em>Yoga zuhause</em> (Mid-Tail),{' '}
          <em>Yoga Ecke zuhause Ideen</em> (Longtail). Natürlich
          formuliert. Keine aneinandergereihten Keywords. Trotzdem stark für die Sichtbarkeit.
        </Para>

        <HinweisBox>
          Der KI-Prompt in der{' '}
          <Link
            href="/dashboard/pin-produktion"
            className="text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Pin-Produktion
          </Link>{' '}
          berücksichtigt das automatisch und kombiniert mehrere Keywords ideal
          und natürlich in Titel und Beschreibung. Wer unsicher ist, lässt sich
          Titel und Beschreibung dort generieren.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Boards richtig aufbauen und benennen"
        anchorId="boards-aufbauen-benennen"
      >
        <H3>Themenklarheit: Boards sauber halten</H3>
        <Para>
          Die meisten Pinterest-Nutzer wissen nicht dass öffentliche Boards
          den Algorithmus verwirren können, wenn sie themenfremde Inhalte
          enthalten.
        </Para>

        <H4>Das Problem mit öffentlichen privaten Interessen</H4>
        <Para>
          Wenn du privat nach Themen suchst die nichts mit deiner Nische zu
          tun haben, Rezepte, Reisen, Mode, und diese Pins auf öffentlichen
          Boards speicherst sendest du Pinterest widersprüchliche Signale.
          Pinterest denkt dein Profil bedient mehrere unzusammenhängende
          Themen und spielt deine Pins weniger zielgerichtet aus.
        </Para>

        <H4>Die Lösung: Geheime Boards</H4>
        <Para>
          Geheime Boards sind nur für dich sichtbar, Pinterest wertet sie
          nicht für die öffentliche Reichweite.
        </Para>

        <H4>Wann geheime Boards nutzen:</H4>
        <Bullets
          items={[
            'Private Interessen (Reisen, Kochen, Mode) die nicht zur Nische passen',
            'Boards die noch aufgebaut werden und noch zu wenig Pins haben',
            'Inspiration-Boards für deine eigene Arbeit (Moodboards etc.)',
            'Test-Boards für neue Themen die du noch nicht öffentlich zeigen möchtest',
          ]}
        />

        <HinweisBox>
          <strong>Tipp:</strong> Prüfe einmal im Monat welche Boards
          wachsen und welche stagnieren. Top Boards zeigen dir wo deine
          Zielgruppe aktiv ist, dort solltest du mehr produzieren.
        </HinweisBox>

        <H3>Board-Namen und -Beschreibungen mit Keywords</H3>
        <Para>
          Die meisten Pinterest-Nutzer optimieren ihre Pins mit Keywords, 
          aber vergessen dabei ihre Boards. Das ist ein teurer Fehler.
          Pinterest liest nicht nur Pin-Titel und Beschreibung, es liest
          auch den Board-Namen und die Board-Beschreibung in dem der Pin
          gespeichert ist.
        </Para>
        <Para>
          Ein perfekt optimierter Pin auf einem schwachen Board verliert
          Reichweite. Ein gut optimiertes Board verstärkt jeden einzelnen
          Pin der darauf gespeichert wird.
        </Para>

        <H4>Wie Pinterest Boards bewertet:</H4>
        <Para>
          Pinterest nutzt deine Boards um zu verstehen worum es in deinem
          gesamten Account geht. Ein Board mit klarem Thema, keyword-starkem
          Namen und ausführlicher Beschreibung signalisiert: „Dieser Account
          ist eine Autorität für dieses Thema." Thematische Autorität ist
          einer der wichtigsten Faktoren für die Reichweite deiner Pins.
        </Para>

        <H4>Board-Name optimieren (max. 50 Zeichen inkl. Leerzeichen):</H4>
        <Bullets
          items={[
            'Haupt-Keyword möglichst am Anfang',
            'Klar und beschreibend, kein kreativer oder witziger Name',
            '„Meine Yoga Welt", Pinterest weiß nicht genau worum es geht',
            '„Yoga Retreat Österreich: Wellness Hotels & Yoga Urlaub", klares Keyword, spezifisches Unterthema',
          ]}
        />

        <H4>Board-Beschreibung optimieren (max. 500 Zeichen):</H4>
        <Para>
          Wird von vielen Nutzern leer gelassen, dabei eine der
          wertvollsten Sichtbarkeits-Flächen auf Pinterest.
        </Para>
        <Bullets
          items={[
            '2 bis 3 Sätze',
            'Haupt-Keyword im ersten Satz ganz vorne',
            'Mid-Tail und Longtail Keywords natürlich integriert',
            'Zielgruppe direkt ansprechen',
          ]}
        />
        <Para>
          <strong>Beispiel (Yoga Retreats):</strong>
          <br />
          „Yoga Retreat Österreich und Deutschland, die schönsten Yoga
          Hotels, Wellness Retreats und Yoga Urlaub Angebote für Anfänger
          und Fortgeschrittene. Hier findest du inspirierende Orte für
          deine nächste Auszeit und dein Yoga Wochenende."
        </Para>

        <H4>Die Verbindung zwischen Board- und Pin-Keywords:</H4>
        <Para>
          Das Mächtigste was du tun kannst: Board-Keywords und Pin-Keywords
          aufeinander abstimmen.
        </Para>
        <Para>
          Wenn dein Board heißt „Yoga Retreat Österreich: Wellness Hotels
          & Yoga Urlaub" und dein Pin-Titel lautet „Yoga Retreat
          Österreich: Die 10 schönsten Wellness Hotels in den Alpen", 
          sieht Pinterest eine konsistente thematische Linie. Diese
          Konsistenz signalisiert thematische Autorität und belohnt wird
          sie mit mehr Reichweite.
        </Para>

        <H4>Wie viele Boards brauchst du?</H4>
        <Para>
          Weniger als du denkst. Ein Account mit 10 starken, klar
          definierten Boards ist besser als 30 unstrukturierte Boards.
          Faustregel: Ein Board pro Hauptthema, nicht mehr als 15 bis 20
          Boards insgesamt.
        </Para>

        <HinweisBox>
          Nutze den →{' '}
          <Link
            href="/dashboard/boards"
            className="text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            KI-Prompt Generator
          </Link>{' '}
          auf der Boards-Seite um direkt einen auf Sichtbarkeit optimierten Board-Namen
          und eine Beschreibung zu generieren.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Text auf dem Bild: dein Hook als Keyword (OCR)"
        anchorId="bilder-ocr"
      >
        <Para>
          Der Text, den du auf dein Pin-Bild schreibst, also dein Hook, wird von
          Pinterest per Texterkennung (OCR, Optical Character Recognition)
          gelesen und als Keyword gewertet. Dein Hook ist damit nicht nur
          Eyecatcher, sondern ein echter Sichtbarkeits-Faktor. Achte deshalb
          darauf, dass dein wichtigstes Keyword auch im Hook vorkommt, gut
          lesbar und groß genug.
        </Para>
        <Para>
          Pinterest ist eine visuelle Suchmaschine. Neben dem Hook spielen auch
          Bildqualität, Dateiname und Alt-Text eine größere Rolle, als gemeinhin
          angenommen.
        </Para>
        <H4>OCR: Pinterest liest den Text auf deinem Pin</H4>
        <Para>
          Pinterest scannt alle Bilder automatisch und extrahiert
          sichtbaren Text. Das heißt:
        </Para>
        <Bullets
          items={[
            'Der Hook-Text auf deinem Pin wird für die Sichtbarkeit ausgewertet',
            'Keywords, die nur im Bild stehen, werden trotzdem erkannt',
            'Schlecht lesbare Texte (zu klein, zu kontrastarm) werden nicht erkannt',
          ]}
        />
        <Para>
          Praktische Folge: Schreibe deine Headlines klar und groß genug
          (Schriftgröße 40 bis 60 px), damit OCR sie sauber lesen kann.
        </Para>
        <HinweisBox variant="tipp">
          <strong>Wichtig für Pin-Flow:</strong> Pinterests OCR liest deinen
          Hook, das interne Keyword-Tracking von Pin-Flow kann ihn aber nicht
          mitlesen, da der Text im Bild steckt. Schreibe dein wichtigstes
          Keyword deshalb immer auch in Titel oder Beschreibung. So erkennt
          Pinterest es per OCR, und Pin-Flow kann seine Performance
          mitverfolgen.
        </HinweisBox>
        <H4>Bilddatei-Benennung mit Keywords</H4>
        <Para>
          Pinterest indexiert auch den Dateinamen deines Bildes, viele
          Marketer übersehen das.
        </Para>
        <Bullets
          items={[
            'Falsch: „IMG_1234.jpg", „Pin-Vorlage.png", „Unbenannt.jpg"',
            'Richtig: „yoga-matte-aufbewahren-ideen.jpg", „yogaraum-einrichten-tipps.jpg"',
            'Format: Haupt-Keyword, Bindestriche statt Leerzeichen, klein geschrieben, .jpg oder .png',
          ]}
        />
        <HinweisBox variant="tipp">
          <strong>Tipp:</strong> Benenne die Datei direkt beim Export
          aus Canva, nicht erst beim Upload.
        </HinweisBox>
        <H4>Bildqualität: die unsichtbare Sichtbarkeits-Ebene</H4>
        <Bullets
          items={[
            'Hochauflösend (mindestens 1000 × 1500 px für Standard-Pins)',
            'Kein verschwommenes oder dunkles Material',
            'Klare Motive, keine überladenen Hintergründe',
            'Helle, kontrastreiche Bilder performen messbar besser',
          ]}
        />
        <Para>
          Pinterests interne Bildanalyse bewertet Bildschärfe und
          Komposition, gute Bilder werden algorithmisch bevorzugt.
        </Para>
        <H4>Alt-Text: die übersehene Sichtbarkeits-Goldgrube</H4>
        <Para>
          Jeder Pin kann einen Alt-Text bekommen (max. 500 Zeichen). Der
          wird für Screen-Reader genutzt (Barrierefreiheit), von Pinterest
          für die Sichtbarkeit ausgewertet und für die Pinterest-Suche indexiert.
        </Para>
        <Para>Schreibe in den Alt-Text:</Para>
        <Bullets
          items={[
            'Was auf dem Bild zu sehen ist',
            'Das Thema des Pins',
            '2-3 relevante Keywords',
          ]}
        />
        <Para>
          <strong>Beispiel-Alt-Text:</strong> „Aufgeräumter Yogaraum mit
          Holzboden, Pflanzen und Yoga-Matte an der Wand, Ideen für die
          Einrichtung einer Yoga-Ecke zuhause.“
        </Para>
      </Accordion>

      <Accordion title="Welche Keywords funktionieren? Der monatliche Check">
        <Para>
          Die Keyword-Datenbank in Pin-Flow ist nicht nur zur Verwaltung da,
          sie ist ein strategisches Planungswerkzeug.
        </Para>

        <H4>Wie das Tracking funktioniert</H4>
        <Para>
          Pin-Flow gleicht automatisch alle Keywords aus deiner
          Keyword-Datenbank mit deinen Pins ab. Durchsucht werden Pin-Titel,
          Pin-Beschreibung und Board-Name, nicht der Hook, da Text im Bild für
          die Datenbank nicht lesbar ist. Der Abgleich passiert automatisch
          beim Anlegen und Bearbeiten eines Pins. Wenn du neue Keywords zur
          Datenbank hinzufügst, klickst du einmal auf „Keywords neu
          abgleichen", damit auch bestehende Pins durchsucht werden. Aus den
          importierten Analytics berechnet Pin-Flow dann pro Keyword, in wie
          vielen Pins es vorkommt, die durchschnittliche CTR und die
          durchschnittlichen Klicks. Daraus ergibt sich pro Keyword ein Signal:
          stark, gut, beobachten oder noch nicht verwendet.
        </Para>

        <HinweisBox>
          Pinterest selbst liest den Text auf deinem Bild, also den Hook, per
          Texterkennung aus und wertet ihn als Keyword. Pin-Flows internes
          Tracking kann den Hook aber nicht durchsuchen, weil er im Bild steckt.
          Schreibe deine wichtigsten Keywords deshalb immer auch in Titel und
          Beschreibung, nicht nur in den Hook. So erkennt Pinterest sie über die
          Bildtexterkennung, und Pin-Flow kann ihre Performance mitverfolgen.
        </HinweisBox>

        <H4>Was die Performance-Signale bedeuten:</H4>
        <Bullets
          items={[
            <>
              <strong>Stark</strong>: Ø CTR über 2 % in mindestens 3 Pins.
              Dieses Keyword funktioniert, öfter einsetzen.
            </>,
            <>
              <strong>Gut</strong>: Ø CTR 1 bis 2 %. Solide Performance,
              weiter beobachten.
            </>,
            <>
              <strong>Beobachten</strong>: Keyword in Pins gefunden, aber
              CTR unter 1 %. Pin oder Keyword optimieren.
            </>,
            <>
              <strong>Noch nicht verwendet</strong>: Keyword noch in keinem
              Pin gefunden. Beim nächsten passenden Pin einsetzen.
            </>,
          ]}
        />

        <H4>Der monatliche Keyword-Check (5 Minuten):</H4>
        <Para>
          Direkt nach dem Analytics-Update diese beiden Fragen beantworten:
        </Para>
        <OrderedList>
          <li>
            In welchen gut laufenden Pins kommt ein Keyword vor? Diese Keywords
            öfter verwenden.
          </li>
          <li>
            Gibt es Keywords in der Datenbank, die noch nie in einem Pin
            verwendet wurden? Prüfen, ob sie relevant sind.
          </li>
        </OrderedList>
        <Para>
          Diese beiden Fragen in fünf Minuten beantwortet, und du weißt genau,
          wohin deine nächsten Pins gehen sollten.
        </Para>
        <Para>
          Öffne dazu die →{' '}
          <Link
            href="/dashboard/keywords"
            className="text-red-700 underline underline-offset-2 hover:text-red-800"
          >
            Keyword-Datenbank
          </Link>{' '}
          und prüfe, welche Keywords stark performen und wo du im nächsten Monat
          nachsteuern willst.
        </Para>

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Keywords sind kein Trick, sondern die Sprache
          deiner Zielgruppe. Wer
          sie kennt und nutzt, wird langfristig sichtbarer.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Pin-Felder optimal ausfüllen: Zeichenlimits & Best Practices"
        anchorId="pin-felder"
      >
        <Para>
          Kompakte Schnellreferenz für den Moment der Pin-Erstellung. Für
          die Erklärungen <em>warum</em> diese Felder wichtig sind: siehe{' '}
          <Link
            href="/dashboard/strategie?tab=faktoren&accordion=9-ranking-faktoren"
            className="font-medium text-red-600 hover:underline"
          >
            Die 10 Ranking-Faktoren
          </Link>
          .
        </Para>

        <WissenTabelle
          headers={['Feld', 'Limit', 'Kurz-Tipp']}
          rows={[
            [
              'Pin-Titel',
              'Max. 100 Zeichen',
              'Haupt-Keyword ganz vorne, die ersten 30 bis 35 Zeichen sind im Feed sichtbar, klickstark',
            ],
            [
              'Pin-Beschreibung',
              'Max. 500 Zeichen',
              'Mehrere Keywords natürlich integrieren, mit Call-to-Action enden',
            ],
            [
              'Alt-Text',
              'Max. 500 Zeichen',
              'Bild und Thema beschreiben, zwei bis drei relevante Keywords',
            ],
            [
              'URL',
              'Kein Limit',
              'Sprechend wählen, mit Keyword, zum Beispiel /yoga-morgenroutine statt /post-47',
            ],
            [
              'Pin-Bild',
              '1000 x 1500 px (2:3)',
              'Hochauflösend, hell, klar',
            ],
            [
              'Hook (Text auf dem Bild)',
              'Kurz und klar',
              'Wichtigstes Keyword einbauen, gut lesbar, wird von Pinterest per OCR gelesen',
            ],
            [
              'Bilddateiname',
              'Vor Upload umbenennen',
              'Bindestriche, klein geschrieben, mit Keyword, zum Beispiel yoga-matte-aufbewahren.jpg',
            ],
            [
              'Board-Name',
              'Max. 50 Zeichen',
              'Thematisch passend, mit Keyword',
            ],
            [
              'Board-Beschreibung',
              'Max. 500 Zeichen',
              'Zwei bis drei Sätze, Keyword vorne, Longtail-Keywords integrieren',
            ],
          ]}
        />
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 6 — Erfolg messen
// ===========================================================

function TabAnalytics({
  thresholds: t,
}: {
  thresholds: PinAnalyticsThresholds
}) {
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm font-medium text-gray-600">
        Deine Zahlen lesen, verstehen und in Handlung umsetzen.
      </p>
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Die meisten Pinterest-Nutzer schauen auf Follower und Impressionen, 
        und verpassen dabei das Wesentliche. Analytics zeigen dir nicht nur,
        wie viele Menschen deinen Pin gesehen haben. Sie zeigen dir{' '}
        <strong>warum ein Pin funktioniert oder nicht</strong>, und was du
        als nächstes tun sollst.
      </p>

      <Accordion title="Die zwei Stufen, die über deine Reichweite entscheiden">
        <Para>
          Pinterest funktioniert in zwei Stufen. Nur wenn beide funktionieren,
          entsteht echte Performance:
        </Para>

        <div>
          <H4>Stufe 1: Distribution → gemessen durch Impressionen</H4>
          <Para>
            Pinterest entscheidet, wie oft dein Pin ausgespielt wird, 
            basierend auf Relevanz, Keywords und Board-Qualität. Hohe
            Impressionen bedeuten: Der Algorithmus vertraut diesem Pin.
          </Para>
        </div>

        <div>
          <H4>Stufe 2: Reaktion → gemessen durch Klicks & Saves</H4>
          <Para>
            Ein Klick bedeutet, dass jemand mehr wissen wollte. Ein Save
            signalisiert Pinterest, dass der Inhalt wertvoll ist, und sorgt
            für organische Weiterdistribution.
          </Para>
        </div>

        <H4>Was du trackst, und was es bedeutet:</H4>
        <Bullets
          items={[
            <>
              <strong>Impressionen</strong>: wie oft wurde der Pin ausgespielt
            </>,
            <>
              <strong>Ausgehende Klicks</strong>: wie oft wurde auf die
              Website geklickt (direkter Traffic)
            </>,
            <>
              <strong>Saves</strong>: wie oft wurde der Pin gespeichert
              (langfristiger Wachstumshebel)
            </>,
            <>
              <strong>CTR (Click-Through-Rate)</strong> = Klicks ÷ Impressionen
              × 100. Zeigt, wie überzeugend dein Hook ist. Wichtig: Was eine
              „gute" CTR ist, hängt vom eigenen Account ab, die App vergleicht
              jeden Pin mit deinem persönlichen Durchschnitt, nicht mit
              Branchenwerten.
            </>,
            <>
              <strong>Save-Rate</strong> = Saves ÷ Impressionen × 100. Misst,
              wie oft Menschen deinen Pin auf eigene Boards speichern.
              Pinterests wichtigstes Signal: Hohe Save-Rate → Pinterest spielt
              deinen Pin mehr aus.
            </>,
            <>
              <strong>Engagement-Rate</strong> = (Saves + Ausgehende Klicks) ÷
              Impressionen × 100. Ein hilfreicher Anzeigewert für die
              Gesamtaktivität, der aber weder die Pin-Diagnose noch den
              Board-Status direkt steuert. Die Pin-Bewertung läuft über
              Save-Rate und CTR, der Board-Status über die Pin-Aktivität.
            </>,
          ]}
        />

        <HinweisBox variant="merke">
          <strong>Merke:</strong> Analytics ist kein Bewertungssystem für
          deine Arbeit. Es ist ein Navigationssystem für deine nächsten
          Schritte.
        </HinweisBox>
      </Accordion>

      <Accordion title="Welche Zahlen du brauchst und was sie dir verraten">
        <H4>Die drei Kennzahlen die du brauchst</H4>
        <Para>
          Du importierst deine Pinterest-Daten per CSV. Pin-Flow liest daraus
          je Pin drei Kennzahlen:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Impressionen</strong>: wie oft wurde der Pin ausgespielt
            </>,
            <>
              <strong>Klicks</strong>: wie oft wurde auf die Website geklickt
            </>,
            <>
              <strong>Saves</strong>: wie oft wurde der Pin gespeichert
            </>,
          ]}
        />
        <Para>
          Die Performance deines Profils trägst du zusätzlich manuell ein.
        </Para>
        <Para>Daraus berechnet Pin-Flow drei Werte:</Para>
        <Bullets
          items={[
            <>
              <strong>CTR (Click-Through-Rate)</strong> = Klicks ÷
              Impressionen × 100
            </>,
            <>
              <strong>Save-Rate</strong> = Saves ÷ Impressionen × 100
            </>,
            <>
              <strong>Engagement-Rate</strong> = (Saves + Ausgehende Klicks) ÷
              Impressionen × 100
            </>,
          ]}
        />
        <Para>
          Die Save-Rate ist dabei das wichtigste Signal: Pinterest nutzt sie
          selbst, um zu entscheiden, ob ein Pin weiter ausgespielt wird. Die
          Diagnose jedes Pins stützt sich genau auf zwei dieser Werte, die
          Save-Rate als Algorithmus-Signal und die CTR als Nutzer-Signal. Die
          Engagement-Rate steuert die Ausspielung nicht, sie ist ein reiner
          Anzeigewert, der dir das Gesamtbild zeigt.
        </Para>
        <Para>
          Daraus ergeben sich 6 Diagnose-Kategorien, von „Aktiver Top
          Performer" über „Hidden Gem" bis „Stiller Pin", die dir für jeden
          Pin sagen, was zu tun ist. Welche das sind und wie du sie liest,
          zeigt dir der nächste Abschnitt „Was deine Pins dir sagen".
        </Para>

        <H4>Welchen Zeitraum du verwendest</H4>
        <Para>
          Du exportierst deine Daten aus Pinterest Analytics nicht als
          Gesamtwert seit Veröffentlichung, sondern immer für einen bestimmten
          Zeitraum, von deinem letzten Stichtag bis zum aktuellen Datum.
          Pin-Flow speichert jede dieser Perioden einzeln und rechnet sie
          selbst zu deinen Gesamtwerten zusammen. So entsteht dein Verlauf über
          die Zeit, ohne dass du etwas doppelt einträgst.
        </Para>
        <Para>
          Für deinen persönlichen Durchschnitt zählen die Pins der letzten 90
          Tage mit mindestens 100 Impressionen. So bleibt dein Vergleichswert
          immer aktuell. Das ist eine andere Schwelle als die Bewertung eines
          einzelnen Pins weiter unten.
        </Para>

        <H4>Wie die Diagnose entsteht</H4>
        <Para>
          Dieses System bewertet jeden Pin nicht gegen Branchenwerte, sondern
          gegen deine eigenen Pins.
        </Para>
        <Bullets
          items={[
            <>
              Aus deinen Pins der letzten 90 Tage berechnet die App einen
              Durchschnittswert (Median) für CTR und Save-Rate.
            </>,
            <>
              Jeder neue Pin wird gegen diesen Durchschnitt verglichen: Liegt
              er drüber oder drunter?
            </>,
            <>
              Bevor ein einzelner Pin nach seiner Klickrate beurteilt wird,
              braucht er mindestens {t.minImpCtrUrteil} Impressionen. Darunter
              gilt er als „noch zu früh". Das ist nicht dieselbe Schwelle wie die
              100 Impressionen für deinen persönlichen Durchschnitt, sondern ein
              eigener Mindestwert pro Pin.
            </>,
          ]}
        />
        <Para>
          <strong>Vorteil:</strong> Du vergleichst dich fair mit dir selbst,
          nicht mit großen Pinterest-Profis. Dein Account skaliert mit, je
          mehr Pins du erstellst.
        </Para>

        <H4>Welche Pins importiert werden</H4>
        <Para>
          Du lädst deine CSV-Dateien aus Pinterest Analytics hoch, den Rest
          übernimmt Pin-Flow automatisch. Es übernimmt alle Pins aus der Datei,
          die zu deinen in Pin-Flow angelegten Pins passen. Pins, die du noch
          nicht angelegt hast, werden dir gesondert angezeigt, sodass du sie bei
          Bedarf ergänzen kannst.
        </Para>
      </Accordion>

      <Accordion title="Was deine Pins dir sagen: die 6 Diagnosen und deine Handlung dazu">
        <Para>
          Jeder deiner Pins bekommt automatisch eine Diagnose. Sie kombiniert
          zwei Fragen: Spielt Pinterest den Pin aus? Klicken Menschen ihn an?
          Aus den Antworten ergeben sich 6 Situationen, die jeweils eine
          andere Handlung erfordern.
        </Para>

        <Table
          head={[
            'Spielt Pinterest aus?',
            'Klicken Menschen?',
            'Diagnose',
            'Kategorie',
          ]}
          rows={[
            [
              'Ja',
              'Ja',
              'Alles funktioniert',
              '⭐ Aktiver Top Performer',
            ],
            [
              'Nein',
              'Ja',
              'Pin gut, Sichtbarkeit schwach',
              '💎 Hidden Gem',
            ],
            [
              'Ja',
              'Nein',
              'Reichweite da, Cover schwach',
              '🔧 Reichweite ohne Wirkung',
            ],
            [
              'Nein',
              'Nein',
              'Niemand reagiert',
              '💤 Stiller Pin',
            ],
            [
              'Spezialfall: alter Star',
              '',
              'War mal stark, lebt nicht mehr',
              '♻️ Eingeschlafener Gewinner',
            ],
            [
              'Spezialfall: zu wenig Daten',
              '',
              'Noch keine Aussage möglich',
              '⏳ Noch zu früh',
            ],
          ]}
        />

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Aktiver Top Performer</H3>
          <Para>
            Diese Pins haben bewiesen: Pinterest spielt sie aus, Menschen
            klicken sie an, das Thema hat echte Nachfrage. Sie sind dein
            Blueprint für die nächsten Pins.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Sowohl die Save-Rate als
            auch die CTR liegen über deinem persönlichen Durchschnitt, und der
            Pin hat genug Daten gesammelt, um das verlässlich zu beurteilen.
            Beide Signale sind stark, das ist der Idealzustand.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Produziere 2 bis 3 Varianten desselben
            Themas mit leicht abgewandeltem Hook oder Design. Das Pin-Fenster
            ist befristet, nutze es, solange Pinterest den Pin aktiv pusht.
          </Para>
          <Para>
            <strong>Wichtig, der Zeitfaktor:</strong> Pinterest spielt neue Pins
            in den ersten rund {t.topPerformerMaxAlter} Tagen am stärksten aus.
            Pin-Flow zeigt dir dazu auf dem Dashboard einen Countdown, wie lange
            ein Top Performer voraussichtlich noch in dieser starken Phase ist.
            Das bedeutet nicht, dass der Pin danach wertlos wird: Gute Pins
            liefern oft über Monate, Evergreen-Themen sogar über Jahre. Erst
            wenn ein früher starker Pin von Pinterest immer weniger ausgespielt
            wird — seine Reichweite über die letzten Monate deutlich einbricht —
            stuft Pin-Flow ihn als Eingeschlafenen Gewinner ein, dann lohnt sich
            das Recyceln.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Hidden Gem</H3>
          <Para>
            Wer diesen Pin sieht, klickt überdurchschnittlich oft durch. Aber
            Pinterest zeigt ihn fast niemandem. Verschenktes Potenzial.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Was gut läuft: Die Klickrate
            liegt deutlich über deinem Durchschnitt, dein Hook zieht. Das
            Problem: Die Reichweite ist niedrig, Pinterest spielt den Pin noch
            zu wenig aus. Das ist oft ein Keyword- oder Board-Thema.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Erstelle einen neuen Pin mit
            demselben Cover, aber überarbeite Titel, Beschreibung und
            Keywords. Vielleicht passt der Pin auch besser auf ein anderes
            Board.
          </Para>
          <Para>
            <strong>Hinweis:</strong> Damit ein Pin als Hidden Gem gilt,
            braucht er mindestens {t.minImpCtrUrteil} Impressionen. Bei
            kleineren Stichproben sind Klickraten zu unzuverlässig.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Reichweite ohne Wirkung</H3>
          <Para>
            Pinterest spielt diesen Pin gut aus, viele Menschen sehen ihn, 
            aber kaum jemand klickt durch. Das Cover oder der Hook funktioniert
            nicht.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Was gut läuft: Pinterest
            spielt den Pin viel aus, deine Keywords und dein Board funktionieren
            (mindestens {t.minImpReichweiteStark} Impressionen, Save-Rate über
            deinem Durchschnitt). Das Problem: Zu wenige klicken durch, der Hook
            oder das Titelbild überzeugt noch nicht (CTR unter deinem
            Durchschnitt).
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Erstelle einen neuen Pin mit
            anderem Cover-Design: stärkerer Hook-Text, größere Schrift,
            klareres Versprechen. Link und Keywords kannst du gleich lassen.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Stiller Pin</H3>
          <Para>
            Weder Pinterest noch Nutzer reagieren auf diesen Pin. Er hat genug
            Zeit gehabt zu performen, aber er hat nicht funktioniert.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Der Pin ist älter als{' '}
            {t.beobachtungszeitraum} Tage und hatte mit mindestens{' '}
            {t.minImpCtrUrteil} Impressionen genug Gelegenheit. Trotzdem liegen
            weder Saves noch Klicks über deinem Durchschnitt. Hier ist also kein
            Signal stark, das ist die deutlichste Baustelle. Das ist normal,
            nicht jedes Thema trifft.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Zwei Optionen.
          </Para>
          <Bullets
            items={[
              <>
                Wenn das Thema strategisch wichtig ist: Komplett neuer Pin, 
                anderes Cover, anderer Winkel, andere Keywords.
              </>,
              <>
                Wenn das Thema nicht zentral ist: Energie auf andere Pins
                legen. Nicht jeder Pin muss gerettet werden.
              </>,
            ]}
          />
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Eingeschlafener Gewinner</H3>
          <Para>
            Dieser Pin lief früher stark, verliert inzwischen aber an
            Reichweite. Pinterest priorisiert frische Inhalte, ältere Pins
            werden mit der Zeit seltener ausgespielt.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Was gut läuft: Das Thema hat
            sich bewiesen, der Pin hatte historisch starke Zahlen. Das Problem
            ist die einbrechende Reichweite — Pinterest spielt den Pin kaum noch
            aus, deshalb lohnt sich das Recyceln.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Recyceln. Erstelle eine neue
            Variante mit frischem Design und aktualisierten Keywords. Du
            startest nicht bei null, du baust auf einem bewiesenen Fundament
            auf.
          </Para>
          <Para>
            Das ist dein effizientester Hebel. Im Dashboard zeigt dir
            „Bestehende Pins optimieren" automatisch, welche Pins sich fürs
            Recyceln anbieten.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <H3>Noch zu früh</H3>
          <Para>
            Wir haben zu wenig Daten für eine ehrliche Bewertung. Entweder ist
            der Pin noch jung oder Pinterest hat ihn noch nicht oft genug
            ausgespielt.
          </Para>
          <Para>
            <strong>Was die Daten zeigen:</strong> Für ein verlässliches Urteil
            fehlen noch Daten: Der Pin ist jünger als {t.beobachtungszeitraum}{' '}
            Tage und hat unter {t.minImpReichweiteStark} Impressionen, oder
            weniger als {t.minImpCtrUrteil} Impressionen, egal wie alt. Das ist
            kein Problem, sondern normal, der Pin sammelt noch Daten, hier zählt
            Geduld.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Abwarten. Nicht voreilig
            optimieren, bei kleiner Datenbasis sind Quoten Glückssache, kein
            Muster.
          </Para>
          <Para>
            <strong>Hintergrund:</strong> Pinterest braucht typischerweise{' '}
            {t.beobachtungszeitraum} bis {t.topPerformerMaxAlter} Tage, um einen
            Pin voll auszuspielen. In dieser Zeit schwanken alle Zahlen stark.
            Beim nächsten Daten-Import prüft die App automatisch neu.
          </Para>
        </div>

        <HinweisBox variant="merke">
          <strong>Das Pareto-Prinzip für deine Pins:</strong> Etwa 20 Prozent
          deiner Pins bringen rund 80 Prozent deiner Ergebnisse. Du wirst nie
          alle Pins gleich stark laufen sehen, und das ist auch nicht das Ziel.
          Erkenne mit diesen Diagnosen, welche Pins zu deinen besten 20 Prozent
          gehören, und konzentriere deine Energie dort: mehr von dem
          produzieren, was funktioniert, weniger von dem, was nicht läuft.
        </HinweisBox>
      </Accordion>

      <Accordion title="Boards optimieren, damit deine Pins besser laufen">
        <Para>
          Viele Pinterest-Nutzer optimieren ihre Pins, aber vergessen ihre
          Boards. Das ist ein Fehler. Boards sind neben Keywords in Pin-
          Titel und Pin-Beschreibung der zweitwichtigste Faktor für die
          Distribution deiner Pins. Pinterest nutzt das Board als Kontext-
          Signal: Es entscheidet, mit welchen Suchanfragen dein Pin
          ausgespielt wird. Ein thematisch starkes Board verstärkt jeden Pin
          darauf, ein schwaches Board bremst selbst gute Pins aus.
        </Para>

        <H4>Was ist wichtiger: Engagement Rate oder ausgehende Klicks?</H4>
        <Para>Beide Kennzahlen sind relevant, aber für verschiedene Fragen:</Para>
        <Bullets
          items={[
            <>
              <strong>Engagement-Rate (ER)</strong> fasst Saves, Pin-Klicks
              und ausgehende Klicks einer Pinnwand im Verhältnis zu den
              Impressionen zusammen. Sie ist ein nützlicher Anhaltspunkt
              dafür, wie gut die Pins auf einer Pinnwand insgesamt ankommen.
              Sie ist aber kein einzelnes Ranking-Signal, über das Pinterest
              die Qualität einer Pinnwand bewertet. Wichtiger für die
              Distribution sind thematische Konsistenz, Aktualität und
              regelmäßiges Pinnen auf eine fokussierte Pinnwand.
            </>,
            <>
              <strong>Ausgehende Klicks</strong> → zeigen, ob das Board
              Traffic auf deine Website schickt. Das ist der direkte
              Business-Impact, wie viel Website-Traffic kommt von diesem
              Board?
            </>,
          ]}
        />
        <HinweisBox variant="merke">
          <strong>Faustregel:</strong> Die Engagement-Rate zeigt, wie gut die
          Pins auf einer Pinnwand insgesamt ankommen. Ausgehende Klicks zeigen,
          wie viel Website-Traffic die Pinnwand bringt. Beide zusammen zeigen
          dir, ob eine Pinnwand wirklich funktioniert.
        </HinweisBox>

        <H4>Was du daraus ableitest:</H4>
        <Bullets
          items={[
            'Board mit hohen Impressionen, aber wenig Klicks → Hook-Problem: Die Pins darauf überzeugen nicht zum Klicken, Design und Hook überarbeiten',
            'Board mit wenig Impressionen → Sichtbarkeits-Problem: Board-Name und Beschreibung sind zu schwach, Keywords optimieren',
            'Pinnwand mit niedriger ER: ein Hinweis, dass die Pins darauf noch nicht gut ankommen. Prüfe, ob Thema, Pin-Qualität und Aktivität zusammenpassen, und pinne regelmäßiger zum Kernthema der Pinnwand',
          ]}
        />

        <H4>Board-Optimierung in 4 Schritten:</H4>

        <div>
          <H4>Schritt 1: Board-Name prüfen</H4>
          <Para>
            Enthält der Board-Name das wichtigste Keyword? Steht es ganz
            vorne? Ein Board namens „Meine Yoga Welt" ist schwächer als „Yoga
            zuhause: Yogaraum & Yoga Ecke einrichten". Pinterest indexiert
            den neuen Namen innerhalb weniger Tage.
          </Para>
        </div>

        <div>
          <H4>Schritt 2: Board-Beschreibung überarbeiten</H4>
          <Para>
            Leer oder zu kurz? 2 bis 3 Sätze mit den wichtigsten Keywords
            schreiben, natürlich formuliert. Nutze den{' '}
            <Link
              href="/dashboard/boards"
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              → KI-Prompt Generator
            </Link>{' '}
            auf der Boards-Seite, um direkt einen auf Sichtbarkeit optimierten Board-Namen
            und eine Beschreibung zu generieren.
          </Para>
        </div>

        <div>
          <H4>Schritt 3: Board reaktivieren</H4>
          <Para>
            Inaktive Boards brauchen neue Pins. Mindestens 3 bis 5 neue Pins pro
            Woche, bis das Board wieder als aktiv gilt.
          </Para>
        </div>

        <div>
          <H4>Schritt 4: Board-Score prüfen</H4>
          <Para>
            Nach 30 Tagen erneut prüfen. Hat sich die Performance verbessert?
            Wenn nicht, Keywords weiter optimieren oder Board strategisch
            überdenken.
          </Para>
        </div>

        <H4>Wann du ein Board löschen solltest:</H4>
        <Para>
          Lösche ein Board nur, wenn es thematisch komplett falsch ist und
          keine Verbindung zu deiner Nische hat. In allen anderen Fällen ist
          Optimieren besser als Löschen, Pinterest verliert beim Löschen
          alle historischen Daten des Boards.
        </Para>

        <HinweisBox>
          <strong>Tipp:</strong> Prüfe einmal im Monat deine Board-Zahlen
          im Dashboard unter Board-Gesundheit. Top Boards zeigen dir, wo
          deine Zielgruppe aktiv ist, dort mehr produzieren. Schwache
          Boards entweder aktiv bespielen oder Board-Beschreibung mit
          stärkeren Keywords überarbeiten.
        </HinweisBox>

        <H4>Zusammenhang Board und Pin-Diagnose</H4>
        <Para>
          Ein Hidden Gem auf einem Top-Board ist meist ein reines
          Keyword-Problem (das Board pusht das Umfeld, aber dieser Pin wird
          nicht gefunden). Ein Hidden Gem auf einem schwachen Board hat
          zusätzlich ein Board-Problem, beides muss optimiert werden.
        </Para>
      </Accordion>

    </div>
  )
}
