import type { ReactNode } from 'react'
import Link from 'next/link'
import type { CoachingBlock } from '@/lib/audience-types'

// V3.0.9 — gemeinsamer Renderer für den 3-Absatz-Coaching-Text. Wird vom
// Dashboard-Performance-Block UND vom Analytics-Tab genutzt, damit der Text
// an beiden Orten garantiert identisch ist.
//
// Drei Absätze (Beobachtung → Warum → Reflexion), durch Leerzeilen-Abstand
// getrennt — KEINE Emoji-Trenner (Vorgabe: ruhig/seriös). Sparsame
// **fett**-Marker aus der Heuristik werden hier zu <strong> aufgelöst.
//
// Farbe/Schriftgröße erbt der Text vom Eltern-Container (.coaching-box bzw.
// der lila Analytics-Block), damit beide Orte ihren Stil behalten.

// Wandelt „… **wichtig** …" in React-Knoten mit <strong> um. Splittet an
// `**`; jedes ungerade Segment ist fett. Robust auch ohne/mit ungeraden
// Markern (dann bleibt der Rest normaler Text).
function renderWithBold(text: string): ReactNode[] {
  return text.split('**').map((segment, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {segment}
      </strong>
    ) : (
      <span key={i}>{segment}</span>
    )
  )
}

export default function CoachingParagraphs({
  block,
  leadIcon,
}: {
  block: CoachingBlock
  // Optionales Icon (z. B. 🎯) inline vor dem ersten Absatz.
  leadIcon?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="leading-relaxed">
        {leadIcon != null && <>{leadIcon} </>}
        {renderWithBold(block.observation)}
      </p>
      <p className="leading-relaxed">{renderWithBold(block.explanation)}</p>
      <p className="leading-relaxed">{renderWithBold(block.reflection)}</p>

      {/* V3.1 — nur Variante B (Mismatch): Brücken-Themen sind hier das
          Hauptthema, also direkt zum personalisierten Prompt verlinken.
          In A/C inhaltlich unpassend → kein Link. Pfeil → bleibt außerhalb
          des verlinkten Bereichs (nur das Wort ist klickbar). */}
      {block.variant === 'B' && (
        <p className="leading-relaxed">
          →{' '}
          <Link
            href="/dashboard/ressourcen#bruecken-themen"
            className="font-medium text-red-600 hover:underline"
          >
            Brücken-Themen-Ideen generieren
          </Link>
        </p>
      )}
    </div>
  )
}
