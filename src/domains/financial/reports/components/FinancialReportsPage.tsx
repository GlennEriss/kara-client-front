'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { StatStrip, type StatStripItem } from '@/components/ui/stat-strip'
import { Switch } from '@/components/ui/switch'
import { useMyAccess } from '@/hooks/useMyAccess'
import { cn } from '@/lib/utils'
import { AlertCircle, BookOpen, ChevronDown, Download, FileSpreadsheet, Landmark, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  FINANCIAL_REPORT_MAX_MONTHS,
  type FinancialReport,
  type FinancialReportBlock,
  type FinancialReportLine,
  type FinancialReportModule,
  type MonthKey,
} from '../entities/financial-report.types'
import { FINANCIAL_REPORT_GUIDE } from '../entities/financial-report-guide'
import { formatReportNumber, reportPeriodLabel, TOTAL_COLUMN_LABEL } from '../exports/report-format'
import { useFinancialReport } from '../hooks/useFinancialReport'
import { addMonthsToKey, currentMonthKey, isMonthKey } from '../utils/report-months'

type Period = { from: MonthKey; to: MonthKey }

const lastMonths = (count: number): Period => {
  const to = currentMonthKey()
  return { from: addMonthsToKey(to, -(count - 1)), to }
}

const PRESETS: Array<{ label: string; period: () => Period }> = [
  { label: '3 derniers mois', period: () => lastMonths(3) },
  { label: '6 derniers mois', period: () => lastMonths(6) },
  { label: '12 derniers mois', period: () => lastMonths(12) },
  { label: 'Année en cours', period: () => ({ from: `${currentMonthKey().slice(0, 4)}-01`, to: currentMonthKey() }) },
  {
    label: 'Année précédente',
    period: () => {
      const year = Number(currentMonthKey().slice(0, 4)) - 1
      return { from: `${year}-01`, to: `${year}-12` }
    },
  },
]

function validatePeriod(period: Period): string | null {
  if (!isMonthKey(period.from) || !isMonthKey(period.to)) return 'Choisissez un mois de début et un mois de fin.'
  if (period.from > period.to) return 'Le mois de début doit précéder le mois de fin.'
  if (period.to > currentMonthKey()) return 'Le mois de fin ne peut pas être dans le futur.'
  if (period.from < addMonthsToKey(period.to, -(FINANCIAL_REPORT_MAX_MONTHS - 1))) {
    return `La période ne peut pas dépasser ${FINANCIAL_REPORT_MAX_MONTHS} mois.`
  }
  return null
}

const lineTotal = (module: FinancialReportModule, blockKey: FinancialReportBlock['key'], lineKey: string) =>
  module.blocks.find((block) => block.key === blockKey)?.lines.find((line) => line.key === lineKey)

/** Chiffres clés du module sur la période. */
function moduleStats(module: FinancialReportModule): StatStripItem[] {
  const fcfa = (value: number) => `${formatReportNumber(value)} FCFA`
  const stats: StatStripItem[] = []
  const inTotal = lineTotal(module, 'treasury', 'in_total')
  const outTotal = lineTotal(module, 'treasury', 'out_total')
  const result = lineTotal(module, 'result', 'net')
  if (inTotal) stats.push({ title: 'Entrées', value: fcfa(inTotal.total), subtitle: 'Argent reçu sur la période', accent: true })
  if (outTotal) stats.push({ title: 'Sorties', value: fcfa(outTotal.total), subtitle: 'Argent versé sur la période' })
  if (result) {
    stats.push({ title: 'Résultat', value: fcfa(result.total), subtitle: 'Produits moins charges', danger: result.total < 0 })
  }
  const outstanding = module.blocks.find((block) => block.key === 'outstanding')
  for (const line of outstanding?.lines.filter((entry) => entry.unit === 'fcfa' && entry.level !== 'detail').slice(0, 2) ?? []) {
    stats.push({ title: line.label, value: fcfa(line.total), subtitle: 'À la fin de la période' })
  }
  return stats
}

