'use client'

import React, { useState, useCallback } from 'react'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useGenererIdentifiant } from '@/domains/memberships/hooks/useGenererIdentifiant'
import { IdentifiantsMembrePDF } from '@/domains/memberships/components/IdentifiantsMembrePDF'
import { pdf } from '@react-pdf/renderer'

export interface GenererIdentifiantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  matricule: string
}

function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function GenererIdentifiantModal({
  open,
  onOpenChange,
  memberId,
  matricule,
}: GenererIdentifiantModalProps) {
  const [matriculeSaisi, setMatriculeSaisi] = useState('')

  const {
    submitGenererIdentifiant,
    isLoading,
    error,
    resetError,
  } = useGenererIdentifiant({
    memberId,
    matricule,
    onSuccess: async (pdfData) => {
      try {
        const blob = await pdf(
          <IdentifiantsMembrePDF data={pdfData} />
        ).toBlob()
        const filename = `identifiants-${pdfData.matricule.replace(/\s+/g, '-')}.pdf`
        downloadPdfBlob(blob, filename)
        toast.success('Mot de passe réinitialisé', {
          description: 'Le PDF des identifiants a été téléchargé.',
        })
        onOpenChange(false)
        setMatriculeSaisi('')
      } catch (e) {
        toast.error('Erreur lors de la génération du PDF', {
          description: e instanceof Error ? e.message : undefined,
        })
      }
    },
  })

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setMatriculeSaisi('')
        resetError()
      }
      onOpenChange(next)
    },
    [onOpenChange, resetError]
  )

  const isMatriculeValid = matriculeSaisi.trim() === matricule
  const handleSubmit = () => {
    if (!isMatriculeValid || isLoading) return
    submitGenererIdentifiant(matriculeSaisi.trim())
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="generer-identifiant-modal"
        onPointerDownOutside={(e) => isLoading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe du membre</DialogTitle>
          <DialogDescription>
            Le mot de passe du membre sera remplacé par son matricule. Recopiez
            le matricule ci-dessous pour confirmer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Matricule du membre</Label>
            <Input
              readOnly
              value={matricule}
              className="bg-muted font-mono"
              data-testid="generer-identifiant-matricule-display"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricule-confirm">
              Recopiez le matricule du membre *
            </Label>
            <Input
              id="matricule-confirm"
              value={matriculeSaisi}
              onChange={(e) => setMatriculeSaisi(e.target.value)}
              placeholder="Coller ou saisir le matricule"
              className="font-mono"
              disabled={isLoading}
              data-testid="generer-identifiant-matricule-input"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-testid="generer-identifiant-error"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            data-testid="generer-identifiant-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isMatriculeValid || isLoading}
            className="bg-kara-primary-dark text-white hover:bg-kara-primary-dark/90 disabled:bg-kara-primary-dark/50 disabled:text-white/70"
            data-testid="generer-identifiant-submit"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                En cours…
              </>
            ) : (
              'Accepter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
