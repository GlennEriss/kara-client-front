'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  FileSpreadsheet,
  Printer,
  MessageCircle,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCreditFixeSimulation } from '../hooks/useCreditFixeSimulation'
import {
  buildFixedSimulationSchemas,
  type FixedCustomSimulationFormInput,
  type FixedStandardSimulationFormInput,
} from '../schemas/fixed-simulation.schema'
import type { FixedSimulationResult } from '../entities/fixed-simulation.types'
import type { StandardSimulation, CustomSimulation } from '@/types/types'
import { exportFixedSimulationPdf } from '../exports/exportFixedSimulationPdf'
import { exportFixedSimulationExcel } from '../exports/exportFixedSimulationExcel'
import { printFixedSimulation } from '../exports/printFixedSimulation'
import { shareFixedSimulationWhatsApp } from '../exports/shareFixedSimulationWhatsApp'

type SimpleCreditType = 'FIXE' | 'AIDE'

const simulationConfigByCreditType: Record<
  SimpleCreditType,
  {
    maxDuration: number
    maxInterestRate: number
    label: string
    fileSlug: string
    whatsappTitle: string
  }
> = {
  FIXE: {
    maxDuration: 14,
    maxInterestRate: 50,
    label: 'Crédit Fixe',
    fileSlug: 'credit_fixe',
    whatsappTitle: 'CREDIT FIXE',
  },
  AIDE: {
    maxDuration: 3,
    maxInterestRate: 5,
    label: 'Crédit Aide',
    fileSlug: 'credit_aide',
    whatsappTitle: 'CREDIT AIDE',
  },
}

type SimulationMode = 'STANDARD' | 'CUSTOM'

const simulationTypeChips: { value: SimulationMode; label: string; icon: React.ReactNode }[] = [
  { value: 'STANDARD', label: 'Simulation standard', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'CUSTOM', label: 'Simulation personnalisée', icon: <SlidersHorizontal className="w-4 h-4" /> },
]

