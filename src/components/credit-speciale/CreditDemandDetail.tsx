'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import routes from '@/constantes/routes'
import CreditFixeSimulationModal from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationModal'
import { useCreditContract, useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import type { CreditContract, CustomSimulation, StandardSimulation } from '@/types/types'
import { CreditDemand, CreditDemandStatus } from '@/types/types'
import { calculateSchedule as calculateScheduleUtil, customRound } from '@/utils/credit-speciale-calculations'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    AlertCircle,
    ArrowLeft,
    Calculator,
    Calendar,
    CheckCircle,
    Edit,
    ExternalLink,
    FileText,
    Loader2,
    Phone,
    RotateCcw,
    Shield,
    Trash2,
    User,
    Users,
    XCircle
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ContractCreationModal from './ContractCreationModal'
import CreditSimulationModal from './CreditSimulationModal'
import DeleteCreditDemandModal from './DeleteCreditDemandModal'
import EditCreditDemandModal from './EditCreditDemandModal'
import MemberActivitySummary from './MemberActivitySummary'
import ReopenDemandModal from './ReopenDemandModal'
import ValidateDemandModal from './ValidateDemandModal'

interface CreditDemandDetailProps {
  demand: CreditDemand
  listPath?: string
  contractDetailsBasePath?: string
  contractListPath?: string
  lockCreditType?: boolean
}

const getCreditTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    SPECIALE: 'Spéciale',
    FIXE: 'Fixe',
    AIDE: 'Aide',
  }
  return labels[type] || type
}

const getStatusLabel = (status: CreditDemandStatus) => {
  const labels: Record<CreditDemandStatus, string> = {
    PENDING: 'En attente',
    APPROVED: 'Approuvée',
    REJECTED: 'Rejetée',
  }

  return labels[status] || status
}

const getStatusBadgeStyle = (status: CreditDemandStatus) => {
  const styles: Record<CreditDemandStatus, string> = {
    PENDING: 'border-amber-200/80 bg-amber-400/25 text-amber-50',
    APPROVED: 'border-emerald-200/80 bg-emerald-400/25 text-emerald-50',
    REJECTED: 'border-rose-200/80 bg-rose-400/25 text-rose-50',
  }

  return styles[status] || styles.PENDING
}

