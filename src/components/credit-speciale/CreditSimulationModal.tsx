'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  Calendar,
  DollarSign,
  Percent,
  Table as TableIcon
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

interface CreditSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  creditType: CreditType
  initialAmount?: number
  initialMonthlyPayment?: number
  onSimulationComplete?: (simulation: StandardSimulation | CustomSimulation) => void
}

export default function CreditSimulationModal({
  isOpen,
  onClose,
  creditType,
  initialAmount,
  initialMonthlyPayment,
  onSimulationComplete
}: CreditSimulationModalProps) {
  const [simulationType, setSimulationType] = useState<'standard' | 'custom' | 'proposed'>('standard')
  const [standardResult, setStandardResult] = useState<StandardSimulation | null>(null)
  const [customResult, setCustomResult] = useState<CustomSimulation | null>(null)
  const [proposedResult, setProposedResult] = useState<StandardSimulation | null>(null)
  const [showResults, setShowResults] = useState(false)
  
  const { calculateStandard, calculateCustom, calculateProposed } = useSimulations()

  const standardForm = useForm({
    resolver: zodResolver(standardSimulationSchema) as any,
    defaultValues: {
      amount: initialAmount || 0,
      interestRate: 0,
      monthlyPayment: initialMonthlyPayment || 0,
      firstPaymentDate: new Date(),
      creditType,
    },
    mode: 'onChange',
  })

  const customForm = useForm({
    resolver: zodResolver(customSimulationSchema) as any,
    defaultValues: {
      amount: initialAmount || 0,
      interestRate: 0,
      monthlyPayments: [],
      firstPaymentDate: new Date(),
      creditType,
    },
    mode: 'onChange',
  })

  const proposedForm = useForm({
    resolver: zodResolver(proposedSimulationSchema) as any,
    defaultValues: {
      totalAmount: 0,
      duration: 1,
      interestRate: 0,
      firstPaymentDate: new Date(),
      creditType,
    },
    mode: 'onChange',
  })

  // Réinitialiser les formulaires quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      standardForm.reset({
        amount: initialAmount || 0,
        interestRate: 0,
        monthlyPayment: initialMonthlyPayment || 0,
        firstPaymentDate: new Date(),
        creditType,
      })
      customForm.reset({
        amount: initialAmount || 0,
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
      setStandardResult(null)
      setCustomResult(null)
      setProposedResult(null)
      setShowResults(false)
    }
  }, [isOpen, initialAmount, initialMonthlyPayment, creditType])

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
        amount: data.totalAmount, // Montant emprunté
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

  const handleUseSimulation = () => {
    const result = simulationType === 'standard' ? standardResult : simulationType === 'custom' ? customResult : proposedResult
    if (result && onSimulationComplete) {
      onSimulationComplete(result)
    }
    onClose()
  }

  const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity
  const creditTypeLabel = creditType === 'SPECIALE' ? 'Spéciale' : creditType === 'FIXE' ? 'Fixe' : 'Aide'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Simulation de crédit {creditTypeLabel}
          </DialogTitle>
          <DialogDescription>
            Calculez les conditions de remboursement pour ce crédit
          </DialogDescription>
        </DialogHeader>

        <Tabs value={simulationType} onValueChange={(v) => {
          setSimulationType(v as 'standard' | 'custom' | 'proposed')
          setShowResults(false)
          setStandardResult(null)
          setCustomResult(null)
          setProposedResult(null)
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="standard">Simulation standard</TabsTrigger>
            <TabsTrigger value="custom">Simulation personnalisée</TabsTrigger>
            <TabsTrigger value="proposed">Simulation proposée</TabsTrigger>
          </TabsList>

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
                    </div>

                    {creditType !== 'FIXE' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Limite de durée : {maxDuration} mois maximum pour un crédit {creditTypeLabel.toLowerCase()}
                        </AlertDescription>
                      </Alert>
                    )}

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
                onUse={handleUseSimulation}
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
                onUse={handleUseSimulation}
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
                    </div>

                    {creditType !== 'FIXE' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Limite de durée : {creditType === 'SPECIALE' ? 7 : 3} mois maximum pour un crédit {creditType === 'SPECIALE' ? 'spéciale' : 'aide'}
                        </AlertDescription>
                      </Alert>
                    )}

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
                onUse={handleUseSimulation}
                isProposed={true}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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
  // Pour chaque mois : solde + intérêts - paiement
  let remainingBalance = creditAmount
  payments.forEach((payment) => {
    // Ajouter les intérêts au solde
    const balanceWithInterest = remainingBalance * (1 + monthlyRate)
    // Soustraire le paiement
    remainingBalance = Math.max(0, balanceWithInterest - payment.amount)
  })
  // Arrondir le montant global restant
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

