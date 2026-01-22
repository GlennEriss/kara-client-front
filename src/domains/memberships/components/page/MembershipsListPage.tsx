'use client'
import React from 'react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Target,
  Cake,
} from 'lucide-react'
import { useMembershipsListV2 } from '@/domains/memberships/hooks/useMembershipsListV2'
import {
  MembershipsListStats,
  MembershipsListHeader,
  MembershipsListSkeleton,
  MembershipsListLayout,
  MembershipsListEmptyState,
  MembershipsListPagination,
  MembershipsListErrorState,
  MembershipsListTabs,
  MembershipsListFilters,
} from '@/domains/memberships/components/list'
import type { MembersTab } from '@/domains/memberships/services/MembershipsListService'
import { MembershipsListService } from '@/domains/memberships/services/MembershipsListService'
import { UserFilters } from '@/types/types'
import { MemberWithSubscription } from '@/db/member.db'
import routes from '@/constantes/routes'
import MemberDetailsWrapper from '@/components/memberships/MemberDetailsWrapper'
import { toast } from 'sonner'
import { createTestUserWithSubscription, createTestUserWithExpiredSubscription, createTestUserWithoutSubscription, createTestUserWithAddressAndProfession, createTestUserWithBirthdayToday } from '@/utils/test-data'
import { debugFirebaseData, debugUserSubscriptions } from '@/utils/debug-data'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ExportMembershipModal from '@/components/memberships/ExportMembershipModal'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'

// Fonction utilitaire pour vérifier si c'est l'anniversaire d'un membre
const isBirthdayToday = (birthDate: string): boolean => {
  if (!birthDate) return false
  
  try {
    const today = new Date()
    const birth = new Date(birthDate)
    
    // Comparer jour et mois (ignorer l'année)
    return today.getDate() === birth.getDate() && 
           today.getMonth() === birth.getMonth()
  } catch {
    return false
  }
}

// Fonction utilitaire pour récupérer les détails d'identité de manière sécurisée
const getUserDisplayName = (user: MemberWithSubscription): string => {
  const firstName = user.firstName?.trim() || ''
  const lastName = user.lastName?.trim() || ''
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  } else if (firstName) {
    return firstName
  } else if (lastName) {
    return lastName
  } else {
    return 'Utilisateur'
  }
}

/**
 * Page principale de la liste des membres (V2)
 * 
 * Composant container qui orchestre tous les sous-composants de la liste des membres.
 * Utilise l'architecture V2 avec hooks, services et repositories.
 */
