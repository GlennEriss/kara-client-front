'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { ServiceFactory } from '@/factories/ServiceFactory'
import RepaySupportCIModal from '@/components/caisse-imprevue/RepaySupportCIModal'
import { useCreateVersement, useContractCI, useSupportHistory } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { useMember } from '@/hooks/useMembers'
import { generateSingleSupportCIPDF, generateSupportHistoryCIPDF } from '@/services/caisse-imprevue/generateSupportHistoryCIPDF'
import { CONTRACT_CI_STATUS_LABELS, SupportCI } from '@/types/types'
import { calculateMonthIndex } from '@/utils/caisse-imprevue-utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  HandCoins,
  History,
  RefreshCw,
  User,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

function toDateSafe(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate()
  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateTime(value: unknown): string {
  const d = toDateSafe(value)
  if (!d) return '-'
  return format(d, 'dd MMM yyyy à HH:mm', { locale: fr })
}

function getSupportDate(support: SupportCI): Date | null {
  return toDateSafe(support.approvedAt) || toDateSafe(support.requestedAt) || toDateSafe(support.createdAt)
}

function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export default function ContractCISupportsPage() {
  const params = useParams() as { id: string }
  const contractId = params.id
  const router = useRouter()
  const { user } = useAuth()

  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(contractId)
  const { data: supports = [], isLoading: isLoadingSupports, isError: isErrorSupports, error: errorSupports } = useSupportHistory(contractId)
  const createVersementMutation = useCreateVersement()
  const { data: member } = useMember(contract?.memberId)

  const [adminInfos, setAdminInfos] = useState<Record<string, { firstName: string; lastName: string }>>({})
  const [loadingAdmins, setLoadingAdmins] = useState<Set<string>>(new Set())
  const [isExportingGlobalPDF, setIsExportingGlobalPDF] = useState(false)
  const [exportingSupportId, setExportingSupportId] = useState<string | null>(null)
  const [showRepaySupportModal, setShowRepaySupportModal] = useState(false)
  const [supportToRepay, setSupportToRepay] = useState<SupportCI | null>(null)

  const sortedSupports = useMemo(() => {
    return [...supports].sort((a, b) => {
      const aDate = getSupportDate(a)?.getTime() || 0
      const bDate = getSupportDate(b)?.getTime() || 0
      return bDate - aDate
    })
  }, [supports])

  const fetchAdminInfo = useCallback(async (adminId: string) => {
    if (!adminId || adminInfos[adminId] || loadingAdmins.has(adminId)) return

    setLoadingAdmins((prev) => new Set(prev).add(adminId))
    try {
      const service = ServiceFactory.getCaisseImprevueService()
      const adminData = await service.getAdminById(adminId)
      if (adminData) {
        setAdminInfos((prev) => ({
          ...prev,
          [adminId]: {
            firstName: adminData.firstName,
            lastName: adminData.lastName,
          },
        }))
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'administrateur:", error)
    } finally {
      setLoadingAdmins((prev) => {
        const next = new Set(prev)
        next.delete(adminId)
        return next
      })
    }
  }, [adminInfos, loadingAdmins])

  useEffect(() => {
    if (!sortedSupports.length) return
    const ids = new Set<string>()
    sortedSupports.forEach((support) => {
      if (support.approvedBy) ids.add(support.approvedBy)
      if (support.createdBy) ids.add(support.createdBy)
      if (support.updatedBy) ids.add(support.updatedBy)
      ;(support.repayments || []).forEach((repayment) => {
        if (repayment.createdBy) ids.add(repayment.createdBy)
      })
    })
    Array.from(ids).forEach((id) => fetchAdminInfo(id))
  }, [sortedSupports, fetchAdminInfo])

  const getAdminDisplayName = useCallback((adminId?: string) => {
    if (!adminId) return 'Non renseigné'
    if (loadingAdmins.has(adminId)) return 'Chargement...'
    const admin = adminInfos[adminId]
    if (admin) return `${admin.firstName} ${admin.lastName}`
    return adminId
  }, [adminInfos, loadingAdmins])

  const stats = useMemo(() => {
    const totalAidAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amount) || 0), 0)
    const totalRepaidAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amountRepaid) || 0), 0)
    const totalRemainingAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amountRemaining) || 0), 0)
    const supportsRepaid = sortedSupports.filter((support) => support.status === 'REPAID').length
    const supportCount = sortedSupports.length
    const totalRepaymentOps = sortedSupports.reduce((sum, support) => sum + (support.repayments?.length || 0), 0)
    const progression = totalAidAmount > 0 ? (totalRepaidAmount / totalAidAmount) * 100 : 0
    return {
      totalAidAmount,
      totalRepaidAmount,
      totalRemainingAmount,
      supportsRepaid,
      supportCount,
      totalRepaymentOps,
      progression,
    }
  }, [sortedSupports])

  const exportToPDF = async () => {
    if (!contract || !sortedSupports.length) return
    setIsExportingGlobalPDF(true)
    try {
      await generateSupportHistoryCIPDF(contract, sortedSupports, {
        contractId,
        member: member || undefined,
        getAdminDisplayName,
      })
    } catch (error) {
      console.error("Erreur lors de l'export PDF global des aides:", error)
    } finally {
      setIsExportingGlobalPDF(false)
    }
  }

  const exportSingleSupportToPDF = async (support: SupportCI) => {
    if (!contract) return
    setExportingSupportId(support.id)
    try {
      await generateSingleSupportCIPDF(contract, support, {
        contractId,
        member: member || undefined,
        getAdminDisplayName,
      })
    } catch (error) {
      console.error("Erreur lors de l'export PDF de l'aide:", error)
    } finally {
      setExportingSupportId(null)
    }
  }

  const handleOpenRepaySupportModal = (support: SupportCI) => {
    if (support.status === 'REPAID' || support.amountRemaining <= 0) {
      toast.error('Cette aide est déjà remboursée')
      return
    }
    setSupportToRepay(support)
    setShowRepaySupportModal(true)
  }

  const handleCloseRepaySupportModal = () => {
    if (createVersementMutation.isPending) return
    setShowRepaySupportModal(false)
    setSupportToRepay(null)
  }

  const handleRepaySupportSubmit = async (data: {
    date: string
    time: string
    amount: number
    proofFile: File
  }) => {
    if (!contract || !supportToRepay) return
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    const firstPaymentDate = new Date(contract.firstPaymentDate)
    firstPaymentDate.setHours(0, 0, 0, 0)
    const selectedDate = new Date(`${data.date}T00:00:00`)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate < firstPaymentDate) {
      toast.error('Impossible de rembourser avant la première date de paiement du contrat')
      return
    }

    const monthIndex = calculateMonthIndex(selectedDate, contract.firstPaymentDate)
    const supportRemaining = supportToRepay.amountRemaining
    const isFullyRepaid = data.amount >= supportRemaining
    const surplus = Math.max(0, data.amount - supportRemaining)

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex,
        versementData: {
          date: data.date,
          time: data.time,
          amount: data.amount,
          mode: 'airtel_money',
        },
        proofFile: data.proofFile,
        userId: user.uid,
      })

      setShowRepaySupportModal(false)
      setSupportToRepay(null)

      if (isFullyRepaid) {
        toast.success('Support entièrement remboursé', {
          description:
            surplus > 0
              ? `${supportRemaining.toLocaleString('fr-FR')} FCFA remboursés + ${surplus.toLocaleString('fr-FR')} FCFA versés`
              : `${supportRemaining.toLocaleString('fr-FR')} FCFA remboursés`,
        })
      } else {
        toast.success('Remboursement enregistré')
      }
    } catch (error) {
      console.error('Erreur lors du remboursement du support depuis la page aides:', error)
      throw error
    }
  }

  if (isLoadingContract || isLoadingSupports) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isErrorContract || isErrorSupports) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">
              Erreur lors du chargement des données : {errorContract?.message || errorSupports?.message || 'Erreur inconnue'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Alert className="border-0 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-700 font-medium">
              Contrat introuvable
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseImprevueContractDetails(contractId))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au contrat
          </Button>

          <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
            {CONTRACT_CI_STATUS_LABELS[contract.status]}
          </Badge>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
          <CardHeader>
            <CardTitle className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <HandCoins className="h-7 w-7 lg:h-8 lg:w-8" />
              Historique des Aides Financières
            </CardTitle>
            <div className="space-y-1 text-blue-100">
              <p className="text-base lg:text-lg">
                {contract.memberFirstName} {contract.memberLastName} - Contrat #{contract.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-sm">
                Forfait {contract.subscriptionCICode} - {contract.paymentFrequency === 'MONTHLY' ? 'Paiement Mensuel' : 'Paiement Quotidien'}
              </p>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total aides</p>
                  <p className="font-bold text-lg text-blue-600">
                    {stats.totalAidAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remboursé</p>
                  <p className="font-bold text-lg text-green-600">
                    {stats.totalRepaidAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reste à rembourser</p>
                  <p className="font-bold text-lg text-orange-600">
                    {stats.totalRemainingAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <History className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aides</p>
                  <p className="font-bold text-lg text-purple-600">
                    {stats.supportCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progression</p>
                  <p className="font-bold text-lg text-cyan-600">
                    {stats.progression.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FileText className="h-5 w-5" />
              Informations du Contrat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Membre</p>
                <p className="font-semibold">{contract.memberFirstName} {contract.memberLastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Forfait</p>
                <p className="font-semibold">{contract.subscriptionCICode} - {contract.subscriptionCILabel || 'Caisse Imprévue'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Fréquence</p>
                <p className="font-semibold">{contract.paymentFrequency === 'MONTHLY' ? 'Mensuelle' : 'Quotidienne'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Montant mensuel</p>
                <p className="font-semibold">{contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Durée</p>
                <p className="font-semibold">{contract.subscriptionCIDuration} mois</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Nominal total</p>
                <p className="font-semibold">{contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <HandCoins className="h-5 w-5" />
                Liste des Aides ({sortedSupports.length})
              </CardTitle>
              {sortedSupports.length > 0 && (
                <Button
                  onClick={exportToPDF}
                  disabled={isExportingGlobalPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <FileText className="h-4 w-4" />
                  {isExportingGlobalPDF ? 'Génération...' : 'Exporter PDF'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sortedSupports.length > 0 ? (
              <div className="space-y-6">
                {sortedSupports.map((support, index) => {
                  const supportDate = getSupportDate(support)
                  const isRepaid = support.status === 'REPAID'
                  const progressPercentage = support.amount > 0 ? (support.amountRepaid / support.amount) * 100 : 0

                  return (
                    <Card key={support.id} className="border-2 hover:border-[#224D62] transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-[#224D62] text-white text-base px-3 py-1">
                              Aide {index + 1}
                            </Badge>
                            <Badge className={
                              isRepaid
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-orange-100 text-orange-700 border-orange-200'
                            }>
                              {isRepaid ? 'Remboursé' : 'En cours'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isRepaid && support.amountRemaining > 0 && (
                              <Button
                                onClick={() => handleOpenRepaySupportModal(support)}
                                disabled={createVersementMutation.isPending}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                <RefreshCw className={`h-3 w-3 ${createVersementMutation.isPending && supportToRepay?.id === support.id ? 'animate-spin' : ''}`} />
                                {createVersementMutation.isPending && supportToRepay?.id === support.id ? 'Traitement...' : 'Rembourser'}
                              </Button>
                            )}
                            <Button
                              onClick={() => exportSingleSupportToPDF(support)}
                              disabled={exportingSupportId === support.id}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Download className="h-3 w-3" />
                              {exportingSupportId === support.id ? '...' : 'PDF'}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Montant aide:</span>
                            <span className="font-semibold">{support.amount.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Remboursé:</span>
                            <span className="font-semibold text-green-600">{support.amountRepaid.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Restant:</span>
                            <span className="font-semibold text-orange-600">{support.amountRemaining.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <RefreshCw className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Remboursements:</span>
                            <span className="font-semibold">{support.repayments.length}</span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progression</span>
                            <span className={`font-semibold ${isRepaid ? 'text-green-600' : 'text-orange-600'}`}>
                              {progressPercentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${isRepaid ? 'bg-green-500' : 'bg-orange-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Date aide :</span>
                            <span className="font-medium text-gray-700">{formatDateTime(supportDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Approuvé par:</span>
                            <span className={`font-medium ${loadingAdmins.has(support.approvedBy) ? 'animate-pulse' : ''}`}>
                              {getAdminDisplayName(support.approvedBy)}
                            </span>
                          </div>
                          {isRepaid && support.repaidAt && (
                            <div className="flex items-center gap-2 text-sm text-green-700">
                              <CheckCircle className="h-4 w-4" />
                              <span>Soldé le :</span>
                              <span className="font-medium">{formatDateTime(support.repaidAt)}</span>
                            </div>
                          )}
                        </div>

                        {support.deductions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Déductions appliquées ({support.deductions.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {support.deductions.map((deduction, dIndex) => (
                                <Badge key={`${support.id}-deduction-${dIndex}`} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  M{deduction.monthIndex + 1} : {deduction.amount.toLocaleString('fr-FR')} FCFA
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {support.repayments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                              <History className="h-4 w-4" />
                              Détails des remboursements
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {support.repayments.map((repayment) => (
                                <div
                                  key={repayment.id}
                                  className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                >
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    <span className="font-medium">M{repayment.monthIndex + 1}</span>
                                    <span className="mx-2">•</span>
                                    <span>{formatDateTime(repayment.createdAt)}</span>
                                    {repayment.time ? <span className="ml-1">({repayment.time})</span> : null}
                                  </div>
                                  <div className="font-semibold text-green-600 text-sm">
                                    +{repayment.amount.toLocaleString('fr-FR')} FCFA
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Alert className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-700 font-medium">
                  Aucune aide financière enregistrée pour ce contrat.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {supportToRepay && (
        <RepaySupportCIModal
          isOpen={showRepaySupportModal}
          onClose={handleCloseRepaySupportModal}
          activeSupport={supportToRepay}
          defaultDate={formatDateKey(new Date())}
          onSubmit={handleRepaySupportSubmit}
        />
      )}
    </div>
  )
}
