/**
 * Page de création d'une nouvelle demande Caisse Spéciale V2
 * Formulaire 3 étapes : Membre, Infos demande, Contact d'urgence
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'
import { useCaisseSpecialeDemandForm } from '@/hooks/caisse-speciale/useCaisseSpecialeDemandForm'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { CreateDemandFormV2 } from '@/components/caisse-speciale/forms'
import routes from '@/constantes/routes'

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
                    Nouvelle demande Caisse Spéciale
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                    Remplissez le formulaire en 3 étapes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
