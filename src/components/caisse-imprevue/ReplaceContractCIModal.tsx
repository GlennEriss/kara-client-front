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
import { useContractCIMutations } from '@/domains/financial/caisse-imprevue/hooks/useContractCIMutations'
import { toast } from 'sonner'
import type { ContractCI } from '@/types/types'

interface ReplaceContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
  onSuccess?: () => void
}

export default function ReplaceContractCIModal({
  isOpen,
  onClose,
  contract,
  onSuccess,
}: ReplaceContractCIModalProps) {
  const [replaceFile, setReplaceFile] = useState<File | undefined>()
  const { replaceContractDocument } = useContractCIMutations()

  useEffect(() => {
    if (isOpen) {
      setReplaceFile(undefined)
    }
  }, [isOpen, contract])

  const handleSubmit = async () => {
    if (!contract || !replaceFile) {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }
    if (replaceFile.type !== 'application/pdf') {
      toast.error('Le fichier doit être un PDF')
      return
    }
    try {
      await replaceContractDocument.mutateAsync({ contractId: contract.id, file: replaceFile })
      onSuccess?.()
      onClose()
    } catch {
      // Erreur gérée par le hook
    }
  }

  if (!contract) return null

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
              <strong>Contrat :</strong> {contract.memberFirstName} {contract.memberLastName} (#{contract.id.slice(-8)})
            </p>
          </div>
          <div>
            <Label htmlFor="replace-file" className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Nouveau fichier du contrat (PDF) *
            </Label>
            <Input
              id="replace-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setReplaceFile(file)
              }}
              disabled={replaceContractDocument.isPending}
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
            disabled={replaceContractDocument.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!replaceFile || replaceContractDocument.isPending}
            className="bg-[#234D65] hover:bg-[#2c5a73]"
          >
            {replaceContractDocument.isPending ? (
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
