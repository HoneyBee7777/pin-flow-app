'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { StrategieRow } from './lib'
import MyStrategy from './MyStrategy'

type TabKey =
  | 'meine'
  | 'grundlagen'
  | 'strategien'
  | 'design'
  | 'keywords'
  | 'analytics'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'meine', label: '🎯 Meine Strategie' },
  { key: 'grundlagen', label: '📚 Pinterest-Grundlagen' },
  { key: 'strategien', label: '💼 Die drei Strategien' },
  { key: 'design', label: '🎨 Pin-Design & Formate' },
  { key: 'keywords', label: '🔍 Keywords & SEO' },
  { key: 'analytics', label: '📊 Analytics & Boards' },
]

const TAB_KEYS: TabKey[] = [
  'meine',
  'grundlagen',
  'strategien',
  'design',
  'keywords',
  'analytics',
]

export default function StrategieClient({
  strategie,
}: {
  strategie: StrategieRow | null
}) {
  const searchParams = useSearchParams()
  const initialTab: TabKey = (() => {
    const t = searchParams?.get('tab')
    return t && (TAB_KEYS as string[]).includes(t) ? (t as TabKey) : 'meine'
  })()
  const [active, setActive] = useState<TabKey>(initialTab)

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
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-red-600 text-red-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div role="tabpanel">
        {active === 'meine' && <MyStrategy strategie={strategie} />}
        {active === 'grundlagen' && <TabGrundlagen />}
        {active === 'strategien' && <TabStrategien />}
        {active === 'design' && <TabDesign />}
        {active === 'keywords' && <TabKeywords />}
        {active === 'analytics' && <TabAnalytics />}
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
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
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

type HinweisVariant = 'tipp' | 'merke'

function HinweisBox({
  children,
  variant = 'tipp',
}: {
  children: ReactNode
  variant?: HinweisVariant
}) {
  // Tipp = amber (Handlungsempfehlung), Merke = teal (Prinzip / Wissen).
  // Beide nutzen einen left-border als visueller Akzent.
  const cls =
    variant === 'merke'
      ? 'border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 text-teal-800'
      : 'border border-amber-200 border-l-[3px] border-l-amber-400 bg-amber-50 text-amber-900'
  return (
    <div className={`rounded-md p-4 text-sm leading-relaxed ${cls}`}>
      {children}
    </div>
  )
}

function Para({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-gray-700">{children}</p>
}

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
      {children}
    </h3>
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

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800">
      {children}
    </pre>
  )
}

// ===========================================================
// Tab 2 — Pinterest-Grundlagen
// ===========================================================

