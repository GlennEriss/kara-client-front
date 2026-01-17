/**
 * Page principale V2 - Gestion des demandes d'adhésion
 * 
 * Suit WIREFRAME_UI.md pour le design et la structure
 * Intègre tous les composants V2 créés
 */

'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CreditCard,
  AlertCircle,
  Inbox,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Composants V2
import { MembershipRequestsTableV2 } from '../table'
import { MembershipRequestMobileCardV2 } from '../cards'
import {
  ApproveModalV2,
  RejectModalV2,
  CorrectionsModalV2,
  PaymentModalV2
} from '../modals'

// Hooks V2
import { useMembershipRequestsV2 } from '../../hooks/useMembershipRequestsV2'
import { useMembershipActionsV2 } from '../../hooks/useMembershipActionsV2'
import { useMembershipStatsV2 } from '../../hooks/useMembershipStatsV2'

// Types et constantes
import type { MembershipRequest, MembershipRequestFilters } from '../../entities'
import {
  MEMBERSHIP_REQUEST_PAGINATION,
  MEMBERSHIP_REQUEST_MESSAGES,
} from '@/constantes/membership-requests'
import { useAuth } from '@/hooks/useAuth'
import routes from '@/constantes/routes'

// Hook pour détecter le responsive
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Hook personnalisé pour le carousel avec drag/swipe
function useCarousel(itemCount: number, itemsPerView: number = 1) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }, [maxIndex, itemsPerView])

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }, [])

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }, [isDragging, startPos, currentIndex, itemsPerView])

  const handleEnd = useCallback(() => {
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
  }, [isDragging, translateX, currentIndex, itemsPerView, maxIndex, goPrev, goNext])

  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX) }, [handleStart])
  const handleTouchStart = useCallback((e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }, [handleStart])
  const handleTouchMove = useCallback((e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }, [handleMove])
  const handleTouchEnd = useCallback(() => { handleEnd() }, [handleEnd])

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
  }, [isDragging, handleMove, handleEnd])

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

