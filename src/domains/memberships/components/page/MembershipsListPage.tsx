'use client'
import React from 'react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  UserCheck,
  UserX,
  Clock,
  Zap,
  Target,
  Cake,
} from 'lucide-react'
import { useMembershipsListV2 } from '@/domains/memberships/hooks/useMembershipsListV2'
import { useMembershipStats } from '@/domains/memberships/hooks/useMembershipStats'
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
import { toast } from 'sonner'
import { createTestUserWithSubscription, createTestUserWithExpiredSubscription, createTestUserWithoutSubscription, createTestUserWithAddressAndProfession, createTestUserWithBirthdayToday } from '@/utils/test-data'
import { debugFirebaseData, debugUserSubscriptions } from '@/utils/debug-data'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ExportMembershipModal from '@/components/memberships/ExportMembershipModal'
import { GenererIdentifiantModal } from '@/domains/memberships/components/modals'
import { UploadMemberAdhesionPdfModal } from '@/domains/memberships/components/modals/UploadMemberAdhesionPdfModal'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useDocumentViewer } from '@/components/documents/DocumentViewerProvider'

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
  const { openDocument } = useDocumentViewer()
  // États
  const [filters, setFilters] = useState<UserFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10) // Valeur par défaut : 10 pour correspondre aux options du sélecteur
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState<MembersTab>('all')
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [adhesionUploadMember, setAdhesionUploadMember] = useState<MemberWithSubscription | null>(null)
  const { user } = useAuth()
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [genererIdentifiantOpen, setGenererIdentifiantOpen] = useState(false)
  const [genererIdentifiantMember, setGenererIdentifiantMember] = useState<{
    memberId: string
    matricule: string
  } | null>(null)

  // React Query V2
  const {
    data: membersData,
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

  // Stats globales (sur l'ensemble des membres, pas seulement la page courante)
  const { stats } = useMembershipStats({ fetchGlobal: true })

  // Référence pour comparer les filtres précédents
  const prevFiltersRef = useRef<string>(JSON.stringify(filters))

  // Synchroniser les filtres avec le tab actif.
  // ⚠️ On RÉINITIALISE d'abord les filtres injectés par les onglets (membershipType,
  // isActive) pour ne pas garder ceux de l'onglet précédent (ex. passer d'« Adhérents »
  // à « Abonnement valide » ne doit plus rester filtré sur adherant), puis on applique
  // ceux du nouvel onglet. Les filtres du panneau (recherche, géo…) sont conservés.
  useEffect(() => {
    const tabFilters = MembershipsListService.buildFiltersForTab({}, activeTab)
    setFilters(prevFilters => {
      const next = { ...prevFilters }
      delete next.membershipType
      delete next.isActive
      if (tabFilters.membershipType) next.membershipType = tabFilters.membershipType
      if (tabFilters.isActive !== undefined) next.isActive = tabFilters.isActive
      return next
    })
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

  const router = useRouter()
  
  const handleViewDetails = (memberId: string) => {
    // Naviguer vers la page de détails du membre
    router.push(routes.admin.membershipDetails(memberId))
  }

  const handlePreviewAdhesion = (url: string | null) => {
    if (url) {
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    } else {
      toast.info("Aucune fiche d'adhésion disponible pour ce membre")
    }
  }

  // Membre sans PDF d'adhésion (ex. importé) → ouvrir la modale de téléversement.
  const handleUploadAdhesion = (member: MemberWithSubscription) => {
    setAdhesionUploadMember(member)
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

  const handleGenererIdentifiant = (memberId: string, matricule: string) => {
    setGenererIdentifiantMember({ memberId, matricule })
    setGenererIdentifiantOpen(true)
  }

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
  const allMembers: MemberWithSubscription[] = membersData?.data || []
  // La validité d'abonnement étant calculée côté client (non requêtable Firestore),
  // on filtre ici les onglets « Abonnement valide / invalide ».
  const membersWithSubscriptions: MemberWithSubscription[] =
    activeTab === 'abonnement-valide'
      ? allMembers.filter((m) => m.isSubscriptionValid)
      : activeTab === 'abonnement-invalide'
        ? allMembers.filter((m) => !m.isSubscriptionValid)
        : allMembers

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

      {/* Barre d'actions moderne */}
      <MembershipsListHeader
        totalItems={membersData?.pagination.totalItems ?? 0}
        currentPage={currentPage}
        viewMode={viewMode}
        isLoading={isLoading}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onExport={handleExport}
        pagination={membersData?.pagination}
        onPageChange={handlePageChange}
      />

      {/* Tabs de filtres (rattachés directement à la liste) */}
      <MembershipsListTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setCurrentPage(1)
        }}
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
            onUploadAdhesion={handleUploadAdhesion}
            onGenererIdentifiant={handleGenererIdentifiant}
            isLoading={isLoading}
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
      {/* Modal des détails supprimée: désormais sur page dédiée /memberships/{id} */}

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
                <Button variant="outline" onClick={() => openDocument({ url: previewUrl, filename: 'fiche_adhesion.pdf', title: "Fiche d'adhésion" })}>
                  Télécharger
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
      {genererIdentifiantMember && (
        <GenererIdentifiantModal
          open={genererIdentifiantOpen}
          onOpenChange={(open) => {
            setGenererIdentifiantOpen(open)
            if (!open) setGenererIdentifiantMember(null)
          }}
          memberId={genererIdentifiantMember.memberId}
          matricule={genererIdentifiantMember.matricule}
        />
      )}
      <UploadMemberAdhesionPdfModal
        isOpen={!!adhesionUploadMember}
        onClose={() => setAdhesionUploadMember(null)}
        member={adhesionUploadMember}
        adminId={user?.uid || ''}
      />
    </div>
  )
}
