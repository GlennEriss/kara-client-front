'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  RefreshCw, 
  Grid3X3, 
  List,
  AlertCircle,
  FileDown,
  Plus,
  Search,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Target,
  Activity
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
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
import { createTestUserWithSubscription, createTestUserWithExpiredSubscription, createTestUserWithoutSubscription, createTestUserWithAddressAndProfession } from '@/utils/test-data'
import { debugFirebaseData, debugUserSubscriptions } from '@/utils/debug-data'

type ViewMode = 'grid' | 'list'

// Couleurs pour les graphiques
const CHART_COLORS = {
  active: '#10b981',
  inactive: '#ef4444', 
  pending: '#f59e0b',
  expired: '#8b5cf6'
}

// Composant pour les statistiques modernes
const ModernStatsCard = ({ 
  title, 
  value, 
  subtitle,
  percentage, 
  color, 
  icon: Icon,
  trend = 'up',
  data = []
}: { 
  title: string
  value: number
  subtitle?: string
  percentage?: number
  color: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
  data?: Array<{ name: string; value: number; fill: string }>
}) => {
  const chartData = data.length > 0 ? data : [
    { name: 'value', value: percentage || 75, fill: color },
    { name: 'remaining', value: 100 - (percentage || 75), fill: '#f3f4f6' }
  ]

  return (
    <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
              style={{ 
                backgroundColor: `${color}15`,
                boxShadow: `0 0 0 1px ${color}20`
              }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-gray-900">{value.toLocaleString()}</p>
                {trend !== 'neutral' && percentage && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                    trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(1)}%
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1 font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="w-16 h-16 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            <ResponsiveContainer width="100%" height="100%">
              {data.length > 2 ? (
                <BarChart data={data}>
                  <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={30}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700 ease-out group-hover:animate-pulse"
            style={{ 
              width: `${percentage || 75}%`, 
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}40`
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Composant skeleton moderne
const ModernSkeleton = ({ viewMode }: { viewMode: ViewMode }) => (
  <Card className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

// Composant principal modernisé
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
    toast.success('🔄 Filtres réinitialisés', {
      description: 'Tous les filtres ont été remis à zéro',
      duration: 3000,
    })
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
    const member = membersWithSubscriptions.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setIsDetailsModalOpen(true)
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

  const handleExport = () => {
    toast.info('📊 Export en cours de développement', {
      description: 'Cette fonctionnalité sera bientôt disponible',
      duration: 3000,
    })
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
        toast.info(`🔍 Analyse de ${firstUser.firstName} ${firstUser.lastName}...`, { duration: 2000 })
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

  // Calcul des statistiques modernes
  const stats = React.useMemo(() => {
    if (!membersData) return null
    
    const total = membersData.pagination.totalItems
    const activeMembers = membersWithSubscriptions.filter(m => m.isSubscriptionValid).length
    const expiredMembers = membersWithSubscriptions.filter(m => m.lastSubscription && !m.isSubscriptionValid).length
    const noSubscription = membersWithSubscriptions.filter(m => !m.lastSubscription).length
    
    return {
      total,
      active: activeMembers,
      expired: expiredMembers,
      noSub: noSubscription,
      activePercentage: total > 0 ? (activeMembers / total) * 100 : 0,
      expiredPercentage: total > 0 ? (expiredMembers / total) * 100 : 0,
      noSubPercentage: total > 0 ? (noSubscription / total) * 100 : 0,
    }
  }, [membersData, membersWithSubscriptions])

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        {/* Stats même en cas d'erreur */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernStatsCard
            title="Total Membres"
            value={0}
            subtitle="Erreur de chargement"
            percentage={0}
            color="#ef4444"
            icon={AlertCircle}
          />
        </div>

        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des membres. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2 text-red-700 underline font-bold hover:text-red-800"
              onClick={handleRefresh}
            >
              Réessayer maintenant
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Statistiques modernes */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernStatsCard
            title="Total Membres"
            value={stats.total}
            subtitle="Membres enregistrés"
            percentage={100}
            color="#6b7280"
            icon={Users}
            trend="up"
          />
          <ModernStatsCard
            title="Actifs"
            value={stats.active}
            subtitle="Abonnements valides"
            percentage={stats.activePercentage}
            color="#10b981"
            icon={UserCheck}
            trend="up"
          />
          <ModernStatsCard
            title="Expirés"
            value={stats.expired}
            subtitle="À renouveler"
            percentage={stats.expiredPercentage}
            color="#ef4444"
            icon={Clock}
            trend={stats.expiredPercentage > 20 ? 'up' : 'neutral'}
          />
          <ModernStatsCard
            title="Sans Abo"
            value={stats.noSub}
            subtitle="En attente"
            percentage={stats.noSubPercentage}
            color="#f59e0b"
            icon={UserX}
            trend="neutral"
          />
        </div>
      )}

      {/* Boutons de test modernisés */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-0 shadow-lg">
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
      <MemberFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Barre d'actions moderne */}
      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Membres
                </h2>
                {membersData && (
                  <p className="text-gray-600 font-medium">
                    {membersData.pagination.totalItems.toLocaleString()} membres • Page {currentPage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de vue modernes */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${
                    viewMode === 'grid' 
                      ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105' 
                      : 'hover:bg-white hover:shadow-md'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${
                    viewMode === 'list' 
                      ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105' 
                      : 'hover:bg-white hover:shadow-md'
                  }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
              </div>

              {/* Actions avec animations */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-10 px-4 bg-white border-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exporter
              </Button>

              <Button
                size="sm"
                className="h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Membre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      {isLoading ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
            : 'space-y-6'
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : membersWithSubscriptions.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 items-stretch'
              : 'space-y-6'
          }>
            {membersWithSubscriptions.map((member, index) => (
              <div 
                key={member.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <MemberCard
                  member={member}
                  onViewSubscriptions={handleViewSubscriptions}
                  onViewDetails={handleViewDetails}
                />
              </div>
            ))}
          </div>

          {/* Pagination moderne */}
          {membersData && membersData.pagination.totalItems > itemsPerPage && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <MembershipPagination
                  pagination={membersData.pagination}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucun membre trouvé
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  {Object.keys(filters).length > 0 
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de membres enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {Object.keys(filters).length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handleResetFilters}
                    className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                )}
                <Button className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un membre
                </Button>
              </div>
            </div>
          </CardContent>
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