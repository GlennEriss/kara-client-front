'use client'

/**
 * Téléversement de la fiche d'adhésion (PDF) pour un membre qui n'en a pas encore
 * (typiquement les membres importés). Le PDF est enregistré sur :
 *  - l'abonnement (lu par la carte membre),
 *  - le document membre (fallback universel, même sans abonnement),
 *  - la demande d'adhésion / dossier (vue « PDF d'adhésion validé »), best-effort.
 */

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { createFile } from '@/db/upload-image.db'
import { updateSubscription } from '@/db/subscription.db'
import { updateUser } from '@/db/user.db'
import { invalidateAppStats } from '@/lib/invalidateAppStats'
import type { MemberWithSubscription } from '@/db/member.db'

interface UploadMemberAdhesionPdfModalProps {
  isOpen: boolean
  onClose: () => void
  member: MemberWithSubscription | null
  adminId: string
}

export function UploadMemberAdhesionPdfModal({
  isOpen,
  onClose,
  member,
  adminId,
}: UploadMemberAdhesionPdfModalProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (uploading) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!file || !member?.id) return
    setUploading(true)
    try {
      // 1) Upload du PDF dans le storage.
      const { url } = await createFile(file, member.id, `membership-adhesion-pdfs/${member.id}`)

      // 2) Abonnement (lu par la carte membre), si présent.
      const subscriptionId = member.lastSubscription?.id
      if (subscriptionId) {
        await updateSubscription(subscriptionId, { adhesionPdfURL: url })
      }

      // 3) Document membre (fallback universel, même sans abonnement).
      await updateUser(member.id, { adhesionPdfURL: url })

      // 4) Demande d'adhésion / dossier (vue « PDF d'adhésion validé ») — best-effort.
      const requestId = member.dossier
      if (requestId) {
        try {
          const { db, doc, updateDoc, serverTimestamp } = await import('@/firebase/firestore')
          await updateDoc(doc(db, 'membership-requests', requestId), {
            adhesionPdfURL: url,
            adhesionPdfUpdatedBy: adminId,
            updatedAt: serverTimestamp(),
          })
        } catch {
          // non bloquant : la fiche membre fonctionne déjà via l'abonnement/le membre
        }
      }

      invalidateAppStats(queryClient)
      toast.success('Fiche d’adhésion enregistrée', {
        description: 'Le PDF est désormais consultable pour ce membre.',
      })
      reset()
      onClose()
    } catch (e) {
      toast.error('Échec du téléversement', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    setFile(selected?.type === 'application/pdf' ? selected : null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent className="sm:max-w-md" data-testid="upload-member-adhesion-pdf-modal">
        <ModalHeader
          icon={FileText}
          tone="success"
          title="Téléverser la fiche d'adhésion"
          description={
            member ? (
              <>
                Membre <span className="font-mono font-medium">{member.matricule}</span> — aucun PDF
                d'adhésion pour le moment. Choisissez le document à enregistrer.
              </>
            ) : (
              'Choisissez le document à enregistrer.'
            )
          }
        />

        <ModalBody>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Fichier PDF</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
            data-testid="upload-member-adhesion-pdf-input"
          />
          {file && (
            <p className="text-xs text-gray-500">
              {file.name} ({(file.size / 1024).toFixed(1)} Ko)
            </p>
          )}
        </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
          <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="upload-member-adhesion-pdf-submit"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Téléversement…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Enregistrer
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