function SimulationTypeBadgesCarousel({
  value,
  onChange,
}: {
  value: SimulationMode
  onChange: (value: SimulationMode) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector(`[data-value="${value}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [value])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {simulationTypeChips.map((chip) => {
          const isActive = value === chip.value
          return (
            <button
              key={chip.value}
              type="button"
              data-value={chip.value}
              onClick={() => onChange(chip.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap transition-all duration-200 shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-kara-primary-dark',
                'active:scale-95',
                isActive
                  ? 'bg-kara-primary-dark text-white border-kara-primary-dark shadow-lg shadow-kara-primary-dark/20'
                  : 'bg-gray-100 text-gray-700 border-gray-200',
                isActive && 'scale-105'
              )}
              style={{ scrollSnapAlign: 'center' }}
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('fr-FR')
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface CreditFixeSimulationSectionProps {
  initialAmount?: number
  lockAmount?: boolean
  creditType?: SimpleCreditType
  onSimulationSelect?: (simulation: StandardSimulation | CustomSimulation) => void
}

function mapFixedResultToContractSimulation(result: FixedSimulationResult): StandardSimulation | CustomSimulation {
  if (result.mode === 'STANDARD') {
    return {
      amount: result.summary.amount,
      interestRate: result.summary.interestRate,
      monthlyPayment: result.summary.averageMonthlyPayment,
      firstPaymentDate: new Date(result.summary.firstPaymentDate),
      duration: result.summary.duration,
      totalAmount: result.summary.totalAmount,
      isValid: result.isValid,
      ...(result.summary.remaining > 0 ? { suggestedMinimumAmount: result.summary.remaining } : {}),
    }
  }

  return {
    amount: result.summary.amount,
    interestRate: result.summary.interestRate,
    monthlyPayments: result.schedule.map((row) => ({
      month: row.month,
      amount: row.payment,
    })),
    firstPaymentDate: new Date(result.summary.firstPaymentDate),
    duration: result.summary.duration,
    totalAmount: result.summary.totalAmount,
    isValid: result.isValid,
    ...(result.summary.remaining > 0 ? { suggestedMinimumAmount: result.summary.remaining } : {}),
  }
}

export function CreditFixeSimulationSection({
  initialAmount,
  lockAmount = false,
  creditType = 'FIXE',
  onSimulationSelect,
}: CreditFixeSimulationSectionProps = {}) {
  const config = simulationConfigByCreditType[creditType]
  const schemas = useMemo(
    () => buildFixedSimulationSchemas({
      maxDuration: config.maxDuration,
      maxInterestRate: config.maxInterestRate,
      creditLabel: config.label.toLowerCase().replace('crédit ', ''),
    }),
    [config]
  )

  const [mode, setMode] = useState<'STANDARD' | 'CUSTOM'>('STANDARD')
  const [result, setResult] = useState<FixedSimulationResult | null>(null)
  const { calculateStandard, calculateCustom } = useCreditFixeSimulation({
    maxDuration: config.maxDuration,
    maxInterestRate: config.maxInterestRate,
    creditLabel: config.label.toLowerCase().replace('crédit ', ''),
  })

  const standardForm = useForm<FixedStandardSimulationFormInput>({
    resolver: zodResolver(schemas.standardSchema),
    defaultValues: {
      amount: initialAmount ?? 0,
      interestRate: 0,
      firstPaymentDate: new Date(),
    },
    mode: 'onChange',
  })

  const customForm = useForm<FixedCustomSimulationFormInput>({
    resolver: zodResolver(schemas.customSchema),
    defaultValues: {
      amount: initialAmount ?? 0,
      interestRate: 0,
      firstPaymentDate: new Date(),
      monthlyPayments: [{ month: 1, amount: 0 }],
    },
    mode: 'onChange',
  })

  const customPayments = customForm.watch('monthlyPayments')
  const customAmount = customForm.watch('amount')
  const customInterestRate = customForm.watch('interestRate')

  useEffect(() => {
    standardForm.reset({
      amount: initialAmount ?? 0,
      interestRate: 0,
      firstPaymentDate: new Date(),
    })
    customForm.reset({
      amount: initialAmount ?? 0,
      interestRate: 0,
      firstPaymentDate: new Date(),
      monthlyPayments: [{ month: 1, amount: 0 }],
    })
    setMode('STANDARD')
    setResult(null)
  }, [customForm, initialAmount, standardForm])

  const customTotal = useMemo(
    () => customPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
    [customPayments]
  )

  // Total à rembourser (montant + intérêt unique) pour la simulation personnalisée
  const customTotalToRepay = useMemo(() => {
    if (!customAmount || customAmount <= 0) return 0
    const rate = typeof customInterestRate === 'number' && customInterestRate >= 0 ? customInterestRate : 0
    const interestAmount = Math.round(customAmount * (rate / 100))
    return customAmount + interestAmount
  }, [customAmount, customInterestRate])

  // Reste à planifier (positif = il manque, négatif = excédent)
  const customRemainingToPlan = useMemo(
    () => customTotalToRepay - customTotal,
    [customTotalToRepay, customTotal]
  )

  const onStandardSubmit = async (data: FixedStandardSimulationFormInput) => {
    try {
      const simulationResult = await calculateStandard.mutateAsync(data)
      setResult(simulationResult)
    } catch {
      toast.error('Erreur lors du calcul de la simulation standard')
    }
  }

  const onCustomSubmit = async (data: FixedCustomSimulationFormInput) => {
    try {
      const simulationResult = await calculateCustom.mutateAsync(data)
      setResult(simulationResult)
    } catch {
      toast.error('Erreur lors du calcul de la simulation personnalisée')
    }
  }

  const resetSimulation = () => {
    setResult(null)
  }

  const addCustomMonth = () => {
    if (customPayments.length >= config.maxDuration) {
      toast.error(`${config.label} est limité à ${config.maxDuration} mois`)
      return
    }

    customForm.setValue(
      'monthlyPayments',
      [...customPayments, { month: customPayments.length + 1, amount: 0 }],
      { shouldValidate: true }
    )
  }

  const removeCustomMonth = (index: number) => {
    const nextPayments = customPayments
      .filter((_, currentIndex) => currentIndex !== index)
      .map((payment, currentIndex) => ({ ...payment, month: currentIndex + 1 }))

    customForm.setValue('monthlyPayments', nextPayments, { shouldValidate: true })
  }

  const updateCustomMonthAmount = (index: number, amount: number) => {
    const nextPayments = customPayments.map((payment, currentIndex) =>
      currentIndex === index ? { ...payment, amount } : payment
    )
    customForm.setValue('monthlyPayments', nextPayments, { shouldValidate: true })
  }

  const handleExportPdf = async () => {
    if (!result) return
    try {
      await exportFixedSimulationPdf(result, undefined, {
        moduleSlug: config.fileSlug,
        moduleTitle: config.label.replace('é', 'e'),
      })
      toast.success('PDF exporté avec succès')
    } catch {
      toast.error("Erreur lors de l'export PDF")
    }
  }

  const handleExportExcel = async () => {
    if (!result) return
    try {
      await exportFixedSimulationExcel(result, undefined, {
        moduleSlug: config.fileSlug,
      })
      toast.success('Excel exporté avec succès')
    } catch {
      toast.error("Erreur lors de l'export Excel")
    }
  }

  const handlePrint = () => {
    if (!result) return
    try {
      printFixedSimulation(result, {
        moduleTitle: config.label.replace('é', 'e'),
      })
    } catch {
      toast.error("Erreur lors de l'impression")
    }
  }

  const handleShareWhatsApp = () => {
    if (!result) return
    try {
      shareFixedSimulationWhatsApp(result, {
        moduleTitle: config.whatsappTitle,
      })
    } catch {
      toast.error("Erreur lors du partage WhatsApp")
    }
  }

  const handleUseForContract = () => {
    if (!result || !onSimulationSelect) return
    if (!result.isValid) {
      toast.error('La simulation doit être valide pour créer un contrat')
      return
    }

    onSimulationSelect(mapFixedResultToContractSimulation(result))
  }

  return (
    <div className="space-y-6">
      <Card className="border-kara-neutral-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-kara-neutral-50 to-white">
          <CardTitle className="flex items-center gap-2 text-kara-primary-dark">
            <Calculator className="h-5 w-5" />
            Simulation {config.label}
          </CardTitle>
          <p className="text-sm text-kara-neutral-600">
            Taux entre 0% et {config.maxInterestRate}%, durée maximale de {config.maxDuration} échéances.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={mode} onValueChange={(value) => {
            setMode(value as 'STANDARD' | 'CUSTOM')
            setResult(null)
          }}>
            {/* Tabs - Vue desktop uniquement */}
            <TabsList className="hidden md:grid w-full grid-cols-2">
              <TabsTrigger value="STANDARD">Simulation standard</TabsTrigger>
              <TabsTrigger value="CUSTOM">Simulation personnalisée</TabsTrigger>
            </TabsList>

            {/* Badges carousel - Vue mobile et tablette (comme caisse-speciale/demandes) */}
            <div className="md:hidden">
              <SimulationTypeBadgesCarousel
                value={mode}
                onChange={(value) => {
                  setMode(value)
                  setResult(null)
                }}
              />
            </div>

            <TabsContent value="STANDARD" className="space-y-4">
              <Form {...standardForm}>
                <form onSubmit={standardForm.handleSubmit(onStandardSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={standardForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 2000000"
                              disabled={lockAmount}
                              {...field}
                              onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={standardForm.control}
                      name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taux d&apos;intérêt (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 30"
                              {...field}
                              onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={standardForm.control}
                      name="firstPaymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date du 1er versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={new Date(field.value).toISOString().split('T')[0]}
                              onChange={(event) => field.onChange(new Date(event.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={calculateStandard.isPending}
                    className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
                  >
                    {calculateStandard.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculer la simulation
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="CUSTOM" className="space-y-4">
              <Form {...customForm}>
                <form onSubmit={customForm.handleSubmit(onCustomSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={customForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 2000000"
                              disabled={lockAmount}
                              {...field}
                              onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taux d&apos;intérêt (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 30"
                              {...field}
                              onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="firstPaymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date du 1er versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={new Date(field.value).toISOString().split('T')[0]}
                              onChange={(event) => field.onChange(new Date(event.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {customTotalToRepay > 0 && (
                    <div className="rounded-lg border border-kara-primary-dark/30 bg-kara-primary-dark/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-kara-neutral-700">Total à rembourser</span>
                        <span className="text-lg font-bold text-kara-primary-dark">{formatAmount(customTotalToRepay)} FCFA</span>
                      </div>
                      <p className="text-xs text-kara-neutral-600 mt-1">Montant emprunté + intérêts (taux unique)</p>
                    </div>
                  )}

                  <div className="space-y-3 rounded-xl border border-kara-neutral-200 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <Label className="text-sm font-medium">Montants mensuels personnalisés</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomMonth}
                        disabled={customPayments.length >= config.maxDuration}
                      >
                        Ajouter un mois
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {customPayments.map((payment, index) => (
                        <div key={payment.month} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3 md:col-span-2 text-sm font-medium text-kara-neutral-700">
                            Mois {payment.month}
                          </div>
                          <div className="col-span-7 md:col-span-8">
                            <Input
                              type="number"
                              value={payment.amount || ''}
                              onChange={(event) => updateCustomMonthAmount(index, Number(event.target.value) || 0)}
                              placeholder="Montant du mois"
                            />
                          </div>
                          <div className="col-span-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomMonth(index)}
                              disabled={customPayments.length <= 1}
                            >
                              X
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-kara-neutral-50 p-3 text-sm text-kara-neutral-700 space-y-2">
                      {customTotalToRepay > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Total à rembourser</span>
                          <span className="font-semibold">{formatAmount(customTotalToRepay)} FCFA</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Total planifié</span>
                        <span className="font-semibold">{formatAmount(customTotal)} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Nombre de mois</span>
                        <span className="font-semibold">{customPayments.length} / {config.maxDuration}</span>
                      </div>
                      {customTotalToRepay > 0 && (
                        <div className="pt-2 mt-2 border-t border-kara-neutral-200">
                          {customRemainingToPlan > 0 && (
                            <div className="flex items-center justify-between text-amber-700">
                              <span>Reste à planifier</span>
                              <span className="font-semibold">{formatAmount(customRemainingToPlan)} FCFA</span>
                            </div>
                          )}
                          {customRemainingToPlan < 0 && (
                            <div className="flex items-center justify-between text-emerald-700">
                              <span>Excédent</span>
                              <span className="font-semibold">{formatAmount(-customRemainingToPlan)} FCFA</span>
                            </div>
                          )}
                          {customRemainingToPlan === 0 && customTotal > 0 && (
                            <div className="flex items-center justify-between text-emerald-700 font-semibold">
                              <span>✓ Couvert</span>
                              <span>Total couvert par les mensualités</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {customForm.formState.errors.monthlyPayments?.message && (
                      <p className="text-sm text-destructive">
                        {customForm.formState.errors.monthlyPayments.message as string}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={calculateCustom.isPending}
                    className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
                  >
                    {calculateCustom.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculer la simulation
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-kara-neutral-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-kara-primary-dark">Résultats de la simulation</CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    result.isValid
                      ? 'bg-kara-success-light text-kara-success border-kara-success/30'
                      : 'bg-kara-warning-light text-kara-warning border-kara-warning/30'
                  }
                >
                  {result.isValid ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valide
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Incomplet
                    </>
                  )}
                </Badge>
                <Button variant="outline" size="sm" onClick={resetSimulation}>
                  Nouvelle simulation
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
              <SummaryCard label="Montant emprunté" value={`${formatAmount(result.summary.amount)} FCFA`} />
              <SummaryCard label="Intérêt unique" value={`${formatAmount(result.summary.interestAmount)} FCFA`} />
              <SummaryCard label="Total à rembourser" value={`${formatAmount(result.summary.totalAmount)} FCFA`} />
              <SummaryCard label="Total planifié" value={`${formatAmount(result.summary.totalPlanned)} FCFA`} />
              <SummaryCard label="Reste" value={`${formatAmount(result.summary.remaining)} FCFA`} />
              <SummaryCard label="Excédent" value={`${formatAmount(result.summary.excess)} FCFA`} />
            </div>

            {!result.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {result.validationMessage ?? `La simulation personnalisée doit couvrir le total à rembourser en ${config.maxDuration} mois maximum.`}
                </AlertDescription>
              </Alert>
            )}

            {result.summary.excess > 0 && (
              <Alert>
                <AlertDescription>
                  Le plan depasse le total a rembourser de {formatAmount(result.summary.excess)} FCFA.
                  Ajustez les mensualites pour eviter un excedent.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#234D65] hover:bg-[#234D65]">
                    <TableHead className="text-white">Mois</TableHead>
                    <TableHead className="text-white">Date échéance</TableHead>
                    <TableHead className="text-white text-right">Montant</TableHead>
                    <TableHead className="text-white text-right">Cumul</TableHead>
                    <TableHead className="text-white text-right">Reste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.schedule.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">M{row.month}</TableCell>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right">{formatAmount(row.payment)} FCFA</TableCell>
                      <TableCell className="text-right">{formatAmount(row.cumulativePaid)} FCFA</TableCell>
                      <TableCell className="text-right">{formatAmount(row.remaining)} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button type="button" variant="outline" onClick={handleExportPdf} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button type="button" variant="outline" onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button type="button" variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleShareWhatsApp}
                className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            {onSimulationSelect && (
              <Button
                type="button"
                onClick={handleUseForContract}
                disabled={!result.isValid}
                className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                Utiliser cette simulation pour le contrat
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-kara-neutral-200 bg-kara-neutral-50 p-3">
      <div className="text-xs text-kara-neutral-600">{label}</div>
      <div className="text-sm font-semibold text-kara-primary-dark">{value}</div>
    </div>
  )
}
