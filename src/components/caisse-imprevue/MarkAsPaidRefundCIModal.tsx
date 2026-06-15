'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAdminById } from '@/db/admin.db'
import { updateRefundCI } from '@/db/caisse/refunds.db'
import { getStorageInstance } from '@/firebase/storage'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { AlertTriangle, CheckCircle, Loader2, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface MarkAsPaidRefundCIModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  refundId: string
  refundLabel: string
  onSuccess?: () => void | Promise<void>
  userId: string
}

const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxSizeMB = 20

export default function MarkAsPaidRefundCIModal({
  isOpen,
  onClose,
  contractId,
  refundId,
  refundLabel,
  onSuccess,
  userId,
}: MarkAsPaidRefundCIModalProps) {
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setPaymentProofFile(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!validImageTypes.includes(file.type)) {
        toast.error('Le fichier doit être une image (JPEG, PNG, WebP)')
        e.target.value = ''
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`La taille ne doit pas dépasser ${maxSizeMB} MB`)
        e.target.value = ''
        return
      }
      setPaymentProofFile(file)
    } else {
      setPaymentProofFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!paymentProofFile) {
      toast.error('Veuillez téléverser la preuve de paiement')
      return
    }

    setIsSubmitting(true)
    try {
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const ext = paymentProofFile.name.split('.').pop() || 'jpg'
      const filePath = `contracts-ci/refunds/${contractId}/${refundId}/payment-proof-${timestamp}.${ext}`
      const storageRef = ref(storage, filePath)

      await uploadBytes(storageRef, paymentProofFile)
      const downloadURL = await getDownloadURL(storageRef)

      const admin = await getAdminById(userId)
      const paidByName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : undefined

      await updateRefundCI(contractId, refundId, {
        status: 'PAID',
        paidAt: new Date(),
        paidBy: userId,
        paidByName: paidByName || userId,
        paymentProofUrl: downloadURL,
        paymentProofPath: filePath,
      })

      toast.success('Remboursement marqué comme payé')
      handleClose()
      await onSuccess?.()
    } catch (err: any) {
      console.error('Erreur:', err)
      toast.error(err?.message || 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = paymentProofFile !== null

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      size="md"
      icon={CheckCircle}
      tone="success"
      title="Marquer comme payé"
      description={`${refundLabel} — Téléversez la preuve de paiement et confirmez l'opération.`}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmer et marquer comme payé
              </>
            )}
          </Button>
        </>
      }
    >
      <div>
            <Label htmlFor="paymentProof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4" />
              Preuve de paiement * (Image uniquement, max {maxSizeMB} MB)
            </Label>
            <Input
              id="paymentProof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePaymentProofChange}
              disabled={isSubmitting}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {paymentProofFile && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md mt-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{paymentProofFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(paymentProofFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Voulez-vous marquer ce remboursement comme payé ? Cette action confirme que le versement a bien été effectué au membre.
            </AlertDescription>
          </Alert>
      </Modal>
  )
}
