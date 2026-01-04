'use client'

import React, { useState, useEffect } from 'react'
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
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Calendar,
  RotateCcw,
  CreditCard,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CaisseImprevueDemand, CaisseImprevueDemandStatus } from '@/types/types'
import { useCaisseImprevueDemands, useCaisseImprevueDemandsStats, useCaisseImprevueDemandMutations } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import type { CaisseImprevueDemandFilters } from '@/types/types'
import CreateDemandModal from './CreateDemandModal'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import StatisticsCaisseImprevueDemandes from './StatisticsCaisseImprevueDemandes'
import { useRouter, useSearchParams } from 'next/navigation'
import routes from '@/constantes/routes'

type ViewMode = 'grid' | 'list'

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

const ListDemandes = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'converted' | 'reopened'>(
    (searchParams.get('tab') as any) || 'all'
  )
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage, setItemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [acceptModalState, setAcceptModalState] = useState<{
    isOpen: boolean
    demand: CaisseImprevueDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean
    demand: CaisseImprevueDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
    demand: CaisseImprevueDemand | null
  }>({
    isOpen: false,
    demand: null,
  })

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('tab', activeTab)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeTab, currentPage, itemsPerPage, viewMode, router])

  const getStatusFilter = () => {
    return activeTab === 'all' 
      ? undefined 
      : activeTab === 'pending' 
        ? 'PENDING' 
        : activeTab === 'approved'
          ? 'APPROVED'
          : activeTab === 'rejected'
            ? 'REJECTED'
            : activeTab === 'reopened'
              ? 'REOPENED'
              : 'CONVERTED'
  }

  const queryFilters: CaisseImprevueDemandFilters = {
    status: getStatusFilter(),
    page: currentPage,
    limit: itemsPerPage,
  }

  const { data: demandes = [], isLoading, error } = useCaisseImprevueDemands(queryFilters)
  const { convert } = useCaisseImprevueDemandMutations()
  
  const globalStatsFilters: CaisseImprevueDemandFilters = {}
  const { data: statsData } = useCaisseImprevueDemandsStats(globalStatsFilters)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    // Le refetch est géré automatiquement par React Query
  }

  const getStatusColor = (status: CaisseImprevueDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
      REOPENED: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: CaisseImprevueDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
      REOPENED: 'Réouverte',
    }
    return labels[status] || status
  }

  const filteredDemandes = demandes

  const totalPages = Math.ceil(filteredDemandes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDemandes = filteredDemandes.slice(startIndex, endIndex)

  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        converted: statsData.converted,
        reopened: statsData.reopened,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
      reopened: 0,
    }
  }, [statsData])

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des demandes : {error instanceof Error ? error.message : 'Erreur inconnue'}
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Toutes ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            En attente ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Acceptées ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Refusées ({stats.rejected})
          </TabsTrigger>
          <TabsTrigger value="reopened" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Réouvertes ({stats.reopened})
          </TabsTrigger>
          <TabsTrigger value="converted" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Converties ({stats.converted})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <StatisticsCaisseImprevueDemandes />

      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Demandes de Caisse Imprévue
                </h2>
                <p className="text-gray-600 font-medium">
                  {filteredDemandes.length.toLocaleString()} demande{filteredDemandes.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden md:flex">
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
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Demande
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
      ) : currentDemandes.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
              : 'space-y-6'
          }>
            {currentDemandes.map((demande) => (
              <Card
                key={demande.id}
                className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col"
              >
                <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="font-mono text-sm font-bold text-gray-900 cursor-help">#{demande.id.slice(-6)}</h3>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{demande.id}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 mt-1">
                        {demande.paymentFrequency === 'DAILY' ? 'Journalière' : 'Mensuelle'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
                      {getStatusLabel(demande.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Forfait:</span>
                      <span className="font-medium text-gray-900">
                        {demande.subscriptionCICode}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Montant mensuel:</span>
                      <span className="font-semibold text-green-600">
                        {demande.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Durée:</span>
                      <span className="font-medium text-gray-900">
                        {demande.subscriptionCIDuration} mois
                      </span>
                    </div>

                    {demande.desiredDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Date souhaitée:
                        </span>
                        <span className="font-medium text-gray-900">
                          {new Date(demande.desiredDate).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {demande.decisionMadeByName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Décision par:</span>
                        <span className="font-medium text-gray-900">
                          {demande.decisionMadeByName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-auto space-y-2">
                    {demande.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setRejectModalState({ isOpen: true, demand: demande })}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    )}
                    {demande.status === 'REJECTED' && (
                      <Button
                        size="sm"
                        onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Réouvrir
                      </Button>
                    )}
                    {demande.status === 'APPROVED' && !demande.contractId && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const result = await convert.mutateAsync({
                              demandId: demande.id,
                            })
                            if (result?.contract) {
                              router.push(routes.admin.caisseImprevueContractDetails(result.contract.id))
                            }
                          } catch (error) {
                            console.error('Erreur lors de la conversion:', error)
                          }
                        }}
                        disabled={convert.isPending}
                        className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        {convert.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Création...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Créer le contrat
                          </>
                        )}
                      </Button>
                    )}
                    {demande.status === 'APPROVED' && demande.contractId && (
                      <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Contrat créé
                      </Badge>
                    )}
                    <Button
                      onClick={() => router.push(routes.admin.caisseImprevueDemandDetails(demande.id))}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Voir détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{Math.min(endIndex, filteredDemandes.length)} sur {filteredDemandes.length} demandes
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
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Il n'y a pas encore de demandes de Caisse Imprévue enregistrées dans le système.
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une demande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateDemandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <AcceptDemandModal
        isOpen={acceptModalState.isOpen}
        onClose={() => setAcceptModalState({ isOpen: false, demand: null })}
        demand={acceptModalState.demand}
        onSuccess={() => {}}
      />

      <RejectDemandModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false, demand: null })}
        demand={rejectModalState.demand}
        onSuccess={() => {}}
      />

      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false, demand: null })}
        demand={reopenModalState.demand}
        onSuccess={() => {}}
      />
    </div>
  )
}

export default ListDemandes

