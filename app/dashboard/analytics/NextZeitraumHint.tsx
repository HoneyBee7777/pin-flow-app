'use client'

import { formatDateDe } from './utils'

export default function NextZeitraumHint({
  von,
  bis,
}: {
  von: string | null
  bis: string | null
}) {
  const hasPrevious = !!von
  return (
    <div className="rounded-md border border-teal-200 border-l-[3px] border-l-teal-400 bg-teal-50 p-3 text-sm leading-relaxed text-teal-900">
      <p>
        <span className="mr-1" aria-hidden>
          📅
        </span>
        {hasPrevious ? (
          <>
            <strong>Dein nächster Zeitraum:</strong> {formatDateDe(von)} bis{' '}
            {formatDateDe(bis)}
            <br />
            Stelle in Pinterest Analytics unter „Benutzerdefiniert" genau
            diesen Zeitraum ein bevor du die Zahlen abliest.
          </>
        ) : (
          <>
            <strong>Erstes Update:</strong> Wähle einen beliebigen
            Startzeitpunkt für dein erstes Update.
          </>
        )}
      </p>
    </div>
  )
}
