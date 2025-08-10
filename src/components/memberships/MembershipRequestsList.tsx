'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, User, Calendar, Mail, Phone, MapPin, FileText, IdCard, Building2, Briefcase, AlertCircle, RefreshCw, Loader2, Car, CarFront, TrendingUp, Users, UserCheck, UserX, FileX } from 'lucide-react'
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
import { useMembershipRequests, useUpdateMembershipRequestStatus, useRenewSecurityCode, type MembershipRequestFilters } from '@/hooks/useMembershipRequests'
import type { MembershipRequest, MembershipRequestStatus } from '@/types/types'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'
import { toast } from 'sonner'
import MemberDetailsModal from './MemberDetailsModal'
import MemberIdentityModal from './MemberIdentityModal'
import { useAuth } from '@/hooks/useAuth'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'
import { findCompanyByName } from '@/db/company.db'
import { findProfessionByName } from '@/db/profession.db'
import { cn } from '@/lib/utils'

// Couleurs pour les graphiques
const COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  under_review: '#3b82f6'
}

// Fonction utilitaire pour obtenir le badge de statut avec animations
const getStatusBadge = (status: MembershipRequestStatus) => {
  const baseClasses = "transition-all duration-300 hover:scale-105 flex items-center gap-1.5 font-medium"
  
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
    type: 'approve' | 'reject' | 'under_review' | null
    isOpen: boolean
  }>({ type: null, isOpen: false })
  const [membershipType, setMembershipType] = React.useState<string>('')
  const [companyName, setCompanyName] = React.useState<string>('')
  const [professionName, setProfessionName] = React.useState<string>('')
  const [correctionsList, setCorrectionsList] = React.useState<string>('')
  
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

  const openConfirmation = (type: 'approve' | 'reject' | 'under_review') => {
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
        updateStatusMutation.mutate({
          requestId: request.id!,
          newStatus: 'under_review',
          reviewedBy: user?.uid || 'unknown-admin',
          reviewNote: correctionsList.trim()
        })

        toast.warning('Corrections demandées', {
          description: `Des corrections ont été demandées pour la demande de ${request.identity.firstName} ${request.identity.lastName}.`,
          duration: 4000,
        })
      } else {
        updateStatusMutation.mutate({
          requestId: request.id!,
          newStatus: 'under_review',
          reviewedBy: user?.uid || 'unknown-admin',
          reviewNote: undefined
        })

        toast.warning('⏳ Demande mise en examen', {
          description: `La demande de ${request.identity.firstName} ${request.identity.lastName} est maintenant en cours d'examen.`,
          duration: 4000,
        })
      }
    } else {
      const status = confirmationAction.type === 'reject' ? 'rejected' : 'under_review'

      updateStatusMutation.mutate({
        requestId: request.id!,
        newStatus: status,
        reviewedBy: user?.uid || 'unknown-admin',
        reviewNote: correctionsList.trim() || undefined
      })

      if (confirmationAction.type === 'reject') {
        toast.error('🚫 Demande rejetée avec succès', {
          description: `La demande de ${request.identity.firstName} ${request.identity.lastName} a été rejetée.`,
          duration: 4000,
        })
      }
    }

    closeConfirmation()
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const phoneNumber = request.identity.contacts[0]

      if (!phoneNumber) {
        toast.error('📞 Numéro de téléphone manquant', {
          description: 'Impossible de créer le compte utilisateur : aucun numéro de téléphone trouvé pour ce demandeur.',
          duration: 4000,
        })
        return
      }

      const response = await fetch('/api/create-firebase-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          requestId: request.id,
          adminId: user?.uid,
          membershipType: membershipType,
          companyName: companyName.trim() || undefined,
          professionName: professionName.trim() || undefined
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('✅ Demande approuvée avec succès', {
          description: `${request.identity.firstName} ${request.identity.lastName} est maintenant membre ${membershipType}. Matricule: ${data.matricule}`,
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
                  {request.identity.nationality} • {request.identity.civility}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {getStatusBadge(request.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110">
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
              {request.identity.nationality} • {request.identity.civility}
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
                disabled={isApproving}
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

          {/* Message de correction pour les demandes under_review */}
          {request.status === 'under_review' && (
            <div className="pt-4 border-t border-orange-200">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3 flex-1">
                    <p className="text-sm font-bold text-orange-800">
                      {request.reviewNote ? 'Corrections demandées' : 'Demande en cours d\'examen'}
                    </p>
                    <p className="text-sm text-orange-700">
                      {request.reviewNote 
                        ? 'Des corrections ont été demandées. Envoyez le lien ci-dessous au demandeur pour les modifications.'
                        : 'Cette demande est en cours d\'examen. Vous pouvez partager le lien pour suivi.'
                      }
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={`${window.location.origin}/register?requestId=${request.id}`}
                        readOnly
                        className="text-xs font-mono bg-white border-orange-300 focus:border-orange-500"
                      />
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/register?requestId=${request.id}`)
                          toast.success('Lien copié !', {
                            description: 'Le lien de correction a été copié dans le presse-papiers.',
                            duration: 3000,
                          })
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                    
                    {/* Code de sécurité */}
                    {request.reviewNote && request.securityCode && (
                      <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                        <p className="text-xs font-medium text-orange-800 mb-2">
                          🔐 Code de sécurité à envoyer au demandeur :
                          {request.securityCodeUsed && (
                            <span className="ml-2 text-red-600 font-bold">
                              ⚠️ CODE DÉJÀ UTILISÉ
                            </span>
                          )}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={request.securityCode}
                            readOnly
                            className={`text-sm font-mono font-bold text-center ${
                              request.securityCodeUsed 
                                ? 'bg-gray-100 border-gray-400 text-gray-500' 
                                : 'bg-white border-orange-400'
                            }`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${
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
                            {request.securityCodeUsed ? 'Utilisé' : 'Copier'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-400 hover:bg-blue-200"
                            onClick={() => renewSecurityCodeMutation.mutate(request.id!)}
                            disabled={renewSecurityCodeMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${renewSecurityCodeMutation.isPending ? 'animate-spin' : ''}`} />
                            Renouveler
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
                                <div className={`flex items-center space-x-1 ${isExpired ? 'text-red-600' : 'text-orange-700'}`}>
                                  <Clock className="w-3 h-3" />
                                  <span>
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
                        
                        <p className="text-xs text-orange-700 mt-2">
                          ⚠️ Le demandeur devra saisir ce code pour accéder à ses corrections
                          {request.securityCodeUsed && (
                            <span className="block mt-1 text-red-600 font-medium">
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

      {/* Modal de confirmation avec design amélioré */}
      <Dialog open={confirmationAction.isOpen} onOpenChange={closeConfirmation}>
        <DialogContent className="sm:max-w-md shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {confirmationAction.type === 'approve' && '✅ Confirmer l\'approbation'}
              {confirmationAction.type === 'reject' && '❌ Confirmer le rejet'}
              {confirmationAction.type === 'under_review' && '⚠️ Demander des corrections'}
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
            </DialogDescription>
          </DialogHeader>

          {/* Contenu spécifique selon le type */}
          {confirmationAction.type === 'approve' && (
            <div className="py-4 space-y-6">
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

          <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={closeConfirmation}
              className="h-12 px-6 border-2"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              disabled={
                isApproving ||
                (confirmationAction.type === 'approve' && !membershipType) ||
                (confirmationAction.type === 'under_review' && !correctionsList.trim())
              }
              className={cn(
                "h-12 px-6 text-white border-0 font-medium shadow-lg hover:shadow-xl transition-all duration-300",
                confirmationAction.type === 'approve' && 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700',
                confirmationAction.type === 'reject' && 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
                confirmationAction.type === 'under_review' && 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
              )}
            >
              {confirmationAction.type === 'approve' && (isApproving ? 'Approbation...' : 'Confirmer l\'approbation')}
              {confirmationAction.type === 'reject' && 'Confirmer le rejet'}
              {confirmationAction.type === 'under_review' && 'Envoyer les corrections'}
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

  // Calcul des statistiques
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
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* En-tête avec gradient */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Demandes d'Adhésion
        </h1>
        <p className="text-gray-600 text-lg">
          Gérez efficacement les demandes d'adhésion de votre organisation
        </p>
      </div>

      {/* Statistiques compactes avec graphiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total"
            value={stats.total}
            percentage={100}
            color="#6b7280"
            icon={Users}
          />
          <StatsCard
            title="En attente"
            value={stats.pending}
            percentage={stats.pendingPercentage}
            color="#f59e0b"
            icon={Clock}
            trend="up"
          />
          <StatsCard
            title="Approuvées"
            value={stats.approved}
            percentage={stats.approvedPercentage}
            color="#10b981"
            icon={UserCheck}
            trend="up"
          />
          <StatsCard
            title="En cours"
            value={stats.underReview}
            percentage={stats.underReviewPercentage}
            color="#3b82f6"
            icon={Eye}
          />
        </div>
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
        ) : membershipData?.data.length === 0 ? (
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
          membershipData?.data.map((request: MembershipRequest) => (
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