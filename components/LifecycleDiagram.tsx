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
// Layout (V2.3.6 — Boxen ein Drittel kleiner)
// -------------------------------------------
// viewBox 540×450 mit y-Versatz -30. Box-Koordinaten kommen aus
// LIFECYCLE_CATEGORIES: 110×60 statt zuvor 160×80. Korridore zwischen den
// Spalten bleiben 80px breit für Pfeil-Beschriftungen.
//
// Pfeile
// ------
//   - Default grau (#6b7280) durchgezogen — automatischer Übergang
//   - Gestrichelt grau                    — Aktion-induzierter Übergang
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

  return (
    <svg
      viewBox="0 -30 540 450"
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
          Die 4 Pfeile aus „Noch zu früh" teilen den Trunk (x=170, y=50 ↓). */}
      <g
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
        markerEnd="url(#lc-arrow)"
      >
        <path d="M 130 50 L 210 50" />
        <path d="M 130 50 L 170 50 L 170 170 L 210 170" />
        <path d="M 130 50 L 170 50 L 170 290 L 210 290" />
        <path d="M 130 50 L 170 50 L 170 350 L 455 350 L 455 320" />
        <path d="M 320 170 L 400 170" />
        {/* Saves: Linie + Spitze grau (V2.3.5 Fix 1), nur ↓ im Label rot */}
        <path d="M 320 290 L 400 290" />
      </g>

      {/* Aktion-induzierte Übergänge — gestrichelt. Beide passieren nur
          durch Nutzer-Aktion: Hidden Gem → Top Performer durch Keyword-
          Optimierung; Reichweite o.W. → Top Performer durch Cover/Hook. */}
      <g
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        markerEnd="url(#lc-arrow)"
      >
        <path d="M 265 80 L 265 140" />
        <path d="M 265 260 L 265 200" />
      </g>

      {/* Beschriftungen */}
      {/* Pfeil 1: Noch zu früh → Hidden Gem.
          Über dem horizontalen Pfeil im Bereich y < 20 (oberhalb der Boxen). */}
      <ArrowLabelGroup
        cx={170}
        cy={-8}
        bgWidth={130}
        label={labels.zuHiddenGem}
        compact={compact}
      />

      {/* Pfeil 2: Noch zu früh → Top Performer (direkter Erfolg).
          Auf dem Trunk x=170 zwischen Abzweig (y=50) und Eintritt
          Top Performer (y=170). */}
      <ArrowLabelGroup
        cx={170}
        cy={110}
        bgWidth={155}
        label={labels.zuTopPerformerDirekt}
        compact={compact}
      />

      {/* Pfeil 3: Noch zu früh → Reichweite o.W.
          Im leeren Raum unter „Noch zu früh", links neben dem Bend
          (170, 290). */}
      <ArrowLabelGroup
        cx={90}
        cy={290}
        bgWidth={120}
        label={labels.zuReichweiteOhneWirkung}
        compact={compact}
        bgRect={false}
      />

      {/* Pfeil 4: Noch zu früh → Stiller Pin (langer Umweg).
          UNTER dem Pfeil platziert (V2.3.6 Fix 3) — Pfeil-Linie bleibt
          durchgehend sichtbar. */}
      <ArrowLabelGroup
        cx={300}
        cy={372}
        bgWidth={120}
        label={labels.langWegStillerPin}
        compact={compact}
        bgRect={false}
      />

      {/* Pfeil 5: Hidden Gem → Aktiver Top Performer.
          Rechts neben dem Trunk-Label im Korridor zwischen oberer und
          mittlerer Zeile — der Pfeil selbst ist nur 60px hoch und damit zu
          eng für ein 4-zeiliges Label. Spatial-Assoziation reicht: Label
          unmittelbar rechts vom Pfeil-Endpunkt. */}
      <ArrowLabelGroup
        cx={350}
        cy={110}
        bgWidth={120}
        label={labels.zuTopPerformerVonHiddenGem}
        compact={compact}
      />

      {/* Pfeil 6: Top Performer → Eingeschlafener Gewinner.
          Über dem horizontalen Pfeil y=170, ausgelagert in den Gap
          zwischen oberer und mittlerer Zeile. */}
      <ArrowLabelGroup
        cx={465}
        cy={115}
        bgWidth={108}
        label={labels.zuEingeschlafenerGewinner}
        compact={compact}
      />

      {/* Pfeil 7: Reichweite o.W. → Top Performer (Cover funktioniert).
          Auf dem gestrichelten Aufwärts-Pfeil zwischen den Boxen. */}
      <ArrowLabelGroup
        cx={265}
        cy={230}
        bgWidth={108}
        label={labels.coverFunktioniert}
        compact={compact}
      />

      {/* Pfeil 8: Saves gehen runter. Spezialfall — ↓ rot, Wort grau,
          Pfeil-Linie bleibt grau (V2.3.5/6 Fix). Über dem horizontalen
          Pfeil im Korridor zwischen RoW und Stiller Pin. */}
      <SavesLabel cx={360} cy={278} />

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
            <text x={cx} y={c.y + 16} fontSize="14" textAnchor="middle">
              {c.emoji}
            </text>
            {c.nameLines.map((line, i) => (
              <text
                key={i}
                x={cx}
                y={c.y + nameStartY + i * 9}
                fontSize="9"
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
              fontSize="7.5"
              fill="#4b5563"
              fontStyle="italic"
              textAnchor="middle"
            >
              {c.shortAction}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Renderer für eine 1–2-zeilige Bedeutung + optionale 1–2-zeilige Bedingung.
// Im Compact-Modus wird die Condition weggelassen — die Bedeutung reicht
// für den Schnell-Überblick in der Mini-Variante.
function ArrowLabelGroup({
  cx,
  cy,
  bgWidth,
  label,
  compact,
  bgRect = true,
}: {
  cx: number
  cy: number
  bgWidth: number
  label: ArrowLabel
  compact: boolean
  bgRect?: boolean
}) {
  const conditionLines = compact ? [] : label.condition

  // Approximierte Zeilenhöhe — perfekt zentriert ist nicht nötig, das Auge
  // verzeiht ein paar Pixel.
  const mainLineHeight = 11
  const conditionLineHeight = 10
  const totalHeight =
    label.main.length * mainLineHeight +
    conditionLines.length * conditionLineHeight +
    4

  const top = cy - totalHeight / 2
  const firstBaseline = top + 9 // ascent ~8 bei 11px-Schrift

  return (
    <g>
      {bgRect && (
        <rect
          x={cx - bgWidth / 2}
          y={top}
          width={bgWidth}
          height={totalHeight}
          fill="#f9fafb"
          rx={2}
        />
      )}
      {label.main.map((line, i) => (
        <text
          key={`m${i}`}
          x={cx}
          y={firstBaseline + i * mainLineHeight}
          textAnchor="middle"
          fontSize="11"
          fill="#374151"
        >
          {line}
        </text>
      ))}
      {conditionLines.map((line, i) => {
        const baseline =
          firstBaseline +
          label.main.length * mainLineHeight +
          1 +
          i * conditionLineHeight
        return (
          <text
            key={`c${i}`}
            x={cx}
            y={baseline}
            textAnchor="middle"
            fontSize="9"
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
// „Saves gehen runter" in normaler Textfarbe. Zwei Zeilen, da der Korridor
// zwischen RoW und Stiller Pin nur ~80px breit ist.
function SavesLabel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fontSize="11"
        fill="#374151"
      >
        <tspan fill="#dc2626">↓</tspan>
        <tspan> Saves gehen</tspan>
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fontSize="11"
        fill="#374151"
      >
        runter
      </text>
    </g>
  )
}
