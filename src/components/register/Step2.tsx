'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin,
} from 'lucide-react'
import { useIsAdminContext } from '@/hooks/useIsAdminContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import AddProvinceModal from '@/domains/infrastructure/geography/components/modals/AddProvinceModal'
import AddCommuneModal from '@/domains/infrastructure/geography/components/modals/AddCommuneModal'
import AddDistrictModal from '@/domains/infrastructure/geography/components/modals/AddDistrictModal'
import AddQuarterModal from '@/domains/infrastructure/geography/components/modals/AddQuarterModal'
import type { Province, Commune, District, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'
import { cn } from '@/lib/utils'
import {
  ProvinceCombobox,
  CommuneCombobox,
  DistrictCombobox,
  QuarterCombobox,
} from '@/domains/infrastructure/geography/components/forms'
import { useAddressCascade } from '@/domains/memberships/hooks/useAddressCascade'
import { useCascadingEntityCreation } from '@/domains/memberships/hooks/useCascadingEntityCreation'

interface Step2Props {
  form: any // Type du form de react-hook-form
}

export default function Step2({ form }: Step2Props) {
  const { register, setValue } = form
  const isAdminContext = useIsAdminContext()
  const queryClient = useQueryClient()
  
  // États pour les modals
  const [showAddProvinceModal, setShowAddProvinceModal] = useState(false)
  const [showAddCommuneModal, setShowAddCommuneModal] = useState(false)
  const [showAddDistrictModal, setShowAddDistrictModal] = useState(false)
  const [showAddQuarterModal, setShowAddQuarterModal] = useState(false)

  // Utiliser le hook centralisé pour la cascade d'adresse
  const { selectedIds } = useAddressCascade({ form })

  // Utiliser le pattern Cascading Dependent Selection avec Optimistic Updates
  const { handleEntityCreated: handleCommuneCreatedOptimistic } = 
    useCascadingEntityCreation<Commune>({
      queryKey: ['communes', 'search'], // Recherche uniquement
      parentContext: {
        key: 'provinceId',
        value: selectedIds.provinceId,
        getParentId: (commune) => commune.departmentId
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      resetChildren: () => {
        setValue('address.districtId', '', { shouldValidate: true })
        setValue('address.quarterId', '', { shouldValidate: true })
      }
    })

  const { handleEntityCreated: handleDistrictCreatedOptimistic } = 
    useCascadingEntityCreation<District>({
      queryKey: ['districts'], // Chargement complet (max 7)
      parentContext: {
        key: 'communeId',
        value: selectedIds.communeId,
        getParentId: (district) => district.communeId
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      resetChildren: () => {
        setValue('address.quarterId', '', { shouldValidate: true })
      }
    })

  const { handleEntityCreated: handleQuarterCreatedOptimistic } = 
    useCascadingEntityCreation<Quarter>({
      queryKey: ['quarters', 'search'], // Recherche uniquement
      parentContext: {
        key: 'districtId',
        value: selectedIds.districtId,
        getParentId: (quarter) => quarter.districtId
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })

  // Handlers pour les modals de création
  const handleProvinceCreated = async (newProvince: Province) => {
    // Pour les provinces : invalidation simple (chargement complet, pas de recherche)
    queryClient.invalidateQueries({ queryKey: ['provinces'] })
    await queryClient.refetchQueries({ queryKey: ['provinces'], type: 'active' })
    setValue('address.provinceId', newProvince.id, { shouldValidate: true })
    setValue('address.province', newProvince.name, { shouldValidate: true })
    // Réinitialiser les niveaux enfants
    setValue('address.communeId', '', { shouldValidate: true })
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
    toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
  }

  const handleCommuneCreated = async (newCommune: Commune) => {
    await handleCommuneCreatedOptimistic(
      newCommune,
      (id) => setValue('address.communeId', id, { shouldValidate: true })
    )
    // Mettre à jour le champ texte
    setValue('address.city', newCommune.name, { shouldValidate: true })
    toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
  }

  const handleDistrictCreated = async (_newDistricts: any[]) => {
    // Après création en masse, rafraîchir la liste des arrondissements
    // NOTE: useDistrictMutations invalide déjà les queries dans onSuccess avec exact: false
    // Mais on force un refetch immédiat pour garantir l'affichage des nouveaux districts
    
    // Petit délai pour s'assurer que le modal est fermé et que le composant est prêt
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Forcer le refetch de la query pour la commune sélectionnée
    // Utiliser type: 'all' pour forcer le refetch même si la query n'est pas "active"
    if (selectedIds.communeId) {
      // Invalider d'abord pour s'assurer que la query est marquée comme stale
      queryClient.invalidateQueries({ 
        queryKey: ['districts', selectedIds.communeId],
        exact: true
      })
      
      // Puis forcer le refetch
      await queryClient.refetchQueries({ 
        queryKey: ['districts', selectedIds.communeId],
        exact: true,
        type: 'all' // Force le refetch même si la query n'est pas active
      })
    }
    
    // Ne pas sélectionner automatiquement car plusieurs arrondissements ont été créés
    // L'utilisateur pourra choisir parmi les nouveaux arrondissements créés
    toast.success('Arrondissements créés avec succès')
  }

  const handleDistrictCreatedSingle = async (newDistrict: District) => {
    await handleDistrictCreatedOptimistic(
      newDistrict,
      (id) => setValue('address.districtId', id, { shouldValidate: true })
    )
    // Mettre à jour le champ texte
    setValue('address.arrondissement', newDistrict.name, { shouldValidate: true })
    toast.success(`Arrondissement "${newDistrict.name}" créé et sélectionné`)
  }

  const handleQuarterCreated = async (newQuarter: Quarter) => {
    await handleQuarterCreatedOptimistic(
      newQuarter,
      (id) => setValue('address.quarterId', id, { shouldValidate: true })
    )
    // Mettre à jour le champ texte
    setValue('address.district', newQuarter.name, { shouldValidate: true })
    toast.success(`Quartier "${newQuarter.name}" créé et sélectionné`)
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-linear-to-r from-kara-primary-dark/10 via-kara-primary-light/10 to-kara-primary-dark/10 rounded-full shadow-lg border border-kara-primary-dark/20">
          <MapPin className="w-6 h-6 text-kara-primary-dark" />
          <span className="text-kara-primary-dark font-bold text-base sm:text-lg">Adresse de résidence</span>
        </div>
        <p className="text-kara-primary-dark/80 text-sm sm:text-base wrap-break-word font-medium">
          Sélectionnez votre localisation pour compléter votre adresse
        </p>
      </div>

      {/* Illustration de carte stylisée */}
      <div className="relative overflow-hidden bg-linear-to-br from-kara-primary-dark/5 via-kara-primary-light/5 to-kara-primary-dark/10 rounded-2xl p-6 sm:p-8 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full shadow-lg border border-kara-primary-dark/20">
        <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-linear-to-bl from-kara-primary-dark/20 to-transparent rounded-full opacity-30 -translate-y-12 sm:-translate-y-20 translate-x-12 sm:translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-linear-to-tr from-kara-primary-light/20 to-transparent rounded-full opacity-30 translate-y-10 sm:translate-y-16 -translate-x-10 sm:-translate-x-16"></div>
        <div className="relative flex items-center justify-center space-x-4 sm:space-x-6 py-4 sm:py-6">
          <div className="flex items-center space-x-3 text-kara-primary-dark text-sm sm:text-base">
            <span className="font-bold">Géolocalisation</span>
          </div>
          <div className="w-3 h-3 bg-linear-to-r from-kara-primary-dark to-kara-primary-light rounded-full animate-pulse shadow-lg"></div>
          <div className="flex items-center space-x-3 text-kara-primary-light text-sm sm:text-base">
            <span className="font-bold">Gabon</span>
          </div>
        </div>
      </div>

      {/* Formulaire avec les 4 Combobox en cascade */}
      <div className="space-y-4 sm:space-y-6 w-full">
        {/* Ligne 1 : Province et Ville */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* Province */}
          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full">
            <ProvinceCombobox
              form={form}
              onAddNew={isAdminContext ? () => setShowAddProvinceModal(true) : undefined}
            />
          </div>

          {/* Ville (Commune) */}
          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-300 w-full">
            <CommuneCombobox
              form={form}
              provinceId={selectedIds.provinceId || undefined}
              onAddNew={isAdminContext ? () => setShowAddCommuneModal(true) : undefined}
            />
          </div>
        </div>

        {/* Ligne 2 : Arrondissement et Quartier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* Arrondissement (District) */}
          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full">
            <DistrictCombobox
              form={form}
              communeId={selectedIds.communeId || undefined}
              onAddNew={isAdminContext ? () => setShowAddDistrictModal(true) : undefined}
            />
          </div>

          {/* Quartier (Quarter) */}
          <div className="animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full">
            <QuarterCombobox
              form={form}
              districtId={selectedIds.districtId || undefined}
              onAddNew={isAdminContext ? () => setShowAddQuarterModal(true) : undefined}
            />
          </div>
        </div>

        {/* Informations complémentaires */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full">
          <Label htmlFor="additionalInfo" className="text-xs sm:text-sm font-medium text-kara-primary-dark">
            Informations complémentaires
            <Badge variant="secondary" className="ml-2 bg-kara-primary-light/10 text-kara-primary-light text-[10px] sm:text-xs">
              Optionnel
            </Badge>
          </Label>
          <div className="relative w-full">
            <Textarea
              id="additionalInfo"
              {...register('address.additionalInfo')}
              placeholder="Ex: Proche du marché, après la pharmacie, bâtiment bleu..."
              rows={4}
              className={cn(
                "w-full border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 resize-none"
              )}
            />
          </div>
          <div className="text-xs text-gray-500 flex items-center space-x-1 wrap-break-word">
            <span>Ces détails aideront à mieux vous localiser</span>
          </div>
        </div>
      </div>

      {/* Modals de création rapide (uniquement en contexte admin) */}
      {isAdminContext && (
        <>
          <AddProvinceModal
            open={showAddProvinceModal}
            onClose={() => setShowAddProvinceModal(false)}
            onSuccess={handleProvinceCreated}
          />
          <AddCommuneModal
            open={showAddCommuneModal}
            onClose={() => setShowAddCommuneModal(false)}
            onSuccess={handleCommuneCreated}
            provinceId={selectedIds.provinceId || undefined}
          />
          <AddDistrictModal
            open={showAddDistrictModal}
            onClose={() => setShowAddDistrictModal(false)}
            onSuccess={handleDistrictCreated} // Création en masse (retourne tableau vide)
            communeId={selectedIds.communeId || undefined}
          />
          <AddQuarterModal
            open={showAddQuarterModal}
            onClose={() => setShowAddQuarterModal(false)}
            onSuccess={handleQuarterCreated}
            districtId={selectedIds.districtId || undefined}
          />
        </>
      )}
    </div>
  )
}
