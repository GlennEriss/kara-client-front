'use client'
import React from 'react'
import { useState, useEffect, useRef } from 'react'
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
  Plus,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  Venus,
  Mars,
  Cake,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useAllMembers } from '@/hooks/useMembers'
import { UserFilters } from '@/types/types'
import { MemberWithSubscription } from '@/db/member.db'
import MemberFilters from './MemberFilters'
import routes from '@/constantes/routes'
import MemberCard from './MemberCard'
import MemberDetailsWrapper from './MemberDetailsWrapper'
import MembershipPagination from './MembershipPagination'
import { toast } from 'sonner'
import { createTestUserWithSubscription, createTestUserWithExpiredSubscription, createTestUserWithoutSubscription, createTestUserWithAddressAndProfession, createTestUserWithBirthdayToday } from '@/utils/test-data'
import { debugFirebaseData, debugUserSubscriptions } from '@/utils/debug-data'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ExportMembershipModal from './ExportMembershipModal'
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

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }

  const goNext = () => goTo(currentIndex + 1)
  const goPrev = () => goTo(currentIndex - 1)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }
  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX) }
  const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX) }
  const handleMouseUp = () => { handleEnd() }
  const handleTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }
  const handleTouchEnd = () => { handleEnd() }

  useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX])

  return {
    currentIndex,
    goTo,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Composant Carrousel des statistiques avec drag/swipe
const StatsCarousel = ({ stats }: { stats: any }) => {
  const statsData = [
    { title: 'Total', value: stats.total, percentage: 100, color: '#6b7280', icon: Users, trend: 'up' as const },
    { title: 'Actifs', value: stats.active, percentage: stats.activePercentage, color: '#10b981', icon: UserCheck, trend: 'up' as const },
    { title: 'Expirés', value: stats.expired, percentage: stats.expiredPercentage, color: '#ef4444', icon: Clock, trend: stats.expiredPercentage > 20 ? 'up' as const : 'neutral' as const },
    { title: 'Hommes', value: stats.men, percentage: stats.menPercentage, color: '#3b82f6', icon: Mars, trend: 'neutral' as const },
    { title: 'Femmes', value: stats.women, percentage: stats.womenPercentage, color: '#ec4899', icon: Venus, trend: 'neutral' as const },
  ]

  const [itemsPerView, setItemsPerView] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(5)
      else if (w >= 1024) setItemsPerView(4)
      else if (w >= 768) setItemsPerView(3)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { currentIndex, goTo, goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goPrev} disabled={!canGoPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goNext} disabled={!canGoNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div ref={containerRef} className="overflow-hidden px-12 py-2" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className={cn('flex transition-transform duration-300 ease-out gap-4', isDragging && 'transition-none')} style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}>
          {statsData.map((stat, index) => (
            <div key={index} className="flex-shrink-0" style={{ width: `calc(${100 / itemsPerView}% - ${(1 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <ModernStatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{ 
                backgroundColor: `${color}15`,
                color: color
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                {trend !== 'neutral' && percentage && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // React Query
  const { 
    data: membersData, 
    isLoading, 
    error, 
    refetch 
  } = useAllMembers(filters, currentPage, itemsPerPage)

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

  // Calcul des statistiques modernes
  const stats = React.useMemo(() => {
    if (!membersData) return null
    
    const total = membersData.pagination.totalItems
    const activeMembers = membersWithSubscriptions.filter(m => m.isSubscriptionValid).length
    const expiredMembers = membersWithSubscriptions.filter(m => m.lastSubscription && !m.isSubscriptionValid).length
    const noSubscription = membersWithSubscriptions.filter(m => !m.lastSubscription).length
    
    // Calcul des statistiques de genre
    const men = membersWithSubscriptions.filter(m => m.gender === 'Homme').length
    const women = membersWithSubscriptions.filter(m => m.gender === 'Femme').length
    
    return {
      total,
      active: activeMembers,
      expired: expiredMembers,
      noSub: noSubscription,
      men,
      women,
      activePercentage: total > 0 ? (activeMembers / total) * 100 : 0,
      expiredPercentage: total > 0 ? (expiredMembers / total) * 100 : 0,
      noSubPercentage: total > 0 ? (noSubscription / total) * 100 : 0,
      menPercentage: total > 0 ? (men / total) * 100 : 0,
      womenPercentage: total > 0 ? (women / total) * 100 : 0,
    }
  }, [membersData, membersWithSubscriptions])

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        {/* Stats même en cas d'erreur */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernStatsCard
            title="Total"
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
        <StatsCarousel stats={stats} />
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

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              {/* Boutons de vue modernes - Cachés sur mobile */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
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
                className="hidden md:flex h-10 px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              {/* Boutons mobiles - Exporter et Nouveau seulement */}
              <div className="flex md:hidden w-full gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1 h-12 bg-white border-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg font-medium"
                >
                  <FileDown className="h-5 w-5 mr-2" />
                  Exporter
                </Button>

                <Button
                  size="sm"
                  onClick={() => { window.location.href = routes.admin.membershipAdd }}
                  className="flex-1 h-12 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau
                </Button>
              </div>

              {/* Boutons desktop - Tous les boutons */}
              <div className="hidden md:flex items-center gap-3">
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
                  onClick={() => { window.location.href = routes.admin.membershipAdd }}
                  className="h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Membre
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      {isLoading ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
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
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
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
                  onPreviewAdhesion={handlePreviewAdhesion}
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

export default MembershipList