'use client'

import { calcUpdateStatusMonat, formatDateDe } from './utils'

export default function UpdateStatusBanner({
  analyticsUpdateDatum,
  latestZeitraumBis,
}: {
  analyticsUpdateDatum: string | null
  latestZeitraumBis: string | null
}) {
  // Monatsbasierter Status: fällig, sobald der nächste volle Monat abgeschlossen
  // und noch nicht erfasst ist. „Letztes Update" bleibt als Speicherdatum-Anzeige.
  const status = calcUpdateStatusMonat(latestZeitraumBis)

  const tone =
    status.state === 'rot'
      ? 'border-red-200 bg-red-50 text-red-900'
      : status.state === 'gruen'
        ? 'border-green-200 bg-green-50 text-green-900'
        : 'border-gray-200 bg-gray-50 text-gray-700'

  const statusLabel =
    status.state === 'rot'
      ? '🔴 Analytics-Status: Update fällig'
      : status.state === 'gruen'
        ? '🟢 Analytics-Status: Aktuell'
        : '⚪ Analytics-Status: Noch kein Update'

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-3 py-1.5 text-xs ${tone}`}
    >
      <span className="font-semibold">{statusLabel}</span>
      <span aria-hidden className="text-gray-400">
        ·
      </span>
      <span className="text-gray-700">
        Letztes Update:{' '}
        <span className="font-medium text-gray-900">
          {analyticsUpdateDatum ? formatDateDe(analyticsUpdateDatum) : 'noch nie'}
        </span>
      </span>
      {status.state === 'gruen' && (
        <>
          <span aria-hidden className="text-gray-400">
            ·
          </span>
          <span className="text-gray-700">
            Nächstes Update ab:{' '}
            <span className="font-medium text-gray-900">
              {formatDateDe(status.eintragbarAb)}
            </span>
          </span>
        </>
      )}
      {status.state === 'rot' && (
        <>
          <span aria-hidden className="text-gray-400">
            ·
          </span>
          <span className="text-gray-700">
            Zeitraum{' '}
            <span className="font-medium text-gray-900">
              {formatDateDe(status.faelligerMonatVon)} bis{' '}
              {formatDateDe(status.faelligerMonatBis)}
            </span>{' '}
            fällig
          </span>
        </>
      )}
    </div>
  )
}
