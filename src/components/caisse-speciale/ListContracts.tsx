'use client'
import React, { useRef } from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  TrendingUp,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  User,
  Users as GroupIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Upload
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useContracts } from '@/hooks/useContracts'
import { useClosedNominalSum } from '@/hooks'
import { useMembers } from '@/hooks/useMembers'
import { toast } from 'sonner'
import routes from '@/constantes/routes'
import CaisseSpecialePDFModal from './CaisseSpecialePDFModal'
import ContractPdfUploadModal from './ContractPdfUploadModal'
import ViewUploadedContractModal from './ViewUploadedContractModal'
import { listRefunds } from '@/db/caisse/refunds.db'

type ViewMode = 'grid' | 'list'

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
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX, handleEnd, handleMove])

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

// Composant pour les statistiques modernes
const StatsCard = ({
  title,
  value,
  subtitle,
  percentage,
  color,
  icon: Icon,
  trend
}: {
  title: string
  value: number | string
  subtitle?: string
  percentage: number
  color: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
}) => {
  const data = [
    { name: 'value', value: percentage, fill: color },
    { name: 'remaining', value: 100 - percentage, fill: '#f3f4f6' }
  ]

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${color}15`, color: color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {trend && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
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

// Composant Carrousel des statistiques avec drag/swipe
const StatsCarousel = ({ stats, closedNominalSum }: { stats: any; closedNominalSum: number }) => {
  const _formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount)
  }

  const statsData = [
    { title: 'Total', value: stats.total, percentage: 100, color: '#6b7280', icon: FileText },
    { title: 'Montant Total', value: new Intl.NumberFormat('fr-FR').format(closedNominalSum || 0), percentage: 100, color: '#0ea5e9', icon: DollarSign, trend: 'up' as const },
    { title: 'En cours', value: stats.draft, percentage: stats.draftPercentage, color: '#9ca3af', icon: FileText, trend: 'neutral' as const },
    { title: 'Actifs', value: stats.active, percentage: stats.activePercentage, color: '#10b981', icon: CheckCircle, trend: 'up' as const },
    { title: 'En Retard', value: stats.late, percentage: stats.latePercentage, color: '#ef4444', icon: Clock, trend: stats.latePercentage > 20 ? 'up' as const : 'neutral' as const },
    { title: 'Individuels', value: stats.individual, percentage: stats.individualPercentage, color: '#3b82f6', icon: User, trend: 'neutral' as const },
    { title: 'Groupes', value: stats.group, percentage: stats.groupPercentage, color: '#8b5cf6', icon: GroupIcon, trend: 'neutral' as const },
    // Statistiques des tontines closes (toujours affichées même à 0)
    {
      title: 'Standard Closes',
      value: `${stats.closedStats?.STANDARD?.count || 0}`,
      percentage: 100,
      color: '#059669',
      icon: DollarSign,
      trend: 'up' as const
    },
    {
      title: 'Journalière Closes',
      value: `${stats.closedStats?.JOURNALIERE?.count || 0}`,
      percentage: 100,
      color: '#dc2626',
      icon: Calendar,
      trend: 'up' as const
    },
    {
      title: 'Libre Closes',
      value: `${stats.closedStats?.LIBRE?.count || 0}`,
      percentage: 100,
      color: '#7c3aed',
      icon: BarChart3,
      trend: 'up' as const
    },
  ]

  const [itemsPerView, setItemsPerView] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(4)
      else if (w >= 1024) setItemsPerView(3)
      else if (w >= 768) setItemsPerView(2)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

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
      <div ref={containerRef} className="ml-8 overflow-hidden py-2" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className={cn('flex transition-transform duration-300 ease-out gap-4', isDragging && 'transition-none')} style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}>
          {statsData.map((stat, index) => (
            <div key={index} className="flex-shrink-0" style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Composant skeleton moderne
const ModernSkeleton = ({ viewMode: _viewMode }: { viewMode: ViewMode }) => (
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
              <option value="LATE_NO_PENALTY">Retard (J+0..3)</option>
              <option value="LATE_WITH_PENALTY">Retard (J+4..12)</option>
              <option value="RESCINDED">Cloture en urgence</option>
              <option value="CLOSED">Cloture finale</option>
            </select>

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.caisseType || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, caisseType: e.target.value })}
            >
              <option value="all">Tous les types de contrat</option>
              <option value="STANDARD">Standard</option>
              <option value="JOURNALIERE">Journalière</option>
              <option value="LIBRE">Libre</option>
            </select>

           {/*  <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.type || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
            >
              <option value="all">Tous les types</option>
              <option value="INDIVIDUAL">Individuels</option>
              <option value="GROUP">Groupes</option>
            </select> */}

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
  const router = useRouter()
  
  // Fonction de navigation vers la création de contrat
  const handleCreateContract = () => {
    router.push('/caisse-speciale/create')
  }
  
  // État pour l'onglet actif (Tous les contrats / Standard / Journalier / Libre / Retard / Mois en cours)
  const [activeTab, setActiveTab] = useState<'all' | 'STANDARD' | 'JOURNALIERE' | 'LIBRE' | 'overdue' | 'currentMonth'>('all')
  
  // États
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    caisseType: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedContractForPDF, setSelectedContractForPDF] = useState<any>(null)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<any>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedContractForViewUploaded, setSelectedContractForViewUploaded] = useState<any>(null)
  const [isViewUploadedModalOpen, setIsViewUploadedModalOpen] = useState(false)
  const [contractRefunds, setContractRefunds] = useState<Record<string, any>>({})

  // Hook pour récupérer les contrats depuis Firestore
  const { contracts: contractsData, isLoading, error, refetch } = useContracts()

  // Données des membres et groupes (à récupérer depuis Firestore si nécessaire)
  const membersData = { data: [] as any[] }
  const groupsData: any[] = []

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  // Charger les refunds pour chaque contrat
  useEffect(() => {
    const loadRefunds = async () => {
      if (!contractsData || contractsData.length === 0) return
      
      const refundsMap: Record<string, any> = {}
      
      for (const contract of contractsData) {
        try {
          const refunds = await listRefunds(contract.id)
          // Récupérer le refund avec un document (EARLY ou FINAL)
          const refundWithDoc = refunds.find((r: any) => r.document && r.document.url)
          if (refundWithDoc) {
            refundsMap[contract.id] = refundWithDoc
          }
        } catch (error) {
          console.error(`Erreur lors du chargement des refunds pour ${contract.id}:`, error)
        }
      }
      
      setContractRefunds(refundsMap)
    }
    
    loadRefunds()
  }, [contractsData])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', type: 'all', caisseType: 'all' })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    await refetch()
  }

  const handleViewContractPDF = (contract: any) => {
    setSelectedContractForPDF(contract)
    setIsPDFModalOpen(true)
  }

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false)
    setSelectedContractForPDF(null)
  }

  const handleUploadPDF = (contract: any) => {
    setSelectedContractForUpload(contract)
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setSelectedContractForUpload(null)
  }

  const handleUploadSuccess = () => {
    // Rafraîchir la liste des contrats après téléversement
    refetch()
  }

  const handleViewUploadedContractPDF = (contract: any) => {
    setSelectedContractForViewUploaded(contract)
    setIsViewUploadedModalOpen(true)
  }

  const _handleViewRefundPDF = (contract: any) => {
    const refund = contractRefunds[contract.id]
    if (refund && refund.document && refund.document.url) {
      // Ouvrir le PDF dans un nouvel onglet
      window.open(refund.document.url, '_blank')
    } else {
      toast.error('Document non disponible')
    }
  }

  const handleCloseViewUploadedModal = () => {
    setIsViewUploadedModalOpen(false)
    setSelectedContractForViewUploaded(null)
  }

  const exportToExcel = async () => {
    if (filteredContracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      // Préparer les données pour l'export
      const exportData = filteredContracts.map((contract: any) => {
        const _toISO = (v: any) => {
          try {
            if (!v) return ''
            const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
            return isNaN(d.getTime()) ? '' : d.toISOString()
          } catch {
            return ''
          }
        }

        const toDate = (v: any) => {
          try {
            if (!v) return ''
            const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
          } catch {
            return ''
          }
        }

        return {
          'ID Contrat': contract?.id || '',
          'Type': getContractType(contract),
          'Nom': getContractDisplayName(contract),
          'Statut': getStatusLabel(contract.status),
          'Montant mensuel (FCFA)': contract?.monthlyAmount || 0,
          'Durée (mois)': contract?.monthsPlanned || 0,
          'Montant total (FCFA)': (contract?.monthlyAmount || 0) * (contract?.monthsPlanned || 0),
          'Montant versé (FCFA)': contract?.nominalPaid || 0,
          'Montant restant (FCFA)': ((contract?.monthlyAmount || 0) * (contract?.monthsPlanned || 0)) - (contract?.nominalPaid || 0),
          'Prochaine échéance': toDate(contract?.nextDueAt),
          'Date de création': toDate(contract?.createdAt),
          'Dernière modification': toDate(contract?.updatedAt),
          'Type de caisse': contract?.caisseType || '',
          'Date premier versement': toDate(contract?.firstPaymentDate),
          'Jours de retard': contract?.daysLate || 0,
          'Pénalités (FCFA)': contract?.penalties || 0,
          'Bonus (FCFA)': contract?.bonuses || 0,
          'ID Membre': contract?.memberId || '',
          'ID Groupe': contract?.groupeId || '',
        }
      })

      // Créer le fichier CSV avec BOM pour Excel
      const headers = Object.keys(exportData[0])
      
      // Ajouter le BOM UTF-8 pour Excel
      const BOM = '\uFEFF'
      
      const csvContent = BOM + [
        headers.join(';'),
        ...exportData.map((row: Record<string, any>) => 
          headers.map(header => {
            const value = row[header]
            // Échapper les points-virgules et guillemets dans les valeurs
            if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(';')
        )
      ].join('\r\n')

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `contrats-caisse-speciale-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Export réussi !')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
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

  // Fonction pour obtenir le nom du membre (version améliorée)
  const getMemberName = (contract: any) => {
    if (contract.contractType === 'INDIVIDUAL' && contract.memberId) {
      const member = membersMap.get(contract.memberId)
      if (member) {
        return {
          firstName: member.firstName,
          lastName: member.lastName
        }
      }
    }
    return getContractDisplayName(contract)
  }

  // Fonction pour obtenir le label du type de contrat
  const getContractTypeLabel = (contract: any) => {
    const type = contract.caisseType || 'STANDARD'
    switch (type) {
      case 'STANDARD':
        return 'Standard'
      case 'JOURNALIERE':
        return 'Journalière'
      case 'LIBRE':
        return 'Libre'
      default:
        return type
    }
  }

  // Fonction pour vérifier si le contrat a un PDF valide
  const hasValidContractPdf = (contract: any) => {
    const contractPdf = contract.contractPdf
    if (!contractPdf || typeof contractPdf !== 'object') {
      return false
    }
    
    // Vérifier que toutes les propriétés requises sont présentes
    const requiredProperties = ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url']
    return requiredProperties.every(prop => Object.prototype.hasOwnProperty.call(contractPdf, prop) && contractPdf[prop] !== null && contractPdf[prop] !== undefined)
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
      DRAFT: 'En cours',
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

  /**
   * Vérifie si un contrat est en retard
   */
  const isContractOverdue = (contract: any): boolean => {
    // Vérifier les statuts de retard
    if (contract.status === 'LATE_NO_PENALTY' || contract.status === 'LATE_WITH_PENALTY') {
      return true
    }
    
    // Vérifier nextDueAt pour les contrats ACTIVE
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

  /**
   * Vérifie si un contrat a une échéance dans le mois actuel
   */
  const hasDueDateInCurrentMonth = (contract: any): boolean => {
    if (!contract.nextDueAt) return false
    
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    const nextDue = contract.nextDueAt instanceof Date 
      ? contract.nextDueAt 
      : new Date(contract.nextDueAt)
    
    return nextDue.getMonth() === currentMonth && nextDue.getFullYear() === currentYear
  }

  // Filtrage des contrats
  const filteredContracts = React.useMemo(() => {
    if (!contractsData) return []

    let contracts = contractsData

    // Filtrer par retard si l'onglet "Retard" est actif
    if (activeTab === 'overdue') {
      contracts = contracts.filter((c: any) => isContractOverdue(c))
    }
    // Filtrer par type de caisse (Standard, Journalier, Libre)
    else if (activeTab === 'STANDARD' || activeTab === 'JOURNALIERE' || activeTab === 'LIBRE') {
      contracts = contracts.filter((c: any) => c.caisseType === activeTab)
    }
    // Filtrer par mois en cours
    else if (activeTab === 'currentMonth') {
      contracts = contracts.filter((c: any) => hasDueDateInCurrentMonth(c))
    }

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

    if (filters.caisseType !== 'all') {
      contracts = contracts.filter((c: any) => c.caisseType === filters.caisseType)
    }

    if (filters.type !== 'all') {
      if (filters.type === 'GROUP') {
        contracts = contracts.filter((c: any) => isGroupContract(c))
      } else {
        contracts = contracts.filter((c: any) => !isGroupContract(c))
      }
    }

    return contracts
  }, [contractsData, filters, groupsData, membersData, activeTab])

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = filteredContracts.slice(startIndex, endIndex)

  // Récupérer les informations des membres pour les contrats individuels
  const individualContractMemberIds = React.useMemo(() => {
    return contractsData
      ?.filter((contract: any) => contract.contractType === 'INDIVIDUAL' && contract.memberId)
      .map((contract: any) => contract.memberId) || []
  }, [contractsData])

  const { data: membersDataFromHook } = useMembers(individualContractMemberIds)

  // Créer un map des membres pour un accès rapide
  const membersMap = React.useMemo(() => {
    if (!membersDataFromHook) return new Map()
    return new Map(membersDataFromHook.map((member: any) => [member.id, member]))
  }, [membersDataFromHook])
  const stats = React.useMemo(() => {
    if (!contractsData) return null

    // Utiliser filteredContracts si on est sur l'onglet "Retard", sinon contractsData
    const dataSource = activeTab === 'overdue' ? filteredContracts : contractsData

    const total = dataSource.length
    const draft = dataSource.filter((c: any) => c.status === 'DRAFT').length
    const active = dataSource.filter((c: any) => c.status === 'ACTIVE').length
    const late = dataSource.filter((c: any) =>
      c.status === 'LATE_NO_PENALTY' || c.status === 'LATE_WITH_PENALTY'
    ).length
    const group = dataSource.filter((c: any) => isGroupContract(c)).length
    const individual = total - group

    // Statistiques des tontines closes par type
    const closedContracts = dataSource.filter((c: any) => c.status === 'CLOSED')
    const closedStats = closedContracts.reduce((acc: any, contract: any) => {
      const type = contract.caisseType || 'STANDARD'
      if (!acc[type]) {
        acc[type] = { count: 0, totalNominal: 0 }
      }
      acc[type].count += 1
      acc[type].totalNominal += contract.nominalPaid || 0
      return acc
    }, {})

    // Calculer la répartition par type de caisse
    const byCaisseType = dataSource.reduce((acc: any, contract: any) => {
      const type = contract.caisseType || 'STANDARD'
      if (!acc[type]) {
        acc[type] = 0
      }
      acc[type] += 1
      return acc
    }, {})

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
      individualPercentage: total > 0 ? (individual / total) * 100 : 0,
      groupPercentage: total > 0 ? (group / total) * 100 : 0,
      closedStats,
      byCaisseType,
    }
  }, [contractsData, activeTab, filteredContracts])

  // Somme des nominalPaid pour les contrats clos
  const { sum: closedNominalSum } = useClosedNominalSum(contractsData)

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
      {/* Onglets pour filtrer par type et période */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'STANDARD' | 'JOURNALIERE' | 'LIBRE' | 'overdue' | 'currentMonth')} className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-6 gap-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="STANDARD" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Standard
          </TabsTrigger>
          <TabsTrigger value="JOURNALIERE" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Journalier
          </TabsTrigger>
          <TabsTrigger value="LIBRE" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Libre
          </TabsTrigger>
          <TabsTrigger value="currentMonth" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mois en cours
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2 text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">
            <AlertCircle className="h-4 w-4" />
            Retard
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Carrousel de statistiques */}
      {stats && <StatsCarousel stats={stats} closedNominalSum={closedNominalSum || 0} />}

      {/* Diagramme circulaire par type de caisse */}
      {stats && stats.byCaisseType && Object.keys(stats.byCaisseType).length > 0 && (() => {
        const CAISSE_TYPE_LABELS: Record<string, string> = {
          STANDARD: 'Standard',
          JOURNALIERE: 'Journalière',
          LIBRE: 'Libre',
        }
        const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']
        
        const byCaisseTypeData = Object.entries(stats.byCaisseType)
          .filter(([_, count]) => (count as number) > 0)
          .map(([type, count]) => ({
            type,
            label: CAISSE_TYPE_LABELS[type] || type,
            count: count as number
          }))

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-800">Répartition par type de caisse</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="h-60 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={byCaisseTypeData} 
                          dataKey="count" 
                          nameKey="label" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={90} 
                          label
                        >
                          {byCaisseTypeData.map((entry, index) => (
                            <Cell key={`caisse-type-${entry.type}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {byCaisseTypeData.map((entry, index) => (
                      <div key={entry.type} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <span 
                            className="inline-block h-2 w-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <span className="font-medium text-gray-700">{entry.label}</span>
                        </div>
                        <span className="text-sm text-gray-500">{entry.count} contrat{entry.count > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })()}

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
                disabled={isExporting || filteredContracts.length === 0}
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

              <Button
                size="sm"
                onClick={handleCreateContract}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
            {currentContracts.map((contract: any, _index: number) => (
              <div
                key={contract.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${_index * 0.05}s` }}
              >
                <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Badge "En retard" */}
                  {isContractOverdue(contract) && (
                    <Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      En retard
                    </Badge>
                  )}

                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 ${isGroupContract(contract)
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isGroupContract(contract)
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
                        <span className="text-gray-500">Type de contrat:</span>
                        <span className="font-medium text-gray-900">{getContractTypeLabel(contract)}</span>
                      </div>

                      {(() => {
                        const memberName = getMemberName(contract)
                        if (typeof memberName === 'object' && memberName.firstName && memberName.lastName) {
                          return (
                            <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Nom:</span>
                                <span className="font-medium text-gray-900">{memberName.lastName}</span>
                      </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Prénom:</span>
                                <span className="font-medium text-gray-900">{memberName.firstName}</span>
                              </div>
                            </>
                          )
                        }
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Nom:</span>
                            <span className="font-medium text-gray-900">{memberName}</span>
                          </div>
                        )
                      })()}

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
                        <span className="text-gray-500">Début d'échéance:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          {contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prochaine échéance:</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Contrat PDF:</span>
                        <div className="flex items-center gap-1">
                          {hasValidContractPdf(contract) ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-green-600 font-medium">Disponible</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-500 font-medium">À téléverser</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 mt-auto">
                      <div className="text-xs text-gray-600 mb-2">
                        Versé: {(contract.nominalPaid || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="space-y-2">
                        {hasValidContractPdf(contract) ? (
                          <>
                      <Button
                        onClick={() => router.push(`/caisse-speciale/contrats/${contract.id}`)}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                        Ouvrir
                            </Button>
                            <Button
                              onClick={() => handleViewUploadedContractPDF(contract)}
                              variant="outline"
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                            >
                              <FileText className="h-4 w-4" />
                              Contrat d'inscription
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleUploadPDF(contract)}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 hover:text-orange-800"
                          >
                            <Upload className="h-4 w-4" />
                            Téléverser le document PDF
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleViewContractPDF(contract)}
                          variant="outline"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                        >
                          <FileText className="h-4 w-4" />
                          Télécharger contrat
                      </Button>
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

      {/* Modal PDF */}
      {selectedContractForPDF && (
        <CaisseSpecialePDFModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          contractId={selectedContractForPDF.id}
          contractData={selectedContractForPDF}
        />
      )}

      {/* Modal Téléversement PDF */}
      {selectedContractForUpload && (
        <ContractPdfUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          contractId={selectedContractForUpload.id}
          contractName={`Contrat #${selectedContractForUpload.id.slice(-6)}`}
          onSuccess={handleUploadSuccess}
          contract={selectedContractForUpload}
        />
      )}

      {/* Modal Contrat Uploadé */}
      {selectedContractForViewUploaded && (
        <ViewUploadedContractModal
          isOpen={isViewUploadedModalOpen}
          onClose={handleCloseViewUploadedModal}
          contract={selectedContractForViewUploaded}
        />
      )}
    </div>
  )
}

export default ListContracts