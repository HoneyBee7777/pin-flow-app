'use client'

import Link from 'next/link'
import type { AudienceSnapshot } from '@/lib/audience-types'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import { generateAudienceInsights } from '@/lib/audience-insights'
import CoachingParagraphs from '@/components/CoachingParagraphs'

// V3.0.8 — Zielgruppe als Coaching-Block INNERHALB der Performance-Sektion,
// direkt unter dem Kontext-Streifen. Ersetzt das ehemalige Standalone-
// Dashboard-Widget (AudienceWidget).
//
// Bewusst KEINE eigene Personen-Zahl und KEIN Erklär-Satz: die echte
// „Interagierende Zielgruppe" steht bereits eine Zeile höher im Kontext-
// Streifen (aus den Performance-Daten).
//
// V3.0.9 — Optik: keine 🎯-Überschrift, stattdessen das 🎯 klein in
// Textgröße vor dem ersten Absatz. Keine Affinitäts-Pillen. Die beiden
// Links stehen rot und ausserhalb der lila Box darunter.
//
// Der Coaching-Text (3 Absätze: Beobachtung → Warum → Reflexion) kommt
// aus `generateAudienceInsights().coachingBlock` — exakt dieselbe Quelle
// wie der Analytics-Tab, damit der Text an beiden Orten identisch ist.

export default function ZielgruppeCoachingBlock({
  snapshots,
  nicheProfile,
}: {
  // DESC nach Datum. Leeres Array → Block wird nicht gerendert.
  snapshots: AudienceSnapshot[]
  nicheProfile: AccountNicheProfile
}) {
  if (snapshots.length === 0) return null

  const latest = snapshots[0]
  const { coachingBlock } = generateAudienceInsights({
    snapshot: latest,
    nicheId: nicheProfile.primaryNiche?.id ?? null,
    nicheLabel: nicheProfile.primaryNiche?.label ?? null,
  })

  // Ohne Top-Affinität gibt es keinen sinnvollen Coaching-Text.
  if (!coachingBlock) return null

  return (
    <>
      {/* Identisches Layout wie die „Größter Hebel"-Coaching-Box im
          Strategie-Check (.coaching-box in globals.css): linker 3-px-
          Akzentbalken, lila Flächen-/Textfarbe, kein Vollrahmen. */}
      <div className="coaching-box mt-4">
        <CoachingParagraphs
          block={coachingBlock}
          leadIcon={<span aria-hidden>🎯</span>}
        />
      </div>

      {/* Links rot und ausserhalb der Box. Pfeil → bleibt außerhalb des
          verlinkten Bereichs — nur das Wort ist klickbar. „·" als Trenner. */}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          →{' '}
          <Link
            href="/dashboard/analytics?tab=audience"
            className="font-medium text-red-600 hover:underline"
          >
            Vollständige Analyse
          </Link>
        </span>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <span>
          →{' '}
          <Link
            href="/dashboard/strategie?tab=audience"
            className="font-medium text-red-600 hover:underline"
          >
            Zielgruppe verstehen
          </Link>
        </span>
      </p>
    </>
  )
}
