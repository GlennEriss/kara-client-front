'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  RefreshCw, 
  Grid3X3, 
  List,
  AlertCircle,
  FileDown,
  Plus
} from 'lucide-react'
import { useMembers } from '@/hooks/useMembers'
import { UserFilters } from '@/types/types'
import { MemberWithSubscription } from '@/db/member.db'
import MemberStats from './MemberStats'
import MemberFilters from './MemberFilters'
import MemberCard from './MemberCard'
import MemberSubscriptionModal from './MemberSubscriptionModal'
import MemberDetailsWrapper from './MemberDetailsWrapper'
import MembershipPagination from './MembershipPagination'
import { toast } from 'sonner'
import { createTestUserWithSubscription, createTestUserWithExpiredSubscription, createTestUserWithoutSubscription } from '@/utils/test-data'
import { debugFirebaseData, debugUserSubscriptions } from '@/utils/debug-data'

type ViewMode = 'grid' | 'list'

const MembershipList = () => {
  // États
  const [filters, setFilters] = useState<UserFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<MemberWithSubscription | null>(null)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // React Query
  const { 
    data: membersData, 
    isLoading, 
    error, 
    refetch 
  } = useMembers(filters, currentPage, itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({})
    setCurrentPage(1)
    toast.success('Filtres réinitialisés')
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleViewSubscriptions = (memberId: string) => {
    setSelectedMemberId(memberId)
    setIsSubscriptionModalOpen(true)
  }

  const handleViewDetails = (memberId: string) => {
    // Trouver le membre correspondant pour avoir accès au dossierId
    const member = membersWithSubscriptions.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setIsDetailsModalOpen(true)
    }
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('Données actualisées')
    } catch {
      toast.error('Erreur lors de l\'actualisation')
    }
  }

  const handleExport = () => {
    toast.info('Fonctionnalité d\'export en cours de développement')
  }

  // Fonctions de test (en développement uniquement)
  const handleCreateTestUser = async () => {
    try {
      toast.info('Création d\'un utilisateur de test...')
      await createTestUserWithSubscription()
      toast.success('Utilisateur de test créé avec abonnement valide')
      refetch()
    } catch (error) {
      toast.error('Erreur lors de la création de l\'utilisateur de test')
    }
  }

  const handleCreateExpiredUser = async () => {
    try {
      toast.info('Création d\'un utilisateur avec abonnement expiré...')
      await createTestUserWithExpiredSubscription()
      toast.success('Utilisateur de test créé avec abonnement expiré')
      refetch()
    } catch (error) {
      toast.error('Erreur lors de la création de l\'utilisateur de test')
    }
  }

  const handleCreateUserNoSub = async () => {
    try {
      toast.info('Création d\'un utilisateur sans abonnement...')
      await createTestUserWithoutSubscription()
      toast.success('Utilisateur de test créé sans abonnement')
      refetch()
    } catch (error) {
      toast.error('Erreur lors de la création de l\'utilisateur de test')
    }
  }

  const handleDebugData = async () => {
    try {
      toast.info('🔍 Analyse des données Firebase...')
      await debugFirebaseData()
      toast.success('🔍 Analyse terminée - vérifiez la console')
    } catch (error) {
      toast.error('Erreur lors de l\'analyse des données')
    }
  }

  const handleDebugFirstUser = async () => {
    try {
      if (membersWithSubscriptions.length > 0) {
        const firstUser = membersWithSubscriptions[0]
        toast.info(`🔍 Analyse de ${firstUser.firstName} ${firstUser.lastName}...`)
        await debugUserSubscriptions(firstUser.id)
        toast.success('🔍 Analyse utilisateur terminée - vérifiez la console')
      } else {
        toast.warning('Aucun utilisateur à analyser')
      }
    } catch (error) {
      toast.error('Erreur lors de l\'analyse utilisateur')
    }
  }

  // Transformation des données pour inclure les subscriptions
  const membersWithSubscriptions: MemberWithSubscription[] = membersData?.data || []

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-6">
        <MemberStats />
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Une erreur est survenue lors du chargement des membres. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2 text-red-700 underline"
              onClick={handleRefresh}
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <MemberStats />

      {/* Boutons de test - uniquement en développement */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-yellow-700">🧪 Tests:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestUser}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                Créer utilisateur + abo valide
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateExpiredUser}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Créer utilisateur + abo expiré
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateUserNoSub}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Créer utilisateur sans abo
              </Button>
              <div className="border-l border-yellow-300 pl-2 ml-2">
                <span className="text-xs text-yellow-600 mr-2">Debug:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebugData}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 mr-1"
                >
                  🔍 Firebase
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebugFirstUser}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  🔍 1er User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <MemberFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Barre d'actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-[#224D62] flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Liste des Membres
                {membersData && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({membersData.pagination.totalItems} membres)
                  </span>
                )}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Boutons de vue */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-8 px-3 ${
                    viewMode === 'grid' 
                      ? 'bg-[#224D62] hover:bg-[#224D62]/90' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-8 px-3 ${
                    viewMode === 'list' 
                      ? 'bg-[#224D62] hover:bg-[#224D62]/90' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-[#224D62] border-[#224D62] hover:bg-[#224D62] hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
                <span className="sm:hidden">Sync</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-[#CBB171] border-[#CBB171] hover:bg-[#CBB171] hover:text-white"
              >
                <FileDown className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Exporter</span>
                <span className="sm:hidden">Export</span>
              </Button>

              {/* <Button
                size="sm"
                className="bg-[#224D62] hover:bg-[#224D62]/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Nouveau membre</span>
                <span className="sm:hidden">Nouveau</span>
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      {isLoading ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : membersWithSubscriptions.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {membersWithSubscriptions.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onViewSubscriptions={handleViewSubscriptions}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {/* Pagination */}
          {membersData && membersData.pagination.totalItems > itemsPerPage && (
            <MembershipPagination
              pagination={membersData.pagination}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={isLoading}
            />
          )}
        </>
      ) : (
        <Card className="text-center p-12">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Aucun membre trouvé
              </h3>
              <p className="text-gray-500 mt-1 max-w-md mx-auto">
                {Object.keys(filters).length > 0 
                  ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                  : 'Il n\'y a pas encore de membres enregistrés dans le système.'
                }
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              {Object.keys(filters).length > 0 && (
                <Button variant="outline" onClick={handleResetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
              <Button className="bg-[#224D62] hover:bg-[#224D62]/90">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un membre
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      {selectedMemberId && (
        <MemberSubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => {
            setIsSubscriptionModalOpen(false)
            setSelectedMemberId(null)
          }}
          memberId={selectedMemberId}
        />
      )}

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
    </div>
  )
}

export default MembershipList