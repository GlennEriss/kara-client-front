'use client'

import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AlertCircle, Download, Eye, Loader2, UserRound } from 'lucide-react'
import React, { useState } from 'react'
import { MEMBER_FINANCIAL_REPORT_MAX_MONTHS, type FinancialReport, type MonthKey } from '../entities/financial-report.types'
import { formatReportNumber, reportPeriodLabel } from '../exports/report-format'
import { useMemberFinancialReport, type MemberReportRequest } from '../hooks/useMemberFinancialReport'
import { addMonthsToKey, currentMonthKey, periodError } from '../utils/report-months'

type Scope = 'all' | 'period'

const synthesisTotal = (report: FinancialReport, block: string, line: string) =>
  report.modules[0]?.blocks.find((entry) => entry.key === block)?.lines.find((entry) => entry.key === line)?.total ?? 0

/** Chiffres clés du bilan d'un membre, lus dans sa synthèse. */
function MemberReportSummary({ report }: { report: FinancialReport }) {
  const figures = [
    { label: 'Versé à l’association', value: synthesisTotal(report, 'treasury', 'in_total') },
    { label: 'Reçu de l’association', value: synthesisTotal(report, 'treasury', 'out_total') },
    { label: 'Reste dû (fin de période)', value: synthesisTotal(report, 'outstanding', 'receivables_total') },
    { label: 'À lui restituer (fin de période)', value: synthesisTotal(report, 'outstanding', 'payables_total') },
  ]
  const modules = report.modules.slice(1)

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <p className="font-semibold text-gray-900">
          {report.subject?.name} <span className="font-normal text-gray-500">· {report.subject?.matricule}</span>
        </p>
        <p className="text-sm text-gray-500">
          {reportPeriodLabel(report)} · {report.months.length} mois
        </p>
      </div>
      {modules.length === 0 ? (
        <p className="text-sm text-gray-600">Aucune opération sur cette période.</p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dt className="text-xs text-gray-500">{figure.label}</dt>
                <dd className="font-semibold tabular-nums text-gray-900">{formatReportNumber(figure.value)} FCFA</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray-500">Modules : {modules.map((module) => module.title).join(', ')}</p>
        </>
      )}
    </div>
  )
}

/**
 * Bilan d'un seul membre : tous ses modules, sur toute son histoire ou sur
 * une période, à afficher dans la page ou à télécharger en Excel ou PDF.
 */
export function MemberFinancialReportCard({
  onView,
  onDownload,
}: {
  onView: (report: FinancialReport) => void
  onDownload: (report: FinancialReport) => void
}) {
  const [memberId, setMemberId] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [range, setRange] = useState<{ from: MonthKey; to: MonthKey }>(() => ({
    from: addMonthsToKey(currentMonthKey(), -11),
    to: currentMonthKey(),
  }))
  const [request, setRequest] = useState<MemberReportRequest | null>(null)
  const { data: report, isFetching, error } = useMemberFinancialReport(request)

  const rangeError = scope === 'period' ? periodError(range, MEMBER_FINANCIAL_REPORT_MAX_MONTHS) : null
  const nextRequest: MemberReportRequest | null =
    !memberId || rangeError ? null : scope === 'all' ? { memberId, all: true } : { memberId, from: range.from, to: range.to }
  // Le bilan affiché correspond-il encore aux choix du formulaire ?
  const isCurrent = !!request && JSON.stringify(request) === JSON.stringify(nextRequest)

  const choose = (next: Scope) => (
    <button
      type="button"
      role="radio"
      aria-checked={scope === next}
      onClick={() => setScope(next)}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        scope === next ? 'border-transparent bg-[#234D65] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      )}
    >
      {next === 'all' ? 'Toute la période' : 'Une période'}
    </button>
  )

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-[#234D65]">
            <UserRound className="h-4 w-4" />
            Bilan d’un membre
          </h2>
          <p className="text-sm text-gray-500">
            Tous les bilans d’un membre en un fichier : caisses, crédits, placements et adhésion, sur toute son histoire ou sur la période choisie.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <MemberSearchInput
            value={memberId}
            onChange={(id) => setMemberId(id)}
            label="Membre"
            isRequired={false}
            inputId="member-report-search"
          />
          <div className="space-y-2">
            <Label>Période</Label>
            <div role="radiogroup" aria-label="Période" className="flex flex-wrap gap-2">
              {choose('all')}
              {choose('period')}
            </div>
          </div>
        </div>

        {scope === 'all' ? (
          <p className="text-xs text-gray-500">
            Du premier mois où le membre a une opération jusqu’au mois en cours ({MEMBER_FINANCIAL_REPORT_MAX_MONTHS} mois au plus).
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="member-report-from">Du mois</Label>
              <Input
                id="member-report-from"
                type="month"
                value={range.from}
                max={currentMonthKey()}
                onChange={(event) => setRange((previous) => ({ ...previous, from: event.target.value }))}
                className="sm:w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="member-report-to">Au mois</Label>
              <Input
                id="member-report-to"
                type="month"
                value={range.to}
                max={currentMonthKey()}
                onChange={(event) => setRange((previous) => ({ ...previous, to: event.target.value }))}
                className="sm:w-44"
              />
            </div>
          </div>
        )}
        {rangeError && <p className="text-sm text-red-600">{rangeError}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-[#234D65] hover:bg-[#234D65]/90"
            disabled={!nextRequest || isFetching || isCurrent}
            onClick={() => setRequest(nextRequest)}
          >
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Préparer le bilan
          </Button>
          <Button type="button" variant="outline" disabled={!report || !isCurrent} onClick={() => report && onView(report)}>
            <Eye className="mr-2 h-4 w-4" />
            Afficher dans la page
          </Button>
          <Button type="button" variant="outline" disabled={!report || !isCurrent} onClick={() => report && onDownload(report)}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger (Excel ou PDF)
          </Button>
        </div>

        {error && isCurrent ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error instanceof Error ? error.message : 'Impossible de générer le bilan du membre'}</AlertDescription>
          </Alert>
        ) : report && isCurrent ? (
          <MemberReportSummary report={report} />
        ) : null}
      </CardContent>
    </Card>
  )
}
