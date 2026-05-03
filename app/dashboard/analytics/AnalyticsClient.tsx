'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import BoardsTab, { type BoardWithoutAnalytics } from './BoardsTab'
import PinsTab from './PinsTab'
import ProfilTab from './ProfilTab'
import WorkflowBanner from './WorkflowBanner'
import {
  effectiveZeitraum,
  type BoardAnalyticsRow,
  type BoardOption,
  type BoardThresholds,
  type PinAnalyticsRow,
  type PinAnalyticsThresholds,
  type PinOption,
  type ProfilAnalyticsWithGrowth,
} from './utils'

type Tab = 'profil' | 'pins' | 'boards'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profil', label: 'Profil' },
  { id: 'pins', label: 'Pins' },
  { id: 'boards', label: 'Boards' },
]

function isTab(v: string | null | undefined): v is Tab {
  return v === 'profil' || v === 'pins' || v === 'boards'
}

export default function AnalyticsClient({
  profilAnalytics,
  pinterestAnalyticsUrl,
  pins,
  pinAnalytics,
  thresholds,
  boards,
  boardAnalytics,
  boardThresholds,
  publicBoardsWithoutAnalytics,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pinterestAnalyticsUrl: string | null
  pins: PinOption[]
  pinAnalytics: PinAnalyticsRow[]
  thresholds: PinAnalyticsThresholds
  boards: BoardOption[]
  boardAnalytics: BoardAnalyticsRow[]
  boardThresholds: BoardThresholds
  publicBoardsWithoutAnalytics: BoardWithoutAnalytics[]
}) {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'profil')

  // Einheitliche Datumsquelle für Profil- und Pins-Tab: das jüngste
  // zeitraum_bis aus beiden Tabellen. So zeigen beide Tabs denselben
  // „nächster Zeitraum"-Vorschlag, egal welche der beiden Quellen
  // zuletzt aktualisiert wurde.
  const latestZeitraumBis = useMemo<string | null>(() => {
    let max: string | null = null
    for (const r of profilAnalytics) {
      const eff = effectiveZeitraum(r)
      if (!max || eff.bis > max) max = eff.bis
    }
    for (const r of pinAnalytics) {
      const eff = effectiveZeitraum(r)
      if (!max || eff.bis > max) max = eff.bis
    }
    return max
  }, [profilAnalytics, pinAnalytics])

  return (
    <div className="space-y-6">
      <WorkflowBanner pinterestAnalyticsUrl={pinterestAnalyticsUrl} />

      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-[15px] font-semibold transition-colors ${
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
          latestZeitraumBis={latestZeitraumBis}
        />
      )}

      {tab === 'pins' && (
        <PinsTab
          pins={pins}
          pinAnalytics={pinAnalytics}
          thresholds={thresholds}
          latestZeitraumBis={latestZeitraumBis}
        />
      )}
      {tab === 'boards' && (
        <BoardsTab
          boards={boards}
          boardAnalytics={boardAnalytics}
          thresholds={boardThresholds}
          publicBoardsWithoutAnalytics={publicBoardsWithoutAnalytics}
        />
      )}
    </div>
  )
}
