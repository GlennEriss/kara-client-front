'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  Calculator,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreditDemand, CreditDemandStatus } from '@/types/types'
import routes from '@/constantes/routes'
import ValidateDemandModal from './ValidateDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import CreditSimulationModal from './CreditSimulationModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCreditContractMutations, useCreditContract } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import type { StandardSimulation, CustomSimulation, CreditContract } from '@/types/types'
import ContractCreationModal from './ContractCreationModal'
import EditCreditDemandModal from './EditCreditDemandModal'
import DeleteCreditDemandModal from './DeleteCreditDemandModal'
import Image from 'next/image'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Percent, Users, Phone, ExternalLink } from 'lucide-react'
import MemberActivitySummary from './MemberActivitySummary'
import { useMember } from '@/hooks/useMembers'
import { calculateSchedule as calculateScheduleUtil, customRound } from '@/utils/credit-speciale-calculations'

interface CreditDemandDetailProps {
  demand: CreditDemand
}

const getStatusConfig = (status: CreditDemandStatus) => {
  const configs: Record<CreditDemandStatus, { label: string; color: string; bgColor: string }> = {
    PENDING: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    APPROVED: { label: 'Approuvée', color: 'text-green-600', bgColor: 'bg-green-100' },
    REJECTED: { label: 'Rejetée', color: 'text-red-600', bgColor: 'bg-red-100' },
  }
  return configs[status] || configs.PENDING
}

const getCreditTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    SPECIALE: 'Spéciale',
    FIXE: 'Fixe',
    AIDE: 'Aide',
  }
  return labels[type] || type
}

