/**
 * Page de création d'une demande de placement
 * Même principe que caisse imprévue : formulaire en page dédiée
 */

'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { toast } from 'sonner'
import { placementDemandFormSchema, placementDemandDefaultValues, type PlacementDemandFormInput } from '@/schemas/placement.schema'
import { PlacementDemandForm } from '@/domains/financial/placement/demandes'
import routes from '@/constantes/routes'

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
        <Card className="border-0 shadow-lg bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white overflow-hidden">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-white hover:bg-white/20 hover:text-white shrink-0 mt-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </div>
                <div className="flex-1">
                  <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight">
                    Nouvelle demande de placement
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                    Créez une demande de placement pour un bienfaiteur
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
