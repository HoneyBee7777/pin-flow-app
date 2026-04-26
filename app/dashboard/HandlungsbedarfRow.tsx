'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleDashboardErledigt } from './actions/dashboard-erledigt'
import { formatNumber, formatPercent, formatZahl } from './analytics/utils'

export type HandlungsbedarfRowData = {
  id: string
  pin_id: string
  titel: string | null
  klicks: number
  ctr: number | null
  handlung: string
  kategorie: string
}

export default function HandlungsbedarfRow({
  pin,
}: {
  pin: HandlungsbedarfRowData
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Optimistic toggle: wenn der User klickt, blenden wir die Zeile
  // sofort aus, statt auf revalidate zu warten.
  const [hidden, setHidden] = useState(false)

  function onCheck(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setError(null)
    setHidden(checked)
    startTransition(async () => {
      const r = await toggleDashboardErledigt(
        pin.pin_id,
        pin.kategorie,
        checked
      )
      if (r.error) {
        setError(r.error)
        setHidden(false)
      }
    })
  }

  if (hidden) return null

  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="px-4 py-2">
        <input
          type="checkbox"
          checked={false}
          onChange={onCheck}
          disabled={isPending}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
          aria-label="Pin als erledigt markieren"
          title="Als erledigt markieren — verschwindet bis zum nächsten Analytics-Update"
        />
      </td>
      <td className="max-w-xs px-4 py-2 font-medium text-gray-900">
        {pin.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </td>
      <td
        className="whitespace-nowrap px-4 py-2 text-gray-700"
        title={formatNumber(pin.klicks)}
      >
        {formatZahl(pin.klicks)}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
        {formatPercent(pin.ctr)}
      </td>
      <td className="px-4 py-2 font-medium text-gray-800">{pin.handlung}</td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <Link
          href="/dashboard/pin-produktion"
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Zum Pin →
        </Link>
      </td>
    </tr>
  )
}
