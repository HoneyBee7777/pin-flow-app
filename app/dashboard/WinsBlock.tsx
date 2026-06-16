// V3.3 — Dashboard-Sektion „Was hat funktioniert?".
//
// Sitzt zwischen Profil-Status („Wo stehe ich?") und Gesamt-Profil-
// Performance („Wie entwickelt sich's?") und ist der emotionale Übergang:
// Anerkennung der Erfolge der letzten 30 Tage. Erstes Element der App,
// das den Käufer für Fortschritt belohnt statt nur Probleme zu zeigen.
//
// Conditional Rendering: Die Sektion erscheint NUR, wenn echte Erfolge
// vorliegen (hasShowableWins). Sonst rendert die Komponente nichts —
// kein Leer-State, kein „Noch keine Erfolge"-Platzhalter.
//
// Visueller Stil: weiße Sektions-Box wie die Nachbar-Sektionen, darin der
// lila Coaching-Block (.coaching-box) konsistent zu ZielgruppeCoaching-
// Block. 🎉 (nicht 🎯) signalisiert die positive Stimmung.

import type { ReactNode } from 'react'
import type { ProfilAnalyticsWithGrowth } from './analytics/utils'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import {
  hasShowableWins,
  buildWinsBlock,
  type WinsInput,
} from '@/lib/dashboard-wins'

// Sparsame **fett**-Marker aus der Heuristik zu <strong> auflösen —
// gleiche Logik wie in components/CoachingParagraphs.tsx, hier lokal, weil
// dort Variante 'B' einen (für Wins unpassenden) Brücken-Themen-Link
// einzieht.
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

export default function WinsBlock({
  latest,
  previous,
  nicheProfile,
  maxPinImpressionen,
}: {
  latest: ProfilAnalyticsWithGrowth | null
  previous: ProfilAnalyticsWithGrowth | null
  nicheProfile: AccountNicheProfile
  maxPinImpressionen: number
}) {
  // Ohne latest-Snapshot gibt es nichts zu feiern.
  if (!latest) return null

  const input: WinsInput = {
    klicksGrowth: latest.klicks_growth,
    savesGrowth: latest.saves_growth,
    engagementGrowth: latest.engagement_growth,
    ctrGrowth: latest.ctr_growth,
    impressionenGrowth: latest.impressionen_growth,
    interagierendGrowth: latest.interagierend_growth,
    engagementPct: latest.engagement,
    ctrPct: latest.ctr,
    hasPrevious: previous !== null,
    nicheLabel: nicheProfile.primaryNiche?.label ?? null,
    maxPinImpressionen,
  }

  if (!hasShowableWins(input)) return null

  const block = buildWinsBlock(input)

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-semibold text-gray-900">
          🎉 Was hat funktioniert?
        </p>
        <p className="mt-1 text-sm text-gray-700">
          Deine Erfolge der letzten 30 Tage.
        </p>
      </div>

      {/* Lila Coaching-Block — identisches Layout wie ZielgruppeCoaching-
          Block (.coaching-box in globals.css): linker 3-px-Akzentbalken,
          lila Flächen-/Textfarbe. */}
      <div className="coaching-box">
        <div className="space-y-2">
          <p className="leading-relaxed">
            {renderWithBold(block.observation)}
          </p>
          <p className="leading-relaxed">
            {renderWithBold(block.hypothesis)}
          </p>
          <p className="leading-relaxed">
            {renderWithBold(block.reflection)}
          </p>
        </div>
      </div>
    </section>
  )
}