function TabGrundlagen() {
  return (
    <div className="space-y-3">
      <Accordion title="Was Pinterest wirklich ist">
        <Para>
          Pinterest funktioniert grundlegend anders als Google oder Social
          Media. Wer Pinterest mit Instagram oder TikTok vergleicht, versteht
          es falsch.
        </Para>
        <Table
          head={['Aspekt', 'Google', 'Social Media', 'Pinterest']}
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
              'Inspiration & Ideen sammeln',
            ],
            [
              'Kaufbereitschaft',
              'Hoch (aktive Suche)',
              'Niedrig (passives Scrollen)',
              'Sehr hoch (Planungsphase)',
            ],
            [
              'Lebensdauer eines Beitrags',
              'Monate bis Jahre',
              '24-48 Stunden',
              'Monate bis Jahre',
            ],
            [
              'Reichweite ohne Follower',
              'Möglich (SEO)',
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
              'Content-Aufwand',
              'Hoch (Texte/SEO)',
              'Sehr hoch (täglich)',
              'Mittel (1x Monat reicht)',
            ],
          ]}
        />
        <H4>Was das für dich bedeutet:</H4>
        <Para>
          Pinterest-Nutzer sind Planer – sie suchen aktiv nach Ideen und
          Lösungen für Vorhaben, die sie umsetzen wollen. Wer einen Garten
          anlegt, ein Geschenk kauft, ein Rezept sucht oder eine Reise plant –
          der nutzt Pinterest. Diese Planungsabsicht macht Pinterest-Traffic
          besonders wertvoll:
        </Para>
        <Bullets
          items={[
            'Nutzer sind kaufbereiter als auf Social Media',
            'Sie speichern Pins für später – dein Content wird noch Monate später gefunden',
            'Sie kommen mit konkreter Suchintention – kein Zufallstraffic',
          ]}
        />
        <Para>
          Pinterest ist keine Alternative zu Google – es ist eine Ergänzung.
          Google zeigt Text-Ergebnisse, Pinterest zeigt visuelle Ergebnisse.
          Wer auf beiden präsent ist, verdoppelt seine Sichtbarkeit.
        </Para>
        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Pinterest ist keine Social-Media-Plattform,
          die tägliche Aufmerksamkeit braucht. Es ist eine Suchmaschine, die
          mit einmaliger Arbeit langfristige Ergebnisse liefert.
        </HinweisBox>
      </Accordion>

      <Accordion title="Mit Pinterest Geld verdienen – die 5 Wege">
        <Para>
          Pinterest selbst zahlt dir kein Geld. Aber Pinterest bringt
          qualifizierten Traffic, der auf verschiedene Arten monetarisiert
          werden kann.
        </Para>

        <div>
          <H3>Weg 1 – Blog-Traffic monetarisieren</H3>
          <Bullets
            items={[
              'Werbeanzeigen (Google AdSense, Mediavine, Raptive): Verdiene Geld pro 1.000 Seitenaufrufe',
              'Gesponserte Beiträge: Marken zahlen für Erwähnungen',
              'Empfohlen wenn: Du einen Blog hast und Reichweite aufbauen willst',
            ]}
          />
        </div>

        <div>
          <H3>Weg 2 – Affiliate Marketing</H3>
          <Bullets
            items={[
              'Direkt über Pinterest: Pin verlinkt zu Affiliate-Produkt',
              'Über Blog: Pin → Blogbeitrag mit Affiliate-Links → Provision',
              'Provision typischerweise 5-30% des Kaufpreises',
              'Empfohlen wenn: Du Produkte empfiehlst, die deine Zielgruppe braucht',
              <span key="warn" className="text-amber-700">
                ⚠️ Affiliate-Links müssen als solche gekennzeichnet sein
              </span>,
            ]}
          />
        </div>

        <div>
          <H3>Weg 3 – Eigene digitale Produkte verkaufen</H3>
          <Bullets
            items={[
              'E-Books, PDF-Guides, Online-Kurse, Workshops',
              'Höchste Gewinnmarge weil kein Mittelsmann',
              'Empfohlen wenn: Du eigene Expertise verpackt hast',
            ]}
          />
        </div>

        <div>
          <H3>Weg 4 – Physische Produkte verkaufen</H3>
          <Bullets
            items={[
              'Eigener Online-Shop (Shopify, WooCommerce, Etsy)',
              'Pinterest Shopping mit Produktkatalog',
              'Shopping Pins zeigen Preis direkt im Pin',
              'Empfohlen wenn: Du physische Produkte verkaufst',
            ]}
          />
        </div>

        <div>
          <H3>Weg 5 – Dienstleistungen verkaufen</H3>
          <Bullets
            items={[
              'Coaching, Beratung, Kurse, Retreats, kreative Dienstleistungen',
              'Empfohlen wenn: Du Zeit gegen Geld tauschst',
            ]}
          />
        </div>

        <Para>
          Die erfolgreichsten Pinterest-Creator kombinieren mehrere Wege:
        </Para>
        <CodeBlock>
{`Pinterest Traffic
   → Blog (Werbung + Affiliate-Links)
   → Newsletter (Leadmagnet)
   → Eigener Kurs oder digitales Produkt
   → Coaching / Premium-Angebot`}
        </CodeBlock>

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Pinterest ist der Kanal – nicht die
          Einnahmequelle. Wer nur auf eine Einnahmequelle setzt, ist abhängig.
          Wer diversifiziert, baut echte Einkommenssicherheit auf.
        </HinweisBox>
      </Accordion>

      <Accordion title="Posting-Frequenz — wie viele Pins pro Tag in 2026?">
        <H4>Die ehrliche Antwort: Pinterest gibt offiziell keine Zahl vor</H4>
        <Para>
          Pinterest selbst sagt: Es gibt kein Limit wie viele Pins du
          erstellen kannst. Die offizielle Empfehlung lautet nur — regelmäßig
          frischen Content posten, mindestens wöchentlich, ohne feste
          Stückzahl. Pinterest betont Fokus auf Content-Qualität, nicht auf
          eine fixe Pin-Anzahl pro Woche.
        </Para>
        <Para>
          Das heißt: Alle konkreten Zahlen die du online findest sind
          Erfahrungswerte von Pinterest-Manager:innen und Tools wie Tailwind
          — keine offiziellen Pinterest-Vorgaben.
        </Para>

        <H4>Der Konsens für 2026</H4>
        <Para>
          Die Empfehlungen haben sich in den letzten Jahren deutlich nach
          unten verschoben. Was 2020 noch normal war (25–50 Pins/Tag) gilt
          heute als Spam-Risiko.
        </Para>
        <Para>Aktuelle Richtwerte (Stand 2026):</Para>
        <Bullets
          items={[
            <>
              <strong>Tailwind (offiziell):</strong> 5 Pins pro Tag
            </>,
            <>
              <strong>Adobe / Black Pug Studio:</strong> 3–10 Pins pro Tag
            </>,
            <>
              <strong>Your Pin Coach:</strong> Maximal ~10 Pins pro Tag, oft
              sogar weniger
            </>,
            <>
              <strong>12AM Agency:</strong> Der „tägliche Grind" von 20 Pins/
              Tag ist Vergangenheit — Pinterest belohnt stetiges, ruhiges
              Posten statt Bursts
            </>,
            <>
              <strong>Persönliche Erfahrungswerte aus der Community:</strong>{' '}
              3–15 reichen je nach Account
            </>,
          ]}
        />
        <HinweisBox variant="merke">
          💡 Der gesunde Korridor für die meisten Accounts liegt 2026 bei{' '}
          <strong>3–10 frischen Pins pro Tag</strong>.
        </HinweisBox>

        <H4>Warum die Zahlen gesunken sind</H4>
        <Para>
          Drei Gründe haben die „Mehr ist mehr"-Ära beendet:
        </Para>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            <strong>Algorithmus-Shift zu Qualität</strong> — Ein Pin mit 100
            Saves ist mehr wert als 100 Pins mit null Interaktion. Pinterest
            belohnt Engagement, nicht Volumen.
          </li>
          <li>
            <strong>Spam-Filter</strong> — Aggressives Pinning — besonders
            Recyceln derselben Pins und Links über zu viele Boards — kann zu
            Shadow-Ban oder Account-Sperre führen.
          </li>
          <li>
            <strong>Search-Intent-Logik</strong> — Pinterest funktioniert wie
            eine Suchmaschine. Wenige starke, gut keyword-optimierte Pins
            schlagen Masse.
          </li>
        </ol>

        <H4>Was wirklich zählt — wichtiger als die Zahl</H4>

        <div>
          <H4>1. Konsistenz über Volumen</H4>
          <Para>
            Lieber 3 Pins jeden Tag als 21 am Sonntag. Regelmäßiges
            Auftauchen zählt mehr als Bursts.
          </Para>
        </div>

        <div>
          <H4>2. Pin-Anzahl an Content-Pipeline anpassen</H4>
          <Para>
            Die richtige Zahl hängt davon ab wie viele einzigartige URLs du
            hast. Pinne so viele Pins pro Tag wie du wirklich verschiedene
            Designs zu unterschiedlichen URLs erstellen kannst — ohne in
            Duplikate abzurutschen. Ein Blog mit 10 Posts kann nicht dasselbe
            Pin-Volumen tragen wie ein Shop mit 200 Produkten.
          </Para>
        </div>

        <div>
          <H4>3. Spacing wichtiger als Volumen</H4>
          <Bullets
            items={[
              'Gleiche URL: nicht öfter als 1× in 24h, ideal 3–7 Tage Abstand',
              'Gleicher Pin auf verschiedene Boards (mit Variation): 2 Tage Minimum, 7 Tage besser',
            ]}
          />
        </div>

        <div>
          <H4>4. Native Scheduler bevorzugen</H4>
          <Para>
            Mehrere 2026er-Quellen empfehlen den Pinterest-eigenen Scheduler
            statt Drittanbieter — weil das Engagement-Signale verbessert.
          </Para>
        </div>

        <H4>Dein Korridor je nach Account-Phase</H4>
        <Table
          head={['Phase', 'Content-Pool', 'Empfehlung']}
          rows={[
            ['Einsteiger', 'weniger als 20 URLs', '1–3 frische Pins/Tag'],
            ['Wachstumsphase', '20–100 URLs', '3–5 frische Pins/Tag'],
            ['Etablierter Account', '100+ URLs', '5–10 frische Pins/Tag'],
            ['Absolute Obergrenze', '—', '15/Tag, niemals darüber'],
          ]}
        />

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <p>
            ⚠️ <strong>Wichtig:</strong> Pinterest gibt keine offizielle Zahl
            vor. Diese Empfehlungen basieren auf aktuellen Erfahrungswerten
            aus 2026 — sie können sich ändern.
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
        </div>
      </Accordion>

      <Accordion title="Multi-Board-Pinning — wie du denselben Inhalt richtig auf mehreren Boards teilst">
        <Para>
          Multi-Board-Pinning bedeutet: denselben Inhalt (dieselbe URL) auf
          mehreren Boards pinnen — aber niemals mit demselben Bild. Das ist
          der entscheidende Unterschied.
        </Para>

        <H4>Was Pinterest unter einem Duplikat versteht</H4>
        <Para>
          Pinterest definiert einen Duplicate Pin als exakte Bild + URL-
          Kombination. Auch wenn du nur die Beschreibung änderst gilt der Pin
          als Duplikat — weil Pinterest Pins primär am visuellen Eindruck
          erkennt (Perceptual Hashing / pHash). Selbst kleine Änderungen wie
          Verblassen, Helligkeit anpassen oder einen Filter setzen reichen
          nicht — Pinterest erkennt das als dasselbe Motiv.
        </Para>

        <H4>Was als echter frischer Pin gilt</H4>
        <Para>
          Pinterest wertet einen Pin als frisch wenn er mindestens einen
          substanziellen visuellen Unterschied hat:
        </Para>
        <Bullets
          items={[
            'Anderes Foto oder Motiv',
            'Deutlich anderes Layout (Text oben statt unten, Collage statt Einzelbild)',
            'Anderer Text-Hook / Headline — kombiniert mit visueller Änderung',
            'Anderer Pin-Typ (Standard → Video → Carousel)',
          ]}
        />
        <Para>
          <strong>Faustregel:</strong> Wenn deine Zielgruppe auf den ersten
          Blick erkennen würde dass es derselbe Pin ist — ist es für Pinterest
          auch derselben Pin.
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

        <H4>Die richtige Vorgehensweise</H4>
        <Para>
          1 Blogpost / Produkt-URL → 3–5 visuell unterschiedliche Pin-Designs
          (verschiedene Bilder, andere Hooks, andere Layouts) → jeder Pin geht
          auf das thematisch passendste Board zuerst → frühestens nach 2–3
          Tagen ein zweites passendes Board → maximal ~10 Boards für denselben
          Content
        </Para>

        <H4>Wichtiger Hinweis zu UTM-Parametern</H4>
        <Para>
          Auch das Hinzufügen von UTM-Parametern zur URL macht keinen frischen
          Pin. Pinterest schaut auf die canonical URL plus das Bild — UTM-
          Parameter werden ignoriert.
        </Para>

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Variation bedeutet substanziell anderes
          Design — nicht kosmetische Änderungen. Dein Pin-Produktions-Workflow
          zwingt dich strukturell zur richtigen Variation.
        </HinweisBox>
      </Accordion>

      <Accordion title="Die 9 Ranking-Faktoren — dein Fahrplan für Pinterest-Erfolg">
        <Para>
          Pinterest ist eine Suchmaschine — kein Social Media. Wer alle 9
          Faktoren konsequent optimiert wird belohnt. Wer nur am Bild arbeitet
          aber Titel und URL vernachlässigt verschenkt Potenzial.
        </Para>
        <Para>
          Pinterest bewertet jeden Pin nach diesen Faktoren — in dieser
          Reihenfolge:
        </Para>

        <div>
          <H4>1. Pin Titel — der wichtigste SEO-Faktor</H4>
          <Para>
            Das Haupt-Keyword gehört ganz an den Anfang. Die ersten 30–35
            Zeichen erscheinen im Feed — alles danach wird abgeschnitten.
            Max. 100 Zeichen.
          </Para>
        </div>

        <div>
          <H4>2. Pin Beschreibung</H4>
          <Para>
            Natürlich formuliert mit mehreren relevanten Keywords. Immer mit
            Call-to-Action enden. Max. 500 Zeichen.
          </Para>
        </div>

        <div>
          <H4>3. URL</H4>
          <Para>
            Pinterest liest die URL deiner Zielseite nach Keywords. Eine URL
            wie „soulfulspace.de/yogaraum-einrichten" ist stärker als
            „soulfulspace.de/post-123". Achte darauf dass deine URLs sprechend
            sind.
          </Para>
        </div>

        <div>
          <H4>4. Board-Name</H4>
          <Para>
            Der Board-Name auf dem du den Pin speicherst beeinflusst direkt
            die Reichweite. Ein thematisch passender Board-Name verstärkt das
            SEO-Signal des Pins.
          </Para>
        </div>

        <div>
          <H4>5. Board-Beschreibung</H4>
          <Para>
            Wird von Pinterest vollständig gelesen und zur thematischen
            Einordnung genutzt. Max. 500 Zeichen, Longtail-Keywords verwenden.
          </Para>
        </div>

        <div>
          <H4>6. Website-Titel & Meta-Beschreibung</H4>
          <Para>
            Pinterest crawlt die Zielseite deines Pins. Der Seitentitel und
            die Meta-Beschreibung deiner Website fließen in die Bewertung ein
            — optimiere beides mit relevanten Keywords.
          </Para>
        </div>

        <div>
          <H4>7. Bilder & Bildqualität — inkl. OCR</H4>
          <Para>
            Pinterest nutzt OCR (Optical Character Recognition) — der Hook-
            Text auf deinem Pin-Bild wird gelesen und als SEO-Signal gewertet.
            Außerdem:
          </Para>
          <Bullets
            items={[
              'Bilddatei beim Upload mit Keywords benennen (nicht „IMG_1234.jpg" sondern „yoga-matte-aufbewahren-ideen.jpg")',
              'Alt Text beim Pin-Upload ausfüllen (max. 500 Zeichen, wichtigste Keywords)',
              'Hochauflösende, helle und klare Bilder performen besser',
            ]}
          />
        </div>

        <div>
          <H4>8. Pin-Kohärenz</H4>
          <Para>
            Pinterest prüft ob Bild, Titel, Beschreibung, URL und Board
            thematisch zusammenpassen. Ein Pin über „Yogaraum einrichten" der
            auf einem „Kochrezepte" Board gespeichert ist sendet
            widersprüchliche Signale — und wird schlechter ausgespielt.
            Konsistenz ist Pflicht.
          </Para>
        </div>

        <div>
          <H4>9. Pin-Engagement</H4>
          <Para>
            Klicks, Saves und Kommentare signalisieren Pinterest dass dein
            Pin relevant ist. Je mehr Engagement desto mehr Reichweite. Das
            ist der einzige Faktor den du nicht direkt kontrollieren kannst —
            aber durch alle anderen Faktoren positiv beeinflussen.
          </Para>
        </div>

        <H4>Empfehlungen für Board-Titel und -Beschreibungen:</H4>
        <Bullets
          items={[
            <>
              <strong>Board-Titel:</strong> Wenn möglich offizielle Pinterest-
              Kategorienamen verwenden oder meist gesuchte Keywords
            </>,
            <span key="bad" className="text-gray-700">
              ❌ „Meine Yoga-Welt" → keine Kategorie, kein Keyword
            </span>,
            <span key="good1" className="text-gray-700">
              ✅ „Yoga zuhause: Yogaraum & Yoga Ecke einrichten" → Keyword +
              Unterthema
            </span>,
            <span key="good2" className="text-gray-700">
              ✅ „Achtsamkeit & Meditation: Morgenroutine für mehr Ruhe" →
              Kategorie + Longtail
            </span>,
            <>
              <strong>Board-Beschreibung:</strong> 500 Zeichen, schnelle
              Beschreibung + beste gesuchte Longtail-Keywords
            </>,
            <>
              <strong>So findest du Pinterest-Kategorienamen:</strong>{' '}
              Pinterest öffnen → linkes Menü → „Entdecken" → dort siehst du
              alle offiziellen Kategorien
            </>,
          ]}
        />

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Pinterest ist eine Suchmaschine — kein
          Social Media. Wer alle 9 Faktoren konsequent optimiert wird belohnt.
        </HinweisBox>
      </Accordion>

      <Accordion title="Geheime Boards — das unterschätzte Schutzinstrument">
        <Para>
          Die meisten Pinterest-Nutzer wissen nicht dass öffentliche Boards
          den Algorithmus verwirren können — wenn sie themenfremde Inhalte
          enthalten.
        </Para>

        <H4>Das Problem mit öffentlichen privaten Interessen</H4>
        <Para>
          Wenn du privat nach Themen suchst die nichts mit deiner Nische zu
          tun haben — Rezepte, Reisen, Mode — und diese Pins auf öffentlichen
          Boards speicherst sendest du Pinterest widersprüchliche Signale.
          Pinterest denkt dein Account bedient mehrere unzusammenhängende
          Themen und spielt deine Pins weniger zielgerichtet aus.
        </Para>

        <H4>Die Lösung: Geheime Boards</H4>
        <Para>
          Geheime Boards sind nur für dich sichtbar — Pinterest wertet sie
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

        <H4>Warum Boards entscheidend sind</H4>
        <Para>
          Boards sind der zweitwichtigste SEO-Faktor auf Pinterest — direkt
          nach den Keywords. Pinterest nutzt sie als Kontext-Signal: Ein Board
          mit klarem Thema, guten Keywords und regelmäßigen Pins wird
          bevorzugt — und alle Pins darauf bekommen mehr Reichweite. Ein
          schwaches oder inaktives Board bremst nicht nur sich selbst sondern
          zieht den gesamten Account runter.
        </Para>

        <HinweisBox>
          💡 <strong>Tipp:</strong> Prüfe einmal im Monat welche Boards
          wachsen und welche stagnieren. Top Boards zeigen dir wo deine
          Zielgruppe aktiv ist — dort solltest du mehr produzieren.
        </HinweisBox>
      </Accordion>

      <Accordion
        title="Saisonalität & Pinterest-Timing"
        anchorId="saisonalitaet"
      >
        {/* Block 1 — Warum Timing entscheidend ist */}
        <H3>Warum Timing auf Pinterest entscheidend ist</H3>
        <Para>
          Pinterest ist eine Planungsplattform, kein Spontanmedium. Während auf
          Instagram Pins nach 24 Stunden im Feed verschwinden und auf
          Twitter/X nach 15-20 Minuten, hat ein Pinterest-Pin eine Lebensdauer
          von 3-6 Monaten.
        </Para>
        <Para>
          <strong>Pinterest belohnt Vorausschauen, nicht Reaktivität:</strong>{' '}
          Pinterest indexiert neue Pins langsam – etwa 60 Tage bis zur vollen
          Ausspielung. Das gibt dir einen enormen Vorteil: Du kannst Trends
          antizipieren, statt darauf zu reagieren.
        </Para>
        <HinweisBox variant="merke">
          <strong>Die goldene Regel:</strong> Zu früh ist besser als zu spät.
          Ein Pin, der 8 Wochen vor dem Event veröffentlicht wird, hat Zeit
          ausgespielt zu werden. Ein Pin, der eine Woche vorher erscheint,
          kommt nicht mehr rechtzeitig an.
        </HinweisBox>

        {/* Block 2 — Vier Phasen */}
        <H3>Die vier Phasen – wann was passieren soll</H3>
        <Para>
          Pinterest-Saisonalität läuft in vier klar definierten Phasen ab. Das
          Dashboard zeigt dir pro Event, in welcher Phase es gerade ist:
        </Para>
        <Bullets
          items={[
            <>
              <strong>🎬 Jetzt produzieren</strong> — Pins werden erstellt und
              zum Veröffentlichen vorbereitet. Beginnt typischerweise 14-30
              Tage vor dem Pin-Start.
            </>,
            <>
              <strong>📌 Jetzt pinnen</strong> — Pin-Fenster ist offen, neue
              Pins werden veröffentlicht. Das ist die Hauptphase für Pinterest,
              in der Pins indexiert und ausgespielt werden.
            </>,
            <>
              <strong>🚀 Hochphase</strong> — Das Event nähert sich. Keine
              neuen Pins mehr erstellen – Pinterest würde sie nicht mehr
              rechtzeitig ausspielen. Stattdessen bestehende Pins beobachten
              und optimieren.
            </>,
            <>
              <strong>⏳ Noch Zeit</strong> — Event liegt weit in der Zukunft.
              Vormerken, Ideen sammeln, Produktion startet später.
            </>,
          ]}
        />

        {/* Block 3 — Wie das System rechnet + Tabelle */}
        <H3>Wie das System rechnet – und was du eintragen musst</H3>
        <Para>
          Das System berechnet alle Phasen automatisch. Du musst nur zwei Werte
          pflegen:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Event-Datum</strong> (z.B. 14.05.2026 für Muttertag)
            </>,
            <>
              <strong>Suchbeginn-Tage</strong> — wie viele Tage vor dem Event
              sollen Pins live gehen? Diese Zahl steht für jedes Event bereits
              vordefiniert im System (basierend auf Pinterest-Suchverhalten pro
              Eventtyp). Du kannst sie anpassen, aber empfehlenswert ist das
              nicht.
            </>,
          ]}
        />
        <Para>Das System rechnet zusätzlich automatisch:</Para>
        <Bullets
          items={[
            '60 Tage Pinterest-Indexierungszeit',
            '31 Tage Produktionsvorlauf',
            'Phasen-Wechsel (Noch Zeit → Jetzt produzieren → Jetzt pinnen → Hochphase)',
          ]}
        />
        <H4>Vordefinierte Suchbeginn-Tage in diesem System:</H4>
        <Table
          head={['Event', 'Suchbeginn vor Event']}
          rows={[
            ['Valentinstag', '45 Tage'],
            ['Ostern', '60 Tage'],
            ['Muttertag', '45 Tage'],
            ['Vatertag', '45 Tage'],
            ['Halloween', '90 Tage'],
            ['Black Friday', '90 Tage'],
            ['Weihnachten', '90 Tage'],
            ['Silvester / Neujahr', '60 Tage'],
            ['Frühling (saisonal)', '60 Tage'],
            ['Sommer (saisonal)', '60 Tage'],
            ['Herbst (saisonal)', '60 Tage'],
            ['Winter (saisonal)', '60 Tage'],
          ]}
        />

        {/* Block 4 — 70/30-Regel */}
        <H3>70/30-Regel: Evergreen vs. Saisonal</H3>
        <Para>
          Neben saisonalen Inhalten brauchst du Evergreen Content – Inhalte,
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
        <H3>Ganzjähriger Rhythmus – kein Leerlauf zwischen den Saisonen</H3>
        <Para>
          Zwischen den großen Events gibt es immer kleinere Anlässe – und
          immer Evergreen Content, der veröffentlicht werden kann. So sieht
          ein typischer Monats-Überblick aus:
        </Para>
        <CodeBlock>
{`Januar:
→ Laufend pinnen: Neujahr / Vorsätze / Winterthemen
→ Produzieren: Valentinstag / Frühjahrs-Content
→ Analysieren: Weihnachtssaison auswerten

April:
→ Laufend pinnen: Ostern / Frühling / Muttertag-Vorbereitung
→ Produzieren: Sommer-Content / Back-to-School beginnen
→ Analysieren: Q1 Performance prüfen

September:
→ Laufend pinnen: Halloween / Herbst
→ Produzieren: Weihnachten / Neujahr
→ Analysieren: Sommer-Performance auswerten`}
        </CodeBlock>
        <H4>Micro-Seasons als zusätzliche Chance:</H4>
        <Para>
          Neben Hauptsaisons gibt es kleinere Anlässe mit weniger Wettbewerb:
        </Para>
        <Bullets
          items={[
            'Earth Day (April)',
            'Pride Month (Juni)',
            'Mental Health Awareness (Mai/Oktober)',
            'Branchenspezifische Saisons (z.B. „Back-to-School" für Bildungsanbieter)',
          ]}
        />
        <Para>
          Diese Micro-Seasons bieten die Chance, in Zeiträumen mit weniger
          Wettbewerb Sichtbarkeit zu erlangen.
        </Para>

        {/* Block 6 — Pflege */}
        <H3>
          Saisonkalender pflegen – einmal im Jahr für zwei Jahre vorausplanen
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
            'Branchenspezifische Anlässe ergänzen (z.B. eigener Geschäftsstart-Anniversary)',
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
          Welche Saison-Kampagne hat funktioniert, welche nicht? Ohne
          Auswertung wiederholst du jedes Jahr die gleichen Fehler.
        </Para>

        {/* Block 8 — Tool-Block mit Claude-Prompt */}
        <H3>Welche Events sind für DEINE Nische relevant?</H3>
        <Para>
          Nicht jedes Event passt zu jeder Nische. Ein Yoga-Account
          priorisiert andere Saisonen als ein Etsy-Shop für Wohnaccessoires.
          Statt einer Standard-Liste haben wir hier ein KI-gestütztes
          Coaching-Tool: Kopiere den folgenden Prompt in Claude (claude.ai)
          und du erhältst eine personalisierte Saison-Strategie für deine
          Nische.
        </Para>
        <CopyPromptBlock
          title="Welche Events sind für DEINE Nische relevant?"
          prompt={`Ich betreibe einen Pinterest-Account in der Nische [DEINE NISCHE HIER, z.B. "Yoga & Wellness für Selbstständige"]. Mein Ziel ist [DEIN ZIEL, z.B. "Reichweite + E-Mail-Liste aufbauen"]. Mein Hauptangebot ist [DEIN ANGEBOT, z.B. "Online-Yoga-Kurse"].

Bitte erstelle mir eine personalisierte Saison-Strategie für Pinterest mit:

1. Welche 5-8 Hauptsaisons sind für meine Nische besonders relevant?
2. Welche 3-5 Micro-Seasons (kleinere Anlässe) sollte ich beachten?
3. Welche saisonalen Themen kann ich aus meinem Hauptangebot ableiten?
4. Was sind typische Sucheingaben meiner Zielgruppe pro Saison auf Pinterest?
5. Wie viele Wochen vor dem Event sollte ich produzieren / pinnen für jede dieser Saisons?

Berücksichtige Pinterest-Suchverhalten: Nutzer:innen recherchieren 4-12 Wochen vor einem Event. Pinterest-Pins brauchen ca. 60 Tage zur vollen Ausspielung. Hauptevents wie Weihnachten oder Black Friday brauchen 90 Tage Vorlauf, mittlere Events wie Muttertag oder Valentinstag 45 Tage.`}
          steps={
            <div>
              <H4>So gehst du vor:</H4>
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
                <li>Klick auf „Prompt kopieren"</li>
                <li>Öffne claude.ai</li>
                <li>
                  Füge den Prompt ein und ersetze die drei Platzhalter (Nische,
                  Ziel, Angebot) mit deinen Angaben
                </li>
                <li>
                  Du erhältst eine personalisierte Saison-Strategie, die du
                  direkt im Saisonkalender umsetzen kannst
                </li>
              </ol>
            </div>
          }
        />
      </Accordion>

      <Accordion title="Recycling – eingeschlafene Gewinner neu aufsetzen">
        <Para>
          Pins, die früher gut performt haben, aber eingeschlafen sind,
          brauchen keinen neuen Content – nur einen neuen Impuls. Neues
          Design, aktualisierter Hook, aktuelle Keywords – gleiches bewiesenes
          Thema.
        </Para>
        <Para>
          Das ist dein effizientester Hebel: Du weißt bereits, dass das Thema
          funktioniert. Du startest nicht bei null.
        </Para>
        <Para>
          „Bestehende Pins optimieren" im Dashboard zeigt dir automatisch,
          welche Pins recycelt werden sollten (Kategorie „Eingeschlafener
          Gewinner").
        </Para>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 3 — Die drei Strategien
// ===========================================================

function TabStrategien() {
  return (
    <div className="space-y-3">
      <Accordion title="Warum eine Strategie wichtig ist">
        <Para>
          Die meisten Menschen, die Pinterest für ihr Business nutzen, machen
          denselben Fehler: Sie pinnen fleißig – aber ohne klares Ziel. Sie
          produzieren Inhalte, weil sie glauben, mehr Pins = mehr Reichweite.
          Das stimmt nicht.
        </Para>
        <Para>
          Pinterest belohnt keine reine, unregelmäßige Aktivität. Pinterest
          belohnt <strong>Relevanz</strong> und <strong>Konsistenz</strong>.
        </Para>
        <Para>
          Relevanz entsteht nicht durch Zufall – sie entsteht durch eine klare
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
          Wer ohne Strategie pinnt, verschwendet Zeit. Wer mit Strategie pinnt,
          baut ein System, das auch arbeitet, wenn er schläft.
        </Para>
      </Accordion>

      <Accordion title="Die drei Strategien im Detail">
        <Para>
          Es gibt genau drei Wege, wie Pinterest-Traffic zu Ergebnissen für
          dein Business wird. Alles andere ist eine Variation davon.
        </Para>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <H3>📝 Blog- / Content-Strategie → Traffic als Ziel</H3>
          <div className="mt-2 space-y-2 text-sm text-gray-700">
            <p>
              Der Pin führt zu deinem eigenen Inhalt – einem Blogbeitrag,
              einer Rezeptseite, einem Guide oder einer anderen Seite auf
              deiner Website.
            </p>
            <p>
              <strong>Der Kerngedanke:</strong> Erst Vertrauen aufbauen, dann
              konvertieren.
            </p>
            <p>
              Was auf dieser Seite passiert, ist offen – dort kannst du
              Affiliate-Links haben, ein Opt-in-Formular oder einfach nur
              wertvolle Informationen. Das ändert nichts an der
              Strategie-Klassifizierung.
            </p>
            <H4>Wann sinnvoll:</H4>
            <Bullets
              items={[
                'Du monetarisierst deinen Blog über Werbeanzeigen',
                'Du möchtest deine E-Mail-Liste aufbauen',
                'Du möchtest Vertrauen aufbauen, bevor du etwas verkaufst',
              ]}
            />
            <p>
              <strong>Typische Conversion-Ziele:</strong> Seitenaufrufe,
              Newsletter-Anmeldungen, Verweildauer
            </p>
          </div>
        </div>

        <div className="rounded-md border border-pink-200 bg-pink-50 p-4">
          <H3>🔗 Affiliate-Strategie (direkt) → Empfehlungen als Einnahmequelle</H3>
          <div className="mt-2 space-y-2 text-sm text-gray-700">
            <p>
              Der Pin führt direkt zur Produktseite eines Affiliate-Partners –
              ohne dass deine Website dazwischenliegt.
            </p>
            <p className="text-amber-800">
              ⚠️ <strong>Wichtig:</strong> Pinterest erlaubt direkte
              Affiliate-Links – aber sie müssen als solche gekennzeichnet sein.
              Prüfe die Bedingungen deines Affiliate-Programms.
            </p>
            <H4>Wann sinnvoll:</H4>
            <Bullets
              items={[
                'Der Pin führt direkt zu einem Affiliate-Produkt ohne deine Website',
                'Du möchtest den schnellsten Weg vom Pin zum Kauf',
                'Das Produkt lässt sich visuell gut kommunizieren',
              ]}
            />
            <p>
              <strong>Typische Conversion-Ziele:</strong> Klicks auf
              Affiliate-Links, Käufe, Provisionen
            </p>
          </div>
        </div>

        <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
          <H3>🛍️ Produkt-Strategie → Direktverkauf als Ziel</H3>
          <div className="mt-2 space-y-2 text-sm text-gray-700">
            <p>
              Der Pin führt direkt zu deinem eigenen Produkt – einem digitalen
              Download, einem Kurs, einem physischen Produkt oder einer
              Buchungsseite.
            </p>
            <H4>Wann sinnvoll:</H4>
            <Bullets
              items={[
                'Du hast eigene Produkte (physisch, digital oder Kurse)',
                'Du kannst den Wert deines Produkts visuell kommunizieren',
              ]}
            />
            <p>
              <strong>Typische Conversion-Ziele:</strong> Produktseitenaufrufe,
              Käufe, Umsatz
            </p>
          </div>
        </div>

        <HinweisBox variant="merke">
          💡 <strong>Die wichtigste Regel:</strong> Ein Pin – eine Strategie.
          Entscheide beim Erstellen jedes Pins bewusst, wohin der Traffic
          fließen soll.
        </HinweisBox>
      </Accordion>

      <Accordion title="Conversion-Ziele – Traffic, Lead, Sales">
        <Para>Drei Stufen, die aufeinander aufbauen:</Para>
        <CodeBlock>
{`Traffic   →   Lead   →   Sales
   ↓          ↓         ↓
Besucher   Kontakt    Kunde`}
        </CodeBlock>
        <Para>
          <strong>👁️ TRAFFIC</strong> – Jemand klickt auf deinen Pin und
          besucht deine Seite. Grundlage für alles weitere.
          <br />
          <span className="text-gray-500">
            Gemessen in: Seitenaufrufe, Sessions, Verweildauer
          </span>
        </Para>
        <Para>
          <strong>📧 LEAD</strong> – Jemand gibt dir seine E-Mail-Adresse.
          Direkter Kontakt unabhängig von Pinterest.
          <br />
          <span className="text-gray-500">
            Gemessen in: Newsletter-Anmeldungen, Freebie-Downloads
          </span>
        </Para>
        <Para>
          <strong>💰 SALES</strong> – Jemand kauft etwas: dein Produkt oder
          ein Affiliate-Produkt.
          <br />
          <span className="text-gray-500">
            Gemessen in: Käufe, Umsatz, Provisionen
          </span>
        </Para>
        <Table
          head={['Pin-Typ', 'Strategie', 'Conversion-Ziel']}
          rows={[
            ['Blogbeitrag mit Tipps', 'Content', 'Traffic'],
            ['Blogbeitrag mit Freebie-Anmeldung', 'Content', 'Lead'],
            [
              'Blogbeitrag mit Affiliate-Links',
              'Content',
              'Sales (indirekt)',
            ],
            ['Direkter Affiliate-Link', 'Affiliate', 'Sales (direkt)'],
            ['Eigene Produktseite', 'Produkt', 'Sales'],
            ['Kurs-Warteliste / Lead-Magnet', 'Produkt', 'Lead'],
          ]}
        />
        <HinweisBox variant="merke">
          💡 Traffic ist Aufmerksamkeit. Leads sind Beziehungen. Sales sind
          Vertrauen, das sich ausgezahlt hat.
        </HinweisBox>
      </Accordion>

      <Accordion title="Strategien kombinieren">
        <Para>
          Die meisten erfolgreichen Accounts kombinieren zwei oder drei
          Strategien – aber mit klarer Gewichtung:
        </Para>
        <CodeBlock>
{`60% Blog-Traffic   →   Reichweite und E-Mail-Liste
30% Affiliate      →   Passive Einnahmen
10% Produkt        →   Direktverkauf`}
        </CodeBlock>
        <Para>
          Der Schlüssel ist <strong>bewusste Gewichtung</strong>. Wer 33% auf
          alles setzt, verliert den Fokus.
        </Para>
        <Para>
          <strong>Wichtig:</strong> Affiliate-Links können sowohl direkt als
          Pin als auch indirekt über Blogbeiträge platziert werden. Beides ist
          legitim und kann parallel laufen:
        </Para>
        <Bullets
          items={[
            'Affiliate über Blog → zählt zur Blog/Content-Strategie (mit Conversion-Ziel Sales indirekt)',
            'Affiliate direkt als Pin-Link → zählt zur Affiliate-Strategie (mit Conversion-Ziel Sales direkt)',
          ]}
        />
        <H4>Wie du deine Gewichtung findest:</H4>
        <Bullets
          items={[
            'Was bringt mir heute schon Ergebnisse? → Dort mehr investieren',
            'Was will ich langfristig aufbauen? → Dort kontinuierlich investieren',
            'Was passt zu meinen Stärken und meinem Business?',
          ]}
        />
      </Accordion>

      <Accordion title="Welche Strategie für welches Business">
        <Table
          head={['Business-Modell', 'Empfohlene Strategie']}
          rows={[
            ['Blog mit Werbeanzeigen', 'Blog 80% + Affiliate 20%'],
            ['Online-Kurs-Anbieter', 'Produkt 60% + Blog 40%'],
            ['Affiliate-Marketer', 'Affiliate 70% + Blog 30%'],
            ['Physischer Shop', 'Produkt 80% + Blog 20%'],
            ['Coach / Berater', 'Blog 50% + Produkt 50%'],
            [
              'Content-Creator mit Mix',
              'Blog 50% + Affiliate 30% + Produkt 20%',
            ],
            [
              'Affiliate über Blog + eigene Produkte',
              'Blog 60% + Affiliate 20% + Produkt 20%',
            ],
          ]}
        />
      </Accordion>

      <Accordion title="Deine Strategie definieren – die fünf Fragen">
        <Para>
          Beantworte diese fünf Fragen, bevor du mit Pinterest startest:
        </Para>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            <strong>Was ist mein primäres Business-Ziel?</strong>
            <br />
            <span className="text-gray-600">
              Umsatz? Reichweite? E-Mail-Liste?
            </span>
          </li>
          <li>
            <strong>Wen spreche ich an?</strong>
            <br />
            <span className="text-gray-600">
              Beschreibe deine Wunschkundin konkret – Alter, Interessen,
              Probleme, Wünsche.
            </span>
          </li>
          <li>
            <strong>Welche Inhalte habe ich schon?</strong>
            <br />
            <span className="text-gray-600">
              Blogbeiträge, Produkte, Affiliate-Partnerschaften – was kann
              sofort bepinnt werden?
            </span>
          </li>
          <li>
            <strong>Was fehlt noch?</strong>
            <br />
            <span className="text-gray-600">
              Welche Inhalte brauchst du noch?
            </span>
          </li>
          <li>
            <strong>Wie messe ich Erfolg?</strong>
            <br />
            <span className="text-gray-600">
              Nicht „mehr Follower" – sondern konkret: „500 monatliche
              Website-Besucher aus Pinterest" oder „3 Affiliate-Verkäufe pro
              Monat".
            </span>
          </li>
        </ol>
        <HinweisBox variant="merke">
          💡 Eine mittelmäßige Strategie konsequent umgesetzt schlägt eine
          perfekte Strategie, die nie umgesetzt wird.
        </HinweisBox>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 4 — Pin-Design & Formate
// ===========================================================

function TabDesign() {
  return (
    <div className="space-y-3">
      <Accordion title="Pin-Formate">
        <Para>
          Pinterest belohnt Accounts, die verschiedene Formate nutzen.
        </Para>

        <div>
          <H3>📌 Standard Pin</H3>
          <Para>
            Langlebig, SEO-stark, wird über Monate und Jahre ausgespielt.
            Ideal für Evergreen-Content.
          </Para>
        </div>

        <div>
          <H3>🎬 Video Pin</H3>
          <Para>
            Höhere Impressionen und mehr Reichweite. Kein direkter
            Traffic-Treiber – Nutzer schauen, klicken aber seltener.
          </Para>
        </div>

        <div>
          <H3>🖼️ Collage Pin</H3>
          <Para>
            Visuell auffällig – ideal für Vorher/Nachher, Produktvergleiche
            oder Inspiration.
          </Para>
        </div>

        <div>
          <H3>🎠 Carousel Pin</H3>
          <Para>
            Höchste Interaktionsrate – jeder Swipe ist ein Signal an
            Pinterest. Ideal für Schritt-für-Schritt-Inhalte.
          </Para>
        </div>

        <div>
          <H3>💡 Idea Pin</H3>
          <Para>
            Kein direkter Link möglich – kein Traffic. Aber maximale
            Reichweite und Bekanntheit.
          </Para>
          <Para>
            <span className="text-amber-700">
              ⚠️ Für Traffic-Ziele nicht geeignet. Nur für Reichweite und
              Markenbekanntheit einsetzen.
            </span>
          </Para>
        </div>

        <div>
          <H3>🛍️ Shopping Pin</H3>
          <Para>
            Direktverkauf mit Preisanzeige im Pin. Nur mit verifiziertem
            Händler-Account und Produktkatalog möglich.
          </Para>
          <Para>
            <span className="text-amber-700">
              ⚠️ Für Blog- und Affiliate-Strategien nicht relevant.
            </span>
          </Para>
        </div>

        <H4>Empfohlene Verteilung:</H4>
        <Bullets
          items={[
            '60% Standard Pins → SEO-Fundament aufbauen',
            '20% Video Pins → Reichweite steigern',
            '10% Collage Pins → visuelle Abwechslung',
            '10% Carousel Pins → Interaktion fördern',
          ]}
        />

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Fange klein an – aber fange an. Ein
          Video-Pin pro Monat ist besser als keiner.
        </HinweisBox>
      </Accordion>

      <Accordion title="Pin-Design-Grundlagen">
        <Para>
          Ein Pin hat genau eine Sekunde, um Aufmerksamkeit zu gewinnen. In
          dieser einen Sekunde entscheidet der Nutzer, ob er scrollt oder
          klickt.
        </Para>
        <H4>Technische Grundlagen:</H4>
        <Bullets
          items={[
            'Optimales Format: Hochformat 1000 × 1500 Pixel (Verhältnis 2:3)',
            'Breitere Pins werden abgeschnitten',
            'Quadratische Pins performen deutlich schlechter',
            'Maximale Dateigröße: 20 MB',
          ]}
        />
        <H4>Warum Hochformat:</H4>
        <Para>
          Pinterest ist eine mobile Plattform – über 80% der Nutzer scrollen
          auf dem Smartphone. Hochformat füllt den Screen.
        </Para>
      </Accordion>

      <Accordion title="Die 6 psychologischen Trigger für mehr Klicks">
        <Para>
          Der beste Hook ist wertlos, wenn niemand klickt. Diese sechs Trigger
          erhöhen deine CTR nachweislich:
        </Para>

        <div>
          <H3>1. Neugier-Lücke</H3>
          <Para>
            Der Pin verspricht eine Antwort, ohne sie zu verraten. Der Nutzer
            muss klicken, um sie zu bekommen.
          </Para>
          <Para>
            <em>Beispiel:</em> „Der Fehler, den 90% bei der Gartengestaltung
            machen"
          </Para>
        </div>

        <div>
          <H3>2. Konkreter Nutzen / Transformation</H3>
          <Para>
            Was genau bekomme ich, wenn ich klicke? Sei so spezifisch wie
            möglich.
          </Para>
          <Para>
            <em>Beispiel:</em> „So richtest du deinen Arbeitsplatz für unter
            100€ ein"
          </Para>
        </div>

        <div>
          <H3>3. Zahlen und Listen</H3>
          <Para>
            Zahlen im Hook erhöhen die CTR nachweislich um 20-30%.
          </Para>
          <Para>
            <em>Beispiel:</em> „7 Fehler" schlägt „Fehler beim..." immer
          </Para>
        </div>

        <div>
          <H3>4. Problemlösung</H3>
          <Para>Sprich einen konkreten Schmerzpunkt direkt an.</Para>
          <Para>
            <em>Beispiel:</em> „Nie wieder unordentliche Schubladen"
          </Para>
        </div>

        <div>
          <H3>5. Dringlichkeit und Exklusivität</H3>
          <Para>
            <em>Beispiel:</em> „Das weiß kaum jemand" oder „Noch heute
            umsetzen"
          </Para>
        </div>

        <div>
          <H3>6. Visueller Kontrast</H3>
          <Para>
            Ein Pin, der im Feed auffällt, bekommt mehr Klicks – unabhängig
            vom Text. Helle Bilder in einem dunklen Feed. Minimalismus
            zwischen visuell überladenen Pins.
          </Para>
        </div>
      </Accordion>

      <Accordion title="Hook vs. Titel – der Unterschied">
        <Para>
          Viele verwechseln Hook und Titel. Dabei sind es zwei verschiedene
          Dinge mit verschiedenen Aufgaben.
        </Para>
        <Para>
          <strong>HOOK</strong> = Text auf dem Pin-Bild. Wird im Feed gesehen,
          bevor der Pin angeklickt wird. Aufgabe: den Klick sichern.
        </Para>
        <Para>
          <strong>TITEL</strong> = SEO-Text unter dem Pin. Wird von Pinterest
          für die Suche genutzt. Aufgabe: gefunden werden + Klick bestätigen.
        </Para>
        <Table
          head={['Aspekt', 'Hook (auf dem Bild)', 'Titel (SEO-Text)']}
          rows={[
            [
              'Wo sichtbar',
              'Im Feed auf dem Bild',
              'Unter dem Pin / in Suche',
            ],
            [
              'Hauptaufgabe',
              'Aufmerksamkeit + Klick',
              'SEO + Relevanz bestätigen',
            ],
            ['Länge', 'Max. 6-8 Wörter', 'Max. 100 Zeichen'],
            ['Keywords', 'Optional, aber sinnvoll', 'Pflicht – ganz vorne'],
            ['Ton', 'Emotional / neugierig', 'Klar / informativ'],
          ]}
        />
        <HinweisBox variant="merke">
          Das Bild ist der Köder – der Hook ist der Haken.
        </HinweisBox>
      </Accordion>

      <Accordion title="Signalwörter – warum sie funktionieren">
        <Para>
          Signalwörter sind Wörter, die beim Leser sofort eine emotionale oder
          rationale Reaktion auslösen – Neugier, Dringlichkeit, Vertrauen oder
          den Wunsch nach einer Lösung.
        </Para>
        <Table
          head={['Ohne Signalwort', 'Mit Signalwort']}
          rows={[
            [
              'Leckeres Abendessen',
              'Schnelles 20-Minuten-Abendessen – perfekt für Anfänger',
            ],
            [
              'Zimmerdeko',
              'Geniale Deko-Hacks, um dein Zimmer sofort zu verschönern',
            ],
            [
              'Garten-Tipps',
              '5 Fehler, die du im Garten sofort vermeiden solltest',
            ],
            [
              'Rezept-Idee',
              'Das einfachste Rezept für gemütliche Abende zu Hause',
            ],
          ]}
        />
        <Para>
          Ein einzelnes Keyword ist gut – die Kombination macht den
          Unterschied:
        </Para>
        <CodeBlock>
{`Keyword + Zahl + Signalwort + konkreter Nutzen = viraler Hook`}
        </CodeBlock>
        <H4>Beispiel:</H4>
        <CodeBlock>
{`"Garten" + "5" + "geniale" + "Ideen für kleine Balkone"
= "5 geniale Garten-Ideen für kleine Balkone"`}
        </CodeBlock>
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
      </Accordion>

      <Accordion title="Pinterest Bild-Regel">
        <Table
          head={['Kombination', 'Erlaubt', 'Empfehlung']}
          rows={[
            ['Gleiches Bild + gleiche URL', 'Einmalig', 'Nicht wiederholen'],
            [
              'Gleiches Bild + verschiedenes Design',
              '2-3 Mal',
              'Mit 14+ Tagen Abstand',
            ],
            [
              'Verschiedenes Bild + gleiche URL',
              'Unbegrenzt',
              'Optimal',
            ],
            [
              'Verschiedenes Bild + verschiedenes Design',
              'Unbegrenzt',
              'Beste Strategie',
            ],
          ]}
        />
        <H4>Praktische Konsequenz:</H4>
        <Para>
          Pro Blogbeitrag oder Zielseite mindestens 3-5 verschiedene
          Pin-Designs erstellen.
        </Para>
        <H4>Was „verschiedenes Design" bedeutet:</H4>
        <Bullets
          items={[
            'Anderer Hook-Text',
            'Andere Hintergrundfarbe',
            'Anderes Bild, aber gleiches Thema',
            'Anderes Layout',
            'Anderes Format (Standard vs. Collage)',
          ]}
        />
      </Accordion>

      <Accordion title="Die 5 Design-Prinzipien">
        <div>
          <H3>1. Kontrast ist König</H3>
          <Para>
            Hoher Kontrast zwischen Text und Hintergrund ist Pflicht.
          </Para>
          <Bullets
            items={[
              '✅ Dunkler Text auf hellem Hintergrund',
              '✅ Heller Text auf dunklem Hintergrund',
              '❌ Grauer Text auf weißem Hintergrund',
              '❌ Ähnliche Farbtöne ohne Kontrast',
            ]}
          />
        </div>

        <div>
          <H3>2. Headline – Platzierung und Größe</H3>
          <Bullets
            items={[
              'Oberes Drittel → beste Performance',
              'Mindestens 40-60px Schriftgröße',
              'Maximal 6-8 Wörter',
              'Unteres Drittel vermeiden – wird oft abgeschnitten',
            ]}
          />
        </div>

        <div>
          <H3>3. Weniger ist mehr</H3>
          <Bullets
            items={[
              'Maximal 2 Schriftarten pro Pin',
              'Maximal 3 Farben pro Pin',
              'Eine klare Bildaussage',
              'Viel Weißraum',
            ]}
          />
        </div>

        <div>
          <H3>4. Eigenes Branding</H3>
          <Para>
            Konsistentes Branding macht deinen Account unverwechselbar:
          </Para>
          <Bullets
            items={[
              'Feste Farbpalette – 2-3 Hauptfarben',
              'Feste Schriftarten – maximal 2',
              'Logo oder Website-URL klein, aber sichtbar',
              'Konsistenter Stil',
            ]}
          />
        </div>

        <div>
          <H3>5. Das Bild – emotional und relevant</H3>
          <Bullets
            items={[
              'Emotion erkennbar – Menschen, die etwas erleben',
              'Thematisch relevant – passend zum Hook',
              'Hell und klar – keine dunklen oder unscharfen Bilder',
              'Hochformat zwingend',
            ]}
          />
        </div>
      </Accordion>

      <Accordion title="Effiziente Pin-Produktion">
        <Para>Drei Wege, um Pins effizient zu produzieren:</Para>

        <div>
          <H3>Weg 1 – Canva mit eigenen Vorlagen (für Einsteiger)</H3>
          <CodeBlock>
{`Vorlage öffnen
   → duplizieren
   → Bild austauschen
   → Hook-Text einfügen
   → Exportieren

→ 1 Pin in unter 5 Minuten`}
          </CodeBlock>
        </div>

        <div>
          <H3>Weg 2 – KI-Bild + Canva (für Fortgeschrittene)</H3>
          <CodeBlock>
{`KI-Prompt formulieren
   → Bild in Midjourney / DALL-E / Adobe Firefly generieren
   → In Canva-Vorlage importieren
   → Hook einfügen

→ Einzigartiger Pin`}
          </CodeBlock>
        </div>

        <div>
          <H3>Weg 3 – Vollständig KI (für Experimentierfreudige)</H3>
          <CodeBlock>
{`Foto + Prompt zu KI-Tool
   → Fertiger Pin wird direkt ausgegeben

→ Kein Canva nötig`}
          </CodeBlock>
        </div>

        <H4>Empfohlene KI-Tools:</H4>
        <Bullets
          items={[
            'Midjourney → beste Bildqualität',
            'Adobe Firefly → in Adobe Express integriert',
            'DALL-E / ChatGPT → einfachste Handhabung',
            'Canva Magic Studio → direkt in Canva integriert',
          ]}
        />

        <H4>Der monatliche Produktionstag:</H4>
        <Para>Vorbereitung (einmalig, 2-3 Stunden):</Para>
        <Bullets
          items={[
            'Brand-Farben und Schriften definieren',
            '3-5 Canva-Vorlagen erstellen',
            'KI-Bild-Prompts für Hauptthemen formulieren',
          ]}
        />
        <Para>Monatlicher Produktionstag (4-6 Stunden):</Para>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>„Neue Pins produzieren" öffnen → welche Themen stehen an?</li>
          <li>Hook, Titel, Beschreibung erstellen</li>
          <li>KI-Bilder für neue Themen generieren</li>
          <li>Canva öffnen → Vorlagen befüllen</li>
          <li>Alle Pins exportieren</li>
          <li>In Tailwind hochladen und einplanen</li>
          <li>Geplante Veröffentlichungsdaten in der App eintragen</li>
        </ol>
        <Para>
          <strong>Ergebnis:</strong> 30-50 Pins für einen ganzen Monat in
          4-6 Stunden.
        </Para>
        <HinweisBox variant="merke">
          💡 Vorlagen und Systeme sind keine Abkürzung – sie sind die
          Voraussetzung dafür, dass Pinterest-Marketing nachhaltig
          funktioniert. Wer jeden Pin von Grund auf neu erstellt, verliert
          nach 3 Monaten die Motivation. Wer mit Systemen arbeitet, pinnt noch
          in 3 Jahren.
        </HinweisBox>
      </Accordion>

      <Accordion title="Pin-Felder optimal ausfüllen — Zeichenlimits & Best Practices">
        <Para>
          Jedes Feld beim Pin-Upload wird von Pinterest als SEO-Signal
          gewertet. Hier sind die wichtigsten Regeln:
        </Para>

        <div>
          <H4>Pinnwand-Titel</H4>
          <Para>
            Pinterest-Kategorienamen oder meist gesuchte Keywords verwenden.
            Klar und thematisch eindeutig — kein kreativer Name der nichts
            aussagt.
          </Para>
        </div>

        <div>
          <H4>Pinnwand-Beschreibung</H4>
          <Para>
            500 Zeichen. Kurze Beschreibung des Themas + beste gesuchte
            Longtail-Keywords. Natürlich formuliert, nicht keyword-gestopft.
          </Para>
        </div>

        <div>
          <H4>Pin-Titel</H4>
          <Para>
            100 Zeichen. Die ersten 30–35 werden im Feed angezeigt — das
            Haupt-Keyword gehört ganz an den Anfang. Kombiniere Keyword +
            Signalwort + konkreten Nutzen.
          </Para>
        </div>

        <div>
          <H4>Pin-Beschreibung</H4>
          <Para>
            500 Zeichen. Mehrere relevante Keywords natürlich einbauen. Immer
            mit einer Call-to-Action enden („Jetzt lesen", „Hier klicken",
            „Mehr erfahren").
          </Para>
        </div>

        <div>
          <H4>Alt Text</H4>
          <Para>
            500 Zeichen. Hochgesuchte, relevante Keywords. Beschreibt was auf
            dem Bild zu sehen ist — kombiniert mit dem Thema des Pins.
          </Para>
        </div>

        <div>
          <H4>URL</H4>
          <Para>
            Pinterest liest auch die URL nach Keywords. Sprechende URLs sind
            stärker als generische („soulfulspace.de/yoga-morgenroutine"
            stärker als „soulfulspace.de/post-47").
          </Para>
        </div>

        <div>
          <H4>Pin-Bild & Dateiname</H4>
          <Bullets
            items={[
              'Bilddatei vor dem Upload umbenennen: nicht „IMG_1234.jpg" sondern „yoga-matte-aufbewahren-tipps.jpg"',
              'Pinterest liest den Text auf dem Bild (OCR) — der Hook auf dem Pin wird als SEO-Signal gewertet',
              'Hochauflösend, hell, klar — das Motiv und der Text müssen sofort erkennbar sein',
            ]}
          />
        </div>

        <H4>Ranking der Felder nach Wichtigkeit:</H4>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Pin-Titel</li>
          <li>Pin-Beschreibung</li>
          <li>URL</li>
          <li>Pinnwand-Name</li>
          <li>Pinnwand-Beschreibung</li>
          <li>Website-Titel & Meta-Beschreibung</li>
          <li>Bild & Bildqualität (inkl. OCR)</li>
          <li>Pin-Kohärenz (alle Felder passen thematisch zusammen)</li>
          <li>Pin-Engagement</li>
        </ol>

        <HinweisBox>
          💡 <strong>Tipp:</strong> Listen, Checklisten und Infografiken
          werden am häufigsten geklickt und gespeichert — sie sind ideal für
          hohe Engagement Rate.
        </HinweisBox>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 5 — Keywords & SEO
// ===========================================================

function TabKeywords() {
  return (
    <div className="space-y-3">
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Keywords sind das Fundament deiner gesamten Reichweite auf Pinterest.
        Pinterest ist eine visuelle Suchmaschine — wer die Sprache seiner
        Zielgruppe kennt und konsequent einsetzt wird ausgespielt. Wer
        generisch schreibt verschwindet in der Masse.
      </p>

      <Accordion title="Warum Pinterest-Keywords anders funktionieren als bei Google">
        <Para>
          Pinterest ist keine Suchmaschine im klassischen Sinne — es ist
          eine visuelle Suchmaschine. Das verändert alles.
        </Para>
        <Para>
          Wenn jemand bei Google sucht will er eine Antwort auf eine Frage.
          Wenn jemand bei Pinterest sucht sucht er Inspiration, Ideen und
          Lösungen — oft ohne genau zu wissen was er sucht. Das bedeutet:
          Pinterest-Nutzer tippen andere Begriffe ein als Google-Nutzer.
        </Para>

        <H4>Ein Beispiel:</H4>
        <Para>
          Bei Google sucht jemand „schnelle vegane Rezepte unter 30 Minuten
          Anleitung". Bei Pinterest tippt dieselbe Person eher „schnelle
          vegane Abendessen" oder „gesund kochen vegan einfach". Kürzer.
          Visueller. Inspirationsgetrieben.
        </Para>

        <H4>Was das für dich bedeutet:</H4>
        <Para>
          Pinterest belohnt Pins die exakt die Sprache der Nutzer sprechen.
          Der Algorithmus liest deinen Pin-Titel, deine Beschreibung, deinen
          Board-Namen und sogar den Text auf deinem Bild — und entscheidet
          dann wem er deinen Pin zeigt.
        </Para>
        <Para>
          Wer die richtigen Keywords verwendet wird ausgespielt. Wer
          generisch schreibt verschwindet in der Masse.
        </Para>

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Keywords auf Pinterest sind nicht
          optional. Sie sind das Fundament deiner gesamten Reichweite.
        </HinweisBox>
      </Accordion>

      <Accordion title="Die drei Keyword-Typen — und wann du welchen einsetzt">
        <Para>
          Nicht alle Keywords sind gleich. Je nachdem wie spezifisch ein
          Keyword ist hat es unterschiedliche Stärken und Schwächen.
        </Para>

        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <H3>🔴 Haupt-Keywords — breite Reichweite, hohe Konkurrenz</H3>
          <Para>
            Bestehen aus einem einzigen Wort oder einem sehr allgemeinen
            Begriff.
          </Para>
          <Para>
            <em>Beispiele:</em> „Outfit", „Rezept",
            „Persönlichkeitsentwicklung", „Handmade"
          </Para>
          <Para>
            Hohes Suchvolumen — aber auch viel Konkurrenz. Haupt-Keywords
            gehören immer in den Titel — möglichst ganz am Anfang. Sie
            signalisieren Pinterest das übergeordnete Thema.
          </Para>
        </div>

        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <H3>🟡 Mid-Tail Keywords — die goldene Mitte</H3>
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

        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <H3>🟢 Longtail Keywords — hohe Conversion</H3>
          <Para>Bestehen aus vier oder mehr Wörtern.</Para>
          <Para>
            <em>Beispiele:</em> „Outfit Herbst Frauen 40 casual", „schnelle
            vegane Rezepte unter 30 Minuten", „Selbstvertrauen stärken nach
            Trennung Tipps", „Yoga Retreat Österreich Wellness Hotel Alpen"
          </Para>
          <Para>
            Wenig Suchvolumen — aber wer danach sucht weiß genau was er
            will. Die Klickwahrscheinlichkeit ist deutlich höher als bei
            breiten Keywords. Longtail Keywords gehören in die Beschreibung
            — als natürlicher Satz formuliert, niemals als bloße
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
              in unter 20 Minuten fertig — einfach, gesund und perfekt für
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

      <Accordion title="Keywords recherchieren — die Autocomplete-Methode">
        <Para>
          Die beste Keyword-Quelle für Pinterest ist Pinterest selbst. Der
          Grund: Pinterest zeigt dir direkt was seine Nutzer suchen — in
          Echtzeit.
        </Para>

        <div>
          <H4>Schritt 1 — Haupt-Keyword eingeben</H4>
          <Para>
            Öffne Pinterest und tippe dein Thema in die Suchleiste. Zum
            Beispiel „Mode". Drücke noch nicht Enter — schau was Pinterest
            dir vorschlägt. Diese Vorschläge sind deine Haupt- und Mid-Tail
            Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 2 — Farbige Blöcke beachten</H4>
          <Para>
            Direkt unter der Suchleiste erscheinen farbige Keyword-Blöcke.
            Diese zeigen die beliebtesten Unterthemen zu deinem
            Haupt-Keyword. Klicke darauf und notiere die Kombinationen — das
            sind wertvolle Mid-Tail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 3 — Spezifischer werden</H4>
          <Para>
            Tippe dein Haupt-Keyword und füge einen Buchstaben hinzu. Aus
            „Mode" wird „Mode H" — Pinterest zeigt dir jetzt spezifischere
            Begriffe wie „Mode Herbst", „Mode Herbst Frauen 40", „Mode
            Herbst casual". Das sind deine Mid-Tail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 4 — Longtail Keywords finden</H4>
          <Para>
            Tippe eine vollständige Phrase wie „Outfit Herbst Frauen" —
            Pinterest zeigt dir noch spezifischere Varianten. Das sind deine
            Longtail Keywords.
          </Para>
        </div>

        <div>
          <H4>Schritt 5 — In die Keyword-Datenbank eintragen</H4>
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
          Zusätzlich alle 3 Monate eine neue Recherche —
          Pinterest-Suchtrends ändern sich und neue Keywords tauchen auf.
        </Para>
      </Accordion>

      <Accordion title="Keywords überall einsetzen — nicht nur im Titel">
        <Para>
          Ein häufiger Fehler: Keywords werden nur in Titel und Beschreibung
          eingesetzt. Aber Pinterest liest an viel mehr Stellen:
        </Para>

        <div>
          <H4>Pin-Titel (max. 100 Zeichen)</H4>
          <Para>
            Haupt-Keyword ganz an den Anfang. Die ersten 30–35 Zeichen
            erscheinen im Feed — alles danach wird abgeschnitten.
          </Para>
        </div>

        <div>
          <H4>Pin-Beschreibung (max. 500 Zeichen)</H4>
          <Para>
            Mid-Tail und Longtail Keywords natürlich integriert. Immer mit
            Call-to-Action enden.
          </Para>
        </div>

        <div>
          <H4>Alt Text (max. 500 Zeichen)</H4>
          <Para>
            Wird von Pinterest als SEO-Signal gewertet. Beschreibe das Bild
            UND das Thema. Wichtigste Keywords natürlich integrieren.
          </Para>
        </div>

        <div>
          <H4>Bilddateiname</H4>
          <Para>
            Bevor du ein Bild hochlädst — benenne die Datei mit Keywords:
          </Para>
          <Bullets
            items={[
              '❌ „IMG_1234.jpg"',
              '✅ „schnelle-vegane-rezepte-abendessen.jpg"',
            ]}
          />
          <Para>
            Pinterest liest den Dateinamen als zusätzliches Keyword-Signal.
          </Para>
        </div>

        <div>
          <H4>OCR — Text auf dem Bild</H4>
          <Para>
            Pinterest kann Text auf Bildern lesen (Optical Character
            Recognition). Der Hook-Text auf deinem Pin-Bild wird als
            Keyword-Signal gewertet. Nutze das bewusst — Haupt-Keyword im
            Hook-Text verwenden, gut lesbar mit hohem Kontrast.
          </Para>
        </div>

        <div>
          <H4>URL der Zielseite</H4>
          <Para>Pinterest crawlt die URL deiner Zielseite. Sprechende URLs sind stärker:</Para>
          <Bullets
            items={[
              '❌ „meinblog.de/p=123"',
              '✅ „meinblog.de/schnelle-vegane-rezepte"',
            ]}
          />
        </div>

        <div>
          <H4>Board-Name und Board-Beschreibung</H4>
          <Para>
            Pinterest liest auch den Board-Namen und die Board-Beschreibung
            auf dem der Pin gespeichert ist — als thematisches
            Kontext-Signal. Ein Pin über „Yogaraum gestalten" auf einem
            Board namens „Yoga zuhause: Yogaraum gestalten & einrichten"
            bekommt ein doppeltes SEO-Signal. Details dazu im Accordion →
            Board-Keywords weiter unten auf dieser Seite.
          </Para>
        </div>

        <div>
          <H4>Website Meta-Daten</H4>
          <Para>
            Pinterest liest auch den Seitentitel und die Meta-Beschreibung
            deiner Zielseite. Stelle sicher dass beide relevante Keywords
            enthalten.
          </Para>
        </div>

        <HinweisBox>
          💡 Der Pin-Erstellungs-Prompt in →{' '}
          <Link
            href="/dashboard/wissen-prompts"
            className="text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Wissen & Prompts
          </Link>{' '}
          berücksichtigt Titel, Beschreibung und Keywords automatisch. Alt
          Text und Dateiname musst du manuell ergänzen.
        </HinweisBox>
      </Accordion>

      <Accordion title="Wie viele Keywords pro Pin — und warum weniger mehr ist">
        <Para>
          Ein häufiger Anfängerfehler: So viele Keywords wie möglich in
          einen Pin stopfen in der Hoffnung dass der Algorithmus ihn öfter
          ausspielt. Das Gegenteil ist der Fall.
        </Para>
        <Para>
          Pinterest bewertet die thematische Relevanz eines Pins. Wenn ein
          Pin zu viele verschiedene Keywords enthält verliert er seine
          thematische Schärfe — Pinterest weiß nicht mehr genau wem es ihn
          zeigen soll.
        </Para>

        <H4>Die Faustregel:</H4>
        <Bullets
          items={[
            <>
              <strong>1 Haupt-Keyword</strong> — immer im Titel ganz vorne
            </>,
            <>
              <strong>1–2 Mid-Tail Keywords</strong> — in Titel und
              Beschreibung
            </>,
            <>
              <strong>1 Longtail Keyword</strong> — in der Beschreibung als
              natürlicher Satz
            </>,
          ]}
        />
        <Para>
          Das klingt nach wenig — aber diese Keywords erzählen Pinterest
          eine klare Geschichte: Worum geht es in diesem Pin, wer sucht
          danach und was bekommt der Nutzer wenn er klickt.
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
              dich täglich zur Praxis einlädt — auch auf kleiner Fläche."
            </>,
          ]}
        />
        <Para>
          Keywords enthalten: <em>Yogaraum gestalten</em> (Mid-Tail),{' '}
          <em>Yoga zuhause</em> (Mid-Tail),{' '}
          <em>Yoga Ecke zuhause Ideen</em> (Longtail). Natürlich
          formuliert. Kein Keyword-Stuffing. Trotzdem SEO-stark.
        </Para>
      </Accordion>

      <Accordion title="Board-Keywords — der vergessene SEO-Hebel">
        <Para>
          Die meisten Pinterest-Nutzer optimieren ihre Pins mit Keywords —
          aber vergessen dabei ihre Boards. Das ist ein teurer Fehler.
          Pinterest liest nicht nur Pin-Titel und Beschreibung — es liest
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
            'Klar und beschreibend — kein kreativer oder witziger Name',
            '❌ „Meine Yoga Welt" — Pinterest weiß nicht genau worum es geht',
            '✅ „Yoga Retreat Österreich: Wellness Hotels & Yoga Urlaub" — klares Keyword, spezifisches Unterthema',
          ]}
        />

        <H4>Board-Beschreibung optimieren (max. 500 Zeichen):</H4>
        <Para>
          Wird von vielen Nutzern leer gelassen — dabei eine der
          wertvollsten SEO-Flächen auf Pinterest.
        </Para>
        <Bullets
          items={[
            '2–3 Sätze',
            'Haupt-Keyword im ersten Satz ganz vorne',
            'Mid-Tail und Longtail Keywords natürlich integriert',
            'Zielgruppe direkt ansprechen',
          ]}
        />
        <Para>
          <strong>Beispiel (Yoga Retreats):</strong>
          <br />
          „Yoga Retreat Österreich und Deutschland — die schönsten Yoga
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
          Österreich: Die 10 schönsten Wellness Hotels in den Alpen" —
          sieht Pinterest eine konsistente thematische Linie. Diese
          Konsistenz signalisiert thematische Autorität und belohnt wird
          sie mit mehr Reichweite.
        </Para>

        <H4>Wie viele Boards brauchst du?</H4>
        <Para>
          Weniger als du denkst. Ein Account mit 10 starken, klar
          definierten Boards ist besser als 30 unstrukturierte Boards.
          Faustregel: Ein Board pro Hauptthema — nicht mehr als 15–20
          Boards insgesamt.
        </Para>

        <HinweisBox>
          💡 Nutze den →{' '}
          <Link
            href="/dashboard/boards"
            className="text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            KI-Prompt Generator
          </Link>{' '}
          auf der Boards-Seite um direkt einen SEO-optimierten Board-Namen
          und eine Beschreibung zu generieren.
        </HinweisBox>
      </Accordion>

      <Accordion title="Keywords tracken — der monatliche Review">
        <Para>
          Die Keyword-Datenbank in Pin-Flow ist nicht nur zur Verwaltung da
          — sie ist ein strategisches Planungs-Werkzeug.
        </Para>

        <H4>Was du tracken kannst</H4>
        <Para>
          Pin-Flow gleicht automatisch alle Pins in deiner Datenbank mit der
          Keyword-Datenbank ab — anhand von Pin-Titel, Beschreibung und
          Board-Name. Du musst nichts manuell zuordnen. Nach jedem
          Analytics-Update siehst du in der Keyword-Datenbank für jedes
          Keyword wie viele Pins es enthalten, welche Ø CTR und Ø Klicks
          diese Pins erzielen — und ob das Keyword stark oder schwach
          performt.
        </Para>

        <H4>Was die Performance-Signale bedeuten:</H4>
        <Bullets
          items={[
            <>
              🏆 <strong>Stark</strong> — Ø CTR über 2% in mindestens 3
              Pins. Dieses Keyword funktioniert — öfter einsetzen.
            </>,
            <>
              📈 <strong>Gut</strong> — Ø CTR 1–2%. Solide Performance,
              weiter beobachten.
            </>,
            <>
              👀 <strong>Beobachten</strong> — Keyword in Pins gefunden
              aber CTR unter 1%. Pin oder Keyword optimieren.
            </>,
            <>
              ➕ <strong>Noch nicht verwendet</strong> — Keyword noch in
              keinem Pin gefunden. Beim nächsten passenden Pin einsetzen.
            </>,
          ]}
        />

        <H4>Der monatliche Keyword-Review (5 Minuten):</H4>
        <Para>
          Direkt nach dem Analytics-Update diese drei Fragen beantworten:
        </Para>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            Welche meiner Keywords stecken in Pins die gut performen? Diese
            öfter einsetzen.
          </li>
          <li>
            Gibt es Keywords in der Datenbank die noch nie in einem Pin
            verwendet wurden? Prüfen ob sie relevant sind.
          </li>
          <li>
            Gibt es Content-Inhalte die noch gar nicht bepinnt wurden?
          </li>
        </ol>
        <Para>
          Diese drei Fragen in fünf Minuten beantwortet — und du weißt
          genau wohin deine nächsten Pins gehen sollten.
        </Para>
        <Para>
          Öffne dazu die →{' '}
          <Link
            href="/dashboard/keywords"
            className="text-red-700 underline underline-offset-2 hover:text-red-800"
          >
            Keyword-Datenbank
          </Link>{' '}
          und prüfe welche Keywords welchen Content-Inhalten zugeordnet
          sind und ob alle Inhalte ausreichend Pins haben.
        </Para>

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Keywords sind keine Tricks. Sie sind
          die Sprache deiner Zielgruppe. Wer lernt wie seine Wunschkunden
          auf Pinterest suchen und diese Sprache in seine Pins überträgt
          wird langfristig mehr Reichweite aufbauen als jeder der einfach
          viele Pins veröffentlicht ohne strategisch zu denken.
        </HinweisBox>
      </Accordion>
    </div>
  )
}

// ===========================================================
// Tab 6 — Analytics & Boards
// ===========================================================

function TabAnalytics() {
  return (
    <div className="space-y-3">
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Die meisten Pinterest-Nutzer schauen auf Follower und Impressionen —
        und verpassen dabei das Wesentliche. Analytics zeigen dir nicht nur
        wie viele Menschen deinen Pin gesehen haben. Sie zeigen dir{' '}
        <strong>warum ein Pin funktioniert oder nicht</strong> — und was du
        als nächstes tun sollst.
      </p>

      <Accordion title="Wie Pinterest Inhalte bewertet — die zwei Stufen">
        <Para>
          Pinterest funktioniert in zwei Stufen. Nur wenn beide funktionieren
          entsteht echte Performance:
        </Para>

        <div>
          <H4>Stufe 1: Distribution → gemessen durch Impressionen</H4>
          <Para>
            Pinterest entscheidet wie oft dein Pin ausgespielt wird —
            basierend auf Relevanz, Keywords und Board-Qualität. Hohe
            Impressionen bedeuten: Der Algorithmus vertraut diesem Pin.
          </Para>
        </div>

        <div>
          <H4>Stufe 2: Reaktion → gemessen durch Klicks & Saves</H4>
          <Para>
            Ein Klick bedeutet dass jemand mehr wissen wollte. Ein Save
            signalisiert Pinterest dass der Inhalt wertvoll ist — und sorgt
            für organische Weiterdistribution.
          </Para>
        </div>

        <H4>Was du trackst — und was es bedeutet:</H4>
        <Bullets
          items={[
            <>
              <strong>Impressionen</strong> — wie oft wurde der Pin ausgespielt
            </>,
            <>
              <strong>Ausgehende Klicks</strong> — wie oft wurde auf die
              Website geklickt (direkter Traffic)
            </>,
            <>
              <strong>Saves</strong> — wie oft wurde der Pin gespeichert
              (langfristiger Wachstumshebel)
            </>,
            <>
              <strong>CTR</strong> = Klicks ÷ Impressionen — zeigt wie
              überzeugend der Hook ist
            </>,
            <>
              <strong>Engagement Rate</strong> = (Saves + Klicks) ÷
              Impressionen × 100 — misst die Gesamtwirkung
            </>,
          ]}
        />

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Analytics ist kein Bewertungssystem für
          deine Arbeit. Es ist ein Navigationssystem für deine nächsten
          Schritte.
        </HinweisBox>
      </Accordion>

      <Accordion title="4 Pin-Signale — was deine Analytics dir sagen und was zu tun ist">
        <Para>
          Jede Kombination aus Distribution und Reaktion erzählt eine andere
          Geschichte:
        </Para>

        <Table
          head={['Distribution', 'Reaktion', 'Diagnose', 'Kategorie']}
          rows={[
            ['✅ Hoch', '✅ Hoch', 'Alles funktioniert', '🏆 Top Performer'],
            [
              '✅ Hoch',
              '❌ Niedrig',
              'SEO gut, Hook schwach',
              '🔧 Optimierungspotenzial',
            ],
            [
              '❌ Niedrig',
              '✅ Hoch',
              'Hook gut, SEO schwach',
              '💎 Hidden Gem',
            ],
            ['❌ Niedrig', '❌ Niedrig', 'Kein Signal', '💤 Stiller Pin'],
          ]}
        />

        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <H3>🏆 Top Performer</H3>
          <Para>
            Diese Pins haben bewiesen dass Pinterest sie ausspielt, Menschen
            sie anklicken und das Thema echte Nachfrage hat. Sie sind dein
            Blueprint.
          </Para>
          <Para>
            Hohe Impressionen zeigen dass der Algorithmus dem Pin vertraut.
            Eine gute CTR beweist dass der Hook funktioniert. Beides zusammen
            ist selten — und wertvoll.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Produziere Varianten desselben
            Themas mit leicht abgewandeltem Hook oder Design. Baue den
            Keyword-Cluster aus. Repliziere das Format auf ähnliche Themen.
          </Para>
          <Para>
            <strong>Wichtig — der Zeitfaktor:</strong> Pinterest spielt neue
            Pins in den ersten 60–90 Tagen besonders stark aus. Nutze dieses
            Fenster — produziere Varianten solange der Algorithmus den Pin
            pusht. Nach 3–6 Monaten schläft auch der stärkste Pin ein. Dann
            wird er zum Recycling-Kandidaten.
          </Para>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <H3>💎 Hidden Gem</H3>
          <Para>
            Menschen klicken auf sie — aber Pinterest spielt sie zu selten
            aus. Das ist kein Versagen des Inhalts. Es ist ein SEO-Problem
            das du lösen kannst.
          </Para>
          <Para>
            Niedrige Impressionen bei gleichzeitig hoher CTR. Die Botschaft
            ist klar: Wenn jemand diesen Pin sieht überzeugt er. Das Problem
            liegt nicht im Hook — es liegt in schwachen Keywords.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Überprüfe Keywords in Titel und
            Beschreibung. Wechsle das Board wenn es thematisch nicht perfekt
            passt. Recycele den Pin mit optimiertem SEO als neue Variante.
          </Para>
        </div>

        <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
          <H3>🔧 Optimierungspotenzial</H3>
          <Para>
            Diese Pins haben Reichweite aber keine Wirkung. Pinterest spielt
            sie aus — aber die Zielgruppe scrollt vorbei. Das ist kein SEO-
            Problem. Das ist ein Hook-Problem.
          </Para>
          <Para>
            Hohe Impressionen bei niedriger CTR. Du musst das SEO nicht neu
            aufbauen — du musst nur den ersten Eindruck verbessern.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Erstelle einen neuen Pin mit
            gleichem Titel und gleicher Beschreibung aber anderem Hook und
            Design. Du hast bereits die Reichweite — du brauchst nur den
            richtigen ersten Satz.
          </Para>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <H3>💤 Stiller Pin</H3>
          <Para>
            Zeigt weder Reichweite noch Reaktion. Pinterest spielt ihn kaum
            aus und wenn doch klickt niemand.
          </Para>
          <Para>
            Entweder hat das Thema keine ausreichende Nachfrage auf Pinterest,
            die Keywords sind zu schwach oder Hook und Design überzeugen
            nicht.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Ist dieses Thema strategisch
            wichtig? Wenn ja — Keywords, Board und Hook komplett neu
            optimieren und als neue Variante testen. Wenn nein — Energie in
            Inhalte mit mehr Potenzial investieren. Nicht jeder Pin muss
            gerettet werden.
          </Para>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <H3>♻️ Recycling-Kandidaten</H3>
          <Para>
            Eingeschlafene Gewinner. Diese Pins haben bereits bewiesen dass
            sie funktionieren — aber tauchen nicht mehr in den aktuellen
            Top-Pins auf.
          </Para>
          <Para>
            Ein Pin ist ein Recycling-Kandidat wenn er alt genug ist um
            bewertet zu werden, bereits eine Mindestanzahl an Klicks erzielt
            hat — aber aktuell kein Top Performer mehr ist.
          </Para>
          <Para>
            <strong>Deine Handlung:</strong> Produziere eine neue Variante
            mit frischem Design und aktualisierten Keywords. Du startest
            nicht bei null — du baust auf einem bewiesenen Fundament auf.
          </Para>
        </div>
      </Accordion>

      <Accordion title="Deine Analytics: welche Pins und welche Kennzahlen du tracken musst">
        <H4>Die drei Kennzahlen die du brauchst</H4>
        <Para>
          Alles in diesem System basiert auf drei Datenpunkten die du einmal
          im Monat aus Pinterest Analytics überträgst:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Gesamt-Impressionen</strong> — wie oft wurde der Pin
              ausgespielt
            </>,
            <>
              <strong>Gesamt-Klicks</strong> — wie oft wurde geklickt
            </>,
            <>
              <strong>Gesamt-Saves</strong> — wie oft wurde gespeichert
            </>,
          ]}
        />
        <Para>Daraus berechnet dieses System automatisch:</Para>
        <Bullets
          items={[
            <>
              <strong>CTR</strong> = Klicks ÷ Impressionen
            </>,
            <>
              <strong>Engagement Rate</strong> = (Saves + Klicks) ÷
              Impressionen × 100
            </>,
          ]}
        />
        <Para>
          Drei Zahlen. Zwei berechnete Werte. Vier klare Kategorien. Für
          jeden Pin weißt du sofort was zu tun ist.
        </Para>

        <H4>Welchen Zeitraum du verwendest</H4>
        <Para>
          Verwende immer die rollierenden letzten 180 Tage — keine
          Unterscheidung zwischen Gesamtlaufzeit und letzten 30 Tagen. Der
          180-Tage-Zeitraum gibt dir einen stabilen, vergleichbaren Blick auf
          deine Pin-Performance ohne kurzfristige Ausreißer überzubewerten.
        </Para>

        <H4>Das Pareto-Prinzip für deine Pins</H4>
        <Para>
          Pinterest folgt dem Pareto-Prinzip: 20 % deiner Pins bringen 80 %
          deiner Ergebnisse. Das bedeutet konkret — du wirst niemals alle
          Pins gleich performen sehen, und das ist auch nicht das Ziel.
        </Para>
        <Para>
          Das eigentliche Ziel: Erkenne welche 20 % deiner Pins 80 % deiner
          Klicks, Saves und Reichweite bringen — und konzentriere deine
          Energie genau dort. Mehr von dem was funktioniert produzieren.
          Weniger von dem was nicht funktioniert.
        </Para>
        <Para>
          Dieses System hilft dir genau dabei: Du siehst auf einen Blick
          welche Pins zu welcher Kategorie gehören — und was als nächstes zu
          tun ist.
        </Para>

        <H4>Welche Pins du trackst</H4>
        <Para>
          Pinterest zeigt dir immer die Top 50 Pins an — du musst nicht alle
          50 in dieses System übertragen. Nimm die für dich wichtigsten Pins
          — wenn es nur 20 sind ist das vollkommen ausreichend.
        </Para>
        <Para>Relevant sind Pins die:</Para>
        <Bullets
          items={[
            'Klicks generiert haben (Traffic-Potenzial)',
            'Saves generiert haben (Reichweiten-Potenzial)',
            'Neu sind und gerade Momentum aufbauen',
          ]}
        />

        <HinweisBox variant="merke">
          💡 <strong>Merke:</strong> Drei Zahlen. Zwei berechnete Werte. Vier
          klare Kategorien. Für jeden Pin weißt du sofort was zu tun ist.
        </HinweisBox>
      </Accordion>

      <Accordion title="Board-Performance — wie Boards die Reichweite deiner Pins steuern">
        <Para>
          Viele Pinterest-Nutzer optimieren ihre Pins — aber vergessen ihre
          Boards. Das ist ein Fehler. Boards sind neben Keywords in Pin-
          Titel und Pin-Beschreibung der zweitwichtigste Faktor für die
          Distribution deiner Pins. Pinterest nutzt das Board als Kontext-
          Signal: Es entscheidet mit welchen Suchanfragen dein Pin
          ausgespielt wird. Ein thematisch starkes Board verstärkt jeden Pin
          darauf — ein schwaches Board bremst selbst gute Pins aus.
        </Para>

        <H4>Was ist wichtiger: Engagement Rate oder ausgehende Klicks?</H4>
        <Para>Beide Kennzahlen sind relevant — aber für verschiedene Fragen:</Para>
        <Bullets
          items={[
            <>
              <strong>Engagement Rate (ER)</strong> → zeigt ob Pinterest dem
              Board thematisch vertraut. Eine hohe ER signalisiert dem
              Algorithmus dass dein Board relevant für eine Nische ist — und
              sorgt dafür dass Pins darauf bevorzugt ausgespielt werden. ER
              ist das wichtigste Signal für Board-Gesundheit und
              Distribution.
            </>,
            <>
              <strong>Ausgehende Klicks</strong> → zeigen ob das Board
              Traffic auf deine Website schickt. Das ist der direkte
              Business-Impact — wie viel Website-Traffic kommt von diesem
              Board?
            </>,
          ]}
        />
        <HinweisBox variant="merke">
          💡 <strong>Faustregel:</strong> Engagement Rate misst ob Pinterest
          dein Board liebt. Ausgehende Klicks messen ob deine Zielgruppe dein
          Board liebt. Beide zusammen zeigen dir ob ein Board wirklich
          funktioniert.
        </HinweisBox>

        <H4>Was du daraus ableitest:</H4>
        <Bullets
          items={[
            'Board mit hohen Impressionen aber wenig Klicks → Hook-Problem: Die Pins darauf überzeugen nicht zum Klicken — Design und Hook überarbeiten',
            'Board mit wenig Impressionen → SEO-Problem: Board-Name und Beschreibung sind zu schwach — Keywords optimieren',
            'Board mit niedriger ER → Relevanz-Problem: Pinterest vertraut dem Board thematisch nicht — Konsistenz und Aktivität erhöhen',
          ]}
        />

        <H4>Board-Optimierung in 4 Schritten:</H4>

        <div>
          <H4>Schritt 1 — Board-Name prüfen</H4>
          <Para>
            Enthält der Board-Name das wichtigste Keyword? Steht es ganz
            vorne? Ein Board namens „Meine Yoga Welt" ist schwächer als „Yoga
            zuhause: Yogaraum & Yoga Ecke einrichten". Pinterest indexiert
            den neuen Namen innerhalb weniger Tage.
          </Para>
        </div>

        <div>
          <H4>Schritt 2 — Board-Beschreibung überarbeiten</H4>
          <Para>
            Leer oder zu kurz? 2–3 Sätze mit den wichtigsten Keywords
            schreiben — natürlich formuliert. Nutze den{' '}
            <Link
              href="/dashboard/boards"
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              → KI-Prompt Generator
            </Link>{' '}
            auf der Boards-Seite um direkt einen SEO-optimierten Board-Namen
            und eine Beschreibung zu generieren.
          </Para>
        </div>

        <div>
          <H4>Schritt 3 — Board reaktivieren</H4>
          <Para>
            Inaktive Boards brauchen neue Pins. Mindestens 3–5 neue Pins pro
            Woche bis das Board wieder als aktiv gilt.
          </Para>
        </div>

        <div>
          <H4>Schritt 4 — Board-Score prüfen</H4>
          <Para>
            Nach 30 Tagen erneut prüfen. Hat sich die Performance verbessert?
            Wenn nicht — Keywords weiter optimieren oder Board strategisch
            überdenken.
          </Para>
        </div>

        <H4>Wann du ein Board löschen solltest:</H4>
        <Para>
          Lösche ein Board nur wenn es thematisch komplett falsch ist und
          keine Verbindung zu deiner Nische hat. In allen anderen Fällen ist
          Optimieren besser als Löschen — Pinterest verliert beim Löschen
          alle historischen Daten des Boards.
        </Para>

        <HinweisBox>
          💡 <strong>Tipp:</strong> Prüfe einmal im Monat deine Board-Zahlen
          im Dashboard unter Board-Gesundheit. Top Boards zeigen dir wo
          deine Zielgruppe aktiv ist — dort mehr produzieren. Schwache
          Boards entweder aktiv bespielen oder Board-Beschreibung mit
          stärkeren Keywords überarbeiten.
        </HinweisBox>
      </Accordion>
    </div>
  )
}
