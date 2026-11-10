'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardRankingBlock } from '../../entities/dashboard.types'

export function DashboardRankingCards({ rankings }: { rankings: DashboardRankingBlock[] }) {
  if (!rankings.length) return null
  return (
    <section className="grid gap-4 xl:grid-cols-2" aria-label="Classements de la section">
      {rankings.map(ranking => {
        const max = Math.max(...ranking.items.map(item => item.value), 1)
        const danger = ranking.tone === 'danger'
        const recent = ranking.kind === 'recent'
        return (
          <article key={ranking.key} className={cn('min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5', danger ? 'border-red-100' : 'border-gray-100')}>
            <h3 className={cn('break-words text-base font-bold', danger ? 'text-red-700' : 'text-[#234D65]')}>{ranking.title}</h3>
            {ranking.description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{ranking.description}</p>}
            {!ranking.items.length ? (
              <p className="mt-3 text-sm text-gray-500">Aucune donnée disponible pour ce classement.</p>
            ) : (
              <ol className="mt-3 space-y-2" aria-label={ranking.title}>
                {ranking.items.map((item, index) => {
                  const content = (
                    <>
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', danger ? 'bg-red-50 text-red-700' : 'bg-[#234D65]/10 text-[#234D65]')} aria-label={`Position ${index + 1}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-[#234D65]">{item.label}</p>
                            {item.subLabel && <p className="break-words text-xs text-gray-500">{item.subLabel}</p>}
                          </div>
                          {recent ? (
                            item.date && <time dateTime={item.date} className="whitespace-nowrap text-sm font-semibold text-[#234D65]">
                              {new Date(item.date).toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })}
                            </time>
                          ) : (
                            <p className={cn('whitespace-nowrap text-sm font-bold', danger ? 'text-red-700' : 'text-[#234D65]')}>
                              {item.value.toLocaleString('fr-FR')}{' '}
                              {ranking.unit && <span className="text-xs font-medium text-gray-500">{ranking.unit}</span>}
                            </p>
                          )}
                        </div>
                        {!recent && <div className={cn('h-1.5 rounded-full', danger ? 'bg-red-50' : 'bg-[#234D65]/10')}>
                          <div className={cn('h-full rounded-full', danger ? 'bg-red-500' : 'bg-[#234D65]')} style={{ width: `${Math.min(100, Math.max(0, item.value / max * 100))}%` }} />
                        </div>}
                      </div>
                      {item.href && <ArrowUpRight className="h-4 w-4 shrink-0 text-[#234D65]/50" aria-hidden="true" />}
                    </>
                  )
                  const className = 'flex items-start gap-3 rounded-lg p-2 transition-colors'
                  return (
                    <li key={item.id ?? `${item.label}-${item.subLabel ?? ''}-${index}`}>
                      {item.href ? <Link href={item.href} className={cn(className, 'hover:bg-[#234D65]/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#234D65]')}>{content}</Link>
                        : <div className={className}>{content}</div>}
                    </li>
                  )
                })}
              </ol>
            )}
          </article>
        )
      })}
    </section>
  )
}
