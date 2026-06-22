'use client'

import Link from 'next/link'
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
      <p className="mb-4 text-sm font-medium text-gray-600">
        Für wen du das alles machst.
      </p>
      <p className="text-sm text-gray-600">
        Hintergrundwissen zu den Pinterest-Zielgruppen-Daten, was sie zeigen und
        wie du sie für deine Pin-Strategie nutzt.
      </p>

      <div className="rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-4 text-sm leading-relaxed text-teal-800">
        Bevor du auch nur einen Pin gestaltest, musst du eine Frage beantworten
        können: Für wen mache ich das? Marketing funktioniert nicht, wenn man
        für alle pinnt. Es funktioniert, wenn man für einen bestimmten Menschen
        pinnt, dessen Wünsche und Sorgen man kennt.{' '}
        <strong>
          Die Zielgruppe ist nicht ein Aspekt deiner Strategie unter vielen. Sie
          ist das Fundament, auf dem alles andere steht
        </strong>
        : deine Themen, deine Hooks, deine Keywords, deine Cover. Wer seine
        Zielgruppe nicht kennt, optimiert Pins, die an den richtigen Menschen
        vorbeigehen.
      </div>

      <Toggle title="Wer ist deine Zielgruppe und warum es sich lohnt, sie auszuarbeiten">
        <Para>
          Pinterest zeigt dir später, wer tatsächlich auf deine Pins reagiert.
          Aber zuerst brauchst du eine klare Vorstellung davon, wen du erreichen
          willst. Wer für alle pinnt, trifft niemanden. Je genauer du deinen
          Wunschkunden kennst, desto treffender werden deine Hooks, deine Themen
          und deine Ansprache.
        </Para>

        <H4>Definiere deinen Wunschkunden</H4>
        <Bullets
          items={[
            'Wer ist dieser Mensch? Seine Lebenssituation, sein Alltag, wo er gerade steht.',
            'Welches Problem oder welcher Wunsch beschäftigt ihn?',
            'Was hat er vielleicht schon erfolglos versucht?',
            'Wonach sucht er auf Pinterest, und in welchen Worten denkt und sucht er?',
            'Was soll sich für ihn ändern, wohin will er?',
          ]}
        />

        <H4>Deine Positionierung in einem Satz</H4>
        <Para>
          Aus deinen Antworten formst du einen einzigen Satz. Nutze diese
          Vorlage:
        </Para>
        <Para>
          „Ich helfe [Wunschkunde] dabei, [gewünschtes Ergebnis] zu erreichen,
          ohne [größte Hürde oder Frust]."
        </Para>
        <Para>
          Ein Beispiel: „Ich helfe berufstätigen Müttern dabei, in 20 Minuten
          gesunde Familiengerichte zu kochen, ohne stundenlang in der Küche zu
          stehen."
        </Para>

        <Para>
          Die Zielgruppe ist die Grundlage deiner gesamten Strategie, mehr dazu
          im Bereich{' '}
          <Link
            href="/dashboard/strategie?tab=strategien"
            className="font-medium text-link underline underline-offset-2"
          >
            Strategie verstehen
          </Link>
          .
        </Para>
        <Para>
          Genau dieses Wissen über die Wünsche und Probleme deiner Zielgruppe
          brauchst du, um starke Hooks zu schreiben, die sie direkt ansprechen,
          siehe{' '}
          <Link
            href="/dashboard/strategie?tab=design"
            className="font-medium text-link underline underline-offset-2"
          >
            Pin-Gestaltung
          </Link>
          .
        </Para>
        <Para>
          Sobald du weißt, wen du ansprechen willst, zeigt dir Pinterest mit
          Audience Insights, wer tatsächlich auf deine Pins reagiert. Das deckt
          sich nicht immer mit deiner ursprünglichen Vorstellung, und genau
          diese Abweichung ist wertvoll: Sie zeigt dir, ob du die richtigen
          Menschen erreichst oder ob du deine Ansprache nachschärfen solltest.
        </Para>
      </Toggle>

      <Toggle title="Was zeigt Pinterest Audience Insights, und warum es sich lohnt">
        <Para>
          Pinterest Audience Insights ist Pinterests Datenbericht über die
          Menschen, die mit deinen Pins interagieren. Du bekommst drei
          Daten-Typen:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Interessen und Affinitäten:</strong> welche Themen deine
              Zielgruppe besonders interessieren, im Vergleich zur
              Pinterest-Allgemeinheit.
            </>,
            <>
              <strong>Demografie:</strong> Geschlecht, Altersgruppen,
              Herkunftsländer, genutzte Geräte.
            </>,
            <>
              <strong>Größe und Wachstum der Zielgruppe:</strong> wie viele
              Menschen aktuell mit deinen Pins interagieren und ob die Zahl
              steigt oder fällt.
            </>,
          ]}
        />
        <Para>
          Aus diesen drei Bausteinen kannst du ableiten, welche Themen,
          Tonalitäten und Formate bei deiner Zielgruppe funktionieren, und
          welche Lücken oder Chancen es noch gibt.
        </Para>
        <H4>Warum es sich lohnt</H4>
        <Para>
          Audience Insights zeigt dir schwarz auf weiß, wer wirklich auf deine
          Pins reagiert, statt dass du raten musst. Du erkennst, welche Themen
          ziehen, ob du die richtigen Menschen erreichst und wo ungenutzte
          Chancen liegen. So triffst du Entscheidungen über Themen und Ansprache
          auf Basis echter Daten, nicht aus dem Bauch heraus.
        </Para>
      </Toggle>

      <Toggle title="Was Pinterest dir nicht zeigt">
        <Para>
          Audience Insights zeigt dir, wofür sich deine Zielgruppe interessiert.
          Es zeigt dir nicht, warum. Pinterest sagt dir, dass deine Leute eine
          hohe Affinität zu Gartenarbeit haben, aber nicht, ob sie selbst
          gärtnern oder nur davon träumen, ob sie Anfänger oder Profis sind, ob
          sie kaufen wollen oder nur sammeln. Diese Lücke füllt kein
          Datenbericht, sondern nur dein eigenes Bild vom Wunschkunden. Deshalb
          ersetzt Audience Insights das Nachdenken über deine Zielgruppe nicht,
          es schärft es. Die Daten zeigen dir das Was, dein Wunschkunden-Bild
          liefert das Warum.
        </Para>
      </Toggle>

      <Toggle title="Den Zielgruppen-Bericht richtig lesen">
        <H4>Welche Zielgruppe</H4>
        <Para>
          Pinterest unterscheidet zwei Zielgruppen-Typen, die du im
          Export-Dialog auswählst:
        </Para>
        <Bullets
          items={[
            <>
              <strong>Interagierende Zielgruppe (Engaged Audience):</strong>{' '}
              Menschen, die mit deinen Pins aktiv interagieren, also klicken,
              speichern, kommentieren. Das sind die echten Interessenten.
            </>,
            <>
              <strong>Gesamte Zielgruppe (Total Audience):</strong> alle, die
              deine Pins überhaupt gesehen haben, inklusive Zufallstreffer ohne
              Interaktion.
            </>,
          ]}
        />
        <Para>
          Strategisch ist die <strong>Interagierende Zielgruppe</strong>{' '}
          deutlich wertvoller: Die Affinitäts-Werte sind aussagekräftiger, weil
          sie nur die Menschen abbilden, die deine Themen wirklich beschäftigen.
          Pin-Flow importiert deshalb ausschließlich die Engaged Audience.
        </Para>

        <H4>Den Affinitäts-Index lesen</H4>
        <Para>
          Der Affinitäts-Index zeigt, wie stark sich deine Zielgruppe für ein
          Thema interessiert <em>im Vergleich zum Pinterest-Durchschnitt</em>.
          Ein Wert von 1,0 entspricht genau dem Pinterest-Mittel: Alles darüber
          ist überdurchschnittlich, alles darunter unterdurchschnittlich.
        </Para>
        <Bullets
          items={[
            <>
              <span className="font-medium text-green-700">
                🟢 Affinität ≥ 1,5
              </span>
              : stark überdurchschnittliches Interesse. Hier hat deine
              Zielgruppe einen klaren Schwerpunkt: <strong>hoher Hebel</strong>.
            </>,
            <>
              <span className="font-medium text-amber-700">
                🟡 Affinität 0,8 bis 1,5
              </span>
              : durchschnittlich. Deine Zielgruppe teilt das Interesse mit dem
              Pinterest-Schnitt: <strong>neutral</strong>.
            </>,
            <>
              <span className="font-medium text-red-700">
                🔴 Affinität &lt; 0,8
              </span>
              : unterdurchschnittlich. Deine Zielgruppe interessiert sich
              spürbar weniger als der Durchschnitt:{' '}
              <strong>nicht relevant</strong>.
            </>,
          ]}
        />
        <div className="rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-4 text-sm leading-relaxed text-teal-800">
          <strong>Merke:</strong> Affinität ist relativ, nicht absolut. Ein
          Thema mit Affinität 1,8 bedeutet nicht &bdquo;alle deine Follower
          interessieren sich dafür&ldquo;, sondern &bdquo;deine Zielgruppe
          interessiert sich 1,8-mal so stark dafür wie Pinterest-Nutzer im
          Schnitt&ldquo;. Das ist genau der strategische Wert: Du siehst, was
          deine Zielgruppe <em>besonders</em> interessiert.
        </div>
      </Toggle>

      <Toggle title="Die häufigsten Denkfehler beim Lesen der Zielgruppe">
        <Para>
          Drei Fehler passieren beim Lesen der Zielgruppe besonders oft.
        </Para>
        <Bullets
          items={[
            <>
              <strong>Höchster Anteil statt höchste Affinität.</strong> Ein
              Thema, das 80 Prozent deiner Zielgruppe interessiert, ist oft nur
              ein allgemeines Pinterest-Thema, das fast jeden interessiert. Die
              hohe Affinität bei einem kleineren Thema sagt dir viel mehr.
            </>,
            <>
              <strong>Sich von fremden Themen verführen lassen.</strong> Nicht
              jede hohe Affinität ist eine Chance, nur die, zu der du eine echte
              Brücke zu deinem Geschäft bauen kannst.
            </>,
            <>
              <strong>Einen einzelnen Snapshot für die Wahrheit halten.</strong>{' '}
              Erst über mehrere Monate zeigt sich, was stabil ist und was Zufall
              war.
            </>,
          ]}
        />
      </Toggle>

      <Toggle title="Wie nutzt du diese Daten für deine Pin-Strategie?">
        <H4>Gleiche ab mit deiner Vorstellung</H4>
        <Para>
          Im ersten Schritt hast du definiert, wen du erreichen willst. Jetzt
          zeigt dir Pinterest, wer tatsächlich reagiert. Halte beides
          nebeneinander: Passt es zusammen, bist du auf dem richtigen Weg. Weicht
          es ab, ist das kein Fehler, sondern eine Erkenntnis. Vielleicht
          sprichst du unbeabsichtigt eine andere Gruppe an, oder deine Ansprache
          trifft noch nicht die Menschen, die du eigentlich meinst. Beides ist
          ein Hinweis, entweder deine Positionierung zu schärfen oder deine Pins
          anders auszurichten.
        </Para>
        <p className="text-sm font-medium leading-relaxed text-gray-900">
          Diese Lücke zwischen dem, wen du erreichen willst, und dem, wen du
          tatsächlich erreichst, ist die wertvollste Information, die dir die
          Zielgruppen-Daten liefern.
        </p>
        <Para>
          Pin-Flow nimmt dir einen Teil davon ab: Im Analytics-Bereich und auf
          deinem Dashboard gleicht Pin-Flow deine Hauptnische automatisch mit der
          stärksten Affinität deiner Zielgruppe ab und zeigt dir in einem kurzen
          Coaching-Hinweis, ob beides zusammenpasst oder ob sich eine Lücke
          auftut.
        </Para>

        <Para>
          Drei Wege, die Zielgruppen-Daten konkret für deine Pin-Strategie zu
          nutzen — passend zu jeder Nische:
        </Para>

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
        <Para>
          Deine echten Affinitäts-Werte und die Interessen deiner Zielgruppe
          siehst du im Analytics-Bereich unter{' '}
          <Link
            href="/dashboard/analytics?tab=audience"
            className="font-medium text-link underline underline-offset-2"
          >
            Zielgruppe
          </Link>
          .
        </Para>
      </Toggle>

      <Toggle title="Warum monatliche Snapshots wichtig sind">
        <Para>
          Deine Zielgruppe ist <strong>nicht statisch</strong>. Sie wächst,
          schrumpft und verschiebt sich kontinuierlich, durch neue Pins,
          saisonale Trends, virale Treffer oder geänderte
          Pinterest-Algorithmen. Ein einzelner Snapshot ist eine Momentaufnahme.
          Erst regelmäßige Snapshots machen die Entwicklung sichtbar.
        </Para>
        <Para>Was du dabei beobachten solltest:</Para>
        <Bullets
          items={[
            <>
              <strong>Wachstum der Zielgruppe:</strong> wächst die Anzahl der
              interagierenden Personen, oder stagniert sie?
            </>,
            <>
              <strong>Affinitäts-Verschiebungen:</strong> welche Themen werden
              über Monate hinweg wichtiger, welche verlieren an Bedeutung?
            </>,
            <>
              <strong>Demografie-Trends:</strong> verändern sich
              Altersverteilung oder Herkunftsländer? Das kann auf neue
              Zielgruppen-Segmente hindeuten.
            </>,
          ]}
        />
        <Para>
          Pin-Flow nimmt dir die Arbeit ab: Jeden Import speichert es als
          Snapshot mit Stichtag dauerhaft im Analytics-Bereich (Tab „Erfolg
          messen", Bereich Zielgruppe). Du musst die Werte also nicht selbst
          notieren. Sobald ein zweiter Snapshot vorliegt, vergleicht Pin-Flow
          ihn automatisch mit dem vorherigen und zeigt dir, ob deine Zielgruppe
          gewachsen oder geschrumpft ist und wie sich die Schwerpunkte
          verschoben haben.
        </Para>
        <Para>
          Empfehlung: einmal pro Monat die aktuelle CSV importieren. Schon ab dem
          zweiten Snapshot wird die Entwicklung gegenüber dem Vormonat sichtbar.
          Je regelmäßiger du importierst, desto besser erkennst du über die Zeit,
          wohin sich deine Zielgruppe bewegt.
        </Para>
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
    <details className="group overflow-hidden scroll-mt-4 rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md">
      <summary className="group/sum flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-marke-blaugrau [&::-webkit-details-marker]:hidden">
        <span
          className="text-lg leading-none text-gray-400 transition-transform group-hover/sum:text-white"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1 group-hover/sum:text-white">{title}</span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </details>
  )
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

function H4({ children }: { children: ReactNode }) {
  return <h4 className="text-sm font-semibold text-gray-900">{children}</h4>
}

function Para({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-gray-700">{children}</p>
}
