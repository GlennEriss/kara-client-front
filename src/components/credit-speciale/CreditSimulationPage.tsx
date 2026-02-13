'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  standardSimulationSchema, 
  customSimulationSchema,
  proposedSimulationSchema,
  type StandardSimulationFormData,
  type CustomSimulationFormData,
  type ProposedSimulationFormData
} from '@/schemas/credit-speciale.schema'
import { useSimulations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import { 
  Loader2, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Table as TableIcon,
  Download,
  Printer,
  MessageCircle,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react'
import type { CreditType, StandardSimulation, CustomSimulation } from '@/types/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateSchedule as calculateScheduleUtil, customRound } from '@/utils/credit-speciale-calculations'
import { CreditFixeSimulationSection } from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationSection'

type SimulationTabValue = 'standard' | 'custom' | 'proposed'

const simulationTabChips: { value: SimulationTabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'standard', label: 'Simulation standard', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'custom', label: 'Simulation personnalisée', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { value: 'proposed', label: 'Simulation proposée', icon: <TrendingUp className="w-4 h-4" /> },
]

function SimulationTypeBadgesCarousel({
  value,
  onChange,
}: {
  value: SimulationTabValue
  onChange: (value: SimulationTabValue) => void
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
        {simulationTabChips.map((chip) => {
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

export default function CreditSimulationPage() {
  const [creditType, setCreditType] = useState<CreditType>('SPECIALE')
  const [simulationType, setSimulationType] = useState<'standard' | 'custom' | 'proposed'>('standard')
  const [standardResult, setStandardResult] = useState<StandardSimulation | null>(null)
  const [customResult, setCustomResult] = useState<CustomSimulation | null>(null)
  const [proposedResult, setProposedResult] = useState<StandardSimulation | null>(null)
  const [showResults, setShowResults] = useState(false)
  
  const { calculateStandard, calculateCustom, calculateProposed } = useSimulations()

  const standardForm = useForm<StandardSimulationFormData>({
    resolver: zodResolver(standardSimulationSchema),
    defaultValues: {
      amount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      firstPaymentDate: new Date(),
      creditType: 'SPECIALE' as const,
    },
    mode: 'onChange',
  })

  const customForm = useForm<CustomSimulationFormData>({
    resolver: zodResolver(customSimulationSchema),
    defaultValues: {
      amount: 0,
      interestRate: 0,
      monthlyPayments: [],
      firstPaymentDate: new Date(),
      creditType: 'SPECIALE' as const,
    },
    mode: 'onChange',
  })

  const proposedForm = useForm<ProposedSimulationFormData>({
    resolver: zodResolver(proposedSimulationSchema),
    defaultValues: {
      totalAmount: 0,
      duration: 1,
      interestRate: 0,
      firstPaymentDate: new Date(),
      creditType: 'SPECIALE' as const,
    },
    mode: 'onChange',
  })

  // Réinitialiser les formulaires quand le type de crédit change
  useEffect(() => {
    standardForm.reset({
      amount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      firstPaymentDate: new Date(),
      creditType: creditType as 'SPECIALE' | 'FIXE' | 'AIDE',
    })
    customForm.reset({
      amount: 0,
      interestRate: 0,
      monthlyPayments: [],
      firstPaymentDate: new Date(),
      creditType: creditType as 'SPECIALE' | 'FIXE' | 'AIDE',
    })
    proposedForm.reset({
      totalAmount: 0,
      duration: 1,
      interestRate: 0,
      firstPaymentDate: new Date(),
      creditType: creditType as 'SPECIALE' | 'FIXE' | 'AIDE',
    })
    setStandardResult(null)
    setCustomResult(null)
    setProposedResult(null)
    setShowResults(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditType])

  const onStandardSubmit = async (data: StandardSimulationFormData) => {
    try {
      const result = await calculateStandard.mutateAsync({
        amount: data.amount,
        interestRate: data.interestRate,
        monthlyPayment: data.monthlyPayment,
        firstPaymentDate: data.firstPaymentDate,
        creditType: data.creditType,
      })
      setStandardResult(result)
      setShowResults(true)
    } catch (error) {
      toast.error('Erreur lors du calcul de la simulation')
    }
  }

  const onCustomSubmit = async (data: CustomSimulationFormData) => {
    try {
      const result = await calculateCustom.mutateAsync({
        amount: data.amount,
        interestRate: data.interestRate,
        monthlyPayments: data.monthlyPayments,
        firstPaymentDate: data.firstPaymentDate,
        creditType: data.creditType,
      })
      setCustomResult(result)
      setShowResults(true)
    } catch (error) {
      toast.error('Erreur lors du calcul de la simulation')
    }
  }

  const onProposedSubmit = async (data: ProposedSimulationFormData) => {
    try {
      const result = await calculateProposed.mutateAsync({
        amount: data.totalAmount,
        duration: data.duration,
        interestRate: data.interestRate,
        firstPaymentDate: data.firstPaymentDate,
        creditType: data.creditType,
      })
      setProposedResult(result)
      setShowResults(true)
    } catch (error) {
      toast.error('Erreur lors du calcul de la simulation')
    }
  }

  const handleReset = () => {
    setStandardResult(null)
    setCustomResult(null)
    setProposedResult(null)
    setShowResults(false)
    standardForm.reset({
      amount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      firstPaymentDate: new Date(),
      creditType,
    })
    customForm.reset({
      amount: 0,
      interestRate: 0,
      monthlyPayments: [],
      firstPaymentDate: new Date(),
      creditType,
    })
    proposedForm.reset({
      totalAmount: 0,
      duration: 1,
      interestRate: 0,
      firstPaymentDate: new Date(),
      creditType,
    })
  }

  const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity
  const creditTypeLabel = creditType === 'SPECIALE' ? 'Spéciale' : creditType === 'FIXE' ? 'Fixe' : 'Aide'

  return (
    <div className="space-y-6">
      {/* Sélection du type de crédit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Type de crédit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={creditType} onValueChange={(value) => setCreditType(value as CreditType)}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Sélectionner un type de crédit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SPECIALE">Crédit Spéciale</SelectItem>
              <SelectItem value="FIXE">Crédit Fixe</SelectItem>
              <SelectItem value="AIDE">Crédit Aide</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {creditType === 'FIXE' ? (
        <CreditFixeSimulationSection />
      ) : (
      <Tabs value={simulationType} onValueChange={(v) => {
        setSimulationType(v as 'standard' | 'custom' | 'proposed')
        setShowResults(false)
        setStandardResult(null)
        setCustomResult(null)
        setProposedResult(null)
      }}>
        {/* Tabs - Vue desktop uniquement */}
        <TabsList className="hidden md:grid w-full grid-cols-3">
          <TabsTrigger value="standard">Simulation standard</TabsTrigger>
          <TabsTrigger value="custom">Simulation personnalisée</TabsTrigger>
          <TabsTrigger value="proposed">Simulation proposée</TabsTrigger>
        </TabsList>

        {/* Badges carousel - Vue mobile et tablette */}
        <div className="md:hidden">
          <SimulationTypeBadgesCarousel
            value={simulationType}
            onChange={(v) => {
              setSimulationType(v)
              setShowResults(false)
              setStandardResult(null)
              setCustomResult(null)
              setProposedResult(null)
            }}
          />
        </div>

        {/* Simulation standard */}
        <TabsContent value="standard" className="space-y-6">
          <Form {...standardForm}>
            <form onSubmit={standardForm.handleSubmit(onStandardSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de la simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={standardForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 500000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormLabel>Taux d'intérêt mensuel (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 5.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={standardForm.control}
                      name="monthlyPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensualité souhaitée (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 100000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormLabel>Date du premier versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={standardForm.control}
                      name="creditType"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input type="hidden" {...field} value={creditType} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Limite de durée : {maxDuration} mois maximum pour un crédit {creditTypeLabel.toLowerCase()}
                    </AlertDescription>
                  </Alert>

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
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Résultats simulation standard */}
          {showResults && standardResult && (
            <StandardSimulationResults
              result={standardResult}
              creditType={creditType}
              onReset={handleReset}
            />
          )}
        </TabsContent>

        {/* Simulation personnalisée */}
        <TabsContent value="custom" className="space-y-6">
          <Form {...customForm}>
            <form onSubmit={customForm.handleSubmit(onCustomSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de la simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={customForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 500000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormLabel>Taux d'intérêt mensuel (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 5.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <FormItem className="md:col-span-2">
                          <FormLabel>Date du premier versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="creditType"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input type="hidden" {...field} value={creditType} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <CustomPaymentsInput
                    form={customForm}
                    maxDuration={maxDuration}
                    creditType={creditType}
                  />

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
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Résultats simulation personnalisée */}
          {showResults && customResult && (
            <CustomSimulationResults
              result={customResult}
              creditType={creditType}
              onReset={handleReset}
            />
          )}
        </TabsContent>

        {/* Simulation proposée */}
        <TabsContent value="proposed" className="space-y-6">
          <Form {...proposedForm}>
            <form onSubmit={proposedForm.handleSubmit(onProposedSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de la simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={proposedForm.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant emprunté (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 100000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposedForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de mois (0 à 7 max)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max={creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : 120}
                              placeholder="Ex: 3"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposedForm.control}
                      name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taux d'intérêt mensuel (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 10"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposedForm.control}
                      name="firstPaymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date du premier versement</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposedForm.control}
                      name="creditType"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input type="hidden" {...field} value={creditType} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Limite de durée : {creditType === 'SPECIALE' ? 7 : 3} mois maximum pour un crédit {creditType === 'SPECIALE' ? 'spéciale' : 'aide'}
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    disabled={calculateProposed.isPending}
                    className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
                  >
                    {calculateProposed.isPending ? (
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
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Résultats simulation proposée */}
          {showResults && proposedResult && (
            <StandardSimulationResults
              result={proposedResult}
              creditType={creditType}
              onReset={handleReset}
              isProposed={true}
            />
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
}

// Composant pour saisir les paiements personnalisés
function CustomPaymentsInput({ 
  form, 
  maxDuration, 
  creditType 
}: { 
  form: any
  maxDuration: number
  creditType: CreditType
}) {
  const [payments, setPayments] = useState<Array<{ month: number; amount: number }>>([])

  useEffect(() => {
    const currentPayments = form.watch('monthlyPayments') || []
    setPayments(currentPayments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch('monthlyPayments')])

  const addPayment = () => {
    const newMonth = payments.length + 1
    if (maxDuration !== Infinity && newMonth > maxDuration) {
      toast.error(`Maximum ${maxDuration} mois pour un crédit ${creditType === 'SPECIALE' ? 'spéciale' : 'aide'}`)
      return
    }
    const newPayments = [...payments, { month: newMonth, amount: 0 }]
    setPayments(newPayments)
    form.setValue('monthlyPayments', newPayments)
  }

  const removePayment = (index: number) => {
    const newPayments = payments.filter((_, i) => i !== index).map((p, i) => ({ ...p, month: i + 1 }))
    setPayments(newPayments)
    form.setValue('monthlyPayments', newPayments)
  }

  const updatePayment = (index: number, amount: number) => {
    const newPayments = [...payments]
    newPayments[index].amount = amount
    setPayments(newPayments)
    form.setValue('monthlyPayments', newPayments)
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const creditAmount = form.watch('amount') || 0
  const interestRate = form.watch('interestRate') || 0
  const monthlyRate = interestRate / 100
  
  // Calculer le montant global restant avec les intérêts composés
  let remainingBalance = creditAmount
  payments.forEach((payment) => {
    const balanceWithInterest = remainingBalance * (1 + monthlyRate)
    remainingBalance = Math.max(0, balanceWithInterest - payment.amount)
  })
  const globalRemainingAmount = customRound(remainingBalance)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel>Paiements mensuels personnalisés</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPayment}
          disabled={maxDuration !== Infinity && payments.length >= maxDuration}
        >
          Ajouter un mois
        </Button>
      </div>

      {payments.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead>Montant (FCFA)</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">Mois {payment.month}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={payment.amount || ''}
                      onChange={(e) => updatePayment(index, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(index)}
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {payments.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Total des paiements :</span>
          <span className={`font-bold ${globalRemainingAmount <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {totalAmount.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      )}

      {payments.length > 0 && globalRemainingAmount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Le total des paiements ({totalAmount.toLocaleString('fr-FR')} FCFA) ne couvre pas le montant global restant ({globalRemainingAmount.toLocaleString('fr-FR')} FCFA)
          </AlertDescription>
        </Alert>
      )}

      {maxDuration !== Infinity && payments.length > maxDuration && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Maximum {maxDuration} mois pour un crédit {creditType === 'SPECIALE' ? 'spéciale' : 'aide'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Composant pour afficher les résultats de simulation standard
function StandardSimulationResults({
  result,
  creditType,
  onReset,
  isProposed = false
}: {
  result: StandardSimulation
  creditType: CreditType
  onReset: () => void
  isProposed?: boolean
}) {
  const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity
  
  // Calculer l'échéancier en utilisant la fonction utilitaire partagée
  const maxIterations = isProposed ? result.duration : (creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity)
  const schedule = calculateScheduleUtil({
    amount: result.amount,
    interestRate: result.interestRate,
    monthlyPayment: result.monthlyPayment,
    firstPaymentDate: new Date(result.firstPaymentDate),
    maxDuration: maxIterations,
  })
  
  const displayDuration = schedule.length
  const calculatedTotalAmount = schedule.reduce((sum, row) => sum + row.payment, 0)
  const calculatedTotalInterest = schedule.reduce((sum, row) => sum + row.interest, 0)
  const calculatedAverageMonthly = schedule.length > 0 ? calculatedTotalAmount / schedule.length : 0

  const calculateReferenceSchedule = () => {
    if (creditType !== 'SPECIALE' || maxDuration !== 7) return []
    
    const refFirstDate = new Date(result.firstPaymentDate)
    const monthlyRate = result.interestRate / 100
    
    let lastMontant = result.amount
    for (let i = 1; i <= 7; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    const montantGlobal = lastMontant
    const monthlyPaymentRaw = montantGlobal / 7
    const monthlyPaymentRef = monthlyPaymentRaw % 1 >= 0.5 
      ? Math.ceil(monthlyPaymentRaw) 
      : Math.floor(monthlyPaymentRaw)
    
    const referenceSchedule: Array<{
      month: number
      date: Date
      payment: number
      interest: number
    }> = []

    let remaining = result.amount
    for (let i = 0; i < 7; i++) {
      const date = new Date(refFirstDate)
      date.setMonth(date.getMonth() + i)
      
      const interest = remaining * monthlyRate
      const balanceWithInterest = remaining + interest
      
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
        interest: customRound(interest),
      })
      
      remaining = Math.max(0, balanceWithInterest - monthlyPaymentRef)
    }
    return referenceSchedule
  }

  const referenceSchedule = calculateReferenceSchedule()
  const referenceTotalAmount = referenceSchedule.reduce((sum, row) => sum + row.payment, 0)
  const referenceTotalInterest = referenceSchedule.reduce((sum, row) => sum + row.interest, 0)
  const referenceAverageMonthly = referenceSchedule.length > 0 ? referenceTotalAmount / referenceSchedule.length : 0

  // Fonction pour formater les nombres avec des espaces normaux (pas d'espaces insécables)
  const formatNumberForPDF = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  // Fonction pour télécharger l'échéancier calculé en PDF
  const handleDownloadCalculatedPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('portrait', 'mm', 'a4')

      const filteredSchedule = schedule.filter(row => row.payment > 0)
      const totalAmount = filteredSchedule.reduce((sum, row) => sum + row.payment, 0)

      // Préparer les données du tableau avec 3 colonnes seulement
      const tableData = filteredSchedule.map((row) => [
        row.month.toString(),
        row.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        `${formatNumberForPDF(row.payment)} FCFA`
      ])

      // Ajouter la ligne Total
      tableData.push([
        'Total:',
        '',
        `${formatNumberForPDF(customRound(totalAmount))} FCFA`
      ])

      autoTable(doc, {
        head: [['Echéances', 'Date', 'Montant']],
        body: tableData,
        startY: 20,
        styles: { fontSize: 11, cellPadding: 5 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 60, halign: 'center' },
          1: { cellWidth: 70, halign: 'center' },
          2: { cellWidth: 60, halign: 'right' }
        },
        foot: [],
        didParseCell: (data: any) => {
          // Style pour la ligne Total
          if (data.row.index === filteredSchedule.length) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [240, 240, 240]
          }
        }
      })

      doc.save(`echeancier_calcule_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // Fonction pour télécharger l'échéancier référence en PDF
  const handleDownloadReferencePDF = async () => {
    if (creditType !== 'SPECIALE' || maxDuration !== 7) return
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape', 'mm', 'a4')

      // En-tête
      doc.setFontSize(16)
      doc.setTextColor(35, 77, 101)
      doc.text('Échéancier référence', 14, 14)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Montant: ${formatNumberForPDF(result.amount)} FCFA | Durée: 7 mois | Mensualité: ${formatNumberForPDF(customRound(referenceAverageMonthly))} FCFA`, 14, 20)
      doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 14, 25)

      // Préparer les données du tableau
      const tableData = referenceSchedule.map((row) => [
        `M${row.month}`,
        row.date.toLocaleDateString('fr-FR'),
        formatNumberForPDF(row.payment)
      ])

      autoTable(doc, {
        head: [['Mois', 'Date', 'Mensualité (FCFA)']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 60 },
          2: { cellWidth: 70, halign: 'right' }
        }
      })

      doc.save(`echeancier_reference_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // Fonction pour imprimer l'échéancier calculé
  const handlePrintCalculated = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const filteredSchedule = schedule.filter(row => row.payment > 0)
    const totalAmount = filteredSchedule.reduce((sum, row) => sum + row.payment, 0)

    const tableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Échéancier calculé</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #234D65; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Echéances</th>
                <th>Date</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSchedule.map((row) => `
                <tr>
                  <td>${row.month}</td>
                  <td>${row.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td class="text-right">${formatNumberForPDF(row.payment)} FCFA</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total:</td>
                <td></td>
                <td class="text-right">${formatNumberForPDF(customRound(totalAmount))} FCFA</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(tableHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Fonction pour partager l'échéancier calculé sur WhatsApp
  const handleShareWhatsAppCalculated = () => {
    const filteredSchedule = schedule.filter(row => row.payment > 0)
    const totalAmount = filteredSchedule.reduce((sum, row) => sum + row.payment, 0)
    
    // Construire le message formaté avec 3 colonnes comme le PDF
    let message = `*ÉCHÉANCIER DE CRÉDIT*\n\n`
    
    // En-tête du tableau
    message += `Echéances | Date | Montant\n`
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    
    // Lignes de données
    filteredSchedule.forEach((row) => {
      const dateStr = row.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      message += `${row.month} | ${dateStr} | ${formatNumberForPDF(row.payment)} FCFA\n`
    })
    
    // Ligne Total
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    message += `Total: | | ${formatNumberForPDF(customRound(totalAmount))} FCFA`
    
    // Encoder le message pour l'URL WhatsApp
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    
    // Ouvrir WhatsApp dans un nouvel onglet
    window.open(whatsappUrl, '_blank')
  }

  // Fonction pour imprimer l'échéancier référence
  const handlePrintReference = () => {
    if (creditType !== 'SPECIALE' || maxDuration !== 7) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const tableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Échéancier référence</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #234D65; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #234D65; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Échéancier référence (7 mois)</h1>
          <p><strong>Montant:</strong> ${result.amount.toLocaleString('fr-FR')} FCFA | <strong>Durée:</strong> 7 mois | <strong>Mensualité:</strong> ${customRound(referenceAverageMonthly).toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Fait le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Date</th>
                <th class="text-right">Mensualité (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              ${referenceSchedule.map((row) => `
                <tr>
                  <td>M${row.month}</td>
                  <td>${row.date.toLocaleDateString('fr-FR')}</td>
                  <td class="text-right">${row.payment.toLocaleString('fr-FR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(tableHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Résultats de la simulation
          </CardTitle>
          <div className="flex items-center gap-2">
            {result.isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valide
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Limite dépassée
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onReset}>
              Nouvelle simulation
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deux cartes de résumé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carte 1: Échéancier calculé */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-900">Échéancier calculé</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-gray-600">Montant</div>
                  <div className="text-xl font-bold text-blue-900">
                    {result.amount.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-600">Durée</div>
                  <div className="text-xl font-bold text-green-900">
                    {displayDuration} mois
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-gray-600">Mensualité</div>
                  <div className="text-xl font-bold text-purple-900">
                    {result.monthlyPayment.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xs text-gray-600">Total intérêts</div>
                  <div className="text-xl font-bold text-yellow-900">
                    {customRound(calculatedTotalInterest).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-xs text-gray-600">Total à rembourser</div>
                  <div className="text-xl font-bold text-orange-900">
                    {customRound(calculatedTotalAmount).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte 2: Échéancier référence */}
          {creditType === 'SPECIALE' && maxDuration === 7 && (
            <Card className="border-2 border-indigo-200">
              <CardHeader className="bg-indigo-50">
                <CardTitle className="text-lg text-indigo-900">Échéancier référence</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-gray-600">Montant</div>
                    <div className="text-xl font-bold text-blue-900">
                      {result.amount.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-gray-600">Durée</div>
                    <div className="text-xl font-bold text-green-900">
                      7 mois
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-gray-600">Mensualité</div>
                    <div className="text-xl font-bold text-purple-900">
                      {customRound(referenceAverageMonthly).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs text-gray-600">Total à rembourser</div>
                    <div className="text-xl font-bold text-orange-900">
                      {customRound(referenceTotalAmount).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {(!result.isValid || (creditType === 'SPECIALE' && result.remainingAtMaxDuration !== undefined && result.remainingAtMaxDuration > 0)) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {creditType === 'SPECIALE' && result.remainingAtMaxDuration !== undefined && result.remainingAtMaxDuration > 0 ? (
                <>
                  <div className="font-semibold mb-2">Impossible de rembourser en 7 mois</div>
                  <div className="mb-2">
                    Avec une mensualité de {result.monthlyPayment.toLocaleString('fr-FR')} FCFA, il restera encore{' '}
                    <strong>{result.remainingAtMaxDuration.toFixed(0)} FCFA</strong> à rembourser au 7ème mois.
                  </div>
                  {result.suggestedMonthlyPayment && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <strong>💡 Solution :</strong> Augmentez la mensualité à au moins{' '}
                      <strong className="text-blue-700">{result.suggestedMonthlyPayment.toLocaleString('fr-FR')} FCFA</strong>
                      {' '}pour pouvoir rembourser le crédit en 7 mois maximum.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold mb-2">Limite de durée dépassée</div>
                  <div>
                    La durée calculée ({result.duration} mois) dépasse la limite autorisée ({maxDuration} mois) pour un crédit {creditType === 'SPECIALE' ? 'spéciale' : 'aide'}.
                  </div>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Tableaux comparatifs */}
        <div className="space-y-6">
          {/* Tableau calculé */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Échéancier calculé ({schedule.filter(row => row.payment > 0).length} mois)
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCalculatedPDF}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintCalculated}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsAppCalculated}
                  className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Mensualité</TableHead>
                    <TableHead className="text-right">Intérêts</TableHead>
                    <TableHead className="text-right">Montant global</TableHead>
                    <TableHead className="text-right">Reste dû</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule
                    .filter(row => row.payment > 0) // Filtrer les lignes avec mensualité à 0
                    .map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">M{row.month}</TableCell>
                      <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{row.interest.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{row.principal.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{row.remaining.toLocaleString('fr-FR')} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tableau référence 7 mois (pour crédit spéciale uniquement) */}
          {creditType === 'SPECIALE' && maxDuration === 7 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Échéancier référence (7 mois)
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReferencePDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintReference}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mois</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Mensualité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referenceSchedule.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">M{row.month}</TableCell>
                        <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour afficher les résultats de simulation personnalisée
function CustomSimulationResults({
  result,
  creditType,
  onReset
}: {
  result: CustomSimulation
  creditType: CreditType
  onReset: () => void
}) {
  const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity
  
  // Calculer l'échéancier personnalisé
  const schedule: Array<{
    month: number
    date: Date
    payment: number
    interest: number
    principal: number
    remaining: number
  }> = []

  let remaining = result.amount
  const monthlyRate = result.interestRate / 100
  const firstDate = new Date(result.firstPaymentDate)

  result.monthlyPayments.forEach((payment, index) => {
    const date = new Date(firstDate)
    date.setMonth(date.getMonth() + index)
    
    const interest = remaining * monthlyRate
    const balanceWithInterest = remaining + interest
    const actualPayment = Math.min(payment.amount, balanceWithInterest)
    remaining = Math.max(0, balanceWithInterest - actualPayment)

    schedule.push({
      month: payment.month,
      date,
      payment: actualPayment,
      interest,
      principal: balanceWithInterest,
      remaining,
    })
  })

  const referenceSchedule: Array<{
    month: number
    date: Date
    payment: number
    interest?: number
  }> = []

  if (maxDuration !== Infinity) {
    let lastMontant = result.amount
    for (let i = 1; i <= maxDuration; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    const montantGlobal = lastMontant
    const monthlyPaymentRaw = montantGlobal / maxDuration
    const monthlyPaymentRef = monthlyPaymentRaw % 1 >= 0.5 
      ? Math.ceil(monthlyPaymentRaw) 
      : Math.floor(monthlyPaymentRaw)
    
    let remaining = result.amount
    for (let i = 0; i < maxDuration; i++) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      
      const interest = remaining * monthlyRate
      const balanceWithInterest = remaining + interest
      
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
        interest: customRound(interest),
      })
      
      remaining = Math.max(0, balanceWithInterest - monthlyPaymentRef)
    }
  }

  const calculatedTotalAmount = schedule.reduce((sum, row) => sum + row.payment, 0)
  const calculatedTotalInterest = schedule.reduce((sum, row) => sum + row.interest, 0)
  const calculatedAverageMonthly = schedule.length > 0 ? calculatedTotalAmount / schedule.length : 0
  const referenceTotalAmount = referenceSchedule.reduce((sum, row) => sum + row.payment, 0)
  const referenceTotalInterest = referenceSchedule.reduce((sum, row) => sum + (row.interest || 0), 0)
  const referenceAverageMonthly = referenceSchedule.length > 0 ? referenceTotalAmount / referenceSchedule.length : 0

  // Fonction pour formater les nombres avec des espaces normaux (pas d'espaces insécables)
  const formatNumberForPDF = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  // Fonction pour télécharger l'échéancier personnalisé en PDF
  const handleDownloadCustomPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape', 'mm', 'a4')

      // En-tête
      doc.setFontSize(16)
      doc.setTextColor(35, 77, 101)
      doc.text('Échéancier personnalisé', 14, 14)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Montant: ${formatNumberForPDF(result.amount)} FCFA | Durée: ${schedule.length} mois`, 14, 20)
      doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 14, 25)

      // Préparer les données du tableau
      const tableData = schedule.map((row) => [
        `M${row.month}`,
        row.date.toLocaleDateString('fr-FR'),
        formatNumberForPDF(customRound(row.payment)),
        formatNumberForPDF(customRound(row.interest)),
        formatNumberForPDF(customRound(row.principal)),
        formatNumberForPDF(customRound(row.remaining))
      ])

      autoTable(doc, {
        head: [['Mois', 'Date', 'Mensualité (FCFA)', 'Intérêts (FCFA)', 'Montant global (FCFA)', 'Reste dû (FCFA)']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 45, halign: 'right' },
          3: { cellWidth: 45, halign: 'right' },
          4: { cellWidth: 50, halign: 'right' },
          5: { cellWidth: 50, halign: 'right' }
        }
      })

      doc.save(`echeancier_personnalise_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // Fonction pour télécharger l'échéancier référence en PDF (simulation personnalisée)
  const handleDownloadReferencePDFCustom = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape', 'mm', 'a4')

      // En-tête
      doc.setFontSize(16)
      doc.setTextColor(35, 77, 101)
      doc.text('Échéancier référence', 14, 14)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Montant: ${formatNumberForPDF(result.amount)} FCFA | Durée: ${maxDuration} mois | Mensualité: ${formatNumberForPDF(customRound(referenceAverageMonthly))} FCFA`, 14, 20)
      doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 14, 25)

      // Préparer les données du tableau
      const tableData = referenceSchedule.map((row) => [
        `M${row.month}`,
        row.date.toLocaleDateString('fr-FR'),
        formatNumberForPDF(row.payment)
      ])

      autoTable(doc, {
        head: [['Mois', 'Date', 'Mensualité (FCFA)']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 60 },
          2: { cellWidth: 70, halign: 'right' }
        }
      })

      doc.save(`echeancier_reference_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // Fonction pour imprimer l'échéancier personnalisé
  const handlePrintCustom = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const tableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Échéancier personnalisé</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #234D65; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #234D65; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Échéancier personnalisé</h1>
          <p><strong>Montant:</strong> ${result.amount.toLocaleString('fr-FR')} FCFA | <strong>Durée:</strong> ${schedule.length} mois</p>
          <p><strong>Fait le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Date</th>
                <th class="text-right">Mensualité (FCFA)</th>
                <th class="text-right">Intérêts (FCFA)</th>
                <th class="text-right">Montant global (FCFA)</th>
                <th class="text-right">Reste dû (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.map((row) => `
                <tr>
                  <td>M${row.month}</td>
                  <td>${row.date.toLocaleDateString('fr-FR')}</td>
                  <td class="text-right">${customRound(row.payment).toLocaleString('fr-FR')}</td>
                  <td class="text-right">${customRound(row.interest).toLocaleString('fr-FR')}</td>
                  <td class="text-right">${customRound(row.principal).toLocaleString('fr-FR')}</td>
                  <td class="text-right">${customRound(row.remaining).toLocaleString('fr-FR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(tableHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Fonction pour partager l'échéancier personnalisé sur WhatsApp
  const handleShareWhatsAppCustom = () => {
    // Construire le message formaté
    let message = `📊 *ÉCHÉANCIER DE CRÉDIT PERSONNALISÉ*\n\n`
    message += `💰 Montant: ${formatNumberForPDF(result.amount)} FCFA\n`
    message += `📅 Durée: ${schedule.length} mois\n`
    message += `📆 Fait le: ${new Date().toLocaleDateString('fr-FR')}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━━\n`
    message += `*DÉTAIL DES ÉCHÉANCES*\n`
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    schedule.forEach((row) => {
      message += `📌 *Mois ${row.month}* (${row.date.toLocaleDateString('fr-FR')})\n`
      message += `   • Mensualité: ${formatNumberForPDF(customRound(row.payment))} FCFA\n`
      message += `   • Intérêts: ${formatNumberForPDF(customRound(row.interest))} FCFA\n`
      message += `   • Montant global: ${formatNumberForPDF(customRound(row.principal))} FCFA\n`
      message += `   • Reste dû: ${formatNumberForPDF(customRound(row.remaining))} FCFA\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━━\n`
    message += `💰 *Total à rembourser: ${formatNumberForPDF(customRound(calculatedTotalAmount))} FCFA*\n`
    message += `📈 *Total intérêts: ${formatNumberForPDF(customRound(calculatedTotalInterest))} FCFA*`
    
    // Encoder le message pour l'URL WhatsApp
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    
    // Ouvrir WhatsApp dans un nouvel onglet
    window.open(whatsappUrl, '_blank')
  }

  // Fonction pour imprimer l'échéancier référence (simulation personnalisée)
  const handlePrintReferenceCustom = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const tableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Échéancier référence</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #234D65; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #234D65; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Échéancier référence (${maxDuration} mois)</h1>
          <p><strong>Montant:</strong> ${result.amount.toLocaleString('fr-FR')} FCFA | <strong>Durée:</strong> ${maxDuration} mois | <strong>Mensualité:</strong> ${customRound(referenceAverageMonthly).toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Fait le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Date</th>
                <th class="text-right">Mensualité (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              ${referenceSchedule.map((row) => `
                <tr>
                  <td>M${row.month}</td>
                  <td>${row.date.toLocaleDateString('fr-FR')}</td>
                  <td class="text-right">${row.payment.toLocaleString('fr-FR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(tableHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Résultats de la simulation
          </CardTitle>
          <div className="flex items-center gap-2">
            {result.isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valide
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Limite dépassée
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onReset}>
              Nouvelle simulation
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deux cartes de résumé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carte 1: Échéancier calculé */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-900">Échéancier calculé</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-gray-600">Montant</div>
                  <div className="text-xl font-bold text-blue-900">
                    {result.amount.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-600">Durée</div>
                  <div className="text-xl font-bold text-green-900">
                    {result.duration} mois
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-gray-600">Mensualité</div>
                  <div className="text-xl font-bold text-purple-900">
                    {customRound(calculatedAverageMonthly).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xs text-gray-600">Total intérêts</div>
                  <div className="text-xl font-bold text-yellow-900">
                    {customRound(calculatedTotalInterest).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-xs text-gray-600">Total à rembourser</div>
                  <div className="text-xl font-bold text-orange-900">
                    {customRound(calculatedTotalAmount).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte 2: Échéancier référence */}
          {maxDuration !== Infinity && (
            <Card className="border-2 border-indigo-200">
              <CardHeader className="bg-indigo-50">
                <CardTitle className="text-lg text-indigo-900">Échéancier référence</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-gray-600">Montant</div>
                    <div className="text-xl font-bold text-blue-900">
                      {result.amount.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-gray-600">Durée</div>
                    <div className="text-xl font-bold text-green-900">
                      {maxDuration} mois
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-gray-600">Mensualité</div>
                    <div className="text-xl font-bold text-purple-900">
                      {customRound(referenceAverageMonthly).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs text-gray-600">Total à rembourser</div>
                    <div className="text-xl font-bold text-orange-900">
                      {customRound(referenceTotalAmount).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!result.isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Limite de durée dépassée</div>
              <div>
                La durée ({result.duration} mois) dépasse la limite autorisée ({maxDuration} mois) pour un crédit {creditType === 'SPECIALE' ? 'spéciale' : 'aide'}.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Tableaux comparatifs */}
        <div className="space-y-6">
          {/* Tableau personnalisé */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Échéancier personnalisé
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCustomPDF}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintCustom}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsAppCustom}
                  className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Mensualité</TableHead>
                    <TableHead className="text-right">Intérêts</TableHead>
                    <TableHead className="text-right">Montant global</TableHead>
                    <TableHead className="text-right">Reste dû</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">M{row.month}</TableCell>
                      <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">{customRound(row.payment).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{customRound(row.interest).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{customRound(row.principal).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right">{customRound(row.remaining).toLocaleString('fr-FR')} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Échéancier référence (maxDuration mois) */}
          {maxDuration !== Infinity && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Échéancier référence ({maxDuration} mois)
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReferencePDFCustom}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintReferenceCustom}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mois</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Mensualité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referenceSchedule.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">M{row.month}</TableCell>
                        <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
