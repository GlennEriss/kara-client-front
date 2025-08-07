'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, User, Calendar, Mail, Phone, MapPin, FileText, IdCard, Building2, Briefcase, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
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

// Fonction utilitaire pour obtenir le badge de statut
const getStatusBadge = (status: MembershipRequestStatus) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          {MEMBERSHIP_STATUS_LABELS.pending}
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {MEMBERSHIP_STATUS_LABELS.approved}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {MEMBERSHIP_STATUS_LABELS.rejected}
        </Badge>
      )
    case 'under_review':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Eye className="w-3 h-3 mr-1" />
          {MEMBERSHIP_STATUS_LABELS.under_review}
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Fonction utilitaire pour formater la date
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Non définie'

  try {
    // Si c'est un Timestamp Firebase
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // Si c'est une Date normale
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // Si c'est une string
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

// Composant pour le squelette de chargement
const MembershipRequestSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Composant pour une demande individuelle
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
  
  // États pour vérifier l'existence dans Firestore
  const [companyExists, setCompanyExists] = React.useState<boolean>(false)
  const [professionExists, setProfessionExists] = React.useState<boolean>(false)
  const [isCheckingExistence, setIsCheckingExistence] = React.useState<boolean>(false)
  
  const queryClient = useQueryClient()
  const updateStatusMutation = useUpdateMembershipRequestStatus()
  const renewSecurityCodeMutation = useRenewSecurityCode()

  // Vérifier si l'entreprise et la profession existent déjà dans Firestore
  const checkExistenceInFirestore = React.useCallback(async () => {
    if (!request.company?.companyName && !request.company?.profession) {
      setCompanyExists(false)
      setProfessionExists(false)
      return
    }

    setIsCheckingExistence(true)
    
    try {
      // Vérifier l'entreprise
      if (request.company?.companyName) {
        const companyResult = await findCompanyByName(request.company.companyName)
        setCompanyExists(companyResult.found)
      } else {
        setCompanyExists(false)
      }
      
      // Vérifier la profession
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

  // Initialiser les valeurs par défaut quand le dialog s'ouvre
  React.useEffect(() => {
    if (confirmationAction.isOpen && confirmationAction.type === 'approve') {
      setCompanyName(request.company?.companyName || '')
      setProfessionName(request.company?.profession || '')
      // Vérifier l'existence dans Firestore
      checkExistenceInFirestore()
    }
  }, [confirmationAction.isOpen, confirmationAction.type, request.company?.companyName, request.company?.profession, checkExistenceInFirestore])

  // Fonction pour ouvrir la confirmation
  const openConfirmation = (type: 'approve' | 'reject' | 'under_review') => {
    setConfirmationAction({ type, isOpen: true })
  }

  // Fonction pour fermer la confirmation
  const closeConfirmation = () => {
    setConfirmationAction({ type: null, isOpen: false })
    setMembershipType('') // Réinitialiser le type de membre
    setCompanyName('') // Réinitialiser le nom d'entreprise
    setProfessionName('') // Réinitialiser la profession
    setCorrectionsList('') // Réinitialiser la liste des corrections
  }

  // Fonction pour confirmer l'action
  const confirmAction = async () => {
    if (!confirmationAction.type) return

    // Validation pour l'approbation : vérifier qu'un type de membre est sélectionné
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
      // Gérer les corrections demandées
      if (correctionsList.trim()) {
        // Si des corrections sont saisies, c'est une demande de corrections
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
        // Si pas de corrections, c'est une simple mise en examen
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

              // Utiliser la mutation directement avec reviewedBy
        updateStatusMutation.mutate({
          requestId: request.id!,
          newStatus: status,
          reviewedBy: user?.uid || 'unknown-admin',
          reviewNote: correctionsList.trim() || undefined
        })

      // Toast personnalisé selon l'action
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
      const phoneNumber = request.identity.contacts[0] // Premier numéro de téléphone

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
        // Invalider toutes les queries de membership requests pour forcer le rechargement
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* En-tête avec photo, nom et statut */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {/* Photo du demandeur */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                {request.identity.photoURL ? (
                  <Image
                    src={request.identity.photoURL}
                    alt={`Photo de ${request.identity.firstName} ${request.identity.lastName}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Informations du demandeur - visible en desktop */}
              <div className="space-y-1 hidden md:block">
                <h3 className="font-semibold text-lg">
                  {request.identity.firstName} {request.identity.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.identity.nationality} • {request.identity.civility}
                </p>
              </div>
            </div>

            {/* Actions (statut et menu) */}
            <div className="flex items-center space-x-2">
              {getStatusBadge(request.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => router.push(routes.admin.membershipRequestDetails(request.id!))}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir les détails</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDetailsModal(true)}
                    className="flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Fiche d'adhésion</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowIdentityModal(true)}
                    className="flex items-center space-x-2"
                  >
                    <IdCard className="w-4 h-4" />
                    <span>Voir la pièce d'identité</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Nom et informations du demandeur - visible en mobile */}
          <div className="space-y-1 md:hidden">
            <h3 className="font-semibold text-lg break-words">
              {request.identity.firstName} {request.identity.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {request.identity.nationality} • {request.identity.civility}
            </p>
          </div>

          {/* Informations principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Contact */}
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{request.identity.email || 'Pas d\'email'}</span>
            </div>

            {/* Téléphone */}
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{request.identity.contacts[0] || 'Pas de téléphone'}</span>
            </div>

            {/* Adresse */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">
                {request.address.city}, {request.address.province}
              </span>
            </div>

            {/* Date de création */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDate(request.createdAt)}</span>
            </div>

            {/* Âge approximatif */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>
                {request.identity.birthDate
                  ? `${new Date().getFullYear() - new Date(request.identity.birthDate).getFullYear()} ans`
                  : 'Âge non défini'
                }
              </span>
            </div>

            {/* Véhicule */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">🚗</span>
              <span>{request.identity.hasCar ? 'Possède une voiture' : 'Pas de voiture'}</span>
            </div>
          </div>

          {/* Actions rapides */}
          {request.status === 'pending' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => openConfirmation('approve')}
                disabled={isApproving}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {isApproving ? 'Approbation...' : 'Approuver'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => openConfirmation('reject')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openConfirmation('under_review')}
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                Demander des corrections
              </Button>
            </div>
          )}

          {/* Message de correction pour les demandes under_review */}
          {request.status === 'under_review' && (
            <div className="pt-4 border-t border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">
                    {request.reviewNote ? 'Corrections demandées' : 'Demande en cours d\'examen'}
                  </p>
                  <p className="text-sm text-orange-700">
                    {request.reviewNote 
                      ? 'Des corrections ont été demandées pour cette demande. Veuillez copier le lien ci-dessous et l\'envoyer au demandeur pour qu\'il puisse apporter les modifications nécessaires.'
                      : 'Cette demande est actuellement en cours d\'examen. Vous pouvez copier le lien ci-dessous pour permettre au demandeur de consulter son dossier.'
                    }
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`${window.location.origin}/register?requestId=${request.id}`}
                      readOnly
                      className="text-xs font-mono bg-white border-orange-300"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-100"
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
                      
                      {/* Affichage de l'expiration */}
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

      {/* Modal de confirmation */}
      <Dialog open={confirmationAction.isOpen} onOpenChange={closeConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmationAction.type === 'approve' && 'Confirmer l\'approbation'}
              {confirmationAction.type === 'reject' && 'Confirmer le rejet'}
              {confirmationAction.type === 'under_review' && 'Demander des corrections'}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction.type === 'approve' &&
                `Êtes-vous sûr de vouloir approuver la demande de ${request.identity.firstName} ${request.identity.lastName} ? Cette action créera un compte utilisateur Firebase et ne pourra pas être annulée.`
              }
              {confirmationAction.type === 'reject' &&
                `Êtes-vous sûr de vouloir rejeter la demande de ${request.identity.firstName} ${request.identity.lastName} ? Cette action ne pourra pas être annulée.`
              }
              {confirmationAction.type === 'under_review' &&
                `Veuillez préciser les corrections à apporter pour la demande de ${request.identity.firstName} ${request.identity.lastName}.`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Sélecteur de type de membre pour l'approbation */}
          {confirmationAction.type === 'approve' && (
            <div className="py-4 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Type de membre <span className="text-red-500">*</span>
                </label>
                <Select value={membershipType} onValueChange={setMembershipType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un type de membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adherant">Adhérant</SelectItem>
                    <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                    <SelectItem value="sympathisant">Sympathisant</SelectItem>
                  </SelectContent>
                </Select>
                {!membershipType && (
                  <p className="text-sm text-red-500 mt-1">
                    Le type de membre est obligatoire pour l'approbation
                  </p>
                )}
              </div>

              {
                request.company.isEmployed && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-[#224D62] border-b border-[#CBB171]/30 pb-2">
                      Informations professionnelles
                    </h4>
                    {/* Champ Entreprise */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#224D62] flex items-center gap-2">
                        Nom de l'entreprise
                        {isCheckingExistence && (
                          <Loader2 className="w-3 h-3 animate-spin text-[#CBB171]" />
                        )}
                        {companyExists && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            ✓ Existe déjà
                          </span>
                        )}
                        {request.company?.companyName && !companyExists && !isCheckingExistence && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Valeur par défaut: {request.company.companyName})
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
                            "pl-10",
                            companyExists && "bg-gray-100 text-gray-500 cursor-not-allowed"
                          )}
                          disabled={companyExists}
                        />
                        {companyExists && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </div>
                      {request.company?.companyName && !companyName && !companyExists && !isCheckingExistence && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-600">
                            💡 Utilisez la valeur par défaut ou saisissez une nouvelle entreprise
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCompanyName(request.company.companyName || '')}
                            className="text-xs h-6 px-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10"
                          >
                            Utiliser par défaut
                          </Button>
                        </div>
                      )}
                      {companyExists && (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                          <CheckCircle className="w-3 h-3" />
                          <span>Cette entreprise existe déjà dans la base de données. Le champ est désactivé.</span>
                        </div>
                      )}
                    </div>

                    {/* Champ Profession */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#224D62] flex items-center gap-2">
                        Profession
                        {isCheckingExistence && (
                          <Loader2 className="w-3 h-3 animate-spin text-[#CBB171]" />
                        )}
                        {professionExists && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            ✓ Existe déjà
                          </span>
                        )}
                        {request.company?.profession && !professionExists && !isCheckingExistence && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Valeur par défaut: {request.company.profession})
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
                            "pl-10",
                            professionExists && "bg-gray-100 text-gray-500 cursor-not-allowed"
                          )}
                          disabled={professionExists}
                        />
                        {professionExists && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </div>
                      {request.company?.profession && !professionName && !professionExists && !isCheckingExistence && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-600">
                            💡 Utilisez la valeur par défaut ou saisissez une nouvelle profession
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setProfessionName(request.company.profession || '')}
                            className="text-xs h-6 px-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10"
                          >
                            Utiliser par défaut
                          </Button>
                        </div>
                      )}
                      {professionExists && (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                          <CheckCircle className="w-3 h-3" />
                          <span>Cette profession existe déjà dans la base de données. Le champ est désactivé.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              {/* Champs Entreprise et Profession */}

            </div>
          )}

          {/* Formulaire de corrections */}
          {confirmationAction.type === 'under_review' && (
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#224D62]">
                  Corrections à apporter <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctionsList}
                  onChange={(e) => setCorrectionsList(e.target.value)}
                  placeholder="Exemples :
• Photo trop floue, veuillez fournir une photo plus nette
• Document d'identité manquant
• Adresse incomplète
• Numéro de téléphone incorrect"
                  className="w-full min-h-[120px] p-3 border border-[#CBB171]/30 rounded-lg focus:border-[#224D62] focus:ring-[#224D62]/20 resize-none"
                  required
                />
                                 {confirmationAction.type === 'under_review' && !correctionsList.trim() && (
                   <p className="text-sm text-red-500">
                     Veuillez préciser les corrections demandées
                   </p>
                 )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={closeConfirmation}>
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
                             disabled={
                 isApproving ||
                 (confirmationAction.type === 'approve' && !membershipType) ||
                 (confirmationAction.type === 'under_review' && !correctionsList.trim())
               }
              className={
                confirmationAction.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  confirmationAction.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    confirmationAction.type === 'under_review' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-blue-600 hover:bg-blue-700'
              }
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
      page: key !== 'page' ? 1 : value // Reset page si on change autre chose que la page
    }))
  }

  const handleSearch = (searchQuery: string) => {
    handleFilterChange('searchQuery', searchQuery)
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Erreur lors du chargement des demandes d'adhésion</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Demandes d'Adhésion</h1>
        <p className="text-muted-foreground">
          Gérez les demandes d'adhésion à votre organisation
        </p>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={filters.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtre par statut */}
            <div className="w-full md:w-48">
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
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

      {/* Statistiques rapides */}
      {membershipData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{membershipData.pagination.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {membershipData.data.filter((r: MembershipRequest) => r.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {membershipData.data.filter((r: MembershipRequest) => r.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">Approuvées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {membershipData.data.filter((r: MembershipRequest) => r.status === 'under_review').length}
              </div>
              <div className="text-sm text-muted-foreground">En cours</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des demandes */}
      <div className="space-y-4">
        {isLoading ? (
          // Skeletons de chargement
          Array.from({ length: 5 }).map((_, index) => (
            <MembershipRequestSkeleton key={index} />
          ))
        ) : membershipData?.data.length === 0 ? (
          // État vide
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucune demande trouvée</h3>
                <p>Aucune demande d'adhésion ne correspond à vos critères de recherche.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Liste des demandes
          membershipData?.data.map((request: MembershipRequest) => (
            <MembershipRequestCard
              key={request.id}
              request={request}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {membershipData && membershipData.pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {membershipData.pagination.currentPage} sur {membershipData.pagination.totalPages}
                {' '}({membershipData.pagination.totalItems} résultats)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!membershipData.pagination.hasPrevPage}
                  onClick={() => handleFilterChange('page', membershipData.pagination.currentPage - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!membershipData.pagination.hasNextPage}
                  onClick={() => handleFilterChange('page', membershipData.pagination.currentPage + 1)}
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