export function MembershipsListPage() {
  // États
  const [filters, setFilters] = useState<UserFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10) // Valeur par défaut : 10 pour correspondre aux options du sélecteur
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState<MembersTab>('all')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<MemberWithSubscription | null>(null)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // React Query V2
  const { 
    data: membersData, 
    stats,
    isLoading, 
    isError,
    error, 
    refetch,
    goToNextPage,
    goToPrevPage,
    canGoNext,
    canGoPrev,
  } = useMembershipsListV2({
    filters,
    page: currentPage,
    limit: itemsPerPage,
    tab: activeTab,
  })

  // Référence pour comparer les filtres précédents
  const prevFiltersRef = useRef<string>(JSON.stringify(filters))

  // Synchroniser les filtres avec le tab actif
  useEffect(() => {
    if (activeTab !== 'all') {
      // Construire les filtres pour le tab actif
      const tabFilters = MembershipsListService.buildFiltersForTab({}, activeTab)
      
      // Mettre à jour les filtres pour refléter le tab
      // On garde les autres filtres (recherche, géographie, etc.) mais on force les filtres du tab
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters }
        
        // Appliquer les filtres du tab (écrase les filtres correspondants)
        if (tabFilters.membershipType) {
          newFilters.membershipType = tabFilters.membershipType
        }
        
        if (tabFilters.isActive !== undefined) {
          newFilters.isActive = tabFilters.isActive
        }
        
        return newFilters
      })
    }
    // Note: Sur le tab "all", on garde les filtres existants (l'utilisateur peut les modifier librement)
  }, [activeTab])

  // Gestionnaires d'événements
  // Note: On réinitialise la page UNIQUEMENT si les filtres ont vraiment changé
  const handleFiltersChange = useCallback((newFilters: UserFilters) => {
    const newFiltersStr = JSON.stringify(newFilters)
    const filtersActuallyChanged = prevFiltersRef.current !== newFiltersStr
    
    if (filtersActuallyChanged) {
      prevFiltersRef.current = newFiltersStr
      setFilters(newFilters)
      setCurrentPage(1) // Réinitialiser la page seulement si les filtres ont changé
    }
  }, [])

  const handleResetFilters = () => {
    setFilters({})
    setCurrentPage(1)
    toast.success('🔄 Filtres réinitialisés', {
      description: 'Tous les filtres ont été remis à zéro',
      duration: 3000,
    })
  }

  const handlePageChange = (page: number) => {
    console.log('📄 [MembershipsListPage] Changement de page:', { from: currentPage, to: page })
    
    // Toujours mettre à jour currentPage pour que l'UI reflète le changement
    // et que React Query refetch avec la bonne clé de cache
    setCurrentPage(page)
    
    // Note: On utilise toujours la pagination classique (par numéro de page)
    // pour garantir la cohérence entre l'UI et les données
    // Les curseurs sont une optimisation qui peut être ajoutée plus tard si nécessaire
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleViewSubscriptions = (memberId: string) => {
    // Rediriger vers la page dédiée des abonnements
    window.location.href = routes.admin.membershipSubscription(memberId)
  }

  const handleViewDetails = (memberId: string) => {
    const member = membersWithSubscriptions.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setIsDetailsModalOpen(true)
    }
  }

  const handlePreviewAdhesion = (url: string | null) => {
    if (url) {
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    } else {
      toast.info("Aucune fiche d'adhésion disponible pour ce membre")
    }
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('✅ Données actualisées', {
        description: 'La liste des membres a été rechargée',
        duration: 3000,
      })
    } catch {
      toast.error('❌ Erreur lors de l\'actualisation', {
        description: 'Impossible de recharger les données',
        duration: 4000,
      })
    }
  }

  const handleExport = () => setIsExportOpen(true)

  // Fonctions de test (en développement uniquement)
  const handleCreateTestUser = async () => {
    try {
      toast.info('👤 Création d\'un utilisateur de test...', { duration: 2000 })
      await createTestUserWithSubscription()
      toast.success('✅ Utilisateur créé avec abonnement valide')
      refetch()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateExpiredUser = async () => {
    try {
      toast.info('⏰ Création d\'un utilisateur avec abonnement expiré...', { duration: 2000 })
      await createTestUserWithExpiredSubscription()
      toast.success('✅ Utilisateur créé avec abonnement expiré')
      refetch()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateUserNoSub = async () => {
    try {
      toast.info('👤 Création d\'un utilisateur sans abonnement...', { duration: 2000 })
      await createTestUserWithoutSubscription()
      toast.success('✅ Utilisateur créé sans abonnement')
      refetch()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateUserWithFilters = async () => {
    try {
      toast.info('🔍 Création d\'un utilisateur avec données de filtres...', { duration: 2000 })
      await createTestUserWithAddressAndProfession()
      toast.success('✅ Utilisateur créé avec données complètes')
      refetch()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateUserWithBirthday = async () => {
    try {
      toast.info('🎂 Création d\'un utilisateur avec anniversaire aujourd\'hui...', { duration: 2000 })
      await createTestUserWithBirthdayToday()
      toast.success('🎉 Utilisateur créé avec anniversaire aujourd\'hui !')
      refetch()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleDebugData = async () => {
    try {
      toast.info('🔍 Analyse des données Firebase...', { duration: 2000 })
      await debugFirebaseData()
      toast.success('🔍 Analyse terminée - vérifiez la console')
    } catch (error) {
      toast.error('❌ Erreur lors de l\'analyse')
    }
  }

  const handleDebugFirstUser = async () => {
    try {
      if (membersWithSubscriptions.length > 0) {
        const firstUser = membersWithSubscriptions[0]
        toast.info(`🔍 Analyse de ${getUserDisplayName(firstUser)}...`, { duration: 2000 })
        await debugUserSubscriptions(firstUser.id)
        toast.success('🔍 Analyse utilisateur terminée - vérifiez la console')
      } else {
        toast.warning('⚠️ Aucun utilisateur à analyser')
      }
    } catch (error) {
      toast.error('❌ Erreur lors de l\'analyse')
    }
  }

  // Transformation des données
  const membersWithSubscriptions: MemberWithSubscription[] = membersData?.data || []

  // Gestion des erreurs
  if (isError || error) {
    return <MembershipsListErrorState onRetry={handleRefresh} />
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500" data-testid="memberships-list-page">
      {/* Statistiques modernes */}
      {stats && (
        <MembershipsListStats stats={stats} />
      )}

      {/* Boutons de test modernisés */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-linear-to-r from-amber-50 via-yellow-50 to-orange-50 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mr-4">
                <div className="p-2 rounded-lg bg-amber-200">
                  <Zap className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-bold text-amber-800">🧪 Outils de Test</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestUser}
                className="bg-white border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Utilisateur + Abo Valide
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateExpiredUser}
                className="bg-white border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Utilisateur + Abo Expiré
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateUserNoSub}
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <UserX className="w-4 h-4 mr-2" />
                Utilisateur Sans Abo
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateUserWithFilters}
                className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Utilisateur + Filtres
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateUserWithBirthday}
                className="bg-white border-pink-300 text-pink-700 hover:bg-pink-50 hover:border-pink-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Cake className="w-4 h-4 mr-2" />
                Utilisateur Anniversaire
              </Button>
              
              <div className="border-l border-amber-300 pl-3 ml-3">
                <span className="text-xs font-bold text-amber-700 mr-3">Debug:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebugData}
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 hover:scale-105 shadow-sm mr-2"
                >
                  🔍 Firebase
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebugFirstUser}
                  className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-300 hover:scale-105 shadow-sm"
                >
                  🔍 Premier User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres modernisés */}
      <MembershipsListFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setCurrentPage(1)
        }}
      />

      {/* Tabs de filtres */}
      <MembershipsListTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setCurrentPage(1)
        }}
      />

      {/* Barre d'actions moderne */}
      <MembershipsListHeader
        totalItems={membersData?.pagination.totalItems ?? 0}
        currentPage={currentPage}
        viewMode={viewMode}
        isLoading={isLoading}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      {/* Liste des membres */}
      {isLoading ? (
        <MembershipsListSkeleton viewMode={viewMode} itemsPerPage={itemsPerPage} />
      ) : membersWithSubscriptions.length > 0 ? (
        <>
          <MembershipsListLayout
            members={membersWithSubscriptions}
            viewMode={viewMode}
            onViewSubscriptions={handleViewSubscriptions}
            onViewDetails={handleViewDetails}
            onPreviewAdhesion={handlePreviewAdhesion}
          />

          {/* Pagination moderne */}
          {membersData && (
            <MembershipsListPagination
              pagination={membersData.pagination}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={isLoading}
            />
          )}
        </>
      ) : (
        <MembershipsListEmptyState filters={filters} onResetFilters={handleResetFilters} />
      )}

      {/* Modals */}
      {/* Modal des abonnements supprimé: désormais sur page dédiée */}

      {selectedMember && (
        <MemberDetailsWrapper
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedMember(null)
          }}
          dossierId={selectedMember.dossier}
          memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
        />
      )}

      {/* Prévisualisation fiche d'adhésion */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Fiche d'adhésion</DialogTitle>
            <DialogDescription className="text-gray-600">Prévisualisation du PDF</DialogDescription>
          </DialogHeader>
          <div className="hidden md:block">
            {previewUrl && (
              <iframe src={`${previewUrl}#toolbar=1`} className="w-full h-[70vh] rounded-lg border" />
            )}
          </div>
          <div className="md:hidden space-y-3">
            <p className="text-sm text-gray-600">La prévisualisation sur mobile peut être limitée.</p>
            <div className="flex gap-2">
              <Button onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer') }} className="bg-[#234D65] hover:bg-[#234D65] text-white">Ouvrir</Button>
              {previewUrl && (
                <Button variant="outline" asChild>
                  <a href={previewUrl} download>Télécharger</a>
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExportMembershipModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} filters={filters} />
    </div>
  )
}
