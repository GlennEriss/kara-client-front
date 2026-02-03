'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  caisseSpecialeSimulationFormSchema,
  type CaisseSpecialeSimulationFormInput,
} from '@/schemas/caisse-speciale.schema'
import { useCaisseSpecialeSimulation } from '@/hooks/caisse-speciale/useCaisseSpecialeSimulation'
import type { CaisseSpecialeSimulationResult } from '@/services/caisse-speciale/simulation/types'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Download, FileSpreadsheet, MessageCircle } from 'lucide-react'

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

function CaisseSpecialeSimulationPage() {
  const [result, setResult] = useState<CaisseSpecialeSimulationResult | null>(null)
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
      setResult(res)
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

  return (
    <div className="space-y-6">
      {/* Formulaire */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caisseType">Type de caisse</Label>
                <Select
                  value={form.watch('caisseType')}
                  onValueChange={(v) => form.setValue('caisseType', v as 'STANDARD' | 'STANDARD_CHARITABLE')}
                  disabled={isLoading}
                >
                  <SelectTrigger id="caisseType" className="w-full min-h-[44px] sm:min-h-[40px]">
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

              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Montant mensuel (FCFA)</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  min={1}
                  placeholder="Ex. 50 000"
                  {...form.register('monthlyAmount', { valueAsNumber: true })}
                  disabled={isLoading}
                  className="min-h-[44px] sm:min-h-[40px]"
                />
                {form.formState.errors.monthlyAmount && (
                  <p className="text-sm text-destructive">{form.formState.errors.monthlyAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMonths">Durée prévue (mois, 1-12)</Label>
                <Input
                  id="durationMonths"
                  type="number"
                  min={1}
                  max={12}
                  {...form.register('durationMonths', { valueAsNumber: true })}
                  disabled={isLoading}
                  className="min-h-[44px] sm:min-h-[40px]"
                />
                {form.formState.errors.durationMonths && (
                  <p className="text-sm text-destructive">{form.formState.errors.durationMonths.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Date souhaitée</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                  disabled={isLoading}
                  className="min-h-[44px] sm:min-h-[40px]"
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
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] bg-[#234D65] hover:bg-[#2c5a73]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Récupération des paramètres…
                  </>
                ) : (
                  'Lancer la simulation'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* État chargement (pendant la mutation) */}
      {isLoading && (
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Récupération des paramètres…</span>
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

      {/* Tableau récapitulatif + actions */}
      {showTable && result && !isLoading && (
        <Card className="border shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
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
    doc.text('Simulation Caisse Spéciale', 14, 12)
    doc.setFontSize(10)
    doc.text(`Exporté le ${formatDateFr(new Date())}`, 14, 18)
    const body = result.rows.map((r) => [
      r.monthLabel,
      formatDateFr(r.dueAt),
      r.bonusEffectiveLabel,
      formatAmount(r.amount),
      String(r.bonusRatePercent),
      formatAmount(r.bonusAmount),
    ])
    autoTable(doc, {
      head: [['N° Échéance', 'Date échéance', 'Date bonus', 'Montant (FCFA)', 'Taux %', 'Bonus (FCFA)']],
      body,
      startY: 24,
      headStyles: { fillColor: [35, 77, 101] },
    })
    const finalY = (doc as any).lastAutoTable?.finalY ?? 24
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total montants: ${formatAmount(result.totalAmount)} FCFA`, 14, finalY + 8)
    doc.text(`Total bonus: ${formatAmount(result.totalBonus)} FCFA`, 14, finalY + 14)
    const fileName = `simulation_caisse_speciale_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success('PDF exporté')
  }
  return (
    <Button type="button" variant="outline" size="default" onClick={handleExport} className="gap-2 min-h-[44px] sm:min-h-[40px]">
      <Download className="h-4 w-4" />
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
      'Date prise d\'effet bonus': r.bonusEffectiveLabel,
      'Montant (FCFA)': r.amount,
      'Taux %': r.bonusRatePercent,
      'Bonus (FCFA)': r.bonusAmount,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Simulation')
    const fileName = `simulation_caisse_speciale_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success('Excel exporté')
  }
  return (
    <Button type="button" variant="outline" size="default" onClick={handleExport} className="gap-2 min-h-[44px] sm:min-h-[40px]">
      <FileSpreadsheet className="h-4 w-4" />
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
      `▪️ Total bonus : *${formatAmount(result.totalBonus)} FCFA*`,
      `▪️ Montant final : *${formatAmount(result.totalAmount + result.totalBonus)} FCFA*`,
      '',
      separator,
      '📅 *ÉCHÉANCIER*',
      separator,
      '',
      ...result.rows.map((r) => {
        const bonusIcon = r.bonusRatePercent > 0 ? '✅' : '⏳'
        return `${bonusIcon} *${r.monthLabel}* — ${formatDateFr(r.dueAt)}\n    💵 ${formatAmount(r.amount)} FCFA | Bonus ${r.bonusRatePercent}% = ${formatAmount(r.bonusAmount)} FCFA`
      }),
      '',
      separator,
      '📌 Fait le ' + formatDateFr(new Date()) + '_',
      '🔗 _KARA - Mutuelle de solidarité_',
    ]
    const text = lines.join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Ouverture de WhatsApp')
  }
  return (
    <Button type="button" variant="outline" size="default" onClick={handleShare} className="gap-2 min-h-[44px] sm:min-h-[40px]">
      <MessageCircle className="h-4 w-4" />
      Partager WhatsApp
    </Button>
  )
}
