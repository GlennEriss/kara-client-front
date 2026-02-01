'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, FileText } from 'lucide-react'
import { CreditContract } from '@/types/types'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPE = 'application/pdf'

interface SignedQuittanceUploadModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  onUpload: (file: File) => Promise<void>
  isPending?: boolean
}

export default function SignedQuittanceUploadModal({
  isOpen,
  onClose,
  contract,
  onUpload,
  isPending = false,
}: SignedQuittanceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      return
    }
    if (selectedFile.type !== ACCEPTED_TYPE) {
      setError('Le fichier doit être un PDF')
      setFile(null)
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Le fichier ne doit pas dépasser 5 MB')
      setFile(null)
      return
    }
    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Veuillez sélectionner un fichier PDF')
      return
    }
    try {
      await onUpload(file)
      setFile(null)
      setError(null)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du téléversement')
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Téléverser la quittance signée</DialogTitle>
          <DialogDescription>
            Sélectionnez le PDF de la quittance signée par le membre {contract.clientFirstName} {contract.clientLastName}.
            Taille max : 5 MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept={ACCEPTED_TYPE}
                onChange={handleFileChange}
                disabled={isPending}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || !file}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Téléversement...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Téléverser
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
