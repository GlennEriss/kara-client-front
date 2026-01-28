/**
 * Page de détails d'une demande Caisse Imprévue V2
 * 
 * Affichage complet avec simulation et actions contextuelles
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
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
      // toast.success sera affiché dans le hook
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
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="container mx-auto p-3 md:p-4 lg:p-6">
        <p className="text-center text-kara-neutral-500">Demande non trouvée</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/caisse-imprevue/demandes">Demandes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Détails</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Demande #{demand.id}</h1>
            <p className="text-sm md:text-base text-kara-neutral-600">
              Détails complets de la demande
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isExporting}
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
              Export PDF
            </>
          )}
        </Button>
      </div>

      {/* Détails */}
      <DemandDetailV2
        demand={demand}
        onAccept={handleAccept}
        onReject={handleReject}
        onReopen={handleReopen}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCreateContract={handleCreateContract}
      />

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
