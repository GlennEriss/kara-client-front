'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Loader2 } from 'lucide-react'
import { useReplaceContractPdf } from '@/domains/financial/caisse-speciale/contrats/hooks'
import { toast } from 'sonner'
import type { CaisseContract } from '@/types/types'

interface ReplaceCaisseSpecialeContractPdfModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CaisseContract | null
  onSuccess?: () => void
}

export default function ReplaceCaisseSpecialeContractPdfModal({
  isOpen,
  onClose,
  contract,
  onSuccess,
}: ReplaceCaisseSpecialeContractPdfModalProps) {
  const [replaceFile, setReplaceFile] = useState<File | undefined>()
  const replaceContractPdf = useReplaceContractPdf()

  useEffect(() => {
    if (isOpen) {
      setReplaceFile(undefined)
    }
  }, [isOpen, contract])

  const handleSubmit = async () => {
    if (!contract?.id || !replaceFile) {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }
    if (replaceFile.type !== 'application/pdf') {
      toast.error('Le fichier doit être un PDF')
      return
    }
    try {
      await replaceContractPdf.mutateAsync({ contractId: contract.id, file: replaceFile })
      onSuccess?.()
      onClose()
    } catch {
      // Erreur gérée par le hook (toast)
    }
  }

  if (!contract) return null

  const contractShortId = contract.id ? String(contract.id).slice(-8) : ''

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modifier le contrat
          </DialogTitle>
          <DialogDescription>
            Le fichier précédent sera remplacé par le nouveau PDF. Le statut du contrat ne change pas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Contrat :</strong> #{contractShortId}
            </p>
          </div>
          <div>
            <Label htmlFor="replace-cs-file" className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Nouveau fichier du contrat (PDF) *
            </Label>
            <Input
              id="replace-cs-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setReplaceFile(file)
              }}
              disabled={replaceContractPdf.isPending}
            />
            {replaceFile && (
              <div className="mt-2 text-sm text-gray-600">
                Fichier sélectionné : {replaceFile.name} ({(replaceFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setReplaceFile(undefined)
              onClose()
            }}
            disabled={replaceContractPdf.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!replaceFile || replaceContractPdf.isPending}
            className="bg-[#234D65] hover:bg-[#2c5a73]"
          >
            {replaceContractPdf.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Remplacement en cours...
              </>
            ) : (
              'Remplacer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
