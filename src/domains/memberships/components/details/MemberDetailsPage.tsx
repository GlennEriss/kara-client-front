/**
 * Vue détails d'un membre - Refactorisée (V2)
 * 
 * Utilise les sous-composants de la Phase 3 et le hook agrégateur useMembershipDetails
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMembershipDetails } from '../../hooks/useMembershipDetails'
import Image from 'next/image'
import { User, CarFront } from 'lucide-react'
import {
  MemberDetailsSkeleton,
  MemberDetailsErrorState,
  MemberDetailsHeader,
  MemberContactCard,
  MemberAddressCard,
  MemberProfessionCard,
  MemberSubscriptionCard,
  MemberDocumentsCard,
  MemberFilleulsCard,
  MemberPaymentsCard,
  MemberContractsCard,
  MemberRelationsCard,
} from './index'

export function MemberDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const {
    member,
    subscriptions,
    lastSubscription,
    isSubscriptionValid,
    contracts,
    filleuls,
    documents,
    isLoading,
    isError,
    error,
    refetch,
    onOpenMembershipRequest,
    onOpenSubscriptionHistory,
    onOpenFilleuls,
    onOpenContracts,
    onOpenDocuments,
    onOpenVehicles,
  } = useMembershipDetails({
    memberId,
    enabled: !!memberId,
  })

  // État de chargement
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <MemberDetailsSkeleton />
      </div>
    )
  }

  // État d'erreur
  if (isError || !member) {
    return (
      <MemberDetailsErrorState
        error={error}
        onRetry={refetch}
      />
    )
  }

  // Calculer les compteurs pour les cartes
  const documentsCount = documents?.length || 0
  const filleulsCount = filleuls?.length || 0

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <MemberDetailsHeader
        member={member}
        onBack={handleBack}
        onOpenMembershipRequest={onOpenMembershipRequest}
      />

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Colonne principale (2/3) */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Informations personnelles (sans photo) */}
          <div className="group bg-linear-to-br from-blue-50/30 to-blue-100/20 border-0 shadow-lg rounded-lg">
            <div className="p-6 pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <User className="w-5 h-5 text-blue-600" /> Informations personnelles
              </h3>
            </div>
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="member-identity-card">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Genre</div>
                <div className="font-medium">{member.gender}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Nationalité</div>
                <div className="font-medium">{member.nationalityName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Véhicule</div>
                <div className="font-medium flex items-center gap-2">
                  <CarFront className={`w-4 h-4 ${member.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
                  {member.hasCar ? 'Oui' : 'Non'}
                </div>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <MemberContactCard member={member} />

          {/* Profession */}
          <MemberProfessionCard member={member} />
        </div>

        {/* Colonne latérale (1/3) */}
        <div className="space-y-6 lg:space-y-8">
          {/* Photo du membre */}
          <div className="group bg-linear-to-br from-indigo-50/30 to-indigo-100/20 border-0 shadow-lg rounded-lg">
            <div className="p-6 pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <User className="w-5 h-5 text-indigo-600" /> Photo du membre
              </h3>
            </div>
            <div className="px-6 pb-6">
              {member.photoURL ? (
                <Image
                  src={member.photoURL}
                  alt={`Photo de ${member.displayName}`}
                  width={300}
                  height={300}
                  className="w-full h-48 lg:h-72 object-cover rounded-xl border-2 border-gray-200 shadow-lg"
                  data-testid="member-photo"
                />
              ) : (
                <div className="w-full h-48 lg:h-72 bg-linear-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-10 h-10 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-2 lg:mb-3" />
                    <p className="text-gray-500 font-medium text-sm lg:text-base">Aucune photo fournie</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adresse */}
          <MemberAddressCard member={member} />
        </div>
      </div>

      {/* Sections supplémentaires (pleine largeur ou colonne principale) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Abonnements */}
          <MemberSubscriptionCard
            lastSubscription={lastSubscription}
            isSubscriptionValid={isSubscriptionValid}
            onOpenSubscriptionHistory={onOpenSubscriptionHistory}
          />

          {/* Documents */}
          <MemberDocumentsCard
            documentsCount={documentsCount}
            onOpenMembershipRequest={onOpenMembershipRequest}
            onOpenDocuments={onOpenDocuments}
          />

          {/* Filleuls */}
          <MemberFilleulsCard
            filleulsCount={filleulsCount}
            onOpenFilleuls={onOpenFilleuls}
          />

          {/* Contrats */}
          <MemberContractsCard
            contracts={contracts}
            onOpenContracts={onOpenContracts}
          />

          {/* Paiements */}
          <MemberPaymentsCard />

          {/* Relations / Autres modules */}
          <MemberRelationsCard
            onOpenVehicles={onOpenVehicles}
          />
        </div>
      </div>
    </div>
  )
}
