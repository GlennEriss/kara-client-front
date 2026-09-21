'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, MapPin, Store, User, XCircle } from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useShopMutations } from '@/hooks/useShops'
import type { Shop } from '@/types/types'

interface Props {
  open: boolean
  onClose: () => void
  shop: Shop | null
  decision: 'approved' | 'rejected'
}

/**
 * Validation d'une boutique soumise par un membre.
 *
 * Le refus exige un motif : il est transmis au membre, qui peut alors corriger
 * sa fiche et la resoumettre. Un refus muet le laisserait sans recours.
 */
export default function ShopReviewModal({ open, onClose, shop, decision }: Props) {
  const { review } = useShopMutations()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isReject = decision === 'rejected'

  useEffect(() => {
    if (open) setReason('')
  }, [open, shop?.id])

  const handleConfirm = async () => {
    if (!shop) return
    if (isReject && !reason.trim()) {
      toast.error('Indiquez le motif du refus : le membre le recevra.')
      return
    }
    setSubmitting(true)
    try {
      await review.mutateAsync({ shop, decision, reason: reason.trim() })
      toast.success(isReject ? 'Boutique refusée' : 'Boutique validée et publiée')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la validation')
    } finally {
      setSubmitting(false)
    }
  }

  if (!shop) return null

  const location = [shop.city, shop.province].filter(Boolean).join(', ')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalContent size="md">
        <ModalHeader
          icon={isReject ? XCircle : CheckCircle2}
          tone={isReject ? 'destructive' : 'success'}
          title={isReject ? 'Refuser la boutique' : 'Valider la boutique'}
          description={
            isReject
              ? "La fiche restera hors de l'annuaire. Le membre recevra le motif et pourra la corriger."
              : "La fiche sera publiée immédiatement dans l'annuaire des membres."
          }
        />

        <ModalBody>
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            {shop.photoURL ? (
              <Image
                src={shop.photoURL}
                alt={shop.name}
                width={56}
                height={56}
                className="h-14 w-14 flex-shrink-0 rounded-lg border object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border bg-white text-gray-400">
                <Store className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{shop.name}</p>
              <p className="truncate text-sm text-[#234D65]">{shop.category}</p>
              {shop.ownerName && (
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                  <User className="h-3 w-3" /> {shop.ownerName}
                  {shop.ownerMatricule ? ` • ${shop.ownerMatricule}` : ''}
                </p>
              )}
              {location && (
                <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                  <MapPin className="h-3 w-3" /> {location}
                </p>
              )}
            </div>
          </div>

          {isReject && (
            <div className="mt-4 space-y-1">
              <Label className="text-xs text-gray-500">Motif du refus *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Ex : la photo ne correspond pas à la boutique, le numéro de téléphone est invalide…"
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className={isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-[#234D65] hover:bg-[#234D65]/90'}
          >
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {isReject ? 'Refuser' : 'Valider et publier'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
