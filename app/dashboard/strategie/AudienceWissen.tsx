'use client'

import type { ReactNode } from 'react'

// V3.0 Phase 2c — Inhalt des Tabs „👥 Zielgruppe verstehen" auf der
// Strategie-Seite. Fünf ausklappbare Toggle-Blöcke mit anfänger-tauglicher
// Erklärung der Pinterest-Audience-Insights (Produktname bewusst englisch).
//
// WICHTIG: nische-agnostisch. Alle Beispiele und Formulierungen passen für
// Yoga, Schmuck, Mode, DIY, Food, Garten — keine Nische wird hervorgehoben.
//
// Optik: matched die bestehende Accordion-Komponente in `StrategieClient.tsx`
// (rounded-lg border bg-white shadow-sm, ▸/▾-Pfeil im summary). Eigene
// Implementierung statt Import, weil Accordion dort lokal ist und
// useSearchParams-Hash-Logik mitschleppt, die wir hier nicht brauchen.
//
// Kein eigener Page-Header: das Tab-Label ist der Heading. Konsistent zu den
// anderen Tab-Inhalts-Komponenten (TabGrundlagen, TabStrategien etc.), die
// direkt mit ihrem ersten Inhalts-Block starten.

export default function AudienceWissen() {
  return (
    <section className="space-y-3">
      <p className="text-sm text-gray-600">
        Hintergrundwissen zu den Pinterest-Zielgruppen-Daten — was sie zeigen
        und wie du sie für deine Pin-Strategie nutzt.
      </p>

      <Toggle title="Was zeigt Pinterest Audience Insights?">
        <p>
          Pinterest Audience Insights ist Pinterests Datenbericht über die
          Menschen, die mit deinen Pins interagieren. Du bekommst drei
          Daten-Typen:
        </p>
        <Bullets
          items={[
            <>
              <strong>Interessen &amp; Affinitäten</strong> — welche Themen
              deine Zielgruppe besonders interessieren, im Vergleich zur
              Pinterest-Allgemeinheit.
            </>,
            <>
              <strong>Demografie</strong> — Geschlecht, Altersgruppen,
              Herkunftsländer, genutzte Geräte.
            </>,
            <>
              <strong>Größe und Wachstum der Zielgruppe</strong> — wie viele
              Menschen aktuell mit deinen Pins interagieren und ob die Zahl
              steigt oder fällt.
            </>,
          ]}
        />
        <p>
          Aus diesen drei Bausteinen kannst du ableiten, welche Themen, Tonalitäten
          und Formate bei deiner Zielgruppe funktionieren — und welche Lücken oder
          Chancen es noch gibt.
        </p>
      </Toggle>

      <Toggle title='Warum „Interagierende Zielgruppe" statt „Gesamte Zielgruppe"?'>
        <p>
          Pinterest unterscheidet zwei Zielgruppen-Typen, die du im Export-Dialog
          auswählst:
        </p>
        <Bullets
          items={[
            <>
              <strong>Interagierende Zielgruppe (Engaged Audience)</strong> —
              Menschen, die mit deinen Pins aktiv interagieren: klicken,
              speichern, kommentieren. Das sind die echten Interessenten.
            </>,
            <>
              <strong>Gesamte Zielgruppe (Total Audience)</strong> — alle, die
              deine Pins überhaupt gesehen haben, inklusive Zufallstreffer
              ohne Interaktion.
            </>,
          ]}
        />
        <p>
          Strategisch ist die <strong>Interagierende Zielgruppe</strong>{' '}
          deutlich wertvoller: Die Affinitäts-Werte sind aussagekräftiger,
          weil sie nur die Menschen abbilden, die deine Themen wirklich
          beschäftigen. Diese App importiert deshalb ausschließlich die
          Engaged-Audience.
        </p>
      </Toggle>

      <Toggle title="Wie liest du den Affinitäts-Index?">
        <p>
          Der Affinitäts-Index zeigt, wie stark sich deine Zielgruppe für ein
          Thema interessiert <em>im Vergleich zum Pinterest-Durchschnitt</em>.
          Ein Wert von 1,0 entspricht genau dem Pinterest-Mittel — alles
          darüber ist überdurchschnittlich, alles darunter unterdurchschnittlich.
        </p>
        <Bullets
          items={[
            <>
              <span className="font-medium text-green-700">
                🟢 Affinität ≥ 1,5
              </span>{' '}
              — Stark überdurchschnittliches Interesse. Hier hat deine
              Zielgruppe einen klaren Schwerpunkt: <strong>hoher Hebel</strong>.
            </>,
            <>
              <span className="font-medium text-amber-700">
                🟡 Affinität 0,8 – 1,5
              </span>{' '}
              — Durchschnittlich. Deine Zielgruppe teilt das Interesse mit dem
              Pinterest-Schnitt: <strong>neutral</strong>.
            </>,
            <>
              <span className="font-medium text-red-700">
                🔴 Affinität &lt; 0,8
              </span>{' '}
              — Unterdurchschnittlich. Deine Zielgruppe interessiert sich
              spürbar weniger als der Durchschnitt: <strong>nicht relevant</strong>.
            </>,
          ]}
        />
        <p>
          <strong>Wichtig:</strong> Affinität ist relativ, nicht absolut. Ein
          Thema mit Affinität 1,8 bedeutet nicht &bdquo;alle deine Follower
          interessieren sich dafür&ldquo;, sondern &bdquo;deine Zielgruppe
          interessiert sich 1,8-mal so stark dafür wie Pinterest-Nutzer im
          Schnitt&ldquo;. Das ist genau der strategische Wert: Du siehst,
          was deine Zielgruppe <em>besonders</em> interessiert.
        </p>
      </Toggle>

      <Toggle title="Wie nutzt du diese Daten für deine Pin-Strategie?">
        <p>
          Drei Wege, die Zielgruppen-Daten konkret für deine Pin-Strategie zu
          nutzen — passend zu jeder Nische:
        </p>

        <H4>1. Themen-Erweiterung</H4>
        <Para>
          Hat deine Zielgruppe eine hohe Affinität zu einem Thema, das du noch
          gar nicht bedienst, ist das eine Chance. Suche eine{' '}
          <strong>Brücke zwischen diesem Thema und deiner Hauptnische</strong>{' '}
          — egal ob deine Hauptnische Yoga, Schmuck, Mode, DIY, Food oder
          Garten ist. Beispiel: Hohe Affinität zu &bdquo;Travel&ldquo; lässt
          sich aus fast jeder Nische bedienen (Reise-Yoga, Reise-Schmuck,
          Reise-Mode, Reise-DIY, Reise-Food, Reise-Gärten).
        </Para>

        <H4>2. Themen-Schwerpunkte verstärken</H4>
        <Para>
          Wo deine Affinität bereits hoch ist <em>und</em> du das Thema schon
          bedienst — mach <strong>mehr davon</strong>. Pinterest belohnt
          Konsistenz innerhalb thematischer Schwerpunkte; deine Zielgruppe hat
          dir gerade gesagt, dass das funktioniert.
        </Para>

        <H4>3. Themen-Anpassung</H4>
        <Para>
          Hat deine Zielgruppe zu einem Thema eine hohe Affinität, deine
          aktuellen Pins passen aber nicht recht dazu, lohnt sich ein
          Strategie-Check: Kannst du deinen Content gezielt anders aufbauen
          oder neu priorisieren, um die starke Affinität besser zu treffen?
          Manchmal reicht eine veränderte Pin-Aufmachung (Cover, Hook,
          Keywords), um dieselbe Botschaft anders auszuspielen.
        </Para>
      </Toggle>

      <Toggle title="Warum monatliche Snapshots wichtig sind">
        <p>
          Deine Zielgruppe ist <strong>nicht statisch</strong>. Sie wächst,
          schrumpft und verschiebt sich kontinuierlich — durch neue Pins,
          saisonale Trends, virale Treffer oder geänderte Pinterest-Algorithmen.
          Ein einzelner Snapshot ist eine Momentaufnahme. Erst eine{' '}
          <strong>Reihe monatlicher Snapshots</strong> macht Entwicklung
          sichtbar.
        </p>
        <p>Was du dabei beobachten solltest:</p>
        <Bullets
          items={[
            <>
              <strong>Wachstum der Zielgruppe</strong> — wächst die Anzahl der
              interagierenden Personen? Oder stagniert sie?
            </>,
            <>
              <strong>Affinitäts-Verschiebungen</strong> — welche Themen
              werden über Monate hinweg wichtiger, welche verlieren an
              Bedeutung?
            </>,
            <>
              <strong>Demografie-Trends</strong> — verändern sich
              Altersverteilung oder Herkunftsländer? Das kann auf neue
              Zielgruppen-Segmente hindeuten.
            </>,
          ]}
        />
        <p>
          Empfehlung: <strong>1× pro Monat</strong> die aktuelle CSV importieren.
          Mit drei oder mehr Snapshots in der App siehst du Trends, statt nur
          Einzelwerte zu interpretieren.
        </p>
      </Toggle>
    </section>
  )
}

// Lokale Toggle-Komponente — visuell identisch zur Accordion in
// StrategieClient.tsx, aber ohne useSearchParams/Anker-Logik (die wir hier
// nicht brauchen).
function Toggle({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="group scroll-mt-4 rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md">
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

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function H4({ children }: { children: ReactNode }) {
  return <h4 className="font-semibold text-gray-900">{children}</h4>
}

function Para({ children }: { children: ReactNode }) {
  return <p>{children}</p>
}
