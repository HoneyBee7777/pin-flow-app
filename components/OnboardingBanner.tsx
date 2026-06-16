'use client'

// V3.5 — Dashboard-Hinweis bei übersprungenem, nicht abgeschlossenem
// Onboarding. Schließbar (X) — die Schließung ist bewusst nur lokal/
// ephemer: bei einem neuen Login taucht der Banner wieder auf, solange
// onboarding.completed nicht true ist (Spec Fix 6).

import { useState } from 'react'
import Link from 'next/link'

export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border-l-[3px] border-l-sky-400 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <span className="flex-1">
        ⓘ Du hast das Onboarding übersprungen. Empfehlung: hol es nach — in
        10-15 Minuten bist du startklar.
      </span>
      <Link
        href="/dashboard/onboarding"
        className="font-medium text-sky-700 hover:underline"
      >
        → Onboarding starten
      </Link>
      <button
        type="button"
        aria-label="Hinweis schließen"
        onClick={() => setDismissed(true)}
        className="rounded px-2 py-0.5 text-sky-500 hover:bg-sky-100 hover:text-sky-700"
      >
        ✕
      </button>
    </div>
  )
}
