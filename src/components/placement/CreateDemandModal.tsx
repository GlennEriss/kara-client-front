'use client'

import { TrendingUp } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalHeader } from '@/components/ui/modal'
import { PlacementDemandForm } from '@/domains/financial/placement/demandes'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { useAuth } from '@/hooks/useAuth'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { placementDemandDefaultValues, placementDemandFormSchema, type PlacementDemandFormInput } from '@/schemas/placement.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface CreateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialBenefactorId?: string
}

export default function CreateDemandModal({
  isOpen,
  onClose,
  initialBenefactorId,
}: CreateDemandModalProps) {
  const { create } = usePlacementDemandMutations()
  const { user } = useAuth()
  const { resetSearch } = useEntitySearch('INDIVIDUAL')

  const form = useForm<PlacementDemandFormInput>({
    resolver: zodResolver(placementDemandFormSchema),
    defaultValues: {
      ...placementDemandDefaultValues,
      benefactorId: initialBenefactorId,
    },
  })

  useEffect(() => {
    if (isOpen && initialBenefactorId) {
      form.setValue('benefactorId', initialBenefactorId)
    }
  }, [isOpen, initialBenefactorId, form])

  const onSubmit = async (data: PlacementDemandFormInput) => {
    try {
      if (!user?.uid) {
        toast.error('Vous devez être connecté pour créer une demande')
        return
      }
      await create.mutateAsync(data)
      form.reset({ ...placementDemandDefaultValues, benefactorId: initialBenefactorId })
      resetSearch()
      onClose()
    } catch {
      // Erreur gérée par le hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent size="3xl" className="w-[95vw]">
        <ModalHeader
          icon={TrendingUp}
          title="Nouvelle demande de placement"
          description="Créez une nouvelle demande de placement pour un bienfaiteur"
        />
        <ModalBody>
        <PlacementDemandForm
          form={form}
          onSubmit={onSubmit}
          onCancel={onClose}
          isPending={create.isPending}
          cancelLabel="Annuler"
          submitLabel="Créer la demande"
        />
        </ModalBody>
      </ModalContent>
    </Dialog>
  )
}
