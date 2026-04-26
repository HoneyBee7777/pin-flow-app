'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatZahl } from './analytics/utils'

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
}

export default function PerformanceChart({ data }: { data: ChartPoint[] }) {
  const chartData = data.map((d) => ({
    label: formatMonthShort(d.datum),
    impressionen: d.impressionen,
    ausgehende_klicks: d.ausgehende_klicks,
    saves: d.saves,
  }))

  return (
    <div className="h-80 w-full">
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
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#9ca3af"
            tickFormatter={(v) => formatZahl(Number(v))}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#9ca3af"
            tickFormatter={(v) => formatZahl(Number(v))}
          />
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value)
              return [Number.isFinite(n) ? formatZahl(n) : '—', name]
            }}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
            contentStyle={{
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            verticalAlign="bottom"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="impressionen"
            name="Impressionen"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ausgehende_klicks"
            name="Ausgehende Klicks"
            stroke="#ea580c"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="saves"
            name="Saves"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
