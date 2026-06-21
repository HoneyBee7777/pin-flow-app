// Flacher, wiederverwendbarer Status-/Ampel-Punkt.
//
// Bewusst KEIN Glanz, KEIN Verlauf, KEIN 3D: ein einfarbiger Kreis in der
// Status-Farbe (status-*) mit einem dezenten, weichen Tönungsring drumherum
// (status-*-flaeche). Projektweit nutzbar für alle Ampeln/Status-Anzeigen,
// damit Punkte überall identisch flach aussehen.

export type StatusTone = 'gut' | 'achtung' | 'schlecht' | 'neutral'

const FILL: Record<StatusTone, string> = {
  gut: 'bg-status-gut',
  achtung: 'bg-status-achtung',
  schlecht: 'bg-status-schlecht',
  neutral: 'bg-status-neutral',
}

const RING: Record<StatusTone, string> = {
  gut: 'bg-status-gut-flaeche',
  achtung: 'bg-status-achtung-flaeche',
  schlecht: 'bg-status-schlecht-flaeche',
  neutral: 'bg-status-neutral-flaeche',
}

export function StatusDot({
  tone,
  size = 'md',
}: {
  tone: StatusTone
  size?: 'md' | 'lg'
}) {
  const outer = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'
  const inner = size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${RING[tone]} ${outer}`}
    >
      <span className={`rounded-full ${FILL[tone]} ${inner}`} />
    </span>
  )
}
