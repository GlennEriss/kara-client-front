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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
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
  Download,
  CreditCard,
  AlertCircle,
  Inbox,
  CheckCircle2,
  Grid3x3,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Composants V2
import { MembershipRequestsTableV2 } from '../table'
import { MembershipRequestMobileCardV2 } from '../cards'
import { MembershipRequestsGridView } from '../grid'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import {
  ApprovalModalV2,
  RejectModalV2,
  ReopenModalV2,
  DeleteModalV2,
  RejectWhatsAppModalV2,
  CorrectionsModalV2,
  SendWhatsAppModalV2,
  RenewSecurityCodeModalV2,
  PaymentModalV2,
  PaymentDetailsModalV2,
  IdentityDocumentModalV2,
  ExportMembershipRequestsModalV2
} from '../modals'

// Hooks V2
import { useMembershipRequestsV2 } from '../../hooks/useMembershipRequestsV2'
import { useMembershipActionsV2 } from '../../hooks/useMembershipActionsV2'
import { useMembershipStatsV2 } from '../../hooks/useMembershipStatsV2'
import { useApproveMembershipRequest } from '../../hooks/useApproveMembershipRequest'

// Types et constantes
import type { MembershipRequest, MembershipRequestFilters } from '../../entities'
import {
  MEMBERSHIP_REQUEST_MESSAGES,
} from '@/constantes/membership-requests'
import { useAuth } from '@/hooks/useAuth'
import routes from '@/constantes/routes'
import MemberDetailsModal from '@/components/memberships/MemberDetailsModal'
import { generateRequestPDF, generateRequestExcel } from '../../utils/exportRequestUtils'
import { DocumentRepository } from '@/domains/infrastructure/documents/repositories/DocumentRepository'
import { getUserById } from '@/db/user.db'
import { formatAdminName } from '@/utils/formatAdminName'
import { useQueries } from '@tanstack/react-query'

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
  
  // État pour le mode d'affichage (grid/liste)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('membership-requests-view-mode')
      return (saved === 'grid' || saved === 'list') ? saved : 'grid'
    }
    return 'grid'
  })

  // États des modals
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [rejectWhatsAppModalOpen, setRejectWhatsAppModalOpen] = useState(false)
  const [correctionsModalOpen, setCorrectionsModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentDetailsModalOpen, setPaymentDetailsModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [membershipFormModalOpen, setMembershipFormModalOpen] = useState(false)
  const [identityDocumentModalOpen, setIdentityDocumentModalOpen] = useState(false)
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false)
  const [renewCodeModalOpen, setRenewCodeModalOpen] = useState(false)

  // États de chargement des actions
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({})

  // Hooks de données
  const { data, isLoading, refetch } = useMembershipRequestsV2(filters, currentPage)
  const { data: stats } = useMembershipStatsV2()
  const {
    rejectMutation,
    reopenMutation,
    deleteMutation,
    requestCorrectionsMutation,
    processPaymentMutation,
    renewSecurityCodeMutation
  } = useMembershipActionsV2()

  // Hook pour l'approbation
  const { approve, isPending: isApproving } = useApproveMembershipRequest({
    onSuccess: () => {
      setApproveModalOpen(false)
      setSelectedRequest(null)
    },
  })

  // La recherche est maintenant gérée côté serveur via les filtres
  // Pas besoin de filtrer côté client
  const filteredRequests = data?.items || []

  // Récupérer tous les admins uniques qui ont approuvé des demandes
  const uniqueApprovedByIds = useMemo(() => {
    const ids = new Set<string>()
    filteredRequests.forEach(request => {
      if (request.approvedBy) {
        ids.add(request.approvedBy)
      }
    })
    return Array.from(ids)
  }, [filteredRequests])

  // Récupérer les données des admins avec React Query
  const adminQueries = useQueries({
    queries: uniqueApprovedByIds.map((adminId) => ({
      queryKey: ['admin', adminId],
      queryFn: () => getUserById(adminId),
      enabled: !!adminId,
      staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    })),
  })

  // Créer un map pour accéder rapidement aux données des admins
  const adminMap = useMemo(() => {
    const map = new Map<string, { name: string; matricule?: string }>()
    adminQueries.forEach((query, index) => {
      const adminId = uniqueApprovedByIds[index]
      if (query.data) {
        const formattedName = formatAdminName(query.data.firstName, query.data.lastName)
        map.set(adminId, {
          name: formattedName,
          matricule: query.data.matricule,
        })
      }
    })
    return map
  }, [adminQueries, uniqueApprovedByIds])

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
    // Mettre à jour les filtres avec la recherche
    setFilters((prev) => ({
      ...prev,
      search: value.trim() || undefined,
    }))
    // Réinitialiser à la page 1 lors d'une recherche
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    // Scroll vers le haut de la page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Handler pour changer le mode d'affichage
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('membership-requests-view-mode', mode)
    }
  }, [])

  // Actions sur les demandes
  const handleViewDetails = useCallback((requestId: string) => {
    router.push(routes.admin.membershipRequestDetails(requestId))
  }, [router])

  const handleViewMembershipForm = useCallback((requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setMembershipFormModalOpen(true)
    } else {
      toast.error('Demande introuvable', { description: 'Impossible de trouver la demande d\'adhésion' })
    }
  }, [data?.items, filteredRequests])

  // Nouvelle fonction pour ouvrir le PDF uploadé lors de l'approbation (document officiel validé)
  const handleViewApprovedMembershipPdf = useCallback(async (requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request) {
      toast.error('Demande introuvable', { description: 'Impossible de trouver la demande d\'adhésion' })
      return
    }

    // Vérifier que le statut est approuvé
    if (request.status !== 'approved') {
      toast.error('Demande non approuvée', { description: 'Ce document n\'est disponible que pour les demandes approuvées' })
      return
    }

    // 1) Si l'URL est déjà présente sur la demande, on l'utilise directement
    if (request.adhesionPdfURL) {
      window.open(request.adhesionPdfURL, '_blank', 'noopener,noreferrer')
      return
    }

    // 2) Sinon, on tente de récupérer le PDF dans la collection Firestore "documents" (type ADHESION)
    try {
      const repo = new DocumentRepository()
      const memberId = request.matricule || request.id
      const result = await repo.getDocuments({
        memberId,
        type: 'ADHESION',
        page: 1,
        pageSize: 1,
        sort: [
          { field: 'createdAt', direction: 'desc' }
        ],
      })

      const doc = result.documents?.[0]
      if (doc?.url) {
        window.open(doc.url, '_blank', 'noopener,noreferrer')
        return
      }

      toast.error('PDF non disponible', { description: 'Aucun PDF d\'adhésion validé n\'a été trouvé pour cette demande' })
    } catch (error) {
      console.error('Erreur lors de la récupération du PDF validé:', error)
      toast.error('PDF non disponible', { description: 'Impossible de récupérer le PDF d\'adhésion validé' })
    }
  }, [data?.items, filteredRequests])

  const handleViewIdentityDocument = useCallback((requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setIdentityDocumentModalOpen(true)
    } else {
      toast.error('Demande introuvable', { description: 'Impossible de trouver la demande d\'adhésion' })
    }
  }, [data?.items, filteredRequests])

  const openApproveModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setApproveModalOpen(true)
  }, [])

  const openRejectModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setRejectModalOpen(true)
  }, [])

  const openReopenModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setReopenModalOpen(true)
  }, [])

  const openDeleteModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setDeleteModalOpen(true)
  }, [])

  const openRejectWhatsAppModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setRejectWhatsAppModalOpen(true)
  }, [])

  const openCorrectionsModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setCorrectionsModalOpen(true)
  }, [])

  const openPaymentModal = useCallback((request: MembershipRequest) => {
    setSelectedRequest(request)
    setPaymentModalOpen(true)
  }, [])

  const handleViewPaymentDetails = useCallback((requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (request && request.isPaid && request.payments && request.payments.length > 0) {
      setSelectedRequest(request)
      setPaymentDetailsModalOpen(true)
    } else {
      toast.error('Paiement introuvable', { description: 'Aucun paiement enregistré pour cette demande' })
    }
  }, [data?.items, filteredRequests])

  const handleExportPDF = useCallback(async (requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request) {
      toast.error('Demande introuvable')
      return
    }
    try {
      await generateRequestPDF(request)
      toast.success('PDF généré avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF', {
        description: error.message || 'Une erreur est survenue',
      })
    }
  }, [data?.items, filteredRequests])

  const handleExportExcel = useCallback(async (requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request) {
      toast.error('Demande introuvable')
      return
    }
    try {
      await generateRequestExcel(request)
      toast.success('Excel généré avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération de l\'Excel:', error)
      toast.error('Erreur lors de la génération de l\'Excel', {
        description: error.message || 'Une erreur est survenue',
      })
    }
  }, [data?.items, filteredRequests])

  // Handlers pour les actions corrections (si status === 'under_review')
  const handleCopyCorrectionLink = useCallback(async (requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request || request.status !== 'under_review' || !request.securityCode) {
      toast.error('Lien de correction non disponible', {
        description: 'Cette demande n\'est pas en correction ou le code n\'est pas disponible.',
      })
      return
    }

    const baseUrl = window.location.origin
    const correctionLink = `${baseUrl}/register?requestId=${requestId}&code=${request.securityCode}`

    try {
      await navigator.clipboard.writeText(correctionLink)
      toast.success('Lien copié !', {
        description: 'Le lien de correction a été copié dans le presse-papiers.',
      })
    } catch {
      toast.error('Erreur lors de la copie', {
        description: 'Impossible de copier le lien. Veuillez le copier manuellement.',
      })
    }
  }, [data?.items, filteredRequests])

  const handleSendWhatsAppCorrection = useCallback((requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request || request.status !== 'under_review') {
      toast.error('Action non disponible', {
        description: 'Cette demande n\'est pas en correction.',
      })
      return
    }

    if (!request.securityCode) {
      toast.error('Code de sécurité non disponible', {
        description: 'Le code de sécurité n\'est pas disponible pour cette demande.',
      })
      return
    }

    // Récupérer les numéros de téléphone
    const phoneNumbers = request.identity.contacts || []
    if (phoneNumbers.length === 0) {
      toast.error('Aucun numéro de téléphone disponible', {
        description: 'Aucun numéro de téléphone n\'est associé à cette demande.',
      })
      return
    }

    // Sélectionner la demande et ouvrir le modal
    setSelectedRequest(request)
    setWhatsAppModalOpen(true)
  }, [data?.items, filteredRequests])

  const handleRenewSecurityCode = useCallback((requestId: string) => {
    const request = data?.items.find(r => r.id === requestId) || filteredRequests.find(r => r.id === requestId)
    if (!request || request.status !== 'under_review') {
      toast.error('Action non disponible', {
        description: 'Cette demande n\'est pas en correction.',
      })
      return
    }

    // Sélectionner la demande et ouvrir le modal de confirmation
    setSelectedRequest(request)
    setRenewCodeModalOpen(true)
  }, [data?.items, filteredRequests])

  const handleEdit = useCallback((requestId: string) => {
    router.push(`/memberships/update/${requestId}`)
  }, [router])

  const handleConfirmRenewCode = useCallback(async () => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`renew-code-${selectedRequest.id}`]: true }))

    try {
      const result = await renewSecurityCodeMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
      })

      toast.success('Code régénéré avec succès', {
        description: `Le nouveau code est : ${result.newCode}`,
      })
      setRenewCodeModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      toast.error('Erreur lors de la régénération', {
        description: error.message || 'Une erreur est survenue.',
      })
    } finally {
      setLoadingActions(prev => ({ ...prev, [`renew-code-${selectedRequest.id}`]: false }))
    }
  }, [selectedRequest, user?.uid, renewSecurityCodeMutation])

  // Handlers des modals
  const handleApprove = async (params: {
    membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
    adhesionPdfURL: string
    companyId?: string | null
    professionId?: string | null
  }) => {
    if (!selectedRequest?.id || !user?.uid) return

    try {
      await approve({
        requestId: selectedRequest.id,
        adminId: user.uid,
        membershipType: params.membershipType,
        adhesionPdfURL: params.adhesionPdfURL,
        companyId: params.companyId,
        professionId: params.professionId,
      })
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook (toast)
      console.error('Erreur lors de l\'approbation:', error)
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`reject-${selectedRequest.id}`]: true }))

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        reason: reason,
      })

      // Le toast est déjà géré par le hook
      setRejectModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook (toast)
      console.error('Erreur lors du rejet:', error)
    } finally {
      setLoadingActions(prev => ({ ...prev, [`reject-${selectedRequest.id}`]: false }))
    }
  }

  const handleReopen = async (reason: string) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`reopen-${selectedRequest.id}`]: true }))

    try {
      await reopenMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        reason,
      })

      // Le toast est déjà géré par le hook
      setReopenModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook (toast)
      console.error('Erreur lors de la réouverture:', error)
    } finally {
      setLoadingActions(prev => ({ ...prev, [`reopen-${selectedRequest.id}`]: false }))
    }
  }

  const handleDelete = async (confirmedMatricule: string) => {
    if (!selectedRequest?.id || !user?.uid) return

    setLoadingActions(prev => ({ ...prev, [`delete-${selectedRequest.id}`]: true }))

    try {
      await deleteMutation.mutateAsync({
        requestId: selectedRequest.id,
        confirmedMatricule,
      })

      // Le toast est déjà géré par le hook
      setDeleteModalOpen(false)
      setSelectedRequest(null)
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook (toast)
      console.error('Erreur lors de la suppression:', error)
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete-${selectedRequest.id}`]: false }))
    }
  }


  const handleCorrections = async (corrections: string[]): Promise<void> => {
    if (!selectedRequest?.id || !user?.uid) {
      throw new Error('Demande ou utilisateur non défini')
    }

    setLoadingActions(prev => ({ ...prev, [`corrections-${selectedRequest.id}`]: true }))

    try {
      const result = await requestCorrectionsMutation.mutateAsync({
        requestId: selectedRequest.id,
        adminId: user.uid,
        corrections,
      })

      toast.success('Corrections demandées', {
        description: `Code de sécurité : ${result.securityCode}`,
      })

      setCorrectionsModalOpen(false)
      setSelectedRequest(null)
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
    time: string // Obligatoire
    paymentType?: 'Membership' | 'Subscription' | 'Tontine' | 'Charity'
    withFees?: boolean
    paymentMethodOther?: string
    proofUrl?: string
    proofPath?: string
    proofJustification?: string // Justification si pas de preuve
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
          time: data.time, // Obligatoire
          paymentType: data.paymentType,
          withFees: data.withFees,
          paymentMethodOther: data.paymentMethodOther,
          proofUrl: data.proofUrl,
          proofPath: data.proofPath,
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
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <Button
                onClick={() => setExportModalOpen(true)}
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 group"
                title="Exporter les demandes"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                <span className="hidden sm:inline">Exporter</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                onClick={() => refetch()}
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 group"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:animate-spin" />
                <span className="hidden sm:inline">Actualiser</span>
                <span className="sm:hidden">Actualiser</span>
              </Button>
            </div>
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
                  {/* Titre et compteur avec pagination en haut et switch grid/liste */}
                  <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2 md:gap-3 shrink-0 flex-1 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-kara-primary-dark/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-kara-primary-dark" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-base md:text-lg text-kara-primary-dark truncate">Liste des demandes</h2>
                        <p className="text-xs md:text-sm text-kara-neutral-500 truncate">
                          {data?.pagination?.totalItems || 0} demande{(data?.pagination?.totalItems || 0) > 1 ? 's' : ''} trouvée{(data?.pagination?.totalItems || 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    
                    {/* Pagination en haut + Bouton de switch grid/liste */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Bouton de switch grid/liste */}
                      <div className="flex items-center gap-1 bg-kara-neutral-100 rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewModeChange('grid')}
                          className={cn(
                            'h-7 px-2',
                            viewMode === 'grid' 
                              ? 'bg-white text-kara-primary-dark shadow-sm' 
                              : 'text-kara-neutral-600 hover:text-kara-primary-dark'
                          )}
                          title="Vue en grille"
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewModeChange('list')}
                          className={cn(
                            'h-7 px-2',
                            viewMode === 'list' 
                              ? 'bg-white text-kara-primary-dark shadow-sm' 
                              : 'text-kara-neutral-600 hover:text-kara-primary-dark'
                          )}
                          title="Vue en liste"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Pagination compacte en haut */}
                      {data?.pagination && data.pagination.totalPages > 1 && (
                        <PaginationWithEllipses
                          currentPage={data.pagination.page}
                          totalPages={data.pagination.totalPages}
                          onPageChange={handlePageChange}
                          hasNextPage={data.pagination.hasNextPage}
                          hasPrevPage={data.pagination.hasPrevPage}
                          isLoading={isLoading}
                          compact={true}
                        />
                      )}
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
                            data-testid="search-input"
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

                  </div>
                </div>
              </div>

              {/* Affichage selon le mode sélectionné */}
              {viewMode === 'grid' ? (
                // Vue Grid : 4 colonnes sur desktop, 2 sur tablette, 1 sur mobile
                <MembershipRequestsGridView
                  requests={filteredRequests}
                  isLoading={isLoading}
                  onViewDetails={handleViewDetails}
                  onApprove={openApproveModal}
                  onReject={openRejectModal}
                  onRequestCorrections={openCorrectionsModal}
                  onPay={openPaymentModal}
                  onReopen={openReopenModal}
                  onDelete={openDeleteModal}
                  onSendWhatsAppRejection={openRejectWhatsAppModal}
                  onViewMembershipForm={handleViewMembershipForm}
                  onViewApprovedMembershipPdf={(id: string) => handleViewApprovedMembershipPdf(id)}
                  onViewIdentityDocument={handleViewIdentityDocument}
                  onViewPaymentDetails={handleViewPaymentDetails}
                  onExportPDF={(id) => handleExportPDF(id)}
                  onExportExcel={(id) => handleExportExcel(id)}
                  onEdit={handleEdit}
                  onCopyCorrectionLink={handleCopyCorrectionLink}
                  onSendWhatsAppCorrection={handleSendWhatsAppCorrection}
                  onRenewSecurityCode={handleRenewSecurityCode}
                  getProcessedByInfo={(requestId) => {
                    const request = filteredRequests.find(r => r.id === requestId)
                    if (!request?.processedBy) return null
                    return {
                      name: request.processedBy,
                      matricule: undefined,
                    }
                  }}
                  getApprovedByInfo={(requestId) => {
                    const request = filteredRequests.find(r => r.id === requestId)
                    if (!request?.approvedBy) return null
                    const adminInfo = adminMap.get(request.approvedBy)
                    if (adminInfo) {
                      return adminInfo
                    }
                    return {
                      name: request.approvedBy,
                      matricule: undefined,
                    }
                  }}
                  loadingActions={loadingActions}
                />
              ) : isMobile ? (
                // Vue mobile : Cards (liste verticale)
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
                        onReopen={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openReopenModal(req)
                        }}
                        onDelete={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openDeleteModal(req)
                        }}
                        onSendWhatsAppRejection={(id) => {
                          const req = filteredRequests.find(r => r.id === id)
                          if (req) openRejectWhatsAppModal(req)
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
                        onViewApprovedMembershipPdf={(id: string) => handleViewApprovedMembershipPdf(id)}
                        onViewIdDocument={handleViewIdentityDocument}
                        onViewPaymentDetails={handleViewPaymentDetails}
                        onExportPDF={(id) => handleExportPDF(id)}
                        onExportExcel={(id) => handleExportExcel(id)}
                        onEdit={handleEdit}
                        onCopyCorrectionLink={handleCopyCorrectionLink}
                        onSendWhatsAppCorrection={handleSendWhatsAppCorrection}
                        onRenewSecurityCode={handleRenewSecurityCode}
                        getProcessedByInfo={(requestId) => {
                          const request = filteredRequests.find(r => r.id === requestId)
                          if (!request?.processedBy) return null
                          return {
                            name: request.processedBy,
                            matricule: undefined,
                          }
                        }}
                        getApprovedByInfo={(requestId) => {
                          const request = filteredRequests.find(r => r.id === requestId)
                          if (!request?.approvedBy) return null
                          const adminInfo = adminMap.get(request.approvedBy)
                          if (adminInfo) {
                            return adminInfo
                          }
                          return {
                            name: request.approvedBy,
                            matricule: undefined,
                          }
                        }}
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
                  onViewApprovedMembershipPdf={(id: string) => handleViewApprovedMembershipPdf(id)}
                  onViewIdentityDocument={handleViewIdentityDocument}
                  onViewPaymentDetails={handleViewPaymentDetails}
                  onExportPDF={(id) => handleExportPDF(id)}
                  onExportExcel={(id) => handleExportExcel(id)}
                  onApprove={openApproveModal}
                  onReject={openRejectModal}
                  onRequestCorrections={openCorrectionsModal}
                  onPay={openPaymentModal}
                  onReopen={openReopenModal}
                  onDelete={openDeleteModal}
                  onSendWhatsAppRejection={openRejectWhatsAppModal}
                  onCopyCorrectionLink={handleCopyCorrectionLink}
                  onSendWhatsAppCorrection={handleSendWhatsAppCorrection}
                  onRenewSecurityCode={handleRenewSecurityCode}
                  onEdit={handleEdit}
                  getProcessedByInfo={(requestId) => {
                    const request = filteredRequests.find(r => r.id === requestId)
                    if (!request?.processedBy) return null
                    // TODO: Récupérer le nom et matricule depuis la collection users/admins
                    return {
                      name: request.processedBy, // Pour l'instant, on utilise l'ID
                      matricule: undefined, // À implémenter
                    }
                  }}
                  getApprovedByInfo={(requestId) => {
                    const request = filteredRequests.find(r => r.id === requestId)
                    if (!request?.approvedBy) return null
                    const adminInfo = adminMap.get(request.approvedBy)
                    if (adminInfo) {
                      return adminInfo
                    }
                    // Fallback si l'admin n'est pas encore chargé
                    return {
                      name: request.approvedBy,
                      matricule: undefined,
                    }
                  }}
                  loadingActions={loadingActions}
                  hasActiveFilters={activeTab !== 'all' || Object.keys(filters).length > 0}
                  searchQuery={searchQuery}
                  totalCount={data?.pagination?.totalItems || 0}
                />
              )}

              {/* Pagination en bas avec ellipses */}
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

                    <PaginationWithEllipses
                      currentPage={data.pagination.page}
                      totalPages={data.pagination.totalPages}
                      onPageChange={handlePageChange}
                      hasNextPage={data.pagination.hasNextPage}
                      hasPrevPage={data.pagination.hasPrevPage}
                      isLoading={isLoading}
                      compact={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs>

        {/* Modals */}
        {selectedRequest && (
          <ApprovalModalV2
            isOpen={approveModalOpen}
            onClose={() => {
              setApproveModalOpen(false)
              setSelectedRequest(null)
            }}
            onApprove={handleApprove}
            request={selectedRequest}
            isLoading={isApproving}
          />
        )}

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

        {selectedRequest && selectedRequest.status === 'rejected' && (
          <>
            <ReopenModalV2
              isOpen={reopenModalOpen}
              onClose={() => {
                setReopenModalOpen(false)
                setSelectedRequest(null)
              }}
              onConfirm={handleReopen}
              requestId={selectedRequest.id}
              memberName={selectedMemberName}
              matricule={selectedRequest.matricule}
              previousRejectReason={selectedRequest.motifReject || ''}
              isLoading={loadingActions[`reopen-${selectedRequest.id}`]}
            />

            <DeleteModalV2
              isOpen={deleteModalOpen}
              onClose={() => {
                setDeleteModalOpen(false)
                setSelectedRequest(null)
              }}
              onConfirm={handleDelete}
              requestId={selectedRequest.id}
              memberName={selectedMemberName}
              matricule={selectedRequest.matricule}
              isLoading={loadingActions[`delete-${selectedRequest.id}`]}
            />

            <RejectWhatsAppModalV2
              isOpen={rejectWhatsAppModalOpen}
              onClose={() => {
                setRejectWhatsAppModalOpen(false)
                setSelectedRequest(null)
              }}
              phoneNumbers={selectedRequest.identity.contacts || []}
              memberName={selectedMemberName}
              firstName={selectedRequest.identity.firstName || ''}
              matricule={selectedRequest.matricule}
              motifReject={selectedRequest.motifReject || ''}
              requestId={selectedRequest.id}
              isLoading={false}
            />
          </>
        )}

        <CorrectionsModalV2
          isOpen={correctionsModalOpen}
          onClose={() => {
            setCorrectionsModalOpen(false)
            setSelectedRequest(null)
          }}
          onConfirm={handleCorrections}
          requestId={selectedRequest?.id || ''}
          memberName={selectedMemberName}
          isLoading={loadingActions[`corrections-${selectedRequest?.id}`]}
        />

        {selectedRequest && selectedRequest.status === 'under_review' && selectedRequest.securityCode && (
          <>
            <SendWhatsAppModalV2
              isOpen={whatsAppModalOpen}
              onClose={() => {
                setWhatsAppModalOpen(false)
                setSelectedRequest(null)
              }}
              phoneNumbers={selectedRequest.identity.contacts || []}
              correctionLink={`/register?requestId=${selectedRequest.id}&code=${selectedRequest.securityCode}`}
              securityCode={selectedRequest.securityCode}
              securityCodeExpiry={selectedRequest.securityCodeExpiry || new Date()}
              memberName={selectedMemberName}
              isLoading={false}
            />
            <RenewSecurityCodeModalV2
              isOpen={renewCodeModalOpen}
              onClose={() => {
                setRenewCodeModalOpen(false)
                setSelectedRequest(null)
              }}
              onConfirm={handleConfirmRenewCode}
              requestId={selectedRequest.id || ''}
              memberName={selectedMemberName}
              currentCode={selectedRequest.securityCode}
              currentExpiry={selectedRequest.securityCodeExpiry}
              isLoading={loadingActions[`renew-code-${selectedRequest.id}`]}
            />
          </>
        )}

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

        {/* Modal Fiche d'adhésion */}
        {selectedRequest && (
          <MemberDetailsModal
            isOpen={membershipFormModalOpen}
            onClose={() => {
              setMembershipFormModalOpen(false)
              setSelectedRequest(null)
            }}
            request={selectedRequest}
          />
        )}

        {/* Modal Pièce d'identité */}
        {selectedRequest && (
          <IdentityDocumentModalV2
            isOpen={identityDocumentModalOpen}
            onClose={() => {
              setIdentityDocumentModalOpen(false)
              setSelectedRequest(null)
            }}
            request={selectedRequest}
          />
        )}

        {/* Modal Détails du paiement */}
        {selectedRequest && selectedRequest.isPaid && selectedRequest.payments && selectedRequest.payments.length > 0 && (
          <PaymentDetailsModalV2
            isOpen={paymentDetailsModalOpen}
            onClose={() => {
              setPaymentDetailsModalOpen(false)
              setSelectedRequest(null)
            }}
            payment={selectedRequest.payments[selectedRequest.payments.length - 1]} // Dernier paiement
            memberName={selectedMemberName}
            requestId={selectedRequest.id}
            matricule={selectedRequest.matricule}
            memberEmail={selectedRequest.identity.email}
            memberPhone={selectedRequest.identity.contacts?.[0]}
          />
        )}

        {/* Modal Export global */}
        <ExportMembershipRequestsModalV2
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      </div>
    </div>
  )
}
