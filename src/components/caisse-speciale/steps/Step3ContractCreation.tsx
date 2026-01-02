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
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import { emergencyContactSchema } from '@/schemas/emergency-contact.schema'
import { useAuth } from '@/hooks/useAuth'

export function Step3ContractCreation() {
  const { state, validateCurrentStep, prevStep, updateFormData } = useContractForm()
  const { formData } = state
  
  // Fonction pour mettre à jour un champ du contact d'urgence
  const handleUpdateEmergencyContact = React.useCallback((field: string, value: any) => {
    updateFormData((prevData) => ({
      emergencyContact: {
        memberId: prevData.emergencyContact?.memberId,
        lastName: prevData.emergencyContact?.lastName || '',
        firstName: prevData.emergencyContact?.firstName || '',
        phone1: prevData.emergencyContact?.phone1 || '',
        phone2: prevData.emergencyContact?.phone2 || '',
        relationship: prevData.emergencyContact?.relationship || 'Autre',
        typeId: prevData.emergencyContact?.typeId || '',
        idNumber: prevData.emergencyContact?.idNumber || '',
        documentPhotoUrl: prevData.emergencyContact?.documentPhotoUrl || '',
        [field]: value
      }
    }))
  }, [updateFormData])
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const { user } = useAuth()
  // Validation des paramètres de la Caisse Spéciale
  const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(formData.caisseType)

  // Validation de l'étape
  React.useEffect(() => {
    console.log('🔍 Validation de l\'étape - formData:', {
      firstPaymentDate: formData.firstPaymentDate,
      emergencyContact: formData.emergencyContact
    })

    // Validation du contact d'urgence
    let isEmergencyContactValid = false
    if (formData.emergencyContact) {
      try {
        // Normaliser les numéros de téléphone en retirant les espaces
        const normalizedEmergencyContact = {
          ...formData.emergencyContact,
          phone1: formData.emergencyContact.phone1?.replace(/\s/g, '') || '',
          phone2: formData.emergencyContact.phone2?.replace(/\s/g, '') || ''
        }
        emergencyContactSchema.parse(normalizedEmergencyContact)
        isEmergencyContactValid = true
      } catch (error: any) {
        console.log('❌ Contact d\'urgence invalide:', error)
        if (error?.errors && Array.isArray(error.errors)) {
          console.log('Détails des erreurs:', error.errors.map((err: any) => ({
            champ: err.path?.[0],
            message: err.message
          })))
        }
        isEmergencyContactValid = false
      }
    }

    const isValid = Boolean(
      formData.firstPaymentDate &&
      formData.firstPaymentDate.trim() !== '' &&
      isEmergencyContactValid
    )

    console.log('🔍 Étape valide:', isValid)
    validateCurrentStep(isValid)
  }, [formData.firstPaymentDate, formData.emergencyContact, validateCurrentStep])

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


      // Validation du contact d'urgence
      if (!formData.emergencyContact) {
        toast.error('Veuillez remplir les informations du contact d\'urgence.')
        return
      }

      // Normaliser les numéros de téléphone en retirant les espaces
      const normalizedEmergencyContact = {
        ...formData.emergencyContact,
        phone1: formData.emergencyContact.phone1?.replace(/\s/g, '') || '',
        phone2: formData.emergencyContact.phone2?.replace(/\s/g, '') || ''
      }

      try {
        emergencyContactSchema.parse(normalizedEmergencyContact)
      } catch (error: any) {
        console.error('❌ Erreur de validation du contact d\'urgence:', error)
        
        // Extraire les messages d'erreur détaillés
        const errorMessages: string[] = []
        if (error?.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            const field = err.path?.[0] || 'champ'
            const message = err.message || 'est invalide'
            errorMessages.push(`${field}: ${message}`)
          })
        }
        
        const errorMessage = errorMessages.length > 0
          ? `Les informations du contact d'urgence sont incomplètes ou invalides:\n${errorMessages.join('\n')}`
          : 'Les informations du contact d\'urgence sont incomplètes ou invalides.'
        
        toast.error(errorMessage, {
          duration: 6000
        })
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

      // Préparer les données pour la création avec numéros de téléphone normalisés
      const contractData = {
        memberId: formData.contractType === 'INDIVIDUAL' ? formData.memberId : undefined,
        groupeId: formData.contractType === 'GROUP' ? formData.groupeId : undefined,
        monthlyAmount: formData.monthlyAmount,
        monthsPlanned: formData.monthsPlanned,
        caisseType: formData.caisseType,
        firstPaymentDate: formData.firstPaymentDate,
        emergencyContact: normalizedEmergencyContact,
        createdBy: user?.uid
      }

      console.log('📝 Données du contrat à créer:', contractData)

      // Créer le contrat via la fonction subscribe
      const { subscribe } = await import('@/services/caisse/mutations')
      const contractId = await subscribe(contractData)

      console.log('✅ Contrat créé avec succès, ID personnalisé:', contractId)

      // Succès avec toast Sonner
      toast.success('Contrat créé avec succès !', {
        description: `Le contrat ${contractId} a été créé et enregistré dans la base de données.`,
        duration: 5000,
        action: {
          label: 'Voir les contrats',
          onClick: () => {
            router.push(routes.admin.caisseSpeciale)
          }
        }
      })
      router.push(routes.admin.caisseSpeciale)
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
            <div className="flex items-center gap-2 mb-3">
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

            {/* Input pour modifier la date du premier versement */}
            <div className="mt-3">
              <label htmlFor="first-payment-date" className="block text-sm font-medium text-purple-700 mb-2">
                Modifier la date du premier versement
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                <input
                  id="first-payment-date"
                  type="date"
                  value={formData.firstPaymentDate || ''}
                  onChange={(e) => updateFormData({ firstPaymentDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm"
                />
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Sélectionnez la date du premier versement (les dates passées sont acceptées)
              </p>
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

      {/* Formulaire de contact d'urgence */}
      <EmergencyContactMemberSelector
        memberId={formData.emergencyContact?.memberId}
        lastName={formData.emergencyContact?.lastName || ''}
        firstName={formData.emergencyContact?.firstName || ''}
        phone1={formData.emergencyContact?.phone1 || ''}
        phone2={formData.emergencyContact?.phone2 || ''}
        relationship={formData.emergencyContact?.relationship || 'Autre'}
        idNumber={formData.emergencyContact?.idNumber || ''}
        typeId={formData.emergencyContact?.typeId || ''}
        documentPhotoUrl={formData.emergencyContact?.documentPhotoUrl || ''}
        onUpdate={handleUpdateEmergencyContact}
        excludeMemberIds={formData.contractType === 'INDIVIDUAL' && formData.memberId ? [formData.memberId] : []}
      />

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
