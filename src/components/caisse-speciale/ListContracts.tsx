'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  RefreshCw, 
  Grid3X3, 
  List,
  AlertCircle,
  FileDown,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  User,
  Users as GroupIcon
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useAllCaisseContracts } from '@/hooks/useCaisseContracts'
import { useMembers } from '@/hooks/useMembers'
import { useGroups } from '@/hooks/useGroups'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import Link from 'next/link'

type ViewMode = 'grid' | 'list'

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
              <div className="flex items-center gap-2">
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

// Composant de filtres
const ContractFilters = ({ 
  filters, 
  onFiltersChange, 
  onReset 
}: { 
  filters: any
  onFiltersChange: (filters: any) => void
  onReset: () => void
}) => {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Filtres</h3>
              <p className="text-gray-600">Affinez votre recherche</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contrat..."
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] w-full sm:w-auto transition-all duration-200"
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.status || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            >
              <option value="all">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
              <option value="LATE_NO_PENALTY">Retard (J+0..3)</option>
              <option value="LATE_WITH_PENALTY">Retard (J+4..12)</option>
              <option value="DEFAULTED_AFTER_J12">Résilié (&gt;J+12)</option>
              <option value="EARLY_WITHDRAW_REQUESTED">Retrait anticipé</option>
              <option value="FINAL_REFUND_PENDING">Remboursement final</option>
              <option value="EARLY_REFUND_PENDING">Remboursement anticipé</option>
              <option value="RESCINDED">Résilié</option>
              <option value="CLOSED">Clos</option>
            </select>

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.type || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
            >
              <option value="all">Tous les types</option>
              <option value="INDIVIDUAL">Individuels</option>
              <option value="GROUP">Groupes</option>
            </select>

            <Button
              variant="outline"
              onClick={onReset}
              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant principal
