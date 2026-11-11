'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/responsive-dialog'
import { DEFAULT_DASHBOARD_FILTERS } from '../../entities/dashboard.types'
import { fullRankingTitle, rankingValue, rankingValueLabel, type DashboardExportContext } from '../../exports/dashboard-export-model'
import { DashboardExportButton } from '../DashboardExportButton'
import type { DashboardRankingBlock } from '../../entities/dashboard.types'

export function DashboardRankingCards({ rankings, context }: { rankings: DashboardRankingBlock[]; context?: DashboardExportContext }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const active = rankings.find(ranking => ranking.key === activeKey)
  const exportContext = context || { title: 'Tableau de bord', generatedAt: new Date().toISOString(), filters: DEFAULT_DASHBOARD_FILTERS }
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean)
  const filtered = active?.items.map((item, index) => ({ ...item, rank: index + 1 }))
    .filter(item => terms.every(term => normalize(`${item.label} ${item.subLabel || ''}`).includes(term))) || []
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20))
  if (!rankings.length) return null
  return (
    <><section className="grid gap-4 xl:grid-cols-2" aria-label="Classements de la section">
      {rankings.map(ranking => {
        const max = ranking.items.reduce((value, item) => Math.max(value, item.value), 1)
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
                {ranking.items.slice(0, 10).map((item, index) => {
                  const content = (
                    <>
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', danger ? 'bg-red-50 text-red-700' : 'bg-[#234D65]/10 text-[#234D65]')} aria-label={`Position ${index + 1}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
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
            {!!ranking.items.length && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">{Math.min(10, ranking.items.length)} sur {ranking.items.length}</p>
              <Button type="button" size="sm" variant="outline" aria-label={`Voir plus : ${ranking.title}`} onClick={() => { setActiveKey(ranking.key); setSearch(''); setPage(1) }}>Voir plus</Button>
            </div>}
          </article>
        )
      })}
    </section>
    <Dialog open={!!active} onOpenChange={open => { if (!open) setActiveKey(null) }}>
      <DialogContent className="grid-cols-1 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Classement complet — {active ? fullRankingTitle(active.title) : ''}</DialogTitle>
          <DialogDescription>{active?.description || 'Consultez toutes les lignes du classement de cette section.'}</DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input className="sm:max-w-sm" aria-label="Rechercher dans le classement" placeholder="Rechercher un nom, matricule ou libellé" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
          {active && <DashboardExportButton label="Exporter le classement" disabled={!filtered.length} data={{ context: exportContext,
            payload: { title: exportContext.title, kpis: [], rankings: [{ ...active, items: filtered }] }, rankingOnly: true, search }} />}
        </div>
        <p className="text-xs text-gray-500">{filtered.length} résultat(s) sur {active?.items.length || 0}. L’export contient tous les résultats de la recherche, sur toutes les pages, avec leur rang d’origine.</p>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[560px] text-left text-sm" aria-label="Classement complet">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="p-3">Rang</th><th className="p-3">Nom / Libellé</th><th className="p-3">Matricule et précisions</th><th className="p-3 text-right">{active ? rankingValueLabel(active) : 'Valeur'}</th></tr></thead>
            <tbody>{active && filtered.slice((page - 1) * 20, page * 20).map(item => <tr key={item.id || item.rank} className="border-t border-gray-100">
              <td className="p-3 font-semibold text-[#234D65]">{item.rank}</td>
              <td className="max-w-xs break-words p-3 font-semibold">{item.href ? <Link className="text-[#234D65] underline-offset-4 hover:underline" href={item.href}>{item.label}</Link> : item.label}</td>
              <td className="max-w-sm break-words p-3 text-gray-500">{item.subLabel || '—'}</td>
              <td className="whitespace-nowrap p-3 text-right font-semibold">{active.kind === 'recent' ? rankingValue(item, active) : item.value.toLocaleString('fr-FR')}</td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <p className="p-4 text-center text-sm text-gray-500">Aucun résultat pour cette recherche.</p>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Button>
          <span className="text-xs text-gray-500">Page {page} sur {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      </DialogContent>
    </Dialog></>
  )
}
