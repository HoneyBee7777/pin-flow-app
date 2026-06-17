'use client'

import { calcUpdateStatusTri, formatDateDe } from './utils'

export default function UpdateStatusBanner({
  analyticsUpdateDatum,
  intervall,
  vorwarnung,
}: {
  analyticsUpdateDatum: string | null
  intervall: number | null
  vorwarnung: number | null
}) {
  // Gleiches Tri-State-System wie die Dashboard-Hero-Ampel — identische
  // Schwellen (konfigurierbar aus den Einstellungen, Default 31/7), Texte
  // und Farben. ?? undefined → Fallback auf die Defaults in calcUpdateStatusTri.
  const status = calcUpdateStatusTri(
    analyticsUpdateDatum,
    intervall ?? undefined,
    vorwarnung ?? undefined
  )

  const tone =
    status.state === 'rot'
      ? 'border-red-200 bg-red-50 text-red-900'
      : status.state === 'gelb'
        ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
        : status.state === 'gruen'
          ? 'border-green-200 bg-green-50 text-green-900'
          : 'border-gray-200 bg-gray-50 text-gray-700'

  const statusLabel =
    status.state === 'rot'
      ? '🔴 Analytics-Status: Daten veraltet'
      : status.state === 'gelb'
        ? `🟡 Analytics-Status: Update fällig in ${
            status.daysUntilDue !== null
              ? Math.max(0, status.daysUntilDue)
              : '-'
          } Tagen`
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
          {status.lastUpdate ? formatDateDe(status.lastUpdate) : 'noch nie'}
        </span>
      </span>
      <span aria-hidden className="text-gray-400">
        ·
      </span>
      <span className="text-gray-700">
        Nächstes Update:{' '}
        <span className="font-medium text-gray-900">
          {status.nextDue ? formatDateDe(status.nextDue) : '—'}
        </span>
      </span>
    </div>
  )
}
