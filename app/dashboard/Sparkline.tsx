'use client'

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

export type SparkPoint = { x: string; y: number }

export default function Sparkline({
  data,
  height = 40,
  width = 96,
}: {
  data: SparkPoint[]
  height?: number
  width?: number
}) {
  if (data.length < 2) return null

  const first = data[0].y
  const last = data[data.length - 1].y
  const stroke =
    last > first ? '#16a34a' : last < first ? '#dc2626' : '#9ca3af'

  return (
    <div style={{ width, height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
