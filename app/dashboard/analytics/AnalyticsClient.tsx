'use client'

import { useState } from 'react'
import PinsTab from './PinsTab'
import ProfilTab from './ProfilTab'
import type {
  PinAnalyticsRow,
  PinAnalyticsThresholds,
  PinOption,
  ProfilAnalyticsWithGrowth,
} from './utils'

type Tab = 'profil' | 'pins' | 'boards'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profil', label: 'Profil' },
  { id: 'pins', label: 'Pins' },
  { id: 'boards', label: 'Boards' },
]

export default function AnalyticsClient({
  profilAnalytics,
  pinterestAnalyticsUrl,
  analyticsUpdateDatum,
  pins,
  pinAnalytics,
  thresholds,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pinterestAnalyticsUrl: string | null
  analyticsUpdateDatum: string | null
  pins: PinOption[]
  pinAnalytics: PinAnalyticsRow[]
  thresholds: PinAnalyticsThresholds
}) {
  const [tab, setTab] = useState<Tab>('profil')

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'profil' && (
        <ProfilTab
          profilAnalytics={profilAnalytics}
          pinterestAnalyticsUrl={pinterestAnalyticsUrl}
          analyticsUpdateDatum={analyticsUpdateDatum}
        />
      )}

      {tab === 'pins' && (
        <PinsTab
          pins={pins}
          pinAnalytics={pinAnalytics}
          thresholds={thresholds}
        />
      )}
      {tab === 'boards' && <Placeholder title="Board-Performance" />}
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">
        Folgt im nächsten Schritt.
      </p>
    </div>
  )
}
