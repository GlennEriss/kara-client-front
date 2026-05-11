'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import routes from '@/constantes/routes'
import ContractsFiltersV2 from '@/domains/financial/caisse-imprevue/components/contracts/filters/ContractsFiltersV2'
import { useContractsCI, type ContractCIFilters } from '@/domains/financial/caisse-imprevue/hooks/useContractsCI'
import { useSubscriptionsCICache } from '@/domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache'
import { useMembers } from '@/hooks/useMembers'
import { useCaisseImprevueContractsRealtimeSync } from '@/hooks/caisse-imprevue/useCaisseImprevueContractsRealtimeSync'
import { cn } from '@/lib/utils'
import { CONTRACT_CI_STATUS_LABELS, ContractCI, ContractCIStatus } from '@/types/types'
import {
    AlertCircle,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    DollarSign,
    Eye,
    FileEdit,
    FileText,
    Grid3X3,
    List,
    MoreVertical,
    Plus,
    RefreshCw,
    Trash2,
    User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DeleteContractCIModal from './DeleteContractCIModal'
import ReplaceContractCIModal from './ReplaceContractCIModal'
import StatisticsCI from './StatisticsCI'
import UploadContractCIModal from './UploadContractCIModal'
import ViewContractCIModal from './ViewContractCIModal'
import ViewRefundDocumentCIModal from './ViewRefundDocumentCIModal'
import ViewUploadedContractCIModal from './ViewUploadedContractCIModal'

const STATUS_COLORS: Record<ContractCIStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  FINISHED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELED: 'bg-red-100 text-red-700 border-red-200'
}

const FREQUENCY_LABELS = {
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel'
}

type ViewMode = 'grid' | 'list'
type ContractTabValue = 'all' | 'DAILY' | 'MONTHLY' | 'overdue' | 'currentMonth'

type ContractTabItem = {
  value: ContractTabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
}

const CONTRACT_TAB_VALUES: ContractTabValue[] = ['all', 'DAILY', 'MONTHLY', 'currentMonth', 'overdue']
const isContractTabValue = (value: string): value is ContractTabValue =>
  CONTRACT_TAB_VALUES.includes(value as ContractTabValue)

/** Afficher « Modifier contrat » : contractStartId existant et statut ACTIVE (doc § 2.1–2.2). */
function canReplaceContractCI(contract: ContractCI): boolean {
  return Boolean(contract.contractStartId) && contract.status === 'ACTIVE'
}

