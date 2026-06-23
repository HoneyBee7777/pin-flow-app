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
    <div className="rounded-md border border-hinweis-merke-rand border-l-[3px] border-l-hinweis-merke-stripe bg-hinweis-merke-flaeche p-3 text-sm leading-relaxed text-hinweis-merke-text">
      <p>
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
