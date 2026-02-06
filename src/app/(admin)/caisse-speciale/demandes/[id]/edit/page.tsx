/**
 * Page d'édition d'une demande Caisse Spéciale V2
 * Formulaire 3 étapes prérempli : Membre, Infos demande, Contact d'urgence
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { useCaisseSpecialeDemandForm } from '@/hooks/caisse-speciale/useCaisseSpecialeDemandForm'
import { useCaisseSpecialeDemand, useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { CreateDemandFormV2 } from '@/components/caisse-speciale/forms'
import routes from '@/constantes/routes'
import React, { useEffect, useLayoutEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'
import type { CaisseSpecialeDemand } from '@/types/types'

interface EditDemandPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditDemandPage({ params }: EditDemandPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [demandId, setDemandId] = React.useState<string | null>(null)
  
  // Récupérer l'ID depuis params
  React.useEffect(() => {
    params.then((p) => setDemandId(p.id))
  }, [params])

  // Vider le cache du formulaire AVANT que le hook de persistance ne puisse le lire
  // useLayoutEffect s'exécute de façon synchrone avant tout useEffect
  useLayoutEffect(() => {
    try {
      localStorage.removeItem('caisse-speciale-demand-form-v2')
    } catch { /* ignore */ }
  }, [])

  const { data: demand, isLoading: isLoadingDemand, error: demandError } = useCaisseSpecialeDemand(demandId || '')
  
  // Convertir la demande en valeurs initiales pour le formulaire
  const initialValues: Partial<CaisseSpecialeDemandFormInput> | undefined = React.useMemo(() => {
    if (!demand) return undefined
    
    return {
      memberId: demand.memberId || '',
      caisseType: demand.caisseType,
      monthlyAmount: demand.monthlyAmount,
      monthsPlanned: demand.monthsPlanned,
      desiredDate: demand.desiredDate ? new Date(demand.desiredDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      cause: demand.cause || '',
      emergencyContact: demand.emergencyContact
        ? {
            memberId: demand.emergencyContact.memberId,
            lastName: demand.emergencyContact.lastName || '',
            firstName: demand.emergencyContact.firstName || '',
            phone1: demand.emergencyContact.phone1 || '',
            phone2: demand.emergencyContact.phone2 || '',
            relationship: demand.emergencyContact.relationship || '',
            idNumber: demand.emergencyContact.idNumber || '',
            typeId: demand.emergencyContact.typeId || '',
            documentPhotoUrl: demand.emergencyContact.documentPhotoUrl || '',
          }
        : {
            lastName: '',
            firstName: '',
            phone1: '',
            phone2: '',
            relationship: '',
            idNumber: '',
            typeId: '',
            documentPhotoUrl: '',
          },
    }
  }, [demand])

  // Désactiver la persistance en mode édition pour éviter le conflit avec le cache
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
  } = useCaisseSpecialeDemandForm(undefined, true) // Ne pas passer initialValues ici, on le fait dans le useEffect
  
  const { updateDemand } = useCaisseSpecialeDemandMutations()

  // Préremplir le formulaire quand la demande est chargée
  // On utilise un useEffect séparé pour s'assurer que le formulaire est réinitialisé après le chargement
  useEffect(() => {
    if (initialValues && demand && Object.keys(initialValues).length > 0) {
      // Réinitialiser le formulaire avec les valeurs de la demande
      // On utilise reset avec keepDefaultValues: false pour écraser complètement les valeurs
      form.reset(initialValues as CaisseSpecialeDemandFormInput, {
        keepDefaultValues: false,
      })
    }
  }, [initialValues, demand, form])

  const handleSubmit = async (data: CaisseSpecialeDemandFormInput) => {
    if (!user?.uid || !demandId) {
      toast.error('Vous devez être connecté pour modifier une demande')
      return
    }

    if (demand?.status !== 'PENDING') {
      toast.error('Seules les demandes en attente peuvent être modifiées')
      return
    }

    setIsSubmitting(true)
    try {
      const updateData = {
        caisseType: data.caisseType,
        monthlyAmount: data.monthlyAmount,
        monthsPlanned: data.monthsPlanned,
        desiredDate: data.desiredDate,
        cause: data.cause || '',
        emergencyContact: data.emergencyContact as CaisseSpecialeDemand['emergencyContact'],
      }
      
      console.log('Données à mettre à jour:', updateData)
      
      await updateDemand.mutateAsync(
        {
          demandId,
          data: updateData,
        },
        {
          onSuccess: () => {
            router.push(routes.admin.caisseSpecialeDemandDetails(demandId))
          },
        }
      )
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      // L'erreur est déjà gérée dans le hook (toast)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Affichage du chargement
  if (!demandId || isLoadingDemand) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // Erreur de chargement
  if (demandError || !demand) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {demandError ? 'Erreur lors du chargement de la demande' : 'Demande introuvable'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          Retour
        </Button>
      </div>
    )
  }

  // Vérifier que la demande est modifiable
  if (demand.status !== 'PENDING') {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette demande ne peut pas être modifiée. Seules les demandes en attente peuvent être modifiées.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push(routes.admin.caisseSpecialeDemandDetails(demandId))} className="mt-4">
          Retour aux détails
        </Button>
      </div>
    )
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
                onClick={() => router.push(routes.admin.caisseSpecialeDemandDetails(demandId))}
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
                    Modifier la demande Caisse Spéciale
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                    Modifiez les informations de la demande en 3 étapes
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
            isSubmitting={isSubmitting || updateDemand.isPending}
            onResetStep={resetCurrentStep}
            onResetAll={resetForm}
            submitLabel="Modifier la demande"
            submittingLabel="Modification..."
          />
        </div>
      </div>
    </div>
  )
}