function ReportBlockTable({
  block,
  report,
  showDescriptions,
}: {
  block: FinancialReportBlock
  report: FinancialReport
  showDescriptions: boolean
}) {
  const cell = (value: number, line: FinancialReportLine) => (
    <span className={cn(value < 0 && 'text-red-600')}>{line.unit === 'count' || value !== 0 ? formatReportNumber(value) : '—'}</span>
  )

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#234D65]">{block.title}</h3>
        <p className="text-sm text-gray-500">{block.description}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-max border-collapse text-sm tabular-nums">
          <thead>
            <tr className="bg-[#234D65] text-white">
              <th className="sticky left-0 z-10 min-w-[240px] bg-[#234D65] px-3 py-2 text-left font-semibold">Libellé</th>
              {report.monthLabels.map((label) => (
                <th key={label} className="whitespace-nowrap px-3 py-2 text-right font-semibold">{label}</th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">{TOTAL_COLUMN_LABEL}</th>
            </tr>
          </thead>
          <tbody>
            {block.lines.map((line) => {
              const rowClass = cn(
                'border-t border-gray-100',
                line.level === 'subtotal' && 'bg-slate-50 font-semibold',
                line.level === 'total' && 'bg-slate-100 font-bold text-gray-900',
                line.level === 'info' && 'italic text-gray-500'
              )
              const stickyClass = cn(
                'sticky left-0 z-10 max-w-[360px] whitespace-normal px-3 py-2 text-left align-top',
                line.level === 'subtotal' ? 'bg-slate-50' : line.level === 'total' ? 'bg-slate-100' : 'bg-white'
              )
              return (
                <tr key={line.key} className={rowClass}>
                  <td className={stickyClass}>
                    {line.label}
                    {line.kind === 'stock' && line.level !== 'info' && (
                      <span className="ml-1 text-[11px] font-normal text-gray-400">(fin de mois)</span>
                    )}
                    {showDescriptions && (
                      <span className="mt-0.5 block text-xs font-normal not-italic leading-snug text-gray-500">{line.description}</span>
                    )}
                  </td>
                  {line.values.map((value, index) => (
                    <td key={report.months[index]} className="whitespace-nowrap px-3 py-2 text-right align-top">{cell(value, line)}</td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right align-top font-semibold">{cell(line.total, line)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportModuleView({
  module,
  report,
  showDescriptions,
}: {
  module: FinancialReportModule
  report: FinancialReport
  showDescriptions: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{module.title}</h2>
        <p className="text-sm text-gray-500">{module.description}</p>
      </div>
      <StatStrip stats={moduleStats(module)} />
      {module.blocks.map((block) => (
        <ReportBlockTable key={block.key} block={block} report={report} showDescriptions={showDescriptions} />
      ))}
      {module.notes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <p className="mb-2 font-semibold text-gray-800">Bases de calcul</p>
          <ul className="list-disc space-y-1 pl-5">
            {module.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Comment lire le bilan : replié d'un clic, ouvert par défaut. */
function ReportGuide() {
  const [open, setOpen] = useState(true)
  return (
    <Card className="border-[#234D65]/15 bg-[#234D65]/[0.03] shadow-none">
      <CardContent className="p-4 md:p-5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 font-semibold text-[#234D65]">
            <BookOpen className="h-4 w-4" />
            Comment lire ce bilan
          </span>
          <ChevronDown className={cn('h-4 w-4 text-[#234D65] transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCIAL_REPORT_GUIDE.map((entry) => (
              <div key={entry.title}>
                <dt className="text-sm font-semibold text-gray-900">{entry.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-gray-600">{entry.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

export default function FinancialReportsPage() {
  const { isLoading: isLoadingAccess, isSuperAdmin } = useMyAccess()
  const [draft, setDraft] = useState<Period>(() => lastMonths(6))
  const [period, setPeriod] = useState<Period>(() => lastMonths(6))
  const [activeModule, setActiveModule] = useState<FinancialReportModule['key']>('synthesis')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [showDescriptions, setShowDescriptions] = useState(true)
  const { data: report, isFetching, error, refetch } = useFinancialReport(isSuperAdmin ? period : null)
  const draftError = validatePeriod(draft)
  const module = useMemo(
    () => report?.modules.find((entry) => entry.key === activeModule) ?? report?.modules[0],
    [report, activeModule]
  )

  const applyPeriod = (next: Period) => {
    setDraft(next)
    if (!validatePeriod(next)) setPeriod(next)
  }

  const runExport = async (kind: 'excel' | 'pdf') => {
    if (!report) return
    setExporting(kind)
    try {
      if (kind === 'excel') {
        const { exportFinancialReportExcel } = await import('../exports/exportFinancialReportExcel')
        await exportFinancialReportExcel(report)
      } else {
        const { exportFinancialReportPdf } = await import('../exports/exportFinancialReportPdf')
        await exportFinancialReportPdf(report)
      }
      toast.success(kind === 'excel' ? 'Bilan exporté en Excel' : 'Bilan exporté en PDF')
    } catch (exportError) {
      console.error('[financial-reports] export impossible:', exportError)
      toast.error('Erreur lors de l’export du bilan')
    } finally {
      setExporting(null)
    }
  }

  if (isLoadingAccess) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>Les bilans financiers sont réservés au super admin.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHero
        icon={Landmark}
        title="Bilans financiers"
        subtitle="Trésorerie, résultat, encours et risques de l’association, mois par mois"
      />

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const presetPeriod = preset.period()
              const isActive = presetPeriod.from === period.from && presetPeriod.to === period.to
              return (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className={cn(isActive && 'bg-[#234D65] hover:bg-[#234D65]/90')}
                  onClick={() => applyPeriod(presetPeriod)}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="report-from">Du mois</Label>
              <Input
                id="report-from"
                type="month"
                value={draft.from}
                max={currentMonthKey()}
                onChange={(event) => setDraft((previous) => ({ ...previous, from: event.target.value }))}
                className="sm:w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-to">Au mois</Label>
              <Input
                id="report-to"
                type="month"
                value={draft.to}
                max={currentMonthKey()}
                onChange={(event) => setDraft((previous) => ({ ...previous, to: event.target.value }))}
                className="sm:w-44"
              />
            </div>
            <Button
              type="button"
              disabled={!!draftError || isFetching}
              className="bg-[#234D65] hover:bg-[#234D65]/90"
              onClick={() => (draft.from === period.from && draft.to === period.to ? refetch() : setPeriod(draft))}
            >
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Générer le bilan
            </Button>
            <div className="flex gap-2 sm:ml-auto">
              <Button type="button" variant="outline" disabled={!report || !!exporting} onClick={() => runExport('excel')}>
                {exporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Excel
              </Button>
              <Button type="button" variant="outline" disabled={!report || !!exporting} onClick={() => runExport('pdf')}>
                {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                PDF
              </Button>
            </div>
          </div>
          {draftError && <p className="text-sm text-red-600">{draftError}</p>}
        </CardContent>
      </Card>

      <ReportGuide />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error instanceof Error ? error.message : 'Impossible de générer le bilan'}</AlertDescription>
        </Alert>
      ) : !report || !module ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <div className={cn('space-y-5', isFetching && 'opacity-60 transition-opacity')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Bilan {reportPeriodLabel(report)} · généré le {new Date(report.generatedAt).toLocaleString('fr-FR')}
            </p>
            <div className="flex items-center gap-2">
              <Switch id="report-descriptions" checked={showDescriptions} onCheckedChange={setShowDescriptions} />
              <Label htmlFor="report-descriptions" className="cursor-pointer text-sm text-gray-600">
                Afficher les explications des lignes
              </Label>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {report.modules.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setActiveModule(entry.key)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  entry.key === module.key
                    ? 'border-transparent bg-[#234D65] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {entry.title}
              </button>
            ))}
          </div>
          <ReportModuleView module={module} report={report} showDescriptions={showDescriptions} />
        </div>
      )}
    </div>
  )
}
