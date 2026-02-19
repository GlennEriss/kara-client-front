'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { placementDemandFormSchema, placementDemandDefaultValues, type PlacementDemandFormInput } from '@/schemas/placement.schema'
import { useAuth } from '@/hooks/useAuth'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { toast } from 'sonner'
import { PlacementDemandForm } from '@/domains/financial/placement/demandes'
import { useEntitySearch } from '@/hooks/useEntitySearch'

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
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Nouvelle demande de placement
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle demande de placement pour un bienfaiteur
          </DialogDescription>
        </DialogHeader>
        <PlacementDemandForm
          form={form}
          onSubmit={onSubmit}
          onCancel={onClose}
          isPending={create.isPending}
          cancelLabel="Annuler"
          submitLabel="Créer la demande"
        />
      </DialogContent>
    </Dialog>
  )
}
