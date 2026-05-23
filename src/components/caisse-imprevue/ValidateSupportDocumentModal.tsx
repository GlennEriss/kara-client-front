'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Loader2, Paperclip, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useValidateSupportDocument, useRejectSupportDocument } from '@/hooks/caisse-imprevue/useValidateSupportDocument'
import { SupportCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA'
}

interface Props {
  open: boolean
  onClose: () => void
  support: SupportCI
  contractId: string
}

export default function ValidateSupportDocumentModal({ open, onClose, support, contractId }: Props) {
  const { user } = useAuth()
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [adminFile, setAdminFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateMutation = useValidateSupportDocument(contractId)
  const rejectMutation = useRejectSupportDocument(contractId)

  const handleValidate = async () => {
    if (!user?.uid || !adminFile) return
    await validateMutation.mutateAsync({ supportId: support.id, adminId: user.uid, file: adminFile })
    onClose()
  }

  const handleReject = async () => {
    if (!user?.uid || !rejectionReason.trim()) return
    await rejectMutation.mutateAsync({ supportId: support.id, adminId: user.uid, rejectionReason: rejectionReason.trim() })
    setRejectionReason('')
    setShowRejectForm(false)
    onClose()
  }

  const isPending = validateMutation.isPending || rejectMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#234D65] p-2 shrink-0">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base">Validation document d'aide</DialogTitle>
              <DialogDescription className="mt-0.5">
                Document soumis par le membre — en attente de votre décision
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
          {/* Résumé de la demande */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Détails de la demande
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{formatAmount(support.amount)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Demandée le</span>
                <span className="text-sm text-gray-700">
                  {support.requestedAt ? format(support.requestedAt, 'd MMM yyyy', { locale: fr }) : '—'}
                </span>
              </div>
              {support.motif && (
                <div className="px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Motif</span>
                  <span className="text-sm text-gray-600 italic">« {support.motif} »</span>
                </div>
              )}
            </div>
          </div>

          {/* Document */}
          {support.documentUrl && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Document signé
                </p>
              </div>
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Document soumis par le membre</p>
                <a
                  href={support.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#234D65]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#234D65] hover:bg-[#234D65]/5 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ouvrir le document
                </a>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Motif du refus
                </p>
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
                    {rejectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirmer le refus
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
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
                {validateMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                Valider
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
