'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { updateDeclaredVersementCS } from '@/db/caisse/refunds.db'
import { getAdminById } from '@/db/admin.db'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA'
}

const MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'MobiCash',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
}

interface Props {
  open: boolean
  onClose: () => void
  contractId: string
  versement: any
  onSuccess?: () => void | Promise<void>
}

export default function ValidateDeclaredVersementCSModal({ open, onClose, contractId, versement, onSuccess }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const isPending = isValidating || isRejecting

  const handleClose = () => {
    if (isPending) return
    setRejectionReason('')
    setShowRejectForm(false)
    onClose()
  }

  const handleValidate = async () => {
    if (!user?.uid) return
    setIsValidating(true)
    try {
      const admin = await getAdminById(user.uid)
      const validatedByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : user.uid

      await updateDeclaredVersementCS(contractId, versement.id, {
        status: 'VALIDATED',
        validatedBy: user.uid,
        validatedByName,
        validatedAt: new Date(),
      })

      toast.success('Déclaration validée')
      queryClient.invalidateQueries({ queryKey: ['declaredVersementsCS', contractId] })
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur validation déclaration CS:', err)
      toast.error(err?.message || 'Erreur lors de la validation')
    } finally {
      setIsValidating(false)
    }
  }

  const handleReject = async () => {
    if (!user?.uid || !rejectionReason.trim()) return
    setIsRejecting(true)
    try {
      const admin = await getAdminById(user.uid)
      const rejectedByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : user.uid

      await updateDeclaredVersementCS(contractId, versement.id, {
        status: 'REJECTED',
        rejectedBy: user.uid,
        rejectedByName,
        rejectionReason: rejectionReason.trim(),
        rejectedAt: new Date(),
      })

      toast.success('Déclaration refusée')
      queryClient.invalidateQueries({ queryKey: ['declaredVersementsCS', contractId] })
      setRejectionReason('')
      setShowRejectForm(false)
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur refus déclaration CS:', err)
      toast.error(err?.message || 'Erreur lors du refus')
    } finally {
      setIsRejecting(false)
    }
  }

  const declaredAt = versement?.declaredAt instanceof Date ? versement.declaredAt : versement?.declaredAt ? new Date(versement.declaredAt) : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <ModalContent size="md">
        <ModalHeader
          icon={FileText}
          tone="warning"
          title={`Versement déclaré — Mois ${versement?.monthIndex != null ? versement.monthIndex + 1 : '?'}`}
          description="Déclaration soumise par le membre — en attente de validation"
        />

        {/* Body */}
        <ModalBody>
          {/* Résumé */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Détails de la déclaration</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{versement?.amount ? formatAmount(versement.amount) : '—'}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mois</span>
                <span className="text-sm font-mono text-gray-700">M{versement?.monthIndex != null ? versement.monthIndex + 1 : '?'}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mode</span>
                <span className="text-sm text-gray-700">{MODE_LABELS[versement?.mode] ?? versement?.mode ?? '—'}</span>
              </div>
              {versement?.date && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Date versement</span>
                  <span className="text-sm text-gray-700">{versement.date}{versement.time ? ` à ${versement.time}` : ''}</span>
                </div>
              )}
              {declaredAt && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Déclaré le</span>
                  <span className="text-sm text-gray-700">{format(declaredAt, 'd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
              {versement?.comment && (
                <div className="px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Commentaire</span>
                  <span className="text-sm text-gray-600 italic">« {versement.comment} »</span>
                </div>
              )}
            </div>
          </div>

          {/* Preuve */}
          {versement?.proofUrl && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preuve de versement</p>
              </div>
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Justificatif fourni par le membre</p>
                <a
                  href={versement.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#234D65]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#234D65] hover:bg-[#234D65]/5 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ouvrir
                </a>
              </div>
            </div>
          )}

          {/* Formulaire de refus */}
          {showRejectForm && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
              <div className="border-b border-red-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Motif du refus</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <Textarea
                  placeholder="Expliquez pourquoi la déclaration est refusée (min. 10 caractères)..."
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowRejectForm(false); setRejectionReason('') }}
                    disabled={isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending || rejectionReason.trim().length < 10}
                    onClick={() => void handleReject()}
                  >
                    {isRejecting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Confirmer le refus
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        {/* Footer */}
        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Fermer
          </Button>
          {!showRejectForm && (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                disabled={isPending}
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="h-4 w-4" />
                Refuser
              </Button>
              <Button
                type="button"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending}
                onClick={() => void handleValidate()}
              >
                {isValidating
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                Valider
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
