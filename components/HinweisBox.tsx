import type { ReactNode } from 'react'
import { PinKategorieIcon } from './PinKategorieIcon'

export type HinweisVariant = 'tipp' | 'merke' | 'warnung' | 'neutral'

// Schweregrad nur für variant 'warnung'. Beide Töne nutzen die zentralen
// Status-Tokens (eine Quelle für Warnfarben, konsistent zum Strategie-Check).
export type WarnTone = 'achtung' | 'kritisch'

export function HinweisBox({
  children,
  variant = 'tipp',
  tone = 'achtung',
  compact = false,
}: {
  children: ReactNode
  variant?: HinweisVariant
  // Nur bei variant 'warnung' wirksam.
  tone?: WarnTone
  // Kompakter Stil für enge Item-Zeilen (weniger Padding, kleineres Icon).
  compact?: boolean
}) {
  // Warnung = Status-Tokens + Linien-Warn-Icon. Das Icon trägt die Warnung
  // visuell, daher kein Emoji im Text. „achtung" (amber) = beobachten,
  // „kritisch" (rot) = Notstand.
  if (variant === 'warnung') {
    const toneCls =
      tone === 'kritisch'
        ? 'border-status-schlecht border-l-status-schlecht bg-status-schlecht-flaeche'
        : 'border-status-achtung border-l-status-achtung bg-status-achtung-flaeche'
    const sizeCls = compact ? 'gap-2 p-2.5 text-xs' : 'gap-2.5 p-4 text-sm'
    const iconCls = compact ? 'mt-px h-4 w-4 shrink-0' : 'mt-0.5 h-5 w-5 shrink-0'
    return (
      <div
        className={`flex items-start rounded-md border border-l-[3px] leading-relaxed text-haupt ${toneCls} ${sizeCls}`}
      >
        <PinKategorieIcon name="warnung" className={iconCls} />
        <div>{children}</div>
      </div>
    )
  }

  // Neutral = ruhiger Dauer-Tipp / Grundregel: helle Blaugrau-Fläche, schmale
  // Blaugrau-Kante links, Info-Icon. Kein Amber (bleibt Warnungen vorbehalten),
  // kein Camel — frei für wiederkehrende neutrale Hinweise.
  if (variant === 'neutral') {
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-marke-blaugrau-hell border-l-[3px] border-l-marke-blaugrau bg-marke-blaugrau-xhell p-4 text-sm leading-relaxed text-gray-600">
        <PinKategorieIcon
          name="info"
          className="mt-0.5 h-5 w-5 shrink-0 text-marke-blaugrau"
        />
        <div>{children}</div>
      </div>
    )
  }

  // Tipp = amber (Handlungsempfehlung), Merke = teal (Prinzip / Wissen).
  // Beide nutzen einen left-border als visueller Akzent. Tipp über zentrale
  // Token --hinweis-tipp-* (eine Quelle; auch von den Unmatched-Sektionen genutzt).
  const cls =
    variant === 'merke'
      ? 'border border-hinweis-merke-rand border-l-[3px] border-l-hinweis-merke-stripe bg-hinweis-merke-flaeche text-hinweis-merke-text'
      : 'border border-hinweis-tipp-rand border-l-[3px] border-l-hinweis-tipp-stripe bg-hinweis-tipp-flaeche text-hinweis-tipp-text'
  return (
    <div className={`rounded-md p-4 text-sm leading-relaxed ${cls}`}>
      {children}
    </div>
  )
}