export default function CreditDemandDetail({ demand }: CreditDemandDetailProps) {
  const router = useRouter()
  const [validateModalState, setValidateModalState] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    action: 'approve',
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
  }>({
    isOpen: false,
  })
  const [simulationModalState, setSimulationModalState] = useState<{
    isOpen: boolean
  }>({
    isOpen: false,
  })
  const [contractCreationState, setContractCreationState] = useState<{
    isOpen: boolean
    simulation: StandardSimulation | CustomSimulation | null
  }>({
    isOpen: false,
    simulation: null,
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { createFromDemand } = useCreditContractMutations()
  
  // Récupérer le contrat si il existe
  const { data: contract, isLoading: isLoadingContract } = useCreditContract(demand.contractId || '')
  
  // Récupérer les contacts du garant (membre) pour affichage
  const { data: guarantorMember } = useMember(demand.guarantorId)

  const statusConfig = getStatusConfig(demand.status)
  const formatDate = (date: Date | undefined | null | any) => {
    if (!date) return 'N/A'
    try {
      // Handle Firestore Timestamps
      if (date && typeof date.toDate === 'function') {
        const dateObj = date.toDate()
        if (isNaN(dateObj.getTime())) {
          return 'Date invalide'
        }
        return format(dateObj, 'dd MMMM yyyy', { locale: fr })
      }
      // Handle Date objects or date strings/numbers
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) {
        return 'Date invalide'
      }
      return format(dateObj, 'dd MMMM yyyy', { locale: fr })
    } catch (error) {
      console.error('Error formatting date:', error, date)
      return 'Date invalide'
    }
  }

  // Calculer l'échéancier à partir du contrat
  const calculateSchedule = (contract: CreditContract, duration?: number, monthlyPayment?: number) => {
    return calculateScheduleUtil({
      amount: contract.amount,
      interestRate: contract.interestRate,
      monthlyPayment: monthlyPayment || contract.monthlyPaymentAmount,
      firstPaymentDate: new Date(contract.firstPaymentDate),
      maxDuration: duration || contract.duration,
    })
  }

  // Calculer l'échéancier de référence (même logique que dans CreditSimulationModal)
  const calculateReferenceScheduleWithoutInterest = (contract: CreditContract) => {
    const firstDate = new Date(contract.firstPaymentDate)
    const monthlyRate = contract.interestRate / 100

    // Calculer le montant global avec intérêts composés sur exactement 7 mois (même logique que dans CreditSimulationModal)
    let lastMontant = contract.amount
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
    const items: Array<{
      month: number
      date: Date
      payment: number
      interest: number
      principal: number
      remaining: number
    }> = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)

      items.push({
        month: i + 1,
        date,
        payment: customRound(monthlyPaymentRef),
        interest: 0, // Pas d'intérêts affichés dans l'échéancier référence
        principal: 0, // Pas de montant global affiché dans l'échéancier référence
        remaining: 0, // Pas de reste dû affiché dans l'échéancier référence
      })
    }

    return items
  }

  // Calculer la mensualité optimale pour 7 mois (recherche binaire)
  const calculateOptimalMonthlyPaymentFor7Months = (contract: CreditContract): number => {
    const monthlyRate = contract.interestRate / 100
    const amount = contract.amount
    
    let minPayment = Math.ceil(amount / 7)
    let maxPayment = amount * 2
    let optimalPayment = maxPayment

    for (let iteration = 0; iteration < 50; iteration++) {
      const testPayment = Math.ceil((minPayment + maxPayment) / 2)
      let testRemaining = amount
      
      for (let month = 0; month < 7; month++) {
        const interest = testRemaining * monthlyRate
        const balanceWithInterest = testRemaining + interest
        // testPayment représente le capital, le montant total à payer = capital + intérêts
        const totalPaymentAmount = testPayment + interest
        const payment = Math.min(totalPaymentAmount, balanceWithInterest)
        testRemaining = balanceWithInterest - payment
        
        if (testRemaining < 1) {
          testRemaining = 0
        }
      }
      
      if (testRemaining <= 0) {
        optimalPayment = testPayment
        maxPayment = testPayment - 1
      } else {
        minPayment = testPayment + 1
      }
      
      if (minPayment > maxPayment) break
    }

    return optimalPayment
  }

  // Calculer le tableau de rémunération du parrain
  const calculateGuarantorRemunerationSchedule = (contract: CreditContract) => {
    if (!contract.guarantorIsParrain || !contract.guarantorRemunerationPercentage) return []
    
    const schedule = calculateSchedule(contract)
    const percentage = contract.guarantorRemunerationPercentage
    
    // Limiter à 7 mois maximum
    const maxMonths = Math.min(7, schedule.length)
    
    return schedule.slice(0, maxMonths).map((item, index) => {
      // Pour le mois 1, le reste dû au début = montant emprunté
      // Pour les mois suivants, le reste dû au début = remaining du mois précédent
      let remainingAtStartOfMonth = 0;
      if (index === 0) {
        remainingAtStartOfMonth = contract.amount;
      } else {
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
        guarantorAmount: customRound(remainingAtStartOfMonth * percentage / 100), // Calcul sur le reste dû
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(routes.admin.creditSpecialeDemandes)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux demandes
          </Button>
          <Badge className={cn('px-4 py-1.5 text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations de la demande */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations de la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">ID de la demande</p>
                <p className="text-lg font-semibold font-mono">{demand.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de crédit</p>
                <p className="text-lg font-semibold">{getCreditTypeLabel(demand.creditType)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant demandé</p>
                <p className="text-lg font-semibold">{demand.amount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              {demand.monthlyPaymentAmount && (
                <div>
                  <p className="text-sm text-gray-600">Mensualité souhaitée</p>
                  <p className="text-lg font-semibold">{demand.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              )}
              {demand.desiredDate && (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date souhaitée du crédit
                  </p>
                  <p className="text-lg font-semibold">
                    {format(new Date(demand.desiredDate), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="text-lg font-semibold">{formatDate(demand.createdAt)}</p>
              </div>
              {demand.updatedAt && (
                <div>
                  <p className="text-sm text-gray-600">Dernière mise à jour</p>
                  <p className="text-lg font-semibold">{formatDate(demand.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="text-lg font-semibold">{demand.clientFirstName} {demand.clientLastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contacts</p>
                <p className="text-lg font-semibold">{demand.clientContacts.join(', ')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cause */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Motif de la demande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{demand.cause}</p>
          </CardContent>
        </Card>

        {/* Garant */}
        {demand.guarantorId && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informations garant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="text-lg font-semibold">
                  {demand.guarantorFirstName} {demand.guarantorLastName}
                </p>
              </div>
              {demand.guarantorRelation && (
                <div>
                  <p className="text-sm text-gray-600">Relation</p>
                  <p className="text-lg font-semibold">{demand.guarantorRelation}</p>
                </div>
              )}
              {guarantorMember?.contacts?.length ? (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Contacts
                  </p>
                  <p className="text-lg font-semibold">
                    {guarantorMember.contacts.join(', ')}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <Badge variant="outline" className="mt-1">
                  {demand.guarantorIsMember ? 'Membre' : 'Non-membre'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résumé des activités du demandeur */}
        {demand.clientId && (
          <MemberActivitySummary
            memberId={demand.clientId}
            memberName={`${demand.clientFirstName} ${demand.clientLastName}`}
            isGuarantor={false}
          />
        )}

        {/* Résumé des activités du garant */}
        {demand.guarantorId && demand.guarantorIsMember && (
          <MemberActivitySummary
            memberId={demand.guarantorId}
            memberName={`${demand.guarantorFirstName} ${demand.guarantorLastName}`}
            isGuarantor={true}
          />
        )}

        {/* Motif d'approbation ou de rejet */}
        {demand.adminComments && (
          <Card className={cn(
            "border-0 shadow-xl",
            demand.status === 'APPROVED' ? "bg-green-50/50 border-green-200" :
            demand.status === 'REJECTED' ? "bg-red-50/50 border-red-200" :
            "bg-gray-50/50"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {demand.status === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : demand.status === 'REJECTED' ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                {demand.status === 'APPROVED' ? 'Motif d\'approbation' : demand.status === 'REJECTED' ? 'Motif du rejet' : 'Commentaires'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{demand.adminComments}</p>
              {demand.updatedBy && (
                <p className="text-xs text-gray-500 mt-2">
                  Par l'administrateur • {formatDate(demand.updatedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Score (admin only) */}
        {demand.score !== undefined && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Score de fiabilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge className={cn(
                  "text-2xl font-bold px-6 py-3",
                  demand.score >= 8 ? "bg-green-100 text-green-700" :
                  demand.score >= 5 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {demand.score}/10
                </Badge>
                {demand.scoreUpdatedAt && (
                  <p className="text-sm text-gray-500">
                    Mis à jour le {formatDate(demand.scoreUpdatedAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dérogation */}
        {demand.eligibilityOverride && (
          <Card className="border-0 shadow-xl border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Dérogation appliquée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Justification</p>
                <p className="text-gray-700">{demand.eligibilityOverride.justification}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <span>Par: {demand.eligibilityOverride.adminName}</span>
                  <span>Le: {formatDate(demand.eligibilityOverride.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {demand.status === 'PENDING' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  className="border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier la demande
                </Button>
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'approve' })}
                  className="flex-1 min-w-[160px] bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver la demande
                </Button>
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'reject' })}
                  variant="destructive"
                  className="flex-1 min-w-[160px] bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter la demande
                </Button>
                <Button
                  onClick={() => setIsDeleteModalOpen(true)}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer la demande
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de modification */}
        <EditCreditDemandModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          demand={demand}
        />

        {/* Modal de suppression */}
        <DeleteCreditDemandModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          demand={demand}
          onSuccess={() => router.push(routes.admin.creditSpecialeDemandes)}
        />

        {/* Informations du contrat créé */}
        {demand.status === 'APPROVED' && demand.contractId && (
          isLoadingContract ? (
            <Card className="border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Chargement des informations du contrat...</p>
              </CardContent>
            </Card>
          ) : contract && (
          <>
            {/* Badge et lien vers le contrat */}
            <Card className="border-0 shadow-xl border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-700 border border-green-300 px-4 py-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Contrat déjà créé
                    </Badge>
                    <span className="text-sm text-gray-600">ID: {contract.id}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/credit-speciale/contrats/${contract.id}`)}
                    className="flex items-center gap-2"
                  >
                    Voir le contrat
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tableaux de simulations */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Échéancier calculé ({contract.duration} mois)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                      {calculateSchedule(contract).map((row) => (
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
              </CardContent>
            </Card>

            {/* Échéancier référence (7 mois pour crédit spéciale) */}
            {contract.creditType === 'SPECIALE' && (
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Échéancier référence (7 mois)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mois</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Mensualité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculateReferenceScheduleWithoutInterest(contract).map((row) => (
                          <TableRow key={row.month}>
                            <TableCell className="font-medium">M{row.month}</TableCell>
                            <TableCell>{row.date.toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rémunération du parrain */}
            {contract.guarantorIsParrain && contract.guarantorRemunerationPercentage && (
              <Card className="border-0 shadow-xl border-purple-200 bg-purple-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Users className="h-5 w-5" />
                    Rémunération du parrain ({contract.guarantorRemunerationPercentage}%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Alert className="border-purple-200 bg-purple-100">
                      <Users className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800">
                        <strong>{contract.guarantorFirstName} {contract.guarantorLastName}</strong> est le parrain du client et recevra une rémunération de {contract.guarantorRemunerationPercentage}% du montant global (capital + intérêts) de chaque échéance, calculée sur maximum 7 mois.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mois</TableHead>
                          <TableHead>Date</TableHead>
                        <TableHead className="text-right">Reste dû</TableHead>
                        <TableHead className="text-right">Rémunération parrain ({contract.guarantorRemunerationPercentage}%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculateGuarantorRemunerationSchedule(contract).map((row) => (
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
                  <div className="mt-4 p-4 bg-purple-100 rounded-lg flex items-center justify-between">
                    <span className="font-medium text-purple-800">Total rémunération parrain:</span>
                    <span className="text-xl font-bold text-purple-600">
                      {calculateGuarantorRemunerationSchedule(contract).reduce(
                        (sum, item) => sum + item.guarantorAmount, 
                        0
                      ).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact d'urgence */}
            {contract.emergencyContact && (
              <Card className="border-0 shadow-xl border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Phone className="h-5 w-5" />
                    Contact d'urgence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Nom complet</p>
                    <p className="text-lg font-semibold">
                      {contract.emergencyContact.lastName} {contract.emergencyContact.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Téléphone principal</p>
                    <p className="text-lg font-semibold">{contract.emergencyContact.phone1}</p>
                  </div>
                  {contract.emergencyContact.phone2 && (
                    <div>
                      <p className="text-sm text-gray-600">Téléphone secondaire</p>
                      <p className="text-lg font-semibold">{contract.emergencyContact.phone2}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Lien de parenté</p>
                    <p className="text-lg font-semibold">{contract.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type de document</p>
                    <p className="text-lg font-semibold">{contract.emergencyContact.typeId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Numéro de document</p>
                    <p className="text-lg font-semibold">{contract.emergencyContact.idNumber}</p>
                  </div>
                  {contract.emergencyContact.documentPhotoUrl && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Photo du document</p>
                      <div className="relative w-full max-w-md border-2 border-blue-300 rounded-lg overflow-hidden bg-white">
                        <Image
                          src={contract.emergencyContact.documentPhotoUrl}
                          alt="Document d'identité du contact d'urgence"
                          width={600}
                          height={800}
                          className="w-full h-auto object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
          )
        )}

        {/* Action de création de contrat */}
        {demand.status === 'APPROVED' && !demand.contractId && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <Button
                onClick={() => setSimulationModalState({ isOpen: true })}
                disabled={createFromDemand.isPending}
                className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                {createFromDemand.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Créer le contrat
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action de réouverture */}
        {demand.status === 'REJECTED' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <Button
                onClick={() => setReopenModalState({ isOpen: true })}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réouvrir la demande
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de validation/rejet */}
      <ValidateDemandModal
        isOpen={validateModalState.isOpen}
        onClose={() => setValidateModalState({ isOpen: false, action: 'approve' })}
        demand={demand}
        action={validateModalState.action}
        onSuccess={() => {
          router.push(routes.admin.creditSpecialeDemandes)
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false })}
        demand={demand}
        onSuccess={() => {
          router.push(routes.admin.creditSpecialeDemandes)
        }}
      />

      {/* Modal de simulation */}
      <CreditSimulationModal
        isOpen={simulationModalState.isOpen}
        onClose={() => setSimulationModalState({ isOpen: false })}
        creditType={demand.creditType}
        initialAmount={demand.amount}
        initialMonthlyPayment={demand.monthlyPaymentAmount}
        onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
          // Fermer le modal de simulation et ouvrir le modal de création de contrat
          setSimulationModalState({ isOpen: false })
          setContractCreationState({
            isOpen: true,
            simulation,
          })
        }}
      />

      {/* Modal de création de contrat multi-étapes */}
      {contractCreationState.simulation && (
        <ContractCreationModal
          isOpen={contractCreationState.isOpen}
          onClose={() => setContractCreationState({ isOpen: false, simulation: null })}
          demand={demand}
          simulation={contractCreationState.simulation}
        />
      )}
    </div>
  )
}

