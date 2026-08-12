'use client'

import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { MAX_CHARITY_STARS } from '../entities/charity-stars.types'

/**
 * Étoiles de charité d'un membre.
 *
 * Deux rendus, parce qu'aucun ne convient partout : douze étoiles alignées sont
 * illisibles dans une ligne de tableau, et un simple « ★ 5 » ne montre pas la
 * progression vers le plafond sur une fiche.
 */

type CharityStarsProps = {
  stars: number
  /** `compact` : une étoile + le nombre. `full` : les 12 emplacements. */
  variant?: 'compact' | 'full'
  className?: string
}

const GOLD = '#CBB171'

export function CharityStars({ stars, variant = 'compact', className }: CharityStarsProps) {
  const safeStars = Math.min(MAX_CHARITY_STARS, Math.max(0, Math.trunc(stars) || 0))
  const label = `${safeStars} étoile${safeStars > 1 ? 's' : ''} de charité sur ${MAX_CHARITY_STARS}`

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
          safeStars > 0
            ? 'border-[#CBB171]/40 bg-[#CBB171]/10 text-[#8a6d2f]'
            : 'border-slate-200 bg-slate-50 text-slate-400',
          className
        )}
        title={label}
        aria-label={label}
      >
        <Star
          className="h-3.5 w-3.5"
          aria-hidden
          fill={safeStars > 0 ? GOLD : 'none'}
          color={safeStars > 0 ? GOLD : 'currentColor'}
        />
        {safeStars}
      </span>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)} aria-label={label}>
      <div className="flex flex-wrap gap-1" role="img" aria-hidden>
        {Array.from({ length: MAX_CHARITY_STARS }).map((_, index) => {
          const earned = index < safeStars
          return (
            <Star
              key={index}
              className="h-5 w-5"
              fill={earned ? GOLD : 'none'}
              color={earned ? GOLD : '#cbd5e1'}
            />
          )
        })}
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        {safeStars} / {MAX_CHARITY_STARS}
        {safeStars >= MAX_CHARITY_STARS && ' — plafond atteint'}
      </p>
    </div>
  )
}
