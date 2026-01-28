/**
 * Page d'édition d'une demande Caisse Imprévue V2
 * 
 * Réutilise le formulaire de création avec les données pré-remplies
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText, Loader2, Edit } from 'lucide-react'
import { useDemandForm, useUpdateDemand } from '@/domains/financial/caisse-imprevue/hooks'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useDemandDetail } from '@/domains/financial/caisse-imprevue/hooks'
import { toast } from 'sonner'
import { CreateDemandFormV2 } from '@/domains/financial/caisse-imprevue/components/forms'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useMemo } from 'react'
import type { CaisseImprevueDemandFormInput } from '@/domains/financial/caisse-imprevue/hooks/useDemandForm'

export default function EditDemandPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const demandId = params.id as string

  const { data: demand, isLoading: isLoadingDemand } = useDemandDetail(demandId)
  const updateMutation = useUpdateDemand()

  // Convertir la demande en format formulaire
  const initialFormValues = useMemo<Partial<CaisseImprevueDemandFormInput> | undefined>(() => {
    if (!demand) return undefined

    return {
      // Step 1: Membre + Motif
      memberId: demand.memberId || '',
      memberFirstName: demand.memberFirstName || '',
      memberLastName: demand.memberLastName || '',
      memberEmail: demand.memberEmail || '',
      memberContacts: demand.memberContacts || [],
      memberMatricule: demand.memberMatricule || '',
      memberPhone: demand.memberPhone || '',
      cause: demand.cause || '',

      // Step 2: Forfait + Fréquence
      subscriptionCIID: demand.subscriptionCIID || '',
      subscriptionCICode: demand.subscriptionCICode || '',
      subscriptionCILabel: demand.subscriptionCILabel || '',
      subscriptionCIAmountPerMonth: demand.subscriptionCIAmountPerMonth || 0,
      subscriptionCINominal: demand.subscriptionCINominal || 0,
      subscriptionCIDuration: demand.subscriptionCIDuration || 12,
      subscriptionCISupportMin: demand.subscriptionCISupportMin || 0,
      subscriptionCISupportMax: demand.subscriptionCISupportMax || 0,
      paymentFrequency: demand.paymentFrequency || 'MONTHLY',
      desiredStartDate: demand.desiredStartDate 
        ? new Date(demand.desiredStartDate).toISOString().split('T')[0]
        : '',

      // Step 3: Contact d'urgence
      emergencyContact: demand.emergencyContact ? {
        lastName: demand.emergencyContact.lastName || '',
        firstName: demand.emergencyContact.firstName || '',
        phone1: demand.emergencyContact.phone1 || '',
        phone2: demand.emergencyContact.phone2 || '',
        relationship: demand.emergencyContact.relationship || '',
        idNumber: demand.emergencyContact.idNumber || '',
        typeId: demand.emergencyContact.typeId || '',
        documentPhotoUrl: demand.emergencyContact.documentPhotoUrl || '',
      } : undefined,
    }
  }, [demand])

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
  } = useDemandForm(initialFormValues)

  // Réinitialiser le formulaire quand les données sont chargées
  useEffect(() => {
    if (initialFormValues && demand) {
      form.reset(initialFormValues as CaisseImprevueDemandFormInput)
    }
  }, [initialFormValues, demand, form])

  const handleSubmit = async (data: CaisseImprevueDemandFormInput) => {
    if (!user?.uid || !demand) {
      toast.error('Vous devez être connecté pour modifier une demande')
      return
    }

    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: demand.id,
        data,
        updatedBy: user.uid,
      })
      // ✅ Nettoyer le localStorage après modification réussie
      clearFormData()
      toast.success('Demande modifiée avec succès')
      router.push(`/caisse-imprevue/demandes/${demand.id}`)
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      toast.error('Erreur lors de la modification de la demande')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingDemand) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
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

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
      <div className="space-y-4 sm:space-y-6">
        {/* Header avec design moderne */}
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
                  <Edit className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </div>
                <div className="flex-1">
                  {/* Titre sur 2 lignes en mobile si nécessaire */}
                  <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight">
                    Modifier la demande
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                    Modifiez les informations de la demande #{demand.id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <div className="w-full overflow-x-hidden">
          <CreateDemandFormV2
            form={form}
            currentStep={currentStep}
            onNext={nextStep}
            onPrevious={previousStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || updateMutation.isPending}
            onResetStep={resetCurrentStep}
            onResetAll={resetForm}
          />
        </div>
      </div>
    </div>
  )
}