export function MembershipRequestsPageV2() {
  const router = useRouter()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // États des filtres et pagination
  const [filters, setFilters] = useState<MembershipRequestFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<string>('all')

  // États des modals
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [correctionsModalOpen, setCorrectionsModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // États de chargement des actions
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({})

  // Hooks de données
  const { data, isLoading, error, refetch } = useMembershipRequestsV2(filters, currentPage)
  const { data: stats } = useMembershipStatsV2()
  const {
    approveMutation,
    rejectMutation,
    requestCorrectionsMutation,
    processPaymentMutation
  } = useMembershipActionsV2()

  // Filtrer par recherche côté client - Améliorée (P1.4)
  // Recherche par : nom, email, téléphone, matricule, ID de demande
  const filteredRequests = useMemo(() => {
    if (!data?.items || !searchQuery.trim()) {
      return data?.items || []
    }

    const query = searchQuery.toLowerCase().trim()
    return data.items.filter((request) => {
      // Recherche par ID de demande (exact ou partiel)
      const requestId = request.id?.toLowerCase() || ''
      if (requestId.includes(query) || requestId === query) {
        return true
      }

      // Recherche par nom complet
      const fullName = `${request.identity.firstName} ${request.identity.lastName}`.toLowerCase()
      if (fullName.includes(query)) {
        return true
      }

      // Recherche par email
      const email = request.identity.email?.toLowerCase() || ''
      if (email.includes(query)) {
        return true
      }

      // Recherche par téléphone (normalisé - enlever espaces, tirets, etc.)
      const phone = request.identity.contacts?.[0]?.replace(/[\s\-\(\)]/g, '').toLowerCase() || ''
      const queryNormalized = query.replace(/[\s\-\(\)]/g, '')
      if (phone.includes(queryNormalized)) {
        return true
      }

      // Recherche par matricule
      const matricule = request.matricule?.toLowerCase() || ''
      if (matricule.includes(query)) {
        return true
      }

      return false
    })
  }, [data?.items, searchQuery])

  // Handlers
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)

    if (tab === 'all') {
      setFilters({})
    } else if (tab === 'paid') {
      setFilters({ isPaid: true })
    } else if (tab === 'unpaid') {
      setFilters({ isPaid: false })
    } else {
      setFilters({ status: tab as any })
    }
  }, [])

  // Handler pour les filtres secondaires (mobile)
  const handleSecondaryFilterChange = useCallback((value: string) => {
    if (value === 'none') {
      setActiveTab('all')
      setFilters({})
    } else {
      setActiveTab(value)
      if (value === 'paid') {
        setFilters({ isPaid: true })
      } else if (value === 'unpaid') {
        setFilters({ isPaid: false })
      } else {
        setFilters({ status: value as any })
      }
    }
    setCurrentPage(1)
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Actions sur les demandes
  const handleViewDetails = useCallback((requestId: string) => {
    router.push(routes.admin.membershipRequestDetails(requestId))
  }, [router])

  const handleViewMembershipForm = useCallback((requestId: string) => {
    // TODO: Ouvrir modal fiche d'adhésion
    toast.info('Fonctionnalité à venir', { description: 'Fiche d\'adhésion' })
  }, [])

  const handleViewIdentityDocument = useCallback((requestId: string) => {
    // TODO: Ouvrir modal pièce d'identité
    toast.info('Fonctionnalité à venir', { description: 'Pièce d\'identité' })
  }, [])

  const openApproveModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setApproveModalOpen(true)
  }, [])

  const openRejectModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setRejectModalOpen(true)
  }, [])

  const openCorrectionsModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setCorrectionsModalOpen(true)
  }, [])

  const openPaymentModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setPaymentModalOpen(true)
  }, [])

  // Handlers des modals
  const handleApprove = async (data: {
    membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
    companyName?: string
    professionName?: string
  }) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`approve-${selectedRequest.id}`]: true }))

    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        membershipType: data.membershipType,
        companyName: data.companyName,
        professionName: data.professionName,
      })

      toast.success('Demande approuvée', {
        description: `${selectedRequest.identity.firstName} ${selectedRequest.identity.lastName} est maintenant membre.`,
      })

      setApproveModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation', {
        description: error.message || 'Une erreur est survenue.',
      })
    } finally {
      setLoadingActions(prev => ({ ...prev, [`approve-${selectedRequest.id}`]: false }))
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`reject-${selectedRequest.id}`]: true }))

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        motifReject: reason,
      })

      toast.success('Demande rejetée', {
        description: `La demande de ${selectedRequest.identity.firstName} ${selectedRequest.identity.lastName} a été rejetée.`,
      })

      setRejectModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      toast.error('Erreur lors du rejet', {
        description: error.message || 'Une erreur est survenue.',
      })
    } finally {
      setLoadingActions(prev => ({ ...prev, [`reject-${selectedRequest.id}`]: false }))
    }
  }

  const handleCorrections = async (data: {
    corrections: string[]
    sendWhatsApp?: boolean
  }): Promise<{ securityCode: string; whatsAppUrl?: string }> => {
    if (!selectedRequest?.id || !user?.uid) {
      throw new Error('Demande ou utilisateur non défini')
    }

    setLoadingActions(prev => ({ ...prev, [`corrections-${selectedRequest.id}`]: true }))

    try {
      const result = await requestCorrectionsMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        corrections: data.corrections,
        sendWhatsApp: data.sendWhatsApp,
      })

      toast.success('Corrections demandées', {
        description: `Code de sécurité : ${result.securityCode}`,
      })

      setCorrectionsModalOpen(false)
      setSelectedRequest(null)

      return result
    } catch (error: any) {
      toast.error('Erreur lors de la demande de corrections', {
        description: error.message || 'Une erreur est survenue.',
      })
      throw error
    } finally {
      setLoadingActions(prev => ({ ...prev, [`corrections-${selectedRequest.id}`]: false }))
    }
  }

  const handlePayment = async (data: {
    amount: number
    mode: any
    date: string
    time?: string
  }) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`pay-${selectedRequest.id}`]: true }))

    try {
      await processPaymentMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        paymentInfo: {
          amount: data.amount,
          mode: data.mode,
          date: data.date,
        },
      })

      toast.success('Paiement enregistré', {
        description: `${data.amount} FCFA enregistré pour ${selectedRequest.identity.firstName} ${selectedRequest.identity.lastName}.`,
      })

      setPaymentModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      toast.error('Erreur lors de l\'enregistrement du paiement', {
        description: error.message || 'Une erreur est survenue.',
      })
    } finally {
      setLoadingActions(prev => ({ ...prev, [`pay-${selectedRequest.id}`]: false }))
    }
  }

  // Nom complet du demandeur sélectionné
  const selectedMemberName = selectedRequest
    ? `${selectedRequest.identity.firstName} ${selectedRequest.identity.lastName}`
    : ''

  // Carousel de stats avec drag/swipe
  const [itemsPerView, setItemsPerView] = useState(1)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(5)
      else if (w >= 1024) setItemsPerView(4)
      else if (w >= 768) setItemsPerView(3)
      else if (w >= 640) setItemsPerView(2)
      else setItemsPerView(1) // Mobile : 1 seul item pour éviter débordement
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const statsData = useMemo(() => {
    if (!stats) return []

    // Calculer stats dérivées pour stats actionnables
    const toProcess = (stats.byStatus.pending || 0) + (stats.byStatus.under_review || 0) // À traiter
    const readyToPay = (stats.byStatus.pending || 0) // Complètes (en attente = prêtes à payer après validation)

    return [
      { key: 'total', title: 'Total', value: stats.total || 0, icon: Users, bgClass: 'bg-white/10', borderClass: 'border-white/10', hoverClass: 'hover:bg-white/15', textClass: 'text-white', iconBgClass: 'bg-white/20', tab: null },
      { key: 'to_process', title: 'À traiter', value: toProcess, icon: Inbox, bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/30', hoverClass: 'hover:bg-purple-500/30', textClass: 'text-purple-600', iconBgClass: 'bg-purple-500', tab: null, customFilter: { status: ['pending', 'under_review'] } },
      { key: 'pending', title: 'En attente', value: stats.byStatus.pending || 0, icon: Clock, bgClass: 'bg-kara-warning/20', borderClass: 'border-kara-warning/30', hoverClass: 'hover:bg-kara-warning/30', textClass: 'text-kara-warning', iconBgClass: 'bg-kara-warning', tab: 'pending' },
      { key: 'under_review', title: 'En cours', value: stats.byStatus.under_review || 0, icon: Eye, bgClass: 'bg-kara-info/20', borderClass: 'border-kara-info/30', hoverClass: 'hover:bg-kara-info/30', textClass: 'text-kara-info', iconBgClass: 'bg-kara-info', tab: 'under_review' },
      { key: 'ready_to_pay', title: 'Complètes', value: readyToPay, icon: CheckCircle2, bgClass: 'bg-emerald-500/20', borderClass: 'border-emerald-500/30', hoverClass: 'hover:bg-emerald-500/30', textClass: 'text-emerald-600', iconBgClass: 'bg-emerald-500', tab: 'pending', tooltip: 'Demandes en attente (prêtes à payer)' },
      { key: 'approved', title: 'Approuvées', value: stats.byStatus.approved || 0, icon: CheckCircle, bgClass: 'bg-kara-success/20', borderClass: 'border-kara-success/30', hoverClass: 'hover:bg-kara-success/30', textClass: 'text-kara-success', iconBgClass: 'bg-kara-success', tab: 'approved' },
      { key: 'rejected', title: 'Rejetées', value: stats.byStatus.rejected || 0, icon: XCircle, bgClass: 'bg-kara-error/20', borderClass: 'border-kara-error/30', hoverClass: 'hover:bg-kara-error/30', textClass: 'text-kara-error', iconBgClass: 'bg-kara-error', tab: 'rejected' },
      { key: 'paid', title: 'Payées', value: stats.byPayment.paid || 0, icon: CreditCard, bgClass: 'bg-kara-primary-light/20', borderClass: 'border-kara-primary-light/40', hoverClass: 'hover:bg-kara-primary-light/30', textClass: 'text-kara-primary-light', iconBgClass: 'bg-kara-primary-light', tab: 'paid' },
      { key: 'unpaid', title: 'Non payées', value: stats.byPayment.unpaid || 0, icon: AlertCircle, bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/30', hoverClass: 'hover:bg-orange-500/30', textClass: 'text-orange-500', iconBgClass: 'bg-orange-500', tab: 'unpaid' },
    ]
  }, [stats])

  const {
    canGoPrev,
    canGoNext,
    translateX,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
    goPrev,
    goNext,
  } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="min-h-screen bg-kara-neutral-50">
      <div className="space-y-4 md:space-y-6 p-3 md:p-4 lg:p-6 xl:p-8">
        {/* Header avec fond KARA - Réduit sur mobile */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-kara-primary-dark p-4 md:p-6 lg:p-8">
          {/* Motif décoratif */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-kara-primary-light" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight truncate">
                Demandes d'Adhésion
              </h1>
              <p className="text-kara-primary-light/80 mt-1 md:mt-2 text-xs sm:text-sm md:text-base font-medium line-clamp-2">
                Gérez les demandes d'inscription des membres KARA
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 group shrink-0 self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:animate-spin" />
              <span className="hidden sm:inline">Actualiser</span>
              <span className="sm:hidden">Actualiser</span>
            </Button>
          </div>

          {/* Stats Carousel avec drag/swipe - Responsive */}
          {stats && (
            <div className="mt-4 md:mt-8 relative">
              {/* Bouton précédent - Caché sur mobile très petit */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10 hidden sm:block">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/20 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
                    canGoPrev ? 'hover:bg-white/30 hover:scale-110 text-white' : 'opacity-30 cursor-not-allowed text-white/50'
                  )}
                  onClick={goPrev}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              {/* Bouton suivant - Caché sur mobile très petit */}
              <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10 hidden sm:block">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/20 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
                    canGoNext ? 'hover:bg-white/30 hover:scale-110 text-white' : 'opacity-30 cursor-not-allowed text-white/50'
                  )}
                  onClick={goNext}
                  disabled={!canGoNext}
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              {/* Container du carousel avec drag/swipe - Padding réduit sur mobile */}
              <div
                ref={containerRef}
                className="overflow-hidden px-2 sm:px-6 md:px-12 py-2"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className={cn(
                    'flex transition-transform duration-300 ease-out gap-4',
                    isDragging && 'transition-none'
                  )}
                  style={{
                    transform: `translateX(${translateX}%)`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                >
                  {statsData.map((stat) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={stat.key}
                        className="shrink-0"
                        style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}
                      >
                        <div
                          onClick={() => {
                            if (stat.tab) {
                              handleTabChange(stat.tab)
                            } else if (stat.customFilter) {
                              // Gestion des filtres personnalisés (ex: "À traiter" = pending + under_review)
                              setActiveTab('all')
                              setCurrentPage(1)
                              // Pour "À traiter", on affiche toutes car on ne peut pas filtrer par plusieurs statuts
                              // L'utilisateur utilisera les tabs individuels
                              setFilters({})
                            }
                          }}
                          className={cn(
                            'backdrop-blur-sm rounded-xl p-4 border transition-all group h-full',
                            stat.bgClass,
                            stat.borderClass,
                            stat.hoverClass,
                            (stat.tab || stat.customFilter) ? 'cursor-pointer' : 'cursor-default'
                          )}
                          title={stat.tooltip || (stat.tab ? `Voir les ${stat.title.toLowerCase()}` : undefined)}
                        >
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className={cn(
                              'p-1.5 md:p-2.5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0',
                              stat.iconBgClass
                            )}>
                              <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-xl md:text-2xl lg:text-3xl font-black truncate', stat.textClass)}>{stat.value}</p>
                              <p className="text-[10px] md:text-xs text-white/70 font-medium truncate">{stat.title}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs comme conteneur principal - Effet classeur (UX optimisée) */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Conteneur principal avec style Card - Tabs englobent tout le contenu */}
          <div className="border-0 shadow-lg rounded-xl md:rounded-2xl overflow-hidden">
            {/* TabsList en haut - Responsive : tabs principales en mobile, toutes en desktop */}
            <div className="flex items-center gap-2 border-b border-kara-neutral-200">
              <TabsList className="relative flex flex-1 flex-nowrap overflow-x-auto scrollbar-hide bg-transparent p-0 h-auto gap-0.5">
                {/* Tabs principales : toujours visibles (mobile et desktop) */}
                <TabsTrigger
                  value="all"
                  className="shrink-0 min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:border-kara-primary-dark data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-primary-dark"
                >
                  Toutes
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="shrink-0 min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-warning data-[state=active]:border-kara-warning data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-warning"
                >
                  En attente
                </TabsTrigger>
                <TabsTrigger
                  value="under_review"
                  className="shrink-0 min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-info data-[state=active]:border-kara-info data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-info"
                >
                  En cours
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="shrink-0 min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-success data-[state=active]:border-kara-success data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-success"
                >
                  Approuvées
                </TabsTrigger>

                {/* Tabs secondaires : visibles en desktop uniquement */}
                <TabsTrigger
                  value="rejected"
                  className="hidden md:flex shrink-0 min-w-[100px] px-4 py-3 text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-error data-[state=active]:border-kara-error data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-error"
                >
                  Rejetées
                </TabsTrigger>
                <TabsTrigger
                  value="paid"
                  className="hidden md:flex shrink-0 min-w-[100px] px-4 py-3 text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-primary-light data-[state=active]:border-kara-primary-light data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-primary-light"
                >
                  Payées
                </TabsTrigger>
                <TabsTrigger
                  value="unpaid"
                  className="hidden md:flex shrink-0 min-w-[100px] px-4 py-3 text-sm rounded-t-lg rounded-b-none border-x border-t border-kara-neutral-200 bg-kara-neutral-50/50 font-semibold text-kara-neutral-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-kara-error data-[state=active]:border-kara-error data-[state=active]:shadow-none hover:bg-kara-neutral-100 hover:text-kara-error"
                >
                  Non payées
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Contenu de la "page" du classeur - Fait partie intégrante du tab actif */}
            <div className="bg-white pt-0">
              {/* En-tête de liste avec titre, recherche et pagination - Pas de séparation avec tabs */}
              <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4 border-b border-kara-neutral-100">
                <div className="flex flex-col gap-3 md:gap-4">
                  {/* Titre et compteur */}
                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-kara-primary-dark/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-kara-primary-dark" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-base md:text-lg text-kara-primary-dark truncate">Liste des demandes</h2>
                      <p className="text-xs md:text-sm text-kara-neutral-500 truncate">
                        {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''} trouvée{filteredRequests.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Barre de recherche, filtres et pagination - Pattern standard (filtre à côté recherche) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    {/* Barre de recherche + Filtre (pattern standard) */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {/* Barre de recherche - Plein largeur sur mobile */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kara-primary-dark/40" />
                          </div>
                          <Input
                            placeholder="Rechercher par nom, email, téléphone, ID ou matricule..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-8 sm:pl-9 pr-8 sm:pr-9 h-8 sm:h-9 bg-kara-neutral-50 border border-kara-neutral-200 focus:border-kara-primary-dark focus:ring-1 focus:ring-kara-primary-dark/20 rounded-lg text-xs sm:text-sm placeholder:text-kara-neutral-400 transition-all duration-200"
                            title="Recherche rapide : nom, email, téléphone, ID de demande ou matricule"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => handleSearch('')}
                              className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-kara-neutral-400 hover:text-kara-primary-dark transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Menu filtres secondaires : à côté de la recherche (pattern standard) - Mobile uniquement */}
                      <div className="md:hidden shrink-0">
                        <Select
                          value={activeTab === 'rejected' || activeTab === 'paid' || activeTab === 'unpaid' ? activeTab : 'none'}
                          onValueChange={handleSecondaryFilterChange}
                        >
                          <SelectTrigger className="h-8 sm:h-9 w-10 sm:w-12 p-0 border-kara-neutral-200 bg-kara-neutral-50 hover:bg-kara-neutral-100 rounded-lg">
                            <Filter className="w-4 h-4 text-kara-neutral-600" />
                            <span className="sr-only">Filtres</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tous les filtres</SelectItem>
                            <SelectItem value="rejected">Rejetées</SelectItem>
                            <SelectItem value="paid">Payées</SelectItem>
                            <SelectItem value="unpaid">Non payées</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pagination - Visible sur mobile aussi */}
                    {data?.pagination && data.pagination.totalPages > 0 && (
                      <span className="shrink-0 text-xs sm:text-sm font-medium text-kara-primary-light bg-kara-primary-light/10 px-2.5 sm:px-3 py-1.5 rounded-full self-start sm:self-auto">
                        Page {data.pagination.page} / {data.pagination.totalPages}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isMobile ? (
                // Vue mobile : Cards
                <div className="divide-y divide-kara-neutral-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-kara-neutral-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-kara-neutral-200 rounded w-3/4" />
                            <div className="h-3 bg-kara-neutral-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-kara-primary-dark/5 flex items-center justify-center">
                        <Users className="w-10 h-10 text-kara-primary-dark/30" />
                      </div>
                      <h3 className="font-bold text-kara-primary-dark mb-2">
                        {MEMBERSHIP_REQUEST_MESSAGES.NO_REQUESTS}
                      </h3>
                      <p className="text-kara-neutral-500 text-sm max-w-xs mx-auto">
                        Ajustez vos filtres ou attendez de nouvelles demandes.
                      </p>
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <MembershipRequestMobileCardV2
                        key={request.id}
                        request={request}
                        onViewDetails={handleViewDetails}
                        onApprove={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openApproveModal(req)
                        }}
                        onReject={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openRejectModal(req)
                        }}
                        onRequestCorrections={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openCorrectionsModal(req)
                        }}
                        onPay={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openPaymentModal(req)
                        }}
                        onViewMembershipForm={handleViewMembershipForm}
                        onViewIdDocument={handleViewIdentityDocument}
                        loadingActions={loadingActions}
                      />
                    ))
                  )}
                </div>
              ) : (
                // Vue desktop : Tableau
                <MembershipRequestsTableV2
                  data={{ items: filteredRequests, pagination: data?.pagination || { page: 1, limit: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }}
                  isLoading={isLoading}
                  onViewDetails={handleViewDetails}
                  onViewMembershipForm={handleViewMembershipForm}
                  onViewIdentityDocument={handleViewIdentityDocument}
                  onApprove={openApproveModal}
                  onReject={openRejectModal}
                  onRequestCorrections={openCorrectionsModal}
                  onPay={openPaymentModal}
                  hasActiveFilters={activeTab !== 'all' || Object.keys(filters).length > 0}
                  searchQuery={searchQuery}
                  totalCount={data?.pagination?.totalItems || 0}
                />
              )}

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-kara-neutral-100 bg-kara-neutral-50/50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-kara-neutral-600">
                      Affichage de{' '}
                      <span className="font-bold text-kara-primary-dark">
                        {((data.pagination.page - 1) * data.pagination.limit) + 1}
                      </span>
                      {' '}à{' '}
                      <span className="font-bold text-kara-primary-dark">
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalItems)}
                      </span>
                      {' '}sur{' '}
                      <span className="font-bold text-kara-primary-dark">{data.pagination.totalItems}</span>
                      {' '}demandes
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.pagination.hasPrevPage}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="border-kara-neutral-200 text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white hover:border-kara-primary-dark transition-all disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {/* Numéros de page */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, data.pagination.totalPages) }).map((_, i) => {
                          // Calcul intelligent des numéros de page
                          let pageNum: number
                          const total = data.pagination.totalPages
                          const current = currentPage

                          if (total <= 5) {
                            pageNum = i + 1
                          } else if (current <= 3) {
                            pageNum = i + 1
                          } else if (current >= total - 2) {
                            pageNum = total - 4 + i
                          } else {
                            pageNum = current - 2 + i
                          }

                          return (
                            <button
                              key={i}
                              onClick={() => handlePageChange(pageNum)}
                              className={cn(
                                "w-9 h-9 rounded-lg font-semibold text-sm transition-all duration-200",
                                pageNum === currentPage
                                  ? "bg-kara-primary-dark text-white shadow-md"
                                  : "bg-white border border-kara-neutral-200 text-kara-neutral-600 hover:bg-kara-primary-dark/10 hover:text-kara-primary-dark hover:border-kara-primary-dark/30"
                              )}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.pagination.hasNextPage}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="border-kara-neutral-200 text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white hover:border-kara-primary-dark transition-all disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs>

        {/* Modals */}
        <ApproveModalV2
          isOpen={approveModalOpen}
          onClose={() => {
            setApproveModalOpen(false)
            setSelectedRequest(null)
          }}
          onConfirm={handleApprove}
          requestId={selectedRequest?.id || ''}
          memberName={selectedMemberName}
          isLoading={loadingActions[`approve-${selectedRequest?.id}`]}
        />

        <RejectModalV2
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false)
            setSelectedRequest(null)
          }}
          onConfirm={handleReject}
          requestId={selectedRequest?.id || ''}
          memberName={selectedMemberName}
          isLoading={loadingActions[`reject-${selectedRequest?.id}`]}
        />

        <CorrectionsModalV2
          isOpen={correctionsModalOpen}
          onClose={() => {
            setCorrectionsModalOpen(false)
            setSelectedRequest(null)
          }}
          onConfirm={handleCorrections}
          requestId={selectedRequest?.id || ''}
          memberName={selectedMemberName}
          phoneNumber={selectedRequest?.identity.contacts?.[0]}
          isLoading={loadingActions[`corrections-${selectedRequest?.id}`]}
        />

        <PaymentModalV2
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedRequest(null)
          }}
          onConfirm={handlePayment}
          requestId={selectedRequest?.id || ''}
          memberName={selectedMemberName}
          isLoading={loadingActions[`pay-${selectedRequest?.id}`]}
        />
      </div>
    </div>
  )
}
