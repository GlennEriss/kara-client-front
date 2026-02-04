/**
 * Vue détails d'une demande d'adhésion - Refactorisée
 * 
 * Utilise les sous-composants de la Phase 3 et le hook agrégateur useMembershipRequestDetails
 */

'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  DetailsSkeleton,
  DetailsErrorState,
  DetailsHeaderStatus,
  DetailsIdentityCard,
  DetailsContactCard,
  DetailsAddressCard,
  DetailsEmploymentCard,
  DetailsPaymentCard,
  DetailsDocumentsCard,
  DetailsMetaCard,
  DetailsPhotoCard,
} from '@/domains/memberships/components/details'
import { ReplaceAdhesionPdfModal } from '@/domains/memberships/components/modals'
import { useMembershipRequestDetails } from '@/domains/memberships/hooks/useMembershipRequestDetails'
import { resolveAdhesionPdfUrl } from '@/domains/memberships/utils/details'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function MembershipRequestDetails() {
  const params = useParams()
  const requestId = params.id as string
  const { user } = useAuth()
  const [replacePdfModalOpen, setReplacePdfModalOpen] = useState(false)

  const {
    request,
    admin,
    intermediary,
    adhesionPdfUrlResolved,
    isLoading,
    isError,
    error,
  } = useMembershipRequestDetails(requestId)

  // Handler pour ouvrir le PDF d'adhésion avec fallback
  const handleViewAdhesionPdf = async () => {
    if (!request) return

    // Si l'URL est déjà résolue par le hook, l'utiliser
    if (adhesionPdfUrlResolved) {
      window.open(adhesionPdfUrlResolved, '_blank', 'noopener,noreferrer')
      return
    }

    // Sinon, essayer de résoudre l'URL (fallback)
    try {
      const url = await resolveAdhesionPdfUrl({
        id: request.id,
        matricule: request.matricule,
        adhesionPdfURL: request.adhesionPdfURL,
        status: request.status,
      })

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
        } else {
        toast.error('PDF non disponible', {
          description: 'Aucun PDF d\'adhésion validé n\'a été trouvé pour cette demande',
        })
      }
    } catch (err) {
      console.error('Erreur lors de la résolution du PDF:', err)
      toast.error('Erreur', {
        description: 'Impossible d\'ouvrir le PDF d\'adhésion',
      })
    }
  }

  // État de chargement
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <DetailsSkeleton />
      </div>
    )
  }

  // État d'erreur
  if (isError || !request) {
    return (
      <DetailsErrorState
        error={error}
        onRetry={() => {
          // React Query refetch automatique via invalidation
          if (typeof window !== 'undefined' && window.location) {
            window.location.reload()
          }
        }}
      />
    )
  }

  // État de succès - affichage des sections
  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in-0 duration-500">
      {/* En-tête avec statut et navigation */}
      <DetailsHeaderStatus request={request} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Informations personnelles */}
          <DetailsIdentityCard
            request={request}
            intermediaryInfo={intermediary}
            isLoadingIntermediary={false} // Le hook gère déjà le loading
          />

          {/* Informations de contact */}
          <DetailsContactCard request={request} />

          {/* Adresse de résidence */}
          <DetailsAddressCard request={request} />

          {/* Informations professionnelles */}
          <DetailsEmploymentCard
            request={request}
            intermediaryInfo={intermediary}
          />

          {/* Paiement */}
          <DetailsPaymentCard request={request} />

          {/* Documents d'identité */}
          <DetailsDocumentsCard
            request={request}
            adhesionPdfUrlResolved={adhesionPdfUrlResolved}
            onViewAdhesionPdf={handleViewAdhesionPdf}
            onReplaceAdhesionPdf={
              request.status === 'approved' && request.isPaid && user?.uid
                ? () => setReplacePdfModalOpen(true)
                : undefined
            }
          />
          {user?.uid && (
            <ReplaceAdhesionPdfModal
              isOpen={replacePdfModalOpen}
              onClose={() => setReplacePdfModalOpen(false)}
              request={request}
              adminId={user.uid}
              onSuccess={() => setReplacePdfModalOpen(false)}
            />
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6 lg:space-y-8">
          {/* Photo du demandeur */}
          <DetailsPhotoCard request={request} />

          {/* Métadonnées */}
          <DetailsMetaCard
            request={request}
            admin={admin}
            isLoadingAdmin={false} // Le hook gère déjà le loading
          />
        </div>
      </div>
    </div>
  )
}
