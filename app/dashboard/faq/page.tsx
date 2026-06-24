// V3.4 — App-FAQ: kategorisierte Accordions (6 Kategorien). Anzahl der
// Einträge bewusst nicht hartkodiert, damit der Hinweis nicht veraltet.
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
          Hier findest du Antworten auf die häufigsten Fragen rund um Pin-Flow.
          Geht es dir um die tiefere Pinterest-Strategie, schaue in den Bereich{' '}
          <Link
            href="/dashboard/strategie"
            className="font-medium text-link underline underline-offset-2"
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
