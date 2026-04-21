'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DashboardDistributionBlock,
  DashboardTabPayload,
  ExecutiveActiveMembersPage,
} from '../../entities/dashboard.types'

interface DashboardTabContentProps {
  payload: DashboardTabPayload
  executiveMembersPage?: ExecutiveActiveMembersPage | null
  executiveMembersPageIndex?: number
  executiveMembersLoading?: boolean
  onExecutivePrevPage?: () => void
  onExecutiveNextPage?: () => void
}

const CHART_COLORS = ['#234D65', '#CBB171', '#2E7D32', '#D97706', '#D32F2F', '#5E35B1', '#0288D1']
const EXECUTIVE_TITLE = 'executif'

type DashboardKpi = DashboardTabPayload['kpis'][number]

function formatMetric(value: number, format: DashboardKpi['format']): string {
  if (format === 'currency') {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`
  }

  if (format === 'percent') {
    return `${value.toFixed(1)}%`
  }

  return Math.round(value).toLocaleString('fr-FR')
}

function getToneLabel(tone?: DashboardKpi['tone']): string {
  if (tone === 'success') return 'Stable'
  if (tone === 'warning') return 'Attention'
  if (tone === 'danger') return 'Critique'
  if (tone === 'primary') return 'Pilotage'
  return 'Info'
}

function getToneBadgeClass(tone?: DashboardKpi['tone'], isExecutive = false): string {
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (tone === 'danger') return 'bg-red-50 text-red-700 border-red-200'
  if (tone === 'primary') {
    return isExecutive
      ? 'bg-slate-50 text-slate-700 border-slate-200'
      : 'bg-kara-primary-dark/10 text-kara-primary-dark border-kara-primary-dark/20'
  }
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

function getTonePanelClass(tone?: DashboardKpi['tone']): string {
  if (tone === 'success') return 'border-emerald-200/80 bg-emerald-50/70'
  if (tone === 'warning') return 'border-amber-200/80 bg-amber-50/70'
  if (tone === 'danger') return 'border-red-200/80 bg-red-50/70'
  if (tone === 'primary') return 'border-kara-primary-dark/20 bg-kara-primary-dark/[0.04]'
  return 'border-slate-200 bg-slate-50/70'
}

function getProgressClass(value: number, max: number): string {
  const ratio = max <= 0 ? 0 : value / max
  if (ratio >= 0.75) return 'bg-red-500'
  if (ratio >= 0.45) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function isCurrencyDistribution(distribution: DashboardDistributionBlock): boolean {
  const key = distribution.key.toLowerCase()
  const title = distribution.title.toLowerCase()
  return key.includes('encours') || title.includes('encours')
}

function formatDistributionValue(value: number, distribution: DashboardDistributionBlock): string {
  if (isCurrencyDistribution(distribution)) {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`
  }

  return Math.round(value).toLocaleString('fr-FR')
}

function getDistributionUnitLabel(distribution: DashboardDistributionBlock): string {
  return isCurrencyDistribution(distribution) ? 'FCFA' : 'demandes'
}

function shortModuleLabel(label: string): string {
  const normalized = label.trim().toLowerCase()
  if (normalized === 'placements') return 'Place.'
  if (normalized === 'caisse speciale') return 'C. spec'
  if (normalized === 'caisse imprevue') return 'C. impr'
  if (normalized === 'caisse aide') return 'C. aide'
  if (normalized === 'credit speciale') return 'Cr. spec'
  if (normalized === 'credit fixe') return 'Cr. fixe'
  if (normalized === 'credit') return 'Credit'
  if (normalized === 'caisse') return 'Caisse'
  return label
}

function shortDistributionLabel(label: string): string {
  const normalized = label.trim().toLowerCase()
  if (normalized === 'en attente') return 'Attente'
  if (normalized === 'approuvees' || normalized === 'approuvées') return 'Approuv.'
  if (normalized === 'rejetees' || normalized === 'rejetées') return 'Rejetees'
  if (normalized === 'converties') return 'Convert.'
  if (normalized === 'reouvertes' || normalized === 'réouvertes') return 'Reouv.'
  if (label.length <= 10) return label
  return `${label.slice(0, 9)}…`
}

