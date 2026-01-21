/**
 * Modal pour envoyer le motif de rejet via WhatsApp V2
 * 
 * Permet de sélectionner un numéro de téléphone et d'ouvrir WhatsApp
 * avec un message pré-rempli contenant le motif de rejet.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Loader2, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { generateRejectionWhatsAppUrl, generateWhatsAppUrl } from '../../utils/whatsappUrl'

interface RejectWhatsAppModalV2Props {
  isOpen: boolean
  onClose: () => void
  phoneNumbers: string[] // Liste des numéros disponibles
  memberName: string // Nom complet du demandeur
  firstName: string // Prénom du demandeur
  matricule: string // Matricule de la demande
  motifReject: string // Motif de rejet (prérempli dans le template)
  requestId: string // ID de la demande
  isLoading?: boolean
}

/**
 * Génère le message template initial pour le rejet
 */
function generateTemplateMessage(
  firstName: string,
  matricule: string,
  motifReject: string
): string {
  return `Bonjour ${firstName},

Votre demande d'adhésion KARA (matricule: ${matricule}) a été rejetée.

Motif de rejet:
${motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle`
}

export function RejectWhatsAppModalV2({
  isOpen,
  onClose,
  phoneNumbers,
  memberName,
  firstName,
  matricule,
  motifReject,
  requestId,
  isLoading = false,
}: RejectWhatsAppModalV2Props) {
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  // Initialiser avec le premier numéro et le message template
  useEffect(() => {
    if (phoneNumbers.length > 0 && !selectedPhone) {
      setSelectedPhone(phoneNumbers[0])
    }
    if (!message) {
      setMessage(generateTemplateMessage(firstName, matricule, motifReject))
    }
  }, [phoneNumbers, firstName, matricule, motifReject])

  const hasMultiplePhones = phoneNumbers.length > 1
  const canSend = selectedPhone.trim().length > 0 && message.trim().length > 0 && !isLoading

  const handleSend = () => {
    if (!canSend || !selectedPhone) return

    try {
      // Utiliser le message modifié si fourni, sinon utiliser le template
      const finalMessage = message.trim() || generateTemplateMessage(firstName, matricule, motifReject)
      
      // Si le message a été modifié par rapport au template, utiliser generateWhatsAppUrl
      // Sinon utiliser generateRejectionWhatsAppUrl pour le template
      const templateMessage = generateTemplateMessage(firstName, matricule, motifReject)
      const isModified = message.trim() !== templateMessage
      
      const url = isModified
        ? generateWhatsAppUrl(selectedPhone, finalMessage)
        : generateRejectionWhatsAppUrl(selectedPhone, firstName, matricule, motifReject)
      
      // Ouvrir WhatsApp dans un nouvel onglet
      window.open(url, '_blank', 'noopener,noreferrer')
      
      // Fermer le modal après un court délai
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error: any) {
      console.error('Erreur lors de la génération de l\'URL WhatsApp:', error)
      // L'erreur sera gérée par le composant parent via toast
      throw error
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedPhone('')
      setMessage('')
      onClose()
    }
  }

  if (phoneNumbers.length === 0) {
    return null // Ne pas afficher le modal si aucun numéro disponible
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] sm:w-full" data-testid="reject-whatsapp-modal">
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="reject-whatsapp-modal-title"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="break-words">Envoyer le motif de rejet via WhatsApp</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2" data-testid="reject-whatsapp-modal-description">
            Un message WhatsApp sera envoyé à <strong>{memberName}</strong> avec le motif de rejet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Sélection du numéro */}
          {hasMultiplePhones ? (
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="reject-whatsapp-modal-phone-label">
                Sélectionner le numéro WhatsApp <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPhone}
                onValueChange={setSelectedPhone}
                disabled={isLoading}
                data-testid="reject-whatsapp-modal-phone-select"
              >
                <SelectTrigger id="phone" className="text-sm">
                  <SelectValue placeholder="Sélectionner un numéro" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => (
                    <SelectItem key={phone} value={phone} className="text-sm">
                      {phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-kara-primary-dark">
                Numéro WhatsApp
              </Label>
              <div className="rounded-md bg-gray-50 p-3 text-xs sm:text-sm font-mono break-all" data-testid="reject-whatsapp-modal-phone-display">
                {phoneNumbers[0]}
              </div>
            </div>
          )}

          {/* Message modifiable */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="reject-whatsapp-modal-message-label">
              Message (modifiable) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              data-testid="reject-whatsapp-modal-message-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message à envoyer..."
              disabled={isLoading}
              rows={8}
              className="resize-none font-mono text-xs sm:text-sm min-h-[200px] sm:min-h-[250px]"
            />
            <p className="text-xs text-gray-500 break-words">
              Vous pouvez modifier le message avant de l'envoyer.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 pt-2 sm:pt-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto border-gray-300 text-sm"
            data-testid="reject-whatsapp-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm"
            data-testid="reject-whatsapp-modal-send-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Envoi en cours...</span>
                <span className="sm:hidden">En cours...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-1 sm:mr-2" />
                <ExternalLink className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                <span className="hidden sm:inline">Envoyer via WhatsApp</span>
                <span className="sm:hidden">Envoyer WhatsApp</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
