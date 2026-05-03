'use client'

import { calcUpdateStatus, formatDateDe, type UpdateStatus } from './utils'

export default function UpdateStatusBanner({
  analyticsUpdateDatum,
}: {
  analyticsUpdateDatum: string | null
}) {
  const status = calcUpdateStatus(analyticsUpdateDatum)
  return <Banner status={status} />
}

function Banner({ status }: { status: UpdateStatus }) {
  const { lastUpdate, nextDue, isOverdue } = status

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-3 py-1.5 text-xs ${
        isOverdue
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-green-200 bg-green-50 text-green-800'
      }`}
    >
      <span className="font-semibold">
        {isOverdue ? '🔴 Update überfällig' : '🟢 Update aktuell'}
      </span>
      <span aria-hidden className="text-gray-400">
        ·
      </span>
      <span className="text-gray-700">
        Letztes Update:{' '}
        <span className="font-medium text-gray-900">
          {lastUpdate ? formatDateDe(lastUpdate) : 'noch nie'}
        </span>
      </span>
      <span aria-hidden className="text-gray-400">
        ·
      </span>
      <span className="text-gray-700">
        Nächstes Update:{' '}
        <span className="font-medium text-gray-900">
          {nextDue ? formatDateDe(nextDue) : '—'}
        </span>
      </span>
    </div>
  )
}
