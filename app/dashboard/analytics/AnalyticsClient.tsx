'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  type ImportPinterestCsvResult,
  type UnmatchedBoard,
  type UnmatchedPin,
} from './actions'
import BoardsTab, { type BoardWithoutAnalytics } from './BoardsTab'
import EingabeTab from './EingabeTab'
import PinsTab from './PinsTab'
import ProfilTab from './ProfilTab'
import {
  addDays,
  effectiveZeitraum,
  todayIso,
  type BoardAnalyticsEntry,
  type BoardAnalyticsRow,
  type BoardOption,
  type BoardThresholds,
  type PinAnalyticsRow,
  type PinAnalyticsThresholds,
  type PinOption,
  type ProfilAnalyticsWithGrowth,
} from './utils'

// Snapshot eines CSV-Imports. Quelle ist entweder eine frische Session
// (durch `onImportFinished` gesetzt) ODER die persistente csv_import_pending-
// Tabelle (über `initialPending` aus dem Server-Component reingegeben). Beide
// Auswertungs-Tabs lesen daraus die „Nicht zugeordnet"-Liste.
export type PendingImport = {
  zeitraum_von: string
  zeitraum_bis: string
  unmatchedPins: UnmatchedPin[]
  unmatchedBoards: UnmatchedBoard[]
}

type Tab = 'eingabe' | 'profil' | 'pins' | 'boards'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'eingabe', label: '✏️ Eingabe' },
  { id: 'profil', label: 'Profil-Entwicklung' },
  { id: 'pins', label: 'Top Pins' },
  { id: 'boards', label: 'Boards' },
]

function isTab(v: string | null | undefined): v is Tab {
  return v === 'eingabe' || v === 'profil' || v === 'pins' || v === 'boards'
}

