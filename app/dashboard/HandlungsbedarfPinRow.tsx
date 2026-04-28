'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleDashboardErledigt } from './actions/dashboard-erledigt'
import {
  produceVariant,
  type VarianteTyp,
} from './actions/handlungsbedarf'
import InfoTooltip from '@/components/InfoTooltip'

// Klassifizierung kommt 1:1 aus der Board-Gesundheit-Berechnung im Dashboard
// (assignCategory). Das Pin-Handlungsbedarf-UI mappt nur Label → Farbe/Warnung,
// ohne eigene Schwach/Stark-Logik.
export type BoardScoreLabel =
  | 'Top'
  | 'Wachstum'
  | 'Solide'
  | 'Schwach'
  | 'Schlafend'
  | 'Inaktiv'

export type HandlungsbedarfPin = {
  id: string
  pin_id: string
  titel: string | null
  klicks: number
  impressionen: number
  ctr: number | null
  alterTage: number
  letzterAnalyticsDatum: string
  pinterestUrl: string | null
  boardName: string | null
  boardScoreLabel: BoardScoreLabel | null
  boardHasAnalytics: boolean
}

export type ActionButton =
  | { type: 'variante'; varianteTyp: VarianteTyp; label: string }
  | { type: 'edit'; label: string }

type Metric = {
  label: string
  value: string
  tooltip?: string
}

