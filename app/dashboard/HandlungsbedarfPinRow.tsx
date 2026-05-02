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
  bonusImpressionenSchwelle,
}: {
  pin: HandlungsbedarfPin
  kategorie: string
  metrics: Metric[]
  primaryAction: ActionButton
  bonusImpressionenSchwelle: number
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

  const coachingText = coachingHint({
    kategorie,
    pin,
    bonusSchwelle: bonusImpressionenSchwelle,
  })

  // Algorithmus-Push (nur Top-Performer-Kategorie) steht ganz vorne in der
  // Metriken-Zeile (Zeile 2); die übrigen Metriken folgen mit · getrennt.
  const pushMetric = metrics.find((m) => m.label === 'Algorithmus-Push')
  const inlineMetrics = metrics.filter((m) => m.label !== 'Algorithmus-Push')

  return (
    <li className="space-y-1.5 px-4 py-3 text-sm hover:bg-gray-50">
      {/* Zeile 1 — Pin-Titel links | Buttons + Checkbox rechts */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-semibold text-gray-900">
          {pin.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
          <input
            type="checkbox"
            checked={false}
            onChange={onCheck}
            disabled={isPending}
            className="ml-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
            aria-label="Pin als bearbeitet markieren"
            title="Als bearbeitet markieren"
          />
        </div>
      </div>

      {/* Zeile 2 — Metriken (Algorithmus-Push ganz vorne, dann · getrennt) */}
      {(pushMetric || inlineMetrics.length > 0) && (
        <div className="flex flex-wrap items-center gap-y-0.5 text-xs text-gray-500">
          {pushMetric && (
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1">{pushMetric.label}:</span>
              <span className="mr-1 font-semibold">{pushMetric.value}</span>
              {pushMetric.tooltip && <InfoTooltip text={pushMetric.tooltip} />}
            </span>
          )}
          {inlineMetrics.map((m, i) => (
            <span
              key={m.label}
              className="inline-flex items-center whitespace-nowrap"
            >
              {(i > 0 || pushMetric) && (
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              )}
              <span className="mr-1 font-semibold">{m.value}</span>
              {m.label}
              {m.tooltip && <InfoTooltip text={m.tooltip} />}
            </span>
          ))}
        </div>
      )}

      {/* Zeile 3 — Board-Chip + Status-Badge */}
      <BoardLine pin={pin} />

      {/* Zeile 4 — Coaching-Hinweis (Matrix Pin-Kategorie × Board-Status) */}
      {coachingText && (
        <div className="coaching-box !px-2 !py-1.5 text-xs">
          🎯 {coachingText}
        </div>
      )}

      {error && <div className="text-xs text-red-700">{error}</div>}
    </li>
  )
}

// Status-Badges pro Board-Score — Emoji + Farbschema gespiegelt zur
// Board-Gesundheit-Sektion auf dem Dashboard.
const BOARD_BADGE: Record<
  BoardScoreLabel,
  { emoji: string; text: string; cls: string }
> = {
  Top: { emoji: '🏆', text: 'Top-Board', cls: 'bg-emerald-100 text-emerald-700' },
  Wachstum: { emoji: '📈', text: 'Wachstums-Board', cls: 'bg-blue-100 text-blue-700' },
  Solide: { emoji: '⚖️', text: 'Solides Board', cls: 'bg-slate-100 text-slate-700' },
  Schwach: { emoji: '📉', text: 'Schwaches Board', cls: 'bg-gray-200 text-gray-700' },
  Schlafend: { emoji: '💤', text: 'Board ohne neue Pins', cls: 'bg-orange-100 text-orange-700' },
  Inaktiv: { emoji: '⏸️', text: 'Inaktives Board', cls: 'bg-orange-50 text-orange-700' },
}

function BoardLine({ pin }: { pin: HandlungsbedarfPin }) {
  if (!pin.boardName) {
    return (
      <div className="mt-0.5 truncate text-xs text-gray-400">
        📋 Kein Board zugeordnet
      </div>
    )
  }
  const chipCls =
    'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700'
  if (!pin.boardHasAnalytics) {
    return (
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
        <span>Board:</span>
        <span className={chipCls}>{pin.boardName}</span>
        <span className="text-gray-400">(keine Analytics)</span>
      </div>
    )
  }
  const label = pin.boardScoreLabel
  const badge = label ? BOARD_BADGE[label] : null
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
      <span>Board:</span>
      <span className={chipCls}>{pin.boardName}</span>
      {badge && label && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.emoji} {badge.text}
        </span>
      )}
    </div>
  )
}

// Coaching-Matrix: Pin-Kategorie × Board-Status → genau ein Hinweistext.
// 'kein' deckt alle Fälle ab, in denen das Board fehlt oder keine Analytics
// hat (Fallback ohne Board-Bezug).
type CoachingKategorie =
  | 'aktiver_top_performer'
  | 'hidden_gem'
  | 'hohe_impressionen_niedrige_ctr'
  | 'eingeschlafener_gewinner'

type BoardKey =
  | 'top'
  | 'wachstum'
  | 'solide'
  | 'schlafend'
  | 'inaktiv'
  | 'schwach'
  | 'kein'

const COACHING_MATRIX: Record<
  CoachingKategorie,
  Record<BoardKey, string>