const ListContracts = () => {
  // États
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // React Query
  const { 
    data: contractsData, 
    isLoading, 
    error, 
    refetch 
  } = useAllCaisseContracts(1000) // Limite élevée pour avoir tous les contrats

  // Récupération des membres et groupes pour afficher les noms
  const { data: membersData } = useMembers({}, 1, 1000)
  const { data: groupsData } = useGroups()

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', type: 'all' })
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

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('✅ Données actualisées', {
        description: 'La liste des contrats a été rechargée',
        duration: 3000,
      })
    } catch {
      toast.error('❌ Erreur lors de l\'actualisation', {
        description: 'Impossible de recharger les données',
        duration: 4000,
      })
    }
  }

  // Fonctions utilitaires
  const isGroupContract = (contract: any) => {
    return contract.contractType === 'GROUP' || (contract.groupeId && !contract.memberId)
  }

  const getContractType = (contract: any) => {
    if (contract.contractType === 'GROUP') return 'Groupe'
    if (contract.contractType === 'INDIVIDUAL') return 'Individuel'
    if (isGroupContract(contract)) return 'Groupe'
    return 'Individuel'
  }

  // Fonction pour obtenir le nom affiché (groupe ou personne)
  const getContractDisplayName = (contract: any) => {
    if (isGroupContract(contract)) {
      // Recherche du nom du groupe
      if (groupsData && contract.groupeId) {
        const group = groupsData.find((g: any) => g.id === contract.groupeId)
        return group ? group.name : `Groupe ${contract.groupeId.slice(-6)}`
      }
      return `Groupe ${contract.groupeId?.slice(-6) || 'N/A'}`
    } else {
      // Recherche du nom de la personne
      if (membersData && contract.memberId) {
        const member = membersData.data?.find((m: any) => m.id === contract.memberId)
        if (member) {
          return `${member.firstName} ${member.lastName}`
        }
      }
      return `Membre ${contract.memberId?.slice(-6) || 'N/A'}`
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      LATE_NO_PENALTY: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LATE_WITH_PENALTY: 'bg-orange-100 text-orange-700 border-orange-200',
      DEFAULTED_AFTER_J12: 'bg-red-100 text-red-700 border-red-200',
      EARLY_WITHDRAW_REQUESTED: 'bg-blue-100 text-blue-700 border-blue-200',
      FINAL_REFUND_PENDING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      EARLY_REFUND_PENDING: 'bg-blue-100 text-blue-700 border-blue-200',
      RESCINDED: 'bg-red-100 text-red-700 border-red-200',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[status as keyof typeof colors] || colors.DRAFT
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'Brouillon',
      ACTIVE: 'Actif',
      LATE_NO_PENALTY: 'Retard (J+0..3)',
      LATE_WITH_PENALTY: 'Retard (J+4..12)',
      DEFAULTED_AFTER_J12: 'Résilié (&gt;J+12)',
      EARLY_WITHDRAW_REQUESTED: 'Retrait anticipé',
      FINAL_REFUND_PENDING: 'Remboursement final',
      EARLY_REFUND_PENDING: 'Remboursement anticipé',
      RESCINDED: 'Résilié',
      CLOSED: 'Clos'
    }
    return labels[status as keyof typeof labels] || status
  }

  // Filtrage des contrats
  const filteredContracts = React.useMemo(() => {
    if (!contractsData) return []
    
    let contracts = contractsData
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      contracts = contracts.filter((c: any) => 
        c.id.toLowerCase().includes(searchLower) ||
        c.memberId?.toLowerCase().includes(searchLower) ||
        c.groupeId?.toLowerCase().includes(searchLower) ||
        getContractType(c).toLowerCase().includes(searchLower) ||
        getContractDisplayName(c).toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.status !== 'all') {
      contracts = contracts.filter((c: any) => c.status === filters.status)
    }
    
    if (filters.type !== 'all') {
      if (filters.type === 'GROUP') {
        contracts = contracts.filter((c: any) => isGroupContract(c))
      } else {
        contracts = contracts.filter((c: any) => !isGroupContract(c))
      }
    }
    
    return contracts
  }, [contractsData, filters, groupsData, membersData])

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = filteredContracts.slice(startIndex, endIndex)

  // Calcul des statistiques
  const stats = React.useMemo(() => {
    if (!contractsData) return null
    
    const total = contractsData.length
    const draft = contractsData.filter((c: any) => c.status === 'DRAFT').length
    const active = contractsData.filter((c: any) => c.status === 'ACTIVE').length
    const late = contractsData.filter((c: any) => 
      c.status === 'LATE_NO_PENALTY' || c.status === 'LATE_WITH_PENALTY'
    ).length
    const group = contractsData.filter((c: any) => isGroupContract(c)).length
    const individual = total - group
    
    return {
      total,
      draft,
      active,
      late,
      group,
      individual,
      draftPercentage: total > 0 ? (draft / total) * 100 : 0,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
      latePercentage: total > 0 ? (late / total) * 100 : 0,
      groupPercentage: total > 0 ? (group / total) * 100 : 0,
    }
  }, [contractsData])

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats. 
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <ModernStatsCard
            title="Total Contrats"
            value={stats.total}
            subtitle="Contrats enregistrés"
            percentage={100}
            color="#6b7280"
            icon={FileText}
            trend="up"
          />
          <ModernStatsCard
            title="Brouillons"
            value={stats.draft}
            subtitle="En attente de validation"
            percentage={stats.draftPercentage}
            color="#9ca3af"
            icon={FileText}
            trend="neutral"
          />
          <ModernStatsCard
            title="Actifs"
            value={stats.active}
            subtitle="Contrats en cours"
            percentage={stats.activePercentage}
            color="#10b981"
            icon={CheckCircle}
            trend="up"
          />
          <ModernStatsCard
            title="En Retard"
            value={stats.late}
            subtitle="À régulariser"
            percentage={stats.latePercentage}
            color="#ef4444"
            icon={Clock}
            trend={stats.latePercentage > 20 ? 'up' : 'neutral'}
          />
          <ModernStatsCard
            title="Groupes"
            value={stats.group}
            subtitle="Contrats collectifs"
            percentage={stats.groupPercentage}
            color="#8b5cf6"
            icon={GroupIcon}
            trend="neutral"
          />
        </div>
      )}

      {/* Filtres */}
      <ContractFilters
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
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Contrats
                </h2>
                <p className="text-gray-600 font-medium">
                  {filteredContracts.length.toLocaleString()} contrat{filteredContracts.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="md:flex flex-wrap items-center gap-3 hidden">
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
                size="sm"
                onClick={() => { window.location.href = routes.admin.caisseSpeciale }}
                className="h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Contrat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des contrats */}
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
      ) : currentContracts.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
              : 'space-y-6'
          }>
            {currentContracts.map((contract: any, index: number) => (
              <div 
                key={contract.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 ${
                          isGroupContract(contract) 
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {isGroupContract(contract) ? (
                            <GroupIcon className="w-6 h-6" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-mono text-sm font-bold text-gray-900">#{contract.id.slice(-6)}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isGroupContract(contract) 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {getContractType(contract)}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Nom:</span>
                        <span className="font-medium text-gray-900">{getContractDisplayName(contract)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Mensuel:</span>
                        <span className="font-semibold text-green-600">
                          {(contract.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Durée:</span>
                        <span className="font-medium text-gray-900">{contract.monthsPlanned} mois</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prochaine échéance:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 mt-auto">
                      <div className="text-xs text-gray-600 mb-2">
                        <DollarSign className="h-3 w-3 inline mr-1" />
                        Versé: {(contract.nominalPaid || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                      <Link 
                        href={routes.admin.caisseSpecialeContractDetails(contract.id)} 
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#224D62] border border-[#224D62] rounded-lg hover:bg-[#224D62] hover:text-white transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        Ouvrir
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Pagination simple */}
          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{Math.min(endIndex, filteredContracts.length)} sur {filteredContracts.length} contrats
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1"
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucun contrat trouvé
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  {Object.values(filters).some(f => f !== 'all' && f !== '') 
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de contrats enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {Object.values(filters).some(f => f !== 'all' && f !== '') && (
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
                  Ajouter un contrat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ListContracts