export default function AnalyticsClient({
  profilAnalytics,
  pins,
  pinAnalytics,
  thresholds,
  boards,
  boardAnalytics,
  boardHistory,
  boardThresholds,
  publicBoardsWithoutAnalytics,
  pinterestAnalyticsUrl,
  initialPending,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  pins: PinOption[]
  pinAnalytics: PinAnalyticsRow[]
  thresholds: PinAnalyticsThresholds
  boards: BoardOption[]
  boardAnalytics: BoardAnalyticsRow[]
  boardHistory: Record<string, BoardAnalyticsEntry[]>
  boardThresholds: BoardThresholds
  publicBoardsWithoutAnalytics: BoardWithoutAnalytics[]
  pinterestAnalyticsUrl: string | null
  // Aus csv_import_pending vorgeladenes Pending — überlebt Page-Reloads.
  initialPending: PendingImport | null
}) {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab')
  // Default: Eingabe-Tab — Nutzer landet direkt im Eingabe-Workflow.
  const [tab, setTab] = useState<Tab>(
    isTab(initialTab) ? initialTab : 'eingabe'
  )

  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    initialPending
  )

  // Tab-Wechsel mit optionalem Scroll-Ziel — wird vom Eingabe-Tab nach
  // erfolgreichem CSV-Import benutzt, um direkt zur „Nicht zugeordnet"-
  // Liste auf dem Pins- bzw. Boards-Tab zu springen. setTimeout(0) reicht,
  // damit React den neuen Tab-Inhalt erst rendert und das Ziel-Element
  // existiert, bevor wir scrollen.
  function switchTab(target: Tab, scrollToId?: string) {
    setTab(target)
    if (scrollToId) {
      setTimeout(() => {
        const el = document.getElementById(scrollToId)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
  }

  function onImportFinished(result: ImportPinterestCsvResult) {
    if (!result.zeitraum_von || !result.zeitraum_bis) return
    setPendingImport({
      zeitraum_von: result.zeitraum_von,
      zeitraum_bis: result.zeitraum_bis,
      unmatchedPins: result.pinsUnmatched ?? [],
      unmatchedBoards: result.boardsUnmatched ?? [],
    })
  }

  function removeUnmatchedPin(pinterestPinId: string) {
    setPendingImport((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        unmatchedPins: prev.unmatchedPins.filter(
          (u) => u.pinterestPinId !== pinterestPinId
        ),
      }
      if (next.unmatchedPins.length === 0 && next.unmatchedBoards.length === 0)
        return null
      return next
    })
  }

  function removeUnmatchedBoard(slug: string) {
    setPendingImport((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        unmatchedBoards: prev.unmatchedBoards.filter(
          (u) => u.boardSlug !== slug
        ),
      }
      if (next.unmatchedPins.length === 0 && next.unmatchedBoards.length === 0)
        return null
      return next
    })
  }

  // Einheitliche Datumsquelle für alle Tabs: das jüngste zeitraum_bis aus
  // Profil + Pin Analytics. So bekommen Eingabe-/Profil-/Pins-Tab denselben
  // „nächster Zeitraum"-Vorschlag, egal welche Quelle zuletzt aktualisiert
  // wurde.
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

  const expectedZeitraumVon = latestZeitraumBis
    ? addDays(latestZeitraumBis, 1)
    : null
  const expectedZeitraumBis = addDays(todayIso(), -1)

  const pinsPending = pendingImport?.unmatchedPins ?? []
  const boardsPending = pendingImport?.unmatchedBoards ?? []
  const totalPending = pinsPending.length + boardsPending.length
  // Notice an den Eingabe-Tab — wird nur angezeigt, wenn überhaupt Pending-
  // Einträge existieren. Zeitraum kommt aus dem aktuellen pendingImport-State
  // (initial aus DB geladen, nach Imports/Auflösungen aktualisiert).
  const eingabePendingNotice =
    pendingImport && totalPending > 0
      ? {
          count: totalPending,
          zeitraum_von: pendingImport.zeitraum_von,
          zeitraum_bis: pendingImport.zeitraum_bis,
        }
      : null

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((t) => {
            const active = tab === t.id
            const badge =
              t.id === 'pins'
                ? pinsPending.length
                : t.id === 'boards'
                  ? boardsPending.length
                  : 0
            const label =
              t.id === 'eingabe' && totalPending > 0
                ? `✏️ Eingabe (${totalPending} offen)`
                : t.label
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative whitespace-nowrap border-b-2 px-4 py-3 text-[15px] font-semibold transition-colors ${
                  active
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
                {badge > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800"
                    title={`${badge} nicht zugeordnete Einträge aus dem letzten CSV-Import`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'eingabe' && (
        <EingabeTab
          profilAnalytics={profilAnalytics}
          pins={pins}
          boards={boards}
          latestZeitraumBis={latestZeitraumBis}
          pinterestAnalyticsUrl={pinterestAnalyticsUrl}
          expectedZeitraumVon={expectedZeitraumVon}
          expectedZeitraumBis={expectedZeitraumBis}
          onImported={onImportFinished}
          onJumpToUnmatchedPins={() =>
            switchTab('pins', 'unmatched-pins')
          }
          onJumpToUnmatchedBoards={() =>
            switchTab('boards', 'unmatched-boards')
          }
          pendingNotice={eingabePendingNotice}
        />
      )}

      {tab === 'profil' && (
        <ProfilTab profilAnalytics={profilAnalytics} />
      )}

      {tab === 'pins' && (
        <PinsTab
          pinAnalytics={pinAnalytics}
          pins={pins}
          thresholds={thresholds}
          unmatchedPins={pinsPending}
          unmatchedZeitraumVon={pendingImport?.zeitraum_von ?? ''}
          unmatchedZeitraumBis={pendingImport?.zeitraum_bis ?? ''}
          onUnmatchedPinResolved={removeUnmatchedPin}
        />
      )}
      {tab === 'boards' && (
        <BoardsTab
          boards={boards}
          boardAnalytics={boardAnalytics}
          boardHistory={boardHistory}
          thresholds={boardThresholds}
          publicBoardsWithoutAnalytics={publicBoardsWithoutAnalytics}
          unmatchedBoards={boardsPending}
          unmatchedZeitraumVon={pendingImport?.zeitraum_von ?? ''}
          unmatchedZeitraumBis={pendingImport?.zeitraum_bis ?? ''}
          onUnmatchedBoardResolved={removeUnmatchedBoard}
        />
      )}
    </div>
  )
}
