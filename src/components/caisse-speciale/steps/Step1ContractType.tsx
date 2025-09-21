"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  User, 
  Search, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EntitySearchResult } from '@/types/types'
import { createTestUsers } from '@/utils/test-users'
import { createTestGroups } from '@/utils/test-groups'
import { debugUsers } from '@/utils/debug-users'

export function Step1ContractType() {
  const { state, updateFormData, validateCurrentStep } = useContractForm()
  const { formData } = state
  
  const {
    searchQuery,
    results,
    isLoading,
    error,
    setSearchQuery,
    resetSearch
  } = useEntitySearch(formData.contractType)

  const [selectedEntity, setSelectedEntity] = useState<EntitySearchResult | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Référence pour le conteneur de recherche
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Validation de l'étape
  useEffect(() => {
    const isValid = Boolean(formData.contractType && 
      ((formData.contractType === 'INDIVIDUAL' && formData.memberId) ||
       (formData.contractType === 'GROUP' && formData.groupeId)))
    
    validateCurrentStep(isValid)
  }, [formData.contractType, formData.memberId, formData.groupeId, validateCurrentStep])

  // Restaurer l'état de l'entité sélectionnée quand on revient à cette étape
  useEffect(() => {
    const restoreSelectedEntity = async () => {
      // Éviter de restaurer si l'entité est déjà sélectionnée avec le bon ID
      if (selectedEntity && 
          ((formData.contractType === 'INDIVIDUAL' && selectedEntity.id === formData.memberId) ||
           (formData.contractType === 'GROUP' && selectedEntity.id === formData.groupeId))) {
        return
      }

      // Si on a un membreId, on doit restaurer l'entité membre
      if (formData.contractType === 'INDIVIDUAL' && formData.memberId) {
        console.log('🔄 Restauration de l\'entité membre:', formData.memberId)
        try {
          // Récupérer les vraies données du membre
          const { getUserById } = await import('@/db/user.db')
          const user = await getUserById(formData.memberId)
          if (user) {
            const memberEntity: EntitySearchResult = {
              id: user.id,
              displayName: `${user.firstName} ${user.lastName}`,
              type: 'member',
              additionalInfo: `Matricule: ${user.matricule}`,
              photoURL: user.photoURL || undefined,
              contacts: user.contacts || []
            }
            setSelectedEntity(memberEntity)
          }
        } catch (error) {
          console.error('❌ Erreur lors de la restauration du membre:', error)
          // Fallback avec des données temporaires
          const tempMember: EntitySearchResult = {
            id: formData.memberId,
            displayName: `Membre ${formData.memberId}`,
            type: 'member',
            additionalInfo: `Matricule: ${formData.memberId}`,
            photoURL: undefined,
            contacts: []
          }
          setSelectedEntity(tempMember)
        }
      }
      
      // Si on a un groupeId, on doit restaurer l'entité groupe
      if (formData.contractType === 'GROUP' && formData.groupeId) {
        console.log('🔄 Restauration de l\'entité groupe:', formData.groupeId)
        try {
          // Récupérer les vraies données du groupe
          const { getGroupById } = await import('@/db/group.db')
          const group = await getGroupById(formData.groupeId)
          if (group) {
            const groupEntity: EntitySearchResult = {
              id: group.id,
              displayName: group.name,
              type: 'group',
              additionalInfo: group.description || `Groupe créé le ${group.createdAt.toLocaleDateString('fr-FR')}`,
              photoURL: undefined,
              contacts: []
            }
            setSelectedEntity(groupEntity)
          }
        } catch (error) {
          console.error('❌ Erreur lors de la restauration du groupe:', error)
          // Fallback avec des données temporaires
          const tempGroup: EntitySearchResult = {
            id: formData.groupeId,
            displayName: `Groupe ${formData.groupeId}`,
            type: 'group',
            additionalInfo: `Groupe sélectionné`,
            photoURL: undefined,
            contacts: []
          }
          setSelectedEntity(tempGroup)
        }
      }

      // Si on n'a ni membreId ni groupeId, on doit nettoyer la sélection
      if (!formData.memberId && !formData.groupeId) {
        setSelectedEntity(null)
      }
    }

    restoreSelectedEntity()
  }, [formData.contractType, formData.memberId, formData.groupeId, selectedEntity])

  // Gestion de la sélection du type de contrat
  const handleContractTypeChange = (type: 'INDIVIDUAL' | 'GROUP') => {
    updateFormData({ 
      contractType: type,
      memberId: type === 'INDIVIDUAL' ? '' : undefined,
      groupeId: type === 'GROUP' ? '' : undefined
    })
    setSelectedEntity(null)
    resetSearch()
    setShowSearchResults(false)
  }

  // Mettre à jour le type de recherche quand le type de contrat change
  useEffect(() => {
    if (formData.contractType === 'INDIVIDUAL') {
      // Forcer la recherche de membres uniquement
      console.log('🔄 Changement vers recherche de membres')
    } else if (formData.contractType === 'GROUP') {
      // Forcer la recherche de groupes uniquement
      console.log('🔄 Changement vers recherche de groupes')
    }
  }, [formData.contractType])

  // Gestion de la sélection d'une entité
  const handleEntitySelect = (entity: EntitySearchResult) => {
    setSelectedEntity(entity)
    setShowSearchResults(false)
    
    if (entity.type === 'member') {
      updateFormData({ memberId: entity.id })
    } else if (entity.type === 'group') {
      updateFormData({ groupeId: entity.id })
    }
  }

  // Gestion de la suppression de la sélection
  const handleClearSelection = () => {
    setSelectedEntity(null)
    if (formData.contractType === 'INDIVIDUAL') {
      updateFormData({ memberId: '' })
    } else {
      updateFormData({ groupeId: '' })
    }
  }

  // Gestion du focus sur la recherche
  const handleSearchFocus = () => {
    if (searchQuery.trim().length >= 2) {
      setShowSearchResults(true)
    }
  }

  // Gestion du changement de requête de recherche
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim().length >= 2) {
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
    }
  }

  // Gestion du clic en dehors des résultats
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setShowSearchResults(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fonction temporaire pour créer des données de test
  const handleCreateTestData = async () => {
    try {
      console.log('🧪 Création des données de test...')
      await createTestUsers()
      await createTestGroups()
      console.log('✅ Données de test créées avec succès!')
      alert('Données de test créées avec succès! Vous pouvez maintenant tester la recherche.')
    } catch (error) {
      console.error('❌ Erreur lors de la création des données de test:', error)
      alert('Erreur lors de la création des données de test')
    }
  }

  // Fonction de débogage
  const handleDebugUsers = async () => {
    try {
      await debugUsers()
    } catch (error) {
      console.error('❌ Erreur lors du débogage:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Titre de l'étape */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Type de contrat
        </h2>
        <p className="text-gray-600">
          Choisissez le type de contrat et sélectionnez le membre ou le groupe concerné
        </p>
        
        {/* Boutons temporaires pour le débogage */}
        <div className="mt-4 flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTestData}
            className="text-xs"
          >
            🧪 Créer données de test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDebugUsers}
            className="text-xs"
          >
            🔍 Déboguer utilisateurs
          </Button>
        </div>
      </div>

      {/* Sélection du type de contrat */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Type de contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contrat individuel */}
            <Button
              variant={formData.contractType === 'INDIVIDUAL' ? 'default' : 'outline'}
              onClick={() => handleContractTypeChange('INDIVIDUAL')}
              className={cn(
                "h-20 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.contractType === 'INDIVIDUAL'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <User className="w-6 h-6" />
              <span className="font-semibold">Contrat Individuel</span>
              <span className="text-xs opacity-80">Pour un membre spécifique</span>
            </Button>

            {/* Contrat de groupe */}
            <Button
              variant={formData.contractType === 'GROUP' ? 'default' : 'outline'}
              onClick={() => handleContractTypeChange('GROUP')}
              className={cn(
                "h-20 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.contractType === 'GROUP'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Users className="w-6 h-6" />
              <span className="font-semibold">Contrat de Groupe</span>
              <span className="text-xs opacity-80">Pour plusieurs membres</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sélection de l'entité (membre ou groupe) */}
      {formData.contractType && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              Sélectionner {formData.contractType === 'INDIVIDUAL' ? 'un membre' : 'un groupe'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recherche */}
            <div ref={searchContainerRef} className="relative">
              <Label htmlFor="entity-search" className="text-sm font-medium text-gray-700 mb-2 block">
                {formData.contractType === 'INDIVIDUAL' 
                  ? 'Rechercher par nom, matricule ou description'
                  : 'Rechercher par nom du groupe ou description'
                }
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  id="entity-search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  placeholder={
                    formData.contractType === 'INDIVIDUAL' 
                      ? 'Rechercher un membre par nom, matricule...'
                      : 'Rechercher un groupe par nom...'
                  }
                  className="pl-10 h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                />
              </div>
            </div>

            {/* Résultats de recherche affichés clairement */}
            {searchQuery.trim().length >= 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Résultats de recherche
                  </h3>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Recherche en cours...
                    </div>
                  )}
                </div>

                {error ? (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700 font-medium">Erreur : {error}</span>
                    </div>
                  </div>
                ) : results.length === 0 && !isLoading ? (
                  <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg text-center">
                    <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Aucun résultat trouvé</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Essayez avec d'autres termes de recherche
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {results.map((entity) => (
                      <div
                        key={entity.id}
                        className={cn(
                          "p-4 border-2 rounded-lg cursor-pointer transition-all duration-200",
                          selectedEntity?.id === entity.id
                            ? "border-green-500 bg-green-50 shadow-md"
                            : "border-gray-200 hover:border-[#234D65] hover:bg-[#234D65]/5"
                        )}
                        onClick={() => handleEntitySelect(entity)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar/Photo */}
                          <div className="flex-shrink-0">
                            {entity.photoURL ? (
                              <img
                                src={entity.photoURL}
                                alt={entity.displayName}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center border-2",
                                selectedEntity?.id === entity.id
                                  ? "bg-green-100 border-green-300"
                                  : "bg-gray-100 border-gray-200"
                              )}>
                                {entity.type === 'member' ? (
                                  <User className="w-6 h-6 text-gray-600" />
                                ) : (
                                  <Users className="w-6 h-6 text-gray-600" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Informations */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {entity.displayName}
                              </h4>
                              <Badge 
                                variant={selectedEntity?.id === entity.id ? "default" : "secondary"}
                                className={cn(
                                  "text-xs",
                                  selectedEntity?.id === entity.id && "bg-green-600"
                                )}
                              >
                                {entity.type === 'member' ? 'Membre' : 'Groupe'}
                              </Badge>
                              {selectedEntity?.id === entity.id && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {entity.type === 'member' 
                                ? entity.additionalInfo // Pour les membres : "Matricule: XXX"
                                : entity.additionalInfo // Pour les groupes : description ou date de création
                              }
                            </p>
                            {entity.type === 'member' && entity.contacts && entity.contacts.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                📞 {entity.contacts.join(', ')}
                              </p>
                            )}
                            {entity.type === 'group' && (
                              <p className="text-xs text-gray-500 mt-1">
                                👥 Groupe
                              </p>
                            )}
                          </div>

                          {/* Indicateur de sélection */}
                          {selectedEntity?.id === entity.id && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Entité sélectionnée */}
            {selectedEntity && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedEntity.photoURL ? (
                      <img
                        src={selectedEntity.photoURL}
                        alt={selectedEntity.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        {selectedEntity.type === 'member' ? (
                          <User className="w-6 h-6 text-green-600" />
                        ) : (
                          <Users className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-900">
                          {selectedEntity.displayName}
                        </span>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-sm text-green-700">
                        {selectedEntity.additionalInfo}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
