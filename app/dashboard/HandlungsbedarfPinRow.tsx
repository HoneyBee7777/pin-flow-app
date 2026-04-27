'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleDashboardErledigt } from './actions/dashboard-erledigt'
import {
  produceVariant,
  type VarianteTyp,
} from './actions/handlungsbedarf'
import InfoTooltip from '@/components/InfoTooltip'

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
      <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
        {pin.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
      </span>
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

