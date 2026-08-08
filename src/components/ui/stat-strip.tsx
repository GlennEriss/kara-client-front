import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Bande de chiffres clés des fiches de détail contrat.
 *
 * Volontairement plate — un seul panneau gris, pas de cartes ni d'ombres — pour
 * que la page reste lisible d'un coup d'œil. C'est le gabarit déjà employé par
 * les fiches Caisse Imprévue et Caisse Spéciale.
 */

export type StatStripItem = {
  title: string
  value: React.ReactNode
  subtitle?: string
  /** Met la valeur en avant (bleu KARA). */
  accent?: boolean
  /** Signale une valeur problématique (retard). Prime sur `accent`. */
  danger?: boolean
}

export function StatStrip({
  stats,
  className,
}: {
  stats: StatStripItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3 lg:grid-cols-6',
        className
      )}
    >
      {stats.map((stat) => (
        <div key={stat.title}>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {stat.title}
          </p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              stat.danger ? 'text-red-700' : stat.accent ? 'text-[#234D65]' : 'text-gray-900'
            )}
          >
            {stat.value}
          </p>
          {stat.subtitle && <p className="mt-0.5 text-[10px] text-gray-400">{stat.subtitle}</p>}
        </div>
      ))}
    </div>
  )
}
