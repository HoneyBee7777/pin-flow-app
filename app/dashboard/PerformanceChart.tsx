'use client'

import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPercent, formatZahl } from './analytics/utils'

const MONATE_KURZ_DE = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
]

function formatMonthShort(iso: string): string {
  const [y, m] = iso.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MONATE_KURZ_DE[idx] ?? m} ${y.slice(2)}`
}

export type ChartPoint = {
  datum: string
  impressionen: number
  ausgehende_klicks: number
  saves: number
  engagement: number | null
}

type Metric = 'klicks' | 'saves' | 'impressionen' | 'engagement'

const METRIC_CONFIG: Record<
  Metric,
  {
    label: string
    key: keyof Omit<ChartPoint, 'datum'>
    color: string
    isPercent?: boolean
  }
> = {
  klicks: {
    label: 'Klicks',
    key: 'ausgehende_klicks',
    color: '#ea580c',
  },
  saves: {
    label: 'Saves',
    key: 'saves',
    color: '#16a34a',
  },
  impressionen: {
    label: 'Impressionen',
    key: 'impressionen',
    color: '#2563eb',
  },
  engagement: {
    label: 'Engagement Rate',
    key: 'engagement',
    color: '#9333ea',
    isPercent: true,
  },
}

export default function PerformanceChart({ data }: { data: ChartPoint[] }) {
  const [metric, setMetric] = useState<Metric>('klicks')
  const cfg = METRIC_CONFIG[metric]

  const chartData = data.map((d) => {
    const raw = d[cfg.key]
    return {
      label: formatMonthShort(d.datum),
      value: raw === null || raw === undefined ? null : Number(raw),
    }
  })

  const formatY = (v: number) =>
    cfg.isPercent ? formatPercent(v) : formatZahl(v)

  return (
    <div>
      <div className="mb-3 inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-sm">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              metric === m
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickFormatter={(v) => formatY(Number(v))}
            />
            <Tooltip
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value)
                return [
                  Number.isFinite(n) ? formatY(n) : '—',
                  cfg.label,
                ]
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              contentStyle={{
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={cfg.label}
              stroke={cfg.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
