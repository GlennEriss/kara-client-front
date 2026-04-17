'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
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

function formatMetric(value: number, format: DashboardTabPayload['kpis'][number]['format']): string {
  if (format === 'currency') {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`
  }

  if (format === 'percent') {
    return `${value.toFixed(1)}%`
  }

  return Math.round(value).toLocaleString('fr-FR')
}

function getToneClass(tone: DashboardTabPayload['kpis'][number]['tone']): string {
  if (tone === 'success') return 'bg-green-50 text-green-700 border-green-200'
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (tone === 'danger') return 'bg-red-50 text-red-700 border-red-200'
  if (tone === 'primary') return 'bg-kara-primary-dark/10 text-kara-primary-dark border-kara-primary-dark/20'
  return 'bg-gray-50 text-gray-700 border-gray-200'
}

function getToneLabel(tone: DashboardTabPayload['kpis'][number]['tone']): string {
  if (tone === 'success') return 'Stable'
  if (tone === 'warning') return 'Attention'
  if (tone === 'danger') return 'Critique'
  if (tone === 'primary') return 'Pilotage'
  return 'Info'
}

function getProgressClass(value: number, max: number): string {
  const ratio = max <= 0 ? 0 : value / max
  if (ratio >= 0.75) return 'bg-red-500'
  if (ratio >= 0.45) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getExecutiveBadgeClass(tone: DashboardTabPayload['kpis'][number]['tone']): string {
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (tone === 'danger') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
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

export function DashboardTabContent({
  payload,
  executiveMembersPage,
  executiveMembersPageIndex = 0,
  executiveMembersLoading = false,
  onExecutivePrevPage,
  onExecutiveNextPage,
}: DashboardTabContentProps) {
  const isExecutive = payload.title.trim().toLowerCase() === EXECUTIVE_TITLE
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
    <div className="space-y-4">
      <Card className="border-kara-primary-dark/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-extrabold text-kara-primary-dark">{payload.title}</CardTitle>
          {payload.subtitle && (
            <p className="text-sm text-muted-foreground">{payload.subtitle}</p>
          )}
          {isExecutive && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-kara-primary-dark/5 text-kara-primary-dark border-kara-primary-dark/20">
                Vue decisionnelle
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Priorites des 24h
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {payload.kpis.map((kpi) => (
          <Card key={kpi.key} className="border-kara-primary-dark/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-black text-kara-primary-dark">
                    {formatMetric(kpi.value, kpi.format)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={isExecutive ? getExecutiveBadgeClass(kpi.tone) : getToneClass(kpi.tone)}
                >
                  {getToneLabel(kpi.tone)}
                </Badge>
              </div>
              {kpi.subtitle && (
                <p className="mt-2 text-xs text-muted-foreground">{kpi.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isExecutive && executiveMembersRanking && (
        <Card className="border-kara-primary-dark/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-kara-primary-dark">
              {executiveMembersRanking.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Liste prioritaire des membres ayant au moins un contrat actif dans les modules.
            </p>
          </CardHeader>
          <CardContent>
            {executiveMembersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des membres actifs...</p>
            ) : executiveMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre avec contrat actif sur ce scope.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {executiveMembers.map((item) => (
                  <div
                    key={`executive-member-${item.label}`}
                    className="rounded-xl border border-kara-primary-dark/15 bg-gradient-to-br from-white via-slate-50 to-kara-primary-dark/5 p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="truncate text-sm font-bold text-kara-primary-dark">{item.label}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.subLabel || 'Aucun detail disponible.'}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-kara-primary-dark/30 bg-kara-primary-dark text-white"
                      >
                        {item.value} module(s) actif(s)
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="inline-flex items-center rounded-lg border border-kara-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-kara-primary-dark transition-colors hover:bg-kara-primary-dark/5"
                        >
                          Ouvrir la fiche membre
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 border-t border-kara-primary-dark/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Page {executiveMembersPageIndex + 1} - {executiveMembers.length} membre(s) affiche(s)
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
          </CardContent>
        </Card>
      )}

      {payload.distributions && payload.distributions.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {payload.distributions.map((distribution) => {
            const chartData = distribution.items.map((item, index) => ({
              ...item,
              fill: CHART_COLORS[index % CHART_COLORS.length],
            }))

            const hasData = distribution.items.some((item) => item.value > 0)

            return (
              <Card key={distribution.key} className="border-kara-primary-dark/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-kara-primary-dark">{distribution.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasData ? (
                    <p className="text-sm text-muted-foreground">Aucune donnee disponible.</p>
                  ) : (
                    <>
                      <div className="h-52 w-full sm:h-56">
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
                                tick={{ fontSize: 11 }}
                                interval={0}
                                height={34}
                                tickFormatter={(value: string) => (isExecutive ? shortModuleLabel(value) : value)}
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

                      <div className="grid gap-2">
                        {distribution.items.map((item, index) => (
                          <div key={`${distribution.key}-item-${item.label}`} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="max-w-[140px] truncate text-muted-foreground sm:max-w-none">
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {isExecutive && executiveRanking && executiveRanking.items.length > 0 && (
        <Card className="border-kara-primary-dark/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-kara-primary-dark">
              Alertes operationnelles (retards et impayes)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Chaque ligne represente un sous-module. Plus le niveau est eleve, plus il y a de dossiers a traiter.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      )}

      {rankingsToRender.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {rankingsToRender.map((ranking) => {
            const max = Math.max(...ranking.items.map((item) => item.value), 1)

            return (
              <Card key={ranking.key} className="border-kara-primary-dark/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-kara-primary-dark">{ranking.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {ranking.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune donnee disponible.</p>
                  ) : (
                    <div className="space-y-3">
                      {ranking.items.map((item) => (
                        <div key={`${ranking.key}-${item.label}`} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-kara-primary-dark">{item.label}</p>
                              {item.subLabel && (
                                <p className="truncate text-xs text-muted-foreground">{item.subLabel}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-kara-primary-dark">
                                {item.value.toLocaleString('fr-FR')}{' '}
                                {ranking.unit ? <span className="text-xs font-medium text-muted-foreground">{ranking.unit}</span> : null}
                              </p>
                            </div>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {payload.notes && payload.notes.length > 0 && (
        <Card className="border-kara-primary-dark/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-kara-primary-dark">Notes metier</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {payload.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
