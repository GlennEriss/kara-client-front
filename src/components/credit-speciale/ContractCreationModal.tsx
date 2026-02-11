'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Loader2, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Users,
  DollarSign,
  Percent,
  Calendar,
  FileText
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreditDemand, StandardSimulation, CustomSimulation } from '@/types/types'
import { EmergencyContact } from '@/schemas/emergency-contact.schema'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'

interface ContractCreationModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CreditDemand
  simulation: StandardSimulation | CustomSimulation
}

type Step = 'summary' | 'guarantor' | 'emergency' | 'confirm'

// Fonction d'arrondi personnalisée
const customRound = (num: number): number => {
  const decimalPart = num - Math.floor(num)
  if (decimalPart >= 0.5) {
    return Math.ceil(num)
  } else {
    return Math.floor(num)
  }
}

export default function ContractCreationModal({
  isOpen,
  onClose,
  demand,
  simulation
}: ContractCreationModalProps) {
  const router = useRouter()
  const { createFromDemand } = useCreditContractMutations()
  
  const [currentStep, setCurrentStep] = useState<Step>('summary')
  const [emergencyContact, setEmergencyContact] = useState<Partial<EmergencyContact>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guarantorRemunerationPercentage, setGuarantorRemunerationPercentage] = useState<number>(2) // Par défaut 2% (peut aller jusqu'à 5%)

  // Déterminer si le garant est un membre (et donc peut recevoir une rémunération)
  const hasGuarantor = !!demand.guarantorId
  const guarantorIsMember = hasGuarantor && demand.guarantorIsMember

  // Calcul des étapes selon le contexte
  const steps = useMemo(() => {
    const baseSteps: Step[] = ['summary']
    if (guarantorIsMember) {
      baseSteps.push('guarantor')
    }
    baseSteps.push('emergency', 'confirm')
    return baseSteps
  }, [guarantorIsMember])

  const currentStepIndex = steps.indexOf(currentStep)
  const _isLastStep = currentStepIndex === steps.length - 1
  const isFirstStep = currentStepIndex === 0

  // Réinitialiser les étapes quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('summary')
      setEmergencyContact({})
      setGuarantorRemunerationPercentage(2) // Réinitialiser à 2% par défaut (peut aller jusqu'à 5%)
    }
  }, [isOpen])

  // Calculer l'échéancier pour l'affichage (utilise l'échéancier réel pour simulation personnalisée)
  const schedule = useMemo(() => {
    const result = simulation
    const monthlyRate = result.interestRate / 100
    const firstDate = new Date(result.firstPaymentDate)
    const isCustom = 'monthlyPayments' in result && result.monthlyPayments?.length > 0

    let remaining = result.amount
    const items: Array<{
      month: number
      date: Date
      payment: number
      interest: number
      principal: number
      remaining: number
    }> = []

    for (let i = 0; i < result.duration; i++) {
      if (remaining <= 0) break

      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      const monthNum = i + 1

      // 1. Calcul des intérêts sur le solde actuel
      const interest = remaining * monthlyRate
      const balanceWithInterest = remaining + interest

      let payment: number
      if (isCustom) {
        // Simulation personnalisée : utiliser le montant prévu pour ce mois
        const planned = result.monthlyPayments.find((p) => p.month === monthNum) ?? result.monthlyPayments[i]
        payment = planned?.amount ?? 0
        if (payment >= balanceWithInterest) {
          payment = balanceWithInterest
          remaining = 0
        } else {
          remaining = Math.max(0, customRound(balanceWithInterest - payment))
        }
      } else {
        // Simulation standard ou proposée : une seule mensualité
        const monthlyPayment = 'monthlyPayment' in result ? result.monthlyPayment : 0
        if (monthlyPayment > balanceWithInterest) {
          payment = balanceWithInterest
          remaining = 0
        } else if (remaining < monthlyPayment) {
          payment = remaining
          remaining = 0
        } else {
          payment = monthlyPayment
          remaining = Math.max(0, balanceWithInterest - payment)
        }
      }

      items.push({
        month: monthNum,
        date,
        payment: customRound(payment),
        interest: customRound(interest),
        principal: customRound(balanceWithInterest),
        remaining: customRound(remaining),
      })
    }

    return items
  }, [simulation])

  // Calculer l'échéancier référence (pour crédit spéciale uniquement, 7 mois)
  const referenceSchedule = useMemo(() => {
    if (demand.creditType !== 'SPECIALE') return []
    
    const result = simulation
    const monthlyRate = result.interestRate / 100
    const firstDate = new Date(result.firstPaymentDate)
    
    // Calculer le montant global avec intérêts composés sur exactement 7 mois
    let lastMontant = result.amount
    for (let i = 1; i <= 7; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    // Le montant global après 7 mois d'intérêts composés
    const montantGlobal = lastMontant
    
    // Diviser ce montant global par 7 pour obtenir la mensualité
    const monthlyPaymentRaw = montantGlobal / 7
    
    // Arrondir : si décimal >= 0.5, arrondir à l'entier supérieur, sinon à l'entier inférieur
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
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
      })
    }
    return referenceSchedule
  }, [simulation, demand.creditType])

  // Calculer le tableau de rémunération du garant (pourcentage du reste dû, limité à 7 mois)
  const guarantorRemunerationSchedule = useMemo(() => {
    if (!guarantorIsMember) return []
    
    // Limiter à 7 mois maximum
    const maxMonths = Math.min(7, schedule.length)
    
    return schedule.slice(0, maxMonths).map((item, index) => {
      // Pour le mois 1, le reste dû au début = montant emprunté
      // Pour les mois suivants, le reste dû au début = remaining du mois précédent
      let remainingAtStartOfMonth = 0;
      if (index === 0) {
        // Mois 1 : utiliser le montant emprunté depuis la simulation
        remainingAtStartOfMonth = simulation.amount;
      } else {
        // Mois > 1 : utiliser le remaining du mois précédent
        const previousItem = schedule[index - 1];
        if (previousItem) {
          remainingAtStartOfMonth = previousItem.remaining;
        }
      }
      
      return {
        month: item.month,
        date: item.date,
        monthlyPayment: item.payment,
        remainingAtStart: remainingAtStartOfMonth, // Reste dû au début du mois
        guarantorAmount: customRound(remainingAtStartOfMonth * guarantorRemunerationPercentage / 100),
      }
    })
  }, [schedule, guarantorIsMember, guarantorRemunerationPercentage, simulation.amount])

  const totalGuarantorRemuneration = guarantorRemunerationSchedule.reduce(
    (sum, item) => sum + item.guarantorAmount, 
    0
  )

  // Validation du contact d'urgence
  const isEmergencyContactValid = useMemo(() => {
    return (
      emergencyContact.lastName?.trim() &&
      emergencyContact.phone1?.trim() &&
      emergencyContact.relationship?.trim() &&
      emergencyContact.typeId?.trim() &&
      emergencyContact.idNumber?.trim() &&
      emergencyContact.documentPhotoUrl?.trim()
    )
  }, [emergencyContact])

  // Gérer la mise à jour du contact d'urgence
  const handleEmergencyContactUpdate = (field: string, value: any) => {
    setEmergencyContact(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Navigation entre étapes
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])
    }
  }

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  // Créer le contrat
  const handleCreateContract = async () => {
    if (!isEmergencyContactValid) {
      toast.error('Veuillez remplir tous les champs du contact d\'urgence')
      return
    }

    try {
      setIsSubmitting(true)

      const isCustom = 'monthlyPayments' in simulation && simulation.monthlyPayments?.length > 0
      const simulationData = {
        amount: simulation.amount,
        interestRate: simulation.interestRate,
        monthlyPaymentAmount: 'monthlyPayment' in simulation 
          ? simulation.monthlyPayment 
          : isCustom 
            ? simulation.monthlyPayments[0].amount 
            : simulation.amount / simulation.duration,
        duration: simulation.duration,
        firstPaymentDate: simulation.firstPaymentDate,
        totalAmount: simulation.totalAmount,
        ...(isCustom ? { customSchedule: simulation.monthlyPayments } : {}),
        emergencyContact: emergencyContact as EmergencyContact,
        guarantorRemunerationPercentage: guarantorIsMember ? guarantorRemunerationPercentage : 0,
      }

      await createFromDemand.mutateAsync({
        demandId: demand.id,
        simulationData,
      })

      toast.success('Contrat créé avec succès')
      // Attendre un peu pour que les queries soient invalidées
      await new Promise(resolve => setTimeout(resolve, 500))
      onClose()
      // Rediriger vers les contrats ou rester sur la page des demandes
      router.push(routes.admin.creditSpecialeContrats)
    } catch (error: any) {
      console.error('Erreur lors de la création du contrat:', error)
      toast.error(error?.message || 'Erreur lors de la création du contrat')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier si on peut passer à l'étape suivante
  const canProceed = () => {
    switch (currentStep) {
      case 'summary':
        return true
      case 'guarantor':
        // Valider que le pourcentage est entre 0 et 2
        return guarantorRemunerationPercentage >= 0 && guarantorRemunerationPercentage <= 5
      case 'emergency':
        return isEmergencyContactValid
      case 'confirm':
        return isEmergencyContactValid
      default:
        return false
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
            index < currentStepIndex 
              ? 'bg-green-500 text-white' 
              : index === currentStepIndex 
                ? 'bg-[#234D65] text-white' 
                : 'bg-gray-200 text-gray-500'
          }`}>
            {index < currentStepIndex ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-1 rounded ${
              index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Récapitulatif de la simulation</h3>
              <p className="text-gray-600 text-sm">Vérifiez les détails avant de continuer</p>
            </div>

            {/* Infos client */}
            <Card className="border-[#234D65]/20">
              <CardHeader className="py-3 bg-[#234D65]/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nom complet:</span>
                    <span className="ml-2 font-medium">{demand.clientFirstName} {demand.clientLastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type de crédit:</span>
                    <span className="ml-2">
                      <Badge variant="outline">{demand.creditType}</Badge>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Résumé simulation */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="py-3 bg-green-100/50">
                <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                  <DollarSign className="w-4 h-4" />
                  Simulation validée
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-gray-500">Montant</p>
                    <p className="font-bold text-lg">{simulation.amount.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-gray-500">Mensualité</p>
                    <p className="font-bold text-lg">
                      {'monthlyPayment' in simulation 
                        ? simulation.monthlyPayment.toLocaleString('fr-FR') 
                        : simulation.monthlyPayments[0]?.amount.toLocaleString('fr-FR') || '-'} FCFA
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-gray-500">Durée</p>
                    <p className="font-bold text-lg">{simulation.duration} mois</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-gray-500">Total à rembourser</p>
                    <p className="font-bold text-lg">{customRound(simulation.totalAmount).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Échéancier calculé */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3 text-sm">Échéancier calculé ({schedule.filter(row => row.payment > 0).length} mois)</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Mensualité</TableHead>
                        <TableHead className="text-right">Intérêts</TableHead>
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
                          <TableCell className="text-right">{row.remaining.toLocaleString('fr-FR')} FCFA</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Échéancier référence (pour crédit spéciale uniquement) */}
              {demand.creditType === 'SPECIALE' && referenceSchedule.length > 0 && (
                <div className="lg:max-w-md">
                  <h4 className="font-semibold mb-3 text-sm">Échéancier référence (7 mois)</h4>
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

            {/* Info garant si présent */}
            {hasGuarantor && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="py-3 bg-blue-100/50">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                    <Users className="w-4 h-4" />
                    Garant
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{demand.guarantorFirstName} {demand.guarantorLastName}</p>
                      <p className="text-sm text-gray-500">{demand.guarantorRelation}</p>
                    </div>
                    {guarantorIsMember && (
                      <Badge className="bg-purple-500">Membre - Éligible rémunération</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'guarantor':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Rémunération du garant</h3>
              <p className="text-gray-600 text-sm">Le garant membre gagne un pourcentage du reste dû (capital restant au début de chaque échéance) (0% à 5%, calculé sur maximum 7 mois)</p>
            </div>

            <Alert className="border-purple-200 bg-purple-50">
              <Users className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>{demand.guarantorFirstName} {demand.guarantorLastName}</strong> est un membre de la mutuelle et recevra une rémunération sur chaque échéance (calculée sur le reste dû, maximum 7 mois).
              </AlertDescription>
            </Alert>

            {/* Champ de saisie du pourcentage */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="py-4">
                <div className="space-y-2">
                  <Label htmlFor="remunerationPercentage" className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Pourcentage de rémunération (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="remunerationPercentage"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={guarantorRemunerationPercentage}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        if (!isNaN(value)) {
                          // Limiter entre 0 et 5
                          const clampedValue = Math.max(0, Math.min(5, value))
                          setGuarantorRemunerationPercentage(clampedValue)
                        } else if (e.target.value === '') {
                          setGuarantorRemunerationPercentage(0)
                        }
                      }}
                      className="w-32 border-purple-300 focus:border-purple-500 focus:ring-purple-500/20"
                      placeholder="2.0"
                    />
                    <span className="text-sm text-gray-600">% (entre 0% et 5%)</span>
                  </div>
                  {(guarantorRemunerationPercentage < 0 || guarantorRemunerationPercentage > 5) && (
                    <p className="text-sm text-red-600">
                      Le pourcentage doit être compris entre 0% et 5%
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tableau de rémunération */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Tableau de rémunération ({guarantorRemunerationPercentage}% du reste dû, max 7 mois)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Reste dû</TableHead>
                        <TableHead className="text-right">Rémunération parrain ({guarantorRemunerationPercentage}%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guarantorRemunerationSchedule.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">M{row.month}</TableCell>
                          <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="text-right">{row.remainingAtStart.toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">
                            {row.guarantorAmount.toLocaleString('fr-FR')} FCFA
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <div className="p-4 bg-purple-100 rounded-lg flex items-center justify-between">
              <span className="font-medium text-purple-800">Total rémunération parrain:</span>
              <span className="text-xl font-bold text-purple-600">
                {totalGuarantorRemuneration.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        )

      case 'emergency':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Contact d'urgence</h3>
              <p className="text-gray-600 text-sm">Renseignez une personne à contacter en cas d'urgence</p>
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
              excludeMemberIds={demand.clientId ? [demand.clientId] : []}
            />
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-[#234D65]">Confirmation</h3>
              <p className="text-gray-600 text-sm">Vérifiez les informations avant de créer le contrat</p>
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Toutes les informations sont complètes. Vous pouvez créer le contrat.
              </AlertDescription>
            </Alert>

            {/* Récapitulatif final */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200">
                <CardHeader className="py-2 bg-gray-50">
                  <CardTitle className="text-sm">Client</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p className="font-medium">{demand.clientFirstName} {demand.clientLastName}</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="py-2 bg-gray-50">
                  <CardTitle className="text-sm">Montant & Durée</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p>{simulation.amount.toLocaleString('fr-FR')} FCFA sur {simulation.duration} mois</p>
                </CardContent>
              </Card>

              {hasGuarantor && (
                <Card className="border-gray-200">
                  <CardHeader className="py-2 bg-gray-50">
                    <CardTitle className="text-sm">Garant</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 text-sm">
                    <p className="font-medium">{demand.guarantorFirstName} {demand.guarantorLastName}</p>
                    {guarantorIsMember && (
                      <Badge className="mt-1 bg-purple-500">
                        Membre - {guarantorRemunerationPercentage}%
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-gray-200">
                <CardHeader className="py-2 bg-gray-50">
                  <CardTitle className="text-sm">Contact d'urgence</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p className="font-medium">{emergencyContact.lastName} {emergencyContact.firstName}</p>
                  <p className="text-gray-500">{emergencyContact.phone1}</p>
                  <p className="text-gray-500">{emergencyContact.relationship}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'summary':
        return 'Étape 1 - Récapitulatif'
      case 'guarantor':
        return 'Étape 2 - Rémunération parrain'
      case 'emergency':
        return guarantorIsMember ? 'Étape 3 - Contact d\'urgence' : 'Étape 2 - Contact d\'urgence'
      case 'confirm':
        return 'Confirmation finale'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#234D65] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Création du contrat de crédit spéciale
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={isFirstStep ? onClose : goToPreviousStep}
            disabled={isSubmitting}
          >
            {isFirstStep ? (
              'Annuler'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </>
            )}
          </Button>

          {currentStep === 'confirm' ? (
            <Button
              onClick={handleCreateContract}
              disabled={isSubmitting || !canProceed()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Créer le contrat
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="bg-[#234D65] hover:bg-[#1a3a4c]"
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

