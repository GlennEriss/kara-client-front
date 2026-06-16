'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

/**
 * Petit camembert décoratif des cartes de stats, isolé pour permettre le
 * chargement à la demande de recharts (hors bundle initial de la liste).
 */
export default function MiniPieChart({ data }: { data: Array<{ value: number; fill: string }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={16}
          outerRadius={22}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
