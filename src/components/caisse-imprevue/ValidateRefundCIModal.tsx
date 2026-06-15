'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Download, FileText, Loader2, Paperclip, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { updateRefundCI } from '@/db/caisse/refunds.db'
import { getStorageInstance } from '@/firebase/storage'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getAdminById } from '@/db/admin.db'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA'
}

const REFUND_TYPE_LABELS: Record<string, string> = {
  EARLY: 'Retrait anticipé',
  FINAL: 'Remboursement final',
}

interface Props {
  open: boolean
  onClose: () => void
  contractId: string
  refund: any
  onSuccess?: () => void | Promise<void>
}

export default function ValidateRefundCIModal({ open, onClose, contractId, refund, onSuccess }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [adminFile, setAdminFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPending = isValidating || isRejecting

  const handleDownloadMemberDoc = () => {
    if (!refund?.documentUrl) return
    const urlPath = decodeURIComponent(refund.documentUrl.split('?')[0])
    const lastSegment = urlPath.split('/').pop() ?? ''
    const ext = lastSegment.split('.').pop()?.toLowerCase() ?? ''
    const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    const safeExt = validExts.includes(ext) ? ext : 'pdf'
    const filename = `document-membre-${refund.id}.${safeExt}`
    const a = document.createElement('a')
    a.href = `/api/download?url=${encodeURIComponent(refund.documentUrl)}&filename=${encodeURIComponent(filename)}`
    a.click()
  }

  const handleClose = () => {
    if (isPending) return
    setRejectionReason('')
    setShowRejectForm(false)
    setAdminFile(null)
    onClose()
  }

  const handleValidate = async () => {
    if (!user?.uid || !adminFile) return
    setIsValidating(true)
    try {
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const ext = adminFile.name.split('.').pop() || 'pdf'
      const filePath = `contracts-ci/refunds/${contractId}/${refund.id}/admin-signed-${timestamp}.${ext}`
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, adminFile)
      const adminDocumentUrl = await getDownloadURL(storageRef)

      const admin = await getAdminById(user.uid)
      const approvedByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : user.uid

      await updateRefundCI(contractId, refund.id, {
        status: 'APPROVED',
        approvedBy: user.uid,
        approvedByName,
        approvedAt: new Date(),
        adminDocumentUrl,
      })

      toast.success('Demande de remboursement approuvée')
      queryClient.invalidateQueries({ queryKey: ['refundsCI', contractId] })
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur validation remboursement:', err)
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

      await updateRefundCI(contractId, refund.id, {
        status: 'REJECTED',
        rejectedBy: user.uid,
        rejectedByName,
        rejectionReason: rejectionReason.trim(),
      })

      toast.success('Demande de remboursement refusée')
      queryClient.invalidateQueries({ queryKey: ['refundsCI', contractId] })
      setRejectionReason('')
      setShowRejectForm(false)
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur rejet remboursement:', err)
      toast.error(err?.message || 'Erreur lors du refus')
    } finally {
      setIsRejecting(false)
    }
  }

  const createdAt = refund?.createdAt instanceof Date ? refund.createdAt : refund?.createdAt ? new Date(refund.createdAt) : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <ModalContent size="md">
        <ModalHeader
          icon={FileText}
          title={`Validation — ${REFUND_TYPE_LABELS[refund?.type] ?? refund?.type}`}
          description="Document soumis par le membre — en attente de votre décision"
        />

        {/* Body */}
        <ModalBody>
          {/* Résumé */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Détails de la demande</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Type</span>
                <span className="text-sm font-medium text-gray-900">{REFUND_TYPE_LABELS[refund?.type] ?? refund?.type ?? '—'}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{refund?.withdrawalAmount ? formatAmount(refund.withdrawalAmount) : '—'}</span>
              </div>
              {createdAt && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Demandée le</span>
                  <span className="text-sm text-gray-700">{format(createdAt, 'd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
              {refund?.reason && (
                <div className="px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Motif</span>
                  <span className="text-sm text-gray-600 italic">« {refund.reason} »</span>
                </div>
              )}
            </div>
          </div>

          {/* Document membre */}
          {refund?.documentUrl && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Document signé (membre)</p>
              </div>
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Document soumis par le membre</p>
                <div className="flex items-center gap-2">
                  <a
                    href={refund.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#234D65]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#234D65] hover:bg-[#234D65]/5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ouvrir
                  </a>
                  <button
                    type="button"
                    onClick={handleDownloadMemberDoc}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#234D65]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#234D65] hover:bg-[#234D65]/5 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document doublement signé */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Document doublement signé <span className="text-red-500">*</span>
              </p>
              {adminFile && (
                <button
                  type="button"
                  onClick={() => { setAdminFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Supprimer
                </button>
              )}
            </div>
            <div className="px-4 py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setAdminFile(e.target.files?.[0] ?? null)}
              />
              {adminFile ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-800 truncate">{adminFile.name}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 hover:border-[#234D65]/40 hover:bg-[#234D65]/5 transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                  Téléverser le document doublement signé (PDF ou image)
                </button>
              )}
            </div>
          </div>

          {/* Formulaire de refus */}
          {showRejectForm && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
              <div className="border-b border-red-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Motif du refus</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <Textarea
                  placeholder="Expliquez pourquoi le document est refusé (min. 10 caractères)..."
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
                disabled={isPending || !adminFile}
                title={!adminFile ? 'Téléversez le document doublement signé pour valider' : undefined}
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
