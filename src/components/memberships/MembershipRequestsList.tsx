'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, User, Calendar, Mail, Phone, MapPin, FileText, IdCard } from 'lucide-react'
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
import { useMembershipRequests, useUpdateMembershipRequestStatus, type MembershipRequestFilters } from '@/hooks/useMembershipRequests'
import type { MembershipRequest, MembershipRequestStatus } from '@/types/types'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'
import MemberDetailsModal from './MemberDetailsModal'
import MemberIdentityModal from './MemberIdentityModal'

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
  const [showDetailsModal, setShowDetailsModal] = React.useState(false)
  const [showIdentityModal, setShowIdentityModal] = React.useState(false)

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
            
            {/* Informations du demandeur */}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">
                {request.identity.firstName} {request.identity.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {request.identity.nationality} • {request.identity.civility}
              </p>
            </div>
          </div>
          
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
                  onClick={() => setShowDetailsModal(true)}
                  className="flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Voir les détails</span>
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
              onClick={() => onStatusUpdate(request.id!, 'approved')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approuver
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onStatusUpdate(request.id!, 'rejected')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onStatusUpdate(request.id!, 'under_review')}
            >
              <Eye className="w-4 h-4 mr-1" />
              Examiner
            </Button>
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
  </Card>
  )
}

// Composant principal
export default function MembershipRequestsList() {
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
      reviewedBy: 'current-admin-id', // TODO: Récupérer l'ID de l'admin connecté
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
