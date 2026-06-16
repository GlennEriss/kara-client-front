'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface PieDatum {
  name: string
  value: number
  color: string
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-gray-600">{payload[0].value} administrateur(s)</p>
      </div>
    )
  }
  return null
}

/**
 * Camembert du dashboard, isolé dans son propre module pour permettre le
 * chargement à la demande (recharts est lourd et n'a pas besoin d'être dans
 * le bundle initial de la page d'accueil).
 */
export default function DashboardPieChart({ data }: { data: PieDatum[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
