/**
 * Modal pour envoyer le lien de correction via WhatsApp V2
 * 
 * Permet de sélectionner un numéro de téléphone et d'ouvrir WhatsApp
 * avec un message pré-rempli contenant le lien de correction, le code et l'expiration.
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
import { MessageSquare, Loader2, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { generateWhatsAppUrl } from '../../utils/whatsappUrl'

interface SendWhatsAppModalV2Props {
  isOpen: boolean
  onClose: () => void
  phoneNumbers: string[] // Liste des numéros disponibles
  correctionLink: string // Lien de correction (ex: /register?requestId=XXX&code=123456)
  securityCode: string // Code de sécurité (6 chiffres)
  securityCodeExpiry: Date | string // Date d'expiration
  memberName: string
  isLoading?: boolean
}

/**
 * Formate le code de sécurité (AB12-CD34)
 */
function formatSecurityCode(code: string): string {
  if (!code || code.length !== 6) return code
  return `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4, 6)}`
}

/**
 * Calcule le temps restant jusqu'à l'expiration
 */
function getTimeRemaining(expiryDate: Date | string): string {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  
  if (diff <= 0) return 'expiré'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days}j ${hours}h`
  }
  return `${hours}h`
}

/**
 * Formate la date d'expiration
 */
function formatExpiryDate(expiryDate: Date | string): string {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  return expiry.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Génère le message WhatsApp avec le lien, le code et l'expiration
 */
function generateWhatsAppMessage(
  correctionLink: string,
  securityCode: string,
  securityCodeExpiry: Date | string
): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const fullLink = `${baseUrl}${correctionLink}`
  const formattedCode = formatSecurityCode(securityCode)
  const expiryDate = formatExpiryDate(securityCodeExpiry)
  const timeRemaining = getTimeRemaining(securityCodeExpiry)
  
  return `Bonjour,

Vous avez reçu une demande de correction pour votre demande d'adhésion.

Lien de correction : ${fullLink}
Code de sécurité : ${formattedCode}
Expire le : ${expiryDate} (reste ${timeRemaining})

Veuillez utiliser ce lien et ce code pour accéder à votre formulaire et apporter les corrections demandées.

Cordialement,
Équipe KARA`
}

export function SendWhatsAppModalV2({
  isOpen,
  onClose,
  phoneNumbers,
  correctionLink,
  securityCode,
  securityCodeExpiry,
  memberName,
  isLoading = false,
}: SendWhatsAppModalV2Props) {
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  
  // Initialiser avec le premier numéro si un seul disponible
  useEffect(() => {
    if (phoneNumbers.length === 1) {
      setSelectedPhone(phoneNumbers[0])
    } else if (phoneNumbers.length > 0 && !selectedPhone) {
      setSelectedPhone(phoneNumbers[0])
    }
  }, [phoneNumbers, selectedPhone])

  const hasMultiplePhones = phoneNumbers.length > 1
  const canSend = selectedPhone.trim().length > 0 && !isLoading

  const handleSend = () => {
    if (!canSend || !selectedPhone) return

    try {
      const message = generateWhatsAppMessage(
        correctionLink,
        securityCode,
        securityCodeExpiry
      )
      const whatsappUrl = generateWhatsAppUrl(selectedPhone, message)
      
      // Ouvrir WhatsApp dans un nouvel onglet
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      
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
      onClose()
    }
  }

  if (phoneNumbers.length === 0) {
    return null // Ne pas afficher le modal si aucun numéro disponible
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="whatsapp-modal">
        <DialogHeader>
          <DialogTitle 
            className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark"
            data-testid="whatsapp-modal-title"
          >
            <MessageSquare className="w-5 h-5 text-green-600" />
            Envoyer via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Sélectionnez le numéro de téléphone pour envoyer le lien de correction à {memberName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sélection du numéro */}
          <div className="space-y-2">
            <Label htmlFor="phone-select" className="text-sm font-semibold text-kara-primary-dark">
              Numéro de téléphone <span className="text-red-500">*</span>
            </Label>
            {hasMultiplePhones ? (
              <Select
                value={selectedPhone}
                onValueChange={setSelectedPhone}
                disabled={isLoading}
                data-testid="whatsapp-modal-phone-select"
              >
                <SelectTrigger 
                  id="phone-select" 
                  className="w-full"
                  data-testid="whatsapp-modal-phone-select-trigger"
                >
                  <SelectValue placeholder="Sélectionnez un numéro" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone, index) => (
                    <SelectItem 
                      key={index} 
                      value={phone}
                      data-testid={`whatsapp-modal-phone-option-${index}`}
                    >
                      {phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div 
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
                data-testid="whatsapp-modal-single-phone"
              >
                {phoneNumbers[0]}
              </div>
            )}
          </div>

          {/* Aperçu du message */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-kara-primary-dark">
              Aperçu du message
            </Label>
            <div 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto"
              data-testid="whatsapp-modal-message-preview"
            >
              {generateWhatsAppMessage(correctionLink, securityCode, securityCodeExpiry)}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
            data-testid="whatsapp-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="whatsapp-modal-send-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
