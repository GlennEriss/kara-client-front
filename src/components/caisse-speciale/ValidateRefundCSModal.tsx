'use client'

import { useRef, useState } from 'react'
import { Archive, CheckCircle2, Download, FileText, Loader2, Paperclip, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { updateRefund } from '@/db/caisse/refunds.db'
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

export default function ValidateRefundCSModal({ open, onClose, contractId, refund, onSuccess }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [archiveReason, setArchiveReason] = useState('')
  const [showArchiveForm, setShowArchiveForm] = useState(false)
  const [adminFile, setAdminFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPending = isValidating || isArchiving

  const handleDownloadMemberDoc = () => {
    const docUrl = refund?.documentUrl ?? refund?.proofUrl
    if (!docUrl) return
    const urlPath = decodeURIComponent(docUrl.split('?')[0])
    const lastSegment = urlPath.split('/').pop() ?? ''
    const ext = lastSegment.split('.').pop()?.toLowerCase() ?? ''
    const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    const safeExt = validExts.includes(ext) ? ext : 'pdf'
    const filename = `document-membre-${refund.id}.${safeExt}`
    const a = document.createElement('a')
    a.href = `/api/download?url=${encodeURIComponent(docUrl)}&filename=${encodeURIComponent(filename)}`
    a.click()
  }

  const handleClose = () => {
    if (isPending) return
    setArchiveReason('')
    setShowArchiveForm(false)
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
      const filePath = `contracts-cs/refunds/${contractId}/${refund.id}/admin-signed-${timestamp}.${ext}`
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, adminFile)
      const adminDocumentUrl = await getDownloadURL(storageRef)

      const admin = await getAdminById(user.uid)
      const approvedByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : user.uid

      await updateRefund(contractId, refund.id, {
        status: 'APPROVED',
        approvedBy: user.uid,
        approvedByName,
        approvedAt: new Date(),
        adminDocumentUrl,
      })

      toast.success('Demande de remboursement approuvée')
      queryClient.invalidateQueries({ queryKey: ['refundsCS', contractId] })
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur validation remboursement CS:', err)
      toast.error(err?.message || 'Erreur lors de la validation')
    } finally {
      setIsValidating(false)
    }
  }

  const handleArchive = async () => {
    if (!user?.uid || !archiveReason.trim()) return
    setIsArchiving(true)
    try {
      const admin = await getAdminById(user.uid)
      const archivedByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : user.uid

      await updateRefund(contractId, refund.id, {
        status: 'ARCHIVED',
        archivedBy: user.uid,
        archivedByName,
        archiveReason: archiveReason.trim(),
      })

      toast.success('Demande de remboursement archivée')
      queryClient.invalidateQueries({ queryKey: ['refundsCS', contractId] })
      setArchiveReason('')
      setShowArchiveForm(false)
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur archivage remboursement CS:', err)
      toast.error(err?.message || "Erreur lors de l'archivage")
    } finally {
      setIsArchiving(false)
    }
  }

  const createdAt = refund?.createdAt instanceof Date ? refund.createdAt : refund?.createdAt ? new Date(refund.createdAt) : null
  const primaryDocUrl = refund?.documentUrl ?? refund?.proofUrl

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
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant total</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{refund?.withdrawalAmount ? formatAmount(refund.withdrawalAmount) : '—'}</span>
              </div>
              {(refund?.amountNominal > 0 || refund?.amountBonus > 0) && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Détail</span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {refund.amountNominal > 0 && `${formatAmount(refund.amountNominal)} nominal`}
                    {refund.amountBonus > 0 && ` + ${formatAmount(refund.amountBonus)} bonus`}
                  </span>
                </div>
              )}
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
          {primaryDocUrl && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Document signé (membre)</p>
              </div>
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Document soumis par le membre</p>
                <div className="flex items-center gap-2">
                  <a
                    href={primaryDocUrl}
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

          {/* Formulaire d'archivage */}
          {showArchiveForm && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Motif d'archivage</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <Textarea
                  placeholder="Expliquez pourquoi la demande est archivée (min. 10 caractères)..."
                  rows={3}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowArchiveForm(false); setArchiveReason('') }}
                    disabled={isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-gray-400 text-gray-700 hover:bg-gray-100"
                    disabled={isPending || archiveReason.trim().length < 10}
                    onClick={() => void handleArchive()}
                  >
                    {isArchiving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    <Archive className="h-3.5 w-3.5" />
                    Confirmer l'archivage
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
          {!showArchiveForm && (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-100"
                disabled={isPending}
                onClick={() => setShowArchiveForm(true)}
              >
                <Archive className="h-4 w-4" />
                Archiver
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
