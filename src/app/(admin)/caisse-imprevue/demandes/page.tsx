/**
 * Page de liste des demandes Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Pagination serveur, tri, recherche, filtres
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Plus } from 'lucide-react'
import { ListDemandesV2 } from '@/domains/financial/caisse-imprevue/components/demandes'
import {
  ExportDemandsModalV2,
  AcceptDemandModalV2,
  RejectDemandModalV2,
  ReopenDemandModalV2,
  DeleteDemandModalV2,
  EditDemandModalV2,
  ConfirmContractModalV2,
} from '@/domains/financial/caisse-imprevue/components/modals'
import {
  useAcceptDemand,
  useRejectDemand,
  useReopenDemand,
  useDeleteDemand,
  useUpdateDemand,
  useCreateContractFromDemand,
} from '@/domains/financial/caisse-imprevue/hooks'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useDemandDetail } from '@/domains/financial/caisse-imprevue/hooks'

export default function DemandesPage() {
  const router = useRouter()
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const { user } = useAuth()
  const { data: selectedDemand } = useDemandDetail(selectedDemandId || '')

  const acceptMutation = useAcceptDemand()
  const rejectMutation = useRejectDemand()
  const reopenMutation = useReopenDemand()
  const deleteMutation = useDeleteDemand()
  const updateMutation = useUpdateDemand()
  const createContractMutation = useCreateContractFromDemand()

  const handleAccept = (id: string) => {
    setSelectedDemandId(id)
    setIsAcceptModalOpen(true)
  }

  const handleReject = (id: string) => {
    setSelectedDemandId(id)
    setIsRejectModalOpen(true)
  }

  const handleReopen = (id: string) => {
    setSelectedDemandId(id)
    setIsReopenModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setSelectedDemandId(id)
    setIsDeleteModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setSelectedDemandId(id)
    setIsEditModalOpen(true)
  }

  const handleCreateContract = (id: string) => {
    setSelectedDemandId(id)
    setIsContractModalOpen(true)
  }

  const handleConfirmAccept = async (reason: string) => {
    if (!selectedDemandId || !user?.uid) return
    await acceptMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      acceptedBy: user.uid,
    })
    setIsAcceptModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmReject = async (reason: string) => {
    if (!selectedDemandId || !user?.uid) return
    await rejectMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      rejectedBy: user.uid,
    })
    setIsRejectModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmReopen = async (reason?: string) => {
    if (!selectedDemandId || !user?.uid) return
    await reopenMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      reopenedBy: user.uid,
    })
    setIsReopenModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmDelete = async () => {
    if (!selectedDemandId || !user?.uid) return
    await deleteMutation.mutateAsync({
      id: selectedDemandId,
      deletedBy: user.uid,
    })
    setIsDeleteModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmEdit = async (data: any) => {
    if (!selectedDemandId || !user?.uid) return
    await updateMutation.mutateAsync({
      id: selectedDemandId,
      data,
      updatedBy: user.uid,
    })
    setIsEditModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmContract = async () => {
    if (!selectedDemandId || !user?.uid) return
    await createContractMutation.mutateAsync({
      demandId: selectedDemandId,
      convertedBy: user.uid,
    })
    setIsContractModalOpen(false)
    setSelectedDemandId(null)
  }

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="bg-[#234D65] rounded-lg p-4 md:p-6 lg:p-8 text-white">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2">
          📋 Demandes Caisse Imprévue
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-kara-primary-light/80 mb-4">
          Gérez les demandes de contrats Caisse Imprévue
        </p>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 lg:gap-4">
          <Button
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            data-testid="export-demands-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button
            onClick={() => router.push('/caisse-imprevue/demandes/add')}
            className="bg-kara-primary-light hover:bg-[#B8A05F] text-white"
            data-testid="create-demand-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {/* Liste des demandes */}
      <ListDemandesV2
        onViewDetails={(id) => router.push(`/caisse-imprevue/demandes/${id}`)}
        onAccept={handleAccept}
        onReject={handleReject}
        onReopen={handleReopen}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCreateContract={handleCreateContract}
      />

      {/* Modals */}
      <ExportDemandsModalV2
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {selectedDemand && (
        <>
          <AcceptDemandModalV2
            isOpen={isAcceptModalOpen}
            onClose={() => {
              setIsAcceptModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmAccept}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={acceptMutation.isPending}
          />

          <RejectDemandModalV2
            isOpen={isRejectModalOpen}
            onClose={() => {
              setIsRejectModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmReject}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={rejectMutation.isPending}
          />

          <ReopenDemandModalV2
            isOpen={isReopenModalOpen}
            onClose={() => {
              setIsReopenModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmReopen}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            previousRejectReason={selectedDemand.decisionReason}
            isLoading={reopenMutation.isPending}
          />

          <DeleteDemandModalV2
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmDelete}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={deleteMutation.isPending}
          />

          <EditDemandModalV2
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmEdit}
            demand={selectedDemand}
            isLoading={updateMutation.isPending}
          />

          <ConfirmContractModalV2
            isOpen={isContractModalOpen}
            onClose={() => {
              setIsContractModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmContract}
            demand={selectedDemand}
            isLoading={createContractMutation.isPending}
          />
        </>
      )}
    </div>
  )
}
