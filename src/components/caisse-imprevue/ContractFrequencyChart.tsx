'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

export default function ContractFrequencyChart({ data, colors, isMobile }: {
  data: Array<{ type: string; label: string; count: number }>
  colors: string[]
  isMobile: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={isMobile ? 70 : 90} label={!isMobile}>
          {data.map((entry, index) => <Cell key={`frequency-${entry.type}`} fill={colors[index % colors.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
