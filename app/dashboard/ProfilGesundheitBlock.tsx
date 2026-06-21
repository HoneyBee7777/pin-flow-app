// Richtungs-Ampel der Dashboard-Sektion „Profil-Performance".
// Zeigt NUR den einen aktuell zutreffenden Zustand: großer farbiger Punkt,
// das Status-Wort darunter — eine Ampel kommuniziert einen Status, keine
// Liste aller möglichen Status.
// Sitzt als oberste Kachel der Ergebnis-Spalte. Den Leerzustand (kein
// Vormonat) behandelt die Sektion selbst (computeRichtungsAmpel).

import {
  RICHTUNG_AMPEL_STUFEN,
  type RichtungsAmpelStatus,
} from '@/lib/profil-gesundheit'
import { StatusDot, type StatusTone } from '@/components/StatusDot'

// Richtungs-Status → einheitlicher Status-Ton (StatusDot/status-Tokens).
const RICHTUNG_TONE: Record<Exclude<RichtungsAmpelStatus, 'leer'>, StatusTone> =
  {
    rot: 'schlecht',
    gelb: 'achtung',
    gruen: 'gut',
  }

export function RichtungsAmpelVertikal({
  status,
}: {
  status: Exclude<RichtungsAmpelStatus, 'leer'>
}) {
  const stufe = RICHTUNG_AMPEL_STUFEN.find((s) => s.key === status)
  if (!stufe) return null

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <StatusDot tone={RICHTUNG_TONE[status]} size="lg" />
      <span className="text-sm font-semibold text-haupt">{stufe.label}</span>
    </div>
  )
}
