'use client'

import React, { useState, useCallback } from 'react'
import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2 } from 'lucide-react'
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
        toast.success('Identifiants générés', {
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
      <ModalContent
        className="sm:max-w-md"
        data-testid="generer-identifiant-modal"
        onPointerDownOutside={(e) => isLoading && e.preventDefault()}
      >
        <ModalHeader
          icon={KeyRound}
          title="Générer les identifiants de connexion"
          description="Un compte de connexion (email + mot de passe) est créé et activé pour le membre s'il n'en a pas encore, sinon son mot de passe est réinitialisé. Les identifiants sont fournis dans un PDF à lui remettre. Recopiez le matricule ci-dessous pour confirmer."
        />

        <ModalBody>
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
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
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
              'Générer les identifiants'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