export default function HandlungsbedarfPinRow({
  pin,
  kategorie,
  metrics,
  primaryAction,
}: {
  pin: HandlungsbedarfPin
  kategorie: string
  metrics: Metric[]
  primaryAction: ActionButton
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  function onCheck(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setError(null)
    setHidden(checked)
    startTransition(async () => {
      const r = await toggleDashboardErledigt(
        pin.pin_id,
        kategorie,
        checked
      )
      if (r.error) {
        setError(r.error)
        setHidden(false)
      }
    })
  }

  function onPrimary() {
    if (primaryAction.type !== 'variante') return
    setError(null)
    startTransition(async () => {
      const r = await produceVariant(pin.pin_id, primaryAction.varianteTyp)
      if (r?.error) setError(r.error)
    })
  }

  if (hidden) return null

  const warning = boardWarning(pin.boardScoreLabel)
  const keywordHint = topPerformerKeywordHint(kategorie, pin)

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50">
      <input
        type="checkbox"
        checked={false}
        onChange={onCheck}
        disabled={isPending}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
        aria-label="Pin als bearbeitet markieren"
        title="Als bearbeitet markieren"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900">
          {pin.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
        </div>
        <BoardLine pin={pin} />
        {warning && (
          <div className={`mt-0.5 truncate text-xs ${warning.colorClass}`}>
            {warning.text}
          </div>
        )}
        {keywordHint && (
          <div className="mt-0.5 text-xs text-blue-700">{keywordHint}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        {metrics.map((m) => (
          <span
            key={m.label}
            className="inline-flex items-center whitespace-nowrap"
          >
            {m.label}: <strong className="ml-1 text-gray-900">{m.value}</strong>
            {m.tooltip && <InfoTooltip text={m.tooltip} />}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {primaryAction.type === 'variante' ? (
          <button
            type="button"
            onClick={onPrimary}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Lädt…' : primaryAction.label}
          </button>
        ) : (
          <Link
            href={`/dashboard/pin-produktion?edit=${pin.pin_id}`}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            {primaryAction.label}
          </Link>
        )}
        <Link
          href={`/dashboard/pin-produktion?edit=${pin.pin_id}`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Pin anschauen
        </Link>
        {pin.pinterestUrl && (
          <a
            href={pin.pinterestUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Zum Pin bei Pinterest ↗
          </a>
        )}
      </div>
      {error && (
        <span className="basis-full text-xs text-red-700">{error}</span>
      )}
    </li>
  )
}

// Farbtöne pro Board-Status — dezent (Tailwind 600er-Reihe).
// „Inaktiv" (= Solide-Board ohne Aktivität) teilt den Orange-Ton mit
// „Schlafend", da beide einen Aktivitäts-Mangel signalisieren.
const BOARD_LABEL_COLOR: Record<BoardScoreLabel, string> = {
  Top: 'text-green-600',
  Wachstum: 'text-blue-600',
  Solide: 'text-gray-600',
  Schwach: 'text-red-600',
  Schlafend: 'text-orange-600',
  Inaktiv: 'text-orange-600',
}

function BoardLine({ pin }: { pin: HandlungsbedarfPin }) {
  if (!pin.boardName) {
    return (
      <div className="mt-0.5 truncate text-xs text-gray-400">
        📋 Kein Board zugeordnet
      </div>
    )
  }
  if (!pin.boardHasAnalytics) {
    return (
      <div className="mt-0.5 truncate text-xs text-gray-600">
        📋 Liegt auf Board: {pin.boardName}{' '}
        <span className="text-gray-400">(keine Analytics)</span>
      </div>
    )
  }
  const label = pin.boardScoreLabel
  const colorCls = label ? BOARD_LABEL_COLOR[label] : 'text-gray-500'
  return (
    <div className="mt-0.5 truncate text-xs text-gray-600">
      📋 Liegt auf Board: {pin.boardName}{' '}
      <span className={`font-medium ${colorCls}`}>({label ?? '—'})</span>
    </div>
  )
}

// Warnhinweis nur bei Aktivitäts- oder Performance-Mangel — Top/Wachstum/Solide
// bekommen keinen Hinweis. Klassifizierung kommt vorgegeben aus der
// Board-Gesundheit-Berechnung.
function boardWarning(
  label: BoardScoreLabel | null
): { text: string; colorClass: string } | null {
  if (label === 'Schlafend') {
    return {
      text: '💤 Dieses Board ist aktuell schlafend – der Pin profitiert weniger vom Pinterest-Push, solange keine neuen Pins dazukommen.',
      colorClass: 'text-orange-700',
    }
  }
  if (label === 'Inaktiv') {
    return {
      text: '💤 Dieses Board ist aktuell inaktiv – der Pin profitiert weniger vom Pinterest-Push, solange keine neuen Pins dazukommen.',
      colorClass: 'text-orange-700',
    }
  }
  if (label === 'Schwach') {
    return {
      text: '⚠️ Dieser Pin liegt auf einem schwachen Board – das könnte die Reichweite des Pins begrenzen.',
      colorClass: 'text-red-700',
    }
  }
  return null
}

// Schwellwerte für den Top-Performer-Keyword-Hinweis. Später nach
// einstellungen verlagerbar — vorerst Konstanten.
const TOP_PERFORMER_CTR_GUT = 1.5
const TOP_PERFORMER_IMPRESSIONEN_NIEDRIG = 500
const TOP_PERFORMER_IMPRESSIONEN_MITTEL = 1000

// Regelbasierter Hinweis nur für „Aktiver Top Performer"-Pins.
// Empfehlung adressiert die Variante, die als nächstes erstellt wird:
//   - Gute CTR + wenig Reichweite     → stärkere Keywords wählen
//   - Gute CTR + mittlere Reichweite  → Keywords prüfen, ob stärkere existieren
//   - Gute CTR + viel Reichweite      → kein Keyword-Hinweis (alles gut)
//   - Schwache CTR + viel Reichweite  → Hook überarbeiten statt Keywords ändern
function topPerformerKeywordHint(
  kategorie: string,
  pin: HandlungsbedarfPin
): string | null {
  if (kategorie !== 'aktiver_top_performer') return null
  if (pin.ctr === null) return null
  const ctr = pin.ctr
  const imp = pin.impressionen
  if (ctr >= TOP_PERFORMER_CTR_GUT) {
    if (imp < TOP_PERFORMER_IMPRESSIONEN_NIEDRIG) {
      return '💡 Dieser Pin klickt gut aber hat wenig Reichweite — beim Erstellen der Variante stärkere Keywords wählen für mehr Impressionen.'
    }
    if (imp < TOP_PERFORMER_IMPRESSIONEN_MITTEL) {
      return '💡 Gute CTR — beim Erstellen der Variante Keywords prüfen ob es noch reichweitenstärkere Alternativen gibt.'
    }
    return null
  }
  // CTR < 1,5%
  if (imp >= TOP_PERFORMER_IMPRESSIONEN_MITTEL) {
    return '💡 Viel Reichweite aber niedrige CTR — beim Erstellen der Variante den Hook überarbeiten statt Keywords ändern.'
  }
  return null
}

