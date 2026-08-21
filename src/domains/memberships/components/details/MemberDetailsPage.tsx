/**
 * Vue détails d'un membre - Refactorisée (V2)
 * 
 * Utilise les sous-composants de la Phase 3 et le hook agrégateur useMembershipDetails
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMembershipDetails } from '../../hooks/useMembershipDetails'
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
  MemberContractsCard,
  MemberRelationsCard,
} from './index'
import { MemberCharityStarsCard } from '@/domains/community/charity-stars'
import { MemberFormCard } from '@/domains/community/member-form'
import { MemberIdDocumentCard } from './MemberIdDocumentCard'
import { MemberPersonalInfoCard, MemberPhotoCard } from './MemberIdentityCard'

export function MemberDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const {
    member,
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
          {/* Informations personnelles (éditable inline) */}
          <MemberPersonalInfoCard member={member} />

          {/* Contacts */}
          <MemberContactCard member={member} />

          {/* Profession */}
          <MemberProfessionCard member={member} />

          {/* Pièce d'identité (upload recto/verso) */}
          <MemberIdDocumentCard member={member} />
        </div>

        {/* Colonne latérale (1/3) */}
        <div className="space-y-6 lg:space-y-8">
          {/* Photo du membre (téléversement / modification) */}
          <MemberPhotoCard member={member} />

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

          {/* Forme récente des paiements, façon historique de résultats sportifs */}
          <MemberFormCard memberId={memberId} />

          {/* Étoiles de charité */}
          <MemberCharityStarsCard
            memberId={memberId}
            memberName={`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || memberId}
          />

          {/* Relations / Autres modules */}
          <MemberRelationsCard
            onOpenVehicles={onOpenVehicles}
          />
        </div>
      </div>
    </div>
  )
}
