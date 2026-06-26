'use client'

// Geteilter „+ To-do"-Button für Empfehlungs-Stellen. Legt per Server Action
// eine Aufgabe an (mit Herkunft quelle/quelle_id) und zeigt dauerhaft
// „Gemerkt ✓", solange eine offene Aufgabe zu dieser Empfehlung existiert
// (bereitsGemerkt wird aus den offenen quelle_ids der Seite abgeleitet).
// Dezenter Stil: Outline, Petrol, Hover Camel.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addAufgabeAusEmpfehlung } from './actions/aufgaben'

export function MerkenButton({
  titel,
  faelligkeitsdatum,
  quelle,
  quelleId,
  bereitsGemerkt,
  label = '+ To-do',
}: {
  titel: string
  faelligkeitsdatum: string | null
  quelle: string
  quelleId: string
  bereitsGemerkt: boolean
  // Optionale Beschriftung des idle-Zustands. Default „+ To-do" — alle
  // bestehenden Aufrufe bleiben dadurch unverändert; nur die Board-Karten
  // übergeben hebelspezifische Kurz-Labels.
  label?: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'done' | 'fehler'>(
    bereitsGemerkt ? 'done' : 'idle'
  )
  const [isPending, startTransition] = useTransition()

  if (status === 'done') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md bg-status-gut-flaeche px-2 py-0.5 text-xs font-medium text-status-gut-text">
        Gemerkt ✓
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setStatus('idle')
          startTransition(async () => {
            const res = await addAufgabeAusEmpfehlung(
              titel,
              faelligkeitsdatum,
              quelle,
              quelleId
            )
            if (res.error) {
              setStatus('fehler')
            } else {
              setStatus('done')
              // Server-Komponente neu rendern, damit die neue Aufgabe sofort
              // unten in der Liste erscheint. router.refresh() mountet diese
              // Client-Komponente nicht neu → der „Gemerkt ✓"-State bleibt.
              router.refresh()
            }
          })
        }}
        className="inline-flex items-center whitespace-nowrap rounded-md border border-marke-blaugrau/30 px-2 py-0.5 text-xs font-medium text-marke-blaugrau transition-colors hover:border-marke-ocker hover:text-marke-ocker disabled:opacity-60"
      >
        {isPending ? 'Wird gemerkt …' : label}
      </button>
      {status === 'fehler' && (
        <span className="ml-2 text-xs text-status-schlecht-text">
          Konnte nicht gemerkt werden.
        </span>
      )}
    </>
  )
}