> = {
  aktiver_top_performer: {
    top: 'Beste Kombination – Pin und Board pushen sich gegenseitig. Varianten nutzen den Algorithmus-Push voll aus.',
    wachstum:
      'Wachstums-Board pusht den Pin – Frequenz nicht abreißen lassen, Varianten verstärken den Trend.',
    solide:
      'Solides Board, starker Pin – Varianten produzieren, um beide weiter zu pushen.',
    schlafend:
      'Pin pusht trotz Board ohne neue Pins – verstärke das Board mit 2-3 neuen Pins, dann profitiert der Pin doppelt.',
    inaktiv:
      'Pin läuft trotz inaktivem Board – ein Reaktivierungs-Pin pro Woche kann das Board wieder beleben.',
    schwach:
      'Pin sticht aus schwachem Board hervor – prüfe, ob er thematisch passt oder besser auf ein stärkeres Board verschoben werden sollte.',
    kein: 'Starker Pin ohne Board-Zuordnung – einem thematisch passenden Board zuordnen, um den Algorithmus-Push zu verstärken.',
  },
  hidden_gem: {
    top: 'Top-Board pusht das Umfeld, aber dieser Pin wird nicht in der Suche gefunden – stärkere Keywords sind der Hebel.',
    wachstum:
      'Board wächst, aber dieser Pin findet keine Suchen – Keywords nachschärfen.',
    solide:
      'Solides Board, aber Pin-Suchbarkeit fehlt – Keywords sind der Hebel.',
    schlafend:
      'Doppel-Hebel: Pin braucht Keywords UND Board braucht neue Pins, um wieder zu pushen.',
    inaktiv:
      'Inaktives Board hält den Pin klein – reaktiviere mit 2-3 neuen Pins, dann kann dieser Hidden Gem wachsen.',
    schwach:
      'Schwaches Board limitiert den Pin – überlege, ob ein stärkeres Board zur Pin-Thematik passen könnte.',
    kein: 'Hidden Gem ohne Board-Zuordnung – einem thematisch passenden Board zuordnen, dann können Keywords und Board gemeinsam wirken.',
  },
  hohe_impressionen_niedrige_ctr: {
    top: 'Top-Board liefert Reichweite, aber Hook und Design konvertieren nicht – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design.',
    wachstum:
      'Wachstums-Board liefert Sichtbarkeit, aber Klicks fehlen – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design.',
    solide:
      'Solides Board, aber Pin konvertiert nicht – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design.',
    schlafend:
      'Hook und Design schwach UND Board liefert wenig Push – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design. Board zusätzlich mit neuen Pins reaktivieren.',
    inaktiv:
      'Inaktives Board begrenzt die Wirkung – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design. Board reaktivieren für mehr Reichweite.',
    schwach:
      'Schwaches Board und schwache Pin-Performance – erstelle einen neuen Pin mit gleichem Titel und gleicher Beschreibung, aber anderem Hook und Design. Oder Pin auf stärkeres Board verschieben.',
    kein: 'Pin ohne Board-Zuordnung und Optimierungsbedarf – erst Board zuordnen, dann neuen Pin mit gleichem Titel und gleicher Beschreibung aber anderem Hook und Design erstellen.',
  },
  eingeschlafener_gewinner: {
    top: 'Top-Board ist da, aber Pin-Frische fehlt – ein Recycling-Pin mit aktualisiertem Design weckt den Algorithmus.',
    wachstum:
      'Wachstums-Board lebt – ein Recycling-Pin nutzt das Momentum aus.',
    solide:
      'Solides Board, müder Pin – Recycling-Pin kann den Pin wieder ins Spiel bringen.',
    schlafend:
      'Pin und Board sind beide eingeschlafen – Recycling-Pin auf reaktiviertem Board kann beides wiederbeleben.',
    inaktiv:
      'Inaktives Board hält den eingeschlafenen Pin tot – Recycling-Pin als Reaktivierungs-Trigger nutzen.',
    schwach:
      'Schwaches Board und alter Pin – prüfe, ob das Recycling auf einem stärkeren Board sinnvoller ist.',
    kein: 'Eingeschlafener Pin ohne Board – einem aktiven Board zuordnen und Recycling-Pin erstellen.',
  },
}

const BONUS_REICHWEITE_HINWEIS =
  'Zusatz-Hebel: Impressionen sind noch niedrig – mit stärkeren Keywords in der Variante kann die Reichweite deutlich gehoben werden.'

function boardKeyFor(pin: HandlungsbedarfPin): BoardKey {
  if (!pin.boardName || !pin.boardHasAnalytics || !pin.boardScoreLabel)
    return 'kein'
  switch (pin.boardScoreLabel) {
    case 'Top':
      return 'top'
    case 'Wachstum':
      return 'wachstum'
    case 'Solide':
      return 'solide'
    case 'Schlafend':
      return 'schlafend'
    case 'Inaktiv':
      return 'inaktiv'
    case 'Schwach':
      return 'schwach'
    default:
      return 'kein'
  }
}

function isCoachingKategorie(k: string): k is CoachingKategorie {
  return (
    k === 'aktiver_top_performer' ||
    k === 'hidden_gem' ||
    k === 'hohe_impressionen_niedrige_ctr' ||
    k === 'eingeschlafener_gewinner'
  )
}

function coachingHint({
  kategorie,
  pin,
  bonusSchwelle,
}: {
  kategorie: string
  pin: HandlungsbedarfPin
  bonusSchwelle: number
}): string | null {
  if (!isCoachingKategorie(kategorie)) return null
  const baseText = COACHING_MATRIX[kategorie][boardKeyFor(pin)]
  if (
    kategorie === 'aktiver_top_performer' &&
    pin.impressionen < bonusSchwelle
  ) {
    return `${baseText} ${BONUS_REICHWEITE_HINWEIS}`
  }
  return baseText
}

