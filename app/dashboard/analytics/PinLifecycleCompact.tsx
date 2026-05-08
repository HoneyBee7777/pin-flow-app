'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LifecycleDiagram from '@/components/LifecycleDiagram'
import type { LifecycleSlug } from '@/lib/pin-lifecycle-data'
import type { PinAnalyticsThresholds } from './utils'

const STORAGE_KEY = 'pin_lifecycle_compact_collapsed'

// Mini-Variante des Pin-Lebenszyklus für den Top-Pins-Tab. Rendert exakt
// dasselbe SVG wie die Vollversion (geteilt über `LifecycleDiagram`) — so
// gibt es eine Single-Source-of-Truth für das Layout, und die Mini-Variante
// erbt automatisch jede Verbesserung der Vollversion.
//
// Klick auf eine Box → Strategie-Seite mit `?tab=analytics#lifecycle-{slug}`,
// die Vollversion liest den Hash und scrollt zur passenden Kategorie.
export default function PinLifecycleCompact({
  thresholds,
}: {
  thresholds: PinAnalyticsThresholds
}) {
  const router = useRouter()
  // Default: ausgeklappt beim ersten Besuch. localStorage merkt sich
  // ausschließlich das Eingeklappt-Sein — gibt es keinen Wert, ist offen.
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') {
        setCollapsed(true)
      }
    } catch {
      // localStorage nicht verfügbar — Default-Verhalten (offen) reicht.
    }
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        if (next) {
          window.localStorage.setItem(STORAGE_KEY, '1')
        } else {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // ignore
      }
      return next
    })
  }

  function handleSelect(slug: LifecycleSlug) {
    router.push(`/dashboard/strategie?tab=analytics#lifecycle-${slug}`)
  }

  return (
    <section
      aria-label="Pin-Lebenszyklus auf einen Blick"
      className="rounded-md border border-gray-200 bg-white p-3"
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-gray-900 hover:text-gray-700"
        aria-expanded={!collapsed}
      >
        <span>🔄 Pin-Lebenszyklus auf einen Blick</span>
        <span aria-hidden className="text-gray-400">
          {collapsed ? '▶' : '▼'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
            {/* Verkleinert über max-w + h-auto. Boxen bleiben klickbar und
                navigieren zur Vollversion. */}
            <div className="mx-auto max-w-2xl">
              <LifecycleDiagram
                thresholds={thresholds}
                active={null}
                onSelect={handleSelect}
                compact
              />
            </div>
          </div>

          <Link
            href="/dashboard/strategie?tab=analytics#lifecycle-section"
            className="inline-flex items-center text-xs font-medium text-red-600 hover:underline"
          >
            → Vollständige Erklärung — wie sich Pins typischerweise
            entwickeln
          </Link>
        </div>
      )}
    </section>
  )
}
