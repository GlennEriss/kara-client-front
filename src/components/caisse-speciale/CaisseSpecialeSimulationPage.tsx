'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useCaisseSpecialeSimulation } from '@/hooks/caisse-speciale/useCaisseSpecialeSimulation'
import {
    caisseSpecialeSimulationFormSchema,
    type CaisseSpecialeSimulationFormInput,
} from '@/schemas/caisse-speciale.schema'
import type { CaisseSpecialeSimulationResult } from '@/services/caisse-speciale/simulation/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, BarChart3, Download, FileSpreadsheet, Loader2, MessageCircle, PieChart as PieChartIcon, Sparkles, TrendingUp } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'sonner'

const CAISSE_TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'STANDARD_CHARITABLE', label: 'Standard Charitable' },
] as const

function formatDateFr(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatAmount(n: number): string {
  return n.toLocaleString('fr-FR')
}

function formatPercent(n: number): string {
  return `${n.toFixed(1).replace('.', ',')} %`
}

/** Formater les montants pour le PDF (évite les problèmes d'espace insécable avec jsPDF) */
function formatAmountForPDF(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function CaisseSpecialeSimulationPage() {
  const [result, setResult] = useState<CaisseSpecialeSimulationResult | null>(null)
  const [resultAnimationKey, setResultAnimationKey] = useState(0)
  const resultSectionRef = useRef<HTMLDivElement | null>(null)
  const runSimulation = useCaisseSpecialeSimulation()

  const form = useForm<CaisseSpecialeSimulationFormInput>({
    resolver: zodResolver(caisseSpecialeSimulationFormSchema),
    defaultValues: {
      caisseType: 'STANDARD',
      monthlyAmount: 50000,
      durationMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
    },
    mode: 'onChange',
  })

  const onSubmit = async (data: CaisseSpecialeSimulationFormInput) => {
    try {
      const res = await runSimulation.mutateAsync({
        caisseType: data.caisseType as 'STANDARD' | 'STANDARD_CHARITABLE',
        monthlyAmount: data.monthlyAmount,
        durationMonths: data.durationMonths,
        startDate: new Date(data.startDate),
      })
      setResultAnimationKey((prev) => prev + 1)
      setResult(res)
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
      if (res.noActiveSettings) {
        toast.warning('Aucun paramètre actif pour ce type. Les bonus sont à 0 %. Configurez les paramètres dans Paramètres Caisse.')
      } else {
        toast.success('Simulation calculée.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la simulation')
    }
  }

  const isLoading = runSimulation.isPending
  const showNoSettingsAlert = result?.noActiveSettings === true
  const showTable = result != null && result.rows.length > 0

  const simulationSummary = useMemo(() => {
    if (!result) return null

    const totalWithBonus = result.totalAmount + result.totalBonus
    const bonusYield = result.totalAmount > 0 ? (result.totalBonus / result.totalAmount) * 100 : 0
    const monthsWithBonus = result.rows.filter((row) => row.bonusAmount > 0).length
    const monthsWithoutBonus = Math.max(result.rows.length - monthsWithBonus, 0)

    const financialBreakdown = [
      { name: 'Versements', value: result.totalAmount, fill: '#234D65' },
      { name: 'Bonus', value: result.totalBonus, fill: '#CBB171' },
    ]

    const activationBreakdown = [
      { name: 'Mois avec bonus', value: monthsWithBonus, fill: '#16A34A' },
      { name: 'Mois sans bonus', value: monthsWithoutBonus, fill: '#E2E8F0' },
    ].filter((item) => item.value > 0)

    return {
      totalWithBonus,
      bonusYield,
      monthsWithBonus,
      monthsWithoutBonus,
      financialBreakdown,
      activationBreakdown,
    }
  }, [result])

  const smoothFieldClass =
    'w-full min-h-[44px] sm:min-h-[40px] rounded-xl border-slate-300/80 bg-white/90 shadow-sm transition-all duration-300 ease-out placeholder:text-slate-400 hover:border-[#234D65]/45 hover:bg-white focus-visible:border-[#234D65] focus-visible:ring-4 focus-visible:ring-[#234D65]/15 focus-visible:shadow-[0_0_0_1px_rgba(35,77,101,0.25)] disabled:cursor-not-allowed disabled:opacity-60'

  const smoothFieldContainerClass =
    'space-y-2 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3 transition-all duration-300 ease-out hover:border-[#234D65]/25 hover:shadow-sm focus-within:border-[#234D65]/40 focus-within:shadow-[0_0_0_3px_rgba(35,77,101,0.08)]'

  return (
    <div className="space-y-6">
      {/* Formulaire */}
      <Card className="relative overflow-hidden border-[#234D65]/20 shadow-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#234D65]">Mode simulation</p>
              <p className="text-sm text-slate-600">
                Ajustez les paramètres et lancez le calcul pour visualiser l&apos;échéancier immédiatement.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#234D65]/20 bg-[#234D65]/5 px-3 py-1.5 text-xs font-semibold text-[#234D65]">
              <Sparkles className="h-3.5 w-3.5" />
              Simulation interactive
            </div>
          </div>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={smoothFieldContainerClass}>
                <Label htmlFor="caisseType" className="text-sm font-semibold text-slate-700">Type de caisse</Label>
                <Select
                  value={form.watch('caisseType')}
                  onValueChange={(v) => form.setValue('caisseType', v as 'STANDARD' | 'STANDARD_CHARITABLE')}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="caisseType"
                    className={`${smoothFieldClass} data-[state=open]:border-[#234D65]/55 data-[state=open]:ring-4 data-[state=open]:ring-[#234D65]/10`}
                  >
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAISSE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.caisseType && (
                  <p className="text-sm text-destructive">{form.formState.errors.caisseType.message}</p>
                )}
              </div>

              <div className={smoothFieldContainerClass}>
                <Label htmlFor="monthlyAmount" className="text-sm font-semibold text-slate-700">Montant mensuel (FCFA)</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  min={1}
                  placeholder="Ex. 50 000"
                  {...form.register('monthlyAmount', { valueAsNumber: true })}
                  disabled={isLoading}
                  className={smoothFieldClass}
                />
                {form.formState.errors.monthlyAmount && (
                  <p className="text-sm text-destructive">{form.formState.errors.monthlyAmount.message}</p>
                )}
              </div>

              <div className={smoothFieldContainerClass}>
                <Label htmlFor="durationMonths" className="text-sm font-semibold text-slate-700">Durée prévue (mois, 1-12)</Label>
                <Input
                  id="durationMonths"
                  type="number"
                  min={1}
                  max={12}
                  {...form.register('durationMonths', { valueAsNumber: true })}
                  disabled={isLoading}
                  className={smoothFieldClass}
                />
                {form.formState.errors.durationMonths && (
                  <p className="text-sm text-destructive">{form.formState.errors.durationMonths.message}</p>
                )}
              </div>

              <div className={smoothFieldContainerClass}>
                <Label htmlFor="startDate" className="text-sm font-semibold text-slate-700">Date souhaitée</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                  disabled={isLoading}
                  className={smoothFieldClass}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="group w-full sm:w-auto min-h-[44px] sm:min-h-[40px] bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1f455b] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Simulation en cours…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                    Lancer la simulation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* État chargement (pendant la mutation) */}
      {isLoading && (
        <Card className="border-[#234D65]/20 bg-gradient-to-r from-white via-[#234D65]/5 to-[#cbb171]/10 shadow-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-[#234D65]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Simulation en cours de calcul…</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-[#234D65]/10">
                <div className="h-2 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#234D65] to-[#2c5a73]" />
              </div>
              <p className="text-xs text-slate-600">Chargement des paramètres actifs et génération de l&apos;échéancier…</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerte aucun paramètre actif */}
      {showNoSettingsAlert && (
        <Alert variant="destructive" className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucun paramètre actif pour ce type de caisse. Configurez les paramètres dans Paramètres Caisse.
          </AlertDescription>
        </Alert>
      )}

      {/* Bloc résultats animé */}
      {showTable && result && simulationSummary && !isLoading && (
        <div
          key={resultAnimationKey}
          ref={resultSectionRef}
          className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
        >
          <Card className="border-[#234D65]/20 shadow-md">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                    Résultats de la simulation
                  </h2>
                  <p className="text-sm text-slate-600">
                    Visualisez l&apos;échéancier, les bonus et la répartition globale en un coup d&apos;œil.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Simulation calculée
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#234D65]/20 bg-gradient-to-br from-[#234D65]/10 to-[#2c5a73]/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#234D65]">Total versements</p>
                  <p className="mt-2 text-2xl font-black text-[#234D65]">{formatAmount(result.totalAmount)}</p>
                </div>
                <div className="rounded-2xl border border-[#cbb171]/40 bg-gradient-to-br from-[#cbb171]/20 to-[#f0e5c7]/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6f2b]">Total bonus</p>
                  <p className="mt-2 text-2xl font-black text-[#7b6125]">{formatAmount(result.totalBonus)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Montant final</p>
                  <p className="mt-2 text-2xl font-black text-emerald-800">{formatAmount(simulationSummary.totalWithBonus)}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Rendement bonus</p>
                  <p className="mt-2 text-2xl font-black text-indigo-800">{formatPercent(simulationSummary.bonusYield)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-[#234D65]/15 shadow-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-100">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-[#234D65]">
                  <PieChartIcon className="h-5 w-5" />
                  <h3 className="font-semibold">Répartition financière</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={simulationSummary.financialBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {simulationSummary.financialBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => `${formatAmount(Number(value))} FCFA`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid gap-2">
                  {simulationSummary.financialBreakdown.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-medium text-slate-700">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatAmount(entry.value)} FCFA</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#234D65]/15 shadow-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-150">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-[#234D65]">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="font-semibold">Activation des bonus</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={simulationSummary.activationBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {simulationSummary.activationBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => `${value} mois`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid gap-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Mois avec bonus</span>
                    <span className="text-sm font-semibold text-emerald-700">{simulationSummary.monthsWithBonus}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Mois sans bonus</span>
                    <span className="text-sm font-semibold text-slate-700">{simulationSummary.monthsWithoutBonus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau récapitulatif + actions */}
          <Card className="border-[#234D65]/20 shadow-md">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="overflow-x-auto -mx-4 sm:mx-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 delay-200">
                <Table className="min-w-[500px] sm:min-w-0 w-full">
                  <TableHeader>
                    <TableRow className="bg-[#234D65] hover:bg-[#234D65] text-white">
                      <TableHead className="text-white font-semibold">N° Échéance</TableHead>
                      <TableHead className="text-white font-semibold">Date d&apos;échéance</TableHead>
                      <TableHead className="text-white font-semibold hidden sm:table-cell">Date prise d&apos;effet bonus</TableHead>
                      <TableHead className="text-white font-semibold text-right">Montant (FCFA)</TableHead>
                      <TableHead className="text-white font-semibold text-right">Taux %</TableHead>
                      <TableHead className="text-white font-semibold text-right">Bonus (FCFA)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row) => (
                      <TableRow key={row.monthLabel} className="even:bg-muted/50">
                        <TableCell className="font-medium">{row.monthLabel}</TableCell>
                        <TableCell>{formatDateFr(row.dueAt)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{row.bonusEffectiveLabel}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.amount)}</TableCell>
                        <TableCell className="text-right">{row.bonusRatePercent}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.bonusAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold border-t-2 bg-muted/50">
                      <TableCell colSpan={3} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right">{formatAmount(result.totalAmount)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{formatAmount(result.totalBonus)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                <SimulationExportPDFButton result={result} />
                <SimulationExportExcelButton result={result} />
                <SimulationShareWhatsAppButton result={result} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message initial si pas encore de résultat */}
      {!showTable && !isLoading && result == null && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Renseignez les champs et lancez la simulation.
        </p>
      )}
    </div>
  )
}

export default CaisseSpecialeSimulationPage

function SimulationExportPDFButton({ result }: { result: CaisseSpecialeSimulationResult }) {
  const handleExport = async () => {
    if (!result?.rows.length) return
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(14)
    doc.text('Tableau récapitulatif des versements', 14, 12)
    doc.setFontSize(10)
    doc.text(`Exporté le ${formatDateFr(new Date())}`, 14, 18)
    const body = result.rows.map((r) => [
      r.monthLabel,
      formatDateFr(r.dueAt),
      r.bonusEffectiveLabel,
      formatAmountForPDF(r.amount),
      formatAmountForPDF(r.bonusAmount),
    ])
    autoTable(doc, {
      head: [['N° Échéance', 'Date échéance', 'Date taxi', 'Montant (FCFA)', 'Taxi (FCFA)']],
      body,
      startY: 24,
      headStyles: { fillColor: [35, 77, 101] },
    })
    const finalY = (doc as any).lastAutoTable?.finalY ?? 24
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total montants: ${formatAmountForPDF(result.totalAmount)} FCFA`, 14, finalY + 8)
    doc.text(`Total taxi: ${formatAmountForPDF(result.totalBonus)} FCFA`, 14, finalY + 14)
    const fileName = `simulation_caisse_speciale_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success('PDF exporté')
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={handleExport}
      className="gap-2 min-h-[44px] sm:min-h-[40px] border-rose-300/80 bg-gradient-to-r from-rose-50 to-rose-100/80 text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-100 hover:text-rose-800 hover:shadow-md"
    >
      <Download className="h-4 w-4 text-rose-600" />
      Exporter PDF
    </Button>
  )
}

function SimulationExportExcelButton({ result }: { result: CaisseSpecialeSimulationResult }) {
  const handleExport = async () => {
    if (!result?.rows.length) return
    const XLSX = await import('xlsx')
    const data = result.rows.map((r) => ({
      'N° Échéance': r.monthLabel,
      'Date d\'échéance': formatDateFr(r.dueAt),
      'Date prise d\'effet taxi': r.bonusEffectiveLabel,
      'Montant (FCFA)': r.amount,
      'Taxi (FCFA)': r.bonusAmount,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Simulation')
    const fileName = `simulation_caisse_speciale_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success('Excel exporté')
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={handleExport}
      className="gap-2 min-h-[44px] sm:min-h-[40px] border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-800 hover:shadow-md"
    >
      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
      Exporter Excel
    </Button>
  )
}

function SimulationShareWhatsAppButton({ result }: { result: CaisseSpecialeSimulationResult }) {
  const handleShare = () => {
    if (!result?.rows.length) return
    
    const separator = '━━━━━━━━━━━━━━━━━━━━━━'
    const lines = [
      '📊 *TABLEAU RÉCAPITULATIF*',
      '🏦 Caisse Spéciale KARA',
      separator,
      '',
      '💰 *RÉSUMÉ*',
      `▪️ Total versements : *${formatAmount(result.totalAmount)} FCFA*`,
      `▪️ Total taxi : *${formatAmount(result.totalBonus)} FCFA*`,
      `▪️ Montant final : *${formatAmount(result.totalAmount + result.totalBonus)} FCFA*`,
      '',
      separator,
      '📅 *ÉCHÉANCIER*',
      separator,
      '',
      ...result.rows.map((r) => {
        const taxiIcon = r.bonusAmount > 0 ? '✅' : '⏳'
        return `${taxiIcon} *${r.monthLabel}* — ${formatDateFr(r.dueAt)}\n    💵 ${formatAmount(r.amount)} FCFA | Taxi = ${formatAmount(r.bonusAmount)} FCFA`
      }),
      '',
      separator,
      '📌 _Fait le ' + formatDateFr(new Date()) + '_',
      '🔗 _KARA - Mutuelle de solidarité_',
    ]
    const text = lines.join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Ouverture de WhatsApp')
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={handleShare}
      className="gap-2 min-h-[44px] sm:min-h-[40px] border-[#21b45a] bg-gradient-to-r from-[#25D366] to-[#1ebe5d] text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#199f4e] hover:from-[#22c35f] hover:to-[#18a94f] hover:text-white hover:shadow-md"
    >
      <MessageCircle className="h-4 w-4 text-white" />
      Partager WhatsApp
    </Button>
  )
}
