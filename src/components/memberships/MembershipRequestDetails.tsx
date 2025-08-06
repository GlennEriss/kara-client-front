'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Clock, Eye, FileText, IdCard, Mail, MapPin, Phone, User, XCircle, Building2, Briefcase, Car, Heart, AlertCircle, Download } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useMembershipRequest } from '@/hooks/useMembershipRequests'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'
import type { MembershipRequestStatus } from '@/types/types'

// Fonction utilitaire pour obtenir le badge de statut
const getStatusBadge = (status: MembershipRequestStatus) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-4 h-4 mr-2" />
          {MEMBERSHIP_STATUS_LABELS.pending}
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-4 h-4 mr-2" />
          {MEMBERSHIP_STATUS_LABELS.approved}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />
          {MEMBERSHIP_STATUS_LABELS.rejected}
        </Badge>
      )
    case 'under_review':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Eye className="w-4 h-4 mr-2" />
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
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // Si c'est une Date normale
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // Si c'est une string
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Date invalide'
  }
}

// Composant de squelette de chargement
const DetailsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

export default function MembershipRequestDetails() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const { data: request, isLoading, isError, error } = useMembershipRequest(requestId)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <DetailsSkeleton />
      </div>
    )
  }

  if (isError || !request) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Demande introuvable</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'La demande d\'adhésion demandée n\'existe pas ou n\'est plus accessible.'}
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Demande d'adhésion de {request.identity.firstName} {request.identity.lastName}
            </h1>
            <p className="text-muted-foreground">
              Demande créée le {formatDate(request.createdAt)}
            </p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Civilité</label>
                  <p className="font-medium">{request.identity.civility}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Genre</label>
                  <p className="font-medium">{request.identity.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                  <p className="font-medium">{request.identity.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom</label>
                  <p className="font-medium">{request.identity.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                  <p className="font-medium">{formatDate(request.identity.birthDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                  <p className="font-medium">{request.identity.birthPlace}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationalité</label>
                  <p className="font-medium">{request.identity.nationality}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut matrimonial</label>
                  <p className="font-medium">{request.identity.maritalStatus}</p>
                </div>
                {request.identity.spouseFirstName && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Époux/Épouse</label>
                      <p className="font-medium">{request.identity.spouseFirstName} {request.identity.spouseLastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Téléphone époux/épouse</label>
                      <p className="font-medium">{request.identity.spousePhone || 'Non renseigné'}</p>
                    </div>
                  </>
                )}
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lieu de prière</label>
                <p className="font-medium">{request.identity.prayerPlace}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {request.identity.hasCar ? 'Possède un véhicule' : 'Ne possède pas de véhicule'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Informations de contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Informations de contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                  {request.identity.email || 'Non renseigné'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Numéros de téléphone</label>
                <div className="space-y-2">
                  {request.identity.contacts.map((contact, index) => (
                    <p key={index} className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                      {contact}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Province</label>
                  <p className="font-medium">{request.address.province}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ville</label>
                  <p className="font-medium">{request.address.city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quartier</label>
                  <p className="font-medium">{request.address.district}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Arrondissement</label>
                  <p className="font-medium">{request.address.arrondissement}</p>
                </div>
              </div>
              
              {request.address.additionalInfo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Informations complémentaires</label>
                  <p className="font-medium">{request.address.additionalInfo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations professionnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Informations professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {request.company.isEmployed ? 'Employé(e)' : 'Non employé(e)'}
                </span>
              </div>

              {request.company.isEmployed && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Entreprise</label>
                      <p className="font-medium flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                        {request.company.companyName || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Profession</label>
                      <p className="font-medium flex items-center">
                        <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                        {request.company.profession || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ancienneté</label>
                      <p className="font-medium">{request.company.seniority || 'Non renseigné'}</p>
                    </div>
                  </div>

                  {request.company.companyAddress && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Adresse de l'entreprise</label>
                      <p className="font-medium">
                        {request.company.companyAddress.district}, {request.company.companyAddress.city}, {request.company.companyAddress.province}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents d'identité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <IdCard className="w-5 h-5 mr-2" />
                Documents d'identité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type de document</label>
                  <p className="font-medium">{request.documents.identityDocument}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Numéro</label>
                  <p className="font-medium">{request.documents.identityDocumentNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date d'émission</label>
                  <p className="font-medium">{formatDate(request.documents.issuingDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date d'expiration</label>
                  <p className="font-medium">{formatDate(request.documents.expirationDate)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Lieu d'émission</label>
                  <p className="font-medium">{request.documents.issuingPlace}</p>
                </div>
              </div>

              {/* Images des documents */}
              <div className="space-y-4">
                <h4 className="font-medium">Documents numérisés</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.documents.documentPhotoFrontURL && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Recto</label>
                      <div className="relative group">
                        <Image
                          src={request.documents.documentPhotoFrontURL}
                          alt="Document recto"
                          width={400}
                          height={250}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(request.documents.documentPhotoFrontURL!, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {request.documents.documentPhotoBackURL && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Verso</label>
                      <div className="relative group">
                        <Image
                          src={request.documents.documentPhotoBackURL}
                          alt="Document verso"
                          width={400}
                          height={250}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(request.documents.documentPhotoBackURL!, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          
          {/* Photo du demandeur */}
          <Card>
            <CardHeader>
              <CardTitle>Photo du demandeur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.identity.photoURL ? (
                  <div className="relative group">
                    <Image
                      src={request.identity.photoURL}
                      alt={`Photo de ${request.identity.firstName} ${request.identity.lastName}`}
                      width={300}
                      height={300}
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(request.identity.photoURL!, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Métadonnées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informations sur la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID de la demande</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded border">{request.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Statut</label>
                <div className="mt-1">{getStatusBadge(request.status)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date de création</label>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {formatDate(request.createdAt)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Dernière modification</label>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {formatDate(request.updatedAt)}
                </p>
              </div>

              {request.processedAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de traitement</label>
                  <p className="font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    {formatDate(request.processedAt)}
                  </p>
                </div>
              )}

              {request.processedBy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Traité par</label>
                  <p className="font-medium">{request.processedBy}</p>
                </div>
              )}

              {request.memberNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Numéro de membre</label>
                  <p className="font-medium font-mono bg-green-50 p-2 rounded border border-green-200">
                    {request.memberNumber}
                  </p>
                </div>
              )}

              {request.adminComments && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Commentaires admin</label>
                  <p className="text-sm bg-gray-50 p-3 rounded border">{request.adminComments}</p>
                </div>
              )}

              {request.reviewNote && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Note de révision</label>
                  <p className="text-sm bg-orange-50 p-3 rounded border border-orange-200">{request.reviewNote}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}