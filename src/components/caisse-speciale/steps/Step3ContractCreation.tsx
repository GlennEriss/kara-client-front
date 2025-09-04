"use client"

import React, { useState } from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Users, 
  User,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'

export function Step3ContractCreation() {
  const { state, validateCurrentStep, prevStep } = useContractForm()
  const { formData } = state
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // Validation des paramètres de la Caisse Spéciale
  const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(formData.caisseType)

  // Validation de l'étape
  React.useEffect(() => {
    const isValid = Boolean(
      formData.firstPaymentDate && 
      formData.firstPaymentDate.trim() !== '' &&
      new Date(formData.firstPaymentDate) >= new Date()
    )
    validateCurrentStep(isValid)
  }, [formData.firstPaymentDate, validateCurrentStep])

  // Fonction de création du contrat
  const handleCreateContract = async () => {
    try {
      setIsCreating(true)

      // Validation des paramètres de la Caisse Spéciale
      if (!isValid || isValidating) {
        toast.error('Les paramètres de la Caisse Spéciale ne sont pas configurés. Impossible de créer un contrat.')
        return
      }

      // Validation des données du formulaire
      if (!formData.firstPaymentDate) {
        toast.error('Veuillez sélectionner la date du premier versement.')
        return
      }

      if (formData.caisseType === 'LIBRE' && formData.monthlyAmount < 100000) {
        toast.error('Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA.')
        return
      }

      // Validation des données obligatoires
      if (formData.contractType === 'INDIVIDUAL' && !formData.memberId) {
        toast.error('Veuillez sélectionner un membre pour ce contrat individuel.')
        return
      }

      if (formData.contractType === 'GROUP' && !formData.groupeId) {
        toast.error('Veuillez sélectionner un groupe pour ce contrat de groupe.')
        return
      }

      // Préparer les données pour la création
      const contractData = {
        memberId: formData.contractType === 'INDIVIDUAL' ? formData.memberId : undefined,
        groupeId: formData.contractType === 'GROUP' ? formData.groupeId : undefined,
        monthlyAmount: formData.monthlyAmount,
        monthsPlanned: formData.monthsPlanned,
        caisseType: formData.caisseType,
        firstPaymentDate: formData.firstPaymentDate
      }

      console.log('📝 Données du contrat à créer:', contractData)

      // Créer le contrat via la fonction subscribe
      const { subscribe } = await import('@/services/caisse/mutations')
      const contractId = await subscribe(contractData)

      console.log('✅ Contrat créé avec succès, ID:', contractId)

      // Succès avec toast Sonner
      toast.success('Contrat créé avec succès !', {
        description: `Le contrat ${contractId} a été créé et enregistré dans la base de données.`,
        duration: 5000,
        action: {
          label: 'Voir le contrat',
          onClick: () => {
            if (formData.contractType === 'INDIVIDUAL') {
              router.push(routes.admin.contractsHistoryDetails(formData.memberId || ''))
            } else {
              router.push(routes.admin.caisseSpeciale)
            }
          }
        }
      })

      // Rediriger vers la page de gestion des contrats après un délai
      setTimeout(() => {
        if (formData.contractType === 'INDIVIDUAL') {
          router.push(routes.admin.contractsHistoryDetails(formData.memberId || ''))
        } else {
          router.push(routes.admin.caisseSpeciale)
        }
      }, 3000)

    } catch (error: any) {
      console.error('❌ Erreur lors de la création du contrat:', error)
      
      // Toast d'erreur avec Sonner
      toast.error('Erreur lors de la création du contrat', {
        description: error?.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
        duration: 5000,
        action: {
          label: 'Réessayer',
          onClick: () => handleCreateContract()
        }
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Fonction pour retourner à l'étape précédente
  const handleGoBack = () => {
    prevStep()
  }

  // Récupérer les informations de l'entité sélectionnée
  const getEntityInfo = () => {
    if (formData.contractType === 'INDIVIDUAL' && formData.memberId) {
      // Pour un contrat individuel, on pourrait récupérer les infos du membre
      return {
        type: 'Membre',
        id: formData.memberId,
        icon: User
      }
    } else if (formData.contractType === 'GROUP' && formData.groupeId) {
      // Pour un contrat de groupe, on pourrait récupérer les infos du groupe
      return {
        type: 'Groupe',
        id: formData.groupeId,
        icon: Users
      }
    }
    return null
  }

  const entityInfo = getEntityInfo()

  return (
    <div className="space-y-6">
      {/* Titre de l'étape */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Création du contrat
        </h2>
        <p className="text-gray-600">
          Vérifiez les informations et créez votre contrat Caisse Spéciale
        </p>
      </div>

      {/* Résumé du contrat */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Résumé du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type de contrat et entité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  {formData.contractType === 'INDIVIDUAL' ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Users className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {formData.contractType === 'INDIVIDUAL' ? 'Contrat Individuel' : 'Contrat de Groupe'}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {entityInfo?.type} sélectionné
                  </p>
                </div>
              </div>
              {entityInfo && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  ID: {entityInfo.id}
                </Badge>
              )}
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">
                    Configuration financière
                  </h3>
                  <p className="text-sm text-green-700">
                    {formData.caisseType}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Montant mensuel:</span>
                  <span className="font-medium text-green-900">
                    {formData.monthlyAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Durée:</span>
                  <span className="font-medium text-green-900">
                    {formData.monthsPlanned} mois
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Détails de planification */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">
                  Planification des versements
                </h3>
                <p className="text-sm text-purple-700">
                  Date du premier versement
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-purple-900 font-medium">
                {formData.firstPaymentDate ? new Date(formData.firstPaymentDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Non définie'}
              </span>
            </div>
          </div>

          {/* Validation des paramètres */}
          {isValidating && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-blue-700 font-medium">Vérification des paramètres...</span>
              </div>
            </div>
          )}

          {!isValidating && !isValid && validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-700">
                  <div className="font-medium mb-1">Paramètres manquants</div>
                  <div className="text-sm">{validationError}</div>
                  <div className="mt-2 text-red-600 text-sm">
                    Veuillez configurer les paramètres de la Caisse Spéciale dans l'administration avant de créer un contrat.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isValidating && isValid && settings && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-green-700">
                  <div className="font-medium mb-1">Paramètres configurés</div>
                  <div className="text-sm">
                    Version active depuis le {new Date(settings.effectiveAt?.toDate?.() || settings.effectiveAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="mt-2 text-green-600 text-sm">
                    Vous pouvez maintenant créer un contrat avec ce type de caisse.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={handleGoBack}
          disabled={isCreating}
          className="h-12 px-8 border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Button
          onClick={handleCreateContract}
          disabled={isCreating || !isValid || isValidating}
          className={cn(
            "h-12 px-8 transition-all duration-300 rounded-xl",
            isCreating || !isValid || isValidating
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl"
          )}
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Création en cours...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Créer le contrat
            </div>
          )}
        </Button>
      </div>

      {/* Informations supplémentaires */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          En créant ce contrat, vous acceptez les conditions de la Caisse Spéciale.
          <br />
          Le contrat sera immédiatement actif et les premiers versements seront planifiés.
        </p>
      </div>
    </div>
  )
}
