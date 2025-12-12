'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  History,
  HandCoins,
  AlertCircle,
  FileSignature,
  Download,
  RefreshCw,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  FileText,
  Receipt,
  Upload,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreditContract, CreditPayment, CreditPenalty, CreditContractStatus } from '@/types/types'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import { useCreditPaymentsByCreditId, useCreditPenaltiesByCreditId, useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import CreditPaymentModal from './CreditPaymentModal'
import PaymentReceiptModal from './PaymentReceiptModal'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreditContractDetailProps {
  contract: CreditContract
}

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }

  const goNext = () => goTo(currentIndex + 1)
  const goPrev = () => goTo(currentIndex - 1)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }
  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX) }
  const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX) }
  const handleMouseUp = () => { handleEnd() }
  const handleTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }
  const handleTouchEnd = () => { handleEnd() }

  React.useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX)
    }
    const handleGlobalTouchEnd = () => handleEnd()

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
    document.addEventListener('touchend', handleGlobalTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [isDragging, currentIndex, translateX, startPos])

  return {
    currentIndex,
    goNext,
    goPrev,
    goTo,
    containerRef,
    translateX,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
  }
}

// Carrousel de statistiques
const ContractStatsCarousel = ({ contract }: { contract: CreditContract }) => {
  const stats = [
    {
      label: 'Montant emprunté',
      value: contract.amount.toLocaleString('fr-FR'),
      unit: 'FCFA',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Montant versé',
      value: contract.amountPaid.toLocaleString('fr-FR'),
      unit: 'FCFA',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Montant restant',
      value: contract.amountRemaining.toLocaleString('fr-FR'),
      unit: 'FCFA',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Pourcentage remboursé',
      value: contract.totalAmount > 0 
        ? ((contract.amountPaid / contract.totalAmount) * 100).toFixed(1)
        : '0',
      unit: '%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  const carousel = useCarousel(stats.length, 1)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Statistiques</h3>
        {stats.length > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={carousel.goPrev}
              disabled={!carousel.canGoPrev}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={carousel.goNext}
              disabled={!carousel.canGoNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={carousel.containerRef}
        className="overflow-hidden"
        onMouseDown={carousel.handleMouseDown}
        onMouseMove={carousel.handleMouseMove}
        onMouseUp={carousel.handleMouseUp}
        onTouchStart={carousel.handleTouchStart}
        onTouchMove={carousel.handleTouchMove}
        onTouchEnd={carousel.handleTouchEnd}
        style={{
          cursor: carousel.isDragging ? 'grabbing' : 'grab',
          touchAction: 'pan-y',
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${carousel.translateX}%)`,
          }}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="w-full flex-shrink-0 px-2">
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                          <span className="text-sm text-gray-500">{stat.unit}</span>
                        </div>
                      </div>
                      <div className={cn('p-3 rounded-full', stat.bgColor)}>
                        <Icon className={cn('h-6 w-6', stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Fonction pour obtenir la configuration du statut
const getStatusConfig = (status: CreditContractStatus) => {
  const configs: Record<CreditContractStatus, { label: string; color: string; bgColor: string }> = {
    DRAFT: { label: 'Brouillon', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    PENDING: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    APPROVED: { label: 'Approuvé', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    SIMULATED: { label: 'Simulé', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    ACTIVE: { label: 'Actif', color: 'text-green-600', bgColor: 'bg-green-100' },
    OVERDUE: { label: 'En retard', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    PARTIAL: { label: 'Partiel', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    TRANSFORMED: { label: 'Transformé', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    BLOCKED: { label: 'Bloqué', color: 'text-red-600', bgColor: 'bg-red-100' },
    DISCHARGED: { label: 'Déchargé', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    CLOSED: { label: 'Clos', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  }
  return configs[status] || configs.DRAFT
}

export default function CreditContractDetail({ contract }: CreditContractDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<CreditPayment | null>(null)
  const [showUploadContractModal, setShowUploadContractModal] = useState(false)
  const [contractFile, setContractFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const { generateContractPDF, uploadSignedContract } = useCreditContractMutations()

  // Récupérer les paiements et pénalités
  const { data: payments = [], isLoading: isLoadingPayments } = useCreditPaymentsByCreditId(contract.id)
  const { data: penalties = [], isLoading: isLoadingPenalties } = useCreditPenaltiesByCreditId(contract.id)

  const statusConfig = getStatusConfig(contract.status)
  const progressPercentage = contract.totalAmount > 0 
    ? (contract.amountPaid / contract.totalAmount) * 100 
    : 0

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (date: Date, time: string) => {
    return `${format(new Date(date), 'dd MMMM yyyy', { locale: fr })} à ${time}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(routes.admin.creditSpecialeContrats)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Button>
          <Badge className={cn('px-4 py-1.5 text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Carrousel de statistiques */}
        <ContractStatsCarousel contract={contract} />

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du contrat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Type de crédit</p>
                <p className="text-lg font-semibold">{contract.creditType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux d'intérêt</p>
                <p className="text-lg font-semibold">{contract.interestRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Durée</p>
                <p className="text-lg font-semibold">{contract.duration} mois</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mensualité</p>
                <p className="text-lg font-semibold">{contract.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Premier versement</p>
                <p className="text-lg font-semibold">{formatDate(contract.firstPaymentDate)}</p>
              </div>
              {contract.nextDueAt && (
                <div>
                  <p className="text-sm text-gray-600">Prochaine échéance</p>
                  <p className="text-lg font-semibold">{formatDate(contract.nextDueAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client et garant */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client et garant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="text-lg font-semibold">{contract.clientFirstName} {contract.clientLastName}</p>
                <p className="text-sm text-gray-500">{contract.clientContacts.join(', ')}</p>
              </div>
              {contract.guarantorId && (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Garant
                  </p>
                  <p className="text-lg font-semibold">
                    {contract.guarantorFirstName} {contract.guarantorLastName}
                  </p>
                  {contract.guarantorRelation && (
                    <p className="text-sm text-gray-500">Relation : {contract.guarantorRelation}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {contract.guarantorIsMember && (
                      <Badge variant="outline" className="text-xs">Membre</Badge>
                    )}
                    {contract.guarantorIsParrain && (
                      <Badge variant="outline" className="text-xs">Parrain</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barre de progression */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progression du remboursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remboursé</span>
                <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{contract.amountPaid.toLocaleString('fr-FR')} FCFA</span>
                <span>{contract.totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique des versements */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des versements
            </CardTitle>
            {contract.status === 'ACTIVE' && (
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                <HandCoins className="h-4 w-4 mr-2" />
                Nouveau versement
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingPayments ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun versement enregistré</div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedPayment(payment)
                      setShowReceiptModal(true)
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">
                          {formatDateTime(payment.paymentDate, payment.paymentTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Montant : {payment.amount.toLocaleString('fr-FR')} FCFA</span>
                        <span>Mode : {payment.mode}</span>
                        {payment.note !== undefined && (
                          <span>Note : {payment.note}/10</span>
                        )}
                      </div>
                    </div>
                    <Receipt className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pénalités */}
        {penalties.length > 0 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Pénalités
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {penalties.map((penalty) => (
                  <div
                    key={penalty.id}
                    className={cn(
                      'flex items-center justify-between p-4 border rounded-lg',
                      penalty.paid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {penalty.amount.toLocaleString('fr-FR')} FCFA
                        </span>
                        {penalty.paid ? (
                          <Badge className="bg-green-100 text-green-700">Payée</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700">Impayée</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>Retard : {penalty.daysLate} jours</span>
                        <span className="ml-4">Échéance : {formatDate(penalty.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Actions pour générer/uploader contrat */}
              {contract.status === 'PENDING' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Button
                    variant="outline"
                    className="justify-start bg-white hover:bg-blue-50"
                    onClick={async () => {
                      try {
                        const result = await generateContractPDF.mutateAsync({
                          contractId: contract.id,
                          blank: true,
                        })
                        if (result.url) {
                          window.open(result.url, '_blank')
                        } else {
                          toast.info('Contrat PDF généré. Le téléchargement va commencer.')
                        }
                      } catch (error: any) {
                        toast.error(error?.message || 'Erreur lors de la génération du contrat')
                      }
                    }}
                    disabled={generateContractPDF.isPending}
                  >
                    {generateContractPDF.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Générer contrat vierge
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start bg-white hover:bg-blue-50"
                    onClick={() => setShowUploadContractModal(true)}
                    disabled={uploadSignedContract.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader contrat signé
                  </Button>
                </div>
              )}

              {/* Documents existants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.contractUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.contractUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Contrat PDF
                  </Button>
                )}
                {contract.signedContractUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.signedContractUrl, '_blank')}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Contrat signé
                  </Button>
                )}
                {contract.dischargeUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.dischargeUrl, '_blank')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Décharge
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreditPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        creditId={contract.id}
        defaultAmount={contract.monthlyPaymentAmount}
        onSuccess={() => {
          // Les hooks React Query invalideront automatiquement le cache
        }}
      />
      {selectedPayment && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedPayment(null)
          }}
          contract={contract}
          payment={selectedPayment}
        />
      )}

      {/* Modal upload contrat signé */}
      <Dialog open={showUploadContractModal} onOpenChange={setShowUploadContractModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Uploader le contrat signé
            </DialogTitle>
            <DialogDescription>
              Téléversez le contrat signé par le client. Le contrat sera automatiquement activé après l'upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contractFile" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Fichier du contrat signé (PDF) *
              </Label>
              <Input
                id="contractFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setContractFile(file)
                  }
                }}
                disabled={isCompressing || uploadSignedContract.isPending}
                required
              />
              {contractFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné : {contractFile.name} ({(contractFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            {contract.status === 'PENDING' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note :</strong> Après l'upload, le contrat sera automatiquement activé et les fonds seront considérés comme remis au client.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadContractModal(false)
                setContractFile(undefined)
              }}
              disabled={uploadSignedContract.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!contractFile) {
                  toast.error('Veuillez sélectionner un fichier')
                  return
                }

                try {
                  await uploadSignedContract.mutateAsync({
                    contractId: contract.id,
                    signedContractFile: contractFile,
                  })
                  setShowUploadContractModal(false)
                  setContractFile(undefined)
                  toast.success('Contrat signé uploadé et contrat activé avec succès')
                } catch (error: any) {
                  toast.error(error?.message || 'Erreur lors de l\'upload du contrat signé')
                }
              }}
              disabled={!contractFile || uploadSignedContract.isPending}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {uploadSignedContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader et activer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

