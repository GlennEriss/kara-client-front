'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Plus,
  Eye,
  Calendar,
  CalendarDays,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileSpreadsheet,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import { ContractCI, ContractCIStatus, CONTRACT_CI_STATUS_LABELS, CaisseImprevuePaymentFrequency } from '@/types/types'
import { useContractsCI, ContractsCIFilters } from '@/hooks/caisse-imprevue/useContractsCI'
import StatisticsCI from './StatisticsCI'
import FiltersCI from './FiltersCI'
import routes from '@/constantes/routes'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import ViewContractCIModal from './ViewContractCIModal'
import UploadContractCIModal from './UploadContractCIModal'
import ViewUploadedContractCIModal from './ViewUploadedContractCIModal'
import ViewRefundDocumentCIModal from './ViewRefundDocumentCIModal'

const STATUS_COLORS: Record<ContractCIStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  FINISHED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELED: 'bg-red-100 text-red-700 border-red-200'
}

const FREQUENCY_LABELS = {
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel'
}

// Composant skeleton moderne
const ModernSkeleton = () => (
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

export default function ListContractsCISection() {
  const router = useRouter()
  
  // État pour l'onglet actif (Tous, Journalier, Mensuel, Retard)
  const [activeTab, setActiveTab] = useState<'all' | 'DAILY' | 'MONTHLY' | 'overdue'>('all')
  
  // États
  const [filters, setFilters] = useState<ContractsCIFilters>({
    search: '',
    status: 'ACTIVE' as ContractCIStatus | 'all',
    paymentFrequency: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 14
  
  // États pour les modals
  const [selectedContractForPDF, setSelectedContractForPDF] = useState<ContractCI | null>(null)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<ContractCI | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedContractForView, setSelectedContractForView] = useState<ContractCI | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedContractForRefund, setSelectedContractForRefund] = useState<ContractCI | null>(null)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)

  // Construire les filtres avec paymentFrequency et overdueOnly selon l'onglet actif
  const effectiveFilters: ContractsCIFilters = {
    ...filters,
    paymentFrequency: activeTab === 'all' || activeTab === 'overdue' ? 'all' : activeTab,
    overdueOnly: activeTab === 'overdue'
  }

  // Hook pour récupérer les contrats
  const { data: contracts, isLoading, error, refetch } = useContractsCI(effectiveFilters)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.status, filters.search, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ 
      search: '', 
      status: 'ACTIVE',
      paymentFrequency: 'all'
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    await refetch()
  }

  const handleViewContract = (contractId: string) => {
    router.push(routes.admin.caisseImprevueContractDetails(contractId))
  }

  const handleCreateContract = () => {
    router.push(routes.admin.caisseImprevueCreateContract)
  }

  const handleDownloadContract = (contract: ContractCI) => {
    setSelectedContractForPDF(contract)
    setIsPDFModalOpen(true)
  }

  const handleUploadContract = (contract: ContractCI) => {
    setSelectedContractForUpload(contract)
    setIsUploadModalOpen(true)
  }

  const handleViewUploadedContract = (contract: ContractCI) => {
    setSelectedContractForView(contract)
    setIsViewModalOpen(true)
  }

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false)
    setSelectedContractForPDF(null)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setSelectedContractForUpload(null)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedContractForView(null)
  }

  const handleViewRefundDocument = (contract: ContractCI, type: 'FINAL' | 'EARLY') => {
    setSelectedContractForRefund(contract)
    setRefundType(type)
    setIsRefundModalOpen(true)
  }

  const handleCloseRefundModal = () => {
    setIsRefundModalOpen(false)
    setSelectedContractForRefund(null)
    setRefundType(null)
  }

  const handleUploadSuccess = () => {
    refetch()
  }

  // Fonctions d'export
  const buildExportRows = () => {
    if (!contracts) return []
    
    return contracts.map((contract) => {
      const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'
      const statusLabel = CONTRACT_CI_STATUS_LABELS[contract.status]
      
      const startDate = contract.firstPaymentDate ? new Date(contract.firstPaymentDate) : null
      const endDate = startDate ? new Date(startDate) : null
      if (endDate) {
        endDate.setMonth(endDate.getMonth() + (contract.subscriptionCIDuration || 0))
      }
      
      return [
        contract.id,
        frequencyLabel,
        `${contract.memberFirstName} ${contract.memberLastName}`,
        statusLabel,
        new Intl.NumberFormat('fr-FR').format(contract.subscriptionCIAmountPerMonth),
        new Intl.NumberFormat('fr-FR').format(contract.subscriptionCINominal),
        contract.subscriptionCIDuration,
        contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '',
        endDate ? endDate.toLocaleDateString('fr-FR') : '',
        contract.totalMonthsPaid,
        contract.subscriptionCIDuration - contract.totalMonthsPaid,
      ]
    })
  }

  const handleExportExcel = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const rows = buildExportRows()
      
      const headers = [
        'ID',
        'Type',
        'Membre',
        'Statut',
        'Montant mensuel (FCFA)',
        'Nominal (FCFA)',
        'Durée (mois)',
        'Date début',
        'Date de fin',
        'Mois payés',
        'Versements en attente',
      ]

      const sheetData = [
        ['LISTE DES CONTRATS CAISSE IMPRÉVUE'],
        [`Type: ${activeTab === 'all' ? 'Tous' : activeTab === 'DAILY' ? 'Journalier' : 'Mensuel'}`],
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contrats')
      
      const filename = `contrats_ci_${activeTab === 'all' ? 'tous' : activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  const handleExportPDF = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      // En-tête
      doc.setFontSize(16)
      doc.text('Liste des Contrats - Caisse Imprévue', 14, 14)
      doc.setFontSize(10)
      const typeLabel = activeTab === 'all' ? 'Tous' : activeTab === 'DAILY' ? 'Journalier' : 'Mensuel'
      doc.text(`Type: ${typeLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${contracts.length} contrat(s)`, 14, 28)

      const rows = buildExportRows()
      const headers = [
        'ID',
        'Type',
        'Membre',
        'Statut',
        'Montant mensuel',
        'Nominal',
        'Durée',
        'Date début',
        'Date de fin',
        'Mois payés',
        'En attente',
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

      const filename = `contrats_ci_${activeTab === 'all' ? 'tous' : activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  // Pagination
  const totalPages = Math.ceil((contracts?.length || 0) / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = contracts?.slice(startIndex, endIndex) || []

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats : {error instanceof Error ? error.message : 'Erreur inconnue'}
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
      {/* Onglets pour filtrer par type de contrat */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'DAILY' | 'MONTHLY' | 'overdue')} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="DAILY" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Journalier
          </TabsTrigger>
          <TabsTrigger value="MONTHLY" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mensuel
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2 text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">
            <AlertCircle className="h-4 w-4" />
            Retard
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistiques */}
      <StatisticsCI paymentFrequency={activeTab === 'all' || activeTab === 'overdue' ? undefined : activeTab} />

      {/* Filtres */}
      <FiltersCI
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
                  {(contracts?.length || 0).toLocaleString()} contrat{(contracts?.length || 0) !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                onClick={handleCreateContract}
                className="cursor-pointer h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} />
          ))}
        </div>
      ) : currentContracts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {currentContracts.map((contract: ContractCI, index: number) => (
              <div
                key={contract.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Badge "En retard" - sera affiché si le contrat est dans l'onglet "Retard" */}
                  {activeTab === 'overdue' && (
                    <Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      En retard
                    </Badge>
                  )}

                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 bg-blue-100 text-blue-600">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-mono text-sm font-bold text-gray-900">#{contract.id.slice(-6)}</h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                            {contract.subscriptionCICode}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[contract.status]}`}>
                        {CONTRACT_CI_STATUS_LABELS[contract.status]}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Nom:</span>
                        <span className="font-medium text-gray-900">{contract.memberLastName}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prénom:</span>
                        <span className="font-medium text-gray-900">{contract.memberFirstName}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Forfait:</span>
                        <span className="font-medium text-gray-900">{contract.subscriptionCILabel || contract.subscriptionCICode}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Montant mensuel:</span>
                        <span className="font-semibold text-green-600">
                          {(contract.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Durée:</span>
                        <span className="font-medium text-gray-900">{contract.subscriptionCIDuration} mois</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Fréquence:</span>
                        <span className="font-medium text-gray-900">
                          {FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Premier versement:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          {contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Date de fin:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <CalendarDays className="h-3 w-3" />
                          {contract.firstPaymentDate ? (() => {
                            const startDate = new Date(contract.firstPaymentDate)
                            const endDate = new Date(startDate)
                            endDate.setMonth(endDate.getMonth() + (contract.subscriptionCIDuration || 0))
                            return endDate.toLocaleDateString('fr-FR')
                          })() : '—'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Contact urgence:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Phone className="h-3 w-3" />
                          <span className="text-xs">{contract.emergencyContact?.phone1 || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 mt-auto">
                      <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Nominal: {(contract.subscriptionCINominal || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleViewContract(contract.id)}
                          disabled={!contract.contractStartId}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#224D62]"
                        >
                          <Eye className="h-4 w-4" />
                          Ouvrir
                        </Button>
                        
                        <Button
                          onClick={() => handleDownloadContract(contract)}
                          variant="outline"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                        >
                          <FileText className="h-4 w-4" />
                          Télécharger contrat
                        </Button>

                        {contract.contractStartId ? (
                          <Button
                            onClick={() => handleViewUploadedContract(contract)}
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                          >
                            <Eye className="h-4 w-4" />
                            Voir contrat
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUploadContract(contract)}
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                          >
                            <Plus className="h-4 w-4" />
                            Téléverser contrat
                          </Button>
                        )}

                        {/* Bouton pour voir le document de remboursement si le contrat est terminé ou résilié */}
                        {contract.status === 'FINISHED' && contract.finalRefundDocumentId && (
                          <Button
                            onClick={() => handleViewRefundDocument(contract, 'FINAL')}
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                             Contrat de remboursement
                          </Button>
                        )}

                        {contract.status === 'CANCELED' && contract.earlyRefundDocumentId && (
                          <Button
                            onClick={() => handleViewRefundDocument(contract, 'EARLY')}
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
                          >
                            <Eye className="h-4 w-4" />
                            Contrat de résiliation
                          </Button>
                        )}
                      </div>
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
                    Affichage {startIndex + 1}-{Math.min(endIndex, contracts?.length || 0)} sur {contracts?.length || 0} contrats
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
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
                      <ChevronRight className="h-4 w-4 ml-1" />
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

      {/* Modals */}
      {selectedContractForPDF && (
        <ViewContractCIModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          contract={selectedContractForPDF}
        />
      )}

      {selectedContractForUpload && (
        <UploadContractCIModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          contract={selectedContractForUpload}
          onSuccess={handleUploadSuccess}
        />
      )}

      {selectedContractForView && (
        <ViewUploadedContractCIModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          contract={selectedContractForView}
        />
      )}

      {selectedContractForRefund && refundType && (
        <ViewRefundDocumentCIModal
          isOpen={isRefundModalOpen}
          onClose={handleCloseRefundModal}
          contract={selectedContractForRefund}
          refundType={refundType}
        />
      )}
    </div>
  )
}
