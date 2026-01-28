/**
 * Page de détails d'une demande Caisse Imprévue V2
 * 
 * Design coloré selon le thème KARA avec animations
 * Titre responsive pour mobile
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Loader2, User, Clock, CheckCircle2, XCircle, RotateCcw, FileSignature } from 'lucide-react'
import {
  useDemandDetail,
  useExportDemandDetails,
  useAcceptDemand,
  useRejectDemand,
  useReopenDemand,
  useDeleteDemand,
  useUpdateDemand,
  useCreateContractFromDemand,
} from '@/domains/financial/caisse-imprevue/hooks'
import {
  AcceptDemandModalV2,
  RejectDemandModalV2,
  ReopenDemandModalV2,
  DeleteDemandModalV2,
  EditDemandModalV2,
  ConfirmContractModalV2,
} from '@/domains/financial/caisse-imprevue/components/modals'
import { DemandDetailV2 } from '@/domains/financial/caisse-imprevue/components/demandes'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { 
  label: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  borderColor: string
  gradientFrom: string
  gradientTo: string
}> = {
  PENDING: { 
    label: 'En attente', 
    icon: <Clock className="w-4 h-4" />,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-500'
  },
  APPROVED: { 
    label: 'Acceptée', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-500'
  },
  REJECTED: { 
    label: 'Refusée', 
    icon: <XCircle className="w-4 h-4" />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-500'
  },
  CONVERTED: { 
    label: 'Convertie', 
    icon: <FileSignature className="w-4 h-4" />,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-500'
  },
  REOPENED: { 
    label: 'Réouverte', 
    icon: <RotateCcw className="w-4 h-4" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-500'
  },
}

export default function DemandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const demandId = params.id as string

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)

  const { data: demand, isLoading } = useDemandDetail(demandId)
  const { exportDetails, isExporting } = useExportDemandDetails()

  const acceptMutation = useAcceptDemand()
  const rejectMutation = useRejectDemand()
  const reopenMutation = useReopenDemand()
  const deleteMutation = useDeleteDemand()
  const updateMutation = useUpdateDemand()
  const createContractMutation = useCreateContractFromDemand()

  const handleExportPDF = async () => {
    if (!demand) return
    try {
      await exportDetails(demand)
    } catch (error) {
      console.error('Erreur export:', error)
    }
  }

  const handleAccept = () => setIsAcceptModalOpen(true)
  const handleReject = () => setIsRejectModalOpen(true)
  const handleReopen = () => setIsReopenModalOpen(true)
  const handleDelete = () => setIsDeleteModalOpen(true)
  const handleEdit = () => setIsEditModalOpen(true)
  const handleCreateContract = () => setIsContractModalOpen(true)

  const handleConfirmAccept = async (reason: string) => {
    if (!demand || !user?.uid) return
    await acceptMutation.mutateAsync({
      id: demand.id,
      input: { reason },
      acceptedBy: user.uid,
    })
    setIsAcceptModalOpen(false)
  }

  const handleConfirmReject = async (reason: string) => {
    if (!demand || !user?.uid) return
    await rejectMutation.mutateAsync({
      id: demand.id,
      input: { reason },
      rejectedBy: user.uid,
    })
    setIsRejectModalOpen(false)
  }

  const handleConfirmReopen = async (reason?: string) => {
    if (!demand || !user?.uid) return
    await reopenMutation.mutateAsync({
      id: demand.id,
      input: { reason },
      reopenedBy: user.uid,
    })
    setIsReopenModalOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (!demand || !user?.uid) return
    await deleteMutation.mutateAsync({
      id: demand.id,
      deletedBy: user.uid,
    })
    router.push('/caisse-imprevue/demandes')
  }

  const handleConfirmEdit = async (data: any) => {
    if (!demand || !user?.uid) return
    await updateMutation.mutateAsync({
      id: demand.id,
      data,
      updatedBy: user.uid,
    })
    setIsEditModalOpen(false)
  }

  const handleConfirmContract = async () => {
    if (!demand || !user?.uid) return
    await createContractMutation.mutateAsync({
      demandId: demand.id,
      convertedBy: user.uid,
    })
    setIsContractModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-2xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6 animate-pulse">
          <Skeleton className="h-8 w-64 bg-white/20" />
          <Skeleton className="h-4 w-48 mt-2 bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="container mx-auto p-3 md:p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Demande non trouvée</h2>
          <p className="text-gray-500 mb-6">Cette demande n'existe pas ou a été supprimée.</p>
          <Button onClick={() => router.push('/caisse-imprevue/demandes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[demand.status] || statusConfig.PENDING

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/caisse-imprevue/demandes" className="text-[#234D65] hover:text-[#2c5a73]">
              Demandes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="text-gray-600">Détails</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header avec gradient et animations */}
      <div 
        className={cn(
          'relative overflow-hidden rounded-2xl p-4 sm:p-6 lg:p-8',
          'bg-gradient-to-r from-[#234D65] to-[#2c5a73]',
          'shadow-xl shadow-[#234D65]/20',
          'animate-in fade-in slide-in-from-top-4 duration-500'
        )}
      >
        {/* Cercles décoratifs animés */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-white/5 animate-pulse delay-300" />
        
        <div className="relative z-10">
          {/* Ligne supérieure : Bouton retour + Badge statut */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
              className="text-white/80 hover:text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <Badge 
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 font-semibold text-sm',
                'border-2 animate-in zoom-in duration-300 delay-200',
                statusInfo.bgColor,
                statusInfo.textColor,
                statusInfo.borderColor
              )}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>

          {/* Titre et infos - Responsive */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Nom du membre - Titre principal */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white truncate">
                    {demand.memberFirstName} {demand.memberLastName}
                  </h1>
                  <p className="text-white/70 text-sm">
                    {demand.memberMatricule}
                  </p>
                </div>
              </div>
              
              {/* ID de la demande - Secondaire, responsive */}
              <div className="mt-3 p-2 sm:p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Référence demande</p>
                <p className="text-white font-mono text-xs sm:text-sm break-all">
                  #{demand.id}
                </p>
              </div>
            </div>

            {/* Bouton Export */}
            <Button
              variant="secondary"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="shrink-0 bg-white hover:bg-gray-100 text-[#234D65] shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="export-details-pdf-button"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Exporter PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Détails avec animations */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <DemandDetailV2
          demand={demand}
          onAccept={handleAccept}
          onReject={handleReject}
          onReopen={handleReopen}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onCreateContract={handleCreateContract}
        />
      </div>

      {/* Modals */}
      <AcceptDemandModalV2
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        onConfirm={handleConfirmAccept}
        demandId={demand.id}
        memberName={`${demand.memberFirstName} ${demand.memberLastName}`}
        isLoading={acceptMutation.isPending}
      />

      <RejectDemandModalV2
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
        demandId={demand.id}
        memberName={`${demand.memberFirstName} ${demand.memberLastName}`}
        isLoading={rejectMutation.isPending}
      />

      <ReopenDemandModalV2
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        onConfirm={handleConfirmReopen}
        demandId={demand.id}
        memberName={`${demand.memberFirstName} ${demand.memberLastName}`}
        previousRejectReason={demand.decisionReason}
        isLoading={reopenMutation.isPending}
      />

      <DeleteDemandModalV2
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        demandId={demand.id}
        memberName={`${demand.memberFirstName} ${demand.memberLastName}`}
        isLoading={deleteMutation.isPending}
      />

      <EditDemandModalV2
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onConfirm={handleConfirmEdit}
        demand={demand}
        isLoading={updateMutation.isPending}
      />

      <ConfirmContractModalV2
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onConfirm={handleConfirmContract}
        demand={demand}
        isLoading={createContractMutation.isPending}
      />
    </div>
  )
}
