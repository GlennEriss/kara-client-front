'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  BarChart3,
  AlertTriangle,
  Loader2,
  Download,
  FileSpreadsheet,
  Printer,
  MessageCircle,
  LayoutGrid,
  SlidersHorizontal,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} %`
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isValidDateValue(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function toDateInputValue(value: unknown): string {
  if (!isValidDateValue(value)) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return parsed
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
  const [resultAnimationKey, setResultAnimationKey] = useState(0)
  const resultSectionRef = useRef<HTMLDivElement | null>(null)
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
      targetMonths: config.maxDuration,
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
      targetMonths: config.maxDuration,
    })
    customForm.reset({
      amount: initialAmount ?? 0,
      interestRate: 0,
      firstPaymentDate: new Date(),
      monthlyPayments: [{ month: 1, amount: 0 }],
    })
    setMode('STANDARD')
    setResult(null)
  }, [config.maxDuration, customForm, initialAmount, standardForm])

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
      setResultAnimationKey((prev) => prev + 1)
      setResult(simulationResult)
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    } catch {
      toast.error('Erreur lors du calcul de la simulation standard')
    }
  }

  const onCustomSubmit = async (data: FixedCustomSimulationFormInput) => {
    try {
      const simulationResult = await calculateCustom.mutateAsync(data)
      setResultAnimationKey((prev) => prev + 1)
      setResult(simulationResult)
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
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

  const getCustomMonthMaxAmount = (index: number) => {
    if (customTotalToRepay <= 0) return 0

    const totalWithoutCurrentMonth = customPayments.reduce((sum, payment, currentIndex) => {
      if (currentIndex === index) return sum
      return sum + (payment.amount || 0)
    }, 0)

    return Math.max(0, customTotalToRepay - totalWithoutCurrentMonth)
  }

  const updateCustomMonthAmount = (index: number, amount: number) => {
    const maxAmount = getCustomMonthMaxAmount(index)
    const normalizedAmount = Math.min(Math.max(0, Math.round(amount)), maxAmount)

    const nextPayments = customPayments.map((payment, currentIndex) =>
      currentIndex === index ? { ...payment, amount: normalizedAmount } : payment
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

  const totalWithInterestRate = result
    ? result.summary.amount > 0
      ? (result.summary.interestAmount / result.summary.amount) * 100
      : 0
    : 0

  const simulationSummary = useMemo(() => {
    if (!result) return null

    const effectiveCoverage = Math.min(result.summary.totalPlanned, result.summary.totalAmount)
    const coverageRate = result.summary.totalAmount > 0 ? (effectiveCoverage / result.summary.totalAmount) * 100 : 0
    const plannedMonths = result.schedule.filter((row) => row.payment > 0).length
    const remainingMonths = Math.max(result.summary.duration - plannedMonths, 0)

    const financialBreakdown = [
      { name: 'Capital', value: result.summary.amount, fill: '#234D65' },
      { name: 'Intérêt', value: result.summary.interestAmount, fill: '#CBB171' },
    ].filter((item) => item.value > 0)

    const planningBreakdown = [
      { name: 'Planifié', value: result.summary.totalPlanned, fill: '#16A34A' },
      { name: 'Reste', value: result.summary.remaining, fill: '#E2E8F0' },
      { name: 'Excédent', value: result.summary.excess, fill: '#F59E0B' },
    ].filter((item) => item.value > 0)

    return {
      coverageRate,
      plannedMonths,
      remainingMonths,
      financialBreakdown,
      planningBreakdown,
    }
  }, [result])

  const smoothFieldClass =
    'w-full min-h-[44px] sm:min-h-[40px] rounded-xl border-slate-300/80 bg-white/90 shadow-sm transition-all duration-300 ease-out placeholder:text-slate-400 hover:border-[#234D65]/45 hover:bg-white focus-visible:border-[#234D65] focus-visible:ring-4 focus-visible:ring-[#234D65]/15 focus-visible:shadow-[0_0_0_1px_rgba(35,77,101,0.25)] disabled:cursor-not-allowed disabled:opacity-60'

  const smoothFieldContainerClass =
    'space-y-2 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3 transition-all duration-300 ease-out hover:border-[#234D65]/25 hover:shadow-sm focus-within:border-[#234D65]/40 focus-within:shadow-[0_0_0_3px_rgba(35,77,101,0.08)]'

  const isLoading = calculateStandard.isPending || calculateCustom.isPending

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-[#234D65]/20 shadow-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#234D65]">Mode simulation</p>
              <p className="text-sm text-slate-600">
                Taux entre 0% et {config.maxInterestRate}%, durée maximale de {config.maxDuration} échéances.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#234D65]/20 bg-[#234D65]/5 px-3 py-1.5 text-xs font-semibold text-[#234D65]">
              <Sparkles className="h-3.5 w-3.5" />
              Simulation interactive
            </div>
          </div>
          <Tabs value={mode} onValueChange={(value) => {
            setMode(value as 'STANDARD' | 'CUSTOM')
            setResult(null)
          }}>
            {/* Tabs - Vue desktop uniquement */}
            <TabsList className="hidden md:grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <TabsTrigger value="STANDARD" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-sm">Simulation standard</TabsTrigger>
              <TabsTrigger value="CUSTOM" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-sm">Simulation personnalisée</TabsTrigger>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <FormField
                      control={standardForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 2000000"
                              disabled={lockAmount}
                              className={smoothFieldClass}
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
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Taux d&apos;intérêt (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 30"
                              className={smoothFieldClass}
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
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Date du 1er versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className={smoothFieldClass}
                              value={toDateInputValue(field.value)}
                              onChange={(event) => {
                                const nextValue = event.target.value
                                if (!nextValue) {
                                  field.onChange(new Date(''))
                                  return
                                }
                                const parsedDate = parseDateInputValue(nextValue)
                                field.onChange(parsedDate ?? new Date(''))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={standardForm.control}
                      name="targetMonths"
                      render={({ field }) => (
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Nombre de mois visé</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={config.maxDuration}
                              placeholder={`Ex: ${config.maxDuration}`}
                              className={smoothFieldClass}
                              {...field}
                              onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                            />
                          </FormControl>
                          <p className="text-xs text-slate-500">
                            Entre 1 et {config.maxDuration} mois.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={calculateStandard.isPending}
                    className="group w-full min-h-[44px] sm:min-h-[40px] bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1f455b] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {calculateStandard.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Simulation en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
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
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 2000000"
                              disabled={lockAmount}
                              className={smoothFieldClass}
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
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Taux d&apos;intérêt (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 30"
                              className={smoothFieldClass}
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
                        <FormItem className={smoothFieldContainerClass}>
                          <FormLabel className="text-sm font-semibold text-slate-700">Date du 1er versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className={smoothFieldClass}
                              value={toDateInputValue(field.value)}
                              onChange={(event) => {
                                const nextValue = event.target.value
                                if (!nextValue) {
                                  field.onChange(new Date(''))
                                  return
                                }
                                const parsedDate = parseDateInputValue(nextValue)
                                field.onChange(parsedDate ?? new Date(''))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {customTotalToRepay > 0 && (
                    <div className="rounded-2xl border border-[#234D65]/30 bg-[#234D65]/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-700">Total à rembourser</span>
                        <span className="text-lg font-bold text-[#234D65]">{formatAmount(customTotalToRepay)} FCFA</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Montant emprunté + intérêts (taux unique)</p>
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <Label className="text-sm font-semibold text-slate-700">Montants mensuels personnalisés</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomMonth}
                        disabled={customPayments.length >= config.maxDuration}
                        className="border-slate-300 hover:border-[#234D65]/40 hover:bg-[#234D65]/5"
                      >
                        Ajouter un mois
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {customPayments.map((payment, index) => {
                        const maxAmount = getCustomMonthMaxAmount(index)

                        return (
                        <div key={payment.month} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-200/80 bg-white/80 p-2">
                          <div className="col-span-3 md:col-span-2 text-sm font-medium text-slate-700">
                            Mois {payment.month}
                          </div>
                          <div className="col-span-7 md:col-span-8">
                            <Input
                              type="number"
                              min={0}
                              max={maxAmount}
                              value={payment.amount || ''}
                              onChange={(event) => updateCustomMonthAmount(index, Number(event.target.value) || 0)}
                              placeholder="Montant du mois"
                              className={smoothFieldClass}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              Maximum autorisé: {formatAmount(maxAmount)} FCFA
                            </p>
                          </div>
                          <div className="col-span-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomMonth(index)}
                              disabled={customPayments.length <= 1}
                              className="text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              X
                            </Button>
                          </div>
                        </div>
                        )
                      })}
                    </div>

                    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
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
                        <div className="pt-2 mt-2 border-t border-slate-200">
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
                    className="group w-full min-h-[44px] sm:min-h-[40px] bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1f455b] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {calculateCustom.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Simulation en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
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
              <p className="text-xs text-slate-600">Génération de l&apos;échéancier et des indicateurs…</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && simulationSummary && (
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
                    Visualisez le plan de remboursement du {config.label.toLowerCase()} en un coup d&apos;œil.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Simulation calculée
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#234D65]/20 bg-gradient-to-br from-[#234D65]/10 to-[#2c5a73]/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#234D65]">Montant emprunté</p>
                  <p className="mt-2 text-2xl font-black text-[#234D65]">{formatAmount(result.summary.amount)} FCFA</p>
                </div>
                <div className="rounded-2xl border border-[#cbb171]/40 bg-gradient-to-br from-[#cbb171]/20 to-[#f0e5c7]/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6f2b]">Intérêt unique</p>
                  <p className="mt-2 text-2xl font-black text-[#7b6125]">{formatAmount(result.summary.interestAmount)} FCFA</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total à rembourser</p>
                  <p className="mt-2 text-2xl font-black text-emerald-800">{formatAmount(result.summary.totalAmount)} FCFA</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Taux appliqué</p>
                  <p className="mt-2 text-2xl font-black text-indigo-800">{formatPercent(totalWithInterestRate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <h3 className="font-semibold">Couverture du plan</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={simulationSummary.planningBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {simulationSummary.planningBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => `${formatAmount(Number(value))} FCFA`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid gap-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Taux de couverture</span>
                    <span className="text-sm font-semibold text-emerald-700">{formatPercent(simulationSummary.coverageRate)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Mois planifiés</span>
                    <span className="text-sm font-semibold text-slate-900">{simulationSummary.plannedMonths}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Mois restants</span>
                    <span className="text-sm font-semibold text-slate-900">{simulationSummary.remainingMonths}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#234D65]/20 shadow-md">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <SummaryCard label="Durée" value={`${result.summary.duration} mois`} />
                <SummaryCard label="Total planifié" value={`${formatAmount(result.summary.totalPlanned)} FCFA`} />
                <SummaryCard label="Reste / Excédent" value={`${formatAmount(result.summary.remaining > 0 ? result.summary.remaining : result.summary.excess)} FCFA`} />
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 delay-200">
                <Table className="min-w-[620px] sm:min-w-0 w-full">
                  <TableHeader>
                    <TableRow className="bg-[#234D65] hover:bg-[#234D65]">
                      <TableHead className="text-white font-semibold">Mois</TableHead>
                      <TableHead className="text-white font-semibold">Date échéance</TableHead>
                      <TableHead className="text-white font-semibold text-right">Montant</TableHead>
                      <TableHead className="text-white font-semibold text-right">Cumul</TableHead>
                      <TableHead className="text-white font-semibold text-right">Reste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.schedule.map((row) => (
                      <TableRow key={row.month} className="even:bg-muted/50 hover:bg-[#234D65]/5 transition-colors">
                        <TableCell className="font-medium">
                          <span className="inline-flex min-w-[38px] justify-center rounded-full border border-[#234D65]/20 bg-[#234D65]/5 px-2 py-1 text-xs font-semibold text-[#234D65]">
                            M{row.month}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell className="text-right font-medium">{formatAmount(row.payment)} FCFA</TableCell>
                        <TableCell className="text-right">{formatAmount(row.cumulativePaid)} FCFA</TableCell>
                        <TableCell className="text-right">{formatAmount(row.remaining)} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold border-t-2 bg-muted/50">
                      <TableCell colSpan={2} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right">{formatAmount(result.summary.totalPlanned)} FCFA</TableCell>
                      <TableCell className="text-right">{formatAmount(result.summary.totalPlanned)} FCFA</TableCell>
                      <TableCell className="text-right">
                        {result.summary.remaining > 0 ? `${formatAmount(result.summary.remaining)} FCFA` : result.summary.excess > 0 ? `-${formatAmount(result.summary.excess)} FCFA` : '0 FCFA'}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button type="button" variant="outline" onClick={handleExportPdf} className="gap-2 min-h-[44px] sm:min-h-[40px] border-rose-300/80 bg-gradient-to-r from-rose-50 to-rose-100/80 text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-100 hover:text-rose-800 hover:shadow-md">
                  <Download className="h-4 w-4 text-rose-600" />
                  Exporter PDF
                </Button>
                <Button type="button" variant="outline" onClick={handleExportExcel} className="gap-2 min-h-[44px] sm:min-h-[40px] border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-800 hover:shadow-md">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Exporter Excel
                </Button>
                <Button type="button" variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="gap-2 min-h-[44px] sm:min-h-[40px] border-[#21b45a] bg-gradient-to-r from-[#25D366] to-[#1ebe5d] text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#199f4e] hover:from-[#22c35f] hover:to-[#18a94f] hover:text-white hover:shadow-md"
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                  Partager WhatsApp
                </Button>
              </div>

              {onSimulationSelect && (
                <Button
                  type="button"
                  onClick={handleUseForContract}
                  disabled={!result.isValid}
                  className="group w-full min-h-[44px] sm:min-h-[40px] bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1f455b] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Utiliser cette simulation pour le contrat
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Renseignez les champs et lancez la simulation.
        </p>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-sm font-semibold text-kara-primary-dark">{value}</div>
    </div>
  )
}
