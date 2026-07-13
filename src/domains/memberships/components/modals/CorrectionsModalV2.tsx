/**
 * Modal de demande de corrections V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier.
 * Modal simplifié : uniquement textarea pour saisir les corrections.
 * L'envoi WhatsApp est géré séparément via SendWhatsAppModalV2 (action post-création).
 */

'use client'

import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileEdit, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface CorrectionsModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (corrections: string[]) => Promise<void>
  requestId: string
  memberName: string
  isLoading?: boolean
}

export function CorrectionsModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  isLoading = false,
}: CorrectionsModalV2Props) {
  const [correctionsText, setCorrectionsText] = useState('')

  const corrections = correctionsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  const isValid = corrections.length > 0
  const correctionsCount = corrections.length

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm(corrections)
  }

  const handleClose = () => {
    if (!isLoading) {
      setCorrectionsText('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[600px]" data-testid="corrections-modal">
        <ModalHeader
          icon={FileEdit}
          tone="warning"
          title={<span data-testid="corrections-modal-title">Demander des corrections</span>}
          description="Saisissez les corrections à apporter (une par ligne). Le demandeur recevra un code de sécurité pour accéder aux corrections."
        />

        <ModalBody>
          {/* Zone de saisie des corrections */}
          <div className="space-y-2">
            <Label htmlFor="corrections" className="text-sm font-semibold text-kara-primary-dark">
              Corrections à apporter <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="corrections"
              value={correctionsText}
              onChange={(e) => setCorrectionsText(e.target.value)}
              placeholder="Listez les corrections à apporter (une par ligne)&#10;&#10;Exemple :&#10;- Veuillez mettre à jour votre photo&#10;- Ajouter le numéro de téléphone&#10;- Corriger l'adresse"
              disabled={isLoading}
              rows={8}
              className="resize-none font-mono text-sm"
              data-testid="corrections-modal-textarea"
            />
            <p 
              className="text-xs text-gray-500"
              data-testid="corrections-modal-counter"
            >
              {correctionsCount === 0
                ? 'Ajoutez au moins une correction (une par ligne)'
                : `${correctionsCount} correction${correctionsCount > 1 ? 's' : ''} détectée${correctionsCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
            data-testid="corrections-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="corrections-modal-submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <FileEdit className="w-4 h-4 mr-2" />
                Demander les corrections
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
