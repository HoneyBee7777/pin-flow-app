'use client'

import { Fragment, useMemo, useState } from 'react'
import type { AudienceInterest } from '@/lib/audience-types'
import {
  formatCategoryLabel,
  slugifyCategory,
} from '@/lib/audience-translations'

// V3.0 — Sektion C des Audience-Tabs: sortierbare Tabelle mit allen
// Top-Level-Interessen-Kategorien. Klick auf eine Zeile klappt die zugehörigen
// Sub-Interessen aus. Spalten + Sortier-Schalter folgen exakt der V3.0-Spec.

type SortKey = 'category' | 'percent' | 'affinity' | 'rating'
type SortDir = 'asc' | 'desc'

const STRONG_AFFINITY_THRESHOLD = 1.5
const NEUTRAL_AFFINITY_THRESHOLD = 0.8

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1).replace('.', ',')} %`
}

function formatAffinity(a: number): string {
  return a.toFixed(2).replace('.', ',')
}

type Rating = {
  emoji: string
  label: string
  textCls: string
  // Rank für Sortierung: 2 = stark, 1 = neutral, 0 = schwach.
  rank: 0 | 1 | 2
}

function ratingFor(affinity: number): Rating {
  if (affinity >= STRONG_AFFINITY_THRESHOLD) {
    return { emoji: '🟢', label: 'Stark', textCls: 'text-green-700', rank: 2 }
  }
  if (affinity >= NEUTRAL_AFFINITY_THRESHOLD) {
    return { emoji: '🟡', label: 'Neutral', textCls: 'text-amber-700', rank: 1 }
  }
  return { emoji: '🔴', label: 'Schwach', textCls: 'text-red-700', rank: 0 }
}

export default function AudienceInterestsTable({
  interests,
}: {
  interests: AudienceInterest[]
}) {
  // V3.0.1: Default-Sortierung Affinitäts-Index absteigend — die Themen mit
  // dem höchsten Hebel stehen damit oben (vorher: Anteil Audience, was die
  // Pinterest-typischen Themen wie Home Decor / Art zeigt — wenig strategisch).
  const [sortKey, setSortKey] = useState<SortKey>('affinity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const sorted = useMemo(() => {
    const arr = interests.slice()
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'category':
          cmp = a.category.localeCompare(b.category, 'de')
          break
        case 'percent':
          cmp = a.percent - b.percent
          break
        case 'affinity':
          cmp = a.affinity - b.affinity
          break
        case 'rating':
          cmp = ratingFor(a.affinity).rank - ratingFor(b.affinity).rank
          // Bei Gleichstand nach Affinität sortieren, damit die Sub-Sortierung
          // innerhalb einer Bewertungs-Stufe deterministisch ist.
          if (cmp === 0) cmp = a.affinity - b.affinity
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [interests, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Sinnvolle Defaults: Kategorie alphabetisch aufsteigend, Zahlen absteigend.
      setSortDir(key === 'category' ? 'asc' : 'desc')
    }
  }

  function toggleExpand(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <h3 className="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-900">
        Interessen & Affinitäten
      </h3>
      {/* V3.0.1: Erklär-Hinweis direkt unter dem Titel — macht klar, warum
          die Affinitäts-Sortierung der strategische Default ist. */}
      <div className="border-b border-gray-100 bg-blue-50 px-4 py-2 text-xs text-blue-900">
        <span aria-hidden className="mr-1">
          💡
        </span>
        Sortiert nach Affinitäts-Index — die Themen oben sind dein
        strategischer Hebel: Hier interessiert sich deine Audience stärker
        als der Pinterest-Durchschnitt.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left font-medium">
                <SortButton
                  k="category"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort('category')}
                >
                  Kategorie
                </SortButton>
              </th>
              <th className="px-4 py-2 text-right font-medium">
                <SortButton
                  k="percent"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort('percent')}
                >
                  Anteil Audience
                </SortButton>
              </th>
              <th className="px-4 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <SortButton
                    k="affinity"
                    current={sortKey}
                    dir={sortDir}
                    onClick={() => handleSort('affinity')}
                  >
                    Affinitäts-Index
                  </SortButton>
                  {/* V3.0.4: sichtbares ⓘ-Icon konsistent zum App-Stil
                      (V2.0.1). Nativer Tooltip per title-Attribut +
                      cursor-help — matched die bestehende Tooltip-UX in
                      PinsTab. */}
                  <span
                    aria-hidden
                    className="cursor-help text-gray-400 hover:text-gray-600"
                    title={
                      'Affinitäts-Index zeigt, wie stark deine Audience an einem Thema interessiert ist verglichen mit der Pinterest-Allgemeinheit.\n\n' +
                      '🟢 ≥ 1,5: Stark überdurchschnittlich (dein Hebel)\n' +
                      '🟡 0,8–1,5: Durchschnittlich\n' +
                      '🔴 < 0,8: Unterdurchschnittlich'
                    }
                  >
                    ⓘ
                  </span>
                </span>
              </th>
              <th className="px-4 py-2 text-left font-medium">
                <SortButton
                  k="rating"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort('rating')}
                >
                  Bewertung
                </SortButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((interest) => {
              const rating = ratingFor(interest.affinity)
              const isExpanded = expanded.has(interest.category)
              const hasSubs = interest.subInterests.length > 0
              return (
                <Fragment key={interest.category}>
                  <tr
                    // V3.0 Phase 2d: stabile Row-IDs für die Pillen-Deep-Links
                    // vom Dashboard-Widget (Hash-Format: `#interest-<slug>`).
                    id={`interest-${slugifyCategory(interest.category)}`}
                    className={`scroll-mt-4 border-t border-gray-100 ${
                      hasSubs ? 'cursor-pointer hover:bg-gray-50' : ''
                    }`}
                    onClick={() => hasSubs && toggleExpand(interest.category)}
                  >
                    <td className="px-4 py-2 text-gray-900">
                      <span className="mr-1 inline-block w-3 text-gray-400">
                        {hasSubs ? (isExpanded ? '▾' : '▸') : ''}
                      </span>
                      {formatCategoryLabel(interest.category)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {formatPercent(interest.percent)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {formatAffinity(interest.affinity)}
                    </td>
                    <td className={`px-4 py-2 ${rating.textCls}`}>
                      <span className="mr-1" aria-hidden>
                        {rating.emoji}
                      </span>
                      {rating.label}
                    </td>
                  </tr>
                  {isExpanded && hasSubs && (
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-3">
                        <ul className="space-y-1 text-xs">
                          {interest.subInterests.map((sub) => (
                            <li
                              key={sub.name}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="text-gray-800">{sub.name}</span>
                              <span className="shrink-0 tabular-nums text-gray-500">
                                {formatPercent(sub.percent)}
                                <span className="mx-1.5 text-gray-300">·</span>
                                Affinität {formatAffinity(sub.affinity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SortButton({
  k,
  current,
  dir,
  onClick,
  children,
}: {
  k: SortKey
  current: SortKey
  dir: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  const active = k === current
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition-colors ${
        active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`text-xs ${active ? 'text-gray-700' : 'text-gray-300'}`}
      >
        {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}
