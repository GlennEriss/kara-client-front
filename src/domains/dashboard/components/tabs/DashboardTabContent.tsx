'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardTabPayload } from '../../entities/dashboard.types'
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

interface DashboardTabContentProps {
  payload: DashboardTabPayload
}

const CHART_COLORS = ['#234D65', '#CBB171', '#2E7D32', '#D97706', '#D32F2F', '#5E35B1', '#0288D1']

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

export function DashboardTabContent({ payload }: DashboardTabContentProps) {
  return (
    <div className="space-y-4">
      <Card className="border-kara-primary-dark/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-extrabold text-kara-primary-dark">{payload.title}</CardTitle>
          {payload.subtitle && (
            <p className="text-sm text-muted-foreground">{payload.subtitle}</p>
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
                <Badge variant="outline" className={getToneClass(kpi.tone)}>
                  KPI
                </Badge>
              </div>
              {kpi.subtitle && (
                <p className="mt-2 text-xs text-muted-foreground">{kpi.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
                      <div className="h-56 w-full">
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
                              <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR')} />
                            </PieChart>
                          ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR')} />
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
                          <div key={`${distribution.key}-item-${item.label}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="text-muted-foreground">{item.label}</span>
                            </div>
                            <span className="font-semibold text-kara-primary-dark">{item.value.toLocaleString('fr-FR')}</span>
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

      {payload.rankings && payload.rankings.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {payload.rankings.map((ranking) => {
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
