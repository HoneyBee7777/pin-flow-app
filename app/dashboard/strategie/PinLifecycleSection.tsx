'use client'

import { useEffect, useRef, useState } from 'react'
import LifecycleDiagram from '@/components/LifecycleDiagram'
import {
  LIFECYCLE_CATEGORIES,
  getCategory,
  getLifecycleDetails,
  type LifecycleSlug,
} from '@/lib/pin-lifecycle-data'
import type { PinAnalyticsThresholds } from '../analytics/utils'

// Vollversion des Pin-Lebenszyklus-Erklär-Moduls. Lebt als eigene
// Accordion-Sektion in der Strategie-Seite > Tab „Erfolg messen". Reagiert auf
// `#lifecycle-section` (klappt auf) und `#lifecycle-{slug}` (klappt auf +
// aktiviert die passende Kategorie im Diagramm).
export default function PinLifecycleSection({
  thresholds,
}: {
  thresholds: PinAnalyticsThresholds
}) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<LifecycleSlug | null>(
    null
  )
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function readHash() {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.slice(1)
      if (!hash.startsWith('lifecycle')) return

      if (hash === 'lifecycle-section') {
        setOpen(true)
      } else {
        const slug = hash.replace(/^lifecycle-/, '') as LifecycleSlug
        if (LIFECYCLE_CATEGORIES.some((c) => c.slug === slug)) {
          setActiveCategory(slug)
          setOpen(true)
        }
      }

      // 100ms Delay: gibt React Zeit, das Accordion auszuklappen, bevor wir
      // hineinscrollen — sonst landet das Ziel im sichtbaren Bereich, aber
      // der Inhalt ist noch nicht aufgeklappt.
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }

    readHash()
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [])

  return (
    <details
      ref={detailsRef}
      id="lifecycle-section"
      className="group scroll-mt-4 rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
      open={open}
      onToggle={(e) =>
        setOpen((e.currentTarget as HTMLDetailsElement).open)
      }
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
        <span
          className="text-lg leading-none text-gray-400 transition-transform"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1">
          🔄 Pin-Lebenszyklus — wie deine Pins durch die Kategorien wandern
        </span>
      </summary>

      <div className="space-y-6 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
        <div className="rounded-md border border-amber-200 border-l-[3px] border-l-amber-500 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">
            <span aria-hidden className="mr-1">
              ⚠️
            </span>
            Wichtig: Niemals bestehende Pins bearbeiten.
          </p>
          <p className="mt-1">
            Wenn ein Pin nicht funktioniert, erstelle einen neuen Pin mit
            anderem Cover, Hook oder Keyword. Bestehende Pins haben bereits
            eine Pinterest-Bewertung — Änderungen verwirren den Algorithmus
            und kosten dich Reichweite. Backlinks und Saves bleiben sowieso
            am alten Pin.
          </p>
        </div>

        <p>
          Pinterest-Pins sind keine statischen Objekte. Sie haben einen
          Lebenszyklus — vom ersten Hochladen bis zum „Eingeschlafenen
          Gewinner“ oder „Stillen Pin“. Die App klassifiziert deine Pins
          jeden Monat neu: Bei jedem CSV-Import werden alle Pins automatisch
          neu bewertet. Hier siehst du, wie deine Pins typischerweise durch
          die Kategorien wandern — und wann eine Aktion sinnvoll ist.
        </p>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          {/* V2.3.7 Fix 1: max-width begrenzt die Render-Höhe auf ~600px,
              damit das Diagramm in einer Bildschirmansicht erfassbar bleibt. */}
          <div className="mx-auto hidden max-w-[900px] sm:block">
            <LifecycleDiagram
              thresholds={thresholds}
              active={activeCategory}
              onSelect={(slug) =>
                setActiveCategory(slug === activeCategory ? null : slug)
              }
            />
          </div>
          <div className="block space-y-2 sm:hidden">
            <p className="text-xs text-gray-500">
              Tipp: Auf größeren Bildschirmen zeigen wir hier ein Diagramm
              mit allen Übergängen. Tippe eine Kategorie an für Details.
            </p>
            {LIFECYCLE_CATEGORIES.map((c) => {
              const isActive = activeCategory === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() =>
                    setActiveCategory(isActive ? null : c.slug)
                  }
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${c.bgClass} ${c.borderClass} ${
                    isActive ? 'ring-2 ring-red-400' : ''
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-gray-900">
                      {c.name}
                    </span>
                    <span className="block text-xs text-gray-600">
                      {c.shortAction}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {activeCategory ? (
          <CategoryDetail
            slug={activeCategory}
            thresholds={thresholds}
          />
        ) : (
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Klick auf eine Kategorie für Details.
          </p>
        )}

        <ComparisonLevels />
      </div>
    </details>
  )
}

function CategoryDetail({
  slug,
  thresholds,
}: {
  slug: LifecycleSlug
  thresholds: PinAnalyticsThresholds
}) {
  const c = getCategory(slug)
  const d = getLifecycleDetails(thresholds)[slug]
  return (
    <div
      className={`rounded-md border ${c.borderClass} ${c.bgClass} p-4 text-sm leading-relaxed text-gray-800`}
    >
      <h4 className="mb-2 text-base font-semibold text-gray-900">
        {c.emoji} {c.name}
      </h4>
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-gray-900">Was bedeutet das?</p>
          <p className="text-gray-700">{d.was}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            Wie kommt ein Pin in diese Kategorie?
          </p>
          <ul className="ml-5 list-disc space-y-1 text-gray-700">
            {d.wieKommtEr.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            Was passiert als nächstes?
          </p>
          <ul className="ml-5 list-disc space-y-1 text-gray-700">
            {d.wasPassiert.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Was du tun solltest:</p>
          <p className="text-gray-700">{d.handlung}</p>
        </div>
      </div>
    </div>
  )
}

function ComparisonLevels() {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <h4 className="mb-2 text-base font-semibold text-gray-900">
        Womit werden deine Pins verglichen?
      </h4>
      <p className="text-gray-700">
        Die App nutzt zwei verschiedene Vergleichs-Ebenen:
      </p>

      <div className="mt-3 space-y-3">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="font-semibold text-blue-900">
            Ebene 1 — Vergleich gegen dich selbst (Profil-Median)
          </p>
          <ul className="ml-5 mt-1 list-disc space-y-1 text-gray-700">
            <li>
              <strong>Wofür:</strong> Die Pin-Klassifikation (Top Performer,
              Hidden Gem etc.)
            </li>
            <li>
              <strong>Wie:</strong> Jeder Pin wird gegen deinen Durchschnitt
              der letzten 90 Tage verglichen
            </li>
            <li>
              <strong>Vorteil:</strong> Skaliert mit dir mit. Was heute
              überdurchschnittlich ist, wird morgen zum Durchschnitt.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
          <p className="font-semibold text-purple-900">
            Ebene 2 — Vergleich gegen die Branche (Nischen-Benchmark)
          </p>
          <ul className="ml-5 mt-1 list-disc space-y-1 text-gray-700">
            <li>
              <strong>Wofür:</strong> Die Profil-Diagnose auf dem Dashboard
            </li>
            <li>
              <strong>Wie:</strong> Dein Median wird gegen den
              Branchenschnitt für deine Hauptnische verglichen
            </li>
            <li>
              <strong>Vorteil:</strong> Zeigt absolute Position. Du merkst,
              ob dein Profil systemisch unter Branchenschnitt liegt.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-amber-200 border-l-[3px] border-l-amber-400 bg-amber-50 p-3 text-amber-900">
        <p className="font-semibold">Warum beide Ebenen wichtig sind:</p>
        <p className="mt-1">
          Nur Eigenvergleich → du merkst nicht, dass dein Profil insgesamt
          unter Branchenschnitt liegt. Nur Branchenvergleich → neue Profile
          mit niedrigem Niveau hätten nie einen Top Performer. Die Mischform
          schützt vor beiden Fällen.
        </p>
      </div>
    </div>
  )
}

