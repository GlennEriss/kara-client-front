/**
 * Bloc complet pour afficher les corrections demandées V2
 * 
 * Affiche :
 * - Liste des corrections
 * - Section "Accès corrections" avec lien, code, boutons rapides
 * 
 * Suit le feedback des testeurs : actions corrections directement accessibles
 */

'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  AlertCircle, 
  FileText, 
  Link as LinkIcon, 
  Copy, 
  Eye, 
  EyeOff,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface CorrectionsBlockV2Props {
  reviewNote?: string
  securityCode?: string
  securityCodeExpiry?: Date | string
  requestId: string
  processedByName?: string
  processedByMatricule?: string
  
  // Callbacks pour les actions
  onCopyLink?: () => void
  onSendWhatsApp?: () => void
  onRenewCode?: () => void
  
  className?: string
}

/**
 * Formate le code de sécurité (AB12-CD34)
 */
function formatSecurityCode(code: string): string {
  if (!code || code.length !== 6) return code
  return `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4, 6)}`
}

/**
 * Calcule le temps restant jusqu'à l'expiration (format: HH:MM:SS)
 */
function getTimeRemaining(expiryDate: Date | string): string {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  
  if (diff <= 0) return '00:00:00'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
 * Vérifie si le code est expiré
 */
function isCodeExpired(expiryDate: Date | string): boolean {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  return expiry.getTime() <= new Date().getTime()
}

export function CorrectionsBlockV2({
  reviewNote,
  securityCode,
  securityCodeExpiry,
  requestId,
  processedByName,
  processedByMatricule,
  onCopyLink,
  onSendWhatsApp,
  onRenewCode,
  className,
}: CorrectionsBlockV2Props) {
  const [isCodeVisible, setIsCodeVisible] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  // Mettre à jour le compte à rebours toutes les secondes
  useEffect(() => {
    if (!securityCodeExpiry) return

    const updateTimer = () => {
      const remaining = getTimeRemaining(securityCodeExpiry)
      setTimeRemaining(remaining)
      setIsExpired(isCodeExpired(securityCodeExpiry))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [securityCodeExpiry])

  if (!reviewNote) {
    return null
  }

  // Séparer les corrections (une par ligne)
  const corrections = reviewNote.split('\n').filter(line => line.trim().length > 0)

  // Générer le lien de correction
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const correctionLink = `${baseUrl}/register?requestId=${requestId}${securityCode ? `&code=${securityCode}` : ''}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(correctionLink)
      toast.success('Lien copié !', {
        description: 'Le lien de correction a été copié dans le presse-papiers.',
      })
      onCopyLink?.()
    } catch (error) {
      toast.error('Erreur lors de la copie', {
        description: 'Impossible de copier le lien. Veuillez le copier manuellement.',
      })
    }
  }

  const handleCopyCode = async () => {
    if (!securityCode) return
    try {
      await navigator.clipboard.writeText(securityCode)
      toast.success('Code copié !', {
        description: 'Le code de sécurité a été copié dans le presse-papiers.',
      })
    } catch (error) {
      toast.error('Erreur lors de la copie', {
        description: 'Impossible de copier le code.',
      })
    }
  }

  const formattedCode = securityCode ? formatSecurityCode(securityCode) : ''
  const displayCode = isCodeVisible ? formattedCode : '••••••'

  return (
    <Alert
      className={cn(
        'bg-amber-50 border-amber-200 text-amber-900 rounded-lg transition-all duration-200',
        className
      )}
      data-testid="corrections-block"
      data-request-id={requestId}
    >
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="mt-2 space-y-4">
        {/* Liste des corrections */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="font-semibold text-sm" data-testid="corrections-block-title">
              Corrections demandées :
            </p>
          </div>
          <ul 
            className="space-y-1 list-disc list-inside text-sm"
            data-testid="corrections-block-list"
          >
            {corrections.map((correction, index) => (
              <li key={index} data-testid={`correction-item-${index}`}>
                {correction.trim()}
              </li>
            ))}
          </ul>
        </div>

        {/* Section "Accès corrections" */}
        {(securityCode || onCopyLink || onSendWhatsApp || onRenewCode) && (
          <div className="pt-3 border-t border-amber-200 space-y-3">
            <p className="font-semibold text-sm" data-testid="corrections-access-title">
              Accès corrections
            </p>

            {/* A. Lien de correction */}
            {onCopyLink && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-amber-700">Lien de correction</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-md text-xs font-mono truncate">
                    {correctionLink.length > 50 
                      ? `${correctionLink.slice(0, 47)}...` 
                      : correctionLink}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-9 px-3 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    data-testid="corrections-block-copy-link-button"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copier
                  </Button>
                </div>
              </div>
            )}

            {/* B. Code de sécurité */}
            {securityCode && (
              <div className="space-y-1.5" data-testid="corrections-block-code">
                <label className="text-xs font-medium text-amber-700">Code de sécurité</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-md text-xs font-mono font-semibold flex items-center gap-2">
                    <span data-testid="corrections-block-code-value">{displayCode}</span>
                    {isExpired && (
                      <span className="text-xs text-red-600 font-normal">(Expiré)</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCodeVisible(!isCodeVisible)}
                    className="h-9 w-9 p-0 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    data-testid="corrections-block-toggle-code-button"
                    title={isCodeVisible ? 'Masquer le code' : 'Afficher le code'}
                  >
                    {isCodeVisible ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-9 w-9 p-0 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    data-testid="corrections-block-copy-code-button"
                    title="Copier le code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {securityCodeExpiry && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-600" data-testid="corrections-block-expiry">
                      <span>Expire dans </span>
                      <span 
                        className={cn(
                          'font-mono font-semibold',
                          isExpired && 'text-red-600'
                        )}
                        data-testid="corrections-block-expiry-remaining"
                      >
                        {isExpired ? 'Expiré' : timeRemaining}
                      </span>
                    </span>
                    {onRenewCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRenewCode}
                        className="h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        data-testid="corrections-block-renew-code-button"
                        title="Régénérer le code"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Régénérer
                      </Button>
                    )}
                  </div>
                )}
                {securityCodeExpiry && (
                  <div className="text-xs text-amber-500" data-testid="corrections-block-expiry-value">
                    Jusqu'à {formatExpiryDate(securityCodeExpiry)}
                  </div>
                )}
              </div>
            )}

            {/* C. CTA Principal : WhatsApp */}
            {onSendWhatsApp && (
              <Button
                onClick={onSendWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 font-medium"
                data-testid="corrections-block-send-whatsapp-button"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Envoyer via WhatsApp
              </Button>
            )}

            {/* Informations supplémentaires */}
            {(processedByName || processedByMatricule) && (
              <div className="text-xs text-amber-600 pt-1 border-t border-amber-200" data-testid="corrections-block-requested-by">
                <span>Demandé par: </span>
                {processedByName && (
                  <span data-testid="corrections-block-requested-by-value">
                    {processedByName}
                  </span>
                )}
                {processedByMatricule && (
                  <span data-testid="corrections-block-requested-by-matricule">
                    {' '}({processedByMatricule})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
