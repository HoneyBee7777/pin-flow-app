'use client'

import type { AudienceInsight } from '@/lib/audience-types'
import CoachingParagraphs from '@/components/CoachingParagraphs'

// V3.0 — Sektion D des Audience-Tabs: Heuristik-Volltext + Schnell-Pillen.
// V3.0.1: visuell als Coaching-Block im bekannten App-Stil — lila Hintergrund,
// linker 3-px-Akzentbalken, 🎯-Emoji im Titel (analog `MyStrategy.tsx:993` und
// den restlichen V2.1/V2.2-Coaching-Hinweisen). Wird im Tab direkt unter dem
// Audience-Größe-Block prominent platziert, damit die handlungsrelevante
// Botschaft ohne Scrollen sichtbar ist.

export default function AudienceInsightSummary({
  insight,
}: {
  insight: AudienceInsight
}) {
  return (
    <section className="rounded-md border border-purple-200 border-l-[3px] border-l-purple-400 bg-purple-50 p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-purple-900">
        <span aria-hidden>🎯</span>
        Deine Zielgruppe auf einen Blick
      </h3>
      <div className="mt-3 text-sm text-purple-900">
        {insight.coachingBlock ? (
          // V3.0.9 — identischer 3-Absatz-Coaching-Text wie auf dem
          // Dashboard (gleiche Heuristik-Quelle, gleicher Renderer).
          <CoachingParagraphs block={insight.coachingBlock} />
        ) : (
          // Edge-Case ohne Top-Affinität: heuristischer Fließtext.
          <p className="leading-relaxed">{insight.summary}</p>
        )}
      </div>
      {insight.topAffinities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.topAffinities.map((c) => (
            <span
              key={c.category}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-medium text-purple-900"
              title={`Affinitäts-Index ${c.affinity.toFixed(2).replace('.', ',')}`}
            >
              <span aria-hidden>🟢</span>
              {c.category}
              <span className="tabular-nums text-purple-700">
                {c.affinity.toFixed(2).replace('.', ',')}
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
