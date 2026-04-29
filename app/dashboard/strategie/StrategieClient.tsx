'use client'

import { useState, type ReactNode } from 'react'
import type { StrategieRow } from './lib'
import MyStrategy from './MyStrategy'

type TabKey = 'meine' | 'grundlagen' | 'strategien' | 'design'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'meine', label: '🎯 Meine Strategie' },
  { key: 'grundlagen', label: '📚 Pinterest-Grundlagen' },
  { key: 'strategien', label: '💼 Die drei Strategien' },
  { key: 'design', label: '🎨 Pin-Design & Formate' },
]

export default function StrategieClient({
  strategie,
}: {
  strategie: StrategieRow | null
}) {
  const [active, setActive] = useState<TabKey>('meine')

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
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details
      className="group rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
      open={defaultOpen}
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

function HinweisBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
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
      <Accordion title="Was Pinterest wirklich ist" defaultOpen>
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
        <HinweisBox>
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

        <HinweisBox>
          💡 <strong>Merke:</strong> Pinterest ist der Kanal – nicht die
          Einnahmequelle. Wer nur auf eine Einnahmequelle setzt, ist abhängig.
          Wer diversifiziert, baut echte Einkommenssicherheit auf.
        </HinweisBox>
      </Accordion>

      <Accordion title="Posting-Frequenz – Konsistenz ist König">
        <Para>
          Pinterest belohnt Accounts, die regelmäßig und verlässlich posten.
        </Para>
        <Table
          head={['Phase', 'Pins pro Tag', 'Zeitaufwand pro Monat']}
          rows={[
            ['Anfänger (0-6 Monate)', '3-5 Pins', '~2 Stunden'],
            ['Wachstum (6-18 Monate)', '5-15 Pins', '~4 Stunden'],
            ['Etabliert (18+ Monate)', '10-25 Pins', '~6 Stunden'],
          ]}
        />
        <Para>
          Die wichtigste Erkenntnis: Du musst nicht täglich Content
          produzieren. Produziere einmal im Monat – plane alles mit Tailwind
          oder dem Pinterest-Scheduler für den ganzen Monat vor.
        </Para>
        <H4>Beispielrechnung – nicht täglich Content produzieren:</H4>
        <CodeBlock>
{`30 Blogbeiträge auf deiner Website
× 3 Pin-Varianten pro Beitrag = 90 Pins
× je 3 Boards verteilt        = 270 Pins im Pool
÷ 30 Tage                     = 9 Pins pro Tag

Plus monatlich 20 neue Pins   = 10+ Pins täglich`}
        </CodeBlock>
        <HinweisBox>
          💡 <strong>Merke:</strong> Pinterest ist ein Marathon, kein Sprint.
          Konsistenz über 12 Monate schlägt jeden kurzfristigen
          Intensiv-Sprint.
        </HinweisBox>
      </Accordion>

      <Accordion title="Multi-Board-Pinning">
        <Para>
          Pinterest verteilt Pins nach thematischer Relevanz. Derselbe Pin auf
          drei verschiedenen Boards erreicht drei verschiedene Zielgruppen.
        </Para>
        <H4>Die Regeln:</H4>
        <Bullets
          items={[
            'Identischer Pin → erlaubt mit 7-14 Tage Abstand',
            'Minimale Variante (anderer Hook, andere Farbe) → noch besser',
            'Maximum 3-5 Boards pro Pin',
            'Boards müssen thematisch zum Pin passen',
          ]}
        />
        <H4>Praktisches Beispiel:</H4>
        <CodeBlock>
{`Woche 1:  Pin A          → Board "Garten gestalten"
Woche 3:  Pin A          → Board "Outdoor-Wohnen"
Woche 5:  Pin A          → Board "DIY & Heimwerken"
Woche 7:  Pin B (Variante) → Board "Garten gestalten"`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Saisonkalender – Pin-Fenster respektieren">
        <Para>
          Pinterest indexiert Pins langsam. Wer Muttertagspins am 9. Mai
          veröffentlicht, hat verloren.
        </Para>
        <Para>
          <strong>Faustregel:</strong> Saisonale Pins brauchen 45-60 Tage
          Vorlauf.
        </Para>
        <Para>
          Pinterest-Suchen nach saisonalen Themen starten 6-12 Wochen vor dem
          Event:
        </Para>
        <Bullets
          items={[
            'Muttertag-Suchen starten Mitte März, nicht im Mai',
            'Halloween-Suchen starten im Juli, nicht im Oktober',
            'Weihnachts-Suchen starten im September',
          ]}
        />
        <Para>
          Der Saison-Kalender im Dashboard zeigt automatisch, was wann ansteht
          und wann das Pin-Fenster schließt.
        </Para>
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
          Der Pin-Handlungsbedarf im Dashboard zeigt dir automatisch, welche
          Pins recycelt werden sollten (Kategorie „Eingeschlafener Gewinner").
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
      <Accordion title="Warum eine Strategie wichtig ist" defaultOpen>
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

        <HinweisBox>
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
        <HinweisBox>
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
        <HinweisBox>
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
      <Accordion title="Pin-Formate" defaultOpen>
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

        <HinweisBox>
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
        <HinweisBox>
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
          <li>Content Pipeline öffnen → welche Themen stehen an?</li>
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
        <HinweisBox>
          💡 Vorlagen und Systeme sind keine Abkürzung – sie sind die
          Voraussetzung dafür, dass Pinterest-Marketing nachhaltig
          funktioniert. Wer jeden Pin von Grund auf neu erstellt, verliert
          nach 3 Monaten die Motivation. Wer mit Systemen arbeitet, pinnt noch
          in 3 Jahren.
        </HinweisBox>
      </Accordion>
    </div>
  )
}
