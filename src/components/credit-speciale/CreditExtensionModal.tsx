'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Loader2, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  DollarSign,
  Percent,
  Calendar,
  AlertTriangle,
  FileText,
  TrendingUp,
  Calculator,
  Info,
  XCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreditContract, StandardSimulation } from '@/types/types'
import { EmergencyContact } from '@/schemas/emergency-contact.schema'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import { 
  useCheckExtensionEligibility, 
  useCalculateExtensionAmounts,
  useExtendContract,
  useSimulations
} from '@/hooks/useCreditSpeciale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  standardSimulationSchema, 
  customSimulationSchema,
  proposedSimulationSchema,
  type StandardSimulationFormData,
  type CustomSimulationFormData,
  type ProposedSimulationFormData
} from '@/schemas/credit-speciale.schema'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calculateSchedule as calculateScheduleUtil, customRound } from '@/utils/credit-speciale-calculations'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CreditType } from '@/types/types'
import { X } from 'lucide-react'

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
        <Label>Paiements mensuels personnalisés</Label>
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
                      <X className="h-4 w-4" />
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

interface CreditExtensionModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
}

type Step = 'eligibility' | 'amount' | 'simulation' | 'emergency' | 'confirm'

// Note: customRound est importé depuis '@/utils/credit-speciale-calculations'

