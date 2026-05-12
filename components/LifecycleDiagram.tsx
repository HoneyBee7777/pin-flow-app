'use client'

import {
  LIFECYCLE_CATEGORIES,
  getArrowLabels,
  type ArrowLabel,
  type LifecycleSlug,
} from '@/lib/pin-lifecycle-data'
import type { PinAnalyticsThresholds } from '@/app/dashboard/analytics/utils'

// Gemeinsames SVG-Diagramm für Pin-Lebenszyklus. Wird sowohl von der
// Strategie-Vollversion als auch von der Mini-Variante im Top-Pins-Tab
// gerendert — so bleibt das Bild überall identisch und Schwellenwerte
// werden einmal an einer Stelle dynamisch eingesetzt.
//
// Layout
// ------
// viewBox 620×420 mit y-Versatz -25. Reihen auf y=20, y=140, y=240; Trunk
// bend bei y=325. Tag-Skala bei y=335 und Legende bei y=378 — beides direkt
// im SVG, sodass das Bild auch beim Verkleinern als Mini-Variante alle
// erklärenden Elemente mitbringt.
// V2.3.11: vertikale Korridore zwischen Reihen auf 60/40 px erweitert.
// V2.3.14: Spalte 3 um 80 px nach rechts geschoben (x=480-590), viewBox
// entsprechend breiter — die Beschriftungen der horizontalen Pfeile passen
// jetzt einzeilig in die 160 px breite Lücke zwischen Spalte 2 und 3.
//
// Pfeile
// ------
//   - Default grau (#6b7280) durchgezogen, dick (2.5px)  — häufige automatische Übergänge
//   - Gestrichelt grau, dünn (1.5px)                      — durch Nutzer-Aktion ausgelöst
//
// Aktion-induzierte (gestrichelte) Übergänge: Hidden Gem → Top Performer
// (Keyword-Optimierung) und Reichweite o.W. → Top Performer (Cover/Hook
// optimiert).
//
// Labels
// ------
// Jedes Label hat Bedeutung („main", 11px dunkelgrau, ggf. mehrzeilig) und
// optional Bedingung („condition", 9px kursiv hellgrau, ggf. mehrzeilig).
// Im Compact-Modus (Mini-Variante) wird die Condition weggelassen.
export default function LifecycleDiagram({
  thresholds,
  active,
  onSelect,
  compact = false,
}: {
  thresholds: PinAnalyticsThresholds
  active: LifecycleSlug | null
  onSelect: (slug: LifecycleSlug) => void
  compact?: boolean
}) {
  const labels = getArrowLabels(thresholds)

  // Tag-Skala (V2.3.7 Fix 7): Phasen-Grenzen aus den Settings, damit das
  // Diagramm das wiedergibt, was die Diagnose-Logik wirklich nutzt.
  const earlyEnd = thresholds.beobachtungszeitraum
  const activeEnd = thresholds.topPerformerMaxAlter
  const oldStart = thresholds.schlafenderGewinnerAlter
  // V2.3.14: Phase-x an die neuen Spalten-Mittelpunkte ausgerichtet
  // (Spalte 1 mid=75, Spalte 2 mid=265, Übergang 2→3 mid=400,
  // Spalte 3 mid=535) — vorher hingen die Markierungen in der Luft.
  const tagPhases = [
    { range: `Tag 1–${earlyEnd}`, label: 'Anlauf', x: 75 },
    { range: `Tag ${earlyEnd}–${activeEnd}`, label: 'Bewertung', x: 265 },
    { range: `Tag ${activeEnd}–${oldStart}`, label: 'Aktiv', x: 400 },
    { range: `${oldStart}+ Tage`, label: 'Alt', x: 535 },
  ]

  return (
    <svg
      viewBox="0 -25 620 420"
      className="h-auto w-full"
      role="img"
      aria-label="Pin-Lebenszyklus-Diagramm"
    >
      <defs>
        <marker
          id="lc-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
        </marker>
      </defs>

      {/* Automatische Übergänge — durchgezogene graue Pfeile.
          V2.3.7 Fix 4: dicker (2.5) als die gestrichelten Aktion-Pfeile,
          damit die häufigen automatischen Pfade visuell dominieren.
          V2.3.7 Fix 8: Pfeil „Noch zu früh → Top Performer direkt"
          entfernt — Sonderfall, gehört nicht ins Übersichts-Diagramm. */}
      <g
        fill="none"
        stroke="#6b7280"
        strokeWidth="2.5"
        markerEnd="url(#lc-arrow)"
      >
        <path d="M 130 50 L 210 50" />
        <path d="M 130 50 L 170 50 L 170 270 L 210 270" />
        <path d="M 130 50 L 170 50 L 170 325 L 535 325 L 535 300" />
        <path d="M 320 170 L 480 170" />
        {/* Saves: Linie + Spitze grau (V2.3.5 Fix 1), nur ↓ im Label rot */}
        <path d="M 320 270 L 480 270" />
      </g>

      {/* Beschriftungen — V2.3.12: alle Hintergrund-Rects entfernt. Labels
          stehen jetzt entweder in freiem Raum oder neben den Pfeilen
          (nicht mehr auf ihnen). */}
      {/* Pfeil 1: Noch zu früh → Hidden Gem.
          Über dem horizontalen Pfeil im Bereich y < 20 (oberhalb der Boxen). */}
      <ArrowLabelGroup
        cx={170}
        cy={0}
        label={labels.zuHiddenGem}
        compact={compact}
      />

      {/* Pfeil 2: Noch zu früh → Reichweite o.W.
          Im leeren Raum unter „Noch zu früh", links neben dem Bend
          (170, 270) — V2.3.11: untere Box-Reihe steht jetzt 40 Einheiten
          tiefer, also wandert der Bend und das Label mit. */}
      <ArrowLabelGroup
        cx={90}
        cy={270}
        label={labels.zuReichweiteOhneWirkung}
        compact={compact}
      />

      {/* Pfeil 3: Noch zu früh → Stiller Pin (langer Umweg).
          ÜBER der horizontalen Trunk-Strecke bei y=325 (V2.3.11 —
          Trunk-Bend wandert mit der unteren Box-Reihe nach unten). */}
      <ArrowLabelGroup
        cx={300}
        cy={312}
        label={labels.langWegStillerPin}
        compact={compact}
      />

      {/* Pfeil 4: Hidden Gem → Aktiver Top Performer (gestrichelt, durch
          Aktion). V2.3.14: rechts neben den gestrichelten Pfeil. Text
          startet bei x=325 (5 px rechts der Hidden-Gem-Box-Kante x=320)
          mit textAnchor="start" — die 160 px breite Lücke zwischen
          Spalte 2 und 3 bietet jetzt Raum, und der Pfeil bei x=265 läuft
          nicht mehr durch den Text. */}
      <ArrowLabelGroup
        cx={325}
        cy={113}
        label={labels.zuTopPerformerVonHiddenGem}
        compact={compact}
        textAnchor="start"
      />

      {/* Pfeil 5: Top Performer → Eingeschlafener Gewinner.
          V2.3.14: cx=400 (Mitte des 160-px-Pfeils zwischen x=320 und x=480),
          cy=156. Label ist jetzt einzeilig (Datenfile geändert) und sitzt
          OBERHALB des horizontalen Pfeils bei y=170. Cond-Baseline y=165,
          Glyph-Bottom y=167 — 1.75 px Abstand zur Pfeil-Oberkante. */}
      <ArrowLabelGroup
        cx={400}
        cy={156}
        label={labels.zuEingeschlafenerGewinner}
        compact={compact}
      />

      {/* Pfeil 6: Reichweite o.W. → Top Performer (Cover funktioniert).
          V2.3.14: rechts neben den gestrichelten Pfeil — analog zu Pfeil 4.
          Text startet bei x=325 mit textAnchor="start". */}
      <ArrowLabelGroup
        cx={325}
        cy={220}
        label={labels.coverFunktioniert}
        compact={compact}
        textAnchor="start"
      />

      {/* Pfeil 7: Saves gehen runter. Spezialfall — ↓ rot, Wort grau,
          Pfeil-Linie bleibt grau (V2.3.5/6 Fix).
          V2.3.14: einzeilig, cx=400 (Mitte des verlängerten Pfeils), cy=263
          (7 px oberhalb des Pfeils bei y=270). Die 160-px-Lücke bietet
          jetzt Platz für die volle Phrase „↓ Saves gehen runter"
          ohne Zeilenumbruch. */}
      <SavesLabel cx={400} cy={263} />

      {/* Aktion-induzierte Übergänge — gestrichelt, dünner (1.5).
          V2.3.14: durchgehende Pfeile (kein Split mehr), weil die Labels
          jetzt rechts neben den Pfeilen sitzen statt auf ihnen.
          stroke-dasharray direkt am path (V2.3.10), damit DOM-Selektoren
          wie `querySelectorAll('[stroke-dasharray]')` greifen.
          Hidden Gem → Top Performer durch Keyword-Optimierung;
          Reichweite o.W. → Top Performer durch Cover/Hook. */}
      <g
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
        markerEnd="url(#lc-arrow)"
      >
        <path d="M 265 80 L 265 140" strokeDasharray="4 2" />
        <path d="M 265 240 L 265 200" strokeDasharray="4 2" />
      </g>

      {/* START-Marker (V2.3.7 Fix 3): macht klar, wo der Pin-Lebenszyklus
          beginnt. Subtil — kleine Caps-Beschriftung über der Startbox. */}
      <text
        x={75}
        y={12}
        fontSize="7"
        fontWeight="700"
        fill="#9ca3af"
        textAnchor="middle"
        letterSpacing="0.8"
      >
        START
      </text>

      {/* Boxen — werden nach den Pfeilen gezeichnet, damit sie Pfeil-Enden
          überdecken und die Click-Targets oben liegen. */}
      {LIFECYCLE_CATEGORIES.map((c) => {
        const isActive = active === c.slug
        const cx = c.x + c.width / 2
        const isMultiLineName = c.nameLines.length > 1
        // Inhalts-Layout: Emoji oben, Titel (1 oder 2 Zeilen) Mitte,
        // shortAction unten — alle vertikal innerhalb der 60px-Box.
        const nameStartY = isMultiLineName ? 28 : 34
        return (
          <g
            key={c.slug}
            id={`lifecycle-${c.slug}`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(c.slug)}
          >
            <rect
              x={c.x}
              y={c.y}
              width={c.width}
              height={c.height}
              rx={6}
              ry={6}
              fill={c.svgFill}
              stroke={c.svgStroke}
              strokeWidth={isActive ? 2.5 : 1.25}
            />
            <text x={cx} y={c.y + 16} fontSize="12" textAnchor="middle">
              {c.emoji}
            </text>
            {c.nameLines.map((line, i) => (
              <text
                key={i}
                x={cx}
                y={c.y + nameStartY + i * 9}
                fontSize="8"
                fontWeight="700"
                fill="#111827"
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
            <text
              x={cx}
              y={c.y + 53}
              fontSize="7"
              fill="#4b5563"
              fontStyle="italic"
              textAnchor="middle"
            >
              {c.shortAction}
            </text>
          </g>
        )
      })}

      {/* Tag-Skala (V2.3.7 Fix 7): horizontale Zeitachse unter dem Diagramm
          zeigt typische Phasen-Längen. Werte aus den Settings, damit das
          Diagramm mit der Klassifikations-Logik konsistent bleibt. */}
      <g aria-hidden>
        <line
          x1={20}
          y1={335}
          x2={590}
          y2={335}
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {/* Phasen-Trennstriche — Mittelpunkte zwischen den Phase-x-Positionen */}
        {[170, 333, 468].map((x) => (
          <line
            key={x}
            x1={x}
            y1={332}
            x2={x}
            y2={338}
            stroke="#9ca3af"
            strokeWidth="1"
          />
        ))}
        {tagPhases.map((phase, i) => (
          <g key={i}>
            <text
              x={phase.x}
              y={346}
              fontSize="8"
              fill="#374151"
              textAnchor="middle"
            >
              {phase.range}
            </text>
            <text
              x={phase.x}
              y={356}
              fontSize="7"
              fontStyle="italic"
              fill="#6b7280"
              textAnchor="middle"
            >
              {phase.label}
            </text>
          </g>
        ))}
      </g>

      {/* Legende (V2.3.7 Fix 5): erklärt den Unterschied zwischen
          automatischen und Aktion-induzierten Übergängen direkt im SVG.
          So braucht es keine separate Legende neben dem Diagramm — die
          Mini-Variante in Top Pins bekommt sie automatisch mit. */}
      <g transform="translate(60, 378)" aria-label="Legende">
        <line
          x1="0"
          y1="0"
          x2="22"
          y2="0"
          stroke="#6b7280"
          strokeWidth="2.5"
        />
        <text x="28" y="3" fontSize="8" fill="#6b7280">
          automatischer Übergang
        </text>
        <line
          x1="200"
          y1="0"
          x2="222"
          y2="0"
          stroke="#6b7280"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <text x="228" y="3" fontSize="8" fill="#6b7280">
          durch deine Aktion ausgelöst
        </text>
      </g>
    </svg>
  )
}

// Renderer für eine 1–2-zeilige Bedeutung + optionale 1–2-zeilige Bedingung.
// Im Compact-Modus wird die Condition weggelassen — die Bedeutung reicht
// für den Schnell-Überblick in der Mini-Variante.
// V2.3.12: Hintergrund-Rects komplett entfernt. Die Labels sitzen jetzt
// neben den Pfeilen (nicht auf ihnen), brauchen also keinen weißen
// Hintergrund mehr. Vorher verdeckten die Rects sogar sichtbar Pfeile —
// insbesondere den horizontalen Pfeil von Top Performer zu Eingeschlafener.
function ArrowLabelGroup({
  cx,
  cy,
  label,
  compact,
  textAnchor = 'middle',
}: {
  cx: number
  cy: number
  label: ArrowLabel
  compact: boolean
  // V2.3.14: optional links-/rechtsbündig — wird für die Labels gebraucht,
  // die rechts neben einem gestrichelten Pfeil starten (text-anchor=start).
  textAnchor?: 'start' | 'middle' | 'end'
}) {
  const conditionLines = compact ? [] : label.condition

  // V2.3.10: Schriftgrößen 9 / 8 (vorher 11 / 9), Zeilenhöhen + Ascent
  // entsprechend angepasst — kleinere Schrift, weniger Box-Überlappung.
  const mainLineHeight = 10
  const conditionLineHeight = 9
  const sectionGap = 3

  const top = cy - (label.main.length * mainLineHeight +
    conditionLines.length * conditionLineHeight +
    (conditionLines.length > 0 ? sectionGap : 0)) / 2
  const firstBaseline = top + 7 // ascent (~7 bei 9px)

  return (
    <g>
      {label.main.map((line, i) => (
        <text
          key={`m${i}`}
          x={cx}
          y={firstBaseline + i * mainLineHeight}
          textAnchor={textAnchor}
          fontSize="9"
          fill="#374151"
        >
          {line}
        </text>
      ))}
      {conditionLines.map((line, i) => {
        const baseline =
          firstBaseline +
          label.main.length * mainLineHeight +
          sectionGap +
          i * conditionLineHeight
        return (
          <text
            key={`c${i}`}
            x={cx}
            y={baseline}
            textAnchor={textAnchor}
            fontSize="8"
            fontStyle="italic"
            fill="#6b7280"
          >
            {line}
          </text>
        )
      })}
    </g>
  )
}

// Sondersanfertigung für den Saves-Pfeil: ↓ rot als visueller Akzent,
// „Saves gehen runter" in normaler Textfarbe.
// V2.3.14: einzeilig, weil die horizontale Lücke zwischen Reichweite und
// Stiller Pin nach der Spalte-3-Verschiebung 160 px breit ist.
function SavesLabel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fontSize="9"
        fill="#374151"
      >
        <tspan fill="#dc2626">↓</tspan>
        <tspan> Saves gehen runter</tspan>
      </text>
    </g>
  )
}
