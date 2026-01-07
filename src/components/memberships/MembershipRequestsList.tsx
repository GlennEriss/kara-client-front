'use client'
import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, User, Calendar, Mail, Phone, MapPin, FileText, IdCard, Building2, Briefcase, AlertCircle, RefreshCw, Loader2, Car, CarFront, TrendingUp, Users, UserCheck, UserX, FileX, ChevronLeft, ChevronRight, Zap, Target, DollarSign, Copy } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMembershipRequests, useUpdateMembershipRequestStatus, useRenewSecurityCode, usePayMembershipRequest, type MembershipRequestFilters } from '@/hooks/useMembershipRequests'
import type { MembershipRequest, MembershipRequestStatus, TypePayment } from '@/types/types'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'
import { toast } from 'sonner'
import { getNationalityName } from '@/constantes/nationality'
import MemberDetailsModal from './MemberDetailsModal'
import MemberIdentityModal from './MemberIdentityModal'
import { useAuth } from '@/hooks/useAuth'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'
import { findCompanyByName } from '@/db/company.db'
import { findProfessionByName } from '@/db/profession.db'
import { cn } from '@/lib/utils'
import { 
  createTestMembershipRequestPending, 
  createTestMembershipRequestPendingUnpaid,
  createTestMembershipRequestUnderReview, 
  createTestMembershipRequestRejected, 
  createTestMembershipRequestApproved, 
  createTestMembershipRequestWithFilters 
} from '@/utils/test-data'
import { DocumentRepository } from '@/repositories/documents/DocumentRepository'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Couleurs pour les graphiques
const COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  under_review: '#3b82f6'
}

// Fonction utilitaire pour obtenir le badge de statut avec animations
const getStatusBadge = (status: MembershipRequestStatus) => {
  const baseClasses = "transition-all duration-300 hover:scale-105 flex items-center gap-1.5 font-medium break-words whitespace-normal max-w-full text-left"
  
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className={`${baseClasses} bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200 hover:shadow-md`}>
          <Clock className="w-3 h-3 animate-pulse" />
          {MEMBERSHIP_STATUS_LABELS.pending}
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="secondary" className={`${baseClasses} bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 hover:shadow-md`}>
          <CheckCircle className="w-3 h-3" />
          {MEMBERSHIP_STATUS_LABELS.approved}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive" className={`${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 hover:shadow-md`}>
          <XCircle className="w-3 h-3" />
          {MEMBERSHIP_STATUS_LABELS.rejected}
        </Badge>
      )
    case 'under_review':
      return (
        <Badge variant="outline" className={`${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 hover:shadow-md`}>
          <Eye className="w-3 h-3 animate-bounce" />
          {MEMBERSHIP_STATUS_LABELS.under_review}
        </Badge>
      )
    default:
      return <Badge variant="outline" className={baseClasses}>{status}</Badge>
  }
}

// Fonction utilitaire pour formater la date
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Non définie'

  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Date invalide'
  }
}

// Fonction utilitaire pour récupérer les détails d'identité de manière sécurisée
const getIdentityDisplayName = (request: MembershipRequest): string => {
  const firstName = request.identity.firstName?.trim() || ''
  const lastName = request.identity.lastName?.trim() || ''
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  } else if (firstName) {
    return firstName
  } else if (lastName) {
    return lastName
  } else {
    return 'Utilisateur'
  }
}

// Composant pour les statistiques avec graphiques
const StatsCard = ({ 
  title, 
  value, 
  percentage, 
  color, 
  icon: Icon,
  trend 
}: { 
  title: string
  value: number
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
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
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
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX])

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

