'use client'

import { useMembershipRequestByDossier } from '@/hooks/useMembers'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import MemberDetailsModal from './MemberDetailsModal'

interface MemberDetailsWrapperProps {
  isOpen: boolean
  onClose: () => void
  dossierId: string
  memberName?: string
}

const MemberDetailsWrapper = ({ 
  isOpen, 
  onClose, 
  dossierId, 
  memberName 
}: MemberDetailsWrapperProps) => {
  const { data: membershipRequest, isLoading, error } = useMembershipRequestByDossier(dossierId)

  // Si le modal est fermé, ne rien afficher
  if (!isOpen) {
    return null
  }

  // Si on charge les données
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#224D62]">
              Chargement des détails{memberName ? ` de ${memberName}` : ''}...
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 p-6">
            {/* Skeleton pour l'en-tête */}
            <div className="text-center space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-6 w-48 mx-auto" />
              </div>
            </div>

            {/* Skeleton pour les sections */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Si erreur
  if (error || !membershipRequest) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">
              Erreur
            </DialogTitle>
          </DialogHeader>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error 
                ? 'Impossible de charger les détails du membre.'
                : 'Aucun dossier trouvé pour ce membre.'
              }
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Fermer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Si tout va bien, afficher le modal avec les données
  return (
    <MemberDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      request={membershipRequest}
    />
  )
}

export default MemberDetailsWrapper