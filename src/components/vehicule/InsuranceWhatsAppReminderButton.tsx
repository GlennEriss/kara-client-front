'use client'

import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateWhatsAppUrl } from '@/domains/memberships/utils/whatsappUrl'
import { getInsuranceHolderPhone, insuranceReminderTemplate } from '@/utils/vehicule/insuranceReminder'
import { useRenderMessageTemplate } from '@/domains/messaging/hooks/useMessageTemplates'
import type { VehicleInsurance } from '@/types/types'

interface Props {
  insurance: VehicleInsurance
  /** Bouton icône compact (pour les lignes de tableau) ou bouton avec libellé. */
  iconOnly?: boolean
  className?: string
}

/**
 * Bouton « Rappel WhatsApp » : ouvre WhatsApp (wa.me) avec un message pré-rempli
 * rappelant au titulaire l'échéance de son assurance véhicule. Désactivé s'il n'y
 * a pas de numéro exploitable.
 */
export function InsuranceWhatsAppReminderButton({ insurance, iconOnly = false, className }: Props) {
  const phone = getInsuranceHolderPhone(insurance)
  const disabled = !phone
  // Texte personnalisable dans Système → Modèles de messages.
  const renderMessage = useRenderMessageTemplate()

  const handleClick = () => {
    if (!phone) {
      toast.error('Aucun numéro de téléphone pour ce titulaire')
      return
    }
    try {
      const { key, variables } = insuranceReminderTemplate(insurance)
      const url = generateWhatsAppUrl(phone, renderMessage(key, variables))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Numéro de téléphone invalide')
    }
  }

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        title={disabled ? 'Aucun numéro disponible' : 'Envoyer un rappel WhatsApp'}
        className={className}
      >
        <MessageCircle className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-green-600'}`} />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? 'Aucun numéro disponible' : undefined}
      className={`border-green-200 text-green-700 hover:bg-green-50 ${className ?? ''}`}
    >
      <MessageCircle className="mr-1 h-3.5 w-3.5" />
      Rappel WhatsApp
    </Button>
  )
}