const StatsCarousel = ({ stats }: { stats: any }) => {
  const statsData = [
    { title: 'Total', value: stats.total, percentage: 100, color: '#6b7280', icon: Users },
    { title: 'En attente', value: stats.pending, percentage: stats.pendingPercentage, color: '#f59e0b', icon: Clock, trend: 'up' as const },
    { title: 'Approuvées', value: stats.approved, percentage: stats.approvedPercentage, color: '#10b981', icon: UserCheck, trend: 'up' as const },
    { title: 'Rejetées', value: stats.rejected, percentage: stats.rejectedPercentage, color: '#ef4444', icon: UserX, trend: 'down' as const },
    { title: 'En cours', value: stats.underReview, percentage: stats.underReviewPercentage, color: '#3b82f6', icon: Eye },
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

  const { currentIndex, goTo, goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

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

      <div ref={containerRef} className="overflow-hidden px-12 py-2" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
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

// Composant pour le squelette de chargement avec animations
const MembershipRequestSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Composant pour une demande individuelle avec animations améliorées
const MembershipRequestCard = ({
  request,
  onStatusUpdate
}: {
  request: MembershipRequest
  onStatusUpdate: (requestId: string, newStatus: MembershipRequest['status']) => void
}) => {
  const { user } = useAuth()
  const router = useRouter()
  const [showDetailsModal, setShowDetailsModal] = React.useState(false)
  const [showIdentityModal, setShowIdentityModal] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)
  const [confirmationAction, setConfirmationAction] = React.useState<{
    type: 'approve' | 'reject' | 'under_review' | 'pending' | null
    isOpen: boolean
  }>({ type: null, isOpen: false })
  const [membershipType, setMembershipType] = React.useState<string>('')
  const [companyName, setCompanyName] = React.useState<string>('')
  const [professionName, setProfessionName] = React.useState<string>('')
  const [correctionsList, setCorrectionsList] = React.useState<string>('')
  const [rejectReason, setRejectReason] = React.useState<string>('')
  const [approvalPdfFile, setApprovalPdfFile] = React.useState<File | null>(null)
  const [paymentOpen, setPaymentOpen] = React.useState(false)
  const [paymentDate, setPaymentDate] = React.useState<string>('')
  const [paymentMode, setPaymentMode] = React.useState<'airtel_money' | 'mobicash' | ''>('')
  const [paymentAmount, setPaymentAmount] = React.useState<string>('')
  const [paymentType, setPaymentType] = React.useState<TypePayment>('Membership')
  const [paymentTime, setPaymentTime] = React.useState<string>('')
  const [withFees, setWithFees] = React.useState<'yes' | 'no' | ''>('')
  const [isPaying, setIsPaying] = React.useState<boolean>(false)
  const payMutation = usePayMembershipRequest()
  
  const [companyExists, setCompanyExists] = React.useState<boolean>(false)
  const [professionExists, setProfessionExists] = React.useState<boolean>(false)
  const [isCheckingExistence, setIsCheckingExistence] = React.useState<boolean>(false)
  
  const queryClient = useQueryClient()
  const updateStatusMutation = useUpdateMembershipRequestStatus()
  const renewSecurityCodeMutation = useRenewSecurityCode()

  const checkExistenceInFirestore = React.useCallback(async () => {
    if (!request.company?.companyName && !request.company?.profession) {
      setCompanyExists(false)
      setProfessionExists(false)
      return
    }

    setIsCheckingExistence(true)
    
    try {
      if (request.company?.companyName) {
        const companyResult = await findCompanyByName(request.company.companyName)
        setCompanyExists(companyResult.found)
      } else {
        setCompanyExists(false)
      }
      
      if (request.company?.profession) {
        const professionResult = await findProfessionByName(request.company.profession)
        setProfessionExists(professionResult.found)
      } else {
        setProfessionExists(false)
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d\'existence:', error)
      setCompanyExists(false)
      setProfessionExists(false)
    } finally {
      setIsCheckingExistence(false)
    }
  }, [request.company?.companyName, request.company?.profession])

  React.useEffect(() => {
    if (confirmationAction.isOpen && confirmationAction.type === 'approve') {
      setCompanyName(request.company?.companyName || '')
      setProfessionName(request.company?.profession || '')
      checkExistenceInFirestore()
    }
  }, [confirmationAction.isOpen, confirmationAction.type, request.company?.companyName, request.company?.profession, checkExistenceInFirestore])

  const openConfirmation = (type: 'approve' | 'reject' | 'under_review' | 'pending') => {
    setConfirmationAction({ type, isOpen: true })
  }

  const closeConfirmation = () => {
    setConfirmationAction({ type: null, isOpen: false })
    setMembershipType('')
    setCompanyName('')
    setProfessionName('')
    setCorrectionsList('')
  }

  const confirmAction = async () => {
    if (!confirmationAction.type) return

    if (confirmationAction.type === 'approve' && !membershipType) {
      toast.error('⚠️ Type de membre requis', {
        description: 'Veuillez sélectionner un type de membre (Adhérant, Bienfaiteur ou Sympathisant) avant d\'approuver.',
        duration: 4000,
      })
      return
    }

    if (confirmationAction.type === 'approve') {
      await handleApprove()
    } else if (confirmationAction.type === 'under_review') {
      if (correctionsList.trim()) {
        await updateStatusMutation.mutateAsync({
          requestId: request.id!,
          newStatus: 'under_review',
          reviewedBy: user?.uid || 'unknown-admin',
          reviewNote: correctionsList.trim()
        })

        toast.warning('Corrections demandées', {
          description: `Des corrections ont été demandées pour la demande de ${getIdentityDisplayName(request)}.`,
          duration: 4000,
        })
      } else {
        await updateStatusMutation.mutateAsync({
          requestId: request.id!,
          newStatus: 'under_review',
          reviewedBy: user?.uid || 'unknown-admin',
          reviewNote: undefined
        })

        toast.warning('⏳ Demande mise en examen', {
          description: `La demande de ${getIdentityDisplayName(request)} est maintenant en cours d'examen.`,
          duration: 4000,
        })
      }
    } else if (confirmationAction.type === 'pending') {
      await updateStatusMutation.mutateAsync({
        requestId: request.id!,
        newStatus: 'pending',
        reviewedBy: user?.uid || 'unknown-admin',
      })
      toast.success('Dossier réouvert', {
        description: `Le dossier de ${getIdentityDisplayName(request)} est repassé en attente.`,
        duration: 4000,
      })
    } else {
      const status = confirmationAction.type === 'reject' ? 'rejected' : 'under_review'

      await updateStatusMutation.mutateAsync({
        requestId: request.id!,
        newStatus: status,
        reviewedBy: user?.uid || 'unknown-admin',
        reviewNote: correctionsList.trim() || undefined,
        motifReject: confirmationAction.type === 'reject' ? rejectReason.trim() : undefined,
      })

      if (confirmationAction.type === 'reject') {
        toast.error('🚫 Demande rejetée avec succès', {
          description: `La demande de ${getIdentityDisplayName(request)} a été rejetée.`,
          duration: 4000,
        })
      }
    }

    closeConfirmation()
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      // Upload PDF si fourni
      let adhesionPdfURL: string | undefined = undefined
      let adhesionPdfMeta: { url: string; path: string; size: number } | null = null
      if (approvalPdfFile) {
        try {
          const start = new Date()
          const end = new Date()
          end.setFullYear(end.getFullYear() + 1)
          const safe = (s: string) => (s || '').trim().replace(/\s+/g, '_').replace(/[^\w\-.]/g, '')
          const first = safe(request.identity.firstName)
          const last = safe(request.identity.lastName)
          const fileName = `${first}_${last}_${start.getFullYear()}-${end.getFullYear()}.pdf`
          const namedPdf = new File([approvalPdfFile], fileName, { type: approvalPdfFile.type })
          const { createFile } = await import('@/db/upload-image.db')
          const res = await createFile(namedPdf, request.id!, 'membership-adhesion-pdfs')
          adhesionPdfURL = res.url
          adhesionPdfMeta = {
            url: res.url,
            path: res.path,
            size: namedPdf.size,
          }
        } catch (e) {
          console.warn('Erreur upload PDF adhésion:', e)
        }
      }

      const response = await fetch('/api/create-firebase-user-email-pwd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          adminId: user?.uid,
          membershipType: membershipType,
          companyName: companyName.trim() || undefined,
          professionName: professionName.trim() || undefined,
          adhesionPdfURL,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const memberMatricule: string | undefined = data.matricule || request.matricule
        if (adhesionPdfMeta && user?.uid && memberMatricule) {
          try {
            const documentRepository = new DocumentRepository()
            await documentRepository.createDocument({
              type: 'ADHESION',
              format: 'pdf',
              libelle: `Fiche d'adhésion - ${memberMatricule}`,
              path: adhesionPdfMeta.path,
              url: adhesionPdfMeta.url,
              size: adhesionPdfMeta.size,
              memberId: memberMatricule,
              createdBy: user.uid,
              updatedBy: user.uid,
            })
          } catch (docError) {
            console.error("Erreur lors de l'enregistrement du document d'adhésion:", docError)
            toast.warning('Document non archivé', {
              description: 'La fiche a été approuvée mais son enregistrement dans les documents a échoué.',
              duration: 5000,
            })
          }
        }

        toast.success('✅ Demande approuvée avec succès', {
          description: `${getIdentityDisplayName(request)} est maintenant membre ${membershipType}. Matricule: ${data.matricule}, Email: ${data.email}, Mot de passe: ${data.password}`,
          duration: 5000,
        })
        await queryClient.invalidateQueries({ queryKey: ['membershipRequests'] })
        await queryClient.invalidateQueries({ queryKey: ['membershipRequestsStats'] })
      } else {
        toast.error('❌ Erreur lors de l\'approbation', {
          description: data.error || 'Une erreur est survenue pendant le processus d\'approbation.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error)
      toast.error('❌ Erreur technique', {
        description: 'Une erreur technique est survenue lors de l\'approbation de la demande.',
        duration: 5000,
      })
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* En-tête avec photo, nom et statut */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {/* Photo du demandeur avec effet hover */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#234D65] to-[#2c5a73] flex-shrink-0 ring-4 ring-white shadow-lg group-hover:ring-[#CBB171]/30 transition-all duration-300">
                {request.identity.photoURL ? (
                  <Image
                    src={request.identity.photoURL}
                    alt={`Photo de ${request.identity.firstName} ${request.identity.lastName}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#234D65] to-[#2c5a73]">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {/* Informations du demandeur */}
              <div className="space-y-1 hidden md:block">
                <h3 className="font-bold text-xl text-gray-900 transition-colors duration-300 group-hover:text-[#234D65]">
                  {request.identity.firstName} {request.identity.lastName}
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  {getNationalityName(request.identity.nationality)} • {request.identity.civility}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-3 max-w-full">
              <div className="max-w-full">{getStatusBadge(request.status)}</div>
              {request.isPaid ? (
                <Badge className="bg-green-100 text-green-700 border-green-200">Payé</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-200">Non payé</Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110 self-start">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-xl border-0 bg-white">
                  <DropdownMenuItem
                    onClick={() => router.push(routes.admin.membershipRequestDetails(request.id!))}
                    className="flex items-center space-x-3 py-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Voir les détails</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDetailsModal(true)}
                    className="flex items-center space-x-3 py-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>Fiche d'adhésion</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowIdentityModal(true)}
                    className="flex items-center space-x-3 py-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <IdCard className="w-4 h-4 text-purple-600" />
                    <span>Voir la pièce d'identité</span>
                  </DropdownMenuItem>
                  {!request.isPaid && request.status === 'pending' && (
                    <DropdownMenuItem
                      onClick={() => setPaymentOpen(true)}
                      className="flex items-center space-x-3 py-3 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Payer</span>
                    </DropdownMenuItem>
                  )}
                  {request.status === 'rejected' && (
                    <DropdownMenuItem
                      onClick={() => openConfirmation('pending')}
                      className="flex items-center space-x-3 py-3 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      <span>Réouvrir le dossier</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Nom et informations du demandeur - mobile */}
          <div className="space-y-2 md:hidden">
            <h3 className="font-bold text-lg text-gray-900 break-words">
              {request.identity.firstName} {request.identity.lastName}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              {getNationalityName(request.identity.nationality)} • {request.identity.civility}
            </p>
          </div>

          {/* Informations principales avec icônes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contact */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <Mail className="w-5 h-5 text-blue-600 group-hover/info:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium truncate">{request.identity.email || 'Pas d\'email'}</span>
            </div>

            {/* Téléphone */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <Phone className="w-5 h-5 text-green-600 group-hover/info:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium">{request.identity.contacts[0] || 'Pas de téléphone'}</span>
            </div>

            {/* Adresse */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <MapPin className="w-5 h-5 text-red-600 group-hover/info:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium truncate">
                {request.address.city}, {request.address.province}
              </span>
            </div>

            {/* Date de création */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <Calendar className="w-5 h-5 text-purple-600 group-hover/info:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium">{formatDate(request.createdAt)}</span>
            </div>

            {/* Âge */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <User className="w-5 h-5 text-indigo-600 group-hover/info:scale-110 transition-transform duration-300" />
              <span className="text-sm font-medium">
                {request.identity.birthDate
                  ? `${new Date().getFullYear() - new Date(request.identity.birthDate).getFullYear()} ans`
                  : 'Âge non défini'
                }
              </span>
            </div>

            {/* Véhicule avec icône Lucide */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-300 group/info">
              <CarFront className={`w-5 h-5 ${request.identity.hasCar ? 'text-teal-600' : 'text-gray-400'} group-hover/info:scale-110 transition-transform duration-300`} />
              <span className={`text-sm font-medium ${request.identity.hasCar ? 'text-gray-900' : 'text-gray-500'}`}>
                {request.identity.hasCar ? 'Possède une voiture' : 'Pas de voiture'}
              </span>
            </div>
          </div>

          {/* Actions rapides avec animations */}
          {request.status === 'pending' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => openConfirmation('approve')}
                disabled={isApproving || !request.isPaid}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isApproving ? 'Approbation...' : 'Approuver'}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => openConfirmation('reject')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => openConfirmation('under_review')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Demander corrections
              </Button>
            </div>
          )}

          {request.status === 'under_review' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => openConfirmation('reject')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </div>
          )}

          {/* Message de correction pour les demandes under_review */}
          {request.status === 'under_review' && (
            <div className="pt-4 border-t border-orange-200">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 md:p-4 shadow-sm overflow-hidden">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3 flex-1 min-w-0">
                    <p className="text-sm font-bold text-orange-800 break-words">
                      {request.reviewNote ? 'Corrections demandées' : 'Demande en cours d\'examen'}
                    </p>
                    <p className="text-sm text-orange-700 break-words">
                      {request.reviewNote 
                        ? 'Des corrections ont été demandées. Envoyez le lien ci-dessous au demandeur pour les modifications.'
                        : 'Cette demande est en cours d\'examen. Vous pouvez partager le lien pour suivi.'
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        value={`${window.location.origin}/register?requestId=${request.id}`}
                        readOnly
                        className="text-xs font-mono bg-white border-orange-300 focus:border-orange-500 flex-1 min-w-0"
                      />
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/register?requestId=${request.id}`)
                          toast.success('Lien copié !', {
                            description: 'Le lien de correction a été copié dans le presse-papiers.',
                            duration: 3000,
                          })
                        }}
                      >
                        <Copy className="w-4 h-4 sm:hidden" />
                        <span className="hidden sm:inline">Copier</span>
                      </Button>
                    </div>
                    
                    {/* Code de sécurité */}
                    {request.reviewNote && request.securityCode && (
                      <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg overflow-hidden">
                        <p className="text-xs font-medium text-orange-800 mb-2 break-words">
                          🔐 Code de sécurité à envoyer au demandeur :
                          {request.securityCodeUsed && (
                            <span className="ml-2 text-red-600 font-bold block sm:inline">
                              ⚠️ CODE DÉJÀ UTILISÉ
                            </span>
                          )}
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            value={request.securityCode}
                            readOnly
                            className={`text-sm font-mono font-bold text-center flex-1 min-w-0 ${
                              request.securityCodeUsed 
                                ? 'bg-gray-100 border-gray-400 text-gray-500' 
                                : 'bg-white border-orange-400'
                            }`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className={`shrink-0 ${
                              request.securityCodeUsed
                                ? 'text-gray-500 border-gray-400 cursor-not-allowed'
                                : 'text-orange-700 border-orange-400 hover:bg-orange-200'
                            }`}
                            onClick={() => {
                              if (!request.securityCodeUsed) {
                                navigator.clipboard.writeText(request.securityCode!)
                                toast.success('Code copié !', {
                                  description: 'Le code de sécurité a été copié dans le presse-papiers.',
                                  duration: 3000,
                                })
                              }
                            }}
                            disabled={request.securityCodeUsed}
                          >
                            {request.securityCodeUsed ? (
                              <span className="hidden sm:inline">Utilisé</span>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 sm:hidden" />
                                <span className="hidden sm:inline">Copier</span>
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-400 hover:bg-blue-200 shrink-0"
                            onClick={() => renewSecurityCodeMutation.mutate(request.id!)}
                            disabled={renewSecurityCodeMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 sm:mr-1 ${renewSecurityCodeMutation.isPending ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Renouveler</span>
                          </Button>
                        </div>
                        
                        {/* Expiration */}
                        {request.securityCodeExpiry && (
                          <div className="mt-2 text-xs">
                            {(() => {
                              const expiry = (request.securityCodeExpiry as any).toDate ? (request.securityCodeExpiry as any).toDate() : new Date(request.securityCodeExpiry);
                              const now = new Date();
                              const isExpired = expiry < now;
                              const timeLeft = expiry.getTime() - now.getTime();
                              const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                              const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                              
                              return (
                                <div className={`flex items-center space-x-1 flex-wrap ${isExpired ? 'text-red-600' : 'text-orange-700'}`}>
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span className="break-words">
                                    {isExpired 
                                      ? 'Code expiré' 
                                      : `Expire dans ${hoursLeft}h ${minutesLeft}m`
                                    }
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        <p className="text-xs text-orange-700 mt-2 break-words">
                          ⚠️ Le demandeur devra saisir ce code pour accéder à ses corrections
                          {request.securityCodeUsed && (
                            <span className="block mt-1 text-red-600 font-medium break-words">
                              🔒 Ce code a été utilisé et ne peut plus être utilisé pour accéder aux corrections
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modals */}
      <MemberDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={request}
      />

      <MemberIdentityModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        request={request}
      />

      {/* Modal Paiement */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Renseigner le paiement</DialogTitle>
            <DialogDescription className="text-gray-600">Veuillez saisir les informations de paiement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type de paiement</label>
              <Select value={paymentType} onValueChange={(val) => setPaymentType(val as any)} disabled={isPaying}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Type de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Membership">Adhésion</SelectItem>
                  <SelectItem value="Subscription">Abonnement</SelectItem>
                  <SelectItem value="Tontine">Caisse Spéciale</SelectItem>
                  <SelectItem value="Charity">Charité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de paiement</label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10" disabled={isPaying} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Heure de paiement</label>
              <Input type="time" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} className="h-10" disabled={isPaying} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
              <Select value={paymentMode || undefined} onValueChange={(val) => setPaymentMode(val as any)} disabled={isPaying}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choisir un mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="mobicash">Mobicash</SelectItem>
                  <SelectItem value="cash">Espèce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Frais</label>
              <Select value={withFees || undefined} onValueChange={(val) => setWithFees(val as any)} disabled={isPaying}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Avec ou sans frais?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Avec frais</SelectItem>
                  <SelectItem value="no">Sans frais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Montant</label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Ex: 10000" className="h-10" disabled={isPaying} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={isPaying}>Annuler</Button>
            <Button
              disabled={isPaying}
              onClick={async () => {
                if (!paymentDate || !paymentTime || !paymentMode || !paymentAmount || !paymentType || !withFees) {
                  toast.error('Champs requis', { description: 'Veuillez remplir tous les champs de paiement.' })
                  return
                }
                try {
                  setIsPaying(true)
                  await payMutation.mutateAsync({
                    requestId: request.id!,
                    payment: {
                      date: new Date(`${paymentDate}T${paymentTime}:00`),
                      mode: paymentMode,
                      amount: Number(paymentAmount),
                      acceptedBy: user?.uid || 'unknown-admin',
                      paymentType,
                      time: paymentTime,
                      withFees: withFees === 'yes',
                    },
                  })
                  toast.success('Paiement enregistré')
                  setPaymentOpen(false)
                } catch (e: any) {
                  toast.error('Erreur de paiement')
                } finally {
                  setIsPaying(false)
                }
              }}
            >
              {isPaying ? (
                <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Paiement...</span>
              ) : (
                'Valider'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmation avec design amélioré */}
      <Dialog open={confirmationAction.isOpen} onOpenChange={closeConfirmation}>
        <DialogContent className="sm:max-w-md shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {confirmationAction.type === 'approve' && '✅ Confirmer l\'approbation'}
              {confirmationAction.type === 'reject' && '❌ Confirmer le rejet'}
              {confirmationAction.type === 'under_review' && '⚠️ Demander des corrections'}
              {confirmationAction.type === 'pending' && '♻️ Réouvrir le dossier'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {confirmationAction.type === 'approve' &&
                `Approuver la demande de ${request.identity.firstName} ${request.identity.lastName} ? Un compte utilisateur sera créé.`
              }
              {confirmationAction.type === 'reject' &&
                `Rejeter définitivement la demande de ${request.identity.firstName} ${request.identity.lastName} ?`
              }
              {confirmationAction.type === 'under_review' &&
                `Précisez les corrections nécessaires pour ${request.identity.firstName} ${request.identity.lastName}.`
              }
              {confirmationAction.type === 'pending' &&
                `Voulez-vous réouvrir ce dossier et le remettre en attente ?`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Contenu spécifique selon le type */}
          {confirmationAction.type === 'approve' && (
            <div className="py-4 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#234D65]">
                  Téléverser la fiche d'adhésion (PDF)
                </label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setApprovalPdfFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-3 block text-[#234D65]">
                  Type de membre <span className="text-red-500">*</span>
                </label>
                <Select value={membershipType} onValueChange={setMembershipType}>
                  <SelectTrigger className="w-full h-12 border-2 focus:border-[#234D65]">
                    <SelectValue placeholder="Sélectionnez un type de membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adherant">Adhérant</SelectItem>
                    <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                    <SelectItem value="sympathisant">Sympathisant</SelectItem>
                  </SelectContent>
                </Select>
                {!membershipType && (
                  <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Le type de membre est obligatoire pour l'approbation
                  </p>
                )}
              </div>

              {request.company.isEmployed && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#234D65] border-b border-[#CBB171]/30 pb-2">
                    Informations professionnelles
                  </h4>
                  
                  {/* Entreprise */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[#234D65] flex items-center gap-2">
                      Nom de l'entreprise
                      {isCheckingExistence && (
                        <Loader2 className="w-3 h-3 animate-spin text-[#CBB171]" />
                      )}
                      {companyExists && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          ✓ Existe déjà
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={request.company?.companyName || "Nom de l'entreprise"}
                        className={cn(
                          "pl-10 h-12 border-2 focus:border-[#234D65]",
                          companyExists && "bg-gray-100 text-gray-500 cursor-not-allowed"
                        )}
                        disabled={companyExists}
                      />
                    </div>
                    {request.company?.companyName && !companyName && !companyExists && !isCheckingExistence && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompanyName(request.company.companyName || '')}
                        className="text-xs border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10"
                      >
                        Utiliser: {request.company.companyName}
                      </Button>
                    )}
                  </div>

                  {/* Profession */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[#234D65] flex items-center gap-2">
                      Profession
                      {professionExists && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          ✓ Existe déjà
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                      <Input
                        value={professionName}
                        onChange={(e) => setProfessionName(e.target.value)}
                        placeholder={request.company?.profession || "Profession"}
                        className={cn(
                          "pl-10 h-12 border-2 focus:border-[#234D65]",
                          professionExists && "bg-gray-100 text-gray-500 cursor-not-allowed"
                        )}
                        disabled={professionExists}
                      />
                    </div>
                    {request.company?.profession && !professionName && !professionExists && !isCheckingExistence && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setProfessionName(request.company.profession || '')}
                        className="text-xs border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10"
                      >
                        Utiliser: {request.company.profession}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {confirmationAction.type === 'under_review' && (
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-bold text-[#234D65]">
                  Corrections à apporter <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctionsList}
                  onChange={(e) => setCorrectionsList(e.target.value)}
                  placeholder="Détaillez les corrections nécessaires...&#10;&#10;Exemples :&#10;• Photo trop floue, veuillez fournir une photo plus nette&#10;• Document d'identité manquant&#10;• Adresse incomplète&#10;• Numéro de téléphone incorrect"
                  className="w-full min-h-[120px] p-4 border-2 border-gray-200 focus:border-[#234D65] rounded-xl resize-none"
                  required
                />
                {!correctionsList.trim() && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Veuillez préciser les corrections demandées
                  </p>
                )}
              </div>
            </div>
          )}

          {confirmationAction.type === 'reject' && (
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-bold text-red-700">
                  Motif du rejet <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Expliquez précisément la cause du rejet..."
                  className="w-full min-h-[120px] p-4 border-2 border-red-200 focus:border-red-400 rounded-xl resize-none"
                  required
                />
                {!rejectReason.trim() && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Le motif du rejet est obligatoire
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={closeConfirmation}
              className="h-12 px-6 border-2"
              disabled={isApproving || updateStatusMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              disabled={
                isApproving ||
                updateStatusMutation.isPending ||
                (confirmationAction.type === 'approve' && (!membershipType || !approvalPdfFile)) ||
                (confirmationAction.type === 'under_review' && !correctionsList.trim()) ||
                (confirmationAction.type === 'reject' && !rejectReason.trim())
              }
              className={cn(
                "h-12 px-6 text-white border-0 font-medium shadow-lg hover:shadow-xl transition-all duration-300",
                confirmationAction.type === 'approve' && 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700',
                confirmationAction.type === 'reject' && 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
                confirmationAction.type === 'under_review' && 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
                confirmationAction.type === 'pending' && 'bg-[#234D65] hover:bg-[#234D65]'
              )}
            >
              {confirmationAction.type === 'approve' && (isApproving ? 'Approbation...' : 'Confirmer l\'approbation')}
              {confirmationAction.type === 'reject' && (updateStatusMutation.isPending ? 'Traitement...' : 'Confirmer le rejet')}
              {confirmationAction.type === 'under_review' && (updateStatusMutation.isPending ? 'Traitement...' : 'Envoyer les corrections')}
              {confirmationAction.type === 'pending' && (updateStatusMutation.isPending ? 'Réouverture...' : 'Réouvrir le dossier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Composant principal
export default function MembershipRequestsList() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<MembershipRequestFilters>({
    status: 'all',
    searchQuery: '',
    page: 1,
    limit: 10
  })

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'under_review' | 'paid' | 'unpaid'
  >('all')

  const {
    data: membershipData,
    isLoading,
    isError,
    error
  } = useMembershipRequests({
    page: filters.page,
    limit: filters.limit,
    status: filters.status,
    searchQuery: filters.searchQuery
  })

  const updateStatusMutation = useUpdateMembershipRequestStatus()

  const handleStatusUpdate = (requestId: string, newStatus: MembershipRequestStatus) => {
    updateStatusMutation.mutate({
      requestId,
      newStatus,
      reviewedBy: user?.uid || 'unknown-admin',
    })
  }

  const handleFilterChange = (key: keyof MembershipRequestFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }))
  }

  const handleSearch = (searchQuery: string) => {
    handleFilterChange('searchQuery', searchQuery)
  }

  const handleTabChange = (
    tab: 'all' | 'pending' | 'approved' | 'rejected' | 'under_review' | 'paid' | 'unpaid'
  ) => {
    setActiveTab(tab)

    // Les onglets basés sur le statut pilotent directement le filtre status
    if (tab === 'pending' || tab === 'approved' || tab === 'rejected' || tab === 'under_review') {
      handleFilterChange('status', tab)
    } else {
      // Pour les onglets payées / non payées (ou toutes), on récupère tous les statuts
      handleFilterChange('status', 'all')
    }
  }

  // Fonctions de test (en développement uniquement)
  const handleCreateTestRequestPending = async () => {
    try {
      toast.info('📝 Création d\'une demande en attente...', { duration: 2000 })
      await createTestMembershipRequestPending()
      toast.success('✅ Demande en attente créée avec succès')
      // Recharger les données
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateTestRequestPendingUnpaid = async () => {
    try {
      toast.info('💰 Création d\'une demande en attente non payée...', { duration: 2000 })
      await createTestMembershipRequestPendingUnpaid()
      toast.success('✅ Demande en attente non payée créée avec succès')
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateTestRequestUnderReview = async () => {
    try {
      toast.info('🔍 Création d\'une demande en cours d\'examen...', { duration: 2000 })
      await createTestMembershipRequestUnderReview()
      toast.success('✅ Demande en cours d\'examen créée avec succès')
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateTestRequestRejected = async () => {
    try {
      toast.info('❌ Création d\'une demande rejetée...', { duration: 2000 })
      await createTestMembershipRequestRejected()
      toast.success('✅ Demande rejetée créée avec succès')
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateTestRequestApproved = async () => {
    try {
      toast.info('✅ Création d\'une demande approuvée...', { duration: 2000 })
      await createTestMembershipRequestApproved()
      toast.success('✅ Demande approuvée créée avec succès')
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  const handleCreateTestRequestWithFilters = async () => {
    try {
      toast.info('🔍 Création d\'une demande avec données de filtres...', { duration: 2000 })
      await createTestMembershipRequestWithFilters()
      toast.success('✅ Demande avec filtres créée avec succès')
      window.location.reload()
    } catch (error) {
      toast.error('❌ Erreur lors de la création')
    }
  }

  // Calcul des statistiques globales (indépendantes des onglets)
  const stats = React.useMemo(() => {
    if (!membershipData) return null
    
    const total = membershipData.pagination.totalItems
    const pending = membershipData.data.filter(r => r.status === 'pending').length
    const approved = membershipData.data.filter(r => r.status === 'approved').length
    const rejected = membershipData.data.filter(r => r.status === 'rejected').length
    const underReview = membershipData.data.filter(r => r.status === 'under_review').length
    
    return {
      total,
      pending,
      approved,
      rejected,
      underReview,
      pendingPercentage: total > 0 ? (pending / total) * 100 : 0,
      approvedPercentage: total > 0 ? (approved / total) * 100 : 0,
      rejectedPercentage: total > 0 ? (rejected / total) * 100 : 0,
      underReviewPercentage: total > 0 ? (underReview / total) * 100 : 0,
    }
  }, [membershipData])

  // Données affichées selon l'onglet actif (notamment pour payé / non payé)
  const displayedRequests = React.useMemo(() => {
    if (!membershipData) return []

    let data = membershipData.data

    if (activeTab === 'paid') {
      data = data.filter((r) => r.isPaid)
    } else if (activeTab === 'unpaid') {
      data = data.filter((r) => !r.isPaid)
    }

    return data
  }, [membershipData, activeTab])

  if (isError) {
    return (
      <Card className="shadow-xl border-0">
        <CardContent className="p-12 text-center">
          <div className="text-red-600">
            <FileX className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
            <p className="text-gray-600">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500 p-6">
      {/* En-tête avec gradient */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Demandes d'Adhésion
        </h1>
        <p className="text-gray-600 text-lg">
          Gérez efficacement les demandes d'adhésion de votre organisation
        </p>
      </div>

      {/* Onglets de filtrage rapide */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as any)}>
        <TabsList className="bg-white shadow-sm border border-gray-200/80 rounded-full px-1 py-1 flex flex-wrap gap-1">
          <TabsTrigger value="all" className="px-4 py-2 rounded-full">
            Toutes
          </TabsTrigger>
          <TabsTrigger value="pending" className="px-4 py-2 rounded-full">
            En attente
          </TabsTrigger>
          <TabsTrigger value="under_review" className="px-4 py-2 rounded-full">
            En cours d'examen
          </TabsTrigger>
          <TabsTrigger value="approved" className="px-4 py-2 rounded-full">
            Approuvées
          </TabsTrigger>
          <TabsTrigger value="rejected" className="px-4 py-2 rounded-full">
            Refusées
          </TabsTrigger>
          <TabsTrigger value="paid" className="px-4 py-2 rounded-full">
            Payées
          </TabsTrigger>
          <TabsTrigger value="unpaid" className="px-4 py-2 rounded-full">
            Non payées
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistiques avec nouveau carousel */}
      {stats && <StatsCarousel stats={stats} />}

      {/* Boutons de test modernisés */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mr-4">
                <div className="p-2 rounded-lg bg-amber-200">
                  <Zap className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-bold text-amber-800">🧪 Outils de Test - Demandes d'Adhésion</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestPending}
                className="bg-white border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Demande En Attente
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestPendingUnpaid}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Demande Non Payée
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestUnderReview}
                className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Demande En Examen
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestRejected}
                className="bg-white border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Demande Rejetée
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestApproved}
                className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Demande Approuvée
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestRequestWithFilters}
                className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300 hover:scale-105 shadow-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Demande + Filtres
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres et recherche avec design moderne */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-white to-gray-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#234D65] transition-colors duration-300" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={filters.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-[#234D65] bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Filtre par statut */}
            <div className="w-full md:w-64">
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#234D65] bg-white shadow-sm">
                  <Filter className="w-5 h-5 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent className="shadow-xl border-0">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="under_review">En cours d'examen</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="rejected">Rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <MembershipRequestSkeleton key={index} />
          ))
        ) : displayedRequests.length === 0 ? (
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-16 text-center">
              <div className="text-gray-500">
                <Users className="w-20 h-20 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-bold mb-3 text-gray-700">Aucune demande trouvée</h3>
                <p className="text-lg">Aucune demande d'adhésion ne correspond à vos critères de recherche.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          displayedRequests.map((request: MembershipRequest) => (
            <MembershipRequestCard
              key={request.id}
              request={request}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}
      </div>

      {/* Pagination moderne */}
      {membershipData && membershipData.pagination.totalPages > 1 && (
        <Card className="shadow-lg border-0 bg-gradient-to-r from-white to-gray-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">
                Page {membershipData.pagination.currentPage} sur {membershipData.pagination.totalPages}
                <span className="mx-2">•</span>
                {membershipData.pagination.totalItems} résultats
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!membershipData.pagination.hasPrevPage}
                  onClick={() => handleFilterChange('page', membershipData.pagination.currentPage - 1)}
                  className="h-10 px-4 border-2 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!membershipData.pagination.hasNextPage}
                  onClick={() => handleFilterChange('page', membershipData.pagination.currentPage + 1)}
                  className="h-10 px-4 border-2 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}