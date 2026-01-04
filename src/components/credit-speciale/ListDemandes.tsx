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
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Calculator,
  Loader2,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import routes from '@/constantes/routes'
import { CreditDemand, CreditDemandStatus } from '@/types/types'
import { useCreditDemands, useCreditDemandsStats, useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import type { CreditDemandFilters } from '@/repositories/credit-speciale/ICreditDemandRepository'
import CreateCreditDemandModal from './CreateCreditDemandModal'
import ValidateDemandModal from './ValidateDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import CreditSimulationModal from './CreditSimulationModal'
import ContractCreationModal from './ContractCreationModal'
import StatisticsCreditDemandes from './StatisticsCreditDemandes'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import type { StandardSimulation, CustomSimulation } from '@/types/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Calendar } from 'lucide-react'
import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import { useMember } from '@/hooks/useMembers'
import { useMemberCIStatus } from '@/hooks/useCaisseImprevue'
import { Shield, CheckCircle2 } from 'lucide-react'

type ViewMode = 'grid' | 'list'

// Composant pour afficher les infos garant avec statut CI
const GuarantorInfo = ({ 
  guarantorId, 
  guarantorFirstName, 
  guarantorLastName, 
  guarantorIsMember 
}: { 
  guarantorId: string
  guarantorFirstName?: string
  guarantorLastName?: string
  guarantorIsMember?: boolean
}) => {
  const { isUpToDate, hasActiveContract, isLoading } = useMemberCIStatus(guarantorIsMember ? guarantorId : undefined)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          Garant:
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {guarantorFirstName} {guarantorLastName}
          </span>
          {guarantorIsMember && (
            <Badge className="bg-blue-100 text-blue-700 text-xs border border-blue-300">Membre</Badge>
          )}
        </div>
      </div>
      {guarantorIsMember && !isLoading && (
        <div className="flex items-center justify-between text-xs pl-5">
          <span className="text-gray-400">Statut CI:</span>
          <div className="flex items-center gap-1.5">
            {hasActiveContract ? (
              <>
                {isUpToDate ? (
                  <Badge className="bg-green-50 text-green-700 border border-green-300 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    À jour
                  </Badge>
                ) : (
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-300 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    En retard
                  </Badge>
                )}
              </>
            ) : (
              <Badge className="bg-gray-50 text-gray-500 border border-gray-300 text-xs">
                Pas de contrat CI
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
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
const DemandFilters = ({
  filters,
  onFiltersChange,
  onReset,
  onStatusChange,
  activeTab
}: {
  filters: any
  onFiltersChange: (filters: any) => void
  onReset: () => void
  onStatusChange?: (status: string) => void
  activeTab: 'all' | 'pending' | 'approved' | 'rejected'
}) => {
  const { data: selectedClient } = useMember(filters.clientId)
  const { data: selectedGuarantor } = useMember(filters.guarantorId)

  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
      <CardContent className="p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Filtres</h3>
              <p className="text-gray-600 text-sm">Affinez votre recherche</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onReset}
            size="sm"
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          </div>

        {/* Grille de filtres organisée */}
        <div className="space-y-4">
          {/* Ligne 1: Recherche générale */}
          <div className={`grid grid-cols-1 ${activeTab === 'all' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une demande..."
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>
            {activeTab === 'all' && (
            <select
                className="px-4 py-2.5 w-full border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.status || 'all'}
                onChange={(e) => {
                  const newStatus = e.target.value
                  onFiltersChange({ ...filters, status: newStatus })
                  // Synchroniser l'onglet actif avec le filtre de statut
                  if (onStatusChange) {
                    onStatusChange(newStatus)
                  }
                }}
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvée</option>
              <option value="REJECTED">Refusée</option>
            </select>
            )}
            <select
              className="px-4 py-2.5 w-full border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.creditType || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, creditType: e.target.value })}
            >
              <option value="all">Tous les types</option>
              <option value="SPECIALE">Spéciale</option>
              <option value="FIXE">Fixe</option>
              <option value="AIDE">Aide</option>
            </select>
          </div>

          {/* Ligne 2: Membres (Client et Garant) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
              <MemberSearchInput
                value={filters.clientId || ''}
                onChange={(memberId) => onFiltersChange({ ...filters, clientId: memberId })}
                placeholder="Rechercher un client..."
                label=""
                isRequired={false}
                initialDisplayName={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Garant</label>
              <MemberSearchInput
                value={filters.guarantorId || ''}
                onChange={(memberId) => onFiltersChange({ ...filters, guarantorId: memberId })}
                placeholder="Rechercher un garant..."
                label=""
                isRequired={false}
                initialDisplayName={selectedGuarantor ? `${selectedGuarantor.firstName} ${selectedGuarantor.lastName}` : ''}
              />
            </div>
          </div>

          {/* Ligne 3: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant principal
const ListDemandes = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialiser les états depuis l'URL
  const [filters, setFilters] = useState<{
    search: string
    status: string
    creditType: string
    clientId: string
    guarantorId: string
    dateFrom: string
    dateTo: string
  }>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    creditType: searchParams.get('creditType') || 'all',
    clientId: searchParams.get('clientId') || '',
    guarantorId: searchParams.get('guarantorId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  })
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage, setItemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>((searchParams.get('tab') as 'all' | 'pending' | 'approved' | 'rejected') || 'all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [validateModalState, setValidateModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    demand: null,
    action: 'approve',
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [simulationModalState, setSimulationModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [contractCreationState, setContractCreationState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
    simulation: StandardSimulation | CustomSimulation | null
  }>({
    isOpen: false,
    demand: null,
    simulation: null,
  })
  const { createFromDemand } = useCreditContractMutations()

  // Synchroniser l'URL avec l'état
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.creditType !== 'all') params.set('creditType', filters.creditType)
    if (filters.clientId) params.set('clientId', filters.clientId)
    if (filters.guarantorId) params.set('guarantorId', filters.guarantorId)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    if (activeTab !== 'all') params.set('tab', activeTab)
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, currentPage, itemsPerPage, viewMode, activeTab, router])

  // Hooks pour récupérer les données
  // Le filtre de statut dans le formulaire a la priorité sur l'onglet actif
  const getStatusFilter = () => {
    // Si un filtre de statut est défini dans le formulaire, l'utiliser
    if (filters.status && filters.status !== 'all') {
      return filters.status as CreditDemandStatus
    }
    // Sinon, utiliser l'onglet actif
    return activeTab === 'all' 
      ? 'all' 
      : activeTab === 'pending' 
        ? 'PENDING' 
        : activeTab === 'approved'
          ? 'APPROVED'
          : 'REJECTED'
  }

  const queryFilters: CreditDemandFilters = {
    status: getStatusFilter(),
    creditType: filters.creditType === 'all' ? 'all' : filters.creditType as any,
    search: filters.search || undefined,
    clientId: filters.clientId || undefined,
    guarantorId: filters.guarantorId || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    page: currentPage,
    limit: itemsPerPage,
  }

  const { data: demandes = [], isLoading, error } = useCreditDemands(queryFilters)
  
  // Stats globales (sans aucun filtre) pour les compteurs des tabs
  // Les compteurs doivent toujours afficher le total réel, indépendamment des filtres appliqués
  const globalStatsFilters: CreditDemandFilters = {
    status: 'all', // Pas de filtre de statut pour avoir toutes les stats
    // Pas d'autres filtres pour avoir les stats globales réelles
  }
  const { data: statsData } = useCreditDemandsStats(globalStatsFilters)
  
  const { updateStatus } = useCreditDemandMutations()

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.status, filters.creditType, filters.clientId, filters.guarantorId, filters.dateFrom, filters.dateTo, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ 
      search: '', 
      status: 'all', 
      creditType: 'all',
      clientId: '',
      guarantorId: '',
      dateFrom: '',
      dateTo: '',
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    // Le refetch est géré automatiquement par React Query
  }

  const formatAmount = (amount: number): string => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const buildExportRows = () => {
    return filteredDemandes.map((demande: CreditDemand) => [
      demande.id,
      getCreditTypeLabel(demande.creditType),
      `${demande.clientFirstName} ${demande.clientLastName}`,
      getStatusLabel(demande.status),
      formatAmount(demande.amount),
      demande.guarantorId ? `${demande.guarantorFirstName} ${demande.guarantorLastName}` : 'Aucun',
      demande.guarantorIsMember ? 'Oui' : 'Non',
      demande.createdAt ? new Date(demande.createdAt).toLocaleDateString('fr-FR') : '',
      demande.updatedAt ? new Date(demande.updatedAt).toLocaleDateString('fr-FR') : '',
    ])
  }

  const exportToExcel = async () => {
    if (!demandes || demandes.length === 0) {
      toast.error('Aucune demande à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const rows = buildExportRows()
      
      const headers = [
        'ID',
        'Type de crédit',
        'Client',
        'Statut',
        'Montant (FCFA)',
        'Garant',
        'Garant membre',
        'Date de création',
        'Dernière mise à jour',
      ]

      const tabLabel = activeTab === 'all' 
        ? 'Toutes' 
        : activeTab === 'pending' 
          ? 'En attente' 
          : activeTab === 'approved'
            ? 'Approuvées'
            : 'Rejetées'
      const sheetData = [
        ['LISTE DES DEMANDES DE CRÉDIT SPÉCIALE'],
        [`Onglet: ${tabLabel}`],
        [`Généré le ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        headers,
        ...rows,
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Fusionner les cellules pour les en-têtes
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
      ]

      // Définir la largeur des colonnes
      worksheet['!cols'] = headers.map(() => ({ wch: 20 }))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')
      
      const filename = `demandes_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  const exportToPDF = async () => {
    if (!demandes || demandes.length === 0) {
      toast.error('Aucune demande à exporter')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      // En-tête
      doc.setFontSize(16)
      doc.text('Liste des Demandes de Crédit Spéciale', 14, 14)
      doc.setFontSize(10)
      const tabLabel = activeTab === 'all' 
        ? 'Toutes' 
        : activeTab === 'pending' 
          ? 'En attente' 
          : activeTab === 'approved'
            ? 'Approuvées'
            : 'Rejetées'
      doc.text(`Onglet: ${tabLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${demandes.length} demande(s)`, 14, 28)

      const rows = buildExportRows()
      const headers = [
        'ID',
        'Type',
        'Client',
        'Statut',
        'Montant',
        'Garant',
        'Garant membre',
        'Date création',
        'Dernière MAJ',
      ]

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32 },
      })

      const filename = `demandes_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  // Fonctions utilitaires
  const getStatusColor = (status: CreditDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: CreditDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvée',
      REJECTED: 'Refusée',
    }
    return labels[status] || status
  }

  const getCreditTypeLabel = (type: string) => {
    const labels = {
      SPECIALE: 'Spéciale',
      FIXE: 'Fixe',
      AIDE: 'Aide',
    }
    return labels[type as keyof typeof labels] || type
  }

  // Les demandes sont déjà filtrées par le hook
  const filteredDemandes = demandes

  // Pagination
  const totalPages = Math.ceil(filteredDemandes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDemandes = filteredDemandes.slice(startIndex, endIndex)

  // Stats
  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        pendingPercentage: statsData.total > 0 ? (statsData.pending / statsData.total) * 100 : 0,
        approvedPercentage: statsData.total > 0 ? (statsData.approved / statsData.total) * 100 : 0,
        rejectedPercentage: statsData.total > 0 ? (statsData.rejected / statsData.total) * 100 : 0,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      pendingPercentage: 0,
      approvedPercentage: 0,
      rejectedPercentage: 0,
    }
  }, [statsData])

  // Gestion des erreurs
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
      {/* Onglets pour filtrer par statut */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'pending' | 'approved' | 'rejected')} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
            Approuvées ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejetées ({stats.rejected})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistiques */}
      <StatisticsCreditDemandes 
        status={
          activeTab === 'all' 
            ? undefined 
            : activeTab === 'pending' 
              ? 'PENDING' 
              : activeTab === 'approved'
                ? 'APPROVED'
                : 'REJECTED'
        } 
      />

      {/* Filtres */}
      <DemandFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        activeTab={activeTab}
        onStatusChange={(status) => {
          // Synchroniser l'onglet actif avec le filtre de statut
          if (status === 'all') {
            setActiveTab('all')
          } else if (status === 'PENDING') {
            setActiveTab('pending')
          } else if (status === 'APPROVED') {
            setActiveTab('approved')
          } else if (status === 'REJECTED') {
            setActiveTab('rejected')
          }
        }}
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
                  Liste des Demandes
                </h2>
                <p className="text-gray-600 font-medium">
                  {filteredDemandes.length.toLocaleString()} demande{filteredDemandes.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de vue modernes */}
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
                disabled={filteredDemandes.length === 0}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700 hover:text-green-800 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={filteredDemandes.length === 0}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-red-300 hover:border-red-400 hover:bg-red-50 text-red-700 hover:text-red-800 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <FileText className="w-4 h-4 mr-2" />
                Exporter PDF
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

      {/* Liste des demandes */}
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
            {currentDemandes.map((demande, index) => (
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
                        {getCreditTypeLabel(demande.creditType)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
                      {getStatusLabel(demande.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Client:</span>
                      <span className="font-medium text-gray-900">{demande.clientFirstName} {demande.clientLastName}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Montant:</span>
                      <span className="font-semibold text-green-600">
                        {demande.amount.toLocaleString('fr-FR')} FCFA
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

                    {demande.guarantorId && (
                      <GuarantorInfo 
                        guarantorId={demande.guarantorId}
                        guarantorFirstName={demande.guarantorFirstName}
                        guarantorLastName={demande.guarantorLastName}
                        guarantorIsMember={demande.guarantorIsMember}
                      />
                    )}

                    {/* Score toujours affiché pour admin */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Score:</span>
                      <Badge className={cn(
                        "font-bold text-sm px-2.5 py-1",
                        demande.score !== undefined && demande.score >= 8 ? "bg-green-100 text-green-700 border border-green-300" :
                        demande.score !== undefined && demande.score >= 5 ? "bg-yellow-100 text-yellow-700 border border-yellow-300" :
                        demande.score !== undefined ? "bg-red-100 text-red-700 border border-red-300" :
                        "bg-gray-100 text-gray-500 border border-gray-300"
                      )}>
                        {demande.score !== undefined ? `${demande.score}/10` : 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-auto space-y-2">
                    {demande.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'approve' })}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'reject' })}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {demande.status === 'APPROVED' && (
                      demande.contractId ? (
                        <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Contrat déjà créé
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSimulationModalState({ isOpen: true, demand: demande })}
                          disabled={createFromDemand.isPending}
                          className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          {createFromDemand.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Création...
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4 mr-1" />
                              Créer le contrat
                            </>
                          )}
                        </Button>
                      )
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
                    <Button
                      onClick={() => router.push(`/credit-speciale/demandes/${demande.id}`)}
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

          {/* Pagination */}
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
                  {Object.values(filters).some(f => f !== 'all' && f !== '')
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de demandes enregistrées dans le système.'
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

      {/* Modal de création */}
      <CreateCreditDemandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal de validation/rejet */}
      <ValidateDemandModal
        isOpen={validateModalState.isOpen}
        onClose={() => setValidateModalState({ isOpen: false, demand: null, action: 'approve' })}
        demand={validateModalState.demand}
        action={validateModalState.action}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false, demand: null })}
        demand={reopenModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de simulation */}
      {simulationModalState.demand && (
        <CreditSimulationModal
          isOpen={simulationModalState.isOpen}
          onClose={() => setSimulationModalState({ isOpen: false, demand: null })}
          creditType={simulationModalState.demand.creditType}
          initialAmount={simulationModalState.demand.amount}
          initialMonthlyPayment={simulationModalState.demand.monthlyPaymentAmount}
          onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
            // Fermer le modal de simulation et ouvrir le modal de création de contrat
            setSimulationModalState({ isOpen: false, demand: null })
            setContractCreationState({
              isOpen: true,
              demand: simulationModalState.demand,
              simulation,
            })
          }}
        />
      )}

      {/* Modal de création de contrat multi-étapes */}
      {contractCreationState.demand && contractCreationState.simulation && (
        <ContractCreationModal
          isOpen={contractCreationState.isOpen}
          onClose={() => setContractCreationState({ isOpen: false, demand: null, simulation: null })}
          demand={contractCreationState.demand}
          simulation={contractCreationState.simulation}
        />
      )}
    </div>
  )
}

export default ListDemandes

