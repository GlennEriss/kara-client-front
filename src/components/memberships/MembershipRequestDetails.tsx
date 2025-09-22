'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Clock, Eye, FileText, IdCard, Mail, MapPin, Phone, User, XCircle, Building2, Briefcase, CarFront, Heart, AlertCircle, Download, Copy, ExternalLink, UserCheck, Zap } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useMembershipRequest } from '@/hooks/useMembershipRequests'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'
import type { MembershipRequestStatus } from '@/types/types'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { getAdminById } from '@/db/admin.db'
import { useState, useEffect } from 'react'

// Fonction utilitaire pour obtenir le badge de statut avec animations
const getStatusBadge = (status: MembershipRequestStatus) => {
  const baseClasses = "transition-all duration-300 hover:scale-105 flex items-center gap-2 font-semibold px-3 lg:px-4 py-2 text-xs lg:text-sm"

  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className={`${baseClasses} bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-300 hover:shadow-lg`}>
          <Clock className="w-3 h-3 lg:w-4 lg:h-4 animate-pulse" />
          {MEMBERSHIP_STATUS_LABELS.pending}
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="secondary" className={`${baseClasses} bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-300 hover:shadow-lg`}>
          <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4" />
          {MEMBERSHIP_STATUS_LABELS.approved}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive" className={`${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-300 hover:shadow-lg`}>
          <XCircle className="w-3 h-3 lg:w-4 lg:h-4" />
          {MEMBERSHIP_STATUS_LABELS.rejected}
        </Badge>
      )
    case 'under_review':
      return (
        <Badge variant="outline" className={`${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-300 hover:shadow-lg`}>
          <Eye className="w-3 h-3 lg:w-4 lg:h-4 animate-bounce" />
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
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
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

// Composant InfoField pour affichage uniforme - responsive
const InfoField = ({
  label,
  value,
  icon: Icon,
  color = "text-gray-600",
  copyable = false
}: {
  label: string
  value: string | React.ReactNode
  icon?: React.ComponentType<any>
  color?: string
  copyable?: boolean
}) => (
  <div className="group p-3 lg:p-4 rounded-xl bg-gradient-to-br from-gray-50/50 to-white hover:from-gray-100/50 hover:to-gray-50/50 transition-all duration-300 border border-gray-100 hover:border-gray-200 hover:shadow-sm">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
      {label}
    </label>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
        {Icon && <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`} />}
        <span className="font-medium text-gray-900 text-sm lg:text-base truncate">{value}</span>
      </div>
      {copyable && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(String(value))
            toast.success('Copié !', { duration: 2000 })
          }}
        >
          <Copy className="w-3 h-3" />
        </Button>
      )}
    </div>
  </div>
)

// Composant de squelette de chargement amélioré - responsive
const DetailsSkeleton = () => (
  <div className="space-y-6 lg:space-y-8 animate-pulse">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
      <div className="flex items-center space-x-3 lg:space-x-4">
        <Skeleton className="h-10 lg:h-10 w-16 lg:w-20" />
        <div className="space-y-2">
          <Skeleton className="h-6 lg:h-8 w-64 lg:w-96" />
          <Skeleton className="h-3 lg:h-4 w-48 lg:w-64" />
        </div>
      </div>
      <Skeleton className="h-8 w-32 rounded-full self-start lg:self-auto" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-5 lg:h-6 w-40 lg:w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-3 lg:h-4 w-20 lg:w-24" />
                    <Skeleton className="h-5 lg:h-6 w-28 lg:w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6 lg:space-y-8">
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-5 lg:h-6 w-28 lg:w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 lg:h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
          </CardHeader>
          <CardContent className="space-y-3 lg:space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20 lg:w-24" />
                <Skeleton className="h-4 lg:h-5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

// Composant ModernCard pour les sections - responsive
const ModernCard = ({
  title,
  icon: Icon,
  children,
  className = "",
  iconColor = "text-[#234D65]"
}: {
  title: string
  icon: React.ComponentType<any>
  children: React.ReactNode
  className?: string
  iconColor?: string
}) => (
  <Card className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg ${className}`}>
    <CardHeader className="pb-3 lg:pb-4">
      <CardTitle className="flex items-center gap-2 lg:gap-3 text-base lg:text-lg font-bold text-gray-900">
        <div className={`p-2 lg:p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColor}`} />
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {children}
    </CardContent>
  </Card>
)

export default function MembershipRequestDetails() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  const { user } = useAuth()
  const [processedByAdmin, setProcessedByAdmin] = useState<any>(null)
  const [isLoadingProcessedBy, setIsLoadingProcessedBy] = useState(false)

  const { data: request, isLoading, isError, error } = useMembershipRequest(requestId)

  // Récupérer les informations de l'administrateur qui a traité la demande
  useEffect(() => {
    const fetchProcessedByAdmin = async () => {
      if (!request?.processedBy) return
      
      setIsLoadingProcessedBy(true)
      try {
        // Si c'est l'utilisateur connecté, utiliser ses informations
        if (user?.uid === request.processedBy) {
          setProcessedByAdmin({
            firstName: user.displayName?.split(' ')[0] || 'Utilisateur',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Connecté'
          })
        } else {
          // Sinon, récupérer les informations depuis la collection admins
          const adminData = await getAdminById(request.processedBy)
          if (adminData) {
            setProcessedByAdmin({
              firstName: adminData.firstName,
              lastName: adminData.lastName
            })
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'administrateur traiteur:', error)
      } finally {
        setIsLoadingProcessedBy(false)
      }
    }

    fetchProcessedByAdmin()
  }, [request?.processedBy, user?.uid])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <DetailsSkeleton />
      </div>
    )
  }

  if (isError || !request) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-red-50/30">
          <CardContent className="p-8 lg:p-16 text-center">
            <div className="p-3 lg:p-4 rounded-full bg-red-100 w-fit mx-auto mb-4 lg:mb-6">
              <AlertCircle className="w-8 h-8 lg:w-12 lg:h-12 text-red-600" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-gray-900">Demande introuvable</h2>
            <p className="text-gray-600 mb-6 lg:mb-8 text-base lg:text-lg max-w-md mx-auto leading-relaxed">
              {error instanceof Error ? error.message : 'La demande d\'adhésion demandée n\'existe pas ou n\'est plus accessible.'}
            </p>
            <Button
              onClick={() => router.back()}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in-0 duration-500">
      {/* En-tête moderne - responsive */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-8 rounded-2xl shadow-lg border-0 space-y-4 lg:space-y-0">
        <div className="flex flex-col lg:flex-row lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="h-10 lg:h-12 px-3 lg:px-4 bg-white hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl border self-start"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-sm lg:text-base">Retour</span>
          </Button>
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent leading-tight">
              Demande de {request.identity.firstName} {request.identity.lastName}
            </h1>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="font-medium text-sm lg:text-base">Créée le {formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 self-start lg:self-auto">
          {getStatusBadge(request.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">

          {/* Informations personnelles */}
          <ModernCard title="Informations personnelles" icon={User} iconColor="text-blue-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <InfoField label="Civilité" value={request.identity.civility} icon={User} color="text-blue-600" />
              <InfoField label="Genre" value={request.identity.gender} icon={User} color="text-blue-600" />
              <InfoField label="Prénom" value={request.identity.firstName} icon={User} color="text-blue-600" />
              <InfoField label="Nom" value={request.identity.lastName} icon={User} color="text-blue-600" />
              <InfoField label="Date de naissance" value={formatDate(request.identity.birthDate)} icon={Calendar} color="text-purple-600" />
              <InfoField label="Lieu de naissance" value={request.identity.birthPlace} icon={MapPin} color="text-red-600" />
              <InfoField label="Nationalité" value={request.identity.nationality} icon={User} color="text-green-600" />
              <InfoField label="Statut matrimonial" value={request.identity.maritalStatus} icon={Heart} color="text-pink-600" />

              {request.identity.spouseFirstName && (
                <>
                  <InfoField
                    label="Époux/Épouse"
                    value={`${request.identity.spouseFirstName} ${request.identity.spouseLastName}`}
                    icon={Heart}
                    color="text-pink-600"
                  />
                  <InfoField
                    label="Téléphone époux/épouse"
                    value={request.identity.spousePhone || 'Non renseigné'}
                    icon={Phone}
                    color="text-green-600"
                  />
                </>
              )}
            </div>

            <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-100">
              <InfoField label="Lieu de prière" value={request.identity.prayerPlace} icon={Building2} color="text-indigo-600" />
            </div>

            <div className="mt-3 lg:mt-4">
              <div className={`inline-flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-300 ${request.identity.hasCar
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200'
                }`}>
                <CarFront className={`w-4 h-4 lg:w-5 lg:h-5 ${request.identity.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-sm lg:text-base">
                  {request.identity.hasCar ? 'Possède un véhicule' : 'Ne possède pas de véhicule'}
                </span>
              </div>
            </div>
          </ModernCard>

          {/* Informations de contact */}
          <ModernCard title="Informations de contact" icon={Phone} iconColor="text-green-600">
            <div className="space-y-4">
              <InfoField
                label="Adresse email"
                value={request.identity.email || 'Non renseigné'}
                icon={Mail}
                color="text-blue-600"
                copyable={!!request.identity.email}
              />

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
                  Numéros de téléphone
                </label>
                <div className="space-y-2">
                  {request.identity.contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 group hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                        <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-sm lg:text-base truncate">{contact}</span>
                        <Badge variant="outline" className="text-xs bg-white flex-shrink-0">
                          {index === 0 ? 'Principal' : `Sec. ${index}`}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(contact)
                          toast.success('Numéro copié !', { duration: 2000 })
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ModernCard>

          {/* Adresse */}
          <ModernCard title="Adresse de résidence" icon={MapPin} iconColor="text-red-600">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              <InfoField label="Province" value={request.address.province} icon={MapPin} color="text-red-600" />
              <InfoField label="Ville" value={request.address.city} icon={MapPin} color="text-red-600" />
              <InfoField label="Quartier" value={request.address.district} icon={MapPin} color="text-red-600" />
              <InfoField label="Arrondissement" value={request.address.arrondissement} icon={MapPin} color="text-red-600" />
            </div>

            {request.address.additionalInfo && (
              <div className="mt-3 lg:mt-4">
                <InfoField
                  label="Informations complémentaires"
                  value={request.address.additionalInfo}
                  icon={FileText}
                  color="text-gray-600"
                />
              </div>
            )}
          </ModernCard>

          {/* Informations professionnelles */}
          <ModernCard title="Informations professionnelles" icon={Briefcase} iconColor="text-purple-600">
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-300 ${request.company.isEmployed
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200'
                }`}>
                <Briefcase className={`w-4 h-4 lg:w-5 lg:h-5 ${request.company.isEmployed ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-sm lg:text-base">
                  {request.company.isEmployed ? 'Employé(e)' : 'Non employé(e)'}
                </span>
              </div>

              {request.company.isEmployed && (
                <div className="mt-4 lg:mt-6 space-y-4">
                  <Separator className="bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    <InfoField
                      label="Entreprise"
                      value={request.company.companyName || 'Non renseigné'}
                      icon={Building2}
                      color="text-indigo-600"
                    />
                    <InfoField
                      label="Profession"
                      value={request.company.profession || 'Non renseigné'}
                      icon={Briefcase}
                      color="text-purple-600"
                    />
                    <InfoField
                      label="Ancienneté"
                      value={request.company.seniority || 'Non renseigné'}
                      icon={Calendar}
                      color="text-amber-600"
                    />
                  </div>

                  {request.company.companyAddress && (
                    <div className="mt-3 lg:mt-4">
                      <InfoField
                        label="Adresse de l'entreprise"
                        value={`${request.company.companyAddress.district}, ${request.company.companyAddress.city}, ${request.company.companyAddress.province}`}
                        icon={MapPin}
                        color="text-red-600"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModernCard>

          {/* Documents d'identité */}
          <ModernCard title="Documents d'identité" icon={IdCard} iconColor="text-indigo-600">
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <InfoField label="Type de document" value={request.documents.identityDocument} icon={IdCard} color="text-indigo-600" />
                <InfoField label="Numéro" value={request.documents.identityDocumentNumber} icon={IdCard} color="text-indigo-600" copyable />
                <InfoField label="Date d'émission" value={formatDate(request.documents.issuingDate)} icon={Calendar} color="text-green-600" />
                <InfoField label="Date d'expiration" value={formatDate(request.documents.expirationDate)} icon={Calendar} color="text-red-600" />
              </div>
              <InfoField label="Lieu d'émission" value={request.documents.issuingPlace} icon={MapPin} color="text-purple-600" />

              {/* Images des documents */}
              <div className="space-y-4">
                <h4 className="font-bold text-base lg:text-lg text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600" />
                  Documents numérisés
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {request.documents.documentPhotoFrontURL && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-emerald-600" />
                        Recto du document
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
                        <Image
                          src={request.documents.documentPhotoFrontURL}
                          alt="Document recto"
                          width={400}
                          height={250}
                          className="w-full h-36 lg:h-48 object-cover rounded-xl border-2 border-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300"
                        />
                        <div className="absolute top-2 right-2 lg:top-3 lg:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
                          <Button
                            size="sm"
                            className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3 text-xs"
                            onClick={() => window.open(request.documents.documentPhotoFrontURL!, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                            <span className="hidden lg:inline">Voir</span>
                          </Button>
                          <Button
                            size="sm"
                            className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = request.documents.documentPhotoFrontURL!
                              link.download = 'document-recto.jpg'
                              link.click()
                            }}
                          >
                            <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.documents.documentPhotoBackURL && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-amber-600" />
                        Verso du document
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
                        <Image
                          src={request.documents.documentPhotoBackURL}
                          alt="Document verso"
                          width={400}
                          height={250}
                          className="w-full h-36 lg:h-48 object-cover rounded-xl border-2 border-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300"
                        />
                        <div className="absolute top-2 right-2 lg:top-3 lg:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
                          <Button
                            size="sm"
                            className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3 text-xs"
                            onClick={() => window.open(request.documents.documentPhotoBackURL!, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                            <span className="hidden lg:inline">Voir</span>
                          </Button>
                          <Button
                            size="sm"
                            className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = request.documents.documentPhotoBackURL!
                              link.download = 'document-verso.jpg'
                              link.click()
                            }}
                          >
                            <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModernCard>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6 lg:space-y-8">

          {/* Photo du demandeur */}
          <ModernCard title="Photo du demandeur" icon={User} iconColor="text-cyan-600">
            <div className="space-y-4">
              {request.identity.photoURL ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
                  <Image
                    src={request.identity.photoURL}
                    alt={`Photo de ${request.identity.firstName} ${request.identity.lastName}`}
                    width={300}
                    height={300}
                    className="w-full h-48 lg:h-72 object-cover rounded-xl border-2 border-gray-200 shadow-lg group-hover:shadow-2xl transition-all duration-300"
                  />
                  <div className="absolute top-3 right-3 lg:top-4 lg:right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
                    <Button
                      size="sm"
                      className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-xl h-8 lg:h-10 px-2 lg:px-4 text-xs"
                      onClick={() => window.open(request.identity.photoURL!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                      <span className="hidden lg:inline">Voir</span>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-xl h-8 lg:h-10 px-2 lg:px-4"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = request.identity.photoURL!
                        link.download = `photo-${request.identity.firstName}-${request.identity.lastName}.jpg`
                        link.click()
                      }}
                    >
                      <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 lg:h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-10 h-10 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-2 lg:mb-3" />
                    <p className="text-gray-500 font-medium text-sm lg:text-base">Aucune photo fournie</p>
                  </div>
                </div>
              )}
            </div>
          </ModernCard>

          {/* Métadonnées */}
          <ModernCard title="Informations sur la demande" icon={FileText} iconColor="text-orange-600">
            <div className="space-y-4 lg:space-y-6">
              <div className="p-3 lg:p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  ID de la demande
                </label>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-xs lg:text-sm font-bold text-gray-900 bg-white px-2 lg:px-3 py-1 lg:py-2 rounded-lg border truncate flex-1 mr-2">{request.id}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 lg:h-8 lg:w-8 p-0 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(request.id!)
                      toast.success('ID copié !', { duration: 2000 })
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Statut actuel
                  </label>
                  <div className="w-fit">{getStatusBadge(request.status)}</div>
                </div>

                <InfoField
                  label="Date de création"
                  value={formatDate(request.createdAt)}
                  icon={Calendar}
                  color="text-blue-600"
                />

                <InfoField
                  label="Dernière modification"
                  value={formatDate(request.updatedAt)}
                  icon={Calendar}
                  color="text-purple-600"
                />

                {request.processedAt && (
                  <InfoField
                    label="Date de traitement"
                    value={formatDate(request.processedAt)}
                    icon={CheckCircle}
                    color="text-green-600"
                  />
                )}

                {processedByAdmin && (
                  <InfoField
                    label="Traité par"
                    value={isLoadingProcessedBy ? 'Chargement...' : `${processedByAdmin.firstName} ${processedByAdmin.lastName}`}
                    icon={UserCheck}
                    color="text-indigo-600"
                  />
                )}
                {request.memberNumber && (
                  <div className="p-3 lg:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
                    <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Numéro de membre
                    </label>
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-base lg:text-lg font-black text-emerald-700 bg-white px-3 lg:px-4 py-1 lg:py-2 rounded-lg border border-emerald-300 truncate flex-1 mr-2">
                        {request.memberNumber}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-emerald-600 flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(request.memberNumber!)
                          toast.success('Numéro copié !', { duration: 2000 })
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {request.adminComments && (
                  <div className="p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 block">
                      Commentaires administrateur
                    </label>
                    <p className="text-sm text-blue-800 leading-relaxed">{request.adminComments}</p>
                  </div>
                )}

                {request.reviewNote && (
                  <div className="p-3 lg:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Note de révision
                    </label>
                    <p className="text-sm text-amber-800 leading-relaxed">{request.reviewNote}</p>
                  </div>
                )}
              </div>
            </div>
          </ModernCard>
        </div>
      </div>
    </div>
  )
}