/** Formate une date contrat (string YYYY-MM-DD, Timestamp, Date) en fr-FR ou "—" si invalide */
function formatContractDate(value: string | Date | { toDate?: () => Date } | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : (value as { toDate?: () => Date })?.toDate?.() ?? null
  if (!date || isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR')
}

function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function hasActiveContractFilters(filters: ContractCIFilters): boolean {
  return Boolean(
    (filters.search && filters.search.trim() !== '') ||
      (filters.status && filters.status !== 'all') ||
      (filters.paymentFrequency && filters.paymentFrequency !== 'all') ||
      filters.subscriptionCIID ||
      filters.createdAtFrom ||
      filters.createdAtTo ||
      filters.nextDueAtFrom ||
      filters.nextDueAtTo ||
      filters.overdueOnly ||
      typeof filters.monthlyAmountMin === 'number' ||
      typeof filters.monthlyAmountMax === 'number' ||
      typeof filters.contractAmountMin === 'number' ||
      typeof filters.contractAmountMax === 'number' ||
      typeof filters.paidAmountMin === 'number' ||
      typeof filters.paidAmountMax === 'number' ||
      typeof filters.durationMonthsMin === 'number' ||
      typeof filters.durationMonthsMax === 'number' ||
      typeof filters.supportRemainingAmountMin === 'number' ||
      typeof filters.supportRemainingAmountMax === 'number' ||
      typeof filters.supportRepaidAmountMin === 'number' ||
      typeof filters.supportRepaidAmountMax === 'number' ||
      typeof filters.supportCountMin === 'number' ||
      typeof filters.supportCountMax === 'number' ||
      typeof filters.paymentCountMin === 'number' ||
      typeof filters.paymentCountMax === 'number'
  )
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
  useCaisseImprevueContractsRealtimeSync(true)

  const tabItems: ContractTabItem[] = [
    { value: 'all', label: 'Tous', icon: FileText },
    { value: 'DAILY', label: 'Journalier', icon: CalendarDays },
    { value: 'MONTHLY', label: 'Mensuel', icon: Calendar },
    { value: 'currentMonth', label: 'Mois en cours', icon: Calendar },
    { value: 'overdue', label: 'Retard', icon: AlertCircle, isDanger: true },
  ]
  
  // État pour l'onglet actif (Tous, Journalier, Mensuel, Retard, Mois en cours)
  const [activeTab, setActiveTab] = useState<ContractTabValue>('all')
  
  // États
  const [filters, setFilters] = useState<ContractCIFilters>({
    search: '',
    status: 'all' as ContractCIStatus | 'all',
    paymentFrequency: 'all',
    subscriptionCIID: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    nextDueAtFrom: undefined,
    nextDueAtTo: undefined,
    overdueOnly: false,
    monthlyAmountMin: undefined,
    monthlyAmountMax: undefined,
    contractAmountMin: undefined,
    contractAmountMax: undefined,
    paidAmountMin: undefined,
    paidAmountMax: undefined,
    durationMonthsMin: undefined,
    durationMonthsMax: undefined,
    supportRemainingAmountMin: undefined,
    supportRemainingAmountMax: undefined,
    supportRepaidAmountMin: undefined,
    supportRepaidAmountMax: undefined,
    supportCountMin: undefined,
    supportCountMax: undefined,
    paymentCountMin: undefined,
    paymentCountMax: undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isExporting, setIsExporting] = useState(false)
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
  const [showDeleteContractCIModal, setShowDeleteContractCIModal] = useState(false)
  const [selectedContractForDelete, setSelectedContractForDelete] = useState<ContractCI | null>(null)
  const [showReplaceContractCIModal, setShowReplaceContractCIModal] = useState(false)
  const [selectedContractForReplace, setSelectedContractForReplace] = useState<ContractCI | null>(null)
  const [selectedContractForOverview, setSelectedContractForOverview] = useState<{ contract: ContractCI; member?: any } | null>(null)
  const { data: subscriptions } = useSubscriptionsCICache()

  // Construire les filtres effectifs (aligné sur caisse-spéciale)
  const effectiveFilters = useMemo<ContractCIFilters>(() => {
    const nextFilters: ContractCIFilters = {
      ...filters,
      paymentFrequency:
        activeTab === 'DAILY' || activeTab === 'MONTHLY'
          ? activeTab
          : (filters.paymentFrequency || 'all'),
      overdueOnly: activeTab === 'overdue' ? true : Boolean(filters.overdueOnly),
    }

    if (activeTab === 'currentMonth') {
      const { start, end } = getCurrentMonthRange()
      nextFilters.nextDueAtFrom = start
      nextFilters.nextDueAtTo = end
      nextFilters.createdAtFrom = undefined
      nextFilters.createdAtTo = undefined
    }

    const hasCreatedRange = Boolean(nextFilters.createdAtFrom || nextFilters.createdAtTo)
    const hasNextDueRange = Boolean(nextFilters.nextDueAtFrom || nextFilters.nextDueAtTo)
    if (hasCreatedRange && hasNextDueRange) {
      nextFilters.nextDueAtFrom = undefined
      nextFilters.nextDueAtTo = undefined
    }

    return nextFilters
  }, [filters, activeTab])

  // Hook pour récupérer les contrats
  const { data: contracts, isLoading, error, refetch } = useContractsCI(effectiveFilters)
  
  const filteredContracts = useMemo(() => contracts || [], [contracts])

  const subscriptionOptions = useMemo(
    () =>
      (subscriptions || []).map((subscription) => ({
        id: subscription.id,
        code: subscription.code,
        label: subscription.label,
      })),
    [subscriptions]
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: ContractCIFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ 
      search: '', 
      status: 'all',
      paymentFrequency: 'all',
      subscriptionCIID: undefined,
      createdAtFrom: undefined,
      createdAtTo: undefined,
      nextDueAtFrom: undefined,
      nextDueAtTo: undefined,
      overdueOnly: false,
      monthlyAmountMin: undefined,
      monthlyAmountMax: undefined,
      contractAmountMin: undefined,
      contractAmountMax: undefined,
      paidAmountMin: undefined,
      paidAmountMax: undefined,
      durationMonthsMin: undefined,
      durationMonthsMax: undefined,
      supportRemainingAmountMin: undefined,
      supportRemainingAmountMax: undefined,
      supportRepaidAmountMin: undefined,
      supportRepaidAmountMax: undefined,
      supportCountMin: undefined,
      supportCountMax: undefined,
      paymentCountMin: undefined,
      paymentCountMax: undefined,
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
  const formatAmountWithSpaces = (value: number | string | undefined | null): string => {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0)
    if (!Number.isFinite(numeric)) return '0'

    const rounded = Math.round(numeric)
    const sign = rounded < 0 ? '-' : ''
    const digits = String(Math.abs(rounded))

    return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
  }

  const getExportTypeLabel = (): string => {
    if (activeTab === 'DAILY') return 'Journalier'
    if (activeTab === 'MONTHLY') return 'Mensuel'
    if (activeTab === 'overdue') return 'Retard'
    if (activeTab === 'currentMonth') return 'Mois en cours'
    return 'Tous'
  }

  const buildExportRows = () => {
    const contractsToExport = filteredContracts || contracts || []
    if (!contractsToExport || contractsToExport.length === 0) return []
    
    return contractsToExport.map((contract) => {
      const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'
      const statusLabel = CONTRACT_CI_STATUS_LABELS[contract.status]
      
      const startDate = contract.firstPaymentDate ? new Date(contract.firstPaymentDate) : null
      const endDate = startDate && !isNaN(startDate.getTime()) ? new Date(startDate) : null
      if (endDate) {
        endDate.setMonth(endDate.getMonth() + (contract.subscriptionCIDuration || 0))
      }
      
      return [
        contract.id,
        frequencyLabel,
        `${contract.memberFirstName} ${contract.memberLastName}`,
        statusLabel,
        formatAmountWithSpaces(contract.subscriptionCIAmountPerMonth),
        formatAmountWithSpaces(contract.subscriptionCINominal),
        contract.subscriptionCIDuration,
        formatContractDate(contract.firstPaymentDate).replace('—', ''),
        endDate ? endDate.toLocaleDateString('fr-FR') : '',
        contract.totalMonthsPaid,
        contract.subscriptionCIDuration - contract.totalMonthsPaid,
      ]
    })
  }

  const exportToExcel = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
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
      toast.success('Exporter Excel généré')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const typeLabel = getExportTypeLabel()
      const rows = buildExportRows()
      const headers = [
        'ID Contrat',
        'Type',
        'Membre',
        'Statut',
        'Mensualité FCFA',
        'Nominal FCFA',
        'Durée',
        'Date début',
        'Date fin',
        'Mois payés',
        'Restants',
      ]

      // En-tête document
      doc.setFont('times', 'bold')
      doc.setTextColor(20, 33, 50)
      doc.setFontSize(16)
      doc.text('Liste des Contrats - Caisse Imprévue', 14, 14)

      doc.setFont('times', 'normal')
      doc.setTextColor(70, 70, 70)
      doc.setFontSize(10)
      doc.text(`Type: ${typeLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${rows.length} contrat(s)`, 14, 28)
      doc.setDrawColor(35, 77, 101)
      doc.setLineWidth(0.3)
      doc.line(14, 31, 283, 31)

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          textColor: [30, 41, 59],
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          font: 'times',
          fillColor: [35, 77, 101],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [35, 77, 101],
          lineWidth: 0.2,
        },
        bodyStyles: {
          font: 'times',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 35, right: 14, bottom: 14, left: 14 },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 17, halign: 'center' },
          2: { cellWidth: 38 },
          3: { cellWidth: 25 },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 20, halign: 'center' },
          9: { cellWidth: 17, halign: 'center' },
          10: { cellWidth: 16, halign: 'center' },
        },
      })

      // Pagination en pied de page (Page X/Y)
      const totalPages = doc.getNumberOfPages()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(75, 85, 99)
        doc.text(`Page ${page}/${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' })
      }

      const filename = `contrats_ci_${activeTab === 'all' ? 'tous' : activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Exporter PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil((filteredContracts?.length || 0) / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = useMemo(
    () => filteredContracts.slice(startIndex, endIndex),
    [filteredContracts, startIndex, endIndex]
  )
  const currentMemberIds = useMemo(
    () => Array.from(new Set(currentContracts.map((c) => c.memberId).filter(Boolean))),
    [currentContracts]
  )
  const { data: currentMembers } = useMembers(currentMemberIds)
  const memberPhotoById = useMemo(() => {
    const map: Record<string, string> = {}
    ;(currentMembers || []).forEach((member) => {
      if (member?.id && member.photoURL) {
        map[member.id] = member.photoURL
      }
    })
    return map
  }, [currentMembers])
  const memberById = useMemo(() => {
    const map: Record<string, any> = {}
    ;(currentMembers || []).forEach((member) => {
      if (member?.id) {
        map[member.id] = member
      }
    })
    return map
  }, [currentMembers])

  const getStatusColor = (status: ContractCIStatus) =>
    STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200'

  const hasValidContractPdf = (contract: ContractCI) => Boolean(contract.contractStartId)

  const getContractEndDate = (contract: ContractCI) => {
    if (!contract.firstPaymentDate) return '—'
    const start = new Date(contract.firstPaymentDate)
    if (Number.isNaN(start.getTime())) return '—'
    const end = new Date(start)
    end.setMonth(end.getMonth() + (contract.subscriptionCIDuration || 0))
    return end.toLocaleDateString('fr-FR')
  }

  const hasAnyActiveFilter = hasActiveContractFilters(filters) || activeTab !== 'all'

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <Card className="border border-[#234D65]/20 bg-gradient-to-r from-white to-slate-50/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {startIndex + 1}-{Math.min(endIndex, filteredContracts?.length || 0)} sur {filteredContracts?.length || 0} contrats
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-[#234D65]/35 px-3 py-1 text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
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
                className="border-[#234D65]/35 px-3 py-1 text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white"
              >
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
      {/* Carrousel de statistiques (chargé une fois, mêmes stats pour tous les onglets) */}
      <StatisticsCI />

      {/* Filtres : filtre "Type de contrat" visible uniquement dans l'onglet Tous (et Retard / Mois en cours) */}
      <ContractsFiltersV2
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        subscriptions={subscriptionOptions}
        showPaymentFrequencyFilter={activeTab === 'all' || activeTab === 'overdue' || activeTab === 'currentMonth'}
        isOverdueTab={activeTab === 'overdue'}
      />

      {/* Barre d'actions - design aligné avec caisse spéciale */}
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-xl font-black text-transparent md:text-2xl">
                  Liste des Contrats
                </h2>
                <p className="font-medium text-gray-600">
                  {(filteredContracts?.length || 0).toLocaleString()} contrat{(filteredContracts?.length || 0) !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:w-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${viewMode === 'grid'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${viewMode === 'list'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <List className="mr-2 h-4 w-4" />
                  Table
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 w-full cursor-pointer rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] transition-all duration-200 hover:bg-[#234D65] hover:text-white disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting || filteredContracts.length === 0}
                    className="h-10 w-full cursor-pointer rounded-xl border-2 border-emerald-300 bg-white px-4 text-emerald-700 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 sm:w-auto"
                  >
                    {isExporting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isExporting) exportToExcel()
                    }}
                    className="cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4 text-emerald-700" />
                    Exporter Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isExporting) exportToPDF()
                    }}
                    className="cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4 text-rose-700" />
                    Exporter PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={handleCreateContract}
                className="h-10 w-full cursor-pointer rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Contrat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Onglets pour filtrer par type de contrat (rattachés à la liste) */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isContractTabValue(value)) {
            setActiveTab(value)
          }
        }}
        className="w-full"
      >
        {/* Tabs desktop : style onglets classeur */}
        <div className="hidden lg:flex items-center gap-2 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <TabsList className="relative flex w-full flex-nowrap overflow-x-auto scrollbar-hide bg-transparent p-0 h-auto gap-0.5">
              {tabItems.map(({ value, label, icon: Icon, isDanger }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]',
                    isDanger ? 'data-[state=active]:text-red-700 data-[state=active]:border-red-300' : ''
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Tabs mobile/tablette (badges scrollables) */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabItems.map(({ value, label, icon: Icon, isDanger }) => {
              const isActive = activeTab === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (isContractTabValue(value)) {
                      setActiveTab(value)
                    }
                  }}
                  className="shrink-0"
                >
                  <Badge
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2',
                      isActive
                        ? isDanger
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-[#234D65] text-white border-transparent'
                        : isDanger
                        ? 'bg-white text-red-600 border-red-200'
                        : 'bg-white text-gray-700 border-gray-200'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </Tabs>

      {/* Liste des contrats */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-2'}>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} />
          ))}
        </div>
      ) : currentContracts.length > 0 ? (
        <>
          {viewMode === 'grid' && (
            <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/30 p-4 md:p-5">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                {currentContracts.map((contract: ContractCI, index: number) => {
                  const member = memberById[contract.memberId]
                  const hasPdf = hasValidContractPdf(contract)
                  const fullName = `${contract.memberFirstName || member?.firstName || ''} ${contract.memberLastName || member?.lastName || ''}`.trim()
                  const displayName = fullName || 'Membre non renseigné'
                  const contacts = contract.memberContacts?.length
                    ? contract.memberContacts.join(' / ')
                    : member?.contacts?.length
                      ? member.contacts.join(' / ')
                      : '—'
                  const primaryContact = contract.memberEmail || member?.email || contacts
                  const initials = `${(contract.memberFirstName || member?.firstName || '')[0] || ''}${(contract.memberLastName || member?.lastName || '')[0] || ''}`.toUpperCase() || 'CI'
                  const paidAmount = (contract.totalMonthsPaid || 0) * (contract.subscriptionCIAmountPerMonth || 0)

                  return (
                    <div
                      key={contract.id}
                      className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <Card className="group relative h-full flex flex-col overflow-hidden border border-[#234D65]/20 bg-gradient-to-br from-white via-white to-[#234D65]/[0.04] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#234D65]/45 hover:shadow-xl">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#CBB171]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                        {activeTab === 'overdue' && (
                          <Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            En retard
                          </Badge>
                        )}

                        <CardContent className="relative z-10 flex-1 flex flex-col p-6">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0">
                              <Avatar className="size-14 rounded-xl ring-2 ring-[#234D65]/12">
                                {(contract.memberPhotoUrl || memberPhotoById[contract.memberId]) ? (
                                  <AvatarImage
                                    src={contract.memberPhotoUrl || memberPhotoById[contract.memberId]}
                                    alt={`Photo de ${displayName}`}
                                    className="h-full w-full object-cover object-center"
                                  />
                                ) : (
                                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white font-semibold">
                                    {initials}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-gray-500">Matricule contrat</div>
                              <div className="font-mono text-xs font-semibold tracking-wide text-[#234D65] break-all">{contract.id}</div>
                              <div className="mt-1 truncate text-sm font-bold text-slate-900">{displayName}</div>
                              <div className="truncate text-xs text-slate-500">{primaryContact || '—'}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                              {contract.subscriptionCICode}
                            </Badge>
                            <Badge className={`border ${getStatusColor(contract.status)}`}>
                              {CONTRACT_CI_STATUS_LABELS[contract.status]}
                            </Badge>
                          </div>

                          <div className="mt-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white p-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Fréquence</p>
                                <p className="font-semibold text-slate-900">
                                  {FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mensualité</p>
                                <p className="font-extrabold text-[#234D65]">{(contract.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')} FCFA</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Durée</p>
                                <p className="font-semibold text-slate-900">{contract.subscriptionCIDuration} mois</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Date de fin</p>
                                <p className="font-medium text-slate-900">{getContractEndDate(contract)}</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                              <div className="flex items-center gap-1.5">
                                {hasPdf ? (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-xs font-medium text-emerald-700">PDF disponible</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-xs font-medium text-orange-600">PDF à téléverser</span>
                                  </>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                Versé: {paidAmount.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200 mt-auto">
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
                                onClick={() => setSelectedContractForOverview({ contract, member })}
                                variant="outline"
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
                              >
                                <User className="h-4 w-4" />
                                Détails complets du contrat
                              </Button>

                              {contract.contractStartId ? (
                                <>
                                  <Button
                                    onClick={() => handleViewUploadedContract(contract)}
                                    variant="outline"
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-[#234D65]/30 bg-white text-[#234D65] transition-all cursor-pointer hover:bg-[#234D65] hover:text-white"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Voir contrat
                                  </Button>
                                  {canReplaceContractCI(contract) && (
                                    <Button
                                      onClick={() => { setSelectedContractForReplace(contract); setShowReplaceContractCIModal(true) }}
                                      variant="outline"
                                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-2 border-amber-300 text-amber-700 cursor-pointer hover:bg-amber-50 hover:border-amber-400"
                                    >
                                      <FileEdit className="h-4 w-4" />
                                      Modifier contrat
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  onClick={() => handleUploadContract(contract)}
                                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-orange-100 text-orange-700 border border-orange-200 cursor-pointer hover:bg-orange-200 hover:text-orange-800"
                                >
                                  <Plus className="h-4 w-4" />
                                  Téléverser le document PDF
                                </Button>
                              )}

                              <Button
                                onClick={() => handleDownloadContract(contract)}
                                variant="outline"
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-[#234D65] text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white"
                              >
                                <Download className="h-4 w-4" />
                                Télécharger contrat
                              </Button>

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

                              <Button
                                variant="destructive"
                                onClick={() => { setSelectedContractForDelete(contract); setShowDeleteContractCIModal(true) }}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-red-600 cursor-pointer hover:bg-red-700 text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="overflow-x-auto rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white to-slate-50/35 shadow-sm">
              <table className="min-w-[1400px] w-full text-sm">
                <thead className="bg-gradient-to-r from-[#234D65]/10 via-[#234D65]/[0.06] to-transparent text-[#234D65]">
                  <tr>
                    <th className="text-left px-4 py-3">Photo</th>
                    <th className="text-left px-4 py-3">Matricule contrat</th>
                    <th className="text-center px-4 py-3">Statut</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Prénom</th>
                    <th className="text-left px-4 py-3">Matricule membre</th>
                    <th className="text-left px-4 py-3">Contacts</th>
                    <th className="text-left px-4 py-3">Contact urgent</th>
                    <th className="text-right px-4 py-3">Mensualité</th>
                    <th className="text-right px-4 py-3">Durée</th>
                    <th className="text-right px-4 py-3">Début</th>
                    <th className="text-right px-4 py-3">Date de fin</th>
                    <th className="text-left px-4 py-3">PDF</th>
                    <th className="text-right px-4 py-3">Versé</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentContracts.map((contract: ContractCI) => {
                    const member = memberById[contract.memberId]
                    const fullName = `${contract.memberFirstName || member?.firstName || ''} ${contract.memberLastName || member?.lastName || ''}`.trim()
                    const initials = `${(contract.memberFirstName || member?.firstName || '')[0] || ''}${(contract.memberLastName || member?.lastName || '')[0] || ''}`.toUpperCase() || 'CI'
                    const contacts = contract.memberContacts?.length
                      ? contract.memberContacts.join(' / ')
                      : member?.contacts?.length
                        ? member.contacts.join(' / ')
                        : '—'
                    const emergency = contract.emergencyContact
                    const hasPdf = hasValidContractPdf(contract)
                    const paidAmount = (contract.totalMonthsPaid || 0) * (contract.subscriptionCIAmountPerMonth || 0)

                    return (
                      <tr key={contract.id} className="transition-colors hover:bg-[#234D65]/[0.045]">
                        <td className="px-4 py-3">
                          <Avatar className="size-10 rounded-lg ring-1 ring-[#234D65]/15">
                            {(contract.memberPhotoUrl || memberPhotoById[contract.memberId]) ? (
                              <AvatarImage
                                src={contract.memberPhotoUrl || memberPhotoById[contract.memberId]}
                                alt={`Photo de ${fullName || 'Membre'}`}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white font-semibold">
                                {initials}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{contract.id}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                            {CONTRACT_CI_STATUS_LABELS[contract.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}</td>
                        <td className="px-4 py-3">{contract.memberLastName || member?.lastName || '—'}</td>
                        <td className="px-4 py-3">{contract.memberFirstName || member?.firstName || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{member?.matricule || contract.memberId || '—'}</td>
                        <td className="px-4 py-3">
                          {contacts}
                          {(contract.memberEmail || member?.email) ? ` • ${contract.memberEmail || member?.email}` : ''}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{emergency?.lastName || '—'} {emergency?.firstName || ''}</div>
                          <div>{emergency?.phone1 || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{(contract.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3 text-right">{contract.subscriptionCIDuration} mois</td>
                        <td className="px-4 py-3 text-right">{formatContractDate(contract.firstPaymentDate)}</td>
                        <td className="px-4 py-3 text-right">{getContractEndDate(contract)}</td>
                        <td className="px-4 py-3">
                          {hasPdf ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3" /> Disponible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-500 text-xs">
                              <AlertCircle className="h-3 w-3" /> À téléverser
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{paidAmount.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full cursor-pointer data-[state=open]:bg-gray-100"
                                  title="Actions"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[210px]">
                                <DropdownMenuItem
                                  onClick={() => handleViewContract(contract.id)}
                                  disabled={!contract.contractStartId}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSelectedContractForOverview({ contract, member })}
                                  className="cursor-pointer"
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Détails complets du contrat
                                </DropdownMenuItem>
                                {hasPdf ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleViewUploadedContract(contract)}
                                      className="cursor-pointer"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Voir contrat
                                    </DropdownMenuItem>
                                    {canReplaceContractCI(contract) && (
                                      <DropdownMenuItem
                                        onClick={() => { setSelectedContractForReplace(contract); setShowReplaceContractCIModal(true) }}
                                        className="cursor-pointer"
                                      >
                                        <FileEdit className="h-4 w-4 mr-2" />
                                        Modifier contrat
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleUploadContract(contract)}
                                    className="cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Téléverser le document PDF
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDownloadContract(contract)}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger contrat
                                </DropdownMenuItem>
                                {contract.status === 'FINISHED' && contract.finalRefundDocumentId && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundDocument(contract, 'FINAL')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de remboursement
                                  </DropdownMenuItem>
                                )}
                                {contract.status === 'CANCELED' && contract.earlyRefundDocumentId && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundDocument(contract, 'EARLY')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de résiliation
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => { setSelectedContractForDelete(contract); setShowDeleteContractCIModal(true) }}
                                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination()}
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
                  {hasAnyActiveFilter
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de contrats enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {hasAnyActiveFilter && (
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

      {/* Modal récapitulatif complet du contrat */}
      {selectedContractForOverview && (
        <Dialog open={!!selectedContractForOverview} onOpenChange={(open) => { if (!open) setSelectedContractForOverview(null) }}>
          <DialogContent className="!w-[95vw] !max-w-[1400px] p-0 overflow-hidden border-0 shadow-2xl">
            {(() => {
              const contract = selectedContractForOverview.contract
              const member = selectedContractForOverview.member
              const emergency = contract?.emergencyContact
              const hasPdf = hasValidContractPdf(contract)
              const contractStatus = CONTRACT_CI_STATUS_LABELS[contract?.status] || '—'
              const memberFirstName = contract?.memberFirstName || member?.firstName || ''
              const memberLastName = contract?.memberLastName || member?.lastName || ''
              const memberFullName = `${memberFirstName} ${memberLastName}`.trim() || 'Membre non renseigné'
              const memberInitials = `${memberFirstName[0] || ''}${memberLastName[0] || ''}`.toUpperCase() || 'CI'
              const contacts = contract?.memberContacts?.length
                ? contract.memberContacts.join(' • ')
                : member?.contacts?.length
                  ? member.contacts.join(' • ')
                  : '—'
              const memberEmail = contract?.memberEmail || member?.email || '—'
              const firstPaymentDate = formatContractDate(contract?.firstPaymentDate)
              const endDate = getContractEndDate(contract)
              const monthlyAmount = (contract?.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')
              const totalNominal = (contract?.subscriptionCINominal || 0).toLocaleString('fr-FR')
              const paidAmountValue = (contract?.totalMonthsPaid || 0) * (contract?.subscriptionCIAmountPerMonth || 0)
              const paidAmount = paidAmountValue.toLocaleString('fr-FR')
              const durationMonths = contract?.subscriptionCIDuration || 0
              const remainingMonths = Math.max(durationMonths - (contract?.totalMonthsPaid || 0), 0)

              return (
                <div className="bg-gradient-to-b from-white via-white to-slate-50/80 text-sm">
                  <DialogHeader className="border-b border-[#234D65]/15 bg-gradient-to-r from-[#234D65] via-[#285773] to-[#234D65] px-6 py-5 text-white">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-white">Détails complets du contrat</DialogTitle>
                        <p className="mt-1 text-sm text-white/85">Vue détaillée harmonisée avec le thème Caisse Spéciale</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border bg-white/90 text-xs font-semibold', getStatusColor(contract?.status))}>
                          {contractStatus}
                        </Badge>
                        <Badge
                          className={cn(
                            'border text-xs font-semibold',
                            hasPdf
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          )}
                        >
                          {hasPdf ? 'PDF disponible' : 'PDF manquant'}
                        </Badge>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="max-h-[78vh] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-4">
                            <Avatar className="size-14 rounded-xl ring-2 ring-[#234D65]/15">
                              {(contract?.memberPhotoUrl || memberPhotoById[contract?.memberId]) ? (
                                <AvatarImage
                                  src={contract?.memberPhotoUrl || memberPhotoById[contract?.memberId]}
                                  alt={`Photo de ${memberFullName}`}
                                  className="h-full w-full object-cover object-center"
                                />
                              ) : (
                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white text-base font-semibold">
                                  {memberInitials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-base font-semibold text-slate-900">{memberFullName}</p>
                              <p className="font-mono text-xs text-slate-500">{member?.matricule || contract?.memberId || 'Matricule non renseigné'}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge className="border border-[#234D65]/25 bg-[#234D65]/10 text-[#234D65] hover:bg-[#234D65]/15">
                                  <User className="mr-1 h-3.5 w-3.5" />
                                  {FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}
                                </Badge>
                                <Badge className="border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200">
                                  ID: {contract?.id?.slice(-8) || '—'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{contacts}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                              <p className="mt-1 text-sm font-medium text-slate-800 break-all">{memberEmail}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Contact urgent</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nom</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.lastName || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Prénom</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.firstName || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Téléphone</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.phone1 || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Montants</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-xl bg-gradient-to-r from-[#234D65]/10 to-[#234D65]/5 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-[#234D65]/80">Mensualité</p>
                              <p className="text-lg font-semibold text-[#234D65]">{monthlyAmount} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nominal total</p>
                              <p className="text-base font-semibold text-slate-900">{totalNominal} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total versé</p>
                              <p className="text-base font-semibold text-slate-900">{paidAmount} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mois payés</p>
                              <p className="text-base font-semibold text-slate-900">{contract?.totalMonthsPaid || 0} / {durationMonths}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Échéances</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Début d'échéance</p>
                              <p className="text-base font-semibold text-slate-900">{firstPaymentDate}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Date de fin</p>
                              <p className="text-base font-semibold text-slate-900">{endDate}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mois restants</p>
                              <p className="text-base font-semibold text-slate-900">{remainingMonths} mois</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Forfait & document</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Forfait</p>
                              <p className="text-base font-semibold text-slate-900">{contract?.subscriptionCILabel || contract?.subscriptionCICode || '—'}</p>
                            </div>
                            <div
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                                hasPdf
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-orange-200 bg-orange-50 text-orange-700'
                              )}
                            >
                              {hasPdf ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                              {hasPdf ? 'Contrat PDF disponible' : 'Contrat PDF à téléverser'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedContractForOverview(null)}
                        className="rounded-xl border-[#234D65]/30 px-5 text-[#234D65] cursor-pointer hover:bg-[#234D65]/10 hover:text-[#234D65]"
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
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

      <DeleteContractCIModal
        isOpen={showDeleteContractCIModal}
        onClose={() => {
          setShowDeleteContractCIModal(false)
          setSelectedContractForDelete(null)
        }}
        contract={selectedContractForDelete}
        onSuccess={() => {
          setShowDeleteContractCIModal(false)
          setSelectedContractForDelete(null)
        }}
      />

      <ReplaceContractCIModal
        isOpen={showReplaceContractCIModal}
        onClose={() => {
          setShowReplaceContractCIModal(false)
          setSelectedContractForReplace(null)
        }}
        contract={selectedContractForReplace}
        onSuccess={() => {
          setShowReplaceContractCIModal(false)
          setSelectedContractForReplace(null)
        }}
      />
    </div>
  )
}
