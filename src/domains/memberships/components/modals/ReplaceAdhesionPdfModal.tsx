'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useReplaceAdhesionPdf } from '../../hooks/useReplaceAdhesionPdf'
import type { MembershipRequest } from '../../entities'

interface ReplaceAdhesionPdfModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
  adminId: string
  onSuccess?: () => void
}

export function ReplaceAdhesionPdfModal({
  isOpen,
  onClose,
  request,
  adminId,
  onSuccess,
}: ReplaceAdhesionPdfModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { replaceAdhesionPdf, isReplacing } = useReplaceAdhesionPdf()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected?.type === 'application/pdf') {
      setFile(selected)
    } else if (selected) {
      setFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    try {
      await replaceAdhesionPdf({ requestId: request.id, adminId, file })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onSuccess?.()
      onClose()
    } catch {
      // Toast géré dans le hook
    }
  }

  const handleClose = () => {
    if (!isReplacing) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="replace-adhesion-pdf-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Remplacer le PDF d&apos;adhésion
          </DialogTitle>
          <DialogDescription>
            Demande <span className="font-mono font-medium">{request.matricule}</span> — PDF déjà validé.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription>
            Le remplacement sera effectif immédiatement. L&apos;ancien PDF restera archivé dans l&apos;historique.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Choisir un nouveau PDF</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
            data-testid="replace-adhesion-pdf-input"
          />
          {file && (
            <p className="text-xs text-gray-500">
              {file.name} ({(file.size / 1024).toFixed(1)} Ko)
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isReplacing}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isReplacing}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="replace-adhesion-pdf-submit"
          >
            {isReplacing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Remplacement…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Confirmer et remplacer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
