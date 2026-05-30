/**
 * Page de création d'une demande de placement
 * Même principe que caisse imprévue : formulaire en page dédiée
 */

'use client'

import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/ui/page-hero'
import routes from '@/constantes/routes'
import { PlacementDemandForm } from '@/domains/financial/placement/demandes'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { useAuth } from '@/hooks/useAuth'
import { placementDemandDefaultValues, placementDemandFormSchema, type PlacementDemandFormInput } from '@/schemas/placement.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export default function AddPlacementDemandPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { create } = usePlacementDemandMutations()

  const form = useForm<PlacementDemandFormInput>({
    resolver: zodResolver(placementDemandFormSchema),
    defaultValues: placementDemandDefaultValues,
  })

  const handleSubmit = async (data: PlacementDemandFormInput) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté pour créer une demande')
      return
    }
    try {
      await create.mutateAsync(data)
      form.reset()
      toast.success('Demande créée avec succès')
      router.push(routes.admin.placementDemandes)
    } catch {
      // Erreur gérée par le hook
    }
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
      <div className="space-y-4 sm:space-y-6">
        <PageHero
          icon={FileText}
          title="Nouvelle demande de placement"
          subtitle="Créez une demande de placement pour un bienfaiteur"
          rightSlot={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          }
        />

        <div className="w-full overflow-x-hidden">
          <PlacementDemandForm
            form={form}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isPending={create.isPending}
            cancelLabel="Annuler"
            submitLabel="Créer la demande"
          />
        </div>
      </div>
    </div>
  )
}
