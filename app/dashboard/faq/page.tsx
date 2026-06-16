// V3.4 — App-FAQ: 18 FAQs in 6 Kategorien als kategorisierte Accordions.
// Inhalte liegen in lib/faq-content.ts, Rendering/Toggle in FaqAccordion.

import Link from 'next/link'
import { FAQ_CATEGORIES } from '@/lib/faq-content'
import FaqAccordion from './FaqAccordion'

export default function FaqPage() {
  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">FAQ</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          Hier findest du Antworten auf häufige Fragen zur Nutzung von
          Pin-Flow. Für tiefere Strategie-Themen schau in den Bereich{' '}
          <Link
            href="/dashboard/strategie"
            className="font-medium text-red-600 hover:underline"
          >
            Pinterest-Wissen
          </Link>
          .
        </p>
      </header>

      {FAQ_CATEGORIES.map((category, ci) => (
        <section key={ci} className="space-y-3">
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {ci + 1}. {category.title}
            </h2>
            {category.intro && (
              <p className="mt-1 text-sm text-gray-600">{category.intro}</p>
            )}
          </div>
          <div className="space-y-3">
            {category.items.map((item, ii) => (
              <FaqAccordion key={ii} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
