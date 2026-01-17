/**
 * Modal de demande de corrections V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
 * Inclut le support WhatsApp
 */

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { FileEdit, Loader2, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CorrectionsModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    corrections: string[]
    sendWhatsApp?: boolean
  }) => Promise<{
    securityCode: string
    whatsAppUrl?: string
  } | undefined>
  requestId: string
  memberName: string
  phoneNumber?: string
  isLoading?: boolean
}

export function CorrectionsModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  phoneNumber,
  isLoading = false,
}: CorrectionsModalV2Props) {
  const [correctionsText, setCorrectionsText] = useState('')
  const [sendWhatsApp, setSendWhatsApp] = useState(false)

  const corrections = correctionsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  const isValid = corrections.length > 0

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    const result = await onConfirm({
      corrections,
      sendWhatsApp: sendWhatsApp && !!phoneNumber,
    })

    // Ouvrir WhatsApp si demandé
    if (result?.whatsAppUrl && sendWhatsApp) {
      window.open(result.whatsAppUrl, '_blank')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setCorrectionsText('')
      setSendWhatsApp(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark">
            <FileEdit className="w-5 h-5 text-amber-600" />
            Demander des corrections
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Vous êtes sur le point de demander des corrections pour la demande de <strong>{memberName}</strong>.
            Le demandeur recevra un code de sécurité pour accéder aux corrections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Liste des corrections */}
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
            />
            <p className="text-xs text-gray-500">
              {corrections.length === 0
                ? 'Ajoutez au moins une correction (une par ligne)'
                : `${corrections.length} correction${corrections.length > 1 ? 's' : ''} détectée${corrections.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Option WhatsApp */}
          {phoneNumber && (
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                id="sendWhatsApp"
                checked={sendWhatsApp}
                onCheckedChange={(checked) => setSendWhatsApp(checked === true)}
                disabled={isLoading}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="sendWhatsApp"
                  className="text-sm font-semibold text-blue-900 cursor-pointer flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Envoyer via WhatsApp
                </Label>
                <p className="text-xs text-blue-700">
                  Un lien WhatsApp sera généré pour envoyer les corrections directement au demandeur ({phoneNumber}).
                  Le code de sécurité sera inclus dans le message.
                </p>
              </div>
            </div>
          )}

          {!phoneNumber && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Aucun numéro de téléphone disponible pour l'envoi WhatsApp.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