export function DashboardTabContent({
  payload,
  executiveMembersPage,
  executiveMembersPageIndex = 0,
  executiveMembersLoading = false,
  onExecutivePrevPage,
  onExecutiveNextPage,
}: DashboardTabContentProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isExecutive = payload.title.trim().toLowerCase() === EXECUTIVE_TITLE

  const leadKpi = payload.kpis[0]
  const spotlightKpis = payload.kpis.slice(1, 4)
  const detailedKpis = payload.kpis.slice(4)

  const executiveRanking = isExecutive
    ? payload.rankings?.find((ranking) => ranking.key === 'module_alerts') ??
      payload.rankings?.find((ranking) => ranking.key === 'module_health')
    : undefined
  const executiveMembersRanking = isExecutive
    ? payload.rankings?.find((ranking) => ranking.key === 'members_with_active_contracts')
    : undefined
  const executiveMembers = isExecutive
    ? (executiveMembersPage?.items ?? executiveMembersRanking?.items ?? [])
    : []
  const rankingsToRender = isExecutive
    ? (payload.rankings || []).filter(
      (ranking) =>
        ranking.key !== 'module_health' &&
        ranking.key !== 'module_alerts' &&
        ranking.key !== 'members_with_active_contracts'
    )
    : payload.rankings || []
  const maxExecutiveRisk = executiveRanking?.items.length
    ? Math.max(...executiveRanking.items.map((item) => item.value), 1)
    : 1

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-kara-primary-dark/15 bg-gradient-to-br from-white via-kara-primary-dark/[0.03] to-kara-primary-light/[0.10]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-kara-primary-light/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-kara-primary-dark/10 blur-2xl" />

        <div className="relative grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kara-primary-dark/70">Vue metier</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-kara-primary-dark sm:text-3xl">{payload.title}</h2>
            {payload.subtitle && (
              <p className="mt-2 max-w-3xl text-sm text-kara-primary-dark/80">{payload.subtitle}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-kara-primary-dark/20 bg-white/80 text-kara-primary-dark">
                {payload.kpis.length} indicateur(s)
              </Badge>
              {isExecutive && (
                <>
                  <Badge variant="outline" className="bg-kara-primary-dark/5 text-kara-primary-dark border-kara-primary-dark/20">
                    Vue decisionnelle
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Priorites des 24h
                  </Badge>
                </>
              )}
            </div>
          </div>

          {leadKpi && (
            <div className={cn('rounded-2xl border p-4 shadow-sm', getTonePanelClass(leadKpi.tone))}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kara-primary-dark/70">Indicateur cle</p>
              <p className="mt-2 text-sm font-semibold text-kara-primary-dark">{leadKpi.label}</p>
              <p className="mt-1 text-2xl font-black text-kara-primary-dark">{formatMetric(leadKpi.value, leadKpi.format)}</p>
              {leadKpi.subtitle && (
                <p className="mt-2 text-xs text-kara-primary-dark/70">{leadKpi.subtitle}</p>
              )}
              <Badge variant="outline" className={cn('mt-3', getToneBadgeClass(leadKpi.tone, isExecutive))}>
                {getToneLabel(leadKpi.tone)}
              </Badge>
            </div>
          )}
        </div>
      </section>

      {spotlightKpis.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {spotlightKpis.map((kpi) => (
            <article
              key={kpi.key}
              className={cn(
                'rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                getTonePanelClass(kpi.tone)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/75">{kpi.label}</p>
                <Badge variant="outline" className={getToneBadgeClass(kpi.tone, isExecutive)}>
                  {getToneLabel(kpi.tone)}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-black text-kara-primary-dark">{formatMetric(kpi.value, kpi.format)}</p>
              {kpi.subtitle && <p className="mt-1 text-xs text-kara-primary-dark/70">{kpi.subtitle}</p>}
            </article>
          ))}
        </section>
      )}

      {detailedKpis.length > 0 && (
        <section className="rounded-2xl border border-kara-primary-dark/12 bg-white/95 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-kara-primary-dark">Indicateurs detailles</h3>
            <Badge variant="outline" className="border-kara-primary-dark/20 bg-kara-primary-dark/5 text-kara-primary-dark">
              {detailedKpis.length} valeur(s)
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {detailedKpis.map((kpi) => (
              <div key={kpi.key} className="rounded-xl border border-kara-primary-dark/10 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-kara-primary-dark">{kpi.label}</p>
                    {kpi.subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{kpi.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', getToneBadgeClass(kpi.tone, isExecutive))}>
                    {getToneLabel(kpi.tone)}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-black text-kara-primary-dark">{formatMetric(kpi.value, kpi.format)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isExecutive && executiveMembersRanking && (
        <section className="rounded-2xl border border-kara-primary-dark/12 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-kara-primary-dark">{executiveMembersRanking.title}</h3>
              <p className="text-xs text-muted-foreground">Liste prioritaire des membres ayant au moins un contrat actif.</p>
            </div>
            <Badge variant="outline" className="border-kara-primary-dark/20 bg-kara-primary-dark/5 text-kara-primary-dark">
              Page {executiveMembersPageIndex + 1}
            </Badge>
          </div>

          <div className="mt-4">
            {executiveMembersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des membres actifs...</p>
            ) : executiveMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre avec contrat actif sur ce scope.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {executiveMembers.map((item) => (
                  <div
                    key={`executive-member-${item.label}`}
                    className="rounded-xl border border-kara-primary-dark/15 bg-gradient-to-br from-white via-slate-50 to-kara-primary-dark/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-bold text-kara-primary-dark">{item.label}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.subLabel || 'Aucun detail disponible.'}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-kara-primary-dark/30 bg-kara-primary-dark text-white"
                      >
                        {item.value} module(s)
                      </Badge>
                    </div>
                    {item.href ? (
                      <div className="mt-3 flex justify-end">
                        <Link
                          href={item.href}
                          className="inline-flex items-center rounded-lg border border-kara-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-kara-primary-dark transition-colors hover:bg-kara-primary-dark/5"
                        >
                          Ouvrir la fiche membre
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-kara-primary-dark/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {executiveMembers.length} membre(s) affiche(s)
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={executiveMembersLoading || executiveMembersPageIndex <= 0}
                onClick={onExecutivePrevPage}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Precedent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={executiveMembersLoading || !executiveMembersPage?.hasNextPage}
                onClick={onExecutiveNextPage}
              >
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {payload.distributions && payload.distributions.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-2">
          {payload.distributions.map((distribution) => {
            const chartData = distribution.items.map((item, index) => ({
              ...item,
              fill: CHART_COLORS[index % CHART_COLORS.length],
            }))

            const hasData = distribution.items.some((item) => item.value > 0)

            return (
              <article
                key={distribution.key}
                className="rounded-2xl border border-kara-primary-dark/12 bg-white p-4 sm:p-5"
              >
                <h3 className="text-base font-extrabold text-kara-primary-dark">{distribution.title}</h3>

                {!hasData ? (
                  <p className="mt-3 text-sm text-muted-foreground">Aucune donnee disponible.</p>
                ) : (
                  <>
                    <div className="mt-3 h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {distribution.chartType === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="label"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`${distribution.key}-${entry.label}-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => formatDistributionValue(value, distribution)}
                              labelFormatter={(label: string) => shortModuleLabel(label)}
                            />
                          </PieChart>
                        ) : (
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: isMobile ? 10 : 11 }}
                              interval={0}
                              minTickGap={isMobile ? 14 : 8}
                              tickMargin={isMobile ? 10 : 8}
                              angle={isMobile ? -18 : 0}
                              textAnchor={isMobile ? 'end' : 'middle'}
                              height={isMobile ? 58 : 34}
                              tickFormatter={(value: string) => {
                                if (isExecutive) return shortModuleLabel(value)
                                if (isMobile) return shortDistributionLabel(value)
                                return value
                              }}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number) => formatDistributionValue(value, distribution)}
                              labelFormatter={(label: string) => shortModuleLabel(label)}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`${distribution.key}-bar-${entry.label}-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {distribution.items.map((item, index) => (
                        <div
                          key={`${distribution.key}-item-${item.label}`}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="max-w-[160px] truncate text-muted-foreground sm:max-w-none">
                              {item.label}
                            </span>
                          </div>
                          <span className="shrink-0 font-semibold text-kara-primary-dark">
                            {formatDistributionValue(item.value, distribution)}{' '}
                            <span className="text-xs font-medium text-muted-foreground">
                              {getDistributionUnitLabel(distribution)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </section>
      )}

      {isExecutive && executiveRanking && executiveRanking.items.length > 0 && (
        <section className="rounded-2xl border border-kara-primary-dark/12 bg-white p-4 sm:p-5">
          <h3 className="text-base font-extrabold text-kara-primary-dark">Alertes operationnelles</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Plus le niveau est eleve, plus il y a de dossiers a traiter.
          </p>

          <div className="mt-3 space-y-3">
            {executiveRanking.items.map((item) => (
              <div key={`executive-risk-${item.label}`} className="rounded-lg border border-kara-primary-dark/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-kara-primary-dark">{item.label}</p>
                  <Badge
                    variant="outline"
                    className={item.value >= 1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                  >
                    {item.value >= 1 ? 'Action requise' : 'Sous controle'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.subLabel || 'Aucun detail disponible.'}</p>
                <div className="mt-2 h-2 w-full rounded-full bg-kara-primary-dark/10">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressClass(item.value, maxExecutiveRisk)}`}
                    style={{ width: `${Math.max(6, (item.value / maxExecutiveRisk) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {rankingsToRender.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-2">
          {rankingsToRender.map((ranking) => {
            const max = Math.max(...ranking.items.map((item) => item.value), 1)

            return (
              <article key={ranking.key} className="rounded-2xl border border-kara-primary-dark/12 bg-white p-4 sm:p-5">
                <h3 className="text-base font-extrabold text-kara-primary-dark">{ranking.title}</h3>

                {ranking.items.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Aucune donnee disponible.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {ranking.items.map((item) => (
                      <div key={`${ranking.key}-${item.label}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-kara-primary-dark">{item.label}</p>
                            {item.subLabel && (
                              <p className="truncate text-xs text-muted-foreground">{item.subLabel}</p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-kara-primary-dark">
                            {item.value.toLocaleString('fr-FR')}{' '}
                            {ranking.unit ? <span className="text-xs font-medium text-muted-foreground">{ranking.unit}</span> : null}
                          </p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-kara-primary-dark/10">
                          <div
                            className="h-2 rounded-full bg-kara-primary-dark transition-all"
                            style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {payload.notes && payload.notes.length > 0 && (
        <section className="rounded-2xl border border-kara-primary-dark/12 bg-white p-4 sm:p-5">
          <h3 className="text-base font-extrabold text-kara-primary-dark">Notes metier</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {payload.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
