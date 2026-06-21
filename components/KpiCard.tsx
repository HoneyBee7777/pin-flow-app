// Geteilte KPI-Kachel fürs Dashboard. Aus app/dashboard/page.tsx ausgelagert,
// damit sie sowohl die Profil-Performance-Sektion als auch der Zielgruppen-
// Block (ZielgruppeCoachingBlock) im identischen Stil nutzen können.
//
// Reines Präsentations-Bauteil (keine Hooks) — server- wie clientseitig
// verwendbar.

import { formatGrowth } from '@/app/dashboard/analytics/utils'
import { LabelWithTooltip } from '@/components/InfoTooltip'

export type KpiVariant = 'hero' | 'normal' | 'context'

export function KpiCard({
  label,
  value,
  fullValue,
  growth,
  growthNeutral = false,
  tooltip,
  previousValue,
  variant = 'normal',
  className = '',
}: {
  label: string
  value: string
  fullValue?: number
  growth?: number | null
  // true → Wachstum neutral (grau) statt grün/rot. Für Bestands-/Kontext-
  // zahlen ohne Wertung (z. B. Zielgruppen-Größe).
  growthNeutral?: boolean
  tooltip?: string
  previousValue?: string
  variant?: KpiVariant
  className?: string
}) {
  // Hero-Kacheln: grüner Akzent-Rahmen. Alle anderen: Token-Rand karte-rand.
  // Token-System: Standard-Rahmen = karte-rand (Marke Blaugrau-hell),
  // Wert-Text = text-haupt (Marke Tanne). Hero-Akzent (Status-grün) bleibt.
  const borderCls =
    variant === 'hero'
      ? 'border-2 border-green-300'
      : 'border border-karte-rand'
  // Kartenfläche bewusst Core-bg-white (nicht das var-Token bg-karte): so
  // bleibt die Kachel weiß und hebt sich vom Creme-Hintergrund ab, auch wenn
  // ein Token mal nicht auflöst.
  const cardCls = `flex h-full flex-col rounded-lg ${borderCls} bg-white p-2.5 shadow-sm`
  const labelCls =
    'text-[10px] font-medium uppercase tracking-wide text-gray-500'
  const valueCls = 'mt-0.5 text-[22px] font-semibold leading-tight text-haupt'

  const hasPrev =
    previousValue !== undefined && previousValue !== null && previousValue !== ''

  return (
    <article className={`${cardCls} ${className}`}>
      <p className={labelCls}>
        <LabelWithTooltip label={label} tooltip={tooltip} />
      </p>
      <p
        className={valueCls}
        title={
          fullValue !== undefined
            ? fullValue.toLocaleString('de-DE')
            : undefined
        }
      >
        {value}
      </p>
      {hasPrev ? (
        <>
          <GrowthBadge growth={growth} neutral={growthNeutral} />
          <p className="mt-0.5 whitespace-nowrap text-[10px] text-gray-400">
            {previousValue}
          </p>
        </>
      ) : (
        <p className="mt-0.5 whitespace-nowrap text-[10px] text-gray-400">
          noch keine Vorperiode verfügbar
        </p>
      )}
    </article>
  )
}

export function GrowthBadge({
  growth,
  neutral = false,
}: {
  growth: number | null | undefined
  // neutral → grau, keine grün/rot-Wertung (für Bestands-/Kontextzahlen).
  neutral?: boolean
}) {
  if (growth === null || growth === undefined) return null
  const upCls = neutral ? 'text-gray-500' : 'text-green-700'
  const downCls = neutral ? 'text-gray-500' : 'text-red-700'
  if (!Number.isFinite(growth)) {
    return <p className={`text-xs font-medium ${upCls}`}>↑ neu</p>
  }
  if (growth > 0) {
    return (
      <p className={`text-xs font-medium ${upCls}`}>↑ {formatGrowth(growth)}</p>
    )
  }
  if (growth < 0) {
    return (
      <p className={`text-xs font-medium ${downCls}`}>
        ↓ {formatGrowth(growth)}
      </p>
    )
  }
  return <p className="text-xs text-gray-500">→ unverändert</p>
}