// Fonction d'arrondi personnalisée
// Si la partie décimale < 0.5, on garde l'entier
// Si la partie décimale >= 0.5, on arrondit à l'entier supérieur
function customRound(value: number): number {
  const decimal = value % 1
  if (decimal < 0.5) {
    return Math.floor(value)
  } else {
    return Math.ceil(value)
  }
}

// Composant pour afficher les résultats de simulation standard
function StandardSimulationResults({
  result,
  creditType,
  onUse,
  isProposed = false
}: {
  result: StandardSimulation
  creditType: CreditType
  onUse: () => void
  isProposed?: boolean
}) {
  const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity
  
  // Calculer l'échéancier
  const schedule: Array<{
    month: number
    date: Date
    payment: number
    interest: number
    principal: number
    remaining: number
  }> = []

  let remaining = result.amount
  // Taux mensuel (pas annuel divisé par 12)
  const monthlyRate = result.interestRate / 100
  const firstDate = new Date(result.firstPaymentDate)
  // Pour simulation proposée : utiliser la durée spécifiée
  // Pour simulation standard : calculer jusqu'à ce que le solde soit 0 (max 7 mois pour crédit spéciale)
  const maxIterations = isProposed ? result.duration : (creditType === 'SPECIALE' ? 7 : result.duration)

  for (let i = 0; i < maxIterations; i++) {
    const date = new Date(firstDate)
    date.setMonth(date.getMonth() + i)
    
    // Si le solde est déjà à 0, ne pas ajouter de ligne
    if (remaining <= 0) {
      break
    }
    
    // 1. Calcul des intérêts sur le solde actuel
    const interest = remaining * monthlyRate
    // 2. Montant global = reste dû + intérêts
    const balanceWithInterest = remaining + interest
    
    // 3. Versement effectué
    let payment: number
    
    if (result.monthlyPayment > balanceWithInterest) {
      // Si la mensualité prédéfinie est supérieure au montant global,
      // la mensualité affichée doit être le montant global (capital + intérêts)
      payment = balanceWithInterest
      remaining = 0
    } else if (remaining < result.monthlyPayment) {
      // Le reste dû est inférieur à la mensualité souhaitée
      // La mensualité affichée = reste dû (sans intérêts)
      payment = remaining
      remaining = 0
    } else {
      // Le reste dû est supérieur ou égal à la mensualité souhaitée
      payment = result.monthlyPayment
      // 4. Nouveau solde après versement
      remaining = Math.max(0, balanceWithInterest - payment)
    }

    schedule.push({
      month: i + 1,
      date,
      payment: customRound(payment), // Arrondir la mensualité selon la règle personnalisée
      interest: customRound(interest), // Arrondir les intérêts selon la règle personnalisée
      principal: customRound(balanceWithInterest), // Arrondir le montant global selon la règle personnalisée
      remaining: customRound(remaining), // Arrondir le reste dû selon la règle personnalisée
    })
  }
  
  // La durée réelle est le nombre de lignes dans l'échéancier (avec paiements non nuls)
  const displayDuration = schedule.length

  // Calculer les stats pour l'échéancier calculé
  const calculatedTotalAmount = schedule.reduce((sum, row) => sum + row.payment, 0)
  const calculatedAverageMonthly = schedule.length > 0 ? calculatedTotalAmount / schedule.length : 0

  // Calculer l'échéancier de référence pour obtenir ses stats (uniquement pour crédit spéciale)
  const calculateReferenceSchedule = () => {
    if (creditType !== 'SPECIALE' || maxDuration !== 7) return []
    
    const refFirstDate = new Date(result.firstPaymentDate)
    const monthlyRate = result.interestRate / 100
    
    // Calculer le montant global avec intérêts composés sur exactement 7 mois
    // lastMontant = montant initial
    // Pour i de 1 à 7 : lastMontant = lastMontant * taux + lastMontant
    // Le montant global est le montant du 7ème mois sans soustraction
    let lastMontant = result.amount
    for (let i = 1; i <= 7; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    // Le montant global après 7 mois d'intérêts composés
    const montantGlobal = lastMontant
    
    // Diviser ce montant global par 7 pour obtenir la mensualité
    const monthlyPaymentRaw = montantGlobal / 7
    
    // Arrondir : si décimal >= 0.5, arrondir à l'entier supérieur, sinon à l'entier inférieur
    // Exemple : 10003.5 -> 10004, 10003.4 -> 10003
    const monthlyPaymentRef = monthlyPaymentRaw % 1 >= 0.5 
      ? Math.ceil(monthlyPaymentRaw) 
      : Math.floor(monthlyPaymentRaw)
    
    // Générer l'échéancier avec cette mensualité (identique pour les 7 mois)
    const referenceSchedule: Array<{
      month: number
      date: Date
      payment: number
    }> = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(refFirstDate)
      date.setMonth(date.getMonth() + i)
      
      // Toutes les mensualités sont identiques (315 812 FCFA)
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
      })
    }
    return referenceSchedule
  }

  const referenceSchedule = calculateReferenceSchedule()
  
  // Calculer les stats pour l'échéancier référence
  const referenceTotalAmount = referenceSchedule.reduce((sum, row) => sum + row.payment, 0)
  const referenceAverageMonthly = referenceSchedule.length > 0 ? referenceTotalAmount / referenceSchedule.length : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Résultats de la simulation
          </CardTitle>
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
                    {customRound(calculatedAverageMonthly).toLocaleString('fr-FR')} FCFA
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
                  {result.suggestedMinimumAmount && (
                    <div className="mt-2">
                      <strong>Suggestion :</strong> Augmentez la mensualité à au moins{' '}
                      {Math.ceil(result.suggestedMinimumAmount / result.duration).toLocaleString('fr-FR')} FCFA
                      {' '}ou réduisez le montant à {result.suggestedMinimumAmount.toLocaleString('fr-FR')} FCFA
                    </div>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Tableaux comparatifs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tableau calculé */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Échéancier calculé ({displayDuration} mois)
            </h4>
            <div className="border rounded-lg overflow-hidden">
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
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Échéancier référence (7 mois)
              </h4>
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onUse}>
            Utiliser cette simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour afficher les résultats de simulation personnalisée
function CustomSimulationResults({
  result,
  creditType,
  onUse
}: {
  result: CustomSimulation
  creditType: CreditType
  onUse: () => void
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
  // Taux mensuel (pas annuel divisé par 12)
  const monthlyRate = result.interestRate / 100
  const firstDate = new Date(result.firstPaymentDate)

  result.monthlyPayments.forEach((payment, index) => {
    const date = new Date(firstDate)
    date.setMonth(date.getMonth() + index)
    
    // 1. Calcul des intérêts sur le solde actuel
    const interest = remaining * monthlyRate
    // 2. Nouveau solde avec intérêts
    const balanceWithInterest = remaining + interest
    // 3. Versement effectué
    const actualPayment = Math.min(payment.amount, balanceWithInterest)
    // 4. Nouveau solde après versement
    remaining = Math.max(0, balanceWithInterest - actualPayment)

    schedule.push({
      month: payment.month,
      date,
      payment: actualPayment,
      interest,
      principal: balanceWithInterest, // Capital = solde avec intérêts (avant versement)
      remaining,
    })
  })

  // Calculer l'échéancier référence (exactement maxDuration mois)
  // Même logique que dans la simulation standard
  const referenceSchedule: Array<{
    month: number
    date: Date
    payment: number
  }> = []

  if (maxDuration !== Infinity) {
    // Calculer le montant global avec intérêts composés sur exactement maxDuration mois
    // lastMontant = montant initial
    // Pour i de 1 à maxDuration : lastMontant = lastMontant * taux + lastMontant
    // Le montant global est le montant du dernier mois sans soustraction
    let lastMontant = result.amount
    for (let i = 1; i <= maxDuration; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    // Le montant global après maxDuration mois d'intérêts composés
    const montantGlobal = lastMontant
    
    // Diviser ce montant global par maxDuration pour obtenir la mensualité
    const monthlyPaymentRaw = montantGlobal / maxDuration
    
    // Arrondir : si décimal >= 0.5, arrondir à l'entier supérieur, sinon à l'entier inférieur
    // Exemple : 10003.5 -> 10004, 10003.4 -> 10003
    const monthlyPaymentRef = monthlyPaymentRaw % 1 >= 0.5 
      ? Math.ceil(monthlyPaymentRaw) 
      : Math.floor(monthlyPaymentRaw)
    
    // Générer l'échéancier avec cette mensualité (identique pour tous les mois)
    for (let i = 0; i < maxDuration; i++) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
      })
    }
  }

  // Calculer les stats pour l'échéancier calculé
  const calculatedTotalAmount = schedule.reduce((sum, row) => sum + row.payment, 0)
  const calculatedAverageMonthly = schedule.length > 0 ? calculatedTotalAmount / schedule.length : 0
  
  // Calculer les stats pour l'échéancier référence
  const referenceTotalAmount = referenceSchedule.reduce((sum, row) => sum + row.payment, 0)
  const referenceAverageMonthly = referenceSchedule.length > 0 ? referenceTotalAmount / referenceSchedule.length : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Résultats de la simulation
          </CardTitle>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tableau personnalisé */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Échéancier personnalisé
            </h4>
            <div className="border rounded-lg overflow-hidden">
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
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Échéancier référence ({maxDuration} mois)
              </h4>
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onUse}>
            Utiliser cette simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

