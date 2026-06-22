'use client'

import { calcUpdateStatusMonat, formatDateDe } from './utils'
import { StatusDot } from '@/components/StatusDot'

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

  // Status nur noch über den flachen StatusDot (wie HeroSection), nicht über
  // eine farbige Fläche oder ein Emoji.
  const dotTone =
    status.state === 'rot'
      ? 'schlecht'
      : status.state === 'gruen'
        ? 'gut'
        : 'neutral'

  const statusLabel =
    status.state === 'rot'
      ? 'Analytics-Status: Update fällig'
      : status.state === 'gruen'
        ? 'Analytics-Status: Aktuell'
        : 'Analytics-Status: Noch kein Update'

  return (
    <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-karte-rand bg-white px-3 py-1.5 text-xs">
      <StatusDot tone={dotTone} />
      <span className="font-semibold text-haupt">{statusLabel}</span>
      <span aria-hidden className="text-gray-300">
        ·
      </span>
      <span className="text-sekundaer">
        Letztes Update:{' '}
        <span className="font-medium text-haupt">
          {analyticsUpdateDatum ? formatDateDe(analyticsUpdateDatum) : 'noch nie'}
        </span>
      </span>
      {status.state === 'gruen' && (
        <>
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          <span className="text-sekundaer">
            Nächstes Update ab:{' '}
            <span className="font-medium text-haupt">
              {formatDateDe(status.eintragbarAb)}
            </span>
          </span>
        </>
      )}
      {status.state === 'rot' && (
        <>
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          <span className="text-sekundaer">
            Zeitraum{' '}
            <span className="font-medium text-haupt">
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
