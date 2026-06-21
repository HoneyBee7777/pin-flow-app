// Einheitliche Zahl-Badge für die Kategorie-Zähler im Dashboard
// („Pins recyceln", „Neue Pins produzieren", „Keyword-Einsatz").
//
// Bewusst KEINE Ampel-Statusfarben (grün/amber/rot) — die Kategorien sind eine
// Klassifizierung/To-do-Gruppierung, keine gut/schlecht-Wertung. Nur Blaugrau-
// Familie + Grau:
//   - betroffen (count > 0): kräftig (Standard) bzw. ruhig (Variante 'ruhig')
//   - leer (count === 0): blass grau
//
// variant='ruhig' für neutrale Zähler ohne Handlungsdruck (Ungenutzte Keywords).

export function AnzahlBadge({
  count,
  variant = 'standard',
}: {
  count: number
  variant?: 'standard' | 'ruhig'
}) {
  const cls =
    count === 0
      ? 'bg-gray-100 text-gray-400'
      : variant === 'ruhig'
        ? 'bg-marke-blaugrau-hell text-marke-blaugrau'
        : 'bg-marke-blaugrau text-white'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {count}
    </span>
  )
}
