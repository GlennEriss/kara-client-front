'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { FinancialReport, FinancialReportBlockKey, FinancialReportModuleKey } from '../entities/financial-report.types'
import {
  loadReportExportOptions,
  REPORT_BLOCK_KEYS,
  REPORT_TEXT_LEVELS,
  saveReportExportOptions,
  selectReportContent,
  type ReportExportFormat,
  type ReportExportOptions,
} from '../exports/export-options'
import { BLOCK_TITLES } from '../utils/report-lines'

const FORMATS: Array<{ value: ReportExportFormat; label: string; description: string; icon: typeof FileText }> = [
  { value: 'pdf', label: 'PDF', description: 'Document prêt à imprimer ou à envoyer.', icon: FileText },
  { value: 'excel', label: 'Excel', description: 'Un onglet par module, mis en forme ; les totaux se recalculent si vous modifiez un mois.', icon: FileSpreadsheet },
]

/** Carte de choix unique (format, niveau d'explication). */
function ChoiceCard({
  selected,
  onSelect,
  label,
  description,
  icon: Icon,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  description: string
  icon?: typeof FileText
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors',
        selected ? 'border-[#234D65] bg-[#234D65]/5' : 'border-gray-200 bg-white hover:bg-gray-50'
      )}
    >
      {Icon && <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-[#234D65]' : 'text-gray-400')} />}
      <span>
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        <span className="block text-xs leading-snug text-gray-500">{description}</span>
      </span>
    </button>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

const toggle = <T,>(list: T[], value: T, order: T[]): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : order.filter((entry) => entry === value || list.includes(entry))

export default function FinancialReportExportDialog({
  open,
  onOpenChange,
  report,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: FinancialReport
}) {
  const [options, setOptions] = useState<ReportExportOptions>(loadReportExportOptions)
  const [isExporting, setIsExporting] = useState(false)
  const moduleOrder = report.modules.map((module) => module.key)

  useEffect(() => {
    if (open) setOptions(loadReportExportOptions())
  }, [open])

  const selection = selectReportContent(report, options)
  const level = REPORT_TEXT_LEVELS.find((entry) => entry.value === options.textLevel)!
  const canExport = selection.modules.length > 0
  const summary = canExport
    ? `${options.format === 'pdf' ? 'PDF' : 'Excel'} · ${selection.modules.length} onglet${selection.modules.length > 1 ? 's' : ''} · ` +
      `${options.blocks.length} partie${options.blocks.length > 1 ? 's' : ''} · explications : ${level.label.toLowerCase()}`
    : 'Choisissez au moins un onglet et une partie.'

  const update = (patch: Partial<ReportExportOptions>) => setOptions((previous) => ({ ...previous, ...patch }))

  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (options.format === 'excel') {
        const { exportFinancialReportExcel } = await import('../exports/exportFinancialReportExcel')
        await exportFinancialReportExcel(selection, options.textLevel)
      } else {
        const { exportFinancialReportPdf } = await import('../exports/exportFinancialReportPdf')
        await exportFinancialReportPdf(selection, options.textLevel)
      }
      saveReportExportOptions(options)
      toast.success(options.format === 'excel' ? 'Bilan exporté en Excel' : 'Bilan exporté en PDF')
      onOpenChange(false)
    } catch (error) {
      console.error('[financial-reports] export impossible:', error)
      toast.error('Erreur lors de l’export du bilan')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      icon={Download}
      title="Exporter le bilan"
      description="Choisissez le format, le niveau d’explication et le contenu du fichier."
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn('text-xs', canExport ? 'text-gray-500' : 'text-red-600')}>{summary}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-[#234D65] hover:bg-[#234D65]/90"
              onClick={handleExport}
              disabled={!canExport || isExporting}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exporter
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Section title="Format">
          <div role="radiogroup" aria-label="Format" className="grid gap-2 sm:grid-cols-2">
            {FORMATS.map((format) => (
              <ChoiceCard
                key={format.value}
                selected={options.format === format.value}
                onSelect={() => update({ format: format.value })}
                label={format.label}
                description={format.description}
                icon={format.icon}
              />
            ))}
          </div>
        </Section>

        <Section title="Texte d’explication">
          <div role="radiogroup" aria-label="Texte d’explication" className="grid gap-2 sm:grid-cols-3">
            {REPORT_TEXT_LEVELS.map((entry) => (
              <ChoiceCard
                key={entry.value}
                selected={options.textLevel === entry.value}
                onSelect={() => update({ textLevel: entry.value })}
                label={entry.label}
                description={entry.description}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Onglets à inclure"
          action={
            <button
              type="button"
              className="text-xs font-medium text-[#234D65] hover:underline"
              onClick={() => update({ modules: options.modules.length === moduleOrder.length ? [] : moduleOrder })}
            >
              {options.modules.length === moduleOrder.length ? 'Tout décocher' : 'Tout cocher'}
            </button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {report.modules.map((module) => (
              <label key={module.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                <Checkbox
                  checked={options.modules.includes(module.key)}
                  onCheckedChange={() => update({ modules: toggle<FinancialReportModuleKey>(options.modules, module.key, moduleOrder) })}
                />
                {module.title}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Parties à inclure">
          <div className="grid gap-2 sm:grid-cols-2">
            {REPORT_BLOCK_KEYS.map((block) => (
              <label key={block} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                <Checkbox
                  checked={options.blocks.includes(block)}
                  onCheckedChange={() => update({ blocks: toggle<FinancialReportBlockKey>(options.blocks, block, REPORT_BLOCK_KEYS) })}
                />
                {BLOCK_TITLES[block]}
              </label>
            ))}
          </div>
        </Section>
      </div>
    </Modal>
  )
}
