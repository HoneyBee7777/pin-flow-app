// Platzhalter-FAQs — Inhalte werden später ergänzt. Beim Pflegen einfach
// neue Einträge mit `frage`/`antwort` ans Ende des Arrays anhängen.
const FAQS: Array<{ frage: string; antwort: string }> = [
  // {
  //   frage: 'Beispiel-Frage?',
  //   antwort: 'Beispiel-Antwort hier eintragen.',
  // },
]

export default function FaqPage() {
  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">FAQ</h1>
        <p className="mt-2 text-sm text-gray-600">
          Häufige Fragen rund um Pinterest-Strategie, Pin-Produktion und die
          Nutzung dieser App.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {FAQS.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Noch keine FAQ-Einträge gepflegt — Inhalte folgen.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {FAQS.map((faq, i) => (
              <li key={i} className="py-3">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                    <span
                      aria-hidden
                      className="text-gray-400 group-open:rotate-90"
                    >
                      ▸
                    </span>
                    {faq.frage}
                  </summary>
                  <p className="mt-2 pl-5 text-sm leading-relaxed text-gray-700">
                    {faq.antwort}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