export default function CreditExtensionModal({
  isOpen,
  onClose,
  contract
}: CreditExtensionModalProps) {
  const router = useRouter()
  
  // Hooks pour l'extension
  const { data: eligibility, isLoading: isLoadingEligibility, refetch: refetchEligibility } = useCheckExtensionEligibility(contract.id)
  const { data: amounts, isLoading: isLoadingAmounts, refetch: refetchAmounts } = useCalculateExtensionAmounts(contract.id)
  const extendContractMutation = useExtendContract()
  const { calculateStandard, calculateCustom, calculateProposed } = useSimulations()
  
  const [currentStep, setCurrentStep] = useState<Step>('eligibility')
  const [additionalAmount, setAdditionalAmount] = useState<number>(0)
  const [cause, setCause] = useState<string>('')
  const [simulationType, setSimulationType] = useState<'standard' | 'custom' | 'proposed'>('standard')
  const [simulation, setSimulation] = useState<StandardSimulation | null>(null)
  const [customSimulation, setCustomSimulation] = useState<any>(null)
  const [emergencyContact, setEmergencyContact] = useState<Partial<EmergencyContact>>(contract.emergencyContact || {})
  const [desiredDate, setDesiredDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  
  // Formulaires de simulation (comme dans CreditSimulationModal)
  const standardForm = useForm<StandardSimulationFormData>({
    resolver: zodResolver(standardSimulationSchema),
    defaultValues: {
      amount: 0,
      interestRate: contract.interestRate,
      monthlyPayment: 0,
      firstPaymentDate: new Date(),
      creditType: contract.creditType,
    },
    mode: 'onChange',
  })

  const customForm = useForm<CustomSimulationFormData>({
    resolver: zodResolver(customSimulationSchema),
    defaultValues: {
      amount: 0,
      interestRate: contract.interestRate,
      monthlyPayments: [],
      firstPaymentDate: new Date(),
      creditType: contract.creditType,
    },
    mode: 'onChange',
  })

  const proposedForm = useForm<ProposedSimulationFormData>({
    resolver: zodResolver(proposedSimulationSchema),
    defaultValues: {
      totalAmount: 0,
      duration: contract.creditType === 'SPECIALE' ? 7 : contract.creditType === 'AIDE' ? 3 : 12,
      interestRate: contract.interestRate,
      firstPaymentDate: new Date(),
      creditType: contract.creditType,
    },
    mode: 'onChange',
  })
  
  // Calcul du nouveau capital
  const newCapital = useMemo(() => {
    if (!amounts) return 0
    return amounts.remainingDue + additionalAmount
  }, [amounts, additionalAmount])
  
  // Calcul de la mensualité suggérée pour 7 mois
  const suggestedMonthlyPayment = useMemo(() => {
    if (!newCapital || newCapital <= 0) return 0
    // Calcul simplifié : on estime le total avec intérêts et on divise par 7
    const maxDuration = contract.creditType === 'SPECIALE' ? 7 : contract.creditType === 'AIDE' ? 3 : 12
    const currentInterestRate = standardForm.watch('interestRate') || contract.interestRate
    const estimatedTotalInterest = newCapital * (currentInterestRate / 100) * maxDuration
    const estimatedTotal = newCapital + estimatedTotalInterest
    return Math.ceil(estimatedTotal / maxDuration)
  }, [newCapital, contract.creditType, contract.interestRate, standardForm])
  
  // Steps du workflow
  const steps: Step[] = ['eligibility', 'amount', 'simulation', 'emergency', 'confirm']
  const currentStepIndex = steps.indexOf(currentStep)
  const isLastStep = currentStepIndex === steps.length - 1
  const isFirstStep = currentStepIndex === 0

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('eligibility')
      setAdditionalAmount(0)
      setCause('')
      setSimulationType('standard')
      setSimulation(null)
      setCustomSimulation(null)
      setEmergencyContact(contract.emergencyContact || {})
      setDesiredDate(format(new Date(), 'yyyy-MM-dd'))
      refetchEligibility()
      refetchAmounts()
    }
  }, [isOpen, contract, refetchEligibility, refetchAmounts])

  // Mettre à jour les formulaires quand le nouveau capital change ou quand on arrive à l'étape simulation
  useEffect(() => {
    if (newCapital > 0 && currentStep === 'simulation') {
      standardForm.setValue('amount', newCapital)
      standardForm.setValue('interestRate', contract.interestRate)
      customForm.setValue('amount', newCapital)
      customForm.setValue('interestRate', contract.interestRate)
      proposedForm.setValue('totalAmount', newCapital)
      proposedForm.setValue('interestRate', contract.interestRate)
      proposedForm.setValue('duration', contract.creditType === 'SPECIALE' ? 7 : contract.creditType === 'AIDE' ? 3 : 12)
    }
  }, [newCapital, currentStep, contract.interestRate, contract.creditType])

  // Handlers pour les simulations (comme dans CreditSimulationModal)
  const onStandardSubmit = async (data: StandardSimulationFormData) => {
    try {
      const result = await calculateStandard.mutateAsync({
        amount: data.amount,
        interestRate: data.interestRate,
        monthlyPayment: data.monthlyPayment,
        firstPaymentDate: data.firstPaymentDate,
        creditType: data.creditType,
      })
      setSimulation(result)
      setSimulationType('standard')
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la simulation standard')
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
      setCustomSimulation(result)
      setSimulationType('custom')
      // Convertir CustomSimulation en StandardSimulation pour l'affichage
      setSimulation({
        amount: result.amount,
        interestRate: result.interestRate,
        monthlyPayment: result.monthlyPayments[0]?.amount || 0,
        firstPaymentDate: result.firstPaymentDate,
        duration: result.duration,
        totalAmount: result.totalAmount,
        isValid: result.isValid,
        creditType: contract.creditType,
      } as StandardSimulation)
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la simulation personnalisée')
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
      setSimulation(result)
      setSimulationType('proposed')
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la simulation proposée')
    }
  }

  // Calculer l'échéancier depuis la simulation
  const schedule = useMemo(() => {
    if (!simulation) return []
    
    const maxDuration = contract.creditType === 'SPECIALE' ? 7 : contract.creditType === 'AIDE' ? 3 : Infinity
    return calculateScheduleUtil({
      amount: simulation.amount,
      interestRate: simulation.interestRate,
      monthlyPayment: simulation.monthlyPayment,
      firstPaymentDate: new Date(simulation.firstPaymentDate),
      maxDuration: simulationType === 'proposed' ? simulation.duration : maxDuration,
    })
  }, [simulation, contract.creditType, simulationType])
  
  // Calculer la durée réelle de la simulation
  const actualDuration = schedule.length
  
  // Vérifier si la simulation est valide (respecte les limites)
  const maxDuration = contract.creditType === 'SPECIALE' ? 7 : contract.creditType === 'AIDE' ? 3 : 120
  const isSimulationValid = actualDuration <= maxDuration && simulation?.isValid !== false

  // Navigation entre les étapes
  const goToNextStep = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const goToPrevStep = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // Validation des étapes
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'eligibility':
        return eligibility?.eligible === true
      case 'amount':
        return additionalAmount > 0 && cause.length >= 10
      case 'simulation':
        return simulation !== null && isSimulationValid
      case 'emergency':
        return !!(emergencyContact.lastName && emergencyContact.phone1 && emergencyContact.relationship && emergencyContact.typeId && emergencyContact.idNumber)
      case 'confirm':
        return true
      default:
        return false
    }
  }

  // Soumission finale
  const handleSubmit = async () => {
    if (!simulation || !emergencyContact) return
    
    try {
      await extendContractMutation.mutateAsync({
        parentContractId: contract.id,
        additionalAmount,
        cause,
        simulationData: {
          interestRate: simulation.interestRate,
          monthlyPaymentAmount: simulation.monthlyPayment,
          duration: actualDuration,
          firstPaymentDate: new Date(simulation.firstPaymentDate),
          totalAmount: simulation.totalAmount,
        },
        emergencyContact: emergencyContact as EmergencyContact,
        desiredDate,
      })
      
      onClose()
      router.push(routes.admin.creditSpecialeContrats)
    } catch (error) {
      // L'erreur est déjà gérée par le hook
    }
  }

  // Mise à jour du contact d'urgence
  const handleEmergencyContactUpdate = (field: string, value: any) => {
    setEmergencyContact(prev => ({ ...prev, [field]: value }))
  }

  // Rendu des étapes
  const renderStep = () => {
    switch (currentStep) {
      case 'eligibility':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Vérification de l'éligibilité</h3>
              <p className="text-gray-600 text-sm">Nous vérifions si ce contrat peut bénéficier d'une augmentation</p>
            </div>

            {isLoadingEligibility ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
                <span className="ml-2">Vérification en cours...</span>
              </div>
            ) : eligibility?.eligible ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <p className="font-medium text-green-800">Ce contrat est éligible à une augmentation de crédit.</p>
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p>• Statut du contrat : <Badge variant="outline" className="bg-green-100">
                      {eligibility.currentContract?.status === 'ACTIVE' ? 'ACTIF' : 
                       eligibility.currentContract?.status === 'PARTIAL' ? 'PARTIEL' : 
                       eligibility.currentContract?.status || 'N/A'}
                    </Badge></p>
                    <p>• Paiements effectués : {eligibility.paymentsCount}</p>
                    <p>• Pénalités impayées : {eligibility.unpaidPenaltiesCount}</p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <p className="font-medium text-red-800">Ce contrat n'est pas éligible à une augmentation.</p>
                  <p className="mt-1 text-sm text-red-700">{eligibility?.reason}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Résumé du contrat actuel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contrat actuel
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID :</span>
                  <span className="ml-2 font-mono">{contract.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Client :</span>
                  <span className="ml-2 font-semibold">{contract.clientFirstName} {contract.clientLastName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Montant initial :</span>
                  <span className="ml-2 font-semibold text-blue-600">{contract.amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div>
                  <span className="text-gray-500">Taux d'intérêt :</span>
                  <span className="ml-2 font-semibold">{contract.interestRate}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Montant payé :</span>
                  <span className="ml-2 font-semibold text-green-600">{contract.amountPaid.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div>
                  <span className="text-gray-500">Mensualité :</span>
                  <span className="ml-2 font-semibold">{contract.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'amount':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Montant de l'augmentation</h3>
              <p className="text-gray-600 text-sm">Définissez le montant supplémentaire et la raison</p>
            </div>

            {isLoadingAmounts ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
                <span className="ml-2">Calcul des montants...</span>
              </div>
            ) : amounts && (
              <>
                {/* Récapitulatif des montants */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                      <Calculator className="h-4 w-4" />
                      Calcul automatique
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Montant initial du contrat :</span>
                      <span className="font-semibold text-blue-900">{amounts.originalAmount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total payé :</span>
                      <span className="font-semibold text-green-600">{amounts.totalPaid.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2">
                      <span className="text-blue-700 font-medium">Reste dû (capital + intérêts) :</span>
                      <span className="font-bold text-blue-900">{Math.round(amounts.remainingDue).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Formulaire */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="additionalAmount" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Montant supplémentaire demandé *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="additionalAmount"
                        type="number"
                        min={1000}
                        step={1000}
                        value={additionalAmount || ''}
                        onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                        placeholder="Ex: 500000"
                        className="pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="desiredDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date souhaitée
                    </Label>
                    <Input
                      id="desiredDate"
                      type="date"
                      value={desiredDate}
                      onChange={(e) => setDesiredDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cause" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Motif de l'augmentation * (min. 10 caractères)
                    </Label>
                    <Textarea
                      id="cause"
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      placeholder="Ex: Besoin de financement supplémentaire pour l'achat de marchandises..."
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">{cause.length}/10 caractères minimum</p>
                  </div>
                </div>

                {/* Nouveau capital */}
                {additionalAmount > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Nouveau capital total :
                        </span>
                        <span className="text-2xl font-bold text-green-900">
                          {Math.round(newCapital).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        = Reste dû ({Math.round(amounts.remainingDue).toLocaleString('fr-FR')}) + Montant supplémentaire ({additionalAmount.toLocaleString('fr-FR')})
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Alert className="border-yellow-200 bg-yellow-50">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-800">
                    <strong>Important :</strong> Une nouvelle simulation sera nécessaire à l'étape suivante pour déterminer la nouvelle mensualité adaptée au nouveau capital.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )

      case 'simulation':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Simulation du nouveau contrat</h3>
              <p className="text-gray-600 text-sm">Définissez la nouvelle mensualité pour le nouveau capital de <strong>{newCapital.toLocaleString('fr-FR')} FCFA</strong></p>
            </div>

            <Tabs value={simulationType} onValueChange={(v) => {
              setSimulationType(v as 'standard' | 'custom' | 'proposed')
              setSimulation(null)
              setCustomSimulation(null)
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="standard">Simulation standard</TabsTrigger>
                <TabsTrigger value="custom">Simulation personnalisée</TabsTrigger>
                <TabsTrigger value="proposed">Simulation proposée</TabsTrigger>
              </TabsList>

              {/* Simulation standard */}
              <TabsContent value="standard" className="space-y-6 mt-4">
                <Form {...standardForm}>
                  <form onSubmit={standardForm.handleSubmit(onStandardSubmit)} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Paramètres de la simulation</CardTitle>
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
                                    disabled
                                  />
                                </FormControl>
                                <FormDescription>Nouveau capital : {newCapital.toLocaleString('fr-FR')} FCFA</FormDescription>
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
                                    value={field.value === 0 ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === '' || value === null || value === undefined) {
                                        field.onChange(0)
                                      } else {
                                        const numValue = parseFloat(value)
                                        if (!isNaN(numValue)) {
                                          field.onChange(numValue)
                                        }
                                      }
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
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

                        {contract.creditType !== 'FIXE' && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Limite de durée : {maxDuration} mois maximum pour un crédit {contract.creditType.toLowerCase()}
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
                {simulation && simulationType === 'standard' && (
                  <div className="space-y-4">
                    {/* Validation */}
                    {!isSimulationValid && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <p className="font-medium">Simulation invalide</p>
                          <p className="text-sm">La durée ({actualDuration} mois) dépasse la limite maximale de {maxDuration} mois pour un crédit {contract.creditType}.</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {isSimulationValid && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Simulation valide : remboursement en <strong>{actualDuration} mois</strong> (limite : {maxDuration} mois)
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border-blue-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Capital</p>
                          <p className="text-lg font-bold text-blue-900">{simulation.amount.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Durée</p>
                          <p className="text-lg font-bold text-green-900">{actualDuration} mois</p>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Mensualité</p>
                          <p className="text-lg font-bold text-purple-900">{simulation.monthlyPayment.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-orange-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Total à rembourser</p>
                          <p className="text-lg font-bold text-orange-900">{Math.round(simulation.totalAmount).toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Échéancier */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Échéancier prévisionnel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Mois</TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs text-right">Mensualité (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Intérêts (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Reste dû (FCFA)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedule.map((item) => (
                                <TableRow key={item.month}>
                                  <TableCell className="text-xs font-medium">M{item.month}</TableCell>
                                  <TableCell className="text-xs">{format(item.date, 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{item.payment.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right text-gray-500">{item.interest.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right">{item.remaining.toLocaleString('fr-FR')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Simulation personnalisée */}
              <TabsContent value="custom" className="space-y-6 mt-4">
                <Form {...customForm}>
                  <form onSubmit={customForm.handleSubmit(onCustomSubmit)} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Paramètres de la simulation personnalisée</CardTitle>
                        <CardDescription>
                          Définissez des montants variables par mois pour le nouveau capital de {newCapital.toLocaleString('fr-FR')} FCFA
                        </CardDescription>
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
                                    disabled
                                  />
                                </FormControl>
                                <FormDescription>Nouveau capital : {newCapital.toLocaleString('fr-FR')} FCFA</FormDescription>
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
                                    value={field.value === 0 ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === '' || value === null || value === undefined) {
                                        field.onChange(0)
                                      } else {
                                        const numValue = parseFloat(value)
                                        if (!isNaN(numValue)) {
                                          field.onChange(numValue)
                                        }
                                      }
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
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

                        {/* Composant pour saisir les paiements personnalisés */}
                        <CustomPaymentsInput
                          form={customForm}
                          maxDuration={maxDuration}
                          creditType={contract.creditType}
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
                {simulation && simulationType === 'custom' && (
                  <div className="space-y-4">
                    {/* Validation */}
                    {!isSimulationValid && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <p className="font-medium">Simulation invalide</p>
                          <p className="text-sm">La durée ({actualDuration} mois) dépasse la limite maximale de {maxDuration} mois pour un crédit {contract.creditType}.</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {isSimulationValid && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Simulation valide : remboursement en <strong>{actualDuration} mois</strong> (limite : {maxDuration} mois)
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border-blue-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Capital</p>
                          <p className="text-lg font-bold text-blue-900">{simulation.amount.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Durée</p>
                          <p className="text-lg font-bold text-green-900">{actualDuration} mois</p>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Mensualité moyenne</p>
                          <p className="text-lg font-bold text-purple-900">{simulation.monthlyPayment.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-orange-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Total à rembourser</p>
                          <p className="text-lg font-bold text-orange-900">{Math.round(simulation.totalAmount).toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Échéancier */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Échéancier prévisionnel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Mois</TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs text-right">Mensualité (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Intérêts (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Reste dû (FCFA)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedule.map((item) => (
                                <TableRow key={item.month}>
                                  <TableCell className="text-xs font-medium">M{item.month}</TableCell>
                                  <TableCell className="text-xs">{format(item.date, 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{item.payment.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right text-gray-500">{item.interest.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right">{item.remaining.toLocaleString('fr-FR')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Simulation proposée */}
              <TabsContent value="proposed" className="space-y-6 mt-4">
                <Form {...proposedForm}>
                  <form onSubmit={proposedForm.handleSubmit(onProposedSubmit)} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Paramètres de la simulation proposée</CardTitle>
                        <CardDescription>
                          Le système calcule automatiquement la mensualité optimale pour rembourser en {maxDuration} mois maximum
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={proposedForm.control}
                            name="totalAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Montant total à rembourser (FCFA)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 500000"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    disabled
                                  />
                                </FormControl>
                                <FormDescription>Nouveau capital : {newCapital.toLocaleString('fr-FR')} FCFA</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={proposedForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée souhaitée (mois)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={maxDuration}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormDescription>Maximum {maxDuration} mois pour un crédit {contract.creditType.toLowerCase()}</FormDescription>
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
                                    placeholder="Ex: 5.5"
                                    value={field.value === 0 ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === '' || value === null || value === undefined) {
                                        field.onChange(0)
                                      } else {
                                        const numValue = parseFloat(value)
                                        if (!isNaN(numValue)) {
                                          field.onChange(numValue)
                                        }
                                      }
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
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
                {simulation && simulationType === 'proposed' && (
                  <div className="space-y-4">
                    {/* Validation */}
                    {!isSimulationValid && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <p className="font-medium">Simulation invalide</p>
                          <p className="text-sm">La durée ({actualDuration} mois) dépasse la limite maximale de {maxDuration} mois pour un crédit {contract.creditType}.</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {isSimulationValid && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Simulation valide : remboursement en <strong>{actualDuration} mois</strong> (limite : {maxDuration} mois)
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border-blue-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Capital</p>
                          <p className="text-lg font-bold text-blue-900">{simulation.amount.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Durée</p>
                          <p className="text-lg font-bold text-green-900">{actualDuration} mois</p>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Mensualité</p>
                          <p className="text-lg font-bold text-purple-900">{simulation.monthlyPayment.toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                      <Card className="border-orange-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-500">Total à rembourser</p>
                          <p className="text-lg font-bold text-orange-900">{Math.round(simulation.totalAmount).toLocaleString('fr-FR')} FCFA</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Échéancier */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Échéancier prévisionnel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Mois</TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs text-right">Mensualité (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Intérêts (FCFA)</TableHead>
                                <TableHead className="text-xs text-right">Reste dû (FCFA)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedule.map((item) => (
                                <TableRow key={item.month}>
                                  <TableCell className="text-xs font-medium">M{item.month}</TableCell>
                                  <TableCell className="text-xs">{format(item.date, 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{item.payment.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right text-gray-500">{item.interest.toLocaleString('fr-FR')}</TableCell>
                                  <TableCell className="text-xs text-right">{item.remaining.toLocaleString('fr-FR')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )

      case 'emergency':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Contact d'urgence</h3>
              <p className="text-gray-600 text-sm">Vérifiez ou modifiez les informations du contact d'urgence</p>
            </div>

            <EmergencyContactMemberSelector
              memberId={emergencyContact.memberId}
              lastName={emergencyContact.lastName || ''}
              firstName={emergencyContact.firstName || ''}
              phone1={emergencyContact.phone1 || ''}
              phone2={emergencyContact.phone2 || ''}
              relationship={emergencyContact.relationship || 'Autre'}
              idNumber={emergencyContact.idNumber || ''}
              typeId={emergencyContact.typeId || ''}
              documentPhotoUrl={emergencyContact.documentPhotoUrl || ''}
              onUpdate={handleEmergencyContactUpdate}
              excludeMemberIds={[contract.clientId]}
            />
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Confirmation</h3>
              <p className="text-gray-600 text-sm">Vérifiez les informations avant de valider</p>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <p className="font-medium">Attention : Cette action est irréversible</p>
                <p className="text-sm mt-1">
                  Le contrat actuel ({contract.id}) passera en statut <Badge variant="outline">EXTENDED</Badge> et un nouveau contrat sera créé.
                </p>
              </AlertDescription>
            </Alert>

            {/* Récapitulatif */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Récapitulatif de l'augmentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Contrat initial</p>
                    <p className="font-mono text-xs">{contract.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-semibold">{contract.clientFirstName} {contract.clientLastName}</p>
                  </div>
                </div>

                <hr />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reste dû du contrat initial :</span>
                    <span className="font-semibold">{Math.round(amounts?.remainingDue || 0).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Montant supplémentaire :</span>
                    <span className="font-semibold text-blue-600">+ {additionalAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-700 font-medium">Nouveau capital :</span>
                    <span className="font-bold text-lg">{newCapital.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                <hr />

                {simulation && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nouvelle mensualité :</span>
                      <span className="font-semibold">{simulation.monthlyPayment.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Taux d'intérêt :</span>
                      <span className="font-semibold">{simulation.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Durée :</span>
                      <span className="font-semibold">{actualDuration} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total à rembourser :</span>
                      <span className="font-semibold">{Math.round(simulation.totalAmount).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date du 1er versement :</span>
                      <span className="font-semibold">{format(new Date(simulation.firstPaymentDate), 'dd MMMM yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                )}

                <hr />

                <div>
                  <p className="text-gray-500">Motif de l'augmentation :</p>
                  <p className="text-gray-800 mt-1">{cause}</p>
                </div>

                <div>
                  <p className="text-gray-500">Contact d'urgence :</p>
                  <p className="font-semibold">{emergencyContact.firstName} {emergencyContact.lastName}</p>
                  <p className="text-xs text-gray-600">{emergencyContact.phone1} • {emergencyContact.relationship}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  const stepLabels: Record<Step, string> = {
    eligibility: 'Éligibilité',
    amount: 'Montant',
    simulation: 'Simulation',
    emergency: 'Contact',
    confirm: 'Confirmation'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#234D65]">
            <TrendingUp className="h-5 w-5" />
            Augmentation de crédit
          </DialogTitle>
          <DialogDescription>
            Ajoutez un montant supplémentaire au contrat existant
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-[#234D65] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {index < currentStepIndex ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-500">{stepLabels[step]}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={isFirstStep ? onClose : goToPrevStep}
          >
            {isFirstStep ? (
              'Annuler'
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </>
            )}
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || extendContractMutation.isPending}
              className="bg-[#234D65] hover:bg-[#1a3a4d]"
            >
              {extendContractMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider l'augmentation
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="bg-[#234D65] hover:bg-[#1a3a4d]"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

