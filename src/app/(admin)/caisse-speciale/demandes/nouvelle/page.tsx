/**
 * Page de création d'une nouvelle demande Caisse Spéciale V2
 * Formulaire 3 étapes : Membre, Infos demande, Contact d'urgence
 */

'use client'

import { CreateDemandFormV2 } from '@/components/caisse-speciale/forms'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/ui/page-hero'
import routes from '@/constantes/routes'
import { useCaisseSpecialeDemandForm } from '@/hooks/caisse-speciale/useCaisseSpecialeDemandForm'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function NouvelleDemandePage() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    form,
    currentStep,
    nextStep,
    previousStep,
    isSubmitting,
    setIsSubmitting,
    resetForm,
    resetCurrentStep,
    clearFormData,
  } = useCaisseSpecialeDemandForm()
  const createMutation = useCaisseSpecialeDemandMutations()

  const handleSubmit = async (data: Parameters<typeof createMutation.create.mutateAsync>[0]) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté pour créer une demande')
      return
    }

    setIsSubmitting(true)
    try {
      await createMutation.create.mutateAsync(data, {
        onSuccess: () => {
          clearFormData()
          router.push(routes.admin.caisseSpecialeDemandes)
        },
      })
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      toast.error('Erreur lors de la création de la demande')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
      <div className="space-y-4 sm:space-y-6">
        <PageHero
          icon={FileText}
          title="Nouvelle demande Caisse Spéciale"
          subtitle="Remplissez le formulaire en 3 étapes"
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
          <CreateDemandFormV2
            form={form}
            currentStep={currentStep}
            onNext={nextStep}
            onPrevious={previousStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || createMutation.create.isPending}
            onResetStep={resetCurrentStep}
            onResetAll={resetForm}
          />
        </div>
      </div>
    </div>
  )
}