const getScoreBadgeStyle = (score: number) => {
  if (score >= 8) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (score >= 5) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

const formatAmount = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`

export default function CreditDemandDetail({
  demand,
  listPath = routes.admin.creditSpecialeDemandes,
  contractDetailsBasePath,
  contractListPath,
  lockCreditType = false,
}: CreditDemandDetailProps) {
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
  const contractListPathByType =
    demand.creditType === 'FIXE'
      ? routes.admin.creditFixeContrats
      : demand.creditType === 'AIDE'
        ? routes.admin.creditAideContrats
        : routes.admin.creditSpecialeContrats
  const resolvedContractDetailsBasePath = (
    contractDetailsBasePath
    || contractListPathByType
  ).replace(/\/$/, '')
  const resolvedContractListPath = contractListPath
    || contractListPathByType
  const clientFullName = `${demand.clientFirstName} ${demand.clientLastName}`.trim()
  const clientContacts = demand.clientContacts.length
    ? demand.clientContacts.join(' • ')
    : 'Non renseigné'
  const guarantorFullName = `${demand.guarantorFirstName || ''} ${demand.guarantorLastName || ''}`.trim()
  const guarantorContacts = guarantorMember?.contacts?.length
    ? guarantorMember.contacts.map((contact) => String(contact)).join(' • ')
    : 'Non renseigné'
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
  const statusLabel = getStatusLabel(demand.status)
  const statusBadgeStyle = getStatusBadgeStyle(demand.status)
  const coreCardClass = 'border border-slate-200/80 bg-white/95 shadow-sm'
  const infoBoxClass = 'rounded-xl border border-slate-200 bg-slate-50/80 p-3'
  const tableWrapperClass = 'overflow-x-auto rounded-xl border border-slate-200'

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

  const guarantorRemunerationSchedule = contract
    ? calculateGuarantorRemunerationSchedule(contract)
    : []
  const totalGuarantorRemuneration = guarantorRemunerationSchedule.reduce(
    (sum, item) => sum + item.guarantorAmount,
    0
  )
  const optimalMonthlyPaymentFor7Months = contract?.creditType === 'SPECIALE'
    ? calculateOptimalMonthlyPaymentFor7Months(contract)
    : null

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#224D62]/20 bg-gradient-to-br from-[#183a4e] via-[#224D62] to-[#2d6079] p-5 text-white shadow-xl md:p-7">
        <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.4),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.2),transparent_42%)]" />
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(135deg,#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(listPath)}
              className="h-10 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux demandes
            </Button>

            <Badge className={cn('border px-3 py-1 text-sm font-semibold backdrop-blur-sm', statusBadgeStyle)}>
              {statusLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/80">Demande Crédit Spéciale</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Détail de la demande</h1>
              <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <FileText className="h-4 w-4 shrink-0 text-white/80" />
                <span className="truncate font-mono text-xs text-white md:text-sm">#{demand.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Montant</p>
                <p className="mt-1 text-sm font-bold md:text-base">{formatAmount(demand.amount)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Type</p>
                <p className="mt-1 text-sm font-bold md:text-base">{getCreditTypeLabel(demand.creditType)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm sm:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Créée le</p>
                <p className="mt-1 text-sm font-bold md:text-base">{formatDate(demand.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className={coreCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#224D62]">
                <FileText className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de crédit</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{getCreditTypeLabel(demand.creditType)}</p>
                </div>
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Montant demandé</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{formatAmount(demand.amount)}</p>
                </div>
                {demand.creditType === 'SPECIALE' && demand.monthlyPaymentAmount && (
                  <div className={infoBoxClass}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensualité souhaitée</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatAmount(demand.monthlyPaymentAmount)}</p>
                  </div>
                )}
                {demand.desiredDate && (
                  <div className={infoBoxClass}>
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Date souhaitée
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {format(new Date(demand.desiredDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Créée le</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(demand.createdAt)}</p>
                </div>
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dernière modification</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(demand.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={coreCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#224D62]">
                <AlertCircle className="h-5 w-5" />
                Motifs et commentaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motif de la demande</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {demand.cause || 'Aucun motif renseigné.'}
                </p>
              </div>

              {demand.adminComments && (
                <div
                  className={cn(
                    'rounded-xl border p-4',
                    demand.status === 'APPROVED'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : demand.status === 'REJECTED'
                        ? 'border-rose-200 bg-rose-50/70'
                        : 'border-slate-200 bg-slate-50/80'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {demand.status === 'APPROVED'
                      ? 'Motif d’approbation'
                      : demand.status === 'REJECTED'
                        ? 'Motif de rejet'
                        : 'Commentaires administratifs'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{demand.adminComments}</p>
                  {demand.updatedBy && (
                    <p className="mt-2 text-xs text-slate-500">Par l’administrateur • {formatDate(demand.updatedAt)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {demand.status === 'APPROVED' && demand.contractId && (
            isLoadingContract ? (
              <Card className={coreCardClass}>
                <CardContent className="p-6 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#224D62]" />
                  <p className="text-sm text-slate-600">Chargement des informations du contrat...</p>
                </CardContent>
              </Card>
            ) : contract && (
              <>
                <Card className="border border-emerald-200 bg-emerald-50/70 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge className="border border-emerald-300 bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Contrat déjà créé
                      </Badge>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`${resolvedContractDetailsBasePath}/${contract.id}`)}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      >
                        Voir le contrat
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">ID contrat</p>
                        <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900">{contract.id}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mensualité contractuelle</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatAmount(contract.monthlyPaymentAmount)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Durée</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{contract.duration} mois</p>
                      </div>
                    </div>

                    {optimalMonthlyPaymentFor7Months && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Mensualité optimale (référence 7 mois)
                        </p>
                        <p className="mt-1 text-sm font-semibold text-blue-900">{formatAmount(optimalMonthlyPaymentFor7Months)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={coreCardClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-[#224D62]">
                      <Calculator className="h-5 w-5" />
                      Échéancier calculé ({contract.duration} mois)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={tableWrapperClass}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80">
                            <TableHead className="font-semibold">Mois</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="text-right font-semibold">Mensualité</TableHead>
                            <TableHead className="text-right font-semibold">Intérêts</TableHead>
                            <TableHead className="text-right font-semibold">Montant global</TableHead>
                            <TableHead className="text-right font-semibold">Reste dû</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculateSchedule(contract).map((row) => (
                            <TableRow key={row.month} className="hover:bg-slate-50/70">
                              <TableCell className="font-medium text-slate-800">M{row.month}</TableCell>
                              <TableCell className="text-slate-700">{row.date.toLocaleDateString('fr-FR')}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatAmount(row.payment)}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatAmount(row.interest)}</TableCell>
                              <TableCell className="text-right text-slate-700">{formatAmount(row.principal)}</TableCell>
                              <TableCell className="text-right font-semibold text-[#224D62]">{formatAmount(row.remaining)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {contract.creditType === 'SPECIALE' && (
                  <Card className={coreCardClass}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-[#224D62]">
                        <Calculator className="h-5 w-5" />
                        Échéancier de référence (7 mois)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={tableWrapperClass}>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80">
                              <TableHead className="font-semibold">Mois</TableHead>
                              <TableHead className="font-semibold">Date</TableHead>
                              <TableHead className="text-right font-semibold">Mensualité</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculateReferenceScheduleWithoutInterest(contract).map((row) => (
                              <TableRow key={row.month} className="hover:bg-slate-50/70">
                                <TableCell className="font-medium text-slate-800">M{row.month}</TableCell>
                                <TableCell className="text-slate-700">{row.date.toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell className="text-right font-semibold text-[#224D62]">{formatAmount(row.payment)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {contract.guarantorIsParrain && contract.guarantorRemunerationPercentage && (
                  <Card className="border border-purple-200 bg-purple-50/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-purple-800">
                        <Users className="h-5 w-5" />
                        Rémunération du parrain ({contract.guarantorRemunerationPercentage}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert className="border-purple-200 bg-purple-100">
                        <Users className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800">
                          <strong>{contract.guarantorFirstName} {contract.guarantorLastName}</strong> est le parrain du client. La rémunération est calculée sur le reste dû mensuel (maximum 7 mois).
                        </AlertDescription>
                      </Alert>

                      <div className={tableWrapperClass}>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-purple-100/80">
                              <TableHead className="font-semibold text-purple-900">Mois</TableHead>
                              <TableHead className="font-semibold text-purple-900">Date</TableHead>
                              <TableHead className="text-right font-semibold text-purple-900">Reste dû</TableHead>
                              <TableHead className="text-right font-semibold text-purple-900">
                                Rémunération ({contract.guarantorRemunerationPercentage}%)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {guarantorRemunerationSchedule.map((row) => (
                              <TableRow key={row.month} className="hover:bg-purple-50/70">
                                <TableCell className="font-medium text-slate-800">M{row.month}</TableCell>
                                <TableCell className="text-slate-700">{row.date.toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell className="text-right text-slate-700">{formatAmount(row.remainingAtStart)}</TableCell>
                                <TableCell className="text-right font-semibold text-purple-700">
                                  {formatAmount(row.guarantorAmount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-100/80 p-3">
                        <span className="text-sm font-semibold text-purple-800">Total rémunération parrain</span>
                        <span className="text-lg font-bold text-purple-700">{formatAmount(totalGuarantorRemuneration)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {contract.emergencyContact && (
                  <Card className="border border-blue-200 bg-blue-50/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Phone className="h-5 w-5" />
                        Contact d&apos;urgence du contrat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Nom complet</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {contract.emergencyContact.lastName} {contract.emergencyContact.firstName}
                          </p>
                        </div>
                        <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Téléphone principal</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{contract.emergencyContact.phone1}</p>
                        </div>
                        {contract.emergencyContact.phone2 && (
                          <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Téléphone secondaire</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{contract.emergencyContact.phone2}</p>
                          </div>
                        )}
                        <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Lien de parenté</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{contract.emergencyContact.relationship}</p>
                        </div>
                        <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Type de document</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{contract.emergencyContact.typeId}</p>
                        </div>
                        <div className="rounded-xl border border-blue-200 bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Numéro de document</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{contract.emergencyContact.idNumber}</p>
                        </div>
                      </div>

                      {contract.emergencyContact.documentPhotoUrl && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Photo du document</p>
                          <div className="relative w-full max-w-md overflow-hidden rounded-xl border-2 border-blue-300 bg-white">
                            <Image
                              src={contract.emergencyContact.documentPhotoUrl}
                              alt="Document d'identité du contact d'urgence"
                              width={600}
                              height={800}
                              className="h-auto w-full object-contain"
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
        </div>

        <div className="space-y-6">
          <Card className={coreCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#224D62]">
                <User className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={infoBoxClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom complet</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{clientFullName}</p>
              </div>
              <div className={infoBoxClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID membre</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">{demand.clientId || 'Non renseigné'}</p>
              </div>
              <div className={infoBoxClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{clientContacts}</p>
              </div>
            </CardContent>
          </Card>

          {demand.guarantorId && (
            <Card className={coreCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#224D62]">
                  <Shield className="h-5 w-5" />
                  Informations garant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom complet</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{guarantorFullName || 'Non renseigné'}</p>
                </div>
                {demand.guarantorRelation && (
                  <div className={infoBoxClass}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relation</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{demand.guarantorRelation}</p>
                  </div>
                )}
                <div className={infoBoxClass}>
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    Contacts
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{guarantorContacts}</p>
                </div>
                <div className={infoBoxClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                  <Badge variant="outline" className="mt-2 border-[#224D62]/30 bg-[#224D62]/5 text-[#224D62]">
                    {demand.guarantorIsMember ? 'Garant membre' : 'Garant non-membre'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={coreCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#224D62]">
                <Calendar className="h-5 w-5" />
                Pilotage administratif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {demand.score !== undefined && (
                <div className={cn(infoBoxClass, 'space-y-2')}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score de fiabilité</p>
                  <Badge className={cn('border px-3 py-1 text-base font-bold', getScoreBadgeStyle(demand.score))}>
                    {demand.score}/10
                  </Badge>
                  {demand.scoreUpdatedAt && (
                    <p className="text-xs text-slate-500">Mis à jour le {formatDate(demand.scoreUpdatedAt)}</p>
                  )}
                </div>
              )}

              {demand.eligibilityOverride && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Dérogation appliquée</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-orange-900">{demand.eligibilityOverride.justification}</p>
                  <p className="mt-2 text-xs text-orange-700">
                    Par {demand.eligibilityOverride.adminName} • {formatDate(demand.eligibilityOverride.createdAt)}
                  </p>
                </div>
              )}

              <div className={infoBoxClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Créée par</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{demand.createdBy || 'N/A'}</p>
              </div>
              <div className={infoBoxClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modifiée par</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{demand.updatedBy || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {demand.status === 'PENDING' && (
            <Card className={coreCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="text-[#224D62]">Actions disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  className="w-full border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier la demande
                </Button>
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'approve' })}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approuver la demande
                </Button>
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'reject' })}
                  variant="destructive"
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter la demande
                </Button>
                <Button
                  onClick={() => setIsDeleteModalOpen(true)}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer la demande
                </Button>
              </CardContent>
            </Card>
          )}

          {demand.status === 'APPROVED' && !demand.contractId && (
            <Card className={coreCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="text-[#224D62]">Conversion en contrat</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setSimulationModalState({ isOpen: true })}
                  disabled={createFromDemand.isPending}
                  className="w-full bg-gradient-to-r from-[#224D62] to-[#2d6079] hover:from-[#1f4659] hover:to-[#244f65]"
                >
                  {createFromDemand.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Créer le contrat
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {demand.status === 'REJECTED' && (
            <Card className={coreCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="text-[#224D62]">Action de suivi</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setReopenModalState({ isOpen: true })}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réouvrir la demande
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {demand.clientId && (
        <MemberActivitySummary
          memberId={demand.clientId}
          memberName={clientFullName}
          isGuarantor={false}
        />
      )}

      {demand.guarantorId && demand.guarantorIsMember && (
        <MemberActivitySummary
          memberId={demand.guarantorId}
          memberName={guarantorFullName}
          isGuarantor={true}
        />
      )}

      <EditCreditDemandModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        demand={demand}
        lockCreditType={lockCreditType}
      />

      <DeleteCreditDemandModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        demand={demand}
        onSuccess={() => router.push(listPath)}
      />

      {/* Modal de validation/rejet */}
      <ValidateDemandModal
        isOpen={validateModalState.isOpen}
        onClose={() => setValidateModalState({ isOpen: false, action: 'approve' })}
        demand={demand}
        action={validateModalState.action}
        onSuccess={() => {
          router.push(listPath)
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false })}
        demand={demand}
        onSuccess={() => {
          router.push(listPath)
        }}
      />

      {/* Modal de simulation */}
      {(demand.creditType === 'FIXE' || demand.creditType === 'AIDE') ? (
        <CreditFixeSimulationModal
          isOpen={simulationModalState.isOpen}
          onClose={() => setSimulationModalState({ isOpen: false })}
          creditType={demand.creditType}
          initialAmount={demand.amount}
          lockAmount
          onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
            setSimulationModalState({ isOpen: false })
            setContractCreationState({
              isOpen: true,
              simulation,
            })
          }}
        />
      ) : (
        <CreditSimulationModal
          isOpen={simulationModalState.isOpen}
          onClose={() => setSimulationModalState({ isOpen: false })}
          creditType={demand.creditType}
          initialAmount={demand.amount}
          initialMonthlyPayment={demand.monthlyPaymentAmount}
          lockAmount
          onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
            // Fermer le modal de simulation et ouvrir le modal de création de contrat
            setSimulationModalState({ isOpen: false })
            setContractCreationState({
              isOpen: true,
              simulation,
            })
          }}
        />
      )}

      {/* Modal de création de contrat multi-étapes */}
      {contractCreationState.simulation && (
        <ContractCreationModal
          isOpen={contractCreationState.isOpen}
          onClose={() => setContractCreationState({ isOpen: false, simulation: null })}
          demand={demand}
          simulation={contractCreationState.simulation}
          contractListPath={resolvedContractListPath}
        />
      )}
    </div>
  )
}
