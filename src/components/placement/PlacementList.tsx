"use client"
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePlacements, usePlacementMutations, usePlacementCommissions, useEarlyExit, useCalculateEarlyExit, usePlacementStats } from '@/hooks/usePlacements'
import { useSearchMembers } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import type { Placement, PayoutMode, User } from '@/types/types'
import { Loader2, Plus, RefreshCw, FileDown, FileSpreadsheet, ChevronLeft, ChevronRight, DollarSign, FileText, CheckCircle, Clock, TrendingUp, Search, Eye, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import FiltersPlacement, { PlacementFilters } from './FiltersPlacement'
import PlacementDocumentUploadModal from './PlacementDocumentUploadModal'
import PayCommissionModal, { CommissionPaymentFormData } from './PayCommissionModal'
import ViewPlacementDocumentModal from './ViewPlacementDocumentModal'
import PlacementCard from './PlacementCard'
import EarlyExitForm from './EarlyExitForm'
import PlacementFinalQuittanceModal from './PlacementFinalQuittanceModal'
import PlacementEarlyExitQuittanceModal from './PlacementEarlyExitQuittanceModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'

// Composant wrapper pour le modal de paiement de commission
function PayCommissionModalWrapper({
  payCommissionId,
  payCommissionPlacementId,
  onClose,
  onSubmit,
  isPaying,
}: {
  payCommissionId: string | null
  payCommissionPlacementId: string | null
  onClose: () => void
  onSubmit: (commissionId: string, data: CommissionPaymentFormData) => Promise<void>
  isPaying: boolean
}) {
  const { data: placementCommissions = [] } = usePlacementCommissions(payCommissionPlacementId || undefined)
  const commission = payCommissionId ? placementCommissions.find(c => c.id === payCommissionId) : null

  if (!payCommissionId || !payCommissionPlacementId || !commission) return null

  return (
    <PayCommissionModal
      isOpen={!!payCommissionId}
      onClose={onClose}
      onSubmit={async (data) => {
        await onSubmit(payCommissionId, data)
        onClose()
      }}
      commission={commission}
      isPaying={isPaying}
    />
  )
}

const placementSchema = z.object({
  benefactorId: z.string().min(1, 'Le bienfaiteur est requis'),
  amount: z.coerce.number().positive('Le montant doit être > 0'),
  rate: z.coerce.number().min(0, 'Le taux doit être >= 0'),
  periodMonths: z.coerce.number().int().min(1, 'Minimum 1 mois').max(7, 'Maximum 7 mois'),
  payoutMode: z.enum(['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End']),
  firstCommissionDate: z.string().min(1, 'La date est requise'),
  urgentName: z.string().optional(),
  urgentFirstName: z.string().optional(),
  urgentPhone: z.string().optional(),
  urgentPhone2: z.string().optional(),
  urgentRelationship: z.string().optional(),
  urgentIdNumber: z.string().optional(),
  urgentTypeId: z.string().optional(),
})

type PlacementFormData = z.infer<typeof placementSchema>

type EarlyExitFormData = {
  commissionDue: number
  payoutAmount: number
}

type PlacementDetailState = {
  placementId: string | null
}

type PayCommissionFormData = {
  proofDocumentId?: string
}

const payoutLabels: Record<PayoutMode, string> = {
  MonthlyCommission_CapitalEnd: 'Commission mensuelle + capital à la fin',
  CapitalPlusCommission_End: 'Capital + commissions à la fin',
}

export default function PlacementList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [filters, setFilters] = useState<PlacementFilters>({
    search: '',
    status: 'all',
    payoutMode: 'all',
    periodMonths: 'all',
    monthOnly: false,
    lateOnly: false,
  })
  const [earlyExitPlacementId, setEarlyExitPlacementId] = useState<string | null>(null)
  const [detailState, setDetailState] = useState<PlacementDetailState>({ placementId: null })
  const [payCommissionId, setPayCommissionId] = useState<string | null>(null)
  const [payCommissionPlacementId, setPayCommissionPlacementId] = useState<string | null>(null)
  const [uploadContractPlacementId, setUploadContractPlacementId] = useState<string | null>(null)
  const [uploadQuittancePlacementId, setUploadQuittancePlacementId] = useState<string | null>(null)
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null)
  const [viewDocumentTitle, setViewDocumentTitle] = useState<string>('')
  const [finalQuittancePlacementId, setFinalQuittancePlacementId] = useState<string | null>(null)
  const [earlyExitQuittancePlacementId, setEarlyExitQuittancePlacementId] = useState<string | null>(null)
  const [deletePlacementId, setDeletePlacementId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 6
  const router = useRouter()
  const earlyExitForm = useForm<EarlyExitFormData>({
    defaultValues: {
      commissionDue: 0,
      payoutAmount: 0,
    },
  })
  const payCommissionForm = useForm<PayCommissionFormData>({
    defaultValues: { proofDocumentId: '' },
  })
  
  const { data: memberResults = [] } = useSearchMembers(memberSearch, memberSearch.length >= 2)
  const { data: placements = [], isLoading, error, refetch } = usePlacements()
  const { create, requestEarlyExit, payCommission, remove } = usePlacementMutations()
  const { user, loading: authLoading } = useAuth()

  const { data: commissions = [] } = usePlacementCommissions(detailState.placementId || undefined)
  const { data: earlyExitInfo } = useEarlyExit(detailState.placementId || undefined)
  const { data: placementStats } = usePlacementStats()

  const placementFormResolver = zodResolver(placementSchema) as any

  const form = useForm<PlacementFormData>({
    resolver: placementFormResolver,
    defaultValues: {
      benefactorId: '',
      amount: 0,
      rate: 0,
      periodMonths: 1,
      payoutMode: 'MonthlyCommission_CapitalEnd',
      firstCommissionDate: new Date().toISOString().slice(0, 10),
      urgentName: '',
      urgentFirstName: '',
      urgentPhone: '',
      urgentPhone2: '',
      urgentRelationship: '',
      urgentIdNumber: '',
      urgentTypeId: '',
    },
  })

  const isMonthlyPayout = form.watch('payoutMode') === 'MonthlyCommission_CapitalEnd'

  const filtered = useMemo(() => {
    let result = [...placements]

    // Filtre par recherche textuelle
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => {
        const name = (p as any).benefactorName?.toLowerCase?.() || ''
        const phone = (p as any).benefactorPhone?.toLowerCase?.() || ''
        return (
          p.id.toLowerCase().includes(q) ||
          p.benefactorId.toLowerCase().includes(q) ||
          name.includes(q) ||
          phone.includes(q)
        )
      })
    }

    // Filtre par statut
    if (filters.status !== 'all') {
      result = result.filter(p => p.status === filters.status)
    }

    // Filtre par mode de paiement
    if (filters.payoutMode !== 'all') {
      result = result.filter(p => p.payoutMode === filters.payoutMode)
    }

    // Filtre par période
    if (filters.periodMonths !== 'all') {
      if (filters.periodMonths === '1-3') {
        result = result.filter(p => p.periodMonths >= 1 && p.periodMonths <= 3)
      } else if (filters.periodMonths === '4-7') {
        result = result.filter(p => p.periodMonths >= 4 && p.periodMonths <= 7)
      }
    }

    // Filtrage commissions du mois / en retard basé sur les champs persistés (nextCommissionDate / hasOverdueCommission)
    if (filters.monthOnly || filters.lateOnly) {
      const now = new Date()
      const sameMonth = (d?: any) => {
        if (!d) return false
        const date = typeof d === 'string' ? new Date(d) : d
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      }

      result = result.filter(p => {
        if (p.status !== 'Active') return false
        const matchMonth = filters.monthOnly ? sameMonth((p as any).nextCommissionDate) : true
        const matchLate = filters.lateOnly ? !!(p as any).hasOverdueCommission : true
        return matchMonth && matchLate
      })
    }

    return result
  }, [placements, filters])

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return filtered
    if (activeTab === 'mensuel') return filtered.filter(p => p.payoutMode === 'MonthlyCommission_CapitalEnd')
    if (activeTab === 'final') return filtered.filter(p => p.payoutMode === 'CapitalPlusCommission_End')
    if (activeTab === 'actifs') return filtered.filter(p => p.status === 'Active')
    if (activeTab === 'brouillons') return filtered.filter(p => p.status === 'Draft')
    if (activeTab === 'clos') return filtered.filter(p => p.status === 'Closed')
    if (activeTab === 'early') return filtered.filter(p => p.status === 'EarlyExit')
    // Commissions du mois / En retard : approximation (à affiner avec échéancier)
    if (activeTab === 'month') {
      return filtered.filter(p => p.payoutMode === 'MonthlyCommission_CapitalEnd' && p.status === 'Active')
    }
    if (activeTab === 'late') {
      return filtered.filter(p => p.status === 'Active') // placeholder : à affiner avec échéances
    }
    return filtered
  }, [filtered, activeTab])

  const totalPages = Math.max(1, Math.ceil(filteredByTab.length / pageSize))
  const paginated = filteredByTab.slice((page - 1) * pageSize, page * pageSize)

  React.useEffect(() => {
    setPage(1)
  }, [filteredByTab, filters, activeTab])

  const stats = useMemo(() => {
    const total = filteredByTab.length
    const totalAmount = filteredByTab.reduce((sum, p) => sum + (p.amount || 0), 0)
    const draft = filteredByTab.filter(p => p.status === 'Draft').length
    const active = filteredByTab.filter(p => p.status === 'Active').length
    const closed = filteredByTab.filter(p => p.status === 'Closed').length
    const early = filteredByTab.filter(p => p.status === 'EarlyExit').length
    return { total, totalAmount, draft, active, closed, early }
  }, [filteredByTab])

  const uniqueBenefactors = useMemo(() => {
    const ids = Array.from(new Set(filteredByTab.map(p => p.benefactorId)))
    return ids
  }, [filteredByTab])

  const exportCSV = () => {
    const rows = filteredByTab.map(p => ({
      id: p.id,
      benefactorId: p.benefactorId,
      amount: p.amount,
      rate: p.rate,
      periodMonths: p.periodMonths,
      payoutMode: payoutLabels[p.payoutMode],
      status: p.status,
    }))
    const header = Object.keys(rows[0] || {}).join(',')
    const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'placements.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportBenefactorsCSV = () => {
    const rows = uniqueBenefactors.map((id) => ({ benefactorId: id }))
    const header = 'benefactorId'
    const csv = [header, ...rows.map(r => r.benefactorId)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bienfaiteurs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = filteredByTab.map(
      (p) =>
        `<tr>
          <td>${p.id}</td>
          <td>${p.benefactorId}</td>
          <td>${p.amount.toLocaleString()}</td>
          <td>${p.rate}%</td>
          <td>${p.periodMonths}</td>
          <td>${payoutLabels[p.payoutMode]}</td>
          <td>${p.status}</td>
        </tr>`
    ).join('')
    win.document.write(`
      <html>
        <head><title>Placements</title></head>
        <body>
          <h1>Liste des placements</h1>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
            <thead>
              <tr>
                <th>ID</th><th>Bienfaiteur</th><th>Montant</th><th>Taux</th><th>Période</th><th>Mode</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const exportBenefactorsPDF = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = uniqueBenefactors.map(
      (id) =>
        `<tr>
          <td>${id}</td>
        </tr>`
    ).join('')
    win.document.write(`
      <html>
        <head><title>Bienfaiteurs</title></head>
        <body>
          <h1>Liste des bienfaiteurs (filtrés)</h1>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
            <thead>
              <tr>
                <th>ID Bienfaiteur</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const statsItems = useMemo(() => {
    const total = stats.total || 0
    const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0)
    const statsData = placementStats || {
      total: stats.total,
      totalAmount: stats.totalAmount,
      draft: stats.draft,
      active: stats.active,
      closed: stats.closed,
      earlyExit: stats.early,
      canceled: 0,
      commissionsDue: 0,
      commissionsPaid: 0,
      totalCommissionsAmount: 0,
      paidCommissionsAmount: 0,
      payoutModeDistribution: { MonthlyCommission_CapitalEnd: 0, CapitalPlusCommission_End: 0 },
      topBenefactors: [],
    }
    
    const commissionPct = statsData.totalCommissionsAmount > 0 
      ? Math.round((statsData.paidCommissionsAmount / statsData.totalCommissionsAmount) * 100)
      : 0

    return [
      {
        title: 'Total',
        value: stats.total,
        subtitle: 'Tous les placements',
        percentage: 100,
        color: '#6366f1',
        icon: FileText,
      },
      {
        title: 'Montant',
        value: new Intl.NumberFormat('fr-FR', { 
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }).format(stats.totalAmount),
        subtitle: 'Total engagé (FCFA)',
        percentage: 100,
        color: '#0ea5e9',
        icon: DollarSign,
      },
      {
        title: 'Actifs',
        value: stats.active,
        subtitle: 'En cours',
        percentage: pct(stats.active),
        color: '#10b981',
        icon: CheckCircle,
      },
      {
        title: 'Commissions dues',
        value: statsData.commissionsDue,
        subtitle: `${statsData.commissionsPaid} payées`,
        percentage: commissionPct,
        color: '#f59e0b',
        icon: Clock,
      },
      {
        title: 'Commissions payées',
        value: statsData.commissionsPaid,
        subtitle: `${new Intl.NumberFormat('fr-FR').format(statsData.paidCommissionsAmount)} FCFA`,
        percentage: commissionPct,
        color: '#10b981',
        icon: CheckCircle,
      },
      {
        title: 'Retrait anticipé',
        value: statsData.earlyExit,
        subtitle: 'Sorties anticipées',
        percentage: pct(statsData.earlyExit),
        color: '#ef4444',
        icon: AlertCircle,
      },
      {
        title: 'Mode mensuel',
        value: statsData.payoutModeDistribution.MonthlyCommission_CapitalEnd,
        subtitle: 'Commission mensuelle',
        percentage: pct(statsData.payoutModeDistribution.MonthlyCommission_CapitalEnd),
        color: '#3b82f6',
        icon: TrendingUp,
      },
      {
        title: 'Mode final',
        value: statsData.payoutModeDistribution.CapitalPlusCommission_End,
        subtitle: 'Capital + commissions fin',
        percentage: pct(statsData.payoutModeDistribution.CapitalPlusCommission_End),
        color: '#8b5cf6',
        icon: CheckCircle,
      },
    ]
  }, [stats, placementStats])

  const payoutPieData = useMemo(() => {
    const data = placementStats?.payoutModeDistribution || { MonthlyCommission_CapitalEnd: 0, CapitalPlusCommission_End: 0 }
    return [
      { name: 'Mensuel', value: data.MonthlyCommission_CapitalEnd, fill: '#2563eb' },
      { name: 'Final', value: data.CapitalPlusCommission_End, fill: '#7c3aed' },
    ]
  }, [placementStats])

  const statusPieData = useMemo(() => {
    const data = placementStats || { draft: stats.draft, active: stats.active, closed: stats.closed, earlyExit: stats.early, canceled: 0 }
    return [
      { name: 'Actifs', value: data.active || 0, fill: '#10b981' },
      { name: 'Brouillons', value: data.draft || 0, fill: '#f59e0b' },
      { name: 'Clos', value: data.closed || 0, fill: '#3b82f6' },
      { name: 'Sortie anticipée', value: data.earlyExit || 0, fill: '#ef4444' },
    ]
  }, [placementStats, stats])

  const topBenefactors = useMemo(() => placementStats?.topBenefactors || [], [placementStats])

  const [itemsPerView, setItemsPerView] = useState(1)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const maxIndex = Math.max(0, statsItems.length - itemsPerView)
  const goPrev = () => setCarouselIndex((i) => Math.max(0, i - 1))
  const goNext = () => setCarouselIndex((i) => Math.min(maxIndex, i + 1))

  React.useEffect(() => {
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

  const handleFiltersChange = (newFilters: PlacementFilters) => {
    setFilters(newFilters)
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      payoutMode: 'all',
      periodMonths: 'all',
      monthOnly: false,
      lateOnly: false,
    })
  }

  const submitPlacement = async (values: PlacementFormData) => {
    if (!user?.uid) return
    try {
      const { firstCommissionDate, urgentName, urgentFirstName, urgentPhone, urgentPhone2, urgentRelationship, urgentIdNumber, urgentTypeId, ...rest } = values
      const urgentContact =
        urgentName && urgentPhone
          ? {
              name: urgentName,
              firstName: urgentFirstName || undefined,
              phone: urgentPhone,
              phone2: urgentPhone2 || undefined,
              relationship: urgentRelationship || undefined,
              idNumber: urgentIdNumber || undefined,
              typeId: urgentTypeId || undefined,
            }
          : undefined

      await create.mutateAsync({
        ...rest,
        urgentContact,
        amount: Number(rest.amount) || 0,
        rate: Number(rest.rate) || 0,
        periodMonths: Number(rest.periodMonths) || 0,
        // Date du 1er versement de commission = startDate du placement
        startDate: firstCommissionDate ? new Date(firstCommissionDate) : undefined,
        adminId: user.uid,
        createdBy: user.uid,
        updatedBy: user.uid,
      })
      setIsCreateOpen(false)
      form.reset()
    } catch (e) {
      // handled by react-query if needed
    }
  }

  const submitEarlyExit = async (values: EarlyExitFormData) => {
    if (!user?.uid || !earlyExitPlacementId) return
    try {
      await requestEarlyExit.mutateAsync({
        placementId: earlyExitPlacementId,
        commissionDue: values.commissionDue,
        payoutAmount: values.payoutAmount,
        adminId: user.uid,
      })
      earlyExitForm.reset()
      setEarlyExitPlacementId(null)
    } catch (e) {
      // handled by react-query si besoin
    }
  }

  const submitPayCommission = async (commissionId: string, data: CommissionPaymentFormData) => {
    if (!user?.uid || !detailState.placementId) return
    
    const placement = placements.find(p => p.id === detailState.placementId)
    if (!placement) return
    
    try {
      const { ServiceFactory } = await import('@/factories/ServiceFactory')
      const service = ServiceFactory.getPlacementService()
      
      // Créer la date de paiement à partir de date et time
      const paidDate = new Date(`${data.date}T${data.time}`)
      
      // Upload de la preuve et paiement de la commission
      await service.payCommissionWithProof(
        detailState.placementId,
        commissionId,
        data.proofFile,
        placement.benefactorId,
        paidDate,
        user.uid
      )
      
      // Invalider les queries pour rafraîchir les données
      const { useQueryClient } = await import('@tanstack/react-query')
      const qc = useQueryClient()
      qc.invalidateQueries({ queryKey: ['placementCommissions', detailState.placementId] })
      qc.invalidateQueries({ queryKey: ['placements'] })
      
      toast.success('Commission payée avec succès')
      setPayCommissionId(null)
    } catch (error: any) {
      console.error('Erreur lors du paiement:', error)
      toast.error(`Erreur lors du paiement: ${error.message}`)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Placements
            </h1>
            <p className="text-gray-600 text-base md:text-lg mt-1">
              Gestion des placements et suivi des bienfaiteurs
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {filteredByTab.length} résultat(s) affiché(s) / {placements.length} au total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportPDF} className="bg-white hover:bg-gray-50 shadow-sm">
              <FileDown className="h-4 w-4 mr-2" /> Placements PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="bg-white hover:bg-gray-50 shadow-sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Placements Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportBenefactorsPDF} className="bg-white hover:bg-gray-50 shadow-sm">
              <FileDown className="h-4 w-4 mr-2" /> Bienfaiteurs PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportBenefactorsCSV} className="bg-white hover:bg-gray-50 shadow-sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Bienfaiteurs Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="bg-white hover:bg-gray-50 shadow-sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsCreateOpen(true)} 
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white shadow-md hover:shadow-lg transition-all" 
              disabled={!user?.uid || authLoading}
            >
              <Plus className="h-4 w-4 mr-2" /> Nouveau Placement
            </Button>
          </div>
        </div>

        {/* Statistiques avec carousel */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Statistiques</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goPrev} 
                disabled={carouselIndex === 0}
                className="h-8 w-8 rounded-full bg-white shadow-sm hover:shadow-md transition-all disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goNext} 
                disabled={carouselIndex === maxIndex}
                className="h-8 w-8 rounded-full bg-white shadow-sm hover:shadow-md transition-all disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex gap-4 transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${(carouselIndex * 100) / itemsPerView}%)` }}
              >
                {statsItems.map((item, idx) => {
                  const pieData = [
                    { name: 'value', value: item.percentage, fill: item.color },
                    { name: 'remaining', value: 100 - item.percentage, fill: '#f3f4f6' }
                  ]
                  return (
                    <div key={idx} className="min-w-0 w-full md:w-1/2 lg:w-1/3 xl:w-1/4 flex-shrink-0">
                      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div 
                                className="p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm" 
                                style={{ backgroundColor: `${item.color}15`, color: item.color }}
                              >
                                <item.icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.title}</p>
                                <div className="flex items-baseline gap-2">
                                  <p className="text-3xl font-black text-gray-900 truncate">{item.value}</p>
                                  {item.percentage < 100 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 shadow-sm">
                                      <TrendingUp className="w-3 h-3" />
                                      {Math.round(item.percentage)}%
                                    </div>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <p className="text-xs text-gray-500 mt-1.5 font-medium">{item.subtitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="w-16 h-16 ml-2 flex-shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={22}
                                    outerRadius={30}
                                    dataKey="value"
                                    strokeWidth={0}
                                    animationBegin={0}
                                    animationDuration={800}
                                  >
                                    {pieData.map((entry, i) => (
                                      <Cell key={`cell-${i}`} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Répartition et top bienfaiteurs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="col-span-1 bg-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700">Répartition par mode</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payoutPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {payoutPieData.map((entry, index) => (
                      <Cell key={`payout-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {statusPieData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700">Top bienfaiteurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topBenefactors.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun bienfaiteur en tête pour l’instant.</p>
              ) : (
                topBenefactors.slice(0, 5).map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{(b as any).name || (b as any).benefactorId || 'Bienfaiteur'}</p>
                        <p className="text-xs text-gray-500">
                          Montant: {new Intl.NumberFormat('fr-FR').format((b as any).totalAmount || (b as any).amount || 0)} FCFA
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="mensuel">Mensuel</TabsTrigger>
            <TabsTrigger value="final">Final</TabsTrigger>
            <TabsTrigger value="month">Commissions du mois</TabsTrigger>
            <TabsTrigger value="late">En retard</TabsTrigger>
            <TabsTrigger value="actifs">Actifs</TabsTrigger>
            <TabsTrigger value="brouillons">Brouillons</TabsTrigger>
            <TabsTrigger value="clos">Clos</TabsTrigger>
            <TabsTrigger value="early">Sortie anticipée</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* Filtres */}
            <FiltersPlacement 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleResetFilters}
            />

            {/* Liste des placements */}
            {error ? (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription>Erreur lors du chargement des placements</AlertDescription>
              </Alert>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
              </div>
            ) : filteredByTab.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Aucun placement trouvé</p>
                  <p className="text-gray-400 text-sm mt-2">Commencez par créer votre premier placement</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginated.map((p) => (
                    <PlacementCard
                      key={p.id}
                      placement={p}
                      onDetailsClick={() => setDetailState({ placementId: p.id })}
                      onPayCommissionClick={(commissionId) => {
                        setPayCommissionPlacementId(p.id)
                        setPayCommissionId(commissionId)
                      }}
                      onOpenClick={p.status === 'Active' ? () => router.push(`/placements/${p.id}`) : undefined}
                      onDeleteClick={p.status === 'Draft' ? () => setDeletePlacementId(p.id) : undefined}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-500">
                      Page {page} / {totalPages} — {filteredByTab.length} résultat(s)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="bg-white"
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="bg-white"
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal suppression placement */}
      <Dialog open={!!deletePlacementId} onOpenChange={(open) => !open && setDeletePlacementId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le placement ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Le placement (brouillon) sera supprimé ainsi que ses commissions associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletePlacementId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletePlacementId) return
                try {
                  await remove.mutateAsync(deletePlacementId)
                  setDeletePlacementId(null)
                } catch (e) {
                  // toast géré côté mutation si besoin
                }
              }}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de création */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Nouveau placement
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Recherchez et sélectionnez un membre bienfaiteur, puis saisissez les informations du placement
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitPlacement)} className="space-y-5 mt-6">
              <FormField
                control={form.control}
                name="benefactorId"
                rules={{ required: 'Le bienfaiteur est requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Bienfaiteur *</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Rechercher par nom, prénom ou matricule..."
                            className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65] pl-10"
                          />
                        </div>
                        {memberSearch.length >= 2 && memberResults.length === 0 && (
                          <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">Aucun résultat trouvé</p>
                        )}
                        {memberResults.length > 0 && (
                          <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg divide-y shadow-sm bg-white">
                            {memberResults.map((m: User) => (
                              <button
                                type="button"
                                key={m.id}
                                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors duration-150 group"
                                onClick={() => {
                                  field.onChange(m.id as string)
                                  setMemberSearch(`${m.lastName || ''} ${m.firstName || ''}`.trim() || (m.matricule ?? ''))
                                }}
                              >
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#234D65]">
                                  {m.lastName} {m.firstName}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Matricule: <span className="font-mono">{m.matricule || m.id}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {field.value && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 font-medium">✓ Bienfaiteur sélectionné</p>
                            <p className="text-xs text-gray-600 mt-1 font-mono">{field.value}</p>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                rules={{ 
                  required: 'Montant requis',
                  min: { value: 1, message: 'Le montant doit être > 0' }
                }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Montant (FCFA) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                        {...field}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '')
                          field.onChange(v ? Number(v) : '')
                        }}
                          className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                          placeholder="ex: 500000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                rules={{ 
                  required: 'Taux requis',
                  min: { value: 0, message: 'Le taux doit être >= 0' }
                }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Taux (%) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          step="0.1" 
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '')
                          field.onChange(v ? Number(v) : '')
                        }}
                          className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                          placeholder="ex: 5.5"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="periodMonths"
                rules={{ 
                  required: 'Période requise',
                  min: { value: 1, message: 'Minimum 1 mois' },
                  max: { value: 7, message: 'Maximum 7 mois' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Période (mois) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        min={1} 
                        max={7} 
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '')
                          field.onChange(v ? Number(v) : '')
                        }}
                        className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                        placeholder="Entre 1 et 7 mois"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">La période doit être comprise entre 1 et 7 mois</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payoutMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Mode de règlement *</FormLabel>
                    <FormControl>
                      <select
                        className="w-full border border-gray-200 rounded-md px-4 py-2.5 focus:border-[#234D65] focus:ring-[#234D65] focus:outline-none transition-colors bg-white"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value as PayoutMode)}
                      >
                        <option value="MonthlyCommission_CapitalEnd">{payoutLabels.MonthlyCommission_CapitalEnd}</option>
                        <option value="CapitalPlusCommission_End">{payoutLabels.CapitalPlusCommission_End}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date du premier versement de commission */}
              <FormField
                control={form.control}
                name="firstCommissionDate"
                rules={{ required: 'Date du premier versement requise' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      {isMonthlyPayout ? 'Date du 1er versement de commission *' : 'Date de début de contrat *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      {isMonthlyPayout
                        ? 'Utilisée pour calculer les échéances mensuelles.'
                        : 'Utilisée pour calculer la date de fin (début + durée en mois).'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact urgent (optionnel) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="urgentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Contact urgent - Nom</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom du contact" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Prénom du contact" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Téléphone" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentPhone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Téléphone 2</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Téléphone secondaire" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Lien</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Lien (parent, collègue...)" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">N° pièce</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="N° CNI / Passeport" className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgentTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Type de pièce</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CNI, Passeport..." className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  className="hover:bg-gray-50"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={create.isPending || !user?.uid}
                  className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white shadow-md"
                >
                  {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer le placement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Retrait anticipé */}
      <Dialog open={!!earlyExitPlacementId} onOpenChange={(open) => !open && setEarlyExitPlacementId(null)}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Retrait anticipé</DialogTitle>
            <DialogDescription>
              Les montants sont calculés automatiquement selon la règle : commission d'un mois si au moins 1 mois écoulé, sinon 0 commission.
            </DialogDescription>
          </DialogHeader>
          {earlyExitPlacementId && <EarlyExitForm placementId={earlyExitPlacementId} onClose={() => setEarlyExitPlacementId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal Détails placement (commissions + retrait anticipé) */}
      <Dialog open={!!detailState.placementId} onOpenChange={(open) => !open && setDetailState({ placementId: null })}>
        <DialogContent className="sm:max-w-6xl max-w-[95vw] max-h-[95vh] overflow-y-auto p-8">
          <DialogHeader className="pb-6 mb-6 border-b">
            <DialogTitle className="text-2xl font-bold">Détails du placement</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Commissions programmées et informations de retrait anticipé.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold">Commissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6 pb-6">
                {(() => {
                  const currentPlacement = placements.find(p => p.id === detailState.placementId)
                  const allCommissionsPaid = currentPlacement?.status === 'Active' && 
                    commissions.length > 0 && 
                    commissions.every(c => c.status === 'Paid')
                  
                  if (currentPlacement?.status === 'Draft') {
                    return (
                      <div className="space-y-2">
                        <p className="text-gray-500 text-sm">Le contrat n'a pas encore été téléversé.</p>
                        <p className="text-xs text-gray-400">Les commissions seront générées automatiquement une fois le contrat téléversé.</p>
                      </div>
                    )
                  }
                  
                  if (allCommissionsPaid && currentPlacement) {
                    return (
                      <>
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800">Toutes les commissions sont payées</span>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0"
                            onClick={() => setFinalQuittancePlacementId(currentPlacement.id)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Générer quittance finale
                          </Button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {commissions.map((c) => (
                            <div key={c.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span className="font-medium">Échéance</span>
                                <span className="font-semibold text-gray-800">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-900 font-bold text-base">{c.amount.toLocaleString()} FCFA</span>
                                <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  {c.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                  
                  return commissions.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune commission programmée.</p>
                  ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {commissions.map((c) => (
                      <div key={c.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span className="font-medium">Échéance</span>
                          <span className="font-semibold text-gray-800">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-900 font-bold text-base">{c.amount.toLocaleString()} FCFA</span>
                          <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                            {c.status}
                          </span>
                        </div>
                        <div className="flex gap-3 pt-2">
                          {c.status !== 'Paid' && (
                            <Button
                              size="sm"
                              className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                              onClick={() => {
                                setPayCommissionPlacementId(detailState.placementId!)
                                setPayCommissionId(c.id)
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Payer avec preuve
                            </Button>
                          )}
                          {c.proofDocumentId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                setViewDocumentId(c.proofDocumentId!)
                                setViewDocumentTitle(`Preuve de commission - ${new Date(c.dueDate).toLocaleDateString('fr-FR')}`)
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Voir preuve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )
                })()}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold">Retrait anticipé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6 pb-6">
                {earlyExitInfo ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 text-sm font-medium">Commission due</span>
                      <span className="font-bold text-gray-900 text-base">{earlyExitInfo.commissionDue.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 text-sm font-medium">Montant à verser</span>
                      <span className="font-bold text-gray-900 text-base">{earlyExitInfo.payoutAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 text-sm font-medium">Demandé le</span>
                      <span className="text-gray-700 text-sm">{new Date(earlyExitInfo.requestedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {earlyExitInfo.validatedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Validé le</span>
                        <span className="text-gray-700 text-xs">{new Date(earlyExitInfo.validatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {earlyExitInfo.quittanceDocumentId && (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Quittance (docId)</span>
                        <code className="px-2 py-1 rounded bg-gray-100 text-gray-700">{earlyExitInfo.quittanceDocumentId}</code>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white border-0"
                        onClick={() => {
                          if (detailState.placementId) {
                            setEarlyExitQuittancePlacementId(detailState.placementId)
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Générer quittance de sortie
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Pas de retrait anticipé enregistré.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md mt-6 overflow-hidden">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg font-bold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm px-6 pb-6">
              {detailState.placementId ? (() => {
                const currentPlacement = placements.find(p => p.id === detailState.placementId)
                if (!currentPlacement) return <p className="text-gray-500 text-sm">Placement introuvable.</p>
                
                return (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1">
                        <span className="text-gray-700 font-semibold text-base">Contrat</span>
                        {currentPlacement.contractDocumentId ? (
                          <code className="block mt-1 px-2 py-1 rounded bg-white text-gray-700 text-xs">
                            {currentPlacement.contractDocumentId}
                          </code>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Aucun contrat téléversé</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        {currentPlacement.contractDocumentId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setViewDocumentId(currentPlacement.contractDocumentId!)
                              setViewDocumentTitle('Contrat de placement')
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUploadContractPlacementId(currentPlacement.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {currentPlacement.contractDocumentId ? 'Remplacer' : 'Téléverser'}
                        </Button>
                      </div>
                    </div>
                    {earlyExitInfo && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                        <div className="flex-1">
                          <span className="text-gray-600 font-medium">Quittance retrait anticipé</span>
                          {earlyExitInfo.quittanceDocumentId ? (
                            <code className="block mt-1 px-2 py-1 rounded bg-white text-gray-700 text-xs">
                              {earlyExitInfo.quittanceDocumentId}
                            </code>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">Aucune quittance téléversée</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-2">
                          {earlyExitInfo.quittanceDocumentId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewDocumentId(earlyExitInfo.quittanceDocumentId!)
                                setViewDocumentTitle('Quittance de retrait anticipé')
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadQuittancePlacementId(currentPlacement.id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {earlyExitInfo.quittanceDocumentId ? 'Remplacer' : 'Téléverser'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })() : (
                <p className="text-gray-500 text-sm">Aucun document à afficher.</p>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Modal upload contrat */}
      {uploadContractPlacementId && (() => {
        const placement = placements.find(p => p.id === uploadContractPlacementId)
        return placement ? (
          <PlacementDocumentUploadModal
            isOpen={!!uploadContractPlacementId}
            onClose={() => setUploadContractPlacementId(null)}
            onUploaded={() => {
              setUploadContractPlacementId(null)
              refetch()
            }}
            placementId={placement.id}
            benefactorId={placement.benefactorId}
            documentType="PLACEMENT_CONTRACT"
            title="Téléverser le contrat de placement"
            description="Téléversez le contrat PDF signé pour ce placement"
            existingDocumentId={placement.contractDocumentId}
          />
        ) : null
      })()}

      {/* Modal upload quittance retrait anticipé */}
      {uploadQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === uploadQuittancePlacementId)
        return placement ? (
          <PlacementDocumentUploadModal
            isOpen={!!uploadQuittancePlacementId}
            onClose={() => setUploadQuittancePlacementId(null)}
            onUploaded={() => {
              setUploadQuittancePlacementId(null)
              refetch()
            }}
            placementId={placement.id}
            benefactorId={placement.benefactorId}
            documentType="PLACEMENT_EARLY_EXIT_QUITTANCE"
            title="Téléverser la quittance de retrait anticipé"
            description="Téléversez la quittance PDF pour le retrait anticipé"
            existingDocumentId={earlyExitInfo?.quittanceDocumentId}
          />
        ) : null
      })()}

      {/* Modal de paiement de commission */}
      <PayCommissionModalWrapper
        payCommissionId={payCommissionId}
        payCommissionPlacementId={payCommissionPlacementId}
        onClose={() => {
          setPayCommissionId(null)
          setPayCommissionPlacementId(null)
        }}
        onSubmit={submitPayCommission}
        isPaying={payCommission.isPending}
      />

      {/* Modal de visualisation de document */}
      <ViewPlacementDocumentModal
        isOpen={!!viewDocumentId}
        onClose={() => {
          setViewDocumentId(null)
          setViewDocumentTitle('')
        }}
        documentId={viewDocumentId}
        title={viewDocumentTitle}
      />

      {/* Modal Quittance finale */}
      {finalQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === finalQuittancePlacementId)
        if (!placement) return null
        return (
          <PlacementFinalQuittanceModal
            isOpen={!!finalQuittancePlacementId}
            onClose={() => setFinalQuittancePlacementId(null)}
            placement={placement}
          />
        )
      })()}

      {/* Modal Quittance de sortie anticipée */}
      {earlyExitQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === earlyExitQuittancePlacementId)
        if (!placement || !earlyExitInfo) return null
        return (
          <PlacementEarlyExitQuittanceModal
            isOpen={!!earlyExitQuittancePlacementId}
            onClose={() => setEarlyExitQuittancePlacementId(null)}
            placement={placement}
            earlyExit={earlyExitInfo}
          />
        )
      })()}
    </div>
  )
}

