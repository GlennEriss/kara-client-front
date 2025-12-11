'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  User,
  Download,
  Upload,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import routes from '@/constantes/routes'
import { CreditContract, CreditContractStatus } from '@/types/types'

type ViewMode = 'grid' | 'list'

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
              <option value="ACTIVE">Actif</option>
              <option value="OVERDUE">En retard</option>
              <option value="PARTIAL">Partiel</option>
              <option value="TRANSFORMED">Transformé</option>
              <option value="BLOCKED">Bloqué</option>
              <option value="DISCHARGED">Déchargé</option>
              <option value="CLOSED">Clos</option>
            </select>

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.creditType || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, creditType: e.target.value })}
            >
              <option value="all">Tous les types</option>
              <option value="SPECIALE">Spéciale</option>
              <option value="FIXE">Fixe</option>
              <option value="AIDE">Aide</option>
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
const ListContrats = () => {
  const router = useRouter()
  
  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all')
  
  // États
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    creditType: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contrats, setContrats] = useState<CreditContract[]>([])
  const [error, setError] = useState<string | null>(null)

  // Reset page when filters or tab change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', creditType: 'all' })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)
    // TODO: Implémenter le refetch
    setTimeout(() => setIsLoading(false), 1000)
  }

  const exportToExcel = async () => {
    if (filteredContrats.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      // TODO: Implémenter l'export Excel
      toast.success('Export réussi !')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  // Fonctions utilitaires
  const getCreditTypeLabel = (type: string) => {
    const labels = {
      SPECIALE: 'Spéciale',
      FIXE: 'Fixe',
      AIDE: 'Aide',
    }
    return labels[type as keyof typeof labels] || type
  }

  const getStatusColor = (status: CreditContractStatus) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
      SIMULATED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      OVERDUE: 'bg-orange-100 text-orange-700 border-orange-200',
      PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      TRANSFORMED: 'bg-purple-100 text-purple-700 border-purple-200',
      BLOCKED: 'bg-red-100 text-red-700 border-red-200',
      DISCHARGED: 'bg-gray-100 text-gray-700 border-gray-200',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[status] || colors.DRAFT
  }

  const getStatusLabel = (status: CreditContractStatus) => {
    const labels = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      SIMULATED: 'Simulé',
      ACTIVE: 'Actif',
      OVERDUE: 'En retard',
      PARTIAL: 'Partiel',
      TRANSFORMED: 'Transformé',
      BLOCKED: 'Bloqué',
      DISCHARGED: 'Déchargé',
      CLOSED: 'Clos',
    }
    return labels[status] || status
  }

  /**
   * Vérifie si un contrat est en retard
   */
  const isContractOverdue = (contract: CreditContract): boolean => {
    if (contract.status === 'OVERDUE' || contract.status === 'PARTIAL') {
      return true
    }
    
    if (contract.status === 'ACTIVE' && contract.nextDueAt) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const nextDue = contract.nextDueAt instanceof Date 
        ? contract.nextDueAt 
        : new Date(contract.nextDueAt)
      nextDue.setHours(0, 0, 0, 0)
      
      if (nextDue < today) {
        return true
      }
    }
    
    return false
  }

  // Filtrage des contrats
  const filteredContrats = React.useMemo(() => {
    let contracts = contrats

    // Filtrer par retard si l'onglet "Retard" est actif
    if (activeTab === 'overdue') {
      contracts = contracts.filter((c) => isContractOverdue(c))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      contracts = contracts.filter((c) =>
        c.id.toLowerCase().includes(searchLower) ||
        c.clientFirstName.toLowerCase().includes(searchLower) ||
        c.clientLastName.toLowerCase().includes(searchLower) ||
        c.clientContacts.some(contact => contact.toLowerCase().includes(searchLower))
      )
    }

    if (filters.status !== 'all') {
      contracts = contracts.filter((c) => c.status === filters.status)
    }

    if (filters.creditType !== 'all') {
      contracts = contracts.filter((c) => c.creditType === filters.creditType)
    }

    return contracts
  }, [contrats, filters, activeTab])

  // Pagination
  const totalPages = Math.ceil(filteredContrats.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContrats = filteredContrats.slice(startIndex, endIndex)

  // Stats
  const stats = React.useMemo(() => {
    const dataSource = activeTab === 'overdue' ? filteredContrats : contrats

    const total = dataSource.length
    const active = dataSource.filter((c) => c.status === 'ACTIVE').length
    const overdue = dataSource.filter((c) => isContractOverdue(c)).length
    const blocked = dataSource.filter((c) => c.status === 'BLOCKED').length
    const discharged = dataSource.filter((c) => c.status === 'DISCHARGED').length

    return {
      total,
      active,
      overdue,
      blocked,
      discharged,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
      overduePercentage: total > 0 ? (overdue / total) * 100 : 0,
    }
  }, [contrats, activeTab, filteredContrats])

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats : {error}
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
      {/* Onglets pour filtrer par retard */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'overdue')} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tous les contrats
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2 text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">
            <AlertCircle className="h-4 w-4" />
            Retard
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
                  {filteredContrats.length.toLocaleString()} contrat{filteredContrats.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de vue modernes */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden md:flex">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'grid'
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
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'list'
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
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={isExporting || filteredContrats.length === 0}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700 hover:text-green-800 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mr-2" />
                    Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter Excel
                  </>
                )}
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
      ) : currentContrats.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
              : 'space-y-6'
          }>
            {currentContrats.map((contract, index) => (
              <Card
                key={contract.id}
                className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col"
              >
                {/* Badge "En retard" */}
                {isContractOverdue(contract) && (
                  <Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    En retard
                  </Badge>
                )}

                <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-gray-900">#{contract.id.slice(-6)}</h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 mt-1">
                        {getCreditTypeLabel(contract.creditType)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                      {getStatusLabel(contract.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Client:</span>
                      <span className="font-medium text-gray-900">{contract.clientFirstName} {contract.clientLastName}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Montant:</span>
                      <span className="font-semibold text-green-600">
                        {contract.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Durée:</span>
                      <span className="font-medium text-gray-900">{contract.duration} mois</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Versé:</span>
                      <span className="font-semibold text-green-600">
                        {contract.amountPaid.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Reste:</span>
                      <span className="font-semibold text-orange-600">
                        {contract.amountRemaining.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {contract.nextDueAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prochaine échéance:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          {contract.nextDueAt instanceof Date 
                            ? contract.nextDueAt.toLocaleDateString('fr-FR')
                            : new Date(contract.nextDueAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    )}

                    {contract.score !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Score:</span>
                        <Badge className={cn(
                          "font-semibold",
                          contract.score >= 8 ? "bg-green-100 text-green-700" :
                          contract.score >= 5 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {contract.score}/10
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-auto">
                    <Button
                      onClick={() => {/* TODO: Naviguer vers détails */}}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Ouvrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{Math.min(endIndex, filteredContrats.length)} sur {filteredContrats.length} contrats
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ListContrats

