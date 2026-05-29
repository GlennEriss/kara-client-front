/**
 * Page de création d'une demande Caisse Imprévue V2
 * 
 * Formulaire multi-étapes avec persistance localStorage
 */

'use client'

import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/ui/page-hero'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { CreateDemandFormV2 } from '@/domains/financial/caisse-imprevue/components/forms'
import { useCreateDemand, useDemandForm } from '@/domains/financial/caisse-imprevue/hooks'
import { ArrowLeft, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CreateDemandPage() {
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
    clearFormData 
  } = useDemandForm()
  const createMutation = useCreateDemand()

  const handleSubmit = async (data: any) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté pour créer une demande')
      return
    }

    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        data,
        createdBy: user.uid,
      })
      // ✅ Nettoyer le formulaire et le localStorage après création réussie
      clearFormData()
      toast.success('Demande créée avec succès')
      router.push('/caisse-imprevue/demandes')
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
          title="Créer une demande"
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

        {/* Formulaire */}
        <div className="w-full overflow-x-hidden">
          <CreateDemandFormV2
            form={form}
            currentStep={currentStep}
            onNext={nextStep}
            onPrevious={previousStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || createMutation.isPending}
            onResetStep={resetCurrentStep}
            onResetAll={resetForm}
          />
        </div>
      </div>
    </div>
  )
}
