'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { CreditDemand, CreditDemandStatus } from '@/types/types'
import { useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'

interface ValidateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CreditDemand | null
  action: 'approve' | 'reject'
  onSuccess?: () => void
}

export default function ValidateDemandModal({
  isOpen,
  onClose,
  demand,
  action,
  onSuccess,
}: ValidateDemandModalProps) {
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateStatus } = useCreditDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setComments('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    const newStatus: CreditDemandStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    // Validation : motif requis pour l'approbation et le rejet
    if (!comments.trim()) {
      toast.error(
        action === 'approve' 
          ? 'Veuillez indiquer le motif d\'approbation' 
          : 'Veuillez indiquer le motif du rejet'
      )
      return
    }

    try {
      setIsSubmitting(true)
      await updateStatus.mutateAsync({
        id: demand.id,
        status: newStatus,
        comments: comments.trim(),
      })
      
      toast.success(
        action === 'approve' 
          ? 'Demande approuvée avec succès' 
          : 'Demande rejetée avec succès'
      )
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error)
      toast.error(error?.message || 'Erreur lors de la mise à jour du statut')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!demand) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            {action === 'approve' ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                Approuver la demande
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                Rejeter la demande
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? 'Vous êtes sur le point d\'approuver cette demande de crédit. Veuillez indiquer le motif d\'approbation.'
              : 'Vous êtes sur le point de rejeter cette demande de crédit. Veuillez indiquer le motif du rejet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de la demande */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Client:</strong> {demand.clientFirstName} {demand.clientLastName}</p>
                <p><strong>Type:</strong> {demand.creditType}</p>
                <p><strong>Montant:</strong> {demand.amount.toLocaleString('fr-FR')} FCFA</p>
                {demand.guarantorId && (
                  <p><strong>Garant:</strong> {demand.guarantorFirstName} {demand.guarantorLastName}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Motif d'approbation ou de rejet */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-semibold text-gray-900">
              {action === 'approve' ? 'Motif d\'approbation *' : 'Motif du rejet *'}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                action === 'approve'
                  ? 'Indiquez le motif d\'approbation de cette demande...'
                  : 'Indiquez le motif du rejet de cette demande...'
              }
              rows={4}
              required
              className="resize-none border-gray-300 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]"
            />
            {!comments.trim() && (
              <p className="text-sm text-red-600 mt-1">
                {action === 'approve' 
                  ? 'Le motif d\'approbation est obligatoire' 
                  : 'Le motif du rejet est obligatoire'}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {action === 'approve' 
                ? 'Expliquez pourquoi cette demande est approuvée (ex: client éligible, garant solide, montant raisonnable...)' 
                : 'Expliquez clairement pourquoi cette demande est rejetée (ex: client non éligible, garant insuffisant, montant trop élevé...)'}
            </p>
          </div>

          {action === 'approve' && demand.eligibilityOverride && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">Dérogation appliquée</p>
                <p className="text-sm">{demand.eligibilityOverride.justification}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Par {demand.eligibilityOverride.adminName} le{' '}
                  {new Date(demand.eligibilityOverride.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !comments.trim()}
            className={
              action === 'approve'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {action === 'approve' ? 'Approbation...' : 'Rejet...'}
              </>
            ) : (
              <>
                {action === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approuver
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

