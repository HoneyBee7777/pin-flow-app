// V3.5 — Schritt-/Phasen-Indikator. Zeigt die aktuelle Phase, „Schritt X
// von 13" und eine Punkte-Leiste. Auf Mobile kompakt (Punkte ausgeblendet,
// nur Text).

import {
  ONBOARDING_PHASES,
  type OnboardingStepDef,
} from '@/lib/onboarding-content'
import { ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-state'

export default function OnboardingStepIndicator({
  step,
}: {
  step: OnboardingStepDef
}) {
  const phases = [
    ONBOARDING_PHASES.einstieg,
    ONBOARDING_PHASES.setup,
    ONBOARDING_PHASES.produktion,
  ]

  return (
    <div className="space-y-3">
      {/* Phasen-Reihe — die aktive Phase hervorgehoben */}
      <div className="flex flex-wrap gap-2">
        {phases.map((p) => {
          const active = p.key === step.phase.key
          return (
            <span
              key={p.key}
              className={
                active
                  ? 'rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white'
                  : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500'
              }
            >
              {p.label}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">
          Schritt {step.id + 1} von {ONBOARDING_TOTAL_STEPS}
          {step.phaseProgress && (
            <span className="ml-2 text-gray-400">· {step.phaseProgress}</span>
          )}
        </p>
        {/* Punkte-Leiste — auf sehr kleinen Screens ausgeblendet */}
        <div className="hidden gap-1 sm:flex">
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={
                i === step.id
                  ? 'h-2 w-4 rounded-full bg-red-600'
                  : i < step.id
                    ? 'h-2 w-2 rounded-full bg-red-300'
                    : 'h-2 w-2 rounded-full bg-gray-200'
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